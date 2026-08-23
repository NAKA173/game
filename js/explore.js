/*
 * explore.js
 * 街歩き（Yソート2D、遠近圧縮なし）。data.js の駅データから店舗を構築する。
 * ヨドミに近づくとバトルへ遷移する。
 */
window.Hazama = window.Hazama || {};

Hazama.Explore = (function(){
  const E = Hazama.Engine;
  const D = Hazama.Data;
  const ctx = E.ctx;

  let P, St, onEnterBattle;
  const wallColors = ['#4a4266','#43395c','#3c3452','#4e4468'];
  const state = {
    buildings: [], sparkles: [], cat: {x:0,y:0,vx:0,vy:0,timer:0,say:0},
    yodomi: {x:0,y:0,r:26,active:true,glow:1},
    dust: [],
  };

  function bindShared(sharedP, sharedSt, enterBattleFn){
    P = sharedP; St = sharedSt; onEnterBattle = enterBattleFn;
  }

  // 駅データから店舗インスタンスを組み立てる（データ駆動の要）
  // 店舗数が0〜N軒のどの駅データを渡しても、同じロジックでジグザグ配置のマップを組み立てる。
  // 特定の駅名・店舗IDには一切依存しない（本町専用のハードコードはここには置かない）。
  function buildFromStation(stationId){
    const station = D.stations[stationId];
    state.buildings = [];
    state.stationId = stationId;
    state.station = station || null;
    if (!station || !station.shops) return;
    station.shops.forEach((shop, i) => {
      const row = Math.floor(i / 2);
      const side = i % 2 === 0 ? 0.14 : 0.86;
      const y = E.H * 0.30 + row * 46;
      state.buildings.push({
        x: E.W * side, y, w: 150, h: 70, shop,
        wall: wallColors[i % wallColors.length], roof:'#2a2540', roofDark:'#1c1830',
      });
    });
  }

  // stationId は呼び出し側（main.js）が指定する。ここではデフォルト駅を決め打ちしない。
  function init(stationId){
    P.x = E.W*0.5; P.y = E.H*0.86; P.hp = P.maxhp;
    buildFromStation(stationId);
    state.sparkles = [];
    for (let i=0;i<6;i++){
      state.sparkles.push({ x: E.W*(0.3+Math.random()*0.4), y: E.H*(0.35+Math.random()*0.4), got:false, ph:Math.random()*6 });
    }
    state.cat = { x:E.W*0.4, y:E.H*0.55, vx:0, vy:0, timer:0, say:0 };
    state.yodomi = { x:E.W*0.5, y:E.H*0.20, r:26, active:true, glow:1 };
    document.getElementById('battleHud').style.display = 'none';
    document.getElementById('battleBtns').style.display = 'none';
    document.getElementById('foot').innerHTML = 'WASD 移動 ／ ヨドミに近づくと戦闘開始';
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
  }

  function drawShop(b){
    const w=b.w, h=b.h;
    ctx.save(); ctx.translate(b.x, b.y);
    ctx.imageSmoothingEnabled = false;

    ctx.fillStyle = b.wall; ctx.fillRect(-w/2,-h,w,h);
    ctx.fillStyle = 'rgba(0,0,0,.16)';
    for (let yy=-h+14; yy<-6; yy+=9) ctx.fillRect(-w/2,yy,w,2);
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(w/2-6,-h,6,h);

    const roofH = 16;
    ctx.fillStyle = b.roof; ctx.fillRect(-w/2-4,-h-roofH,w+8,roofH);
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(-w/2-4,-h-4,w+8,4);
    ctx.fillStyle = b.roofDark;
    for (let xx=-w/2-4; xx<w/2+4; xx+=10) ctx.fillRect(xx,-h-roofH,5,roofH);

    const winY = -h+14;
    [-w/2+16, w/2-16-14].forEach(wx => {
      ctx.fillStyle = '#241f3a'; ctx.fillRect(wx-2,winY-2,18,18);
      ctx.fillStyle = '#ffce8a'; ctx.fillRect(wx,winY,14,14);
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(wx+6,winY,2,14); ctx.fillRect(wx,winY+6,14,2);
    });

    ctx.fillStyle = '#1a1420'; ctx.fillRect(-11,-30,22,30);
    ctx.fillStyle = b.shop.bg; ctx.fillRect(-11,-30,22,10);

    const signW = w-16, signX = -signW/2, signY = -h+2;
    ctx.fillStyle = b.shop.bg; ctx.fillRect(signX,signY,signW,20);
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    for (let i=0;i<Math.floor(signW/12);i++){
      ctx.beginPath(); ctx.moveTo(signX+i*12,signY+20); ctx.lineTo(signX+i*12+6,signY+25); ctx.lineTo(signX+i*12+12,signY+20); ctx.fill();
    }
    ctx.fillStyle = '#f4e6c8'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(b.shop.name, 0, signY+14);

    const lx = w/2+6, ly = -h+18;
    ctx.strokeStyle = '#5a4a30'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(lx,-h-4); ctx.lineTo(lx,ly-8); ctx.stroke();
    ctx.fillStyle = '#ff9d4d'; ctx.beginPath(); ctx.ellipse(lx,ly,7,9,0,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.moveTo(lx,ly-9); ctx.lineTo(lx,ly+9); ctx.stroke();

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
  function drawDust(){
    state.dust.forEach(d => { d.life--;
      ctx.save(); ctx.globalAlpha = Math.max(0, d.life/16*0.35);
      ctx.fillStyle = '#9aa7c7'; ctx.beginPath(); ctx.arc(d.x,d.y,3,0,Math.PI*2); ctx.fill(); ctx.restore();
    });
    state.dust = state.dust.filter(d => d.life>0);
  }
  function drawPlayerSprite(){
    E.shadow(P.x, P.y);
    E.drawPerson(P.x, P.y, P.dir, {body:'#2a2540',face:'#d8b98a',hair:'#1a1730'});
  }
  function drawAllySprite(ally){
    E.shadow(ally.ex, ally.ey);
    E.drawPerson(ally.ex, ally.ey, ally.edir||{x:0,y:1},
      {body:'#245a52',face:'#c8b98a',hair:'#123330',label:'#7fd1c1'}, ally.name);
  }

  function draw(){
    E.drawGround();
    ctx.save(); ctx.globalAlpha = .35+.15*Math.sin(St.t*0.05);
    ctx.strokeStyle = '#e8c86a'; ctx.lineWidth = 2; ctx.setLineDash([4,8]);
    ctx.beginPath(); ctx.moveTo(E.W/2, E.horizon()); ctx.lineTo(E.W/2, E.H); ctx.stroke();
    ctx.setLineDash([]); ctx.restore();

    state.buildings.forEach(drawShop);
    state.sparkles.forEach(drawSparkle);
    drawYodomi();

    const ally = Hazama.Battle.ally;
    const list = [{y:P.y, fn:drawPlayerSprite}, {y:state.cat.y, fn:drawCat}];
    if (ally) list.push({y:ally.ey, fn:()=>drawAllySprite(ally)});
    E.drawYSorted(list);
    drawDust();
  }

  return { init, update, draw, bindShared, state };
})();
