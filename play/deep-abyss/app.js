'use strict';
(async () => {
  const parts = ['./app-01.txt','./app-02.txt','./app-03.txt','./app-04.txt','./app-05.txt','./app-06.txt','./app-07.txt','./app-08.txt'];
  try {
    const responses = await Promise.all(parts.map((path) => fetch(path, {cache:'no-cache'})));
    const failed = responses.find((response) => !response.ok);
    if (failed) throw new Error(`engine chunk ${failed.status}`);
    let source = (await Promise.all(responses.map((response) => response.text()))).join('');
    const patchResponses = await Promise.all([
      fetch('./runtime-patch.txt', {cache:'no-cache'}),
      fetch('./runtime-flow-patch.txt', {cache:'no-cache'}),
      fetch('./runtime-hybrid-patch.txt', {cache:'no-cache'}),
      fetch('./runtime-test-hook.txt', {cache:'no-cache'}),
    ]);
    const failedPatch = patchResponses.find((response) => !response.ok);
    if (failedPatch) throw new Error(`runtime patch ${failedPatch.status}`);
    const runtimePatch = (await Promise.all(patchResponses.map((response) => response.text()))).join('\n');

    const duplicateRegionBinding = "$$('[data-region]').forEach((node) => node.addEventListener('click', () => onRegionClick(Number(node.dataset.region))));";
    const singleRegionBinding = "$$('path.region[data-region]').forEach((node) => node.addEventListener('click', (event) => { event.stopPropagation(); onRegionClick(Number(node.dataset.region)); }));";
    if (!source.includes(duplicateRegionBinding)) throw new Error('region binding marker not found');

    source = source
      .replace("el.createRoomButton.addEventListener('click', createRoom);", "el.createRoomButton.addEventListener('click', createRoomResilient);")
      .replace("el.joinRoomButton.addEventListener('click', joinRoom);", "el.joinRoomButton.addEventListener('click', joinRoomResilient);")
      .replace(duplicateRegionBinding, () => singleRegionBinding)
      .replace(
        /  el\.copyRoomButton\.addEventListener\('click', async \(\) => \{[\s\S]*?  \}\);\n  el\.actionButtons/,
        `  el.copyRoomButton.addEventListener('click', async () => {\n    const copied = await copyText(state?.roomCode || local.roomCode);\n    toast(copied ? \`参加コード \${state?.roomCode || local.roomCode} をコピーしました\` : '参加コードを表示しました');\n  });\n  document.querySelector('#copyInviteButton')?.addEventListener('click', async () => {\n    const code = state?.roomCode || local.roomCode;\n    const url = \`\${location.origin}\${location.pathname}?room=\${code}\`;\n    const copied = await copyText(url);\n    toast(copied ? '招待URLをコピーしました' : '招待URLを表示しました');\n  });\n  document.querySelector('#cpuModeButton')?.addEventListener('click', createCpuGame);\n  el.actionButtons`
      )
      .replace(
        /  el\.copyLogButton\.addEventListener\('click', async \(\) => \{[\s\S]*?  \}\);/,
        `  el.copyLogButton.addEventListener('click', async () => {\n    const copied = await copyText(state.logs.slice().reverse().join('\\n'));\n    toast(copied ? '侵蝕記録をコピーしました' : '侵蝕記録を表示しました');\n  });`
      );

    const closing = source.lastIndexOf('})();');
    if (closing < 0) throw new Error('engine closure marker not found');
    source = `${source.slice(0, closing)}\n${runtimePatch}\n${source.slice(closing)}`;
    new Function(source)();
  } catch (error) {
    console.error(error);
    document.body.innerHTML = `<main style="max-width:720px;margin:10vh auto;padding:2rem;color:#fff;font-family:sans-serif"><h1>深淵侵蝕</h1><p>ゲームエンジンの読み込みに失敗しました。</p><pre>${String(error)}</pre></main>`;
  }
})();
