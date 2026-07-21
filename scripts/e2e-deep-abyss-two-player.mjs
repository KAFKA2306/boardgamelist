import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl = process.env.DEEP_ABYSS_URL || 'http://127.0.0.1:8000/docs/play/deep-abyss/';
const browser = await chromium.launch({ headless: true });
const failures = [];

const testUrl = () => {
  const url = new URL(baseUrl);
  url.searchParams.set('test', '1');
  return url.toString();
};

function watch(page, label) {
  page.on('pageerror', (error) => failures.push(`${label} pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') failures.push(`${label} console: ${message.text()}`);
  });
}

const state = (page) => page.evaluate(() => window.__deepAbyssTest?.getState());
const report = (page) => page.evaluate(() => window.__deepAbyssTest?.getExperienceReport());

async function dispatchFirst(page, selector) {
  const element = page.locator(selector).first();
  await element.waitFor({ state: 'attached', timeout: 10_000 });
  await element.evaluate((node) => node.dispatchEvent(new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    view: window,
  })));
}

async function pickDraft(page, round) {
  await page.waitForFunction((expected) => {
    const current = window.__deepAbyssTest?.getState();
    return current?.phase === 'draft' && current.draft?.round === expected;
  }, round, { timeout: 10_000 });
  await page.locator('.draft-choice:not([disabled])').first().click();
}

async function chooseSingle(page, action) {
  const button = page.locator(`.action-button[data-action="${action}"]`);
  if (!(await button.isEnabled())) return false;
  await button.click();
  if (await page.locator('path.region.highlight').count() === 0) {
    await page.locator('#cancelSelectionButton').click();
    return false;
  }
  await dispatchFirst(page, 'path.region.highlight');
  await page.waitForFunction(() => document.querySelectorAll('path.region.selected').length === 1, null, { timeout: 3_000 });
  if (!(await page.locator('#commitActionButton').isEnabled())) {
    await page.locator('#cancelSelectionButton').click();
    return false;
  }
  await page.locator('#commitActionButton').click();
  return true;
}

async function chooseCombat(page) {
  const button = page.locator('.action-button[data-action="combat"]');
  if (!(await button.isEnabled())) return false;
  await button.click();
  if (await page.locator('path.region.highlight').count() === 0) {
    await page.locator('#cancelSelectionButton').click();
    return false;
  }
  await dispatchFirst(page, 'path.region.highlight');
  if (await page.locator('path.region.highlight').count() === 0) {
    await page.locator('#cancelSelectionButton').click();
    return false;
  }
  await dispatchFirst(page, 'path.region.highlight');
  if (!(await page.locator('#commitActionButton').isEnabled())) {
    await page.locator('#cancelSelectionButton').click();
    return false;
  }
  await page.locator('#commitActionButton').click();
  return true;
}

async function performTurn(page, seat) {
  await page.waitForFunction((expected) => {
    const current = window.__deepAbyssTest?.getState();
    return current?.phase === 'playing'
      && current.currentSeat === expected
      && !current.combat
      && !current.choice
      && !current.reaction;
  }, seat, { timeout: 10_000 });

  for (const action of ['expand', 'hide']) {
    if (await chooseSingle(page, action)) return action;
  }
  if (await chooseCombat(page)) return 'combat';
  await page.locator('#passTurnButton').click();
  return 'pass';
}

async function resolvePending(page, current, seat) {
  if (current.choice?.seat === seat) {
    await page.waitForFunction((expected) => window.__deepAbyssTest?.getState()?.choice?.seat === expected, seat, { timeout: 10_000 });
    await dispatchFirst(page, 'path.region.highlight');
    return 'choice';
  }
  if (current.reaction?.seat === seat) {
    await page.waitForFunction((expected) => window.__deepAbyssTest?.getState()?.reaction?.seat === expected, seat, { timeout: 10_000 });
    await page.locator('#defensePassButton').click();
    return 'reaction';
  }
  if (current.combat?.status === 'awaiting-defense') {
    const combat = current.combat.queue[current.combat.index];
    if (current.board[combat.target] === seat) {
      await page.waitForFunction((expected) => {
        const state = window.__deepAbyssTest?.getState();
        if (state?.combat?.status !== 'awaiting-defense') return false;
        const combat = state.combat.queue[state.combat.index];
        return state.board[combat.target] === expected;
      }, seat, { timeout: 10_000 });
      await page.locator('#defensePassButton').click();
      return 'defense';
    }
  }
  return null;
}

try {
  const contexts = [
    await browser.newContext({ viewport: { width: 1360, height: 900 } }),
    await browser.newContext({ viewport: { width: 1360, height: 900 } }),
  ];
  const pages = [await contexts[0].newPage(), await contexts[1].newPage()];
  const [host, guest] = pages;
  watch(host, 'two-player-host');
  watch(guest, 'two-player-guest');

  await host.goto(testUrl(), { waitUntil: 'networkidle', timeout: 45_000 });
  await host.waitForFunction(() => Boolean(window.__deepAbyssTest));
  await host.locator('#nameInput').fill('Two Player Host');
  await host.locator('#createRoomButton').click();
  await host.locator('#networkBadge').filter({ hasText: 'ホスト接続済み' }).waitFor({ timeout: 45_000 });
  const roomCode = (await host.locator('#roomCode').textContent())?.trim() || '';
  assert.match(roomCode, /^[A-Z2-9]{6}$/);

  await guest.goto(testUrl(), { waitUntil: 'networkidle', timeout: 45_000 });
  await guest.waitForFunction(() => Boolean(window.__deepAbyssTest));
  await guest.locator('#nameInput').fill('Two Player Guest');
  await guest.locator('#roomInput').fill(roomCode);
  await guest.locator('#joinRoomButton').click();
  await guest.locator('#networkBadge').filter({ hasText: 'ホストへ接続済み' }).waitFor({ timeout: 45_000 });
  await host.locator('#lobbyStatus').filter({ hasText: /2 \/ 4人/ }).waitFor({ timeout: 20_000 });

  const fillButton = host.locator('#fillCpuButton');
  await fillButton.waitFor({ state: 'visible', timeout: 10_000 });
  assert.match((await fillButton.textContent()) || '', /2人＋CPU2人で開始/);
  assert.equal(await guest.locator('#fillCpuButton').isHidden(), true);
  await fillButton.click();

  await Promise.all(pages.map((page) => page.waitForFunction(() => window.__deepAbyssTest.getState().phase === 'draft', null, { timeout: 10_000 })));
  let current = await state(host);
  assert.equal(current.players.length, 4);
  assert.equal(current.players.filter((player) => player.isCpu).length, 2);
  assert.equal(current.players.filter((player) => !player.isCpu).length, 2);
  assert.deepEqual(current.players.map((player) => player.seat), [0, 1, 2, 3]);

  for (let round = 0; round < 4; round += 1) {
    const first = round % 2 === 0 ? host : guest;
    const second = round % 2 === 0 ? guest : host;
    await pickDraft(first, round);
    await pickDraft(second, round);
    await host.waitForFunction((previous) => {
      const state = window.__deepAbyssTest.getState();
      return state.phase !== 'draft' || state.draft.round > previous;
    }, round, { timeout: 10_000 });
  }

  await Promise.all(pages.map((page) => page.waitForFunction(() => window.__deepAbyssTest.getState().phase === 'playing', null, { timeout: 10_000 })));
  current = await state(host);
  assert.ok(current.players.every((player) => player.cards.length === 4));
  assert.equal(current.board.filter((owner) => owner !== null).length, 4);

  const humanTurns = [0, 0];
  const actions = { expand: 0, hide: 0, combat: 0, pass: 0 };
  const resolved = { defense: 0, reaction: 0, choice: 0 };
  const startedAt = Date.now();

  while (Date.now() - startedAt < 110_000) {
    current = await state(host);
    if (current.phase === 'ended') break;

    let pending = null;
    for (let seat = 0; seat < 2; seat += 1) {
      pending = await resolvePending(pages[seat], current, seat);
      if (pending) {
        resolved[pending] += 1;
        break;
      }
    }
    if (pending) {
      await host.waitForTimeout(100);
      continue;
    }

    if ([0, 1].includes(current.currentSeat) && !current.combat && !current.choice && !current.reaction) {
      const seat = current.currentSeat;
      const action = await performTurn(pages[seat], seat);
      humanTurns[seat] += 1;
      actions[action] += 1;
      await host.waitForFunction((previousSeat) => {
        const state = window.__deepAbyssTest.getState();
        return state.phase === 'ended'
          || state.currentSeat !== previousSeat
          || Boolean(state.combat || state.choice || state.reaction);
      }, seat, { timeout: 10_000 });
      continue;
    }
    await host.waitForTimeout(100);
  }

  const finalState = await state(host);
  assert.equal(finalState.phase, 'ended', `two-player game completes: ${JSON.stringify({ phase: finalState.phase, round: finalState.round, seat: finalState.currentSeat, combat: finalState.combat?.status, choice: finalState.choice, reaction: finalState.reaction })}`);
  assert.ok(humanTurns[0] >= 1);
  assert.ok(humanTurns[1] >= 1);
  assert.match(finalState.endedReason, /第7ラウンド|全40区域/);
  await guest.waitForFunction(() => window.__deepAbyssTest.getState().phase === 'ended', null, { timeout: 10_000 });
  await Promise.all(pages.map((page) => page.locator('#resultDialog').waitFor({ state: 'visible', timeout: 10_000 })));

  const finalReport = await report(host);
  assert.equal(finalReport.appVersion, '0.5.0');
  assert.equal(finalReport.mode, 'hybrid-cpu');
  assert.equal(finalReport.humanPlayers, 2);
  assert.equal(finalReport.cpuPlayers, 2);
  assert.equal(failures.length, 0, failures.join('\n'));

  console.log(JSON.stringify({
    roomCode,
    players: finalState.players.map((player) => ({ name: player.name, seat: player.seat, isCpu: Boolean(player.isCpu) })),
    humanTurns,
    actions,
    resolved,
    endedReason: finalState.endedReason,
    report: finalReport,
  }, null, 2));

  await Promise.all(contexts.map((context) => context.close()));
} finally {
  await browser.close();
}
