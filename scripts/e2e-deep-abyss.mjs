import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl = process.env.DEEP_ABYSS_URL || 'http://127.0.0.1:8000/docs/play/deep-abyss/';
const browser = await chromium.launch({ headless: true });
const failures = [];

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

async function waitForState(page, predicate, timeout = 20_000) {
  await page.waitForFunction(predicate, null, { timeout });
}

async function enterCpuGame(page, name) {
  await page.goto(`${baseUrl}?test=1`, { waitUntil: 'networkidle', timeout: 45_000 });
  await page.waitForFunction(() => Boolean(window.__deepAbyssTest));
  await page.locator('#nameInput').fill(name);
  await page.locator('#cpuModeButton').click();
  await page.locator('#startGameButton').click();
  await page.waitForFunction(() => window.__deepAbyssTest.getState().phase === 'draft', null, { timeout: 5_000 });

  for (let expectedRound = 0; expectedRound < 4; expectedRound += 1) {
    const diagnostic = await page.evaluate(() => {
      const current = window.__deepAbyssTest.getState();
      const player = current.players[0];
      return {
        phase: current.phase,
        round: current.draft?.round,
        chosen: current.draft?.chosen,
        humanPack: current.draft?.packs?.[player.seat],
        dialogOpen: document.querySelector('#draftDialog')?.open,
        choiceCount: document.querySelectorAll('.draft-choice').length,
        enabledChoiceCount: document.querySelectorAll('.draft-choice:not([disabled])').length,
      };
    });
    console.log(`DRAFT ${name} ${expectedRound}: ${JSON.stringify(diagnostic)}`);
    assert.equal(diagnostic.phase, 'draft');
    assert.equal(diagnostic.round, expectedRound);
    assert.ok(diagnostic.enabledChoiceCount > 0, `enabled draft choice exists: ${JSON.stringify(diagnostic)}`);
    await page.locator('.draft-choice:not([disabled])').first().click();
    await page.waitForFunction((previous) => {
      const current = window.__deepAbyssTest.getState();
      return current.phase !== 'draft' || current.draft.round > previous;
    }, expectedRound, { timeout: 5_000 });
  }
  await waitForState(page, () => window.__deepAbyssTest.getState().phase === 'playing');
}

async function chooseOneRegionAction(page, action) {
  await page.locator(`.action-button[data-action="${action}"]`).click();
  const highlights = page.locator('path.region.highlight');
  if (await highlights.count() === 0) {
    await page.locator('#cancelSelectionButton').click();
    return false;
  }
  await highlights.first().click();
  assert.equal(await page.locator('path.region.selected').count(), 1, `${action}: one click keeps one region selected`);
  assert.equal(await page.locator('#commitActionButton').isEnabled(), true, `${action}: execute becomes enabled`);
  await page.locator('#commitActionButton').click();
  return true;
}

async function chooseCombat(page) {
  await page.locator('.action-button[data-action="combat"]').click();
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
  assert.equal(await page.locator('#commitActionButton').isEnabled(), true, 'combat execute becomes enabled');
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
  // Two-browser connection path.
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

  // Desktop guided flow and keyboard path.
  const scenarioContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const scenario = await scenarioContext.newPage();
  watch(scenario, 'scenario');
  await enterCpuGame(scenario, 'Scenario Tester');
  await scenario.evaluate(() => window.__deepAbyssTest.forceHumanTurn());
  await scenario.locator('#turnCoach').waitFor({ state: 'visible' });
  assert.equal((await scenario.locator('#turnCoachState').textContent())?.trim(), 'YOUR TURN');
  assert.equal(await scenario.locator('.action-count').count(), 3, 'all actions show candidate counts');
  assert.match(await scenario.locator('.action-count').first().textContent(), /候補 \d+/);

  await scenario.keyboard.press('1');
  assert.equal(await scenario.locator('.action-button[data-action="expand"]').getAttribute('class').then((value) => value.includes('active')), true);
  assert.equal((await scenario.locator('#turnCoachState').textContent())?.trim(), 'SELECT');
  await scenario.locator('path.region.highlight').first().click();
  assert.equal(await scenario.locator('path.region.selected').count(), 1);
  assert.equal((await scenario.locator('#turnCoachState').textContent())?.trim(), 'READY');
  assert.match(await scenario.locator('#commitActionButton').textContent(), /隣接侵蝕を実行/);
  await scenario.keyboard.press('Enter');
  await scenario.waitForFunction(() => window.__deepAbyssTest.getState().currentSeat !== 0, null, { timeout: 10_000 });

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
  const scenarioReport = await report(scenario);
  assert.equal(scenarioReport.version, '0.4.0');
  assert.ok(scenarioReport.humanActions >= 3, 'guided scenario records actions');
  await scenarioContext.close();

  // Mobile viewport: no horizontal overflow and fixed action dock completes a turn.
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobile = await mobileContext.newPage();
  watch(mobile, 'mobile');
  await enterCpuGame(mobile, 'Mobile Tester');
  await mobile.evaluate(() => window.__deepAbyssTest.forceHumanTurn());
  await mobile.locator('#mobileActionDock').waitFor({ state: 'visible' });
  const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, `mobile page has no horizontal overflow: ${overflow}`);
  const dockBox = await mobile.locator('#mobileActionDock').boundingBox();
  assert.ok(dockBox && dockBox.height >= 48, 'mobile dock has a usable touch height');
  await mobile.locator('[data-dock-action="expand"]').click();
  await mobile.locator('path.region.highlight').first().click();
  assert.equal(await mobile.locator('#mobileCommitButton').isEnabled(), true, 'mobile commit becomes enabled');
  const commitBox = await mobile.locator('#mobileCommitButton').boundingBox();
  assert.ok(commitBox && commitBox.height >= 44, 'mobile commit is a 44px+ touch target');
  await mobile.locator('#mobileCommitButton').click();
  await mobile.waitForFunction(() => window.__deepAbyssTest.getState().currentSeat !== 0, null, { timeout: 10_000 });
  await mobileContext.close();

  // Full game: finish, show result, collect ratings, and export the report.
  const gameContext = await browser.newContext();
  await gameContext.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(baseUrl).origin });
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
  assert.equal(finalState.phase, 'ended', `complete game reaches ended; current=${JSON.stringify({phase:finalState.phase, round:finalState.round, seat:finalState.currentSeat, combat:finalState.combat?.status, choice:finalState.choice, reaction:finalState.reaction})}`);
  assert.ok(humanTurns >= 1);
  assert.match(finalState.endedReason, /第7ラウンド|全40区域/);
  await game.locator('#resultDialog').waitFor({ state: 'visible', timeout: 5_000 });
  assert.match(await game.locator('#resultBody').textContent(), /勝利/);
  await game.locator('#experienceSummary').waitFor({ state: 'visible' });
  assert.equal(await game.locator('[data-rating]').count(), 15, 'three five-point rating scales');
  await game.locator('[data-rating="fun"][data-value="5"]').click();
  await game.locator('[data-rating="clarity"][data-value="4"]').click();
  await game.locator('[data-rating="tempo"][data-value="5"]').click();
  await game.locator('#copyExperienceButton').click();
  const copiedReport = JSON.parse(await game.evaluate(() => navigator.clipboard.readText()));
  assert.equal(copiedReport.version, '0.4.0');
  assert.deepEqual(copiedReport.ratings, { fun: 5, clarity: 4, tempo: 5 });
  assert.ok(copiedReport.totalActions >= humanTurns, 'report records total actions');
  assert.ok(Number.isInteger(copiedReport.durationSeconds), 'report records game duration');
  await gameContext.close();

  assert.equal(failures.length, 0, failures.join('\n'));
  console.log(JSON.stringify({ roomCode: code, humanTurns, passes, resolved, endedReason: finalState.endedReason, scenarioReport, copiedReport }, null, 2));
} finally {
  await browser.close();
}