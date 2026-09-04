(() => {
  'use strict';

  const isKnownNumber = (value) => Number.isFinite(value);

  function matchesGame(game, filters) {
    const playersMin = game?.players?.min;
    const playersMax = game?.players?.max;
    const timeMin = game?.playtime_minutes?.min;
    const timeMax = game?.playtime_minutes?.max;
    if (![playersMin, playersMax, timeMin, timeMax].every(isKnownNumber)) return false;

    if (filters.players !== null && (filters.players < playersMin || filters.players > playersMax)) return false;
    if (filters.maxMinutes !== null && timeMax > filters.maxMinutes) return false;
    if (filters.maxComplexity !== null && (!isKnownNumber(game.complexity) || game.complexity > filters.maxComplexity)) return false;
    return true;
  }

  function readFilters(search) {
    const params = new URLSearchParams(search);
    const playersRaw = params.get('players');
    const timeRaw = params.get('maxMinutes');
    const complexityRaw = params.get('maxComplexity');
    const players = playersRaw === null ? null : Number(playersRaw);
    const maxMinutes = timeRaw === null ? null : Number(timeRaw);
    const maxComplexity = complexityRaw === null ? null : Number(complexityRaw);
    return {
      players: Number.isInteger(players) && players >= 1 && players <= 12 ? players : null,
      maxMinutes: Number.isInteger(maxMinutes) && [30, 45, 60, 90, 120].includes(maxMinutes) ? maxMinutes : null,
      maxComplexity: Number.isFinite(maxComplexity) && [2, 3, 4].includes(maxComplexity) ? maxComplexity : null,
    };
  }

  function writeFilters(filters) {
    const url = new URL(window.location.href);
    if (filters.players === null) url.searchParams.delete('players');
    else url.searchParams.set('players', String(filters.players));
    if (filters.maxMinutes === null) url.searchParams.delete('maxMinutes');
    else url.searchParams.set('maxMinutes', String(filters.maxMinutes));
    if (filters.maxComplexity === null) url.searchParams.delete('maxComplexity');
    else url.searchParams.set('maxComplexity', String(filters.maxComplexity));
    window.history.replaceState({}, '', url);
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function formatRange(range, suffix) {
    if (!isKnownNumber(range?.min) || !isKnownNumber(range?.max)) return '不明';
    return range.min === range.max ? `${range.min}${suffix}` : `${range.min}–${range.max}${suffix}`;
  }

  function matchReason(game, filters) {
    const reasons = [];
    if (filters.players !== null) reasons.push(`${filters.players}人で遊べる`);
    if (filters.maxMinutes !== null) reasons.push(`最大${game.playtime_minutes.max}分`);
    if (filters.maxComplexity !== null) reasons.push(`複雑度${game.complexity} ≤ ${filters.maxComplexity}`);
    if (reasons.length === 0) reasons.push('人数と時間を確認済み');
    return reasons.join('・');
  }

  function compareGames(a, b) {
    const timeDiff = a.playtime_minutes.max - b.playtime_minutes.max;
    if (timeDiff !== 0) return timeDiff;
    const aComplexity = isKnownNumber(a.complexity) ? a.complexity : Number.POSITIVE_INFINITY;
    const bComplexity = isKnownNumber(b.complexity) ? b.complexity : Number.POSITIVE_INFINITY;
    if (aComplexity !== bComplexity) return aComplexity - bComplexity;
    return String(a.japanese_title || a.title).localeCompare(String(b.japanese_title || b.title), 'ja');
  }

  function renderGames(container, games, totalMatched, filters) {
    if (games.length === 0) {
      container.innerHTML = '<p class="game-chooser-empty" role="status">条件に合う、確認済みデータを持つゲームはありません。条件を広げてください。</p>';
      return;
    }
    const rows = games.map((game) => `
      <tr>
        <th scope="row"><a href="${escapeHtml(game.guide_url)}">${escapeHtml(game.japanese_title || game.title)}</a></th>
        <td>${escapeHtml(formatRange(game.players, '人'))}</td>
        <td>${escapeHtml(formatRange(game.playtime_minutes, '分'))}</td>
        <td>${isKnownNumber(game.complexity) ? escapeHtml(game.complexity) : '不明'}</td>
        <td>${escapeHtml(matchReason(game, filters))}</td>
      </tr>`).join('');
    const note = totalMatched > games.length
      ? `<p class="game-chooser-note">${totalMatched}件一致しています。短い最大プレイ時間を優先し、同じ場合は複雑度が低い順に5件表示しています。</p>`
      : `<p class="game-chooser-note">${totalMatched}件一致しています。短い最大プレイ時間を優先して表示しています。</p>`;
    container.innerHTML = `${note}
      <div class="game-chooser-table-wrap">
        <table>
          <thead><tr><th>ゲーム</th><th>人数</th><th>時間</th><th>複雑度</th><th>候補の理由</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  async function init() {
    const path = window.location.pathname.replace(/index\.html$/, '');
    if (!path.endsWith('/games/ja/')) return;

    const content = document.querySelector('.md-content__inner');
    if (!content) return;

    const section = document.createElement('section');
    section.className = 'game-chooser';
    section.setAttribute('aria-labelledby', 'game-chooser-title');
    section.innerHTML = `
      <h2 id="game-chooser-title">今遊ぶゲームを決める</h2>
      <p>正準カタログで確認できた人数・時間・複雑度だけで候補を絞ります。不明な値は推測しません。</p>
      <div class="game-chooser-controls">
        <label>人数
          <select id="game-chooser-players">
            <option value="">指定しない</option>
            ${Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}">${i + 1}人</option>`).join('')}
          </select>
        </label>
        <label>最大時間
          <select id="game-chooser-time">
            <option value="">指定しない</option>
            <option value="30">30分</option>
            <option value="45">45分</option>
            <option value="60">60分</option>
            <option value="90">90分</option>
            <option value="120">120分</option>
          </select>
        </label>
        <label>最大複雑度
          <select id="game-chooser-complexity">
            <option value="">指定しない</option>
            <option value="2">2以下</option>
            <option value="3">3以下</option>
            <option value="4">4以下</option>
          </select>
        </label>
        <button type="button" id="game-chooser-clear">条件を解除</button>
      </div>
      <div id="game-chooser-results" aria-live="polite"><p>候補を読み込んでいます。</p></div>`;
    content.insertBefore(section, content.firstChild);

    const results = section.querySelector('#game-chooser-results');
    let catalog;
    try {
      const response = await fetch(new URL('../../api/v1/games.json', window.location.href), { cache: 'no-store' });
      if (!response.ok) throw new Error(`catalog HTTP ${response.status}`);
      catalog = await response.json();
      if (!Array.isArray(catalog.games)) throw new Error('catalog games is not an array');
    } catch (error) {
      console.error('Game catalog unavailable', error);
      results.innerHTML = '<p class="game-chooser-error" role="alert">ゲーム候補データを取得できません。条件を推測して表示することはしません。</p>';
      return;
    }

    const playersSelect = section.querySelector('#game-chooser-players');
    const timeSelect = section.querySelector('#game-chooser-time');
    const complexitySelect = section.querySelector('#game-chooser-complexity');
    let filters = readFilters(window.location.search);
    playersSelect.value = filters.players === null ? '' : String(filters.players);
    timeSelect.value = filters.maxMinutes === null ? '' : String(filters.maxMinutes);
    complexitySelect.value = filters.maxComplexity === null ? '' : String(filters.maxComplexity);

    const update = () => {
      filters = {
        players: playersSelect.value === '' ? null : Number(playersSelect.value),
        maxMinutes: timeSelect.value === '' ? null : Number(timeSelect.value),
        maxComplexity: complexitySelect.value === '' ? null : Number(complexitySelect.value),
      };
      writeFilters(filters);
      const matched = catalog.games
        .filter((game) => matchesGame(game, filters))
        .sort(compareGames);
      renderGames(results, matched.slice(0, 5), matched.length, filters);
    };

    playersSelect.addEventListener('change', update);
    timeSelect.addEventListener('change', update);
    complexitySelect.addEventListener('change', update);
    section.querySelector('#game-chooser-clear').addEventListener('click', () => {
      playersSelect.value = '';
      timeSelect.value = '';
      complexitySelect.value = '';
      update();
      playersSelect.focus();
    });
    update();
  }

  globalThis.GameChooserCore = { matchesGame, readFilters, matchReason, compareGames };
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
  }
})();
