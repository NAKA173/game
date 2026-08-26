/*
 * engine.js
 * 描画基盤・入力・共通ヘルパー。探索/バトルどちらからも使う。
 * 統一3/4視点（奥ほど小さく・手前ほど大きい遠近圧縮、Yソートは足元の深度のみで判定）を
 * project() で一箇所に集約し、道路・建物・キャラクター全てがこれを通して画面座標を得る。
 */
window.Hazama = window.Hazama || {};

Hazama.Engine = (function(){
  const cv = document.getElementById('cv');
  const ctx = cv.getContext('2d');
  let W = 760, H = 440, DPR = Math.min(window.devicePixelRatio || 1, 2);

  function resize(){
    const w = document.getElementById('wrap').clientWidth || 760;
    W = w; H = Math.round(Math.min(440, Math.max(340, w * 0.58)));
    cv.style.height = H + 'px';
    cv.width = W * DPR; cv.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  // ---- 入力 ----
  const keys = {};
  const tv = { x: 0, y: 0 }; // タッチスティック入力
  const KEYMAP = { arrowup:'up',arrowdown:'down',arrowleft:'left',arrowright:'right',
    w:'up', s:'down', a:'left', d:'right', shift:'run' };

  function bindKeyboard(onAction){
    addEventListener('keydown', e => {
      const k = e.key.toLowerCase();
      if (KEYMAP[k]) { keys[KEYMAP[k]] = true; e.preventDefault(); }
      if (onAction) onAction(k);
    });
    addEventListener('keyup', e => {
      const k = e.key.toLowerCase();
      if (KEYMAP[k]) keys[KEYMAP[k]] = false;
    });
  }

  function bindStick(){
    const st = document.getElementById('stick'), nub = document.getElementById('nub');
    let id = null, cx = 0, cy = 0;
    st.addEventListener('touchstart', e => {
      const t = e.changedTouches[0]; id = t.identifier;
      const r = st.getBoundingClientRect(); cx = r.left + r.width/2; cy = r.top + r.height/2;
      moveNub(t); e.preventDefault();
    }, { passive:false });
    st.addEventListener('touchmove', e => {
      for (const t of e.changedTouches) if (t.identifier === id) moveNub(t);
      e.preventDefault();
    }, { passive:false });
    st.addEventListener('touchend', e => {
      for (const t of e.changedTouches) if (t.identifier === id) {
        id = null; tv.x = 0; tv.y = 0; nub.style.left='30px'; nub.style.top='30px';
      }
    }, { passive:false });
    function moveNub(t){
      let dx = t.clientX - cx, dy = t.clientY - cy;
      const m = Math.hypot(dx, dy) || 1, cl = Math.min(m, 34);
      dx = dx/m*cl; dy = dy/m*cl;
      nub.style.left = (30+dx)+'px'; nub.style.top = (30+dy)+'px';
      tv.x = dx/34; tv.y = dy/34;
    }
  }

  function bindButton(id, fn){
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('touchstart', e => { fn(); e.preventDefault(); }, { passive:false });
    el.addEventListener('click', fn);
  }
  // 押している間だけ true/false を切り替えるボタン（ダッシュなど、単発でなく保持したいもの用）。
  function bindHold(id, onDown, onUp){
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('touchstart', e => { onDown(); e.preventDefault(); }, { passive:false });
    el.addEventListener('touchend', e => { onUp(); e.preventDefault(); }, { passive:false });
    el.addEventListener('mousedown', onDown);
    el.addEventListener('mouseup', onUp);
    el.addEventListener('mouseleave', onUp);
  }

  function readAxis(){
    let dx = (keys.right?1:0) - (keys.left?1:0);
    let dy = (keys.down?1:0) - (keys.up?1:0);
    if (tv.x || tv.y) { dx = tv.x; dy = tv.y; }
    return { dx, dy, m: Math.hypot(dx, dy) };
  }

  // ---- UI ヘルパー ----
  let bannerTimer = null;
  function banner(big, sub, ms = 1000){
    document.getElementById('bBig').textContent = big;
    document.getElementById('bSub').textContent = sub || '';
    const e = document.getElementById('banner');
    e.classList.add('show');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => e.classList.remove('show'), ms);
  }
  function fadeThen(fn, ms = 260){
    const f = document.getElementById('fade');
    f.classList.add('on');
    setTimeout(() => { fn(); setTimeout(() => f.classList.remove('on'), 40); }, ms);
  }

  // ==== 統一3/4視点：遠近投影 ==========================================
  // ワールド座標は「深度 depth（0=画面手前、depthMax=水平線上の消失点）」と
  // 「レーンX laneX（道の中心=0、左右へのオフセット。世界座標のまま、圧縮しない）」の2軸。
  // project() が両方を画面座標へまとめて変換し、同時に縮尺 scale（手前ほど大＝1に近い、
  // 奥ほど小＝0に近い）を返す。建物・キャラ・小道具は全てこの scale をそのまま
  // drawSprite() の拡大率に渡すことで、道路も人も同じ圧縮率で小さくなる。
  // 前後関係（Yソート）は depth の大小だけで決める＝ジャンプ等の見た目の高さ(liftY)は
  // 別値としてscreenYから引き算するだけに留め、深度判定には混ぜない。
  // depthMax は「地平線まで見通せる距離」であり、ワールド全体のスクロール可能距離とは別物。
  // ワールド総深度がこれに近いと、カメラが深度方向へ十分に追従できず（後述のカメラ上限に張り付き）、
  // プレイヤーの背後にあるはずの建物がいつまでも消えずに見え続けてしまう。
  // 見通し距離は「街路1区間分をやや超える程度」に抑え、ワールド側を十分長く取ることで解決する。
  const DEFAULT_PERSPECTIVE = {
    horizon: 0.30,   // 水平線のY位置（画面高に対する比率）
    vanishX: 0.5,    // 消失点のX位置（画面幅に対する比率）
    depthMax: 420,   // depth の最大値（これ以上奥は水平線に張り付く＝見通し距離）
    scaleNear: 1.55, // depth=0（画面最手前）での拡大率
    scaleFar: 0.22,  // depth=depthMax（水平線上）での拡大率
    laneSpread: 1.0, // laneX 1単位あたりの画面上の横方向の効き具合（scale と掛け合わせる）
  };
  function project(persp, laneX, depth, liftY){
    const p = persp || DEFAULT_PERSPECTIVE;
    const t = Math.max(0, Math.min(1, depth / p.depthMax));
    // 奥に行くほど圧縮が急になるよう、tにイーズをかける（線形より水平線付近の詰まりが出る）。
    const te = t*t*(3-2*t);
    const scale = p.scaleNear + (p.scaleFar - p.scaleNear) * te;
    const horizonY = H * p.horizon;
    const y = horizonY + (1-te) * (H - horizonY) - (liftY||0)*scale;
    const x = W*p.vanishX + laneX * scale * p.laneSpread;
    return { x, y, scale };
  }
  // 空（水平線より上）を単純なグラデーションで塗る。夕暮れ用途を主眼に、色は呼び出し側が渡す。
  function drawSky(persp, colorTop, colorHorizon){
    const p = persp || DEFAULT_PERSPECTIVE;
    const horizonY = H * p.horizon;
    const g = ctx.createLinearGradient(0,0,0,horizonY);
    g.addColorStop(0, colorTop); g.addColorStop(1, colorHorizon);
    ctx.fillStyle = g; ctx.fillRect(0,0,W,horizonY);
  }
  // 道路面を depthFar→depthNear の順に帯状(トラペゾイド)で塗る。奥ほど暗く見せる簡易グラデーションで
  // 遠近の空気感を出す（テクスチャパターンは遠近変形できないため、色の濃淡のみで表現する）。
  function drawRoadBand(persp, halfWidth, depth0, depth1, color){
    const a = project(persp, -halfWidth, depth0), b = project(persp, halfWidth, depth0);
    const c = project(persp, halfWidth, depth1), d = project(persp, -halfWidth, depth1);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.lineTo(c.x,c.y); ctx.lineTo(d.x,d.y);
    ctx.closePath(); ctx.fill();
  }

  // ---- 潰れ楕円影：3/4視点では scale をそのまま渡すことで奥ほど小さく薄くなる ----
  function shadow(x, y, scale = 1){
    ctx.save();
    ctx.globalAlpha = Math.min(1, 0.34*scale + 0.06);
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(x, y, 15*scale, 5*scale, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  // ---- Yソート描画ヘルパー：{y, fn} の配列を奥から描く（3/4視点では y=足元の画面Y＝深度順と一致） ----
  function drawYSorted(list){
    list.slice().sort((a,b) => a.y - b.y).forEach(e => e.fn());
  }

  // ==== ドット絵プロップ・システム ====================================
  // 等倍のベクター図形の代わりに、低解像度キャンバスへ1ドット単位で描き、
  // それを imageSmoothingEnabled=false で拡大表示することで「打ち込んだドット絵」に近い
  // 見た目を作る。同じ見た目を毎フレーム再計算しないよう、生成結果は座標/IDから
  // 決定的なキー（seedKey）でキャッシュする＝同じ個体は再読込しても同じ絵になる。

  // 現在使っている色をベースにしたパレット。shade() で明るさを掛けて陰影を作る。
  const PAL = {
    wall:'#4a4266', roof:'#2a2540', roofDark:'#1c1830',
    window:'#ffce8a', windowDim:'#3a3550', frame:'#241f3a', door:'#1a1420',
    cream:'#f4e6c8', leaf:'#3a5a34', leafLit:'#4d7345', bark:'#5a3a28',
  };
  function shade(hex, mult){
    const n = parseInt(hex.slice(1),16);
    const c = v => Math.min(255, Math.max(0, Math.round(v*mult)));
    const r = c((n>>16)&255), g = c((n>>8)&255), b = c(n&255);
    return '#' + ((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
  }

  function hashStr(s){
    let h = 2166136261;
    for (let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  // 決定論的な疑似乱数（同じseedなら毎回同じ列を返す）。f()=0〜1の小数、i(lo,hi)=整数。
  function makeRNG(seed){
    let a = seed >>> 0;
    function f(){
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    return { f, i:(lo,hi) => lo + Math.floor(f()*(hi-lo+1)) };
  }

  // 低解像度キャンバス g へ描く最小プリミティブ。
  function px(g, x, y, color){ g.fillStyle = color; g.fillRect(x|0, y|0, 1, 1); }
  function rc(g, x, y, w, h, color){ g.fillStyle = color; g.fillRect(x|0, y|0, w|0, h|0); }
  // 汚れ・粒状のノイズを count 個ばらまく（経年変化っぽさを出す）。
  function speck(g, rng, x, y, w, h, color, count){
    for (let i=0;i<count;i++) px(g, x+rng.i(0,w-1), y+rng.i(0,h-1), color);
  }
  // 縦方向の雨だれ・錆だれ（欠け欠けの筋）。
  function drip(g, rng, x, y0, len, color){
    for (let i=0;i<len;i++){ if (rng.f() < 0.7) px(g, x, y0+i, color); }
  }

  // プロップ定義の登録／生成キャッシュ。
  const propDefs = {};
  const spriteCache = new Map();
  // id: プロップ種別名, w/h: ネイティブ解像度(ドット数), drawFn(g, rng, opts): 描画処理
  function defprop(id, w, h, drawFn){ propDefs[id] = { w, h, drawFn }; }
  function getSprite(propId, seedKey, opts){
    const key = propId + '#' + seedKey;
    let s = spriteCache.get(key);
    if (s) return s;
    const def = propDefs[propId];
    const c = document.createElement('canvas'); c.width = def.w; c.height = def.h;
    const g = c.getContext('2d');
    def.drawFn(g, makeRNG(hashStr(key)), opts || {});
    s = { canvas: c, w: def.w, h: def.h };
    spriteCache.set(key, s);
    return s;
  }
  // seedKey ごとに一度だけ生成してキャッシュしたスプライトを、ワールド座標 (x,y) を
  // 下端中央として scale 倍に拡大描画する。opts.flip=true で左右反転（4方向歩行の右向き用）。
  function drawSprite(propId, seedKey, x, y, scale, opts){
    const s = getSprite(propId, seedKey, opts);
    ctx.save(); ctx.imageSmoothingEnabled = false;
    const dw = s.w*scale, dh = s.h*scale;
    if (opts && opts.flip){
      ctx.translate(Math.round(x), 0); ctx.scale(-1,1);
      ctx.drawImage(s.canvas, Math.round(-dw/2), Math.round(y-dh), dw, dh);
    } else {
      ctx.drawImage(s.canvas, Math.round(x-dw/2), Math.round(y-dh), dw, dh);
    }
    ctx.restore();
  }

  return {
    ctx, get W(){return W;}, get H(){return H;}, get keys(){return keys;}, get tv(){return tv;},
    resize, bindKeyboard, bindStick, bindButton, bindHold, readAxis,
    banner, fadeThen, shadow, drawYSorted,
    DEFAULT_PERSPECTIVE, project, drawSky, drawRoadBand,
    PAL, shade, makeRNG, hashStr, px, rc, speck, drip, defprop, drawSprite,
  };
})();
