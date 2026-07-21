'use strict';
(async () => {
  const parts = ['./app-01.txt','./app-02.txt','./app-03.txt','./app-04.txt','./app-05.txt','./app-06.txt','./app-07.txt','./app-08.txt'];
  try {
    const responses = await Promise.all(parts.map((path) => fetch(path, {cache:'no-cache'})));
    const failed = responses.find((response) => !response.ok);
    if (failed) throw new Error(`engine chunk ${failed.status}`);
    const source = (await Promise.all(responses.map((response) => response.text()))).join('');
    new Function(source)();
  } catch (error) {
    console.error(error);
    document.body.innerHTML = `<main style="max-width:720px;margin:10vh auto;padding:2rem;color:#fff;font-family:sans-serif"><h1>深淵侵蝕</h1><p>ゲームエンジンの読み込みに失敗しました。</p><pre>${String(error)}</pre></main>`;
  }
})();
