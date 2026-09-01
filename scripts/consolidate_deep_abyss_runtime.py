from pathlib import Path

ROOT = Path("docs/play/deep-abyss")
parts = [ROOT / f"app-{i:02d}.txt" for i in range(1, 9)]
patches = [
    ROOT / "runtime-patch.txt",
    ROOT / "runtime-flow-patch.txt",
    ROOT / "runtime-hybrid-patch.txt",
    ROOT / "runtime-test-hook.txt",
    ROOT / "runtime-survey-patch.txt",
]

source = "".join(path.read_text(encoding="utf-8") for path in parts)
runtime_patch = "\n".join(path.read_text(encoding="utf-8") for path in patches)

duplicate_region_binding = "$$('[data-region]').forEach((node) => node.addEventListener('click', () => onRegionClick(Number(node.dataset.region))));"
single_region_binding = "$$('path.region[data-region]').forEach((node) => node.addEventListener('click', (event) => { event.stopPropagation(); onRegionClick(Number(node.dataset.region)); }));"
if duplicate_region_binding not in source:
    raise SystemExit("region binding marker not found")

source = source.replace("el.createRoomButton.addEventListener('click', createRoom);", "el.createRoomButton.addEventListener('click', createRoomResilient);")
source = source.replace("el.joinRoomButton.addEventListener('click', joinRoom);", "el.joinRoomButton.addEventListener('click', joinRoomResilient);")
source = source.replace(duplicate_region_binding, single_region_binding)

old_copy_room = """  el.copyRoomButton.addEventListener('click', async () => {\n    await navigator.clipboard.writeText(`${location.origin}${location.pathname}?room=${state.roomCode}`);\n    toast('招待URLをコピーしました');\n  });"""
new_copy_room = """  el.copyRoomButton.addEventListener('click', async () => {\n    const copied = await copyText(state?.roomCode || local.roomCode);\n    toast(copied ? `参加コード ${state?.roomCode || local.roomCode} をコピーしました` : '参加コードを表示しました');\n  });\n  document.querySelector('#copyInviteButton')?.addEventListener('click', async () => {\n    const code = state?.roomCode || local.roomCode;\n    const url = `${location.origin}${location.pathname}?room=${code}`;\n    const copied = await copyText(url);\n    toast(copied ? '招待URLをコピーしました' : '招待URLを表示しました');\n  });\n  document.querySelector('#cpuModeButton')?.addEventListener('click', createCpuGame);"""
if old_copy_room not in source:
    raise SystemExit("copy room marker not found")
source = source.replace(old_copy_room, new_copy_room)

old_copy_log = """  el.copyLogButton.addEventListener('click', async () => {\n    await navigator.clipboard.writeText(state.logs.slice().reverse().join('\\n'));\n    toast('侵蝕記録をコピーしました');\n  });"""
new_copy_log = """  el.copyLogButton.addEventListener('click', async () => {\n    const copied = await copyText(state.logs.slice().reverse().join('\\n'));\n    toast(copied ? '侵蝕記録をコピーしました' : '侵蝕記録を表示しました');\n  });"""
if old_copy_log not in source:
    raise SystemExit("copy log marker not found")
source = source.replace(old_copy_log, new_copy_log)

closing = source.rfind("})();")
if closing < 0:
    raise SystemExit("engine closure marker not found")
source = f"{source[:closing]}\n{runtime_patch}\n{source[closing:]}"

(ROOT / "app.js").write_text(source, encoding="utf-8")
