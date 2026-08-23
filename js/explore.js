/*
 * explore.js
 * 街歩き（Yソート2D、遠近圧縮なし）。data.js の駅データから店舗を構築する。
 * 駅ごとに画面より大きい「ワールド」を持ち、カメラがプレイヤーを追従してスクロールする。
 * 道は折れ線（複数区間の直線）として生成し、店舗・ヨドミ・隣駅の乗り場はその道沿いに配置する。
 * 駅ごとの座標は stationId から作る疑似乱数で決めるため、同じ駅は毎回同じレイアウトになる。
 * ヨドミに近づくとバトルへ遷移する。
 */
window.Hazama = window.Hazama || {};

Hazama.Explore = (function(){
  const E = Hazama.Engine;
  const D = Hazama.Data;
  const ctx = E.ctx;

  let P, St, onEnterBattle;
  const state = {
    worldW: 0, worldH: 0, camera: {x:0,y:0},
    buildings: [], sparkles: [], decor: [], road: [],
    cat: {x:0,y:0,vx:0,vy:0,timer:0,say:0},
    yodomi: {x:0,y:0,r:26,active:true,glow:1},
    warps: [], traveling: false,
    dust: [],
  };

  function bindShared(sharedP, sharedSt, enterBattleFn){
    P = sharedP; St = sharedSt; onEnterBattle = enterBattleFn;
  }

  // 駅の規模（data.js の station.type）ごとに、画面（ビューポート）の何倍のワールドを持つか。
  // major は妖怪ウォッチの街1つ分くらいを目安に大きく、pass/special は簡素に小さめ。
  const WORLD_SCALE = {
    major:   { w:4.4, h:3.4 },
    minor:   { w:2.8, h:2.3 },
    special: { w:2.4, h:2.0 },
    pass:    { w:1.8, h:1.6 },
  };

  // ==== ドット絵プロップ ==============================================
  // engine.js の低解像度プロップ・システムを使い、人物・店舗（4種）・木・生垣・
  // 道の舗装テクスチャ・あわいもの（2種）をドット絵化する。

  // 人物：10x20ドットの簡易チビキャラ。body/face/hair を差し替えれば主人公にも仲間にも使える。
  E.defprop('person', 10, 20, (g, rng, opts) => {
    const body = opts.body || '#2a2540', face = opts.face || '#d8b98a', hair = opts.hair || '#1a1730';
    const bodyLo = E.shade(body,0.72), bodyHi = E.shade(body,1.25), shoe = E.shade(body,0.5);
    E.rc(g,2,15,2,4,bodyLo); E.rc(g,6,15,2,4,bodyLo);
    E.rc(g,2,19,2,1,shoe); E.rc(g,6,19,2,1,shoe);
    E.rc(g,1,7,8,8,body); E.rc(g,1,7,1,8,bodyLo); E.rc(g,8,7,1,8,bodyHi); E.rc(g,1,7,7,1,bodyHi);
    E.rc(g,0,8,1,6,bodyLo); E.rc(g,9,8,1,6,bodyLo);
    E.rc(g,2,2,6,5,face); E.rc(g,2,2,1,5,E.shade(face,0.85)); E.rc(g,7,2,1,5,E.shade(face,0.85));
    E.rc(g,1,0,8,3,hair); E.rc(g,1,3,1,2,hair); E.rc(g,8,3,1,2,hair);
    E.px(g,3,4,E.shade(face,0.35)); E.px(g,6,4,E.shade(face,0.35));
  });

  // 店舗A：24x34ドット。窓2つの標準型。壁の陰影・パネル継ぎ目・汚れ・窓の点灯差・雨だれを
  // rng で個体ごとにばらつかせる。屋根含めて壁本体はここで作り、看板は別途通常解像度で重ねる。
  E.defprop('shopA', 24, 34, (g, rng, opts) => {
    const wall = E.PAL.wall, wallLo = E.shade(wall,0.78), wallHi = E.shade(wall,1.18);
    E.rc(g,0,8,24,26,wall); E.rc(g,0,8,1,26,wallLo); E.rc(g,23,8,1,26,wallHi);
    for (let yy=13; yy<32; yy+=5) E.rc(g,1,yy,22,1,E.shade(wall,0.86));
    E.speck(g, rng, 1,20,22,12, E.shade(wall,0.6), 9);
    E.rc(g,-1,4,26,5,E.PAL.roof); E.rc(g,-1,8,26,1,E.PAL.roofDark);
    for (let xx=-1; xx<25; xx+=3) E.rc(g,xx,4,1,5,E.shade(E.PAL.roof,0.82));
    [3,15].forEach(wx => {
      const wc = rng.f() < 0.55 ? E.PAL.window : E.PAL.windowDim;
      E.rc(g,wx,13,6,6,E.PAL.frame);
      E.rc(g,wx+1,14,4,4,wc); E.rc(g,wx+1,14,1,4,E.shade(wc,0.7)); E.rc(g,wx+1,14,4,1,E.shade(wc,1.15));
    });
    E.rc(g,9,25,6,9,E.PAL.door); E.rc(g,9,25,6,1,E.shade(E.PAL.door,1.6));
    E.rc(g,14,29,1,2,E.shade(E.PAL.cream,0.9));
    if (rng.f() < 0.5) E.drip(g, rng, rng.i(2,21), 9, 14, E.shade(wall,0.55));
  });

  // 店舗B：22x38ドット。背が高く、庇（オーニング）が店の色(opts.accent)で入る大窓タイプ。
  E.defprop('shopB', 22, 38, (g, rng, opts) => {
    const wall = E.PAL.wall, accent = opts.accent || '#7a2e2e';
    const wallLo = E.shade(wall,0.78), wallHi = E.shade(wall,1.18);
    E.rc(g,0,14,22,24,wall); E.rc(g,0,14,1,24,wallLo); E.rc(g,21,14,1,24,wallHi);
    E.speck(g, rng, 1,26,20,10, E.shade(wall,0.6), 8);
    E.rc(g,-1,10,24,5,E.PAL.roof); E.rc(g,-1,14,24,1,E.PAL.roofDark);
    // オーニング（庇）：店の看板色ベースのストライプ
    for (let xx=0; xx<22; xx+=4) E.rc(g,xx,10,2,4, xx%8===0?accent:E.shade(accent,0.65));
    E.rc(g,-1,9,24,1,E.shade(accent,1.3));
    // 大窓
    const wc = rng.f()<0.6 ? E.PAL.window : E.PAL.windowDim;
    E.rc(g,3,16,16,10,E.PAL.frame);
    E.rc(g,4,17,14,8,wc); E.rc(g,4,17,14,1,E.shade(wc,1.2)); E.rc(g,4,17,1,8,E.shade(wc,0.7));
    for (let xx=8; xx<18; xx+=5) E.rc(g,xx,17,1,8,E.shade(wc,0.75));
    E.rc(g,8,29,6,9,E.PAL.door); E.rc(g,8,29,6,1,E.shade(E.PAL.door,1.6));
    if (rng.f() < 0.4) E.drip(g, rng, rng.i(1,20), 15, 18, E.shade(wall,0.55));
  });

  // 店舗C：26x30ドット。低め・横長で、丸看板ポール（提灯風アクセント）が付く食堂・甘味処タイプ。
  E.defprop('shopC', 26, 30, (g, rng, opts) => {
    const wall = E.PAL.wall, accent = opts.accent || '#6b3a63';
    const wallLo = E.shade(wall,0.8), wallHi = E.shade(wall,1.15);
    E.rc(g,0,6,26,22,wall); E.rc(g,0,6,1,22,wallLo); E.rc(g,25,6,1,22,wallHi);
    for (let yy=10;yy<26;yy+=6) E.rc(g,1,yy,24,1,E.shade(wall,0.87));
    E.speck(g, rng, 1,14,24,12, E.shade(wall,0.6), 8);
    E.rc(g,-1,2,28,5,E.PAL.roof); E.rc(g,-1,6,28,1,E.PAL.roofDark);
    for (let xx=-1;xx<27;xx+=3) E.rc(g,xx,2,1,5,E.shade(E.PAL.roof,0.82));
    [4,17].forEach(wx => {
      const wc = rng.f()<0.5 ? E.PAL.window : E.PAL.windowDim;
      E.rc(g,wx,11,5,5,E.PAL.frame); E.rc(g,wx+1,12,3,3,wc);
    });
    E.rc(g,11,19,6,9,E.PAL.door); E.rc(g,11,19,6,1,E.shade(E.PAL.door,1.6));
    // 提灯ポール
    E.rc(g,23,-2,1,9,E.shade('#5a4a30',1)); E.rc(g,21,6,5,6,accent); E.rc(g,21,6,5,1,E.shade(accent,1.4));
  });

  // 店舗D：14x22ドット。自販機・小さな売店のような無人／小型スポット用。
  E.defprop('shopD', 14, 22, (g, rng, opts) => {
    const accent = opts.accent || '#2e4a5e';
    E.rc(g,1,2,12,20,E.shade(accent,0.9)); E.rc(g,1,2,12,2,E.shade(accent,1.3));
    E.rc(g,2,5,10,10,E.PAL.frame);
    for (let yy=6; yy<14; yy+=3) E.rc(g,3,yy,8,2, rng.f()<0.5?E.PAL.window:E.shade(accent,0.6));
    E.rc(g,2,16,10,4,E.shade(accent,0.6));
    E.speck(g, rng, 1,2,12,20, E.shade(accent,0.6), 5);
  });

  // shopD は自販機・小型売店向けの小さい見た目なので、通常の店舗では出現率を下げる。
  const SHOP_PROPS = ['shopA','shopA','shopB','shopB','shopC','shopC','shopD'];
  const SHOP_DIMS = { shopA:{w:24,h:34,scale:3.5}, shopB:{w:22,h:38,scale:3.2},
    shopC:{w:26,h:30,scale:3.4}, shopD:{w:14,h:22,scale:3.6} };

  // 木：14x22ドット。生垣：20x10ドット。どちらも通行はできない前提の純装飾。
  E.defprop('treeA', 14, 22, (g, rng) => {
    const leaf = E.PAL.leaf, leafLit = E.PAL.leafLit, bark = E.PAL.bark;
    E.rc(g,6,15,2,7,bark); E.rc(g,6,15,1,7,E.shade(bark,0.7));
    E.rc(g,2,4,10,9,leaf); E.rc(g,3,2,8,4,leaf); E.rc(g,1,9,12,4,leaf);
    E.rc(g,3,3,5,4,leafLit); E.rc(g,8,10,3,3,leafLit);
    E.speck(g, rng, 1,2,12,11, E.shade(leaf,0.65), 7);
  });
  E.defprop('hedgeA', 20, 10, (g, rng) => {
    const leaf = E.PAL.leaf, leafLit = E.PAL.leafLit;
    E.rc(g,0,2,20,8,leaf); E.rc(g,0,0,20,3,leafLit);
    E.speck(g, rng, 0,3,20,7, E.shade(leaf,0.65), 9);
  });

  // 道の舗装テクスチャ（16x16タイル）。CanvasPattern化して strokeStyle に使う。
  let roadPattern = null;
  function getRoadPattern(){
    if (roadPattern) return roadPattern;
    const c = document.createElement('canvas'); c.width = 16; c.height = 16;
    const g = c.getContext('2d');
    const rng = E.makeRNG(4242);
    // 地面のパープル系パレットとは意図的に離した、暖色寄りのグレーで舗装らしいコントラストを作る。
    E.rc(g,0,0,16,16, '#5c5346');
    E.speck(g, rng, 0,0,16,16, '#6e6353', 16);
    E.speck(g, rng, 0,0,16,16, '#433a2f', 12);
    roadPattern = ctx.createPattern(c, 'repeat');
    return roadPattern;
  }

  // 駅IDから決定論的な疑似乱数を作る（同じ駅は毎回同じレイアウトになる）。
  function hashStr(s){
    let h = 2166136261;
    for (let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function mulberry32(seed){
    let a = seed >>> 0;
    return function(){
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function distToSegment(p, a, b){
    const dx=b.x-a.x, dy=b.y-a.y, len2=dx*dx+dy*dy || 1;
    let t=((p.x-a.x)*dx+(p.y-a.y)*dy)/len2; t=Math.max(0,Math.min(1,t));
    return Math.hypot(p.x-(a.x+dx*t), p.y-(a.y+dy*t));
  }

  // 道を「出発点(プレイヤー初期位置)→ハブ→各出口」の折れ線群として生成する。
  // 出口＝隣駅の乗り場（1〜4件、駅によって変わる）＋ヨドミ。同じロジックでどの駅にも対応する。
  // S はワールドの規模係数（大きい駅ほど道の曲がり幅も比例して大きくする）。
  function buildRoad(warps, rand, S){
    const W = state.worldW, H = state.worldH;
    const spawn = { x: W*0.5, y: H*0.88 };
    const hub = { x: W*(0.36+rand()*0.28), y: H*(0.44+rand()*0.12) };
    const edges = [{ a: spawn, b: hub }];
    const yodomiPos = { x: W*(0.20+rand()*0.60), y: H*(0.10+rand()*0.12) };
    warps.map(w => ({ x:w.x, y:w.y })).concat([yodomiPos]).forEach(t => {
      const mt = 0.3 + rand()*0.35;
      const mid = {
        x: hub.x + (t.x-hub.x)*mt + (rand()-0.5)*70*S,
        y: hub.y + (t.y-hub.y)*mt + (rand()-0.5)*46*S,
      };
      edges.push({ a: hub, b: mid }, { a: mid, b: t });
    });
    return { edges, yodomiPos };
  }

  // 道沿いに店舗を配置する（データ駆動の要）。店舗数が0〜N軒のどの駅データを渡しても、
  // 道の区間からランダムに点を選び、垂直方向にオフセットして重ならない位置を探す。
  // プロップの型（shopA〜D）は店舗IDのハッシュで決定的に選ぶ＝毎回同じ店は同じ見た目になる。
  // 特定の駅名・店舗IDには一切依存しない（本町専用のハードコードはここには置かない）。
  function placeBuildings(stationId, edges, rand, S){
    const W = state.worldW, H = state.worldH;
    const station = D.stations[stationId];
    const buildings = [];
    if (!station || !station.shops) return buildings;
    const margin = 100*S, minGap = 120*S, offBase = 50*S, offRange = 28*S;
    station.shops.forEach((shop, i) => {
      let spot = null;
      for (let tries=0; tries<60 && !spot; tries++){
        const edge = edges[Math.floor(rand()*edges.length)];
        const t = 0.15 + rand()*0.55;
        const px = edge.a.x + (edge.b.x-edge.a.x)*t, py = edge.a.y + (edge.b.y-edge.a.y)*t;
        const dx = edge.b.x-edge.a.x, dy = edge.b.y-edge.a.y, len = Math.hypot(dx,dy) || 1;
        const nx = -dy/len, ny = dx/len;
        // 建物のスプライトは常に正面(下向き)固定なので、道に対して自然に見えるよう
        // 縦成分のあるオフセットは常に「道より上」に建物が来る側を選ぶ。
        const side = Math.abs(ny) > 0.05 ? (ny > 0 ? -1 : 1) : (rand()<0.5?-1:1);
        const offset = offBase + rand()*offRange;
        const bx = px + nx*offset*side, by = py + ny*offset*side;
        if (bx < margin || bx > W-margin || by < H*0.10 || by > H*0.86) continue;
        if (buildings.some(b => Math.hypot(b.x-bx, b.y-by) < minGap)) continue;
        spot = { x: bx, y: by };
      }
      if (!spot) spot = { x: W*(0.28+(i%3)*0.24), y: H*(0.30+Math.floor(i/3)*0.16) };
      const propId = SHOP_PROPS[hashStr(shop.id) % SHOP_PROPS.length];
      buildings.push({ x: spot.x, y: spot.y, shop, propId });
    });
    return buildings;
  }

  // 木・生垣などの通行できない装飾物。道・建物・ヨドミ・乗り場から一定距離を空けて散らす。
  // count/tries はワールド面積比に応じて増やし、駅が大きくなっても密度が薄まりすぎないようにする。
  function buildDecor(stationId, edges, buildings, warps, yodomiPos, rand, S){
    const W = state.worldW, H = state.worldH;
    const decor = [];
    const target = Math.min(60, Math.round(9 * S * S));
    const maxTries = target * 30;
    for (let tries=0; tries<maxTries && decor.length<target; tries++){
      const x = 60*S + rand()*(W-120*S), y = H*0.14 + rand()*(H*0.66);
      if (edges.some(e => distToSegment({x,y}, e.a, e.b) < 34*S)) continue;
      if (buildings.some(b => Math.hypot(b.x-x,b.y-y) < 80*S)) continue;
      if (warps.some(w => Math.hypot(w.x-x,w.y-y) < 60)) continue;
      if (Math.hypot(yodomiPos.x-x, yodomiPos.y-y) < 55) continue;
      if (decor.some(d => Math.hypot(d.x-x,d.y-y) < 40*S)) continue;
      decor.push({ x, y, kind: rand()<0.65?'tree':'hedge', s: 0.9+rand()*0.5, id: stationId+'#decor'+decor.length });
    }
    return decor;
  }

  // 隣駅への乗り場（駅間移動の入口）を組み立てる。data.js の adjacentStations() が
  // 返す隣駅を、路線に関わらず同じロジックでワールド端（左＝prev、右＝next）に配置する。
  // 1駅から複数路線に乗り換えられる場合（例：追分）は同じ側に縦に並べる。
  function buildWarps(stationId){
    const adj = D.adjacentStations(stationId);
    state.warps = [];
    const bySide = { prev: [], next: [] };
    adj.forEach(a => bySide[a.dir].push(a));
    const y0 = state.worldH*0.5;
    bySide.prev.forEach((a, i) => {
      const st = D.stations[a.id];
      state.warps.push({ ...a, name: (st && st.name) || '？？？', x: 40, y: y0 + i*40, r: 24 });
    });
    bySide.next.forEach((a, i) => {
      const st = D.stations[a.id];
      state.warps.push({ ...a, name: (st && st.name) || '？？？', x: state.worldW-40, y: y0 + i*40, r: 24 });
    });
  }

  // 駅の規模から、そのワールドの大きさ（ピクセル）を求める。電車移動時は到着駅の実寸を
  // init() 実行前に知る必要がある（逆側の乗り場ぎりぎりに出す座標を計算するため）。
  function worldDimsFor(stationId){
    const station = D.stations[stationId];
    const scale = WORLD_SCALE[station && station.type] || WORLD_SCALE.minor;
    return { w: Math.round(E.W*scale.w), h: Math.round(E.H*scale.h), scale };
  }

  // stationId は呼び出し側（main.js）が指定する。ここではデフォルト駅を決め打ちしない。
  // spawn を渡すと初期立ち位置を上書きできる（電車で隣駅から来た場合、逆側の乗り場に出す）。
  function init(stationId, spawn){
    state.traveling = false;
    const station = D.stations[stationId] || null;
    state.stationId = stationId;
    state.station = station;

    const dims = worldDimsFor(stationId);
    state.worldW = dims.w; state.worldH = dims.h;
    const S = (dims.scale.w + dims.scale.h) / 2;

    if (spawn){ P.x = spawn.x; P.y = spawn.y; } else { P.x = state.worldW*0.5; P.y = state.worldH*0.88; }
    P.hp = P.maxhp;

    buildWarps(stationId);
    const rand = mulberry32(hashStr(stationId));
    const road = buildRoad(state.warps, rand, S);
    state.road = road.edges;
    state.buildings = placeBuildings(stationId, road.edges, rand, S);
    state.decor = buildDecor(stationId, road.edges, state.buildings, state.warps, road.yodomiPos, rand, S);

    state.sparkles = [];
    for (let i=0;i<Math.round(6*S);i++){
      state.sparkles.push({ x: state.worldW*(0.15+Math.random()*0.7), y: state.worldH*(0.20+Math.random()*0.6), got:false, ph:Math.random()*6 });
    }
    state.cat = { x:state.worldW*0.4, y:state.worldH*0.55, vx:0, vy:0, timer:0, say:0 };
    state.yodomi = { x: road.yodomiPos.x, y: road.yodomiPos.y, r:26, active:true, glow:1 };
    updateCamera();
    document.getElementById('battleHud').style.display = 'none';
    document.getElementById('battleBtns').style.display = 'none';
    document.getElementById('foot').innerHTML = 'WASD 移動 ／ ヨドミに近づくと戦闘開始 ／ 道の先の乗り場から隣駅へ ／ Shift ダッシュ';
  }

  // 隣駅への乗車演出。フェードで暗転→到着駅を組み立て直し、出発方向と逆側の乗り場に出す。
  function travelTo(w){
    state.traveling = true;
    E.banner('乗車', w.lineName + ' ' + w.name + ' ゆき', 700);
    E.fadeThen(() => {
      // 到着直後に反対側の乗り場のトリガー半径へ入り込んで即座に引き返してしまわないよう、
      // 到着駅の実寸（init前に分かる）からワールド端より十分離れた位置を計算しておく。
      const dims = worldDimsFor(w.id);
      const spawn = { x: w.dir === 'next' ? 110 : dims.w-110, y: dims.h*0.5 };
      init(w.id, spawn);
      E.banner(D.stations[w.id].name, '到着', 900);
    }, 420);
  }

  function spawnDust(){
    if (St.t % 9 !== 0) return;
    state.dust.push({ x:P.x+(Math.random()-0.5)*6, y:P.y+8, life:16 });
  }

  // カメラはプレイヤーを画面中央に捉えつつ、ワールド端では止まる（端の外を映さない）。
  function updateCamera(){
    state.camera.x = Math.max(0, Math.min(Math.max(0,state.worldW-E.W), P.x - E.W/2));
    state.camera.y = Math.max(0, Math.min(Math.max(0,state.worldH-E.H), P.y - E.H/2));
  }

  function update(){
    const { dx, dy, m } = E.readAxis();
    const spd = D.balance.playerSpd * (E.keys.run ? D.balance.dashMultiplier : 1);
    if (m>0){ P.dir.x=dx/m; P.dir.y=dy/m; P.x+=dx/m*spd; P.y+=dy/m*spd; spawnDust(); }
    P.x = Math.max(30, Math.min(state.worldW-30, P.x)); P.y = Math.max(state.worldH*0.08, Math.min(state.worldH-24, P.y));
    updateCamera();

    const ally = Hazama.Battle.ally;
    if (ally){
      const tx = P.x - P.dir.x*30, ty = P.y - P.dir.y*30 + 8;
      const adx = tx-ally.ex, ady = ty-ally.ey, ad = Math.hypot(adx,ady)||1;
      const allySpd = ad>4 ? Math.min(ad, 3.6*(E.keys.run?D.balance.dashMultiplier:1)) : 0;
      if (ad>4){ ally.ex += adx/ad*allySpd; ally.ey += ady/ad*allySpd; }
      ally.edir = { x:adx/ad, y:ady/ad };
    }

    const cat = state.cat;
    cat.timer--;
    if (cat.timer<=0){ cat.timer = 60+Math.random()*60|0;
      const a = Math.random()*Math.PI*2; cat.vx=Math.cos(a)*0.6; cat.vy=Math.sin(a)*0.6; }
    cat.x = Math.max(60, Math.min(state.worldW-60, cat.x+cat.vx));
    cat.y = Math.max(state.worldH*0.3, Math.min(state.worldH-40, cat.y+cat.vy));
    if (Math.hypot(cat.x-P.x, cat.y-P.y)<40 && cat.say<=0 && Math.random()<0.01) cat.say = 70;
    if (cat.say>0) cat.say--;

    state.sparkles.forEach(s => {
      if (s.got) return;
      if (Math.hypot(s.x-P.x, s.y-P.y) < 20){
        s.got = true; St.en += 5;
        document.getElementById('enCur').textContent = '縁 ' + St.en;
        E.banner('縁 +5','忘れ物を 拾った',500);
      }
    });

    if (state.yodomi.active){
      state.yodomi.glow = 1 + Math.sin(St.t*0.06)*0.15;
      if (Math.hypot(P.x-state.yodomi.x, P.y-state.yodomi.y) < state.yodomi.r){
        state.yodomi.active = false;
        E.banner('際が 濃くなる…','ヨドミに 引き込まれる',900);
        E.fadeThen(() => { if (onEnterBattle) onEnterBattle(); }, 420);
      }
    }

    if (!state.traveling){
      const w = state.warps.find(w => Math.hypot(P.x-w.x, P.y-w.y) < w.r);
      if (w) travelTo(w);
    }
  }

  // 壁・屋根・窓・ドアはドット絵プロップ（shopA〜D、店舗IDから決定的に選択）に置き換え。
  // 看板だけは可読性のため通常解像度のベクター文字のまま、プロップの上に重ねて描く。
  function drawShop(b){
    const dim = SHOP_DIMS[b.propId];
    E.drawSprite(b.propId, b.shop.id, b.x, b.y, dim.scale, { accent: b.shop.bg });

    const spriteH = dim.h*dim.scale, spriteW = dim.w*dim.scale;
    const signW = Math.max(spriteW+10, 92), signX = b.x-signW/2, signY = b.y-spriteH-18;
    ctx.save();
    ctx.fillStyle = b.shop.bg; ctx.fillRect(signX,signY,signW,18);
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    for (let i=0;i<Math.floor(signW/12);i++){
      ctx.beginPath(); ctx.moveTo(signX+i*12,signY+18); ctx.lineTo(signX+i*12+6,signY+23); ctx.lineTo(signX+i*12+12,signY+18); ctx.fill();
    }
    ctx.fillStyle = '#f4e6c8'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(b.shop.name, b.x, signY+13);
    ctx.restore();
  }

  function drawCat(){
    const c = state.cat;
    ctx.save(); ctx.translate(c.x, c.y); ctx.scale(0.5,0.5);
    ctx.fillStyle = '#c9a06a'; ctx.beginPath(); ctx.ellipse(0,0,16,11,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-9,-7); ctx.lineTo(-13,-16); ctx.lineTo(-3,-9); ctx.fill();
    ctx.beginPath(); ctx.moveTo(9,-7); ctx.lineTo(13,-16); ctx.lineTo(3,-9); ctx.fill();
    ctx.restore();
    if (c.say>0){ ctx.fillStyle='#e9e6da'; ctx.font='11px monospace'; ctx.textAlign='center';
      ctx.fillText('にゃあ', c.x, c.y-24); }
  }
  function drawSparkle(s){
    if (s.got) return;
    const p = (St.t*0.1+s.ph) % (Math.PI*2);
    ctx.save(); ctx.translate(s.x, s.y+Math.sin(p)*3);
    ctx.globalAlpha = 0.7+0.3*Math.sin(p*2);
    ctx.lineWidth=2; ctx.strokeStyle='#e8c86a';
    ctx.beginPath();
    for (let i=0;i<4;i++){ const a=i*Math.PI/2; ctx.moveTo(0,0); ctx.lineTo(Math.cos(a)*7,Math.sin(a)*7); }
    ctx.stroke(); ctx.restore();
  }
  function drawYodomi(){
    const y = state.yodomi; if (!y.active) return;
    ctx.save();
    ctx.fillStyle = 'rgba(232,200,106,.5)';
    ctx.beginPath(); ctx.ellipse(y.x,y.y,26*y.glow,10*y.glow,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#e8c86a'; ctx.shadowColor = '#e8c86a'; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.arc(y.x, y.y-18*y.glow, 9*y.glow, 0, Math.PI*2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#9aa7c7'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
    ctx.fillText('ヨドミ', y.x, y.y-42);
  }
  function drawWarp(w){
    ctx.save(); ctx.translate(w.x, w.y);
    ctx.fillStyle = '#2a2540'; ctx.fillRect(-16,-46,32,46);
    ctx.fillStyle = '#7fd1c1'; ctx.fillRect(-16,-46,32,6);
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 2; ctx.strokeRect(-16,-46,32,46);
    ctx.fillStyle = '#e9e6da'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(w.dir === 'next' ? '▶' : '◀', 0, -18);
    ctx.fillStyle = '#9aa7c7'; ctx.font = '9px monospace';
    ctx.fillText(w.lineName, 0, -56);
    ctx.fillStyle = '#e9e6da'; ctx.font = 'bold 11px monospace';
    ctx.fillText(w.name, 0, -68);
    ctx.restore();
  }
  function drawRoad(){
    const edges = state.road;
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = getRoadPattern(); ctx.lineWidth = 30;
    edges.forEach(e => { ctx.beginPath(); ctx.moveTo(e.a.x,e.a.y); ctx.lineTo(e.b.x,e.b.y); ctx.stroke(); });
    ctx.setLineDash([4,8]); ctx.strokeStyle = 'rgba(232,200,106,.28)'; ctx.lineWidth = 2;
    edges.forEach(e => { ctx.beginPath(); ctx.moveTo(e.a.x,e.a.y); ctx.lineTo(e.b.x,e.b.y); ctx.stroke(); });
    ctx.setLineDash([]);
    ctx.restore();
  }
  function drawDecorItem(d){
    E.drawSprite(d.kind === 'tree' ? 'treeA' : 'hedgeA', d.id, d.x, d.y, 3.0*d.s);
  }
  function drawDust(){
    state.dust.forEach(d => { d.life--;
      ctx.save(); ctx.globalAlpha = Math.max(0, d.life/16*0.35);
      ctx.fillStyle = '#9aa7c7'; ctx.beginPath(); ctx.arc(d.x,d.y,3,0,Math.PI*2); ctx.fill(); ctx.restore();
    });
    state.dust = state.dust.filter(d => d.life>0);
  }
  function drawPlayerSprite(){
    E.shadow(P.x, P.y);
    E.drawSprite('person', 'player', P.x, P.y, 4, {body:'#2a2540',face:'#d8b98a',hair:'#1a1730'});
  }
  function drawAllySprite(ally){
    E.shadow(ally.ex, ally.ey);
    E.drawSprite('person', 'ally', ally.ex, ally.ey, 4, {body:'#245a52',face:'#c8b98a',hair:'#123330'});
    if (ally.name){
      ctx.fillStyle = '#7fd1c1'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
      ctx.fillText(ally.name, ally.ex, ally.ey-86);
    }
  }

  function draw(){
    E.drawGround(); // 画面固定の背景（空気感の演出）。ワールドのスクロールには追従させない。
    ctx.save();
    ctx.translate(-state.camera.x, -state.camera.y);

    drawRoad();
    state.decor.forEach(drawDecorItem);
    state.buildings.forEach(drawShop);
    state.sparkles.forEach(drawSparkle);
    drawYodomi();
    state.warps.forEach(drawWarp);

    const ally = Hazama.Battle.ally;
    const list = [{y:P.y, fn:drawPlayerSprite}, {y:state.cat.y, fn:drawCat}];
    if (ally) list.push({y:ally.ey, fn:()=>drawAllySprite(ally)});
    E.drawYSorted(list);
    drawDust();
    ctx.restore();
  }

  return { init, update, draw, bindShared, state };
})();
