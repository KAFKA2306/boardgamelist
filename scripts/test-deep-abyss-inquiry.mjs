import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPlaytestInquiryUrl, sessionIdFromHref } from '../docs/play/deep-abyss/inquiry.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..');
const sessionId = '123e4567-e89b-12d3-a456-426614174000';
const original = new URL('https://github.com/KAFKA2306/boardgamelist/issues/new');
original.searchParams.set('title', '試遊支援の導入相談');
original.searchParams.set('body', `対象ゲーム: \n用途: \n希望時期: \nsource: deep-abyss-result\nsessionId: ${sessionId}`);

assert.equal(sessionIdFromHref(original.toString()), sessionId);
assert.throws(
  () => sessionIdFromHref('https://github.com/KAFKA2306/boardgamelist/issues/new'),
  /試遊セッションID/,
  'missing session ID fails loudly',
);

const summary = [
  '深淵侵蝕の匿名試遊結果',
  '完走: はい',
  '所要時間: 840秒',
  '面白さ: 5/5',
  '自由記述は公開Issueへ自動転記していません。',
].join('\n');
const inquiry = new URL(buildPlaytestInquiryUrl(original.toString(), summary));
assert.equal(inquiry.origin, 'https://github.com');
assert.equal(inquiry.pathname, '/KAFKA2306/boardgamelist/issues/new');
assert.equal(inquiry.searchParams.get('template'), 'playtest-inquiry.yml');
assert.equal(inquiry.searchParams.get('session'), sessionId);
assert.equal(inquiry.searchParams.get('scope'), summary);
assert.equal(inquiry.searchParams.has('body'), false, 'canonical Issue Form is used instead of a free-form issue body');
assert.doesNotMatch(inquiry.toString(), /comment=/, 'free-text survey comment is not transferred');

const html = fs.readFileSync(path.join(repo, 'docs/play/deep-abyss/index.html'), 'utf8');
assert.match(html, /type="module" src="\.\/inquiry\.mjs\?v=1"/);

console.log(JSON.stringify({ template: inquiry.searchParams.get('template'), sessionId, summary }, null, 2));
