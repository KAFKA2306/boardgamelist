export function sessionIdFromHref(href) {
  const url = new URL(href);
  const body = url.searchParams.get('body') || '';
  const match = body.match(/^sessionId:\s*([0-9a-f-]{36})$/im);
  if (!match) throw new Error('試遊セッションIDを問い合わせリンクから取得できません');
  return match[1];
}

export function buildPlaytestInquiryUrl(href, summary) {
  const sessionId = sessionIdFromHref(href);
  const url = new URL('https://github.com/KAFKA2306/boardgamelist/issues/new');
  url.searchParams.set('template', 'playtest-inquiry.yml');
  url.searchParams.set('game', '深淵侵蝕（試遊済み）');
  url.searchParams.set('purpose', 'この試遊結果をもとに、自作品のブラウザ試遊化または試遊分析を相談したい。');
  url.searchParams.set('session', sessionId);
  if (summary) url.searchParams.set('scope', summary);
  return url.toString();
}

function selectedValue(selector, dataKey) {
  const selected = document.querySelector(`${selector}.selected`);
  return selected?.dataset?.[dataKey] || '未回答';
}

function anonymousPlaytestSummary() {
  const values = [...document.querySelectorAll('#experienceSummary .experience-metrics strong')]
    .map((node) => node.textContent?.trim() || '—');
  const completed = document.querySelector('#resultDialog')?.open ? 'はい' : 'いいえ';
  return [
    '深淵侵蝕の匿名試遊結果',
    `完走: ${completed}`,
    `所要時間: ${values[0] || '—'}秒`,
    `初行動まで: ${values[1] || '—'}秒`,
    `行動数: ${values[2] || '—'}`,
    `迷いクリック: ${values[3] || '—'}`,
    `面白さ: ${selectedValue('[data-rating="fun"]', 'value')}/5`,
    `テンポ: ${selectedValue('[data-rating="tempo"]', 'value')}/5`,
    `ルール理解度: ${selectedValue('[data-understanding]', 'understanding')}/5`,
    `再プレイ意向: ${selectedValue('[data-replay-intent]', 'replayIntent')}/5`,
    '自由記述は公開Issueへ自動転記していません。',
  ].join('\n');
}

if (typeof document !== 'undefined') {
  const link = document.querySelector('#playtestServiceLink');
  if (!link) throw new Error('試遊支援の問い合わせリンクがありません');
  const originalHref = link.href;
  link.addEventListener('click', (event) => {
    try {
      link.href = buildPlaytestInquiryUrl(originalHref, anonymousPlaytestSummary());
    } catch (error) {
      event.preventDefault();
      console.error(error);
      link.textContent = '相談リンクを準備できません';
      link.setAttribute('aria-disabled', 'true');
    }
  });
}
