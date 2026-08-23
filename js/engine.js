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

  return {
    ctx, get W(){return W;}, get H(){return H;}, get keys(){return keys;}, get tv(){return tv;},
    resize, bindKeyboard, bindStick, bindButton, readAxis,
    banner, fadeThen, horizon, drawGround, shadow, drawPerson, drawYSorted,
  };
})();
