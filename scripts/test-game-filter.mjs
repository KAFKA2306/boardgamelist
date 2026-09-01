import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('docs/javascripts/game-filter.js', 'utf8');
vm.runInThisContext(source, { filename: 'game-filter.js' });

const { matchesGame, readFilters } = globalThis.GameChooserCore;

const verified = {
  players: { min: 2, max: 4 },
  playtime_minutes: { min: 30, max: 45 },
};
const unknownPlayers = {
  players: { min: null, max: null },
  playtime_minutes: { min: 30, max: 45 },
};
const unknownTime = {
  players: { min: 2, max: 4 },
  playtime_minutes: { min: null, max: null },
};

assert.equal(matchesGame(verified, { players: null, maxMinutes: null }), true);
assert.equal(matchesGame(verified, { players: 3, maxMinutes: 45 }), true);
assert.equal(matchesGame(verified, { players: 5, maxMinutes: 45 }), false);
assert.equal(matchesGame(verified, { players: 3, maxMinutes: 30 }), false);
assert.equal(matchesGame(unknownPlayers, { players: null, maxMinutes: null }), false);
assert.equal(matchesGame(unknownTime, { players: null, maxMinutes: null }), false);
assert.equal(matchesGame(unknownPlayers, { players: 3, maxMinutes: null }), false);
assert.equal(matchesGame(unknownTime, { players: null, maxMinutes: 45 }), false);
assert.deepEqual(readFilters('?players=2&maxMinutes=45'), { players: 2, maxMinutes: 45 });
assert.deepEqual(readFilters('?players=0&maxMinutes=999'), { players: null, maxMinutes: null });

console.log('game chooser tests passed');
