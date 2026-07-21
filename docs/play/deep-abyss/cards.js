'use strict';

window.DEEP_ABYSS = (() => {
  const COLORS = ['#d95f5f', '#5f8fd9', '#72b879', '#b67ad8'];
  const COLOR_NAMES = ['緋色教団', '蒼海教団', '翠影教団', '紫宵教団'];

  const categoryNames = {
    I: '侵蝕',
    H: '潜伏',
    C: '抗争',
    R: '儀式',
  };

  const cards = [
    { id:'I-01', category:'I', name:'連鎖増殖', timing:'自分の手番', action:'expand', text:'隣接侵蝕で最大3区域を獲得する。3区域は、手番開始時から所有していた1区域から伸びる1本の連鎖でなければならない。' },
    { id:'I-02', category:'I', name:'枝分かれ', timing:'自分の手番', action:'expand', text:'隣接侵蝕で最大3区域を獲得する。各区域は、それぞれ異なる手番開始時の自領に隣接していなければならない。' },
    { id:'I-03', category:'I', name:'静かな沃野', timing:'自分の手番', action:'expand', text:'隣接侵蝕で最大3区域を獲得する。獲得時点で敵領に隣接する区域は選べない。' },
    { id:'I-04', category:'I', name:'包囲の輪', timing:'自分の手番', action:'expand', text:'通常の隣接侵蝕で2区域を獲得した後、その両方に隣接する未支配区域1つを追加で獲得できる。' },
    { id:'I-05', category:'I', name:'分断された教団', timing:'自分の手番', action:'expand', text:'自領が2つ以上の領域群なら最大3区域。少なくとも2つの異なる領域群から広げる。' },
    { id:'I-06', category:'I', name:'劣勢の熱狂', timing:'自分の手番', action:'expand', text:'手番開始時に最少支配数なら、隣接侵蝕で最大3区域を獲得する。' },
    { id:'I-07', category:'I', name:'境界の腐食', timing:'自分の手番', action:'expand', text:'通常の隣接侵蝕後、新しく獲得した区域に隣接する敵領1区域へ侵攻できる。攻撃結果-1。' },
    { id:'I-08', category:'I', name:'脱皮', timing:'自分の手番', action:'expand', text:'通常行動前に自領1区域を未支配へ戻す。その後、隣接侵蝕で最大3区域を獲得する。' },

    { id:'H-01', category:'H', name:'地下礼拝堂', timing:'自分の手番', action:'hide', text:'遠隔潜伏で互いに隣接する未支配区域2つを獲得する。どちらも手番開始時の自領に隣接してはならない。' },
    { id:'H-02', category:'H', name:'双子の密議', timing:'自分の手番', action:'hide', text:'遠隔潜伏で未支配区域2つを獲得する。2区域は自領にも互いにも隣接してはならない。' },
    { id:'H-03', category:'H', name:'越境布教', timing:'自分の手番', action:'expand', text:'隣接侵蝕の2区域のうち、1区域を遠隔潜伏可能な任意の未支配区域に変更する。' },
    { id:'H-04', category:'H', name:'内通者', timing:'自分の手番', action:'hide', text:'通常の遠隔潜伏後、新しい区域に隣接する敵領1区域へ侵攻できる。攻撃結果-1。' },
    { id:'H-05', category:'H', name:'背教者', timing:'自分の手番', action:'combat', text:'通常行動の代わりに、隣接していない敵領1区域へ遠隔侵攻する。2以上の差で勝った場合だけ獲得する。' },
    { id:'H-06', category:'H', name:'影の移住', timing:'自分の手番', action:'special', text:'自領1区域を未支配へ戻し、別の遠隔潜伏可能区域1つを獲得する。その後、通常行動を行う。' },
    { id:'H-07', category:'H', name:'合流', timing:'自分の手番', action:'special', text:'2つ以上の自領域群に隣接する未支配区域1つを通常行動前に獲得する。' },
    { id:'H-08', category:'H', name:'逃走路', timing:'反応', action:'reaction', text:'敵に自領を奪われた直後、遠隔潜伏可能な未支配区域1つを獲得する。' },

    { id:'C-01', category:'C', name:'有利な星位', timing:'攻撃時', action:'combat', text:'この侵攻では同値でも攻撃側の勝利とする。' },
    { id:'C-02', category:'C', name:'双眼の予兆', timing:'攻撃時', action:'combat', text:'攻撃側はダイスを2個振り、大きい方を結果として使う。' },
    { id:'C-03', category:'C', name:'完全包囲', timing:'攻撃時', action:'combat', text:'対象が自領3区域以上に隣接するとき、2個振り高い方を使い、同値でも勝利する。' },
    { id:'C-04', category:'C', name:'二正面戦', timing:'自分の手番', action:'combat', text:'異なる敵領を最大2区域選び、それぞれ通常の侵攻として順番に解決する。' },
    { id:'C-05', category:'C', name:'蹂躙', timing:'攻撃時', action:'combat', text:'侵攻成功直後、奪った区域に隣接する未支配区域1つを獲得する。' },
    { id:'C-06', category:'C', name:'敗北の種', timing:'攻撃時', action:'combat', text:'侵攻失敗直後、対象区域に隣接する未支配区域1つを獲得する。' },
    { id:'C-07', category:'C', name:'孤立者の粛清', timing:'攻撃時', action:'combat', text:'対象敵領に同じ所有者の別区域が隣接していなければ、ダイスを振らず獲得する。' },
    { id:'C-08', category:'C', name:'血の代価', timing:'攻撃時', action:'combat', text:'侵攻元ではない自領1区域を未支配へ戻し、ダイスを振らず対象敵領を獲得する。' },

    { id:'R-01', category:'R', name:'深淵の盾', timing:'防御時', action:'defense', text:'防御側はダイスを2個振り、大きい方を結果として使う。' },
    { id:'R-02', category:'R', name:'偽りの兆し', timing:'防御時', action:'defense', text:'両者が振った後、攻撃側に1回振り直させ、新しい結果を使わせる。' },
    { id:'R-03', category:'R', name:'殉教者の種', timing:'反応', action:'reaction', text:'敵に自領を奪われた直後、未支配区域1つを獲得する。自領が残れば自領隣接、0なら任意。' },
    { id:'R-04', category:'R', name:'反響する呪詛', timing:'防御時', action:'defense', text:'防御成功直後、侵攻元の敵領へ通常の反撃を1回行う。' },
    { id:'R-05', category:'R', name:'星の固定', timing:'戦闘時', action:'combat-or-defense', text:'ダイスを振る前に使用。この戦闘では自分の結果を4として扱う。' },
    { id:'R-06', category:'R', name:'逆さの啓示', timing:'戦闘時', action:'combat-or-defense', text:'両者の最終結果の差がちょうど1なら、その結果を入れ替える。' },
    { id:'R-07', category:'R', name:'無効の儀', timing:'反応', action:'defense', text:'自分が関与する戦闘で、相手が使った能力カード1枚を無効にする。' },
    { id:'R-08', category:'R', name:'借り物の経典', timing:'自分の手番', action:'copy', text:'他プレイヤーの使用済みカード1枚から、自分の手番または攻撃時の効果を1回複製する。' },
  ];

  const cardById = Object.fromEntries(cards.map((card) => [card.id, card]));

  // The graph is rotationally symmetric. Coordinates are intentionally irregular.
  const base = [
    [105, 92], [205, 72], [128, 178], [246, 162], [327, 93],
    [303, 224], [169, 267], [354, 294], [438, 198], [435, 316],
  ];
  const center = [500, 360];
  const nodes = [];
  const rotate = ([x, y], quarter) => {
    let dx = x - center[0];
    let dy = y - center[1];
    for (let i = 0; i < quarter; i += 1) [dx, dy] = [-dy, dx];
    return [Math.round(center[0] + dx), Math.round(center[1] + dy)];
  };
  for (let q = 0; q < 4; q += 1) {
    base.forEach((point, i) => {
      const [x, y] = rotate(point, q);
      nodes.push({ id:q * 10 + i, x, y, label:`${String.fromCharCode(65 + q)}${i + 1}`, start:i === 0 });
    });
  }

  const edgeSet = new Set();
  const addEdge = (a, b, route = false) => {
    const low = Math.min(a, b);
    const high = Math.max(a, b);
    edgeSet.add(`${low}:${high}:${route ? 1 : 0}`);
  };
  const innerEdges = [
    [0,1],[0,2],[0,3],
    [1,4],[1,5],[2,5],[2,6],[3,5],[3,7],
    [4,8],[5,6],[5,9],[6,7],[6,9],[7,9],[8,9],
  ];
  for (let q = 0; q < 4; q += 1) {
    innerEdges.forEach(([a,b]) => addEdge(q * 10 + a, q * 10 + b));
  }
  for (let q = 0; q < 4; q += 1) {
    const next = (q + 1) % 4;
    addEdge(q * 10 + 8, next * 10 + 4);
    addEdge(q * 10 + 9, next * 10 + 7);
  }
  // Deep routes: each seat receives one equally distant shortcut.
  addEdge(2, 26, true);
  addEdge(12, 36, true);
  addEdge(22, 6, true);
  addEdge(32, 16, true);

  const edges = [...edgeSet].map((value) => {
    const [a,b,route] = value.split(':').map(Number);
    return { a, b, route:Boolean(route) };
  });

  const adjacency = Array.from({length:40}, () => []);
  edges.forEach(({a,b}) => {
    adjacency[a].push(b);
    adjacency[b].push(a);
  });
  adjacency.forEach((list) => list.sort((a,b) => a-b));

  return {
    COLORS,
    COLOR_NAMES,
    categoryNames,
    cards,
    cardById,
    nodes,
    edges,
    adjacency,
    startRegions:[0,10,20,30],
  };
})();
