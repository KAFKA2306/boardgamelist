import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl = process.env.DEEP_ABYSS_URL || 'http://127.0.0.1:8000/docs/play/deep-abyss/';
const browser = await chromium.launch({ headless: true });
const failures = [];

function watch(page, label) {
  page.on('pageerror', (error) => failures.push(`${label} pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') failures.push(`${label} console: ${message.text()}`);
  });
}

async function state(page) {
  return page.evaluate(() => window.__deepAbyssTest?.getState());
}

async function waitForState(page, predicate, timeout = 20_000) {
  await page.waitForFunction(predicate, null, { timeout });
}

async function enterCpuGame(page, name) {
  await page.goto(`${baseUrl}?test=1`, { waitUntil: 'networkidle', timeout: 45_000 });
  await page.waitForFunction(() => Boolean(window.__deepAbyssTest));
  await page.locator('#nameInput').fill(name);
  await page.locator('#cpuModeButton').click();
  await page.locator('#startGameButton').click();
  for (let round = 0; round < 4; round += 1) {
    await page.locator('.draft-choice:not([disabled])').first().click();
    await page.waitForFunction((previous) => {
      const current = window.__deepAbyssTest.getState();
      return current.phase !== 'draft' || current.draft.round > previous;
    }, round);
  }
  await waitForState(page, () => window.__deepAbyssTest.getState().phase === 'playing');
}

async function chooseOneRegionAction(page, action) {
  await page.locator(`[data-action="${action}"]`).click();
  const highlights = page.locator('path.region.highlight');
  if (await highlights.count() === 0) {
    await page.locator('#cancelSelectionButton').click();
    return false;
  }
  await highlights.first().click();
  assert.equal(await page.locator('path.region.selected').count(), 1, `${action}: one click must keep one region selected`);
  assert.equal(await page.locator('#commitActionButton').isEnabled(), true, `${action}: execute becomes enabled`);
  await page.locator('#commitActionButton').click();
  return true;
}

async function chooseCombat(page) {
  await page.locator('[data-action="combat"]').click();
  let highlights = page.locator('path.region.highlight');
  if (await highlights.count() === 0) {
    await page.locator('#cancelSelectionButton').click();
    return false;
  }
  await highlights.first().click();
  highlights = page.locator('path.region.highlight');
  if (await highlights.count() === 0) {
    await page.locator('#cancelSelectionButton').click();
    return false;
  }
  await highlights.first().click();
  assert.equal(await page.locator('#commitActionButton').isEnabled(), true, 'combat: execute becomes enabled');
  await page.locator('#commitActionButton').click();
  return true;
}

async function resolveHumanPendingDecision(page, current) {
  if (current.choice?.seat === 0) {
    const choice = page.locator('path.region.highlight').first();
    await choice.waitFor({ state: 'visible', timeout: 5_000 });
    await choice.click();
    return 'choice';
  }
  if (current.reaction?.seat === 0) {
    const pass = page.locator('#defensePassButton');
    await pass.waitFor({ state: 'visible', timeout: 5_000 });
    await pass.click();
    return 'reaction';
  }
  if (current.combat?.status === 'awaiting-defense') {
    const combat = current.combat.queue[current.combat.index];
    const defenderSeat = current.board[combat.target];
    if (defenderSeat === 0) {
      const pass = page.locator('#defensePassButton');
      await pass.waitFor({ state: 'visible', timeout: 5_000 });
      await pass.click();
      return 'defense';
    }
  }
  return null;
}

try {
  // Online room and participant-code path.
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  await hostContext.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(baseUrl).origin });
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();
  watch(host, 'host');
  watch(guest, 'guest');
  await host.goto(baseUrl, { waitUntil: 'networkidle', timeout: 45_000 });
  await host.locator('#nameInput').fill('E2E Host');
  await host.locator('#createRoomButton').click();
  await host.locator('#networkBadge').filter({ hasText: 'ホスト接続済み' }).waitFor({ timeout: 45_000 });
  const code = (await host.locator('#roomCode').textContent())?.trim() || '';
  assert.match(code, /^[A-Z2-9]{6}$/);
  await host.locator('#copyRoomButton').click();
  assert.equal(await host.evaluate(() => navigator.clipboard.readText()), code);
  await guest.goto(baseUrl, { waitUntil: 'networkidle', timeout: 45_000 });
  await guest.locator('#nameInput').fill('E2E Guest');
  await guest.locator('#roomInput').fill(code);
  await guest.locator('#joinRoomButton').click();
  await guest.locator('#networkBadge').filter({ hasText: 'ホストへ接続済み' }).waitFor({ timeout: 45_000 });
  await host.locator('#lobbyStatus').filter({ hasText: '2 / 4人' }).waitFor({ timeout: 20_000 });
  await hostContext.close();
  await guestContext.close();

  // Deterministic UI scenarios for all three actions.
  const scenarioContext = await browser.newContext();
  const scenario = await scenarioContext.newPage();
  watch(scenario, 'scenario');
  await enterCpuGame(scenario, 'Scenario Tester');
  await scenario.evaluate(() => window.__deepAbyssTest.forceHumanTurn());
  assert.equal(await chooseOneRegionAction(scenario, 'expand'), true, 'adjacent expansion is selectable');

  const startingBoard = Array(40).fill(null);
  startingBoard[0] = 0; startingBoard[10] = 1; startingBoard[20] = 2; startingBoard[30] = 3;
  await scenario.evaluate((board) => {
    window.__deepAbyssTest.setBoard(board);
    window.__deepAbyssTest.forceHumanTurn();
  }, startingBoard);
  assert.equal(await chooseOneRegionAction(scenario, 'hide'), true, 'remote hiding is selectable');

  const combatBoard = Array(40).fill(null);
  combatBoard[0] = 0; combatBoard[1] = 1; combatBoard[20] = 2; combatBoard[30] = 3;
  await scenario.evaluate((board) => {
    window.__deepAbyssTest.setBoard(board);
    window.__deepAbyssTest.forceHumanTurn();
  }, combatBoard);
  assert.equal(await chooseCombat(scenario), true, 'combat source and target are selectable');
  await scenario.waitForFunction(() => {
    const current = window.__deepAbyssTest.getState();
    return current.currentSeat !== 0 && !current.combat && !current.reaction && !current.choice;
  }, null, { timeout: 10_000 });
  await scenarioContext.close();

  // Full game: lobby -> four draft rounds -> every decision class -> result dialog.
  const gameContext = await browser.newContext();
  const game = await gameContext.newPage();
  watch(game, 'full-game');
  await enterCpuGame(game, 'Full Game Tester');
  let humanTurns = 0;
  let passes = 0;
  const resolved = { defense: 0, reaction: 0, choice: 0 };
  const startedAt = Date.now();
  while (Date.now() - startedAt < 75_000) {
    const current = await state(game);
    if (current.phase === 'ended') break;

    const pending = await resolveHumanPendingDecision(game, current);
    if (pending) {
      resolved[pending] += 1;
      await game.waitForTimeout(100);
      continue;
    }

    if (current.currentSeat !== 0 || current.combat || current.choice || current.reaction) {
      await game.waitForTimeout(100);
      continue;
    }

    let acted = false;
    for (const action of ['expand', 'hide']) {
      acted = await chooseOneRegionAction(game, action);
      if (acted) break;
    }
    if (!acted) acted = await chooseCombat(game);
    if (!acted) {
      await game.locator('#passTurnButton').click();
      passes += 1;
    }
    humanTurns += 1;
    await game.waitForTimeout(100);
  }
  const finalState = await state(game);
  assert.equal(finalState.phase, 'ended', `a complete game reaches ended; current=${JSON.stringify({phase:finalState.phase, round:finalState.round, seat:finalState.currentSeat, combat:finalState.combat?.status, choice:finalState.choice, reaction:finalState.reaction})}`);
  assert.ok(humanTurns >= 1, 'human completed at least one turn');
  assert.match(finalState.endedReason, /第7ラウンド|全40区域/);
  await game.locator('#resultDialog').waitFor({ state: 'visible', timeout: 5_000 });
  assert.match(await game.locator('#resultBody').textContent(), /勝利/);
  await gameContext.close();

  assert.equal(failures.length, 0, failures.join('\n'));
  console.log(JSON.stringify({ roomCode: code, humanTurns, passes, resolved, endedReason: finalState.endedReason }, null, 2));
} finally {
  await browser.close();
}