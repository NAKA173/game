/*
 * engine.js
 * 描画基盤・入力・共通ヘルパー。バトル/探索どちらからも使う。
 * 遠近圧縮(depthScale)は廃止。全キャラ・建物は等倍表示、Yソートのみで前後関係を作る。
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
    w:'up', s:'down', a:'left', d:'right' };

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

  // ---- 石畳パターン（1度だけ生成してキャッシュ） ----
  let groundPattern = null, groundEdgePattern = null;
  function buildGroundPatterns(){
    const c = document.createElement('canvas'); c.width = 64; c.height = 64;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    g.fillStyle = '#2a2438'; g.fillRect(0,0,64,64);
    const stones = [
      [2,2,26,26,'#332c46'],[30,2,32,14,'#362f4a'],[30,18,14,14,'#302a42'],[46,18,16,14,'#352e48'],
      [2,30,14,16,'#302a42'],[18,30,26,14,'#372f4c'],[2,46,42,16,'#332c46'],[46,32,16,30,'#362f4a']
    ];
    stones.forEach(([x,y,w,h,col]) => { g.fillStyle = col; g.fillRect(x,y,w,h); });
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1;
    stones.forEach(([x,y,w,h]) => g.strokeRect(x+0.5,y+0.5,w,h));
    g.fillStyle = 'rgba(255,255,255,.04)';
    stones.forEach(([x,y,w,h]) => g.fillRect(x+1,y+1,w-2,2));
    groundPattern = ctx.createPattern(c, 'repeat');

    const c2 = document.createElement('canvas'); c2.width = 24; c2.height = 24;
    const g2 = c2.getContext('2d');
    g2.fillStyle = '#232030'; g2.fillRect(0,0,24,24);
    g2.fillStyle = '#2e3a28'; g2.fillRect(0,0,24,6); g2.fillRect(0,18,24,6);
    g2.fillStyle = 'rgba(0,0,0,.25)'; g2.fillRect(0,11,24,2);
    groundEdgePattern = ctx.createPattern(c2, 'repeat');
  }
  function horizon(){ return H * 0.16; }
  function drawGround(){
    if (!groundPattern) buildGroundPatterns();
    let g = ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#241f3a'); g.addColorStop(1,'#120f1c');
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H*0.45);
    const gy0 = horizon();
    ctx.save();
    ctx.fillStyle = groundPattern; ctx.fillRect(0,gy0,W,H-gy0);
    ctx.fillStyle = 'rgba(10,9,16,.42)'; ctx.fillRect(0,gy0,W,H-gy0);
    ctx.restore();
    ctx.save();
    ctx.fillStyle = groundEdgePattern;
    ctx.fillRect(0,gy0,26,H-gy0); ctx.fillRect(W-26,gy0,26,H-gy0);
    ctx.restore();
  }

  // ---- キャラクター描画（等倍・遠近圧縮なし） ----
  function shadow(x, y, scale = 1){
    ctx.fillStyle = 'rgba(0,0,0,.32)';
    ctx.beginPath(); ctx.ellipse(x, y, 16*scale, 5*scale, 0, 0, Math.PI*2); ctx.fill();
  }
  function drawPerson(x, y, dir, palette, label){
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = palette.body; ctx.fillRect(-9,-40,18,26);
    ctx.fillStyle = palette.face; ctx.fillRect(-6,-48,12,10);
    ctx.fillStyle = palette.hair; ctx.fillRect(-7,-50,14,6);
    ctx.strokeStyle = 'rgba(233,230,218,.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0,-27); ctx.lineTo(dir.x*16, -27+dir.y*16); ctx.stroke();
    ctx.restore();
    if (label){
      ctx.fillStyle = palette.label || '#9aa7c7'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
      ctx.fillText(label, x, y-56);
    }
  }

  // ---- Yソート描画ヘルパー：{y, fn} の配列を奥から描く ----
  function drawYSorted(list){
    list.slice().sort((a,b) => a.y - b.y).forEach(e => e.fn());
  }

  // ==== ドット絵プロップ・システム（試験導入） ====================
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
  // 下端中央として scale 倍に拡大描画する。
  function drawSprite(propId, seedKey, x, y, scale, opts){
    const s = getSprite(propId, seedKey, opts);
    ctx.save(); ctx.imageSmoothingEnabled = false;
    const dw = s.w*scale, dh = s.h*scale;
    ctx.drawImage(s.canvas, Math.round(x-dw/2), Math.round(y-dh), dw, dh);
    ctx.restore();
  }

  return {
    ctx, get W(){return W;}, get H(){return H;}, get keys(){return keys;}, get tv(){return tv;},
    resize, bindKeyboard, bindStick, bindButton, readAxis,
    banner, fadeThen, horizon, drawGround, shadow, drawPerson, drawYSorted,
    PAL, shade, makeRNG, hashStr, px, rc, speck, drip, defprop, drawSprite,
  };
})();
