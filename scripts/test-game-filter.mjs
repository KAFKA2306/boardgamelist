import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('docs/javascripts/game-filter.js', 'utf8');
vm.runInThisContext(source, { filename: 'game-filter.js' });

const { matchesGame, readFilters, matchReason, compareGames } = globalThis.GameChooserCore;

const verified = {
  japanese_title: '確認済みゲーム',
  players: { min: 2, max: 4 },
  playtime_minutes: { min: 30, max: 45 },
  complexity: 2.5,
};
const unknownPlayers = {
  players: { min: null, max: null },
  playtime_minutes: { min: 30, max: 45 },
  complexity: 2.5,
};
const unknownTime = {
  players: { min: 2, max: 4 },
  playtime_minutes: { min: null, max: null },
  complexity: 2.5,
};
const unknownComplexity = {
  players: { min: 2, max: 4 },
  playtime_minutes: { min: 30, max: 45 },
  complexity: null,
};

assert.equal(matchesGame(verified, { players: null, maxMinutes: null, maxComplexity: null }), true);
assert.equal(matchesGame(verified, { players: 3, maxMinutes: 45, maxComplexity: 3 }), true);
assert.equal(matchesGame(verified, { players: 5, maxMinutes: 45, maxComplexity: 3 }), false);
assert.equal(matchesGame(verified, { players: 3, maxMinutes: 30, maxComplexity: 3 }), false);
assert.equal(matchesGame(verified, { players: 3, maxMinutes: 45, maxComplexity: 2 }), false);
assert.equal(matchesGame(unknownPlayers, { players: null, maxMinutes: null, maxComplexity: null }), false);
assert.equal(matchesGame(unknownTime, { players: null, maxMinutes: null, maxComplexity: null }), false);
assert.equal(matchesGame(unknownPlayers, { players: 3, maxMinutes: null, maxComplexity: null }), false);
assert.equal(matchesGame(unknownTime, { players: null, maxMinutes: 45, maxComplexity: null }), false);
assert.equal(matchesGame(unknownComplexity, { players: 3, maxMinutes: 45, maxComplexity: 3 }), false);
assert.deepEqual(readFilters('?players=2&maxMinutes=45&maxComplexity=3'), { players: 2, maxMinutes: 45, maxComplexity: 3 });
assert.deepEqual(readFilters('?players=0&maxMinutes=999&maxComplexity=5'), { players: null, maxMinutes: null, maxComplexity: null });
assert.equal(matchReason(verified, { players: 3, maxMinutes: 60, maxComplexity: 3 }), '3人で遊べる・最大45分・複雑度2.5 ≤ 3');

const candidates = [
  { japanese_title: '長い', playtime_minutes: { max: 60 }, complexity: 1.5 },
  { japanese_title: '短く重い', playtime_minutes: { max: 30 }, complexity: 3.0 },
  { japanese_title: '短く軽い', playtime_minutes: { max: 30 }, complexity: 2.0 },
];
candidates.sort(compareGames);
assert.deepEqual(candidates.map((game) => game.japanese_title), ['短く軽い', '短く重い', '長い']);

console.log('game chooser tests passed');
