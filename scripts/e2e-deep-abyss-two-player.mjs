import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl = process.env.DEEP_ABYSS_URL || 'http://127.0.0.1:8000/docs/play/deep-abyss/';
const browser = await chromium.launch({ headless: true });
const failures = [];

function testUrl() {
  const url = new URL(baseUrl);
  url.searchParams.set('test', '1');
  return url.toString();
}

function watch(page, label) {
  page.on('pageerror', (error) => {
    const message = `${label} pageerror: ${error.message}`;
    failures.push(message);
    console.log(message);
  });
  page.on('console', (message) => {
    if (message.type() === 'error') {
      const text = `${label} console: ${message.text()}`;
      failures.push(text);
      console.log(text);
    }
  });
}

async function state(page) {
  return page.evaluate(() => window.__deepAbyssTest?.getState());
}

async function report(page) {
  return page.evaluate(() => window.__deepAbyssTest?.getExperienceReport());
}

async function waitForTestApi(page) {
  await page.waitForFunction(() => Boolean(window.__deepAbyssTest), null, { timeout: 45_000 });
}

async function pickDraft(page, expectedRound) {
  await page.waitForFunction((round) => {
    const current = window.__deepAbyssTest?.getState();
    return current?.phase === 'draft' && current.draft?.round === round;
  }, expectedRound, { timeout: 10_000 });
  const choice = page.locator('.draft-choice:not([disabled])').first();
  await choice.waitFor({ state: 'visible', timeout: 10_000 });
  await choice.click();
}

async function chooseOneRegionAction(page, action) {
  const button = page.locator(`.action-button[data-action="${action}"]`);
  if (!(await button.isEnabled())) return false;
  await button.click();
  const highlights = page.locator('path.region.highlight');
  if (await highlights.count() === 0) {
    await page.locator('#cancelSelectionButton').click();
    return false;
  }
  await highlights.first().click({ force: true });
  assert.equal(await page.locator('path.region.selected').count(), 1, `${action}: region remains selected`);
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
  let highlights = page.locator('path.region.highlight');
  if (await highlights.count() === 0) {
    await page.locator('#cancelSelectionButton').click();
    return false;
  }
  await highlights.first().click({ force: true });
  highlights = page.locator('path.region.highlight');
  if (await highlights.count() === 0) {
    await page.locator('#cancelSelectionButton').click();
    return false;
  }
  await highlights.first().click({ force: true });
  if (!(await page.locator('#commitActionButton').isEnabled())) {
    await page.locator('#cancelSelectionButton').click();
    return false;
  }
  await page.locator('#commitActionButton').click();
  return true;
}

async function performHumanTurn(page, seat) {
  await page.waitForFunction((expectedSeat) => {
    const current = window.__deepAbyssTest?.getState();
    return current?.phase === 'playing'
      && current.currentSeat === expectedSeat
      && !current.combat
      && !current.choice
      && !current.reaction;
  }, seat, { timeout: 10_000 });

  let action = null;
  for (const candidate of ['expand', 'hide']) {
    if (await chooseOneRegionAction(page, candidate)) {
      action = candidate;
      break;
    }
  }
  if (!action && await chooseCombat(page)) action = 'combat';
  if (!action) {
    await page.locator('#passTurnButton').click();
    action = 'pass';
  }
  return action;
}

async function resolvePendingForSeat(page, current, seat) {
  if (current.choice?.seat === seat) {
    await page.waitForFunction((expectedSeat) => window.__deepAbyssTest?.getState()?.choice?.seat === expectedSeat, seat, { timeout: 10_000 });
    const choice = page.locator('path.region.highlight').first();
    await choice.waitFor({ state: 'visible', timeout: 10_000 });
    await choice.click({ force: true });
    return 'choice';
  }
  if (current.reaction?.seat === seat) {
    await page.waitForFunction((expectedSeat) => window.__deepAbyssTest?.getState()?.reaction?.seat === expectedSeat, seat, { timeout: 10_000 });
    const pass = page.locator('#defensePassButton');
    await pass.waitFor({ state: 'visible', timeout: 10_000 });
    await pass.click();
    return 'reaction';
  }
  if (current.combat?.status === 'awaiting-defense') {
    const combat = current.combat.queue[current.combat.index];
    const defenderSeat = current.board[combat.target];
    if (defenderSeat === seat) {
      await page.waitForFunction((expectedSeat) => {
        const state = window.__deepAbyssTest?.getState();
        if (state?.combat?.status !== 'awaiting-defense') return false;
        const combat = state.combat.queue[state.combat.index];
        return state.board[combat.target] === expectedSeat;
      }, seat, { timeout: 10_000 });
      const pass = page.locator('#defensePassButton');
      await pass.waitFor({ state: 'visible', timeout: 10_000 });
      await pass.click();
      return 'defense';
    }
  }
  return null;
}

try {
  const hostContext = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  const guestContext = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();
  watch(host, 'two-player-host');
  watch(guest, 'two-player-guest');

  await host.goto(testUrl(), { waitUntil: 'networkidle', timeout: 45_000 });
  await waitForTestApi(host);
  await host.locator('#nameInput').fill('Two Player Host');
  await host.locator('#createRoomButton').click();
  await host.locator('#networkBadge').filter({ hasText: 'ホスト接続済み' }).waitFor({ timeout: 45_000 });
  const roomCode = (await host.locator('#roomCode').textContent())?.trim() || '';
  assert.match(roomCode, /^[A-Z2-9]{6}$/);

  await guest.goto(testUrl(), { waitUntil: 'networkidle', timeout: 45_000 });
  await waitForTestApi(guest);
  await guest.locator('#nameInput').fill('Two Player Guest');
  await guest.locator('#roomInput').fill(roomCode);
  await guest.locator('#joinRoomButton').click();
  await guest.locator('#networkBadge').filter({ hasText: 'ホストへ接続済み' }).waitFor({ timeout: 45_000 });
  await host.locator('#lobbyStatus').filter({ hasText: /2 \/ 4人/ }).waitFor({ timeout: 20_000 });

  const fillButton = host.locator('#fillCpuButton');
  await fillButton.waitFor({ state: 'visible', timeout: 10_000 });
  assert.match((await fillButton.textContent()) || '', /2人＋CPU2人で開始/);
  assert.equal(await guest.locator('#fillCpuButton').isHidden(), true, 'only the host can add CPU seats');
  await fillButton.click();

  await host.waitForFunction(() => window.__deepAbyssTest.getState().phase === 'draft', null, { timeout: 10_000 });
  await guest.waitForFunction(() => window.__deepAbyssTest.getState().phase === 'draft', null, { timeout: 10_000 });
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
    await host.waitForFunction((previousRound) => {
      const state = window.__deepAbyssTest.getState();
      return state.phase !== 'draft' || state.draft.round > previousRound;
    }, round, { timeout: 10_000 });
  }

  await host.waitForFunction(() => window.__deepAbyssTest.getState().phase === 'playing', null, { timeout: 10_000 });
  await guest.waitForFunction(() => window.__deepAbyssTest.getState().phase === 'playing', null, { timeout: 10_000 });
  current = await state(host);
  assert.ok(current.players.every((player) => player.cards.length === 4), 'all four seats finish the draft');
  assert.equal(current.board.filter((owner) => owner !== null).length, 4);

  const pages = [host, guest];
  const humanTurns = [0, 0];
  const actions = { expand: 0, hide: 0, combat: 0, pass: 0 };
  const resolved = { defense: 0, reaction: 0, choice: 0 };
  const startedAt = Date.now();

  while (Date.now() - startedAt < 110_000) {
    current = await state(host);
    if (current.phase === 'ended') break;

    let pending = null;
    for (let seat = 0; seat < 2; seat += 1) {
      pending = await resolvePendingForSeat(pages[seat], current, seat);
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
      const action = await performHumanTurn(pages[seat], seat);
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
  assert.ok(humanTurns[0] >= 1, 'host completes a turn');
  assert.ok(humanTurns[1] >= 1, 'guest completes a turn');
  assert.match(finalState.endedReason, /第7ラウンド|全40区域/);
  await guest.waitForFunction(() => window.__deepAbyssTest.getState().phase === 'ended', null, { timeout: 10_000 });
  await host.locator('#resultDialog').waitFor({ state: 'visible', timeout: 10_000 });
  await guest.locator('#resultDialog').waitFor({ state: 'visible', timeout: 10_000 });

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

  await hostContext.close();
  await guestContext.close();
} finally {
  await browser.close();
}
