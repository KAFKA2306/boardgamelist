'use strict';

(() => {
  const DATA = window.DEEP_ABYSS;
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const el = {
    lobbyView: $('#lobbyView'), gameView: $('#gameView'), roomPanel: $('#roomPanel'),
    nameInput: $('#nameInput'), roomInput: $('#roomInput'), createRoomButton: $('#createRoomButton'),
    joinRoomButton: $('#joinRoomButton'), roomCode: $('#roomCode'), gameRoomCode: $('#gameRoomCode'),
    copyRoomButton: $('#copyRoomButton'), lobbyPlayers: $('#lobbyPlayers'), startGameButton: $('#startGameButton'),
    lobbyStatus: $('#lobbyStatus'), networkBadge: $('#networkBadge'), scoreboard: $('#scoreboard'),
    roundLabel: $('#roundLabel'), turnLabel: $('#turnLabel'), unclaimedLabel: $('#unclaimedLabel'),
    board: $('#board'), boardHint: $('#boardHint'), actionButtons: $$('.action-button'),
    selectionSummary: $('#selectionSummary'), cancelSelectionButton: $('#cancelSelectionButton'),
    commitActionButton: $('#commitActionButton'), cardHand: $('#cardHand'), gameLog: $('#gameLog'),
    copyLogButton: $('#copyLogButton'), draftDialog: $('#draftDialog'), draftCards: $('#draftCards'),
    draftStatus: $('#draftStatus'), combatDialog: $('#combatDialog'), combatTitle: $('#combatTitle'),
    combatBody: $('#combatBody'), defenseCards: $('#defenseCards'), defensePassButton: $('#defensePassButton'),
    rulesDialog: $('#rulesDialog'), rulesButton: $('#rulesButton'), resultDialog: $('#resultDialog'),
    resultBody: $('#resultBody'), toast: $('#toast'),
  };

  const local = {
    peer: null,
    conn: null,
    isHost: false,
    connections: new Map(),
    roomCode: '',
    playerId: null,
    clientKey: localStorage.getItem('deepAbyssClientKey') || crypto.randomUUID(),
    selectedCard: null,
    copyCardId: null,
    selection: null,
    lastDraftRound: -1,
  };
  localStorage.setItem('deepAbyssClientKey', local.clientKey);
  el.nameInput.value = localStorage.getItem('deepAbyssName') || '';

  let state = null;

  const deepClone = (value) => JSON.parse(JSON.stringify(value));
  const shuffled = (items) => {
    const list = [...items];
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  };
  const roll = () => Math.floor(Math.random() * 6) + 1;
  const playerById = (id) => state?.players.find((player) => player.id === id);
  const myPlayer = () => state?.players.find((player) => player.clientKey === local.clientKey || player.id === local.playerId);
  const activePlayer = () => state?.players.find((player) => player.seat === state.currentSeat);
  const card = (id) => DATA.cardById[id] || null;
  const score = (seat, owners = state.board) => owners.filter((owner) => owner === seat).length;
  const unclaimed = (owners = state.board) => owners.filter((owner) => owner === null).length;
  const neighbors = (region) => DATA.adjacency[region];
  const ownedRegions = (seat, owners = state.board) => owners.map((owner, i) => owner === seat ? i : -1).filter((i) => i >= 0);
  const hasOwnedNeighbor = (region, seat, owners = state.board) => neighbors(region).some((n) => owners[n] === seat);
  const hasEnemyNeighbor = (region, seat, owners = state.board) => neighbors(region).some((n) => owners[n] !== null && owners[n] !== seat);
  const isRemote = (region, seat, owners = state.board) => owners[region] === null && !hasOwnedNeighbor(region, seat, owners);
  const categoryColor = (category) => ({I:'#a15d4f',H:'#597ca4',C:'#a74755',R:'#7f68a7'})[category];

  function componentsForSeat(seat, owners = state.board) {
    const remaining = new Set(ownedRegions(seat, owners));
    const components = [];
    while (remaining.size) {
      const start = remaining.values().next().value;
      remaining.delete(start);
      const component = [start];
      const queue = [start];
      while (queue.length) {
        const current = queue.shift();
        neighbors(current).forEach((n) => {
          if (remaining.has(n)) {
            remaining.delete(n);
            component.push(n);
            queue.push(n);
          }
        });
      }
      components.push(component);
    }
    return components;
  }

  function largestComponent(seat, owners = state.board) {
    return Math.max(0, ...componentsForSeat(seat, owners).map((part) => part.length));
  }

  function log(message) {
    state.logs.unshift(message);
    state.logs = state.logs.slice(0, 80);
  }

  function toast(message) {
    el.toast.textContent = message;
    el.toast.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.toast.classList.remove('show'), 1800);
  }

  function setNetwork(label, type = 'muted') {
    el.networkBadge.textContent = label;
    el.networkBadge.className = `badge ${type}`;
  }

  function normalizedName() {
    const name = el.nameInput.value.trim().slice(0, 16);
    if (!name) {
      toast('表示名を入力してください');
      return null;
    }
    localStorage.setItem('deepAbyssName', name);
    return name;
  }

  function randomRoomCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({length:6}, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  }

  function roomPeerId(code) {
    return `deep-abyss-${code.toLowerCase()}`;
  }

  function initHostState(name, peerId) {
    return {
      version: 1,
      roomCode: local.roomCode,
      hostId: peerId,
      phase: 'lobby',
      players: [{id:peerId, clientKey:local.clientKey, name, seat:0, color:DATA.COLORS[0], connected:true, cards:[], used:[]}],
      draft: null,
      board: Array(40).fill(null),
      round: 1,
      currentSeat: 0,
      startingSeat: 0,
      usedThisTurn: [false,false,false,false],
      combat: null,
      choice: null,
      reaction: null,
      logs: [],
      endedReason: null,
    };
  }

  function createRoom() {
    if (!window.Peer) {
      toast('通信ライブラリを読み込めませんでした');
      return;
    }
    const name = normalizedName();
    if (!name) return;
    teardownNetwork();
    local.isHost = true;
    local.roomCode = randomRoomCode();
    const id = roomPeerId(local.roomCode);
    setNetwork('部屋を作成中', 'muted');
    local.peer = new Peer(id);
    local.peer.on('open', (peerId) => {
      local.playerId = peerId;
      state = initHostState(name, peerId);
      bindHostPeer();
      render();
      updateRoomUrl();
      setNetwork('ホスト接続済み', 'ok');
    });
    local.peer.on('error', (error) => {
      if (error.type === 'unavailable-id') {
        local.peer.destroy();
        local.roomCode = randomRoomCode();
        createRoomWithExistingName(name);
      } else {
        setNetwork('接続エラー', 'warn');
        toast(`接続エラー: ${error.type || error.message}`);
      }
    });
  }

  function createRoomWithExistingName(name) {
    local.isHost = true;
    const id = roomPeerId(local.roomCode);
    local.peer = new Peer(id);
    local.peer.on('open', (peerId) => {
      local.playerId = peerId;
      state = initHostState(name, peerId);
      bindHostPeer();
      render();
      updateRoomUrl();
      setNetwork('ホスト接続済み', 'ok');
    });
    local.peer.on('error', (error) => {
      setNetwork('接続エラー', 'warn');
      toast(`接続エラー: ${error.type || error.message}`);
    });
  }

  function bindHostPeer() {
    local.peer.on('connection', (conn) => {
      conn.on('open', () => {
        local.connections.set(conn.peer, conn);
        conn.on('data', (message) => handleHostMessage(conn, message));
        conn.on('close', () => disconnectGuest(conn.peer));
        conn.on('error', () => disconnectGuest(conn.peer));
      });
    });
    local.peer.on('disconnected', () => setNetwork('仲介サーバー切断', 'warn'));
  }

  function joinRoom() {
    if (!window.Peer) {
      toast('通信ライブラリを読み込めませんでした');
      return;
    }
    const name = normalizedName();
    if (!name) return;
    const code = el.roomInput.value.trim().toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 6);
    if (code.length !== 6) {
      toast('6文字の部屋コードを入力してください');
      return;
    }
    teardownNetwork();
    local.isHost = false;
    local.roomCode = code;
    setNetwork('接続中', 'muted');
    local.peer = new Peer();
    local.peer.on('open', (peerId) => {
      local.playerId = peerId;
      const conn = local.peer.connect(roomPeerId(code), {reliable:true, serialization:'json'});
      local.conn = conn;
      conn.on('open', () => {
        conn.send({type:'join', name, clientKey:local.clientKey, peerId});
        setNetwork('ホストへ接続済み', 'ok');
        updateRoomUrl();
      });
      conn.on('data', handleClientMessage);
      conn.on('close', () => {
        setNetwork('ホスト切断', 'warn');
        toast('ホストとの接続が終了しました');
      });
      conn.on('error', (error) => {
        setNetwork('接続エラー', 'warn');
        toast(`接続エラー: ${error.type || error.message}`);
      });
    });
    local.peer.on('error', (error) => {
      setNetwork('接続エラー', 'warn');
      toast(`接続エラー: ${error.type || error.message}`);
    });
  }

  function teardownNetwork() {
    if (local.peer && !local.peer.destroyed) local.peer.destroy();
    local.peer = null;
    local.conn = null;
    local.connections.clear();
    local.selection = null;
    local.selectedCard = null;
    local.copyCardId = null;
    state = null;
  }

  function updateRoomUrl() {
    const url = new URL(location.href);
    url.searchParams.set('room', local.roomCode);
    history.replaceState({}, '', url);
  }

  function handleHostMessage(conn, message) {
    if (!message || typeof message !== 'object') return;
    if (message.type === 'join') {
      hostJoin(conn, message);
      return;
    }
    const sender = state.players.find((player) => player.id === conn.peer);
    if (!sender) return;
    if (message.type === 'intent') handleIntent(sender, message.intent);
  }

  function hostJoin(conn, message) {
    const existing = state.players.find((player) => player.clientKey === message.clientKey);
    if (existing) {
      existing.id = conn.peer;
      existing.connected = true;
      existing.name = message.name.slice(0, 16);
      local.connections.set(conn.peer, conn);
      conn.send({type:'welcome', playerId:conn.peer, state});
      broadcast();
      return;
    }
    if (state.phase !== 'lobby' || state.players.length >= 4) {
      conn.send({type:'error', message:state.phase !== 'lobby' ? 'ゲーム開始後は参加できません' : '部屋は満員です'});
      setTimeout(() => conn.close(), 400);
      return;
    }
    const seat = state.players.length;
    state.players.push({
      id:conn.peer,
      clientKey:message.clientKey,
      name:message.name.slice(0,16),
      seat,
      color:DATA.COLORS[seat],
      connected:true,
      cards:[],
      used:[],
    });
    log(`${message.name}が${DATA.COLOR_NAMES[seat]}として参加した。`);
    conn.send({type:'welcome', playerId:conn.peer, state});
    broadcast();
  }

  function disconnectGuest(peerId) {
    local.connections.delete(peerId);
    const player = state?.players.find((p) => p.id === peerId);
    if (player) player.connected = false;
    if (state) broadcast();
  }

  function handleClientMessage(message) {
    if (!message || typeof message !== 'object') return;
    if (message.type === 'welcome') {
      local.playerId = message.playerId;
      state = message.state;
      render();
      return;
    }
    if (message.type === 'state') {
      state = message.state;
      render();
      return;
    }
    if (message.type === 'error') toast(message.message);
  }

  function sendIntent(intent) {
    if (local.isHost) {
      const player = myPlayer();
      if (player) handleIntent(player, intent);
    } else if (local.conn?.open) {
      local.conn.send({type:'intent', intent});
    }
  }

  function broadcast() {
    render();
    local.connections.forEach((conn) => {
      if (conn.open) conn.send({type:'state', state});
    });
  }

  function handleIntent(player, intent) {
    if (!intent || typeof intent !== 'object') return;
    try {
      switch (intent.type) {
        case 'start-draft':
          if (player.seat === 0) startDraft();
          break;
        case 'draft-pick':
          handleDraftPick(player, intent.cardId);
          break;
        case 'action':
          handleAction(player, intent.payload);
          break;
        case 'defense':
          handleDefense(player, intent.cardId || null);
          break;
        case 'choice':
          handleChoice(player, intent.region);
          break;
        case 'reaction':
          handleReaction(player, intent.cardId || null);
          break;
        default:
          break;
      }
    } catch (error) {
      console.error(error);
      const conn = local.connections.get(player.id);
      if (conn?.open) conn.send({type:'error', message:error.message});
      else toast(error.message);
    }
  }

  function startDraft() {
    if (state.phase !== 'lobby') throw new Error('現在はドラフトを開始できません');
    if (state.players.length !== 4 || state.players.some((player) => !player.connected)) throw new Error('接続済みの4人が必要です');
    const selectedByCategory = {};
    ['I','H','C','R'].forEach((category) => {
      selectedByCategory[category] = shuffled(DATA.cards.filter((item) => item.category === category)).slice(0,4).map((item) => item.id);
    });
    const packs = Array.from({length:4}, (_, seat) => [
      selectedByCategory.I[seat], selectedByCategory.H[seat], selectedByCategory.C[seat], selectedByCategory.R[seat],
    ]);
    state.phase = 'draft';
    state.draft = {round:0, packs, picks:[[],[],[],[]], chosen:{}};
    log('標準ドラフトを開始した。');
    broadcast();
  }

  function handleDraftPick(player, cardId) {
    if (state.phase !== 'draft') throw new Error('ドラフト中ではありません');
    if (state.draft.chosen[player.seat]) throw new Error('この巡目では選択済みです');
    if (!state.draft.packs[player.seat].includes(cardId)) throw new Error('そのカードは現在の山にありません');
    state.draft.chosen[player.seat] = cardId;
    if (Object.keys(state.draft.chosen).length < 4) {
      broadcast();
      return;
    }
    const nextPacks = [[],[],[],[]];
    for (let seat = 0; seat < 4; seat += 1) {
      const chosen = state.draft.chosen[seat];
      state.draft.picks[seat].push(chosen);
      const rest = state.draft.packs[seat].filter((id) => id !== chosen);
      nextPacks[(seat + 1) % 4] = rest;
    }
    state.draft.round += 1;
    state.draft.chosen = {};
    state.draft.packs = nextPacks;
    if (state.draft.round >= 4) finishDraft();
    broadcast();
  }

  function finishDraft() {
    state.players.forEach((player) => {
      player.cards = [...state.draft.picks[player.seat]];
      player.used = [];
    });
    state.board = Array(40).fill(null);
    DATA.startRegions.forEach((region, seat) => { state.board[region] = seat; });
    state.startingSeat = Math.floor(Math.random() * 4);
    state.currentSeat = state.startingSeat;
    state.round = 1;
    state.usedThisTurn = [false,false,false,false];
    state.phase = 'playing';
    state.draft = null;
    log(`${state.players[state.startingSeat].name}が開始プレイヤーとなった。`);
    log('四つの教団が覚醒した。第1ラウンド開始。');
  }

  function effectiveCardId(payload) {
    return payload.cardId === 'R-08' ? payload.copyCardId : payload.cardId;
  }

  function ensureCardUsable(player, payload) {
    if (!payload.cardId) return null;
    if (!player.cards.includes(payload.cardId)) throw new Error('所有していない能力です');
    if (player.used.includes(payload.cardId)) throw new Error('その能力は使用済みです');
    if (state.usedThisTurn[player.seat]) throw new Error('この手番中は既に能力を使っています');
    if (payload.cardId === 'R-08') {
      const copied = card(payload.copyCardId);
      if (!copied) throw new Error('複製する能力を選んでください');
      const source = state.players.some((p) => p.used.includes(copied.id));
      if (!source || ['reaction','defense','combat-or-defense','copy'].includes(copied.action)) throw new Error('その能力は複製できません');
      return copied;
    }
    return card(payload.cardId);
  }

  function applyPrelude(player, payload, owners) {
    const effective = effectiveCardId(payload);
    const prelude = payload.prelude || {};
    if (['I-08','H-06','C-08'].includes(effective)) {
      const sacrifice = Number(prelude.sacrifice);
      if (!Number.isInteger(sacrifice) || owners[sacrifice] !== player.seat) throw new Error('戻す自領が不正です');
      owners[sacrifice] = null;
    }
    if (effective === 'H-06') {
      const remote = Number(prelude.remote);
      if (!Number.isInteger(remote) || !isRemote(remote, player.seat, owners)) throw new Error('移住先が遠隔潜伏条件を満たしません');
      owners[remote] = player.seat;
    }
    if (effective === 'H-07') {
      const connector = Number(prelude.connector);
      if (!validConnector(connector, player.seat, owners)) throw new Error('合流可能な区域ではありません');
      owners[connector] = player.seat;
    }
  }

  function validConnector(region, seat, owners = state.board) {
    if (!Number.isInteger(region) || owners[region] !== null) return false;
    const components = componentsForSeat(seat, owners);
    let touching = 0;
    components.forEach((component) => {
      if (component.some((owned) => neighbors(region).includes(owned))) touching += 1;
    });
    return touching >= 2;
  }

  function handleAction(player, payload) {
    if (state.phase !== 'playing' || state.combat || state.choice || state.reaction) throw new Error('現在は通常行動を実行できません');
    if (player.seat !== state.currentSeat) throw new Error('あなたの手番ではありません');
    const effective = ensureCardUsable(player, payload);
    validateCardAction(effective, payload.action);
    const owners = [...state.board];
    applyPrelude(player, payload, owners);
    const originalAfterPrelude = [...owners];
    const outcome = {owners, queue:[], postCombatCard:effective?.id || null};

    if (payload.action === 'expand') resolveExpand(player, payload, effective, originalAfterPrelude, outcome);
    else if (payload.action === 'hide') resolveHide(player, payload, effective, originalAfterPrelude, outcome);
    else if (payload.action === 'combat') resolveCombatAction(player, payload, effective, originalAfterPrelude, outcome);
    else throw new Error('不正な行動です');

    state.board = outcome.owners;
    if (payload.cardId) {
      player.used.push(payload.cardId);
      state.usedThisTurn[player.seat] = true;
      log(`${player.name}は「${card(payload.cardId).name}」を使用した。`);
    }
    if (effective?.id === 'H-06') log(`${player.name}は影の移住で拠点を移した。`);
    if (effective?.id === 'H-07') log(`${player.name}は領域群を合流させた。`);

    if (outcome.queue.length) {
      beginCombatQueue(player.seat, outcome.queue, effective?.id || null, payload.cardId || null);
    } else if (outcome.followCombat) {
      beginCombatQueue(player.seat, [outcome.followCombat], effective?.id || null, payload.cardId || null);
    } else {
      finishTurn();
    }
    broadcast();
  }

  function validateCardAction(effective, action) {
    if (!effective) return;
    if (effective.id === 'H-06' || effective.id === 'H-07') return;
    if (effective.action === 'combat-or-defense' && action === 'combat') return;
    if (effective.action === 'copy') return;
    if (effective.action !== action) throw new Error(`「${effective.name}」はこの行動では使用できません`);
  }

  function maxExpand(effective) {
    if (!effective) return 2;
    if (['I-01','I-02','I-03','I-05','I-06','I-08'].includes(effective.id)) return 3;
    if (effective.id === 'I-04') return 3;
    return 2;
  }

  function resolveExpand(player, payload, effective, original, outcome) {
    const picks = (payload.picks || []).map(Number);
    if (picks.length < 1 || picks.length > maxExpand(effective)) throw new Error('獲得区域数が不正です');
    if (new Set(picks).size !== picks.length) throw new Error('同じ区域を複数回選べません');
    if (effective?.id === 'I-06') {
      const min = Math.min(...state.players.map((p) => score(p.seat, original)));
      if (score(player.seat, original) !== min) throw new Error('最少支配数ではありません');
    }
    if (effective?.id === 'I-05' && componentsForSeat(player.seat, original).length < 2) throw new Error('自領が複数の領域群に分かれていません');
    if (effective?.id === 'H-03') validateCrossBorderExpansion(player.seat, picks, original);
    else if (effective?.id === 'I-01') validateChainExpansion(player.seat, picks, original);
    else if (effective?.id === 'I-02') validateBranchExpansion(player.seat, picks, original);
    else if (effective?.id === 'I-04') validateEncirclementExpansion(player.seat, picks, original);
    else validateNormalExpansion(player.seat, picks, original, effective?.id === 'I-03');
    if (effective?.id === 'I-05') validateMultiComponentExpansion(player.seat, picks, original);
    picks.forEach((region) => { outcome.owners[region] = player.seat; });
    log(`${player.name}が${picks.map((r) => DATA.nodes[r].label).join('・')}を侵蝕した。`);
    if (effective?.id === 'I-07' && payload.followTarget !== null && payload.followTarget !== undefined) {
      const target = Number(payload.followTarget);
      if (outcome.owners[target] === null || outcome.owners[target] === player.seat) throw new Error('侵攻対象が不正です');
      if (!picks.some((region) => neighbors(region).includes(target))) throw new Error('新規区域に隣接する敵領を選んでください');
      outcome.followCombat = {source:picks.find((r) => neighbors(r).includes(target)), target, modifier:-1, threshold:1, label:'境界の腐食'};
    }
  }

  function validateNormalExpansion(seat, picks, original, forbidEnemyAdjacency = false) {
    const work = [...original];
    picks.forEach((region, index) => {
      if (work[region] !== null) throw new Error('未支配区域ではありません');
      if (!hasOwnedNeighbor(region, seat, work)) throw new Error(`${index + 1}区域目が自領に隣接していません`);
      if (forbidEnemyAdjacency && hasEnemyNeighbor(region, seat, work)) throw new Error('敵領に隣接する区域は静かな沃野で獲得できません');
      work[region] = seat;
    });
  }

  function validateChainExpansion(seat, picks, original) {
    if (original[picks[0]] !== null || !hasOwnedNeighbor(picks[0], seat, original)) throw new Error('連鎖の起点が不正です');
    for (let i = 1; i < picks.length; i += 1) {
      if (original[picks[i]] !== null || !neighbors(picks[i - 1]).includes(picks[i])) throw new Error('1本の連鎖になっていません');
    }
  }

  function validateBranchExpansion(seat, picks, original) {
    const candidates = picks.map((region) => {
      if (original[region] !== null) throw new Error('未支配区域ではありません');
      return neighbors(region).filter((n) => original[n] === seat);
    });
    const assign = (index, used) => {
      if (index >= candidates.length) return true;
      return candidates[index].some((source) => !used.has(source) && assign(index + 1, new Set([...used, source])));
    };
    if (!assign(0, new Set())) throw new Error('異なる手番開始時自領から枝分かれしていません');
  }

  function validateEncirclementExpansion(seat, picks, original) {
    if (picks.length <= 2) return validateNormalExpansion(seat, picks, original);
    validateNormalExpansion(seat, picks.slice(0,2), original);
    const third = picks[2];
    if (original[third] !== null || !neighbors(picks[0]).includes(third) || !neighbors(picks[1]).includes(third)) throw new Error('追加区域は先に得た2区域の両方に隣接する必要があります');
  }

  function validateCrossBorderExpansion(seat, picks, original) {
    if (picks.length !== 2) throw new Error('越境布教では2区域を選びます');
    const adjacent = picks.filter((region) => original[region] === null && hasOwnedNeighbor(region, seat, original));
    const remote = picks.filter((region) => isRemote(region, seat, original));
    if (adjacent.length !== 1 || remote.length !== 1) throw new Error('隣接区域1つと遠隔区域1つを選んでください');
  }

  function validateMultiComponentExpansion(seat, picks, original) {
    const components = componentsForSeat(seat, original);
    const touched = new Set();
    picks.forEach((region) => {
      components.forEach((component, index) => {
        if (component.some((owned) => neighbors(region).includes(owned))) touched.add(index);
      });
    });
    if (touched.size < 2) throw new Error('少なくとも2つの領域群から広げてください');
  }

  function resolveHide(player, payload, effective, original, outcome) {
    const picks = (payload.picks || []).map(Number);
    const required = ['H-01','H-02'].includes(effective?.id) ? 2 : 1;
    if (picks.length !== required || new Set(picks).size !== picks.length) throw new Error(`遠隔潜伏では${required}区域を選びます`);
    picks.forEach((region) => {
      if (!isRemote(region, player.seat, original)) throw new Error('遠隔潜伏条件を満たさない区域です');
    });
    if (effective?.id === 'H-01' && !neighbors(picks[0]).includes(picks[1])) throw new Error('地下礼拝堂の2区域は互いに隣接する必要があります');
    if (effective?.id === 'H-02' && neighbors(picks[0]).includes(picks[1])) throw new Error('双子の密議の2区域は互いに隣接できません');
    picks.forEach((region) => { outcome.owners[region] = player.seat; });
    log(`${player.name}が${picks.map((r) => DATA.nodes[r].label).join('・')}へ潜伏した。`);
    if (effective?.id === 'H-04' && payload.followTarget !== null && payload.followTarget !== undefined) {
      const target = Number(payload.followTarget);
      if (outcome.owners[target] === null || outcome.owners[target] === player.seat || !neighbors(picks[0]).includes(target)) throw new Error('内通者の侵攻対象が不正です');
      outcome.followCombat = {source:picks[0], target, modifier:-1, threshold:1, label:'内通者'};
    }
  }

  function resolveCombatAction(player, payload, effective, original, outcome) {
    const pairs = Array.isArray(payload.combats) ? payload.combats : [];
    if (effective?.id === 'H-05') {
      if (pairs.length !== 1) throw new Error('遠隔侵攻の対象を1つ選びます');
      const target = Number(pairs[0].target);
      if (original[target] === null || original[target] === player.seat || hasOwnedNeighbor(target, player.seat, original)) throw new Error('隣接していない敵領を選んでください');
      outcome.queue.push({source:null,target,modifier:0,threshold:2,label:'背教者'});
      return;
    }
    const max = effective?.id === 'C-04' ? 2 : 1;
    if (pairs.length < 1 || pairs.length > max) throw new Error('侵攻数が不正です');
    const targets = new Set();
    pairs.forEach(({source,target}) => {
      source = Number(source); target = Number(target);
      if (original[source] !== player.seat) throw new Error('侵攻元が自領ではありません');
      if (original[target] === null || original[target] === player.seat || !neighbors(source).includes(target)) throw new Error('侵攻対象が隣接敵領ではありません');
      if (targets.has(target)) throw new Error('同じ敵領を2回選べません');
      targets.add(target);
      outcome.queue.push({source,target,modifier:0,threshold:1,label:effective?.name || '教団抗争'});
    });
    if (effective?.id === 'C-03') {
      const target = pairs[0].target;
      const surround = neighbors(target).filter((n) => original[n] === player.seat).length;
      if (surround < 3) throw new Error('対象は自領3区域以上に隣接していません');
    }
    if (effective?.id === 'C-08') {
      const sacrifice = Number(payload.prelude?.sacrifice);
      if (pairs.some((pair) => Number(pair.source) === sacrifice)) throw new Error('侵攻元を血の代価にできません');
    }
  }

  function beginCombatQueue(attackerSeat, queue, effectiveCardIdValue, spentCardId) {
    state.combat = {
      attackerSeat,
      queue,
      index:0,
      effectiveCardId:effectiveCardIdValue,
      spentCardId,
      defenderCardId:null,
      status:'awaiting-defense',
      rolls:null,
    };
  }

  function currentCombat() {
    return state.combat?.queue[state.combat.index] || null;
  }

  function defenseOptions(defender) {
    if (!defender || state.usedThisTurn[defender.seat]) return [];
    return defender.cards.filter((id) => {
      if (defender.used.includes(id)) return false;
      const item = card(id);
      if (['R-01','R-02','R-04','R-05','R-06'].includes(id)) return true;
      if (id === 'R-07' && state.combat?.spentCardId) return true;
      return false;
    });
  }

  function handleDefense(player, cardId) {
    if (!state.combat || state.combat.status !== 'awaiting-defense') throw new Error('防御選択中ではありません');
    const combat = currentCombat();
    const defenderSeat = state.board[combat.target];
    if (player.seat !== defenderSeat) throw new Error('あなたは防御側ではありません');
    if (cardId) {
      if (!defenseOptions(player).includes(cardId)) throw new Error('その防御能力は使用できません');
      player.used.push(cardId);
      state.usedThisTurn[player.seat] = true;
      log(`${player.name}は「${card(cardId).name}」で防御した。`);
    }
    state.combat.defenderCardId = cardId;
    resolveCurrentCombat();
    broadcast();
  }

  function resolveCurrentCombat() {
    const combat = currentCombat();
    const attackerSeat = state.combat.attackerSeat;
    const defenderSeat = state.board[combat.target];
    const attacker = state.players[attackerSeat];
    const defender = state.players[defenderSeat];
    let attackCardId = state.combat.effectiveCardId;
    const defenseCardId = state.combat.defenderCardId;
    if (defenseCardId === 'R-07') attackCardId = null;
    let success = false;
    let attackResult = null;
    let defenseResult = null;
    let automatic = false;

    if (attackCardId === 'C-07') {
      const isolated = !neighbors(combat.target).some((n) => state.board[n] === defenderSeat);
      if (!isolated) throw new Error('対象は孤立していません');
      success = true;
      automatic = true;
    } else if (attackCardId === 'C-08') {
      success = true;
      automatic = true;
    } else {
      attackResult = attackCardId === 'R-05' ? 4 : rollCombatDie(attackCardId, true);
      defenseResult = defenseCardId === 'R-05' ? 4 : rollCombatDie(defenseCardId, false);
      attackResult += combat.modifier || 0;
      if (defenseCardId === 'R-02') attackResult = roll() + (combat.modifier || 0);
      const swapCount = Number(attackCardId === 'R-06') + Number(defenseCardId === 'R-06');
      if (Math.abs(attackResult - defenseResult) === 1 && swapCount % 2 === 1) [attackResult, defenseResult] = [defenseResult, attackResult];
      const tieWins = ['C-01','C-03'].includes(attackCardId);
      success = combat.threshold === 2 ? attackResult - defenseResult >= 2 : (attackResult > defenseResult || (tieWins && attackResult === defenseResult));
    }

    state.combat.rolls = {attackResult, defenseResult, success, automatic};
    const sourceLabel = combat.source === null ? '遠隔' : DATA.nodes[combat.source].label;
    const targetLabel = DATA.nodes[combat.target].label;
    if (success) {
      state.board[combat.target] = attackerSeat;
      log(`${attacker.name}が${sourceLabel}から${targetLabel}を奪取した${automatic ? '（自動成功）' : `（${attackResult}対${defenseResult}）`}。`);
      const reactionCards = reactionOptions(defender, combat.target);
      if (reactionCards.length) {
        state.reaction = {seat:defenderSeat, options:reactionCards, lostRegion:combat.target, attackerSeat};
        state.combat.status = 'awaiting-reaction';
        return;
      }
      if (attackCardId === 'C-05') {
        const eligible = neighbors(combat.target).filter((n) => state.board[n] === null);
        if (eligible.length) return setChoice(attackerSeat, eligible, '蹂躙で獲得する未支配区域を選ぶ', 'combat-continue');
      }
    } else {
      log(`${defender.name}が${targetLabel}を防衛した（${attackResult}対${defenseResult}）。`);
      if (attackCardId === 'C-06') {
        const eligible = neighbors(combat.target).filter((n) => state.board[n] === null);
        if (eligible.length) return setChoice(attackerSeat, eligible, '敗北の種で獲得する未支配区域を選ぶ', 'combat-continue');
      }
      if (defenseCardId === 'R-04' && combat.source !== null) {
        resolveCounterattack(defenderSeat, attackerSeat, combat.target, combat.source);
      }
    }
    continueCombatOrTurn();
  }

  function rollCombatDie(cardId, attacker) {
    if ((attacker && ['C-02','C-03'].includes(cardId)) || (!attacker && cardId === 'R-01')) return Math.max(roll(), roll());
    return roll();
  }

  function reactionOptions(defender) {
    if (!defender || state.usedThisTurn[defender.seat]) return [];
    return defender.cards.filter((id) => !defender.used.includes(id) && ['H-08','R-03'].includes(id));
  }

  function handleReaction(player, cardId) {
    if (!state.reaction || player.seat !== state.reaction.seat) throw new Error('反応選択中ではありません');
    if (cardId && !state.reaction.options.includes(cardId)) throw new Error('その反応能力は使用できません');
    const reaction = state.reaction;
    state.reaction = null;
    if (!cardId) {
      afterReaction();
      broadcast();
      return;
    }
    player.used.push(cardId);
    state.usedThisTurn[player.seat] = true;
    log(`${player.name}は「${card(cardId).name}」を使用した。`);
    let eligible = [];
    if (cardId === 'H-08') eligible = state.board.map((owner,i) => isRemote(i, player.seat, state.board) ? i : -1).filter((i) => i >= 0);
    else if (cardId === 'R-03') {
      const owns = ownedRegions(player.seat);
      eligible = state.board.map((owner,i) => {
        if (owner !== null) return -1;
        if (!owns.length) return i;
        return hasOwnedNeighbor(i, player.seat) ? i : -1;
      }).filter((i) => i >= 0);
    }
    if (eligible.length) setChoice(player.seat, eligible, `${card(cardId).name}で獲得する区域を選ぶ`, 'reaction-continue');
    else afterReaction();
    broadcast();
  }

  function afterReaction() {
    const attackCardId = state.combat?.effectiveCardId;
    const combat = currentCombat();
    if (attackCardId === 'C-05' && combat) {
      const eligible = neighbors(combat.target).filter((n) => state.board[n] === null);
      if (eligible.length) return setChoice(state.combat.attackerSeat, eligible, '蹂躙で獲得する未支配区域を選ぶ', 'combat-continue');
    }
    continueCombatOrTurn();
  }

  function setChoice(seat, eligible, prompt, continuation) {
    state.choice = {seat, eligible, prompt, continuation};
    if (state.combat) state.combat.status = 'awaiting-choice';
  }

  function handleChoice(player, region) {
    if (!state.choice || player.seat !== state.choice.seat) throw new Error('あなたの選択ではありません');
    region = Number(region);
    if (!state.choice.eligible.includes(region) || state.board[region] !== null) throw new Error('選択できない区域です');
    const continuation = state.choice.continuation;
    state.board[region] = player.seat;
    log(`${player.name}が効果により${DATA.nodes[region].label}を獲得した。`);
    state.choice = null;
    if (continuation === 'reaction-continue') afterReaction();
    else if (continuation === 'combat-continue') continueCombatOrTurn();
    broadcast();
  }

  function resolveCounterattack(attackerSeat, defenderSeat, source, target) {
    const a = roll();
    const d = roll();
    if (a > d) {
      state.board[target] = attackerSeat;
      log(`${state.players[attackerSeat].name}の反撃が成功し、${DATA.nodes[target].label}を奪取した（${a}対${d}）。`);
    } else {
      log(`${state.players[defenderSeat].name}が反撃を防いだ（${a}対${d}）。`);
    }
  }

  function continueCombatOrTurn() {
    if (!state.combat) return finishTurn();
    if (state.combat.index + 1 < state.combat.queue.length) {
      state.combat.index += 1;
      state.combat.defenderCardId = null;
      state.combat.rolls = null;
      state.combat.status = 'awaiting-defense';
      return;
    }
    state.combat = null;
    finishTurn();
  }

  function finishTurn() {
    if (shouldEndAtRoundBoundary(false)) return;
    const next = (state.currentSeat + 1) % 4;
    if (next === state.startingSeat) {
      if (shouldEndAtRoundBoundary(true)) return;
      state.round += 1;
      log(`第${state.round}ラウンド開始。`);
    }
    state.currentSeat = next;
    state.usedThisTurn = [false,false,false,false];
  }

  function shouldEndAtRoundBoundary(completedRound) {
    if (!completedRound) return false;
    if (unclaimed() === 0) return endGame('全40区域が支配された');
    if (state.round >= 7) return endGame('第7ラウンドが終了した');
    return false;
  }

  function endGame(reason) {
    state.phase = 'ended';
    state.endedReason = reason;
    state.combat = null;
    state.choice = null;
    state.reaction = null;
    log(`ゲーム終了：${reason}。`);
    return true;
  }

  function render() {
    if (!state) return renderDisconnected();
    const inGame = ['draft','playing','ended'].includes(state.phase);
    el.lobbyView.classList.toggle('hidden', inGame);
    el.gameView.classList.toggle('hidden', !inGame);
    el.roomPanel.classList.remove('hidden');
    el.roomCode.textContent = state.roomCode;
    el.gameRoomCode.textContent = state.roomCode;
    renderLobby();
    if (inGame) {
      renderGame();
      renderDraft();
      renderCombat();
      renderChoice();
      if (state.phase === 'ended') renderResult();
    }
  }

  function renderDisconnected() {
    el.roomPanel.classList.add('hidden');
    el.lobbyView.classList.remove('hidden');
    el.gameView.classList.add('hidden');
  }

  function renderLobby() {
    el.lobbyPlayers.innerHTML = state.players.map((player) => `
      <div class="lobby-player">
        <span class="player-dot" style="color:${player.color};background:${player.color}"></span>
        <span class="name">${escapeHtml(player.name)}</span>
        <small>${player.connected ? DATA.COLOR_NAMES[player.seat] : '切断'}</small>
      </div>`).join('');
    for (let seat = state.players.length; seat < 4; seat += 1) {
      el.lobbyPlayers.insertAdjacentHTML('beforeend', `<div class="lobby-player"><span class="player-dot" style="background:#3a4055"></span><span class="name">参加待ち</span><small>席 ${seat + 1}</small></div>`);
    }
    const ready = state.players.length === 4 && state.players.every((player) => player.connected);
    const host = myPlayer()?.seat === 0;
    el.startGameButton.classList.toggle('hidden', !(ready && host && state.phase === 'lobby'));
    el.lobbyStatus.textContent = state.phase === 'lobby' ? `${state.players.length} / 4人 接続` : 'ゲーム開始済み';
  }

  function renderGame() {
    el.roundLabel.textContent = `${Math.min(state.round,7)} / 7`;
    el.unclaimedLabel.textContent = unclaimed();
    const active = activePlayer();
    el.turnLabel.textContent = state.phase === 'ended' ? '終了' : active ? active.name : '—';
    el.scoreboard.innerHTML = state.players.map((player) => `
      <article class="score-card ${player.seat === state.currentSeat && state.phase === 'playing' ? 'active' : ''}" style="--player-color:${player.color}">
        <div class="score-name"><span class="player-dot" style="background:${player.color};color:${player.color}"></span>${escapeHtml(player.name)}</div>
        <div class="score-value">${score(player.seat)}<small> 区域</small></div>
        <small>最大領域群 ${largestComponent(player.seat)}</small>
      </article>`).join('');
    renderBoard();
    renderCards();
    renderActions();
    el.gameLog.innerHTML = state.logs.map((entry) => `<li>${escapeHtml(entry)}</li>`).join('');
  }

  function organicPath(node) {
    const points = [];
    const count = 9;
    const radius = 38 + (node.id * 13 % 17);
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i / count) + ((node.id % 5) - 2) * .025;
      const variance = 0.78 + (((node.id + 3) * (i + 5) * 17) % 29) / 100;
      points.push([node.x + Math.cos(angle) * radius * variance * 1.25, node.y + Math.sin(angle) * radius * variance]);
    }
    return `M ${points.map(([x,y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L ')} Z`;
  }

  function renderBoard() {
    const highlights = new Set(currentHighlights());
    const selected = new Set(selectionRegions());
    let html = `<defs><radialGradient id="abyssGlow"><stop offset="0" stop-color="#281d39"/><stop offset="1" stop-color="#080914"/></radialGradient></defs>`;
    DATA.edges.forEach((edge) => {
      const a = DATA.nodes[edge.a], b = DATA.nodes[edge.b];
      html += `<line class="board-edge ${edge.route ? 'route' : ''}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`;
    });
    html += `<ellipse class="abyss-ring" cx="500" cy="360" rx="120" ry="92" fill="url(#abyssGlow)"/><text class="abyss-text" x="500" y="356">THE ABYSS</text><text class="abyss-text" x="500" y="380">深淵</text>`;
    DATA.nodes.forEach((node) => {
      const owner = state.board[node.id];
      const fill = owner === null ? '#242a3e' : DATA.COLORS[owner];
      const classes = ['region'];
      if (highlights.has(node.id)) classes.push('highlight');
      if (selected.has(node.id)) classes.push('selected');
      if ((local.selection || state.choice) && !highlights.has(node.id) && !selected.has(node.id)) classes.push('disabled');
      html += `<g data-region="${node.id}"><path class="${classes.join(' ')}" data-region="${node.id}" d="${organicPath(node)}" fill="${fill}"/><text class="region-label" x="${node.x}" y="${node.y + 4}">${node.label}</text>${node.start ? `<text class="region-owner" x="${node.x}" y="${node.y + 19}">START</text>` : ''}</g>`;
    });
    el.board.innerHTML = html;
    $$('path.region[data-region]').forEach((node) => node.addEventListener('click', (event) => { event.stopPropagation(); onRegionClick(Number(node.dataset.region)); }));
  }

  function renderCards() {
    const me = myPlayer();
    if (!me) return;
    el.cardHand.innerHTML = me.cards.map((id) => {
      const item = card(id);
      const used = me.used.includes(id);
      const selected = local.selectedCard === id;
      const disabled = used || state.usedThisTurn[me.seat] || state.phase !== 'playing';
      return `<button class="ability-card ${used ? 'used' : ''} ${selected ? 'selected' : ''}" data-card="${id}" style="--category-color:${categoryColor(item.category)}" ${disabled ? 'disabled' : ''}>
        <strong><span>${item.id} ${item.name}</span><em>${item.timing}</em></strong><p>${item.text}</p>
      </button>`;
    }).join('');
    $$('.ability-card[data-card]').forEach((button) => button.addEventListener('click', () => selectCard(button.dataset.card)));
  }

  function selectCard(id) {
    if (!isMyActiveTurn()) return;
    if (local.selectedCard === id) {
      local.selectedCard = null;
      local.copyCardId = null;
    } else {
      local.selectedCard = id;
      local.copyCardId = null;
      if (id === 'R-08') {
        const eligible = state.players.flatMap((p) => p.used).map(card).filter((item) => item && !['reaction','defense','combat-or-defense','copy'].includes(item.action));
        if (!eligible.length) {
          toast('複製できる使用済みカードがありません');
          local.selectedCard = null;
        } else {
          const answer = prompt(`複製するカードIDを入力してください:\n${eligible.map((item) => `${item.id} ${item.name}`).join('\n')}`, eligible[0].id);
          if (!eligible.some((item) => item.id === answer)) {
            toast('有効なカードIDが選ばれませんでした');
            local.selectedCard = null;
          } else local.copyCardId = answer;
        }
      }
    }
    local.selection = null;
    renderGame();
  }

  function isMyActiveTurn() {
    const me = myPlayer();
    return state.phase === 'playing' && me?.seat === state.currentSeat && !state.combat && !state.choice && !state.reaction;
  }

  function renderActions() {
    const enabled = isMyActiveTurn();
    el.actionButtons.forEach((button) => {
      button.disabled = !enabled;
      button.classList.toggle('active', local.selection?.action === button.dataset.action);
    });
    const canCommit = enabled && local.selection && selectionComplete();
    el.commitActionButton.disabled = !canCommit;
    el.cancelSelectionButton.disabled = !local.selection;
    el.selectionSummary.textContent = selectionDescription();
    el.boardHint.textContent = state.choice ? (state.choice.seat === myPlayer()?.seat ? state.choice.prompt : `${state.players[state.choice.seat].name}が区域を選択中`) : boardInstruction();
  }

  function startAction(action) {
    if (!isMyActiveTurn()) return;
    const effective = local.selectedCard === 'R-08' ? card(local.copyCardId) : card(local.selectedCard);
    try { validateCardAction(effective, action); }
    catch (error) { toast(error.message); return; }
    local.selection = {action, cardId:local.selectedCard, copyCardId:local.copyCardId, prelude:{}, picks:[], combats:[], followTarget:null};
    renderGame();
  }

  function selectionEffectiveId() {
    if (!local.selection?.cardId) return null;
    return local.selection.cardId === 'R-08' ? local.selection.copyCardId : local.selection.cardId;
  }

  function tempOwnersForSelection() {
    const owners = [...state.board];
    const effective = selectionEffectiveId();
    const prelude = local.selection?.prelude || {};
    if (['I-08','H-06','C-08'].includes(effective) && Number.isInteger(prelude.sacrifice)) owners[prelude.sacrifice] = null;
    if (effective === 'H-06' && Number.isInteger(prelude.remote)) owners[prelude.remote] = myPlayer().seat;
    if (effective === 'H-07' && Number.isInteger(prelude.connector)) owners[prelude.connector] = myPlayer().seat;
    return owners;
  }

  function selectionStep() {
    if (!local.selection) return null;
    const effective = selectionEffectiveId();
    const prelude = local.selection.prelude;
    if (['I-08','H-06','C-08'].includes(effective) && !Number.isInteger(prelude.sacrifice)) return 'sacrifice';
    if (effective === 'H-06' && !Number.isInteger(prelude.remote)) return 'remote-prelude';
    if (effective === 'H-07' && !Number.isInteger(prelude.connector)) return 'connector';
    return local.selection.action;
  }

  function currentHighlights() {
    const me = myPlayer();
    if (!me || state.phase !== 'playing') return state.choice && state.choice.seat === me?.seat ? state.choice.eligible : [];
    if (state.choice) return state.choice.seat === me.seat ? state.choice.eligible : [];
    if (!local.selection) return [];
    const step = selectionStep();
    const owners = tempOwnersForSelection();
    if (step === 'sacrifice') return ownedRegions(me.seat, owners);
    if (step === 'remote-prelude') return owners.map((owner,i) => isRemote(i,me.seat,owners) ? i : -1).filter((i) => i >= 0);
    if (step === 'connector') return owners.map((owner,i) => validConnector(i,me.seat,owners) ? i : -1).filter((i) => i >= 0);
    if (step === 'expand') return expandHighlights(me.seat, owners);
    if (step === 'hide') return hideHighlights(me.seat, owners);
    if (step === 'combat') return combatHighlights(me.seat, owners);
    return [];
  }

  function expandHighlights(seat, owners) {
    const effective = selectionEffectiveId();
    const picks = local.selection.picks;
    const max = maxExpand(card(effective));
    const result = new Set();
    if (picks.length < max) {
      owners.forEach((owner,region) => {
        if (owner !== null || picks.includes(region)) return;
        const work = [...owners]; picks.forEach((p) => {work[p] = seat;});
        if (effective === 'H-03') {
          const hasAdjacentPick = picks.some((p) => hasOwnedNeighbor(p,seat,owners));
          const hasRemotePick = picks.some((p) => isRemote(p,seat,owners));
          if ((!hasAdjacentPick && hasOwnedNeighbor(region,seat,owners)) || (!hasRemotePick && isRemote(region,seat,owners))) result.add(region);
        } else if (effective === 'I-01' && picks.length) {
          if (neighbors(picks[picks.length - 1]).includes(region)) result.add(region);
        } else if (effective === 'I-04' && picks.length >= 2) {
          if (neighbors(picks[0]).includes(region) && neighbors(picks[1]).includes(region)) result.add(region);
        } else if (hasOwnedNeighbor(region,seat,work)) {
          if (effective !== 'I-03' || !hasEnemyNeighbor(region,seat,work)) result.add(region);
        }
      });
    }
    if (['I-07'].includes(effective) && picks.length) {
      state.board.forEach((owner,region) => {
        if (owner !== null && owner !== seat && picks.some((p) => neighbors(p).includes(region))) result.add(region);
      });
    }
    return [...result];
  }

  function hideHighlights(seat, owners) {
    const effective = selectionEffectiveId();
    const picks = local.selection.picks;
    const required = ['H-01','H-02'].includes(effective) ? 2 : 1;
    const result = new Set();
    if (picks.length < required) {
      owners.forEach((owner,region) => {
        if (!isRemote(region,seat,owners) || picks.includes(region)) return;
        if (effective === 'H-01' && picks.length && !neighbors(picks[0]).includes(region)) return;
        if (effective === 'H-02' && picks.length && neighbors(picks[0]).includes(region)) return;
        result.add(region);
      });
    }
    if (effective === 'H-04' && picks.length === 1) {
      neighbors(picks[0]).forEach((region) => {
        if (owners[region] !== null && owners[region] !== seat) result.add(region);
      });
    }
    return [...result];
  }

  function combatHighlights(seat, owners) {
    const effective = selectionEffectiveId();
    const combats = local.selection.combats;
    if (effective === 'H-05') return owners.map((owner,region) => owner !== null && owner !== seat && !hasOwnedNeighbor(region,seat,owners) ? region : -1).filter((i) => i >= 0);
    const current = combats[combats.length - 1];
    if (!current || Number.isInteger(current.target)) {
      const max = effective === 'C-04' ? 2 : 1;
      if (combats.length >= max) return [];
      return ownedRegions(seat, owners);
    }
    return neighbors(current.source).filter((region) => owners[region] !== null && owners[region] !== seat && !combats.some((pair) => pair.target === region));
  }

  function selectionRegions() {
    if (!local.selection) return [];
    const values = [...local.selection.picks];
    Object.values(local.selection.prelude || {}).forEach((value) => { if (Number.isInteger(value)) values.push(value); });
    local.selection.combats.forEach((pair) => { if (Number.isInteger(pair.source)) values.push(pair.source); if (Number.isInteger(pair.target)) values.push(pair.target); });
    if (Number.isInteger(local.selection.followTarget)) values.push(local.selection.followTarget);
    return values;
  }

  function onRegionClick(region) {
    const me = myPlayer();
    if (state.choice && state.choice.seat === me?.seat) {
      if (state.choice.eligible.includes(region)) sendIntent({type:'choice', region});
      return;
    }
    if (!local.selection || !isMyActiveTurn()) return;
    const highlights = currentHighlights();
    if (!highlights.includes(region)) {
      if (selectionRegions().includes(region)) undoRegion(region);
      return;
    }
    const step = selectionStep();
    if (step === 'sacrifice') local.selection.prelude.sacrifice = region;
    else if (step === 'remote-prelude') local.selection.prelude.remote = region;
    else if (step === 'connector') local.selection.prelude.connector = region;
    else if (step === 'expand') {
      if (state.board[region] !== null && state.board[region] !== me.seat) local.selection.followTarget = region;
      else local.selection.picks.push(region);
    } else if (step === 'hide') {
      if (state.board[region] !== null && state.board[region] !== me.seat) local.selection.followTarget = region;
      else local.selection.picks.push(region);
    } else if (step === 'combat') {
      const effective = selectionEffectiveId();
      if (effective === 'H-05') local.selection.combats = [{source:null,target:region}];
      else {
        let current = local.selection.combats[local.selection.combats.length - 1];
        if (!current || Number.isInteger(current.target)) {
          current = {source:region,target:null};
          local.selection.combats.push(current);
        } else current.target = region;
      }
    }
    renderGame();
  }

  function undoRegion(region) {
    const s = local.selection;
    if (s.followTarget === region) s.followTarget = null;
    else if (s.picks[s.picks.length - 1] === region) s.picks.pop();
    else {
      const key = Object.keys(s.prelude).find((name) => s.prelude[name] === region);
      if (key) {
        s.prelude[key] = null;
        if (key === 'sacrifice') s.prelude.remote = null;
      } else {
        const last = s.combats[s.combats.length - 1];
        if (last?.target === region) last.target = null;
        else if (last?.source === region) s.combats.pop();
      }
    }
    renderGame();
  }

  function selectionComplete() {
    const effective = selectionEffectiveId();
    const prelude = local.selection.prelude;
    if (['I-08','H-06','C-08'].includes(effective) && !Number.isInteger(prelude.sacrifice)) return false;
    if (effective === 'H-06' && !Number.isInteger(prelude.remote)) return false;
    if (effective === 'H-07' && !Number.isInteger(prelude.connector)) return false;
    if (local.selection.action === 'expand') {
      if (effective === 'H-03') return local.selection.picks.length === 2;
      return local.selection.picks.length >= 1;
    }
    if (local.selection.action === 'hide') return local.selection.picks.length === (['H-01','H-02'].includes(effective) ? 2 : 1);
    if (local.selection.action === 'combat') return local.selection.combats.length >= 1 && local.selection.combats.every((pair) => Number.isInteger(pair.target) && (effective === 'H-05' || Number.isInteger(pair.source)));
    return false;
  }

  function selectionDescription() {
    if (!local.selection) return isMyActiveTurn() ? '能力カードは任意です。行動を1つ選んでください。' : '他の教団の手番です。';
    const names = selectionRegions().map((region) => DATA.nodes[region].label).join(' → ') || '未選択';
    const ability = local.selection.cardId ? `${card(local.selection.cardId).name}${local.selection.cardId === 'R-08' ? `→${card(local.selection.copyCardId)?.name}` : ''}` : '能力なし';
    return `${ability} / 選択: ${names}`;
  }

  function boardInstruction() {
    if (state.phase === 'ended') return 'ゲームは終了しました';
    if (!isMyActiveTurn()) return `${activePlayer()?.name || '—'}の手番です`;
    if (!local.selection) return '能力を任意で選び、行動を選択してください';
    const step = selectionStep();
    return ({sacrifice:'未支配へ戻す自領を選択', 'remote-prelude':'移住先の遠隔区域を選択', connector:'2領域群をつなぐ区域を選択', expand:'侵蝕する未支配区域を選択', hide:'遠隔潜伏する区域を選択', combat:'侵攻元と敵領を順に選択'})[step] || '区域を選択';
  }

  function commitSelection() {
    if (!selectionComplete()) return;
    const payload = deepClone(local.selection);
    local.selection = null;
    local.selectedCard = null;
    local.copyCardId = null;
    sendIntent({type:'action', payload});
  }

  function renderDraft() {
    if (state.phase !== 'draft') {
      if (el.draftDialog.open) el.draftDialog.close();
      return;
    }
    const me = myPlayer();
    if (!me) return;
    const chosen = state.draft.chosen[me.seat];
    const pack = state.draft.packs[me.seat] || [];
    el.draftStatus.textContent = chosen ? `選択済み。全員の選択を待っています（${Object.keys(state.draft.chosen).length}/4）` : `第${state.draft.round + 1}巡目。1枚を選び、残りを左へ渡します。`;
    el.draftCards.innerHTML = pack.map((id) => {
      const item = card(id);
      return `<button class="draft-choice" data-draft-card="${id}" style="--category-color:${categoryColor(item.category)}" ${chosen ? 'disabled' : ''}><small>${DATA.categoryNames[item.category]} · ${item.timing}</small><h3>${item.id} ${item.name}</h3><p>${item.text}</p></button>`;
    }).join('');
    $$('[data-draft-card]').forEach((button) => button.addEventListener('click', (event) => {
      event.preventDefault();
      sendIntent({type:'draft-pick', cardId:button.dataset.draftCard});
    }));
    if (!el.draftDialog.open) el.draftDialog.showModal();
  }

  function renderCombat() {
    if (!state.combat) {
      if (el.combatDialog.open) el.combatDialog.close();
      return;
    }
    const combat = currentCombat();
    const attacker = state.players[state.combat.attackerSeat];
    const defenderSeat = state.board[combat.target];
    const defender = state.players[defenderSeat];
    if (state.combat.status === 'awaiting-reaction') {
      renderReaction();
      return;
    }
    if (state.combat.status !== 'awaiting-defense') {
      if (el.combatDialog.open) el.combatDialog.close();
      return;
    }
    el.combatTitle.textContent = `${attacker.name} → ${defender.name}`;
    el.combatBody.innerHTML = `<div class="combat-side"><strong>${escapeHtml(attacker.name)}</strong><div class="combat-die">⚔</div><small>${combat.source === null ? '遠隔侵攻' : DATA.nodes[combat.source].label}</small></div><div class="combat-vs">VS</div><div class="combat-side"><strong>${escapeHtml(defender.name)}</strong><div class="combat-die">⬟</div><small>${DATA.nodes[combat.target].label}</small></div>`;
    const me = myPlayer();
    const mine = me?.seat === defenderSeat;
    const options = mine ? defenseOptions(me) : [];
    el.defenseCards.innerHTML = mine ? options.map((id) => `<button type="button" class="ability-card" data-defense-card="${id}" style="--category-color:${categoryColor(card(id).category)}"><strong><span>${id} ${card(id).name}</span><em>${card(id).timing}</em></strong><p>${card(id).text}</p></button>`).join('') : `<p class="status-text">${escapeHtml(defender.name)}が防御能力を選択中です。</p>`;
    el.defensePassButton.classList.toggle('hidden', !mine);
    $$('[data-defense-card]').forEach((button) => button.addEventListener('click', () => sendIntent({type:'defense', cardId:button.dataset.defenseCard})));
    if (!el.combatDialog.open) el.combatDialog.showModal();
  }

  function renderReaction() {
    const reaction = state.reaction;
    if (!reaction) return;
    const me = myPlayer();
    const mine = me?.seat === reaction.seat;
    el.combatTitle.textContent = '領域喪失への反応';
    el.combatBody.innerHTML = `<p>${escapeHtml(state.players[reaction.seat].name)}は${DATA.nodes[reaction.lostRegion].label}を失いました。</p>`;
    el.defenseCards.innerHTML = mine ? reaction.options.map((id) => `<button type="button" class="ability-card" data-reaction-card="${id}" style="--category-color:${categoryColor(card(id).category)}"><strong><span>${id} ${card(id).name}</span><em>${card(id).timing}</em></strong><p>${card(id).text}</p></button>`).join('') : `<p class="status-text">反応能力を選択中です。</p>`;
    el.defensePassButton.classList.toggle('hidden', !mine);
    el.defensePassButton.textContent = '反応しない';
    $$('[data-reaction-card]').forEach((button) => button.addEventListener('click', () => sendIntent({type:'reaction', cardId:button.dataset.reactionCard})));
    if (!el.combatDialog.open) el.combatDialog.showModal();
  }

  function renderChoice() {
    if (!state.choice) return;
    if (el.combatDialog.open) el.combatDialog.close();
  }

  function renderResult() {
    const ranking = state.players.map((player) => ({...player, points:score(player.seat), largest:largestComponent(player.seat)})).sort((a,b) => b.points - a.points || b.largest - a.largest);
    const bestPoints = ranking[0].points;
    const bestLargest = Math.max(...ranking.filter((r) => r.points === bestPoints).map((r) => r.largest));
    const winners = ranking.filter((r) => r.points === bestPoints && r.largest === bestLargest);
    el.resultBody.innerHTML = `<p>${escapeHtml(state.endedReason || '')}</p><h3>${winners.map((p) => escapeHtml(p.name)).join('・')}の勝利</h3><table class="result-table"><thead><tr><th>教団</th><th>区域</th><th>最大領域群</th></tr></thead><tbody>${ranking.map((p) => `<tr class="${winners.includes(p) ? 'winner-row' : ''}"><td>${escapeHtml(p.name)}</td><td>${p.points}</td><td>${p.largest}</td></tr>`).join('')}</tbody></table>`;
    if (!el.resultDialog.open) el.resultDialog.showModal();
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  }

  el.createRoomButton.addEventListener('click', createRoomResilient);
  el.joinRoomButton.addEventListener('click', joinRoomResilient);
  el.roomInput.addEventListener('input', () => { el.roomInput.value = el.roomInput.value.toUpperCase().replace(/[^A-Z2-9]/g,'').slice(0,6); });
  el.startGameButton.addEventListener('click', () => sendIntent({type:'start-draft'}));
  el.copyRoomButton.addEventListener('click', async () => {
    const copied = await copyText(state?.roomCode || local.roomCode);
    toast(copied ? `参加コード ${state?.roomCode || local.roomCode} をコピーしました` : '参加コードを表示しました');
  });
  document.querySelector('#copyInviteButton')?.addEventListener('click', async () => {
    const code = state?.roomCode || local.roomCode;
    const url = `${location.origin}${location.pathname}?room=${code}`;
    const copied = await copyText(url);
    toast(copied ? '招待URLをコピーしました' : '招待URLを表示しました');
  });
  document.querySelector('#cpuModeButton')?.addEventListener('click', createCpuGame);
  el.actionButtons.forEach((button) => button.addEventListener('click', () => startAction(button.dataset.action)));
  el.cancelSelectionButton.addEventListener('click', () => { local.selection = null; renderGame(); });
  el.commitActionButton.addEventListener('click', commitSelection);
  el.rulesButton.addEventListener('click', () => el.rulesDialog.showModal());
  el.defensePassButton.addEventListener('click', (event) => {
    event.preventDefault();
    if (state.reaction) sendIntent({type:'reaction', cardId:null});
    else sendIntent({type:'defense', cardId:null});
  });
  el.copyLogButton.addEventListener('click', async () => {
    const copied = await copyText(state.logs.slice().reverse().join('\n'));
    toast(copied ? '侵蝕記録をコピーしました' : '侵蝕記録を表示しました');
  });

  const roomFromUrl = new URL(location.href).searchParams.get('room');
  if (roomFromUrl) {
    el.roomInput.value = roomFromUrl.toUpperCase().slice(0,6);
    el.nameInput.focus();
  }

  local.cpuMode = false;
  local.cpuTimer = null;
  local.networkGeneration = 0;

  function peerOptions() {
    return {
      host: '0.peerjs.com',
      port: 443,
      path: '/',
      secure: true,
      key: 'peerjs',
      debug: 1,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
        sdpSemantics: 'unified-plan',
      },
    };
  }

  function peerErrorMessage(error) {
    const type = error?.type || 'unknown';
    const messages = {
      'peer-unavailable': '参加先が見つかりません。参加コード、ホスト画面が開いていること、ホストの接続完了表示を確認してください。',
      'server-error': 'PeerJSのシグナリングサーバーへ接続できませんでした。自動再試行後も失敗しています。CPU検証モードは利用できます。',
      network: 'ネットワークまたはPeerJSサーバーへ接続できませんでした。通信環境を確認してください。',
      'socket-error': 'PeerJSとの通信ソケットでエラーが発生しました。',
      'socket-closed': 'PeerJSとの通信ソケットが閉じました。',
      'browser-incompatible': 'このブラウザはWebRTC接続に対応していません。Chrome、Edge、Firefox、Safariの最新版を使用してください。',
      'unavailable-id': '同じ参加コードが既に使用されています。新しいコードで再作成します。',
      webrtc: 'WebRTC接続に失敗しました。NATやファイアウォールにより直接接続できない可能性があります。',
    };
    return messages[type] || `接続エラー: ${type}${error?.message ? ` (${error.message})` : ''}`;
  }

  function destroyCurrentPeer() {
    if (local.conn?.open) local.conn.close();
    if (local.peer && !local.peer.destroyed) local.peer.destroy();
    local.conn = null;
    local.peer = null;
  }

  function createRoomResilient() {
    if (!window.Peer) {
      toast('通信ライブラリを読み込めませんでした。CPU検証モードは利用できます。');
      return;
    }
    const name = normalizedName();
    if (!name) return;
    teardownNetwork();
    local.cpuMode = false;
    local.isHost = true;
    local.roomCode = randomRoomCode();
    local.networkGeneration += 1;
    openHostPeer(name, 0, local.networkGeneration);
  }

  function openHostPeer(name, attempt, generation) {
    if (generation !== local.networkGeneration) return;
    destroyCurrentPeer();
    const id = roomPeerId(local.roomCode);
    setNetwork(attempt ? `部屋を再接続中 ${attempt}/2` : '部屋を作成中', 'muted');
    const peer = new Peer(id, peerOptions());
    local.peer = peer;
    let settled = false;
    const timer = setTimeout(() => fail(new Error('接続タイムアウト')), 12000);

    function fail(error) {
      if (settled || generation !== local.networkGeneration) return;
      settled = true;
      clearTimeout(timer);
      const type = error?.type || '';
      if (type === 'unavailable-id') {
        local.roomCode = randomRoomCode();
        openHostPeer(name, 0, generation);
        return;
      }
      if (attempt < 2 && ['server-error','network','socket-error','socket-closed',''].includes(type)) {
        setNetwork('接続を再試行します', 'warn');
        setTimeout(() => openHostPeer(name, attempt + 1, generation), 800 * (attempt + 1));
        return;
      }
      setNetwork('接続エラー', 'warn');
      toast(peerErrorMessage(error));
    }

    peer.on('open', (peerId) => {
      if (settled || generation !== local.networkGeneration) return;
      settled = true;
      clearTimeout(timer);
      local.playerId = peerId;
      state = initHostState(name, peerId);
      bindHostPeer();
      render();
      updateRoomUrl();
      setNetwork('ホスト接続済み', 'ok');
    });
    peer.on('error', fail);
  }

  function joinRoomResilient() {
    if (!window.Peer) {
      toast('通信ライブラリを読み込めませんでした。CPU検証モードは利用できます。');
      return;
    }
    const name = normalizedName();
    if (!name) return;
    const code = el.roomInput.value.trim().toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 6);
    if (code.length !== 6) {
      toast('6文字の参加コードを入力してください');
      return;
    }
    teardownNetwork();
    local.cpuMode = false;
    local.isHost = false;
    local.roomCode = code;
    local.networkGeneration += 1;
    openGuestPeer(name, code, 0, local.networkGeneration);
  }

  function openGuestPeer(name, code, attempt, generation) {
    if (generation !== local.networkGeneration) return;
    destroyCurrentPeer();
    setNetwork(attempt ? `再接続中 ${attempt}/2` : '接続中', 'muted');
    const peer = new Peer(peerOptions());
    local.peer = peer;
    let settled = false;
    let connectionTimer = null;
    const peerTimer = setTimeout(() => fail(new Error('サーバー接続タイムアウト')), 12000);

    function fail(error) {
      if (settled || generation !== local.networkGeneration) return;
      settled = true;
      clearTimeout(peerTimer);
      clearTimeout(connectionTimer);
      const type = error?.type || '';
      if (attempt < 2 && ['server-error','network','socket-error','socket-closed',''].includes(type)) {
        setNetwork('接続を再試行します', 'warn');
        setTimeout(() => openGuestPeer(name, code, attempt + 1, generation), 800 * (attempt + 1));
        return;
      }
      setNetwork('接続エラー', 'warn');
      toast(peerErrorMessage(error));
    }

    peer.on('open', (peerId) => {
      clearTimeout(peerTimer);
      if (settled || generation !== local.networkGeneration) return;
      local.playerId = peerId;
      const conn = peer.connect(roomPeerId(code), { reliable: true, serialization: 'json' });
      local.conn = conn;
      connectionTimer = setTimeout(() => fail({type:'peer-unavailable'}), 12000);
      conn.on('open', () => {
        if (settled || generation !== local.networkGeneration) return;
        settled = true;
        clearTimeout(connectionTimer);
        conn.send({type:'join', name, clientKey:local.clientKey, peerId});
        setNetwork('ホストへ接続済み', 'ok');
        updateRoomUrl();
      });
      conn.on('data', handleClientMessage);
      conn.on('close', () => {
        if (generation !== local.networkGeneration) return;
        setNetwork('ホスト切断', 'warn');
        toast('ホストとの接続が終了しました');
      });
      conn.on('error', fail);
    });
    peer.on('error', fail);
  }

  async function copyText(text) {
    const value = String(text ?? '');
    if (!value) return false;
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(value);
        return true;
      } catch (error) {
        console.warn('Clipboard API failed', error);
      }
    }
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, value.length);
    let copied = false;
    try {
      copied = document.execCommand('copy');
    } catch (error) {
      console.warn('execCommand copy failed', error);
    }
    textarea.remove();
    if (!copied) window.prompt('以下をコピーしてください', value);
    return copied;
  }

  function createCpuGame() {
    const name = normalizedName();
    if (!name) return;
    teardownNetwork();
    local.cpuMode = true;
    local.isHost = true;
    local.roomCode = 'CPU';
    local.playerId = 'cpu-human';
    state = initHostState(name, local.playerId);
    ['CPU・アトラス','CPU・ノクス','CPU・ミアズマ'].forEach((cpuName, index) => {
      const seat = index + 1;
      state.players.push({
        id:`cpu-${seat}`,
        clientKey:`cpu-${seat}`,
        name:cpuName,
        seat,
        color:DATA.COLORS[seat],
        connected:true,
        isCpu:true,
        cards:[],
        used:[],
      });
    });
    const url = new URL(location.href);
    url.searchParams.delete('room');
    history.replaceState({}, '', url);
    log('CPU検証モードを開始した。通信サーバーは使用しない。');
    setNetwork('CPU検証モード', 'ok');
    render();
  }

  const originalBroadcast = broadcast;
  broadcast = function patchedBroadcast() {
    originalBroadcast();
    scheduleCpuStep();
  };

  const originalHandleDraftPick = handleDraftPick;
  handleDraftPick = function patchedDraftPick(player, cardId) {
    originalHandleDraftPick(player, cardId);
    if (!local.cpuMode || player.seat !== 0 || state?.phase !== 'draft') return;
    state.players.filter((candidate) => candidate.isCpu).forEach((cpu) => {
      if (state.phase !== 'draft' || state.draft.chosen[cpu.seat]) return;
      const pack = state.draft.packs[cpu.seat] || [];
      if (pack.length) originalHandleDraftPick(cpu, pack[Math.floor(Math.random() * pack.length)]);
    });
  };

  function scheduleCpuStep() {
    clearTimeout(local.cpuTimer);
    if (!local.cpuMode || !state || state.phase !== 'playing') return;
    local.cpuTimer = setTimeout(runCpuStep, 420);
  }

  function runCpuStep() {
    if (!local.cpuMode || !state || state.phase !== 'playing') return;
    try {
    if (state.choice) {
      const chooser = state.players[state.choice.seat];
      if (chooser?.isCpu && state.choice.eligible.length) handleChoice(chooser, state.choice.eligible[0]);
      return;
    }
    if (state.reaction) {
      const reactor = state.players[state.reaction.seat];
      if (reactor?.isCpu) handleReaction(reactor, null);
      return;
    }
    if (state.combat?.status === 'awaiting-defense') {
      const combat = currentCombat();
      const defender = state.players[state.board[combat.target]];
      if (defender?.isCpu) handleDefense(defender, null);
      return;
    }
    if (state.combat) return;
    const cpu = activePlayer();
    if (!cpu?.isCpu) return;
    executeCpuTurn(cpu);
    } catch (error) {
      console.error('CPU turn failed', error);
      const cpu = activePlayer();
      if (cpu?.isCpu) {
        log(`${cpu.name}の自動手番でエラーが発生したためパスした。`);
        finishTurn();
        broadcast();
      }
    }
  }

  function executeCpuTurn(cpu) {
    const seat = cpu.seat;
    const owners = [...state.board];
    const picks = [];
    for (let step = 0; step < 2; step += 1) {
      const candidates = owners.map((owner, region) => owner === null && hasOwnedNeighbor(region, seat, owners) ? region : -1).filter((region) => region >= 0);
      if (!candidates.length) break;
      candidates.sort((a, b) => cpuRegionValue(b, seat, owners) - cpuRegionValue(a, seat, owners));
      const chosen = candidates[0];
      picks.push(chosen);
      owners[chosen] = seat;
    }
    if (picks.length) {
      handleAction(cpu, {action:'expand', cardId:null, copyCardId:null, prelude:{}, picks, combats:[], followTarget:null});
      return;
    }
    const remote = state.board.map((owner, region) => isRemote(region, seat, state.board) ? region : -1).filter((region) => region >= 0);
    if (remote.length) {
      remote.sort((a, b) => cpuRegionValue(b, seat, state.board) - cpuRegionValue(a, seat, state.board));
      handleAction(cpu, {action:'hide', cardId:null, copyCardId:null, prelude:{}, picks:[remote[0]], combats:[], followTarget:null});
      return;
    }
    for (const source of ownedRegions(seat)) {
      const target = neighbors(source).find((region) => state.board[region] !== null && state.board[region] !== seat);
      if (target !== undefined) {
        handleAction(cpu, {action:'combat', cardId:null, copyCardId:null, prelude:{}, picks:[], combats:[{source,target}], followTarget:null});
        return;
      }
    }
    log(`${cpu.name}は実行可能な行動がなくパスした。`);
    finishTurn();
    broadcast();
  }

  function cpuRegionValue(region, seat, owners) {
    const open = neighbors(region).filter((neighbor) => owners[neighbor] === null).length;
    const enemies = neighbors(region).filter((neighbor) => owners[neighbor] !== null && owners[neighbor] !== seat).length;
    return open * 3 + enemies * 2 + neighbors(region).length;
  }

  const versionLabel = document.querySelector('.topbar .eyebrow');
  if (versionLabel) versionLabel.textContent = 'PROTOTYPE v0.4 · GUIDED PLAYTEST';

  const experience = {
    sessionStartedAt: Date.now(),
    gameStartedAt: null,
    endedAt: null,
    firstActionAt: null,
    humanActions: 0,
    totalActions: 0,
    combats: 0,
    passes: 0,
    cancels: 0,
    deadClicks: 0,
    ratings: { fun: null, clarity: null, tempo: null },
  };

  const actionSection = document.querySelector('.control-panel .panel-section');
  if (actionSection && !document.querySelector('#turnCoach')) {
    actionSection.insertAdjacentHTML('afterbegin', `
      <section id="turnCoach" class="turn-coach" aria-live="polite">
        <div class="turn-coach-heading">
          <span id="turnCoachState" class="turn-coach-state">WAITING</span>
          <strong id="turnCoachTitle">ゲーム開始を待っています</strong>
        </div>
        <p id="turnCoachBody">ドラフト後、選べる行動と区域をここで案内します。</p>
        <div class="turn-steps" aria-label="手番の進行">
          <span data-coach-step="1">1 行動</span>
          <span data-coach-step="2">2 区域</span>
          <span data-coach-step="3">3 実行</span>
        </div>
      </section>`);
  }

  if (!document.querySelector('#eventBanner')) {
    document.querySelector('#scoreboard')?.insertAdjacentHTML('afterend', '<div id="eventBanner" class="event-banner" aria-live="polite"><span>侵蝕記録</span><strong>四つの教団が覚醒する。</strong></div>');
  }

  document.querySelectorAll('.action-button[data-action]').forEach((button) => {
    if (!button.querySelector('.action-count')) button.insertAdjacentHTML('beforeend', '<em class="action-count">候補 —</em>');
  });

  let passTurnButton = document.querySelector('#passTurnButton');
  if (!passTurnButton) {
    document.querySelector('.action-grid')?.insertAdjacentHTML('beforeend', '<button id="passTurnButton" class="action-button pass-button" disabled>パス<span>行動不能時のみ</span></button>');
    passTurnButton = document.querySelector('#passTurnButton');
  }

  if (!document.querySelector('#mobileActionDock')) {
    document.body.insertAdjacentHTML('beforeend', `
      <nav id="mobileActionDock" class="mobile-action-dock" aria-label="手番操作">
        <button type="button" data-dock-action="expand">侵蝕</button>
        <button type="button" data-dock-action="hide">潜伏</button>
        <button type="button" data-dock-action="combat">抗争</button>
        <button type="button" id="mobileCommitButton" class="primary">実行</button>
      </nav>`);
  }

  const coachState = document.querySelector('#turnCoachState');
  const coachTitle = document.querySelector('#turnCoachTitle');
  const coachBody = document.querySelector('#turnCoachBody');
  const eventBanner = document.querySelector('#eventBanner strong');
  const mobileCommitButton = document.querySelector('#mobileCommitButton');
  const mobileDock = document.querySelector('#mobileActionDock');
  let lastAnnouncedSeat = null;

  function passCurrentTurn(player = myPlayer()) {
    if (!player) throw new Error('プレイヤー情報を取得できません');
    if (state.phase !== 'playing' || state.combat || state.choice || state.reaction) throw new Error('現在はパスできません');
    if (player.seat !== state.currentSeat) throw new Error('あなたの手番ではありません');
    local.selection = null;
    local.selectedCard = null;
    local.copyCardId = null;
    experience.passes += 1;
    log(`${player.name}はパスした。`);
    finishTurn();
    broadcast();
  }

  const originalHandleIntentForPass = handleIntent;
  handleIntent = function patchedHandleIntent(player, intent) {
    if (intent?.type === 'pass') {
      try {
        passCurrentTurn(player);
      } catch (error) {
        console.error(error);
        const conn = local.connections.get(player.id);
        if (conn?.open) conn.send({type:'error', message:error.message});
        else toast(error.message);
      }
      return;
    }
    return originalHandleIntentForPass(player, intent);
  };

  function actionCandidateCount(action) {
    const me = myPlayer();
    if (!me || !isMyActiveTurn()) return 0;
    const previous = local.selection;
    try {
      local.selection = {action, cardId:local.selectedCard, copyCardId:local.copyCardId, prelude:{}, picks:[], combats:[], followTarget:null};
      const effective = selectionEffectiveId();
      if (action === 'combat' && effective !== 'H-05') {
        return ownedRegions(me.seat, state.board).filter((source) => neighbors(source).some((region) => state.board[region] !== null && state.board[region] !== me.seat)).length;
      }
      return currentHighlights().length;
    } catch {
      return 0;
    } finally {
      local.selection = previous;
    }
  }

  function coachStage() {
    if (!state || state.phase === 'lobby') return {state:'LOBBY', title:'教団を集める', body:'4人で接続するか、CPU 3人とすぐに試遊できます。', step:0};
    if (state.phase === 'draft') return {state:'DRAFT', title:`能力カードを選ぶ · ${state.draft.round + 1}/4`, body:'1枚を選ぶと、残りは左隣へ渡ります。カードは各1回だけ使えます。', step:0};
    if (state.phase === 'ended') return {state:'RESULT', title:'侵蝕完了', body:'勝敗と試遊データを確認してください。', step:3};
    const me = myPlayer();
    if (state.choice) {
      return state.choice.seat === me?.seat
        ? {state:'CHOOSE', title:'効果の対象を選ぶ', body:state.choice.prompt, step:2}
        : {state:'WAIT', title:`${state.players[state.choice.seat].name}が選択中`, body:'効果の対象が決まるまで待機します。', step:0};
    }
    if (state.reaction || state.combat) {
      const mine = state.reaction?.seat === me?.seat || (state.combat?.status === 'awaiting-defense' && state.board[state.combat.queue[state.combat.index].target] === me?.seat);
      return mine
        ? {state:'RESPOND', title:'防御・反応を決める', body:'能力カードを使うか、「能力を使わない」を選んでください。', step:2}
        : {state:'CONFLICT', title:'抗争の解決中', body:'相手の防御・反応を待っています。', step:0};
    }
    if (!isMyActiveTurn()) return {state:'WAIT', title:`${activePlayer()?.name || '他教団'}の手番`, body:'次の手番に備えて盤面と公開能力を確認できます。', step:0};
    if (!local.selection) {
      const selectedAbility = local.selectedCard ? `${card(local.selectedCard)?.name || local.selectedCard}を使用予定。` : '能力カードは任意です。';
      return {state:'YOUR TURN', title:'行動を1つ選ぶ', body:`${selectedAbility} 候補数を見て、侵蝕・潜伏・抗争を選んでください。`, step:1};
    }
    if (!selectionComplete()) return {state:'SELECT', title:boardInstruction(), body:'金色に光る区域だけが選択できます。もう一度押すと選択を戻せます。', step:2};
    return {state:'READY', title:'内容を確認して実行', body:selectionDescription(), step:3};
  }

  function updateExperienceUI() {
    const guide = coachStage();
    if (coachState) coachState.textContent = guide.state;
    if (coachTitle) coachTitle.textContent = guide.title;
    if (coachBody) coachBody.textContent = guide.body;
    document.querySelectorAll('[data-coach-step]').forEach((item) => {
      const step = Number(item.dataset.coachStep);
      item.classList.toggle('active', step === guide.step);
      item.classList.toggle('done', guide.step > step);
    });

    document.querySelectorAll('.action-button[data-action]').forEach((button) => {
      const count = actionCandidateCount(button.dataset.action);
      const counter = button.querySelector('.action-count');
      if (counter) counter.textContent = isMyActiveTurn() ? `候補 ${count}` : '待機';
      button.classList.toggle('no-target', isMyActiveTurn() && count === 0);
    });

    const ready = Boolean(isMyActiveTurn() && local.selection && selectionComplete());
    el.commitActionButton.classList.toggle('ready', ready);
    const actionNames = {expand:'隣接侵蝕', hide:'遠隔潜伏', combat:'教団抗争'};
    el.commitActionButton.textContent = ready ? `${actionNames[local.selection.action] || '行動'}を実行` : '実行';

    document.querySelectorAll('[data-dock-action]').forEach((button) => {
      const source = document.querySelector(`.action-button[data-action="${button.dataset.dockAction}"]`);
      button.disabled = source?.disabled ?? true;
      button.classList.toggle('active', local.selection?.action === button.dataset.dockAction);
    });
    if (mobileCommitButton) {
      mobileCommitButton.disabled = !ready;
      mobileCommitButton.textContent = ready ? '実行する' : guide.step === 2 ? '区域を選択' : '実行';
    }
    mobileDock?.classList.toggle('visible', state?.phase === 'playing');

    if (eventBanner) eventBanner.textContent = state?.logs?.[0] || '四つの教団が覚醒する。';

    if (state?.phase === 'playing' && lastAnnouncedSeat !== state.currentSeat) {
      lastAnnouncedSeat = state.currentSeat;
      if (isMyActiveTurn()) {
        document.body.classList.add('your-turn-flash');
        setTimeout(() => document.body.classList.remove('your-turn-flash'), 900);
        toast('あなたの手番です');
      }
    }

    if (state?.phase === 'playing') {
      const scores = state.players.map((player) => score(player.seat));
      const leader = Math.max(...scores);
      document.querySelectorAll('.score-card').forEach((node, index) => {
        node.classList.toggle('leader', scores[index] === leader && leader > 1);
      });
    }
  }

  const originalRenderActionsForExperience = renderActions;
  renderActions = function patchedRenderActions() {
    originalRenderActionsForExperience();
    if (passTurnButton) passTurnButton.disabled = !isMyActiveTurn();
    updateExperienceUI();
  };

  const originalStartActionForExperience = startAction;
  startAction = function guidedStartAction(action) {
    originalStartActionForExperience(action);
    updateExperienceUI();
  };

  const originalOnRegionClickForExperience = onRegionClick;
  onRegionClick = function measuredRegionClick(region) {
    const before = local.selection ? JSON.stringify(selectionRegions()) : '';
    const selectable = Boolean(state.choice?.seat === myPlayer()?.seat ? state.choice.eligible.includes(region) : local.selection && currentHighlights().includes(region));
    originalOnRegionClickForExperience(region);
    const after = local.selection ? JSON.stringify(selectionRegions()) : '';
    if (!selectable && before === after && isMyActiveTurn()) experience.deadClicks += 1;
    updateExperienceUI();
  };

  const originalCommitSelectionForExperience = commitSelection;
  commitSelection = function measuredCommitSelection() {
    const complete = Boolean(local.selection && selectionComplete());
    if (complete) {
      experience.humanActions += 1;
      if (!experience.firstActionAt) experience.firstActionAt = Date.now();
    }
    originalCommitSelectionForExperience();
  };

  const originalHandleActionForExperience = handleAction;
  handleAction = function measuredHandleAction(player, payload) {
    experience.totalActions += 1;
    if (payload?.action === 'combat') experience.combats += 1;
    return originalHandleActionForExperience(player, payload);
  };

  const originalFinishDraftForExperience = finishDraft;
  finishDraft = function measuredFinishDraft() {
    const result = originalFinishDraftForExperience();
    experience.gameStartedAt = Date.now();
    return result;
  };

  const originalEndGameForExperience = endGame;
  endGame = function measuredEndGame(reason) {
    experience.endedAt = Date.now();
    return originalEndGameForExperience(reason);
  };

  function experienceReport() {
    const endedAt = experience.endedAt || Date.now();
    const durationSeconds = experience.gameStartedAt ? Math.round((endedAt - experience.gameStartedAt) / 1000) : null;
    const firstActionSeconds = experience.gameStartedAt && experience.firstActionAt ? Math.round((experience.firstActionAt - experience.gameStartedAt) / 1000) : null;
    return {
      version: '0.4.0',
      recordedAt: new Date().toISOString(),
      durationSeconds,
      firstActionSeconds,
      humanActions: experience.humanActions,
      totalActions: experience.totalActions,
      combats: experience.combats,
      passes: experience.passes,
      cancels: experience.cancels,
      deadClicks: experience.deadClicks,
      ratings: {...experience.ratings},
      endedReason: state?.endedReason || null,
      finalScores: state?.players?.map((player) => ({name:player.name, seat:player.seat, regions:score(player.seat), largest:largestComponent(player.seat)})) || [],
    };
  }

  function attachResultExperience() {
    if (!el.resultBody || document.querySelector('#experienceSummary')) return;
    const report = experienceReport();
    el.resultBody.insertAdjacentHTML('beforeend', `
      <section id="experienceSummary" class="experience-summary">
        <h3>試遊データ</h3>
        <div class="experience-metrics">
          <span><strong>${report.durationSeconds ?? '—'}</strong>秒</span>
          <span><strong>${report.firstActionSeconds ?? '—'}</strong>秒で初行動</span>
          <span><strong>${report.totalActions}</strong>行動</span>
          <span><strong>${report.deadClicks}</strong>迷いクリック</span>
        </div>
        <h3>体験を5段階で評価</h3>
        <div class="rating-grid">
          ${[['fun','面白さ'],['clarity','分かりやすさ'],['tempo','テンポ']].map(([key,label]) => `<div class="rating-row"><span>${label}</span>${[1,2,3,4,5].map((value) => `<button type="button" data-rating="${key}" data-value="${value}" aria-label="${label} ${value}">${value}</button>`).join('')}</div>`).join('')}
        </div>
        <div class="experience-actions">
          <button type="button" id="copyExperienceButton">試遊レポートをコピー</button>
          <button type="button" id="replayButton" class="primary">もう一度遊ぶ</button>
        </div>
      </section>`);
    document.querySelectorAll('[data-rating]').forEach((button) => button.addEventListener('click', () => {
      const key = button.dataset.rating;
      experience.ratings[key] = Number(button.dataset.value);
      document.querySelectorAll(`[data-rating="${key}"]`).forEach((item) => item.classList.toggle('selected', item === button));
    }));
    document.querySelector('#copyExperienceButton')?.addEventListener('click', async () => {
      const copied = await copyText(JSON.stringify(experienceReport(), null, 2));
      toast(copied ? '試遊レポートをコピーしました' : '試遊レポートを表示しました');
    });
    document.querySelector('#replayButton')?.addEventListener('click', () => location.reload());
  }

  const originalRenderResultForExperience = renderResult;
  renderResult = function enrichedRenderResult() {
    originalRenderResultForExperience();
    attachResultExperience();
  };

  passTurnButton?.addEventListener('click', () => sendIntent({type:'pass'}));
  document.querySelector('#cancelSelectionButton')?.addEventListener('click', () => { experience.cancels += 1; });
  document.querySelectorAll('[data-dock-action]').forEach((button) => button.addEventListener('click', () => startAction(button.dataset.dockAction)));
  mobileCommitButton?.addEventListener('click', () => commitSelection());

  document.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey || ['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)) return;
    if (document.querySelector('dialog[open]')) return;
    const shortcut = {'1':'expand','2':'hide','3':'combat'}[event.key];
    if (shortcut && isMyActiveTurn()) {
      event.preventDefault();
      startAction(shortcut);
    } else if (event.key === 'Enter' && isMyActiveTurn() && local.selection && selectionComplete()) {
      event.preventDefault();
      commitSelection();
    } else if (event.key === 'Escape' && local.selection) {
      event.preventDefault();
      local.selection = null;
      renderGame();
    }
  });
  const hybridFillButton = document.querySelector('#fillCpuButton');
  const hybridCpuNames = ['CPU・アトラス', 'CPU・ノクス', 'CPU・ミアズマ'];

  function connectedHumanPlayers() {
    return state?.players?.filter((player) => !player.isCpu && player.connected) || [];
  }

  function canStartHybridCpuDemo() {
    if (!state || state.phase !== 'lobby' || !local.isHost) return false;
    const humans = connectedHumanPlayers();
    return humans.length >= 2 && humans.length < 4 && state.players.length === humans.length;
  }

  function startHybridCpuDemo() {
    if (!canStartHybridCpuDemo()) throw new Error('接続済みの人間プレイヤーが2〜3人必要です');
    const humanCount = connectedHumanPlayers().length;
    const cpuCount = 4 - humanCount;
    local.cpuMode = true;
    state.playMode = 'hybrid-cpu';
    while (state.players.length < 4) {
      const seat = state.players.length;
      state.players.push({
        id: `cpu-hybrid-${seat}`,
        clientKey: `cpu-hybrid-${seat}`,
        name: hybridCpuNames[seat - 1] || `CPU・${seat + 1}`,
        seat,
        color: DATA.COLORS[seat],
        connected: true,
        isCpu: true,
        cards: [],
        used: [],
      });
    }
    log(`${humanCount}人の教団にCPU${cpuCount}人を加え、4教団戦を開始した。`);
    setNetwork(`${humanCount}人＋CPU${cpuCount}人`, 'ok');
    startDraft();
  }

  const renderLobbyBeforeHybridCpu = renderLobby;
  renderLobby = function renderHybridCpuLobby() {
    renderLobbyBeforeHybridCpu();
    const humanCount = connectedHumanPlayers().length;
    const available = canStartHybridCpuDemo();
    if (hybridFillButton) {
      hybridFillButton.classList.toggle('hidden', !available);
      hybridFillButton.disabled = !available;
      hybridFillButton.textContent = available ? `${humanCount}人＋CPU${4 - humanCount}人で開始` : '不足席をCPUで補充';
    }
    if (available && el.lobbyStatus) {
      el.lobbyStatus.textContent = `${humanCount} / 4人 接続 · CPU${4 - humanCount}人を追加して開始できます`;
    }
  };

  const handleDraftPickBeforeHybridCpu = handleDraftPick;
  handleDraftPick = function handleHybridCpuDraftPick(player, cardId) {
    handleDraftPickBeforeHybridCpu(player, cardId);
    if (!local.cpuMode || player?.isCpu || state?.phase !== 'draft') return;
    state.players.filter((candidate) => candidate.isCpu).forEach((cpu) => {
      if (state.phase !== 'draft' || state.draft.chosen[cpu.seat]) return;
      const pack = state.draft.packs[cpu.seat] || [];
      if (pack.length) originalHandleDraftPick(cpu, pack[0]);
    });
  };

  const coachStageBeforeHybridCpu = coachStage;
  coachStage = function hybridCpuCoachStage() {
    const guide = coachStageBeforeHybridCpu();
    if (!state || state.phase === 'lobby') {
      guide.body = '2人以上なら不足席をCPUで補充できます。4人接続または1人＋CPU3人でも開始できます。';
    }
    return guide;
  };

  const experienceReportBeforeHybridCpu = experienceReport;
  experienceReport = function hybridCpuExperienceReport() {
    const report = experienceReportBeforeHybridCpu();
    report.appVersion = '0.5.0';
    report.mode = state?.playMode || (local.cpuMode ? 'cpu-solo' : 'online');
    report.humanPlayers = state?.players?.filter((player) => !player.isCpu).length || 0;
    report.cpuPlayers = state?.players?.filter((player) => player.isCpu).length || 0;
    return report;
  };

  if (versionLabel) versionLabel.textContent = 'PROTOTYPE v0.5 · 2P + CPU DEMO';
  hybridFillButton?.addEventListener('click', () => {
    try {
      startHybridCpuDemo();
    } catch (error) {
      console.error(error);
      toast(error.message);
    }
  });

  let lastHumanActionMetricKey = null;

  function recordHumanActionMetric(payload = local.selection) {
    if (!payload) return;
    const key = `${state?.round}:${state?.currentSeat}:${JSON.stringify(payload)}`;
    if (key === lastHumanActionMetricKey) return;
    lastHumanActionMetricKey = key;
    experience.humanActions += 1;
    if (!experience.firstActionAt) experience.firstActionAt = Date.now();
  }

  const commitSelectionWithLegacyMetric = commitSelection;
  commitSelection = function normalizedCommitSelection() {
    const payload = local.selection && selectionComplete() ? deepClone(local.selection) : null;
    if (payload) recordHumanActionMetric(payload);
    const countedBeforeLegacyCall = experience.humanActions;
    commitSelectionWithLegacyMetric();
    if (experience.humanActions > countedBeforeLegacyCall) experience.humanActions = countedBeforeLegacyCall;
  };

  el.commitActionButton?.addEventListener('click', () => {
    if (local.selection && selectionComplete()) recordHumanActionMetric(deepClone(local.selection));
  }, true);

  const experienceReportWithNormalizedTotal = experienceReport;
  experienceReport = function normalizedExperienceReport() {
    const report = experienceReportWithNormalizedTotal();
    report.totalActions = Math.max(report.totalActions, report.humanActions);
    return report;
  };

  if (new URL(location.href).searchParams.has('test')) {
    window.__deepAbyssTest = {
      createCpuGame,
      startDraft: () => startDraft(),
      render: () => render(),
      pickFirstDraft: () => {
        const player = myPlayer();
        const first = state?.draft?.packs?.[player?.seat]?.[0];
        if (!player || !first) throw new Error('draft pick unavailable');
        handleDraftPick(player, first);
      },
      getState: () => deepClone(state),
      getExperienceReport: () => deepClone(experienceReport()),
      setCurrentSeat: (seat) => { state.currentSeat = Number(seat); render(); },
      setBoard: (owners) => {
        if (!Array.isArray(owners) || owners.length !== 40) throw new Error('board must contain 40 regions');
        state.board = [...owners];
        state.combat = null;
        state.choice = null;
        state.reaction = null;
        local.selection = null;
        render();
      },
      forceHumanTurn: () => {
        state.currentSeat = myPlayer().seat;
        state.combat = null;
        state.choice = null;
        state.reaction = null;
        local.selection = null;
        render();
      },
      passTurn: () => passCurrentTurn(),
      runCpuStep,
      copyText,
      peerOptions,
      peerErrorMessage,
    };
  }
  const playtestSurvey = {
    sessionId: crypto.randomUUID(),
    replayIntent: null,
    comment: '',
    submittedAt: null,
    serviceCtaClickedAt: null,
  };

  const playtestServiceLink = document.querySelector('#playtestServiceLink');
  if (!playtestServiceLink) throw new Error('試遊支援の問い合わせリンクがありません');
  const inquiryUrl = new URL('https://github.com/KAFKA2306/boardgamelist/issues/new');
  inquiryUrl.searchParams.set('title', '試遊支援の導入相談');
  inquiryUrl.searchParams.set('body', [
    '対象ゲーム: ',
    '用途: ',
    '希望時期: ',
    'source: deep-abyss-result',
    `sessionId: ${playtestSurvey.sessionId}`,
  ].join('\n'));
  playtestServiceLink.href = inquiryUrl.toString();

  const experienceReportWithStructuredSurvey = experienceReport;
  experienceReport = function structuredExperienceReport() {
    const report = experienceReportWithStructuredSurvey();
    return {
      ...report,
      sessionId: playtestSurvey.sessionId,
      sessionStartedAt: new Date(experience.sessionStartedAt).toISOString(),
      gameStartedAt: experience.gameStartedAt ? new Date(experience.gameStartedAt).toISOString() : null,
      endedAt: experience.endedAt ? new Date(experience.endedAt).toISOString() : null,
      completed: state?.phase === 'ended',
      survey: {
        ruleUnderstanding: experience.ratings.understanding ?? null,
        fun: experience.ratings.fun ?? null,
        tempo: experience.ratings.tempo ?? null,
        replayIntent: playtestSurvey.replayIntent,
        comment: playtestSurvey.comment,
        submittedAt: playtestSurvey.submittedAt ? new Date(playtestSurvey.submittedAt).toISOString() : null,
      },
      events: {
        playStartedAt: experience.gameStartedAt ? new Date(experience.gameStartedAt).toISOString() : null,
        playCompletedAt: experience.endedAt ? new Date(experience.endedAt).toISOString() : null,
        surveySubmittedAt: playtestSurvey.submittedAt ? new Date(playtestSurvey.submittedAt).toISOString() : null,
        serviceCtaClickedAt: playtestSurvey.serviceCtaClickedAt ? new Date(playtestSurvey.serviceCtaClickedAt).toISOString() : null,
      },
    };
  };

  const attachResultExperienceWithStructuredSurvey = attachResultExperience;
  attachResultExperience = function structuredSurveyResult() {
    attachResultExperienceWithStructuredSurvey();
    const summary = document.querySelector('#experienceSummary');
    if (!summary || document.querySelector('#structuredPlaytestSurvey')) return;
    summary.insertAdjacentHTML('beforeend', `
      <section id="structuredPlaytestSurvey">
        <h3>試遊後アンケート</h3>
        <p class="fineprint">個人情報は不要です。ゲーム体験だけを記録してください。</p>
        <div class="rating-grid">
          <div class="rating-row"><span>ルール理解度</span>${[1,2,3,4,5].map((value) => `<button type="button" data-understanding="${value}" aria-label="ルール理解度 ${value}">${value}</button>`).join('')}</div>
          <div class="rating-row"><span>もう一度遊びたい</span>${[1,2,3,4,5].map((value) => `<button type="button" data-replay-intent="${value}" aria-label="再プレイ意向 ${value}">${value}</button>`).join('')}</div>
        </div>
        <label class="field"><span>自由記述（任意）</span><textarea id="playtestComment" maxlength="1000" rows="4" placeholder="迷った点、良かった点、改善してほしい点"></textarea></label>
        <button type="button" id="submitPlaytestSurvey">アンケートをレポートへ反映</button>
      </section>`);

    document.querySelectorAll('[data-understanding]').forEach((button) => button.addEventListener('click', () => {
      experience.ratings.understanding = Number(button.dataset.understanding);
      document.querySelectorAll('[data-understanding]').forEach((item) => item.classList.toggle('selected', item === button));
    }));
    document.querySelectorAll('[data-replay-intent]').forEach((button) => button.addEventListener('click', () => {
      playtestSurvey.replayIntent = Number(button.dataset.replayIntent);
      document.querySelectorAll('[data-replay-intent]').forEach((item) => item.classList.toggle('selected', item === button));
    }));
    document.querySelector('#submitPlaytestSurvey')?.addEventListener('click', () => {
      playtestSurvey.comment = document.querySelector('#playtestComment')?.value.trim() || '';
      if (!experience.ratings.understanding || !playtestSurvey.replayIntent) {
        toast('ルール理解度と再プレイ意向を選んでください');
        return;
      }
      playtestSurvey.submittedAt = Date.now();
      toast('アンケートを試遊レポートへ反映しました');
    });
  };

  playtestServiceLink.addEventListener('click', () => {
    playtestSurvey.serviceCtaClickedAt = Date.now();
  });

})();
