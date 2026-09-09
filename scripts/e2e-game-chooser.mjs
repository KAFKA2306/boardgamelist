import { chromium } from 'playwright';

const baseUrl = process.env.GAME_CHOOSER_BASE_URL || 'http://127.0.0.1:8000/site/games/ja/';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const browser = await chromium.launch({ headless: true });
try {
  const desktop = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await desktop.goto(`${baseUrl}?players=2&maxMinutes=60&maxComplexity=3`, { waitUntil: 'networkidle' });

  const chooser = desktop.locator('.game-chooser');
  await chooser.waitFor();
  assert(await desktop.locator('#game-chooser-title').count() === 1, '見出しがありません');
  assert(await chooser.getAttribute('aria-labelledby') === 'game-chooser-title', 'Game Chooserの見出し参照が不正です');
  assert(await desktop.locator('#game-chooser-results').getAttribute('aria-live') === 'polite', '結果領域がaria-liveになっていません');

  const hierarchy = await desktop.locator('.md-content__inner').evaluate((content) => {
    const h1 = content.querySelector('h1');
    const chooserSection = content.querySelector('.game-chooser');
    const introParagraphs = [];
    let node = h1?.nextElementSibling;
    while (node?.tagName === 'P') {
      introParagraphs.push(node);
      node = node.nextElementSibling;
    }
    return {
      hasH1: Boolean(h1),
      h1BeforeChooser: Boolean(h1 && chooserSection && (h1.compareDocumentPosition(chooserSection) & Node.DOCUMENT_POSITION_FOLLOWING)),
      introBeforeChooser: introParagraphs.every((paragraph) => paragraph.compareDocumentPosition(chooserSection) & Node.DOCUMENT_POSITION_FOLLOWING),
      introCount: introParagraphs.length,
    };
  });
  assert(hierarchy.hasH1, 'ページのh1がありません');
  assert(hierarchy.h1BeforeChooser, `ページ名より先にGame Chooserが表示されています: ${JSON.stringify(hierarchy)}`);
  assert(hierarchy.introBeforeChooser, `ページ説明より先にGame Chooserが表示されています: ${JSON.stringify(hierarchy)}`);

  assert(await desktop.locator('#game-chooser-players').inputValue() === '2', '人数をURLから復元できません');
  assert(await desktop.locator('#game-chooser-time').inputValue() === '60', '最大時間をURLから復元できません');
  assert(await desktop.locator('#game-chooser-complexity').inputValue() === '3', '最大複雑度をURLから復元できません');

  const rows = desktop.locator('#game-chooser-results tbody tr');
  const rowCount = await rows.count();
  assert(rowCount >= 1 && rowCount <= 5, `比較候補数が1〜5件ではありません: ${rowCount}`);
  assert(await desktop.locator('#game-chooser-results thead th').count() === 5, '比較表の見出しが不足しています');
  const reasons = await desktop.locator('#game-chooser-results tbody td:last-child').allTextContents();
  assert(reasons.every((value) => value.includes('2人で遊べる') && value.includes('最大') && value.includes('複雑度')),
    `候補理由が条件を説明していません: ${JSON.stringify(reasons)}`);
  const primary = desktop.locator('.game-chooser-primary');
  assert(await primary.count() === 1, '最優先候補が1件に決まりません');
  assert((await primary.textContent()).includes('まず遊ぶ候補:'), '最優先候補の意味が表示されていません');
  const firstRowHref = await rows.first().locator('th a').getAttribute('href');
  assert(await primary.locator('a').getAttribute('href') === firstRowHref, '最優先候補が比較順位1位と一致しません');

  const preset = desktop.getByRole('button', { name: '4人・60分' });
  assert(await preset.count() === 1, '4人・60分のワンクリック条件がありません');
  await preset.click();
  assert(await desktop.locator('#game-chooser-players').inputValue() === '4', 'プリセットが人数を反映していません');
  assert(await desktop.locator('#game-chooser-time').inputValue() === '60', 'プリセットが最大時間を反映していません');
  assert(await desktop.locator('#game-chooser-complexity').inputValue() === '3', 'プリセットが複雑度を反映していません');
  const presetUrl = new URL(desktop.url());
  assert(presetUrl.searchParams.get('players') === '4', 'プリセット条件がURLのplayersへ反映されていません');
  assert(presetUrl.searchParams.get('maxMinutes') === '60', 'プリセット条件がURLのmaxMinutesへ反映されていません');
  assert(presetUrl.searchParams.get('maxComplexity') === '3', 'プリセット条件がURLのmaxComplexityへ反映されていません');
  assert((await primary.textContent()).includes('4人で遊べる'), 'プリセット後の最優先候補が4人条件を説明していません');

  await desktop.locator('#game-chooser-players').focus();
  await desktop.keyboard.press('Tab');
  assert(await desktop.locator('#game-chooser-time').evaluate((el) => el === document.activeElement), 'Tabで最大時間へ移動できません');
  await desktop.keyboard.press('Tab');
  assert(await desktop.locator('#game-chooser-complexity').evaluate((el) => el === document.activeElement), 'Tabで最大複雑度へ移動できません');
  await desktop.keyboard.press('Tab');
  assert(await desktop.locator('#game-chooser-clear').evaluate((el) => el === document.activeElement), 'Tabで条件解除へ移動できません');
  await desktop.keyboard.press('Enter');
  assert(await desktop.locator('#game-chooser-players').evaluate((el) => el === document.activeElement), '条件解除後に人数へフォーカスが戻りません');
  assert(!new URL(desktop.url()).searchParams.has('players'), '条件解除後もplayersがURLに残っています');
  assert(!new URL(desktop.url()).searchParams.has('maxMinutes'), '条件解除後もmaxMinutesがURLに残っています');
  assert(!new URL(desktop.url()).searchParams.has('maxComplexity'), '条件解除後もmaxComplexityがURLに残っています');

  const mobile = await browser.newPage({ viewport: { width: 360, height: 800 } });
  await mobile.goto(baseUrl, { waitUntil: 'networkidle' });
  await mobile.locator('.game-chooser').waitFor();
  const overflow = await mobile.evaluate(() => ({
    viewport: window.innerWidth,
    body: document.body.scrollWidth,
    root: document.documentElement.scrollWidth,
  }));
  assert(overflow.body <= overflow.viewport && overflow.root <= overflow.viewport,
    `スマホ幅でページ全体が横にはみ出しています: ${JSON.stringify(overflow)}`);

  const controls = mobile.locator('.game-chooser-controls').last();
  const boxes = await Promise.all([
    mobile.locator('#game-chooser-players').boundingBox(),
    mobile.locator('#game-chooser-time').boundingBox(),
    mobile.locator('#game-chooser-complexity').boundingBox(),
    mobile.locator('#game-chooser-clear').boundingBox(),
  ]);
  assert(boxes.every((box) => box && box.width >= 300 && box.height >= 44), `スマホ操作領域が不足しています: ${JSON.stringify(boxes)}`);
  assert(await controls.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length) === 1,
    'スマホ幅で操作欄が1列になっていません');
  const presetBoxes = await mobile.locator('.game-chooser-presets button').evaluateAll((buttons) => buttons.map((button) => ({ width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height })));
  assert(presetBoxes.length === 3 && presetBoxes.every((box) => box.width >= 300 && box.height >= 44), `スマホのワンクリック条件が操作しにくいです: ${JSON.stringify(presetBoxes)}`);

  console.log(JSON.stringify({ desktopRows: rowCount, decisionReasons: reasons, hierarchy, preset: { players: 4, maxMinutes: 60, maxComplexity: 3 }, mobileOverflow: overflow, mobileControls: boxes, mobilePresets: presetBoxes }));
} finally {
  await browser.close();
}
