/*
 * explore.js
 * 街歩き（Yソート2D、遠近圧縮なし）。data.js の駅データから店舗を構築する。
 * 駅は「街」と「駅構内（station.js）」を独立させた構造：ここで作るのは道路グリッド＋区画（ブロック）
 * に建物を並べた街のみ。駅ブロックには改札のファサードだけを置き、近づくと駅構内シーンへ遷移する
 * （実際の路線図・乗車券購入・電車移動は station.js / train.js が担当）。
 * 駅ごとの座標は stationId から作る疑似乱数で決めるため、同じ駅は毎回同じレイアウトになる。
 * ヨドミに近づくとバトルへ遷移する。
 */
window.Hazama = window.Hazama || {};

Hazama.Explore = (function(){
  const E = Hazama.Engine;
  const D = Hazama.Data;
  const ctx = E.ctx;

  let P, St, onEnterBattle, onEnterStation;
  const state = {
    worldW: 0, worldH: 0, camera: {x:0,y:0},
    blocks: [], stationBlock: null, parkBlock: null,
    buildings: [], sparkles: [], decor: [],
    stationGate: {x:0,y:0,r:46}, enteringStation: false,
    cat: {x:0,y:0,vx:0,vy:0,timer:0,say:0},
    yodomi: {x:0,y:0,r:26,active:true,glow:1},
    dust: [],
  };

  function bindShared(sharedP, sharedSt, enterBattleFn, enterStationFn){
    P = sharedP; St = sharedSt; onEnterBattle = enterBattleFn; onEnterStation = enterStationFn;
  }

  // ==== ドット絵プロップ ==============================================
  // engine.js の低解像度プロップ・システムを使い、人物・店舗（4種）・駅ファサード・木・生垣・
  // 道路舗装テクスチャをドット絵化する。

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

  // 店舗A：24x34ドット。窓2つの標準型。
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
    for (let xx=0; xx<22; xx+=4) E.rc(g,xx,10,2,4, xx%8===0?accent:E.shade(accent,0.65));
    E.rc(g,-1,9,24,1,E.shade(accent,1.3));
    const wc = rng.f()<0.6 ? E.PAL.window : E.PAL.windowDim;
    E.rc(g,3,16,16,10,E.PAL.frame);
    E.rc(g,4,17,14,8,wc); E.rc(g,4,17,14,1,E.shade(wc,1.2)); E.rc(g,4,17,1,8,E.shade(wc,0.7));
    for (let xx=8; xx<18; xx+=5) E.rc(g,xx,17,1,8,E.shade(wc,0.75));
    E.rc(g,8,29,6,9,E.PAL.door); E.rc(g,8,29,6,1,E.shade(E.PAL.door,1.6));
    if (rng.f() < 0.4) E.drip(g, rng, rng.i(1,20), 15, 18, E.shade(wall,0.55));
  });

  // 店舗C：26x30ドット。低め・横長で、提灯風アクセントが付く食堂・甘味処タイプ。
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
    E.rc(g,23,-2,1,9,E.shade('#5a4a30',1)); E.rc(g,21,6,5,6,accent); E.rc(g,21,6,5,1,E.shade(accent,1.4));
  });

  // 店舗D：14x22ドット。自販機・小型売店向け。通常店舗より出現率を下げて使う。
  E.defprop('shopD', 14, 22, (g, rng, opts) => {
    const accent = opts.accent || '#2e4a5e';
    E.rc(g,1,2,12,20,E.shade(accent,0.9)); E.rc(g,1,2,12,2,E.shade(accent,1.3));
    E.rc(g,2,5,10,10,E.PAL.frame);
    for (let yy=6; yy<14; yy+=3) E.rc(g,3,yy,8,2, rng.f()<0.5?E.PAL.window:E.shade(accent,0.6));
    E.rc(g,2,16,10,4,E.shade(accent,0.6));
    E.speck(g, rng, 1,2,12,20, E.shade(accent,0.6), 5);
  });

  const SHOP_PROPS = ['shopA','shopA','shopB','shopB','shopC','shopC','shopD'];
  const SHOP_DIMS = { shopA:{w:24,h:34,scale:3.5}, shopB:{w:22,h:38,scale:3.2},
    shopC:{w:26,h:30,scale:3.4}, shopD:{w:14,h:22,scale:3.6} };

  // 駅ファサード：30x32ドット。改札の明かりを窓のように並べた、店舗より一回り大きい構造物。
  E.defprop('stationFacade', 30, 32, (g, rng) => {
    const wall = '#3a3550', wallLo = E.shade(wall,0.75), wallHi = E.shade(wall,1.2);
    E.rc(g,0,10,30,22,wall); E.rc(g,0,10,1,22,wallLo); E.rc(g,29,10,1,22,wallHi);
    E.rc(g,-2,4,34,7,E.PAL.roof); E.rc(g,-2,10,34,1,E.PAL.roofDark);
    for (let xx=-2; xx<32; xx+=4) E.rc(g,xx,4,2,7,E.shade(E.PAL.roof,0.85));
    for (let wx=3; wx<27; wx+=8){ E.rc(g,wx,14,5,10,E.PAL.frame); E.rc(g,wx+1,15,3,8,E.PAL.window); }
    E.rc(g,11,24,8,8,E.PAL.door);
    E.speck(g, rng, 0,10,30,22, E.shade(wall,0.6), 10);
  });

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

  // 道路舗装テクスチャ（16x16タイル）。CanvasPattern化して fillStyle に使う（街全体の下敷き）。
  let roadPattern = null;
  function getRoadPattern(){
    if (roadPattern) return roadPattern;
    const c = document.createElement('canvas'); c.width = 16; c.height = 16;
    const g = c.getContext('2d');
    const rng = E.makeRNG(4242);
    E.rc(g,0,0,16,16, '#5c5346');
    E.speck(g, rng, 0,0,16,16, '#6e6353', 16);
    E.speck(g, rng, 0,0,16,16, '#433a2f', 12);
    roadPattern = ctx.createPattern(c, 'repeat');
    return roadPattern;
  }

  function roundRect(x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r);
    ctx.closePath();
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

  // ==== 街のレイアウト：碁盤目状の街区（ブロック）＋区画間の街路 ==========
  // 一本道の折れ線に頼っていた旧方式は、縦に伸びすぎる・単調という指摘を受けて撤廃。
  // 参考画像（さくら住宅街的なマップ）に寄せ、街路の格子の中に建物が並ぶ区画を敷き詰める方式にした。
  const TOWN_GRID = {
    major:   { cols:6, rows:3 },
    minor:   { cols:4, rows:2 },
    special: { cols:3, rows:2 },
    pass:    { cols:2, rows:1 },
  };
  const BLOCK_W = 340, BLOCK_H = 250, STREET_W = 60;

  function gridDimsFor(stationId){
    const station = D.stations[stationId];
    const grid = TOWN_GRID[station && station.type] || TOWN_GRID.minor;
    return {
      cols: grid.cols, rows: grid.rows,
      w: grid.cols*BLOCK_W + (grid.cols+1)*STREET_W,
      h: grid.rows*BLOCK_H + (grid.rows+1)*STREET_W,
    };
  }
  function blockRect(c, r){
    const x0 = STREET_W + c*(BLOCK_W+STREET_W), y0 = STREET_W + r*(BLOCK_H+STREET_W);
    return { c, r, x0, y0, w:BLOCK_W, h:BLOCK_H, cx:x0+BLOCK_W/2, cy:y0+BLOCK_H/2 };
  }

  // 駅ブロック（改札があるブロック、常に左端の縦中央）・公園ブロック（ヨドミ＋装飾多め）を確保し、
  // 残りのブロックへ店舗を輪番で振り分けて、各ブロックの上辺/下辺に沿って等間隔に並べる。
  function buildTown(stationId, rand){
    const grid = gridDimsFor(stationId);
    const blocks = [];
    for (let r=0;r<grid.rows;r++) for (let c=0;c<grid.cols;c++) blocks.push(blockRect(c,r));

    const stationBlock = blocks.find(b => b.c===0 && b.r===Math.floor((grid.rows-1)/2)) || blocks[0];
    let rest = blocks.filter(b => b!==stationBlock);
    let parkBlock = null;
    if (rest.length >= 2){
      parkBlock = rest[Math.floor(rand()*rest.length)];
      rest = rest.filter(b => b!==parkBlock);
    }
    const shopBlocks = rest.length ? rest : blocks.filter(b => b!==stationBlock);

    const station = D.stations[stationId];
    const shops = (station && station.shops) || [];
    const buildings = [];
    const perBlockCount = new Map();
    shops.forEach((shop, i) => {
      const block = shopBlocks[i % shopBlocks.length];
      const key = block.c+'_'+block.r;
      const idx = perBlockCount.get(key) || 0;
      perBlockCount.set(key, idx+1);
      const propId = SHOP_PROPS[hashStr(shop.id) % SHOP_PROPS.length];
      buildings.push({ shop, propId, block, onTop: idx%2===0, jitter:(rand()-0.5)*24 });
    });
    // 辺ごとにグルーピングし直し、実際にその辺へ何軒並ぶか分かってから等間隔位置を確定する。
    const bySide = new Map();
    buildings.forEach(b => {
      const key = b.block.c+'_'+b.block.r+'|'+b.onTop;
      if (!bySide.has(key)) bySide.set(key, []);
      bySide.get(key).push(b);
    });
    bySide.forEach(list => {
      list.forEach((b, i) => {
        const t = (i+1)/(list.length+1);
        const dim = SHOP_DIMS[b.propId];
        b.x = b.block.x0 + t*b.block.w + b.jitter;
        b.y = b.onTop ? b.block.y0 + dim.h*dim.scale + 6 : b.block.y0 + b.block.h - 8;
      });
    });

    // 装飾：各ブロックの余白へ木・生垣を散らす。公園ブロックは密度を上げる。
    const decor = [];
    blocks.forEach(block => {
      if (block === stationBlock) return;
      const isPark = block === parkBlock;
      const target = isPark ? 11 : 4;
      let placed = 0;
      for (let tries=0; tries<target*25 && placed<target; tries++){
        const x = block.x0 + 16 + rand()*(block.w-32), y = block.y0 + 16 + rand()*(block.h-32);
        if (buildings.some(b => b.block===block && Math.hypot(b.x-x,b.y-y) < 60)) continue;
        if (isPark){ const d0={x:block.cx,y:block.cy}; if (Math.hypot(d0.x-x,d0.y-y) < 55) continue; }
        if (decor.some(d => Math.hypot(d.x-x,d.y-y) < 34)) continue;
        decor.push({ x, y, kind: rand()<0.6?'tree':'hedge', s:0.85+rand()*0.45, id: stationId+'#decor'+decor.length });
        placed++;
      }
    });

    const yodomiBlock = parkBlock || shopBlocks[shopBlocks.length-1] || stationBlock;
    const yodomiPos = { x: yodomiBlock.cx, y: yodomiBlock.cy };
    const stationGate = { x: stationBlock.x0 + stationBlock.w*0.5, y: stationBlock.y0 + stationBlock.h*0.58, r: 50 };

    return { worldW:grid.w, worldH:grid.h, blocks, stationBlock, parkBlock, buildings, decor, yodomiPos, stationGate };
  }

  // stationId は呼び出し側（main.js）が指定する。ここではデフォルト駅を決め打ちしない。
  // spawn を渡すと初期立ち位置を上書きできる（未指定時は自駅の改札のすぐ外に出す＝
  // 駅構内から出た時も、電車で到着した時も、同じ場所から街に入る）。
  function init(stationId, spawn){
    state.enteringStation = false;
    const station = D.stations[stationId] || null;
    state.stationId = stationId;
    state.station = station;

    const rand = mulberry32(hashStr(stationId));
    const town = buildTown(stationId, rand);
    state.worldW = town.worldW; state.worldH = town.worldH;
    state.blocks = town.blocks; state.stationBlock = town.stationBlock; state.parkBlock = town.parkBlock;
    state.buildings = town.buildings; state.decor = town.decor;
    state.stationGate = town.stationGate;
    state.yodomi = { x: town.yodomiPos.x, y: town.yodomiPos.y, r:26, active:true, glow:1 };

    if (spawn){ P.x = spawn.x; P.y = spawn.y; }
    else { P.x = state.stationGate.x + 90; P.y = state.stationGate.y; }
    P.hp = P.maxhp;

    state.sparkles = [];
    const sparkleCount = Math.max(6, Math.round(town.blocks.length * 1.6));
    for (let i=0;i<sparkleCount;i++){
      const b = town.blocks[Math.floor(rand()*town.blocks.length)];
      state.sparkles.push({ x: b.x0+20+rand()*(b.w-40), y: b.y0+20+rand()*(b.h-40), got:false, ph:rand()*6 });
    }
    state.cat = { x:state.stationGate.x+140, y:state.stationGate.y+40, vx:0, vy:0, timer:0, say:0 };
    updateCamera();
    document.getElementById('battleHud').style.display = 'none';
    document.getElementById('battleBtns').style.display = 'none';
    document.getElementById('foot').innerHTML = 'WASD 移動 ／ ヨドミに近づくと戦闘開始 ／ 改札で駅構内へ ／ Shift ダッシュ';
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
    P.x = Math.max(20, Math.min(state.worldW-20, P.x)); P.y = Math.max(20, Math.min(state.worldH-20, P.y));
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
    cat.x = Math.max(30, Math.min(state.worldW-30, cat.x+cat.vx));
    cat.y = Math.max(30, Math.min(state.worldH-30, cat.y+cat.vy));
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

    if (!state.enteringStation && Math.hypot(P.x-state.stationGate.x, P.y-state.stationGate.y) < state.stationGate.r){
      state.enteringStation = true;
      E.banner('駅構内へ','改札を抜ける', 700);
      E.fadeThen(() => { if (onEnterStation) onEnterStation(state.stationId); }, 420);
    }
  }

  // 壁・屋根・窓・ドアはドット絵プロップ（shopA〜D、店舗IDから決定的に選択）。
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

  function drawStationGate(){
    const g = state.stationGate;
    E.drawSprite('stationFacade', state.stationId, g.x, g.y, 4.6);
    ctx.fillStyle = '#e9e6da'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText((state.station && state.station.name) || '駅', g.x, g.y - 32*4.6 - 8);
    ctx.fillStyle = '#7fd1c1'; ctx.font = '9px monospace';
    ctx.fillText('改札', g.x, g.y - 32*4.6 + 6);
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
  // 街の下敷き：全体を舗装テクスチャで塗り、その上に区画（ブロック）を丸角の色面として重ねる。
  // 駅ブロック＝濃い青灰、公園ブロック＝緑、それ以外＝紫がかった街区色、という単純な塗り分けで、
  // 参考画像同様「街路の中に色の付いた区画が並ぶ」構図にする。
  function drawTownBase(){
    ctx.save();
    ctx.fillStyle = getRoadPattern();
    ctx.fillRect(0, 0, state.worldW, state.worldH);
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.28)';
    state.blocks.forEach(b => {
      const isStation = b === state.stationBlock, isPark = b === state.parkBlock;
      ctx.fillStyle = isStation ? '#38334c' : (isPark ? '#3c5638' : '#454064');
      roundRect(b.x0, b.y0, b.w, b.h, 14); ctx.fill(); ctx.stroke();
    });
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
    const pal = (D.characters[P.charId] && D.characters[P.charId].palette) || D.characters.saku.palette;
    E.drawSprite('person', 'player-'+P.charId, P.x, P.y, 4, pal);
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

    drawTownBase();
    state.decor.forEach(drawDecorItem);
    state.buildings.forEach(drawShop);
    drawStationGate();
    state.sparkles.forEach(drawSparkle);
    drawYodomi();

    const ally = Hazama.Battle.ally;
    const list = [{y:P.y, fn:drawPlayerSprite}, {y:state.cat.y, fn:drawCat}];
    if (ally) list.push({y:ally.ey, fn:()=>drawAllySprite(ally)});
    E.drawYSorted(list);
    drawDust();
    ctx.restore();
  }

  return { init, update, draw, bindShared, state };
})();
