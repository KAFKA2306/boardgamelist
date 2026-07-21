import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..');
const gameDir = path.join(repo, 'docs/play/deep-abyss');
const read = (name) => fs.readFileSync(path.join(gameDir, name), 'utf8');

const parts = Array.from({ length: 8 }, (_, index) => `app-${String(index + 1).padStart(2, '0')}.txt`);
let source = parts.map(read).join('');
const runtimePatch = `${read('runtime-patch.txt')}\n${read('runtime-flow-patch.txt')}\n${read('runtime-test-hook.txt')}`;
const duplicateRegionBinding = "$$('[data-region]').forEach((node) => node.addEventListener('click', () => onRegionClick(Number(node.dataset.region))));";
const singleRegionBinding = "$$('path.region[data-region]').forEach((node) => node.addEventListener('click', (event) => { event.stopPropagation(); onRegionClick(Number(node.dataset.region)); }));";

assert.match(source, /el\.createRoomButton\.addEventListener\('click', createRoom\)/);
assert.match(source, /el\.joinRoomButton\.addEventListener\('click', joinRoom\)/);
assert.ok(source.includes(duplicateRegionBinding), 'original duplicate region binding exists');
assert.match(source, /navigator\.clipboard\.writeText\(`\$\{location\.origin\}/);

source = source
  .replace("el.createRoomButton.addEventListener('click', createRoom);", "el.createRoomButton.addEventListener('click', createRoomResilient);")
  .replace("el.joinRoomButton.addEventListener('click', joinRoom);", "el.joinRoomButton.addEventListener('click', joinRoomResilient);")
  .replace(duplicateRegionBinding, () => singleRegionBinding)
  .replace(
    /  el\.copyRoomButton\.addEventListener\('click', async \(\) => \{[\s\S]*?  \}\);\n  el\.actionButtons/,
    `  el.copyRoomButton.addEventListener('click', async () => {\n    const copied = await copyText(state?.roomCode || local.roomCode);\n    toast(copied ? \`参加コード \${state?.roomCode || local.roomCode} をコピーしました\` : '参加コードを表示しました');\n  });\n  document.querySelector('#copyInviteButton')?.addEventListener('click', async () => {\n    const code = state?.roomCode || local.roomCode;\n    const url = \`\${location.origin}\${location.pathname}?room=\${code}\`;\n    const copied = await copyText(url);\n    toast(copied ? '招待URLをコピーしました' : '招待URLを表示しました');\n  });\n  document.querySelector('#cpuModeButton')?.addEventListener('click', createCpuGame);\n  el.actionButtons`
  )
  .replace(
    /  el\.copyLogButton\.addEventListener\('click', async \(\) => \{[\s\S]*?  \}\);/,
    `  el.copyLogButton.addEventListener('click', async () => {\n    const copied = await copyText(state.logs.slice().reverse().join('\\n'));\n    toast(copied ? '侵蝕記録をコピーしました' : '侵蝕記録を表示しました');\n  });`
  );

assert.ok(source.includes(singleRegionBinding), 'single path-only region binding is retained');
assert.doesNotMatch(source, /(^|[^$])\$\('path\.region\[data-region\]'\)\.forEach/m, 'querySelectorAll helper is not collapsed to querySelector');

const closing = source.lastIndexOf('})();');
assert.ok(closing >= 0, 'engine closure marker');
source = `${source.slice(0, closing)}\n${runtimePatch}\n${source.slice(closing)}`;
new Function(source);

class StubElement {
  constructor(id = '') {
    this.id = id;
    this.value = '';
    this.textContent = '';
    this.innerHTML = '';
    this.dataset = {};
    this.disabled = false;
    this.open = false;
    this.style = {};
    this.listeners = new Map();
    this.classList = {
      add() {},
      remove() {},
      toggle() {},
      contains() { return false; },
    };
  }
  addEventListener(type, callback) { this.listeners.set(type, callback); }
  insertAdjacentHTML() {}
  querySelector() { return null; }
  setAttribute() {}
  select() {}
  setSelectionRange() {}
  appendChild() {}
  remove() {}
  showModal() { this.open = true; }
  close() { this.open = false; }
}

const ids = [
  'lobbyView','gameView','roomPanel','nameInput','roomInput','createRoomButton','joinRoomButton','roomCode','gameRoomCode',
  'copyRoomButton','copyInviteButton','cpuModeButton','lobbyPlayers','startGameButton','lobbyStatus','networkBadge','scoreboard',
  'roundLabel','turnLabel','unclaimedLabel','board','boardHint','selectionSummary','cancelSelectionButton','commitActionButton',
  'cardHand','gameLog','copyLogButton','draftDialog','draftCards','draftStatus','combatDialog','combatTitle','combatBody',
  'defenseCards','defensePassButton','rulesDialog','rulesButton','resultDialog','resultBody','toast',
];
const elements = Object.fromEntries(ids.map((id) => [id, new StubElement(id)]));
const actionButtons = ['expand','hide','combat'].map((action) => {
  const element = new StubElement(`action-${action}`);
  element.dataset.action = action;
  return element;
});
let clipboardValue = '';
const body = new StubElement('body');

const document = {
  body,
  activeElement: null,
  querySelector(selector) {
    if (selector.startsWith('#')) return elements[selector.slice(1)] || null;
    return null;
  },
  querySelectorAll(selector) {
    if (selector === '.action-button') return actionButtons;
    return [];
  },
  createElement() { return new StubElement(); },
  execCommand(command) { return command === 'copy'; },
  addEventListener() {},
};

const storage = new Map();
const context = {
  console,
  document,
  navigator: { clipboard: { async writeText(value) { clipboardValue = value; } } },
  localStorage: {
    getItem(key) { return storage.get(key) ?? null; },
    setItem(key, value) { storage.set(key, String(value)); },
  },
  crypto: { randomUUID: () => 'test-client-key' },
  history: { replaceState() {} },
  location: {
    href: 'https://example.test/play/deep-abyss/?test=1',
    origin: 'https://example.test',
    pathname: '/play/deep-abyss/',
    reload() {},
  },
  URL,
  prompt() {},
  setTimeout() { return 1; },
  clearTimeout() {},
  Math,
};
context.window = context;
context.window.isSecureContext = true;
vm.createContext(context);
vm.runInContext(read('cards.js'), context, { filename: 'cards.js' });
vm.runInContext(source, context, { filename: 'engine.js' });

const data = context.window.DEEP_ABYSS;
assert.equal(data.cards.length, 32, '32 ability cards');
assert.equal(data.nodes.length, 40, '40 regions');
assert.deepEqual(Array.from(data.startRegions), [0, 10, 20, 30]);
for (const region of data.startRegions) assert.equal(data.adjacency[region].length, 3, `start degree ${region}`);
const visited = new Set([0]);
const queue = [0];
while (queue.length) {
  for (const neighbor of data.adjacency[queue.shift()]) {
    if (!visited.has(neighbor)) { visited.add(neighbor); queue.push(neighbor); }
  }
}
assert.equal(visited.size, 40, 'map graph is connected');

const api = context.window.__deepAbyssTest;
assert.ok(api, 'test hook exposed');
elements.nameInput.value = 'Tester';
api.createCpuGame();
let state = api.getState();
assert.equal(state.players.length, 4, 'human + 3 CPU');
assert.equal(state.players.filter((player) => player.isCpu).length, 3, '3 CPU players');
assert.equal(state.phase, 'lobby');

api.startDraft();
assert.equal(elements.draftDialog.open, true, 'draft dialog opens');
assert.match(elements.draftCards.innerHTML, /draft-choice/, 'draft cards render');
for (let round = 0; round < 4; round += 1) api.pickFirstDraft();
state = api.getState();
assert.equal(state.phase, 'playing', 'draft completes');
assert.ok(state.players.every((player) => player.cards.length === 4), 'all players have four cards');
assert.equal(state.board.filter((owner) => owner !== null).length, 4, 'four starting regions');

api.setCurrentSeat(1);
api.runCpuStep();
state = api.getState();
assert.ok(state.board.filter((owner) => owner !== null).length >= 5, 'CPU performs a legal action');
assert.notEqual(state.currentSeat, 1, 'CPU turn advances');

api.setCurrentSeat(0);
api.passTurn();
state = api.getState();
assert.equal(state.currentSeat, 1, 'pass advances to the next seat');
const report = api.getExperienceReport();
assert.equal(report.version, '0.4.0');
assert.equal(report.passes, 1, 'playtest report records passes');
assert.ok(Array.isArray(report.finalScores) && report.finalScores.length === 4, 'playtest report contains final scores');

assert.equal(api.peerOptions().host, '0.peerjs.com');
assert.match(api.peerErrorMessage({ type: 'server-error' }), /シグナリングサーバー/);
assert.equal(await api.copyText('ABC123'), true);
assert.equal(clipboardValue, 'ABC123', 'copy helper copies participant code');

const html = read('index.html');
assert.match(html, /id="copyRoomButton"[^>]*>コードをコピー</);
assert.match(html, /id="copyInviteButton"/);
assert.match(html, /CPU 3人とすぐ遊ぶ/);
assert.match(html, /app\.js\?v=0\.4\.0/);
assert.match(html, /style\.css\?v=0\.4\.0/);

console.log(JSON.stringify({
  cards: data.cards.length,
  regions: data.nodes.length,
  players: state.players.length,
  cpuPlayers: state.players.filter((player) => player.isCpu).length,
  ownedAfterCpuTurn: state.board.filter((owner) => owner !== null).length,
  report,
  clipboardValue,
}, null, 2));