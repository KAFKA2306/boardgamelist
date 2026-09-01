(() => {
  'use strict';

  const isKnownNumber = (value) => Number.isFinite(value);

  function matchesGame(game, filters) {
    if (filters.players !== null) {
      const min = game?.players?.min;
      const max = game?.players?.max;
      if (!isKnownNumber(min) || !isKnownNumber(max)) return false;
      if (filters.players < min || filters.players > max) return false;
    }
    if (filters.maxMinutes !== null) {
      const max = game?.playtime_minutes?.max;
      if (!isKnownNumber(max) || max > filters.maxMinutes) return false;
    }
    return true;
  }

  function readFilters(search) {
    const params = new URLSearchParams(search);
    const playersRaw = params.get('players');
    const timeRaw = params.get('maxMinutes');
    const players = playersRaw === null ? null : Number(playersRaw);
    const maxMinutes = timeRaw === null ? null : Number(timeRaw);
    return {
      players: Number.isInteger(players) && players >= 1 && players <= 12 ? players : null,
      maxMinutes: Number.isInteger(maxMinutes) && [30, 45, 60, 90, 120].includes(maxMinutes) ? maxMinutes : null,
    };
  }

  function writeFilters(filters) {
    const url = new URL(window.location.href);
    if (filters.players === null) url.searchParams.delete('players');
    else url.searchParams.set('players', String(filters.players));
    if (filters.maxMinutes === null) url.searchParams.delete('maxMinutes');
    else url.searchParams.set('maxMinutes', String(filters.maxMinutes));
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

  function renderGames(container, games, totalMatched) {
    if (games.length === 0) {
      container.innerHTML = '<p class="game-chooser-empty" role="status">条件に合う、人数と時間が確認済みのゲームはありません。条件を広げてください。</p>';
      return;
    }
    const rows = games.map((game) => `
      <tr>
        <th scope="row"><a href="${escapeHtml(game.guide_url)}">${escapeHtml(game.japanese_title || game.title)}</a></th>
        <td>${escapeHtml(formatRange(game.players, '人'))}</td>
        <td>${escapeHtml(formatRange(game.playtime_minutes, '分'))}</td>
        <td>${isKnownNumber(game.complexity) ? escapeHtml(game.complexity) : '不明'}</td>
      </tr>`).join('');
    const note = totalMatched > games.length
      ? `<p class="game-chooser-note">${totalMatched}件一致しています。比較しやすいよう先頭5件を表示しています。条件を追加して絞り込んでください。</p>`
      : `<p class="game-chooser-note">${totalMatched}件一致しています。</p>`;
    container.innerHTML = `${note}
      <div class="game-chooser-table-wrap">
        <table>
          <thead><tr><th>ゲーム</th><th>人数</th><th>時間</th><th>複雑度</th></tr></thead>
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
      <h2 id="game-chooser-title">今遊ぶ候補を絞る</h2>
      <p>正準カタログで人数と時間が確認できるゲームだけを候補にします。不明な値は推測しません。</p>
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
    let filters = readFilters(window.location.search);
    playersSelect.value = filters.players === null ? '' : String(filters.players);
    timeSelect.value = filters.maxMinutes === null ? '' : String(filters.maxMinutes);

    const update = () => {
      filters = {
        players: playersSelect.value === '' ? null : Number(playersSelect.value),
        maxMinutes: timeSelect.value === '' ? null : Number(timeSelect.value),
      };
      writeFilters(filters);
      const matched = catalog.games
        .filter((game) => matchesGame(game, filters))
        .sort((a, b) => String(a.japanese_title || a.title).localeCompare(String(b.japanese_title || b.title), 'ja'));
      renderGames(results, matched.slice(0, 5), matched.length);
    };

    playersSelect.addEventListener('change', update);
    timeSelect.addEventListener('change', update);
    section.querySelector('#game-chooser-clear').addEventListener('click', () => {
      playersSelect.value = '';
      timeSelect.value = '';
      update();
      playersSelect.focus();
    });
    update();
  }

  globalThis.GameChooserCore = { matchesGame, readFilters };
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
  }
})();
