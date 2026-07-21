import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl = process.env.DEEP_ABYSS_URL || 'http://127.0.0.1:8000/docs/play/deep-abyss/';
const browser = await chromium.launch({ headless: true });
const hostContext = await browser.newContext();
const guestContext = await browser.newContext();
await hostContext.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(baseUrl).origin });

const host = await hostContext.newPage();
const guest = await guestContext.newPage();
const failures = [];
for (const [label, page] of [['host', host], ['guest', guest]]) {
  page.on('pageerror', (error) => failures.push(`${label} pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') failures.push(`${label} console: ${message.text()}`);
  });
}

try {
  await host.goto(baseUrl, { waitUntil: 'networkidle', timeout: 45_000 });
  await host.locator('#nameInput').fill('E2E Host');
  await host.locator('#createRoomButton').click();
  await host.locator('#networkBadge').filter({ hasText: 'ホスト接続済み' }).waitFor({ timeout: 45_000 });

  const code = (await host.locator('#roomCode').textContent())?.trim() || '';
  assert.match(code, /^[A-Z2-9]{6}$/, 'host produces a six-character participant code');

  await host.locator('#copyRoomButton').click();
  const copiedCode = await host.evaluate(() => navigator.clipboard.readText());
  assert.equal(copiedCode, code, 'code copy button copies only the participant code');

  await guest.goto(baseUrl, { waitUntil: 'networkidle', timeout: 45_000 });
  await guest.locator('#nameInput').fill('E2E Guest');
  await guest.locator('#roomInput').fill(code);
  await guest.locator('#joinRoomButton').click();
  await guest.locator('#networkBadge').filter({ hasText: 'ホストへ接続済み' }).waitFor({ timeout: 45_000 });
  await host.locator('#lobbyStatus').filter({ hasText: '2 / 4人' }).waitFor({ timeout: 20_000 });

  assert.equal(failures.length, 0, failures.join('\n'));
  console.log(JSON.stringify({
    roomCode: code,
    copiedCode,
    hostStatus: await host.locator('#networkBadge').textContent(),
    guestStatus: await guest.locator('#networkBadge').textContent(),
    lobbyStatus: await host.locator('#lobbyStatus').textContent(),
  }, null, 2));
} finally {
  await browser.close();
}
