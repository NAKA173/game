/*
 * explore.js
 * 街歩き（Yソート2D、遠近圧縮なし）。data.js の駅データから店舗を構築する。
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
    buildings: [], sparkles: [], decor: [], road: [],
    cat: {x:0,y:0,vx:0,vy:0,timer:0,say:0},
    yodomi: {x:0,y:0,r:26,active:true,glow:1},
    warps: [], traveling: false,
    dust: [],
  };

  function bindShared(sharedP, sharedSt, enterBattleFn){
    P = sharedP; St = sharedSt; onEnterBattle = enterBattleFn;
  }

  // ==== ドット絵プロップの試験導入 ==================================
  // engine.js の低解像度プロップ・システムを使って、プレイヤー人物と
  // 店舗1種類だけをドット絵化した試作。方向性がよければ他の建物・装飾にも展開する。

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

  // 店舗（試作1種）：24x34ドット。壁の陰影・パネル継ぎ目・汚れ・窓の点灯差・雨だれを
  // rng で個体ごとにばらつかせる。屋根含めて壁本体はここで作り、看板は別途通常解像度で重ねる。
  E.defprop('shopA', 24, 34, (g, rng) => {
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
  const SHOP_SPRITE_SCALE = 3.5;

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
  function buildRoad(warps, rand){
    const spawn = { x: E.W*0.5, y: E.H*0.86 };
    const hub = { x: E.W*(0.36+rand()*0.28), y: E.H*(0.44+rand()*0.12) };
    const edges = [{ a: spawn, b: hub }];
    const yodomiPos = { x: E.W*(0.24+rand()*0.52), y: E.H*(0.15+rand()*0.10) };
    warps.map(w => ({ x:w.x, y:w.y })).concat([yodomiPos]).forEach(t => {
      const mt = 0.3 + rand()*0.35;
      const mid = {
        x: hub.x + (t.x-hub.x)*mt + (rand()-0.5)*70,
        y: hub.y + (t.y-hub.y)*mt + (rand()-0.5)*46,
      };
      edges.push({ a: hub, b: mid }, { a: mid, b: t });
    });
    return { edges, yodomiPos };
  }

  // 道沿いに店舗を配置する（データ駆動の要）。店舗数が0〜N軒のどの駅データを渡しても、
  // 道の区間からランダムに点を選び、垂直方向にオフセットして重ならない位置を探す。
  // 特定の駅名・店舗IDには一切依存しない（本町専用のハードコードはここには置かない）。
  function placeBuildings(stationId, edges, rand){
    const station = D.stations[stationId];
    const buildings = [];
    if (!station || !station.shops) return buildings;
    station.shops.forEach((shop, i) => {
      let spot = null;
      for (let tries=0; tries<50 && !spot; tries++){
        const edge = edges[Math.floor(rand()*edges.length)];
        const t = 0.15 + rand()*0.55;
        const px = edge.a.x + (edge.b.x-edge.a.x)*t, py = edge.a.y + (edge.b.y-edge.a.y)*t;
        const dx = edge.b.x-edge.a.x, dy = edge.b.y-edge.a.y, len = Math.hypot(dx,dy) || 1;
        const nx = -dy/len, ny = dx/len;
        // 建物のスプライトは常に正面(下向き)固定なので、道に対して自然に見えるよう
        // 縦成分のあるオフセットは常に「道より上」に建物が来る側を選ぶ。
        const side = Math.abs(ny) > 0.05 ? (ny > 0 ? -1 : 1) : (rand()<0.5?-1:1);
        const offset = 50 + rand()*28;
        const bx = px + nx*offset*side, by = py + ny*offset*side;
        if (bx < 95 || bx > E.W-95 || by < E.H*0.14 || by > E.H*0.80) continue;
        if (buildings.some(b => Math.hypot(b.x-bx, b.y-by) < 115)) continue;
        spot = { x: bx, y: by };
      }
      if (!spot) spot = { x: E.W*(0.28+(i%3)*0.24), y: E.H*(0.30+Math.floor(i/3)*0.16) };
      buildings.push({ x: spot.x, y: spot.y, shop });
    });
    return buildings;
  }

  // 木・生垣などの通行できない装飾物。道・建物・ヨドミ・乗り場から一定距離を空けて散らす。
  function buildDecor(edges, buildings, warps, yodomiPos, rand){
    const decor = [];
    for (let tries=0; tries<220 && decor.length<9; tries++){
      const x = 60 + rand()*(E.W-120), y = E.H*0.18 + rand()*(E.H*0.58);
      if (edges.some(e => distToSegment({x,y}, e.a, e.b) < 32)) continue;
      if (buildings.some(b => Math.hypot(b.x-x,b.y-y) < 75)) continue;
      if (warps.some(w => Math.hypot(w.x-x,w.y-y) < 60)) continue;
      if (Math.hypot(yodomiPos.x-x, yodomiPos.y-y) < 55) continue;
      if (decor.some(d => Math.hypot(d.x-x,d.y-y) < 36)) continue;
      decor.push({ x, y, kind: rand()<0.65?'tree':'hedge', s: 0.85+rand()*0.4 });
    }
    return decor;
  }

  // 隣駅への乗り場（駅間移動の入口）を組み立てる。data.js の adjacentStations() が
  // 返す隣駅を、路線に関わらず同じロジックでマップ端（左＝prev、右＝next）に配置する。
  // 1駅から複数路線に乗り換えられる場合（例：追分）は同じ側に縦に並べる。
  function buildWarps(stationId){
    const adj = D.adjacentStations(stationId);
    state.warps = [];
    const bySide = { prev: [], next: [] };
    adj.forEach(a => bySide[a.dir].push(a));
    bySide.prev.forEach((a, i) => {
      const st = D.stations[a.id];
      state.warps.push({ ...a, name: (st && st.name) || '？？？', x: 40, y: E.H*0.56 + i*36, r: 22 });
    });
    bySide.next.forEach((a, i) => {
      const st = D.stations[a.id];
      state.warps.push({ ...a, name: (st && st.name) || '？？？', x: E.W-40, y: E.H*0.56 + i*36, r: 22 });
    });
  }

  // stationId は呼び出し側（main.js）が指定する。ここではデフォルト駅を決め打ちしない。
  // spawn を渡すと初期立ち位置を上書きできる（電車で隣駅から来た場合、逆側の乗り場に出す）。
  function init(stationId, spawn){
    state.traveling = false;
    if (spawn){ P.x = spawn.x; P.y = spawn.y; } else { P.x = E.W*0.5; P.y = E.H*0.86; }
    P.hp = P.maxhp;
    state.stationId = stationId;
    state.station = D.stations[stationId] || null;

    buildWarps(stationId);
    const rand = mulberry32(hashStr(stationId));
    const road = buildRoad(state.warps, rand);
    state.road = road.edges;
    state.buildings = placeBuildings(stationId, road.edges, rand);
    state.decor = buildDecor(road.edges, state.buildings, state.warps, road.yodomiPos, rand);

    state.sparkles = [];
    for (let i=0;i<6;i++){
      state.sparkles.push({ x: E.W*(0.3+Math.random()*0.4), y: E.H*(0.35+Math.random()*0.4), got:false, ph:Math.random()*6 });
    }
    state.cat = { x:E.W*0.4, y:E.H*0.55, vx:0, vy:0, timer:0, say:0 };
    state.yodomi = { x: road.yodomiPos.x, y: road.yodomiPos.y, r:26, active:true, glow:1 };
    document.getElementById('battleHud').style.display = 'none';
    document.getElementById('battleBtns').style.display = 'none';
    document.getElementById('foot').innerHTML = 'WASD 移動 ／ ヨドミに近づくと戦闘開始 ／ 道の先の乗り場から隣駅へ';
  }

  // 隣駅への乗車演出。フェードで暗転→到着駅を組み立て直し、出発方向と逆側の乗り場に出す。
  function travelTo(w){
    state.traveling = true;
    E.banner('乗車', w.lineName + ' ' + w.name + ' ゆき', 700);
    E.fadeThen(() => {
      // 到着直後に反対側の乗り場のトリガー半径(r:22)へ入り込んで即座に引き返してしまわないよう、
      // 端からトリガー半径より十分離れた位置に降ろす。
      const spawn = w.dir === 'next' ? { x: 90, y: E.H*0.56 } : { x: E.W-90, y: E.H*0.56 };
      init(w.id, spawn);
      E.banner(D.stations[w.id].name, '到着', 900);
    }, 420);
  }

  function spawnDust(){
    if (St.t % 9 !== 0) return;
    state.dust.push({ x:P.x+(Math.random()-0.5)*6, y:P.y+8, life:16 });
  }

  function update(){
    const { dx, dy, m } = E.readAxis();
    if (m>0){ P.dir.x=dx/m; P.dir.y=dy/m; P.x+=dx/m*D.balance.playerSpd; P.y+=dy/m*D.balance.playerSpd; spawnDust(); }
    P.x = Math.max(30, Math.min(E.W-30, P.x)); P.y = Math.max(E.H*0.22, Math.min(E.H-24, P.y));

    const ally = Hazama.Battle.ally;
    if (ally){
      const tx = P.x - P.dir.x*30, ty = P.y - P.dir.y*30 + 8;
      const adx = tx-ally.ex, ady = ty-ally.ey, ad = Math.hypot(adx,ady)||1;
      if (ad>4){ ally.ex += adx/ad*Math.min(ad,3.6); ally.ey += ady/ad*Math.min(ad,3.6); }
      ally.edir = { x:adx/ad, y:ady/ad };
    }

    const cat = state.cat;
    cat.timer--;
    if (cat.timer<=0){ cat.timer = 60+Math.random()*60|0;
      const a = Math.random()*Math.PI*2; cat.vx=Math.cos(a)*0.6; cat.vy=Math.sin(a)*0.6; }
    cat.x = Math.max(60, Math.min(E.W-60, cat.x+cat.vx));
    cat.y = Math.max(E.H*0.4, Math.min(E.H-40, cat.y+cat.vy));
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

  // 試作：壁・屋根・窓・ドアはドット絵プロップ（shopA）に置き換え。看板だけは可読性のため
  // 通常解像度のベクター文字のまま、プロップの上に重ねて描く。
  function drawShop(b){
    E.drawSprite('shopA', b.shop.id, b.x, b.y, SHOP_SPRITE_SCALE);

    const spriteH = 34*SHOP_SPRITE_SCALE, spriteW = 24*SHOP_SPRITE_SCALE;
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
    ctx.strokeStyle = '#352f4a'; ctx.lineWidth = 30;
    edges.forEach(e => { ctx.beginPath(); ctx.moveTo(e.a.x,e.a.y); ctx.lineTo(e.b.x,e.b.y); ctx.stroke(); });
    ctx.setLineDash([4,8]); ctx.strokeStyle = 'rgba(232,200,106,.28)'; ctx.lineWidth = 2;
    edges.forEach(e => { ctx.beginPath(); ctx.moveTo(e.a.x,e.a.y); ctx.lineTo(e.b.x,e.b.y); ctx.stroke(); });
    ctx.setLineDash([]);
    ctx.restore();
  }
  function drawDecorItem(d){
    ctx.save(); ctx.translate(d.x, d.y); ctx.scale(d.s, d.s);
    if (d.kind === 'tree'){
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(0,2,11,4,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = '#3a5a34'; ctx.beginPath(); ctx.arc(0,-15,13,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = '#4d7345'; ctx.beginPath(); ctx.arc(-4,-19,9,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = '#5a3a28'; ctx.fillRect(-3,-6,6,10);
    } else {
      ctx.fillStyle = '#2e4a2a'; ctx.fillRect(-16,-15,32,15);
      ctx.fillStyle = '#436b3c'; ctx.fillRect(-16,-17,32,6);
    }
    ctx.restore();
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
    E.drawGround();
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
  }

  return { init, update, draw, bindShared, state };
})();
