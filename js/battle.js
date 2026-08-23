/*
 * battle.js
 * Yソート2Dバトル。際シフト・干渉・定着のコアループ＋際弾・なごり水・仲間連携。
 * 遠近圧縮は使わない（Hazama.Engineの等倍描画に準拠）。
 */
window.Hazama = window.Hazama || {};

Hazama.Battle = (function(){
  const E = Hazama.Engine;
  const D = Hazama.Data;
  const B = D.balance;
  const ctx = E.ctx;

  let P, St; // main.js から共有される主人公・全体状態への参照
  let ally = null;
  let foe = null, proj = null, explosions = [];

  function bindShared(sharedP, sharedSt){
    P = sharedP; St = sharedSt;
  }

  function makeFoe(kind){
    const base = D.foes[kind];
    return Object.assign({}, base, {
      x: 0, y: 0, state:'normal', vx:0, vy:0, tele:0, weak:0, wob:0, fleeT:0, lungeT:0,
    });
  }

  function start(kind){
    foe = makeFoe(kind || 'yodomineko');
    foe.x = E.W * 0.68; foe.y = E.H * 0.40;
    P.x = E.W * 0.30; P.y = E.H * 0.62;
    P.atkCD=0; P.skillCD=0; P.shiftCD=0; P.iFrames=0; P.inSeam=false;
    proj = null; explosions = [];
    document.getElementById('battleHud').style.display = 'flex';
    document.getElementById('battleBtns').style.display = 'grid';
    document.getElementById('foot').innerHTML = 'J こうげき ／ U 際弾 ／ K 際シフト ／ I なごり水 ／ L 定着';
    E.banner('際、ひらく', foe.name + ' が あらわれた', 1200);
    updateBars();
  }

  function updateBars(){
    document.getElementById('phpBar').style.width = Math.max(0,P.hp)/P.maxhp*100 + '%';
    document.getElementById('kwBar').style.width = St.kiwa + '%';
    document.getElementById('fhpBar').style.width = (foe ? Math.max(0,foe.hp)/foe.maxhp*100 : 0) + '%';
    document.getElementById('foeLab').textContent = foe
      ? (foe.state==='wobble' ? 'あわいもの ＜揺らぎ＞' : 'あわいもの HP') : '（討伐済）';
    if (ally){
      document.getElementById('allyMeter').style.display = 'block';
      document.getElementById('allyBar').style.width = Math.max(0,ally.hp)/ally.maxhp*100 + '%';
      document.getElementById('allyLab').textContent = ally.name + ' HP';
    }
  }

  function attack(){
    if (P.atkCD > 0 || P.inSeam) return;
    P.atkCD = 22; P.atkAnim = 10;
    const hx = P.x + P.dir.x*22, hy = P.y + P.dir.y*22;
    if (foe && Math.hypot(foe.x-hx, foe.y-hy) < foe.r+16 && foe.state !== 'wobble'){
      let dmg = B.attackDamageMin + Math.random()*(B.attackDamageMax-B.attackDamageMin) | 0;
      if (foe.weak > 0){ dmg = Math.round(dmg*B.critMultiplier); foe.weak = 0;
        flash('#e8c86a'); E.banner('会心','弱点を突いた',600); }
      foe.hp -= dmg; St.kiwa = Math.min(100, St.kiwa + B.kiwaRegenPerAttack);
      foe.x += P.dir.x*4; foe.y += P.dir.y*4;
      checkWobble(); updateBars();
    }
  }

  function skill(){
    if (P.skillCD > 0 || proj) return;
    if (St.kiwa < B.skillCost){ E.banner('際力不足','際弾には際力'+B.skillCost+'以上',700); return; }
    St.kiwa -= B.skillCost; P.skillCD = B.skillCooldown;
    proj = { x:P.x, y:P.y, dx:P.dir.x*6, dy:P.dir.y*6, life:60 };
    E.banner('際弾','放つ',500); updateBars();
  }

  function explode(x, y){
    explosions.push({ x, y, life:16 });
    if (foe && foe.state !== 'wobble'){
      const d = Math.hypot(foe.x-x, foe.y-y);
      if (d < B.skillRadius + foe.r){
        let dmg = B.skillDamageMin + Math.random()*(B.skillDamageMax-B.skillDamageMin) | 0;
        if (foe.weak > 0){ dmg = Math.round(dmg*B.skillCritMultiplier); foe.weak = 0; }
        foe.hp -= dmg; checkWobble();
      }
    }
    updateBars();
  }

  function useItem(){
    if (P.items <= 0) return;
    if (P.hp >= P.maxhp){ E.banner('満タン','なごり水は不要',600); return; }
    P.items--; P.hp = Math.min(P.maxhp, P.hp + D.items.nagorimizu.value);
    E.banner('なごり水','HPが 回復した',700); updateBars();
  }

  function shift(){
    if (P.shiftCD > 0) return;
    if (St.kiwa < B.shiftCost){ E.banner('際力不足','際シフトには際力'+B.shiftCost+'以上',700); return; }
    St.kiwa -= B.shiftCost; P.shiftCD = B.shiftCooldown; P.iFrames = B.iFrames; P.inSeam = true;
    let dx = (E.keys.right?1:0)-(E.keys.left?1:0), dy = (E.keys.down?1:0)-(E.keys.up?1:0);
    if (dx===0 && dy===0){ dx = P.dir.x; dy = P.dir.y; }
    const m = Math.hypot(dx,dy)||1; dx/=m; dy/=m;
    P.dashX = dx*7; P.dashY = dy*7; P.dashT = 10;
    if (foe && foe.tele > 0 && foe.tele < 26){
      St.slowmo = 0.25; P.slow = 44; foe.weak = 140;
      E.banner('ジャスト際シフト','時が緩む ─ 弱点 看破',1100); flash('#9aa7c7');
    }
    updateBars();
  }

  function anchor(onCaptured){
    if (!foe || foe.state !== 'wobble') { E.banner('まだ','HPを削り 揺らがせてから',800); return; }
    const d = Math.hypot(foe.x-P.x, foe.y-P.y);
    if (d > P.r + foe.r + 10){ E.banner('遠い','揺らぎの相手に 密着して',800); return; }
    const base = B.anchorBaseChance + St.kiwa*B.anchorKiwaFactor + (foe.wob/300)*B.anchorWobbleFactor;
    if (Math.random() < base){
      const newAlly = { ex:foe.x, ey:foe.y, edir:{x:-1,y:0}, hp:80, maxhp:80, name:foe.name, atkCD:0 };
      ally = newAlly; foe = null;
      E.banner('定着 成功', newAlly.name + ' が 仲間になった', 1800);
      if (onCaptured) onCaptured(newAlly);
    } else {
      E.banner('すり抜けた', foe.name + ' が 際へ 逃げ戻る', 900);
      foe.state='normal'; foe.wob=0; foe.hp = Math.min(foe.maxhp, foe.hp+12); updateBars();
    }
  }

  function checkWobble(){
    if (foe && foe.state==='normal' && foe.hp <= foe.maxhp*foe.wobbleThreshold && foe.hp > 0){
      foe.state='wobble'; foe.wob=300; foe.fleeT=0;
      E.banner('揺らぎ状態','追いつめて [定着] せよ',1200);
    }
  }

  function foeAI(){
    if (!foe) return;
    if (foe.state === 'wobble'){
      foe.wob--; foe.fleeT--;
      if (foe.fleeT <= 0){ foe.fleeT = 30+Math.random()*30|0;
        const ax=foe.x-P.x, ay=foe.y-P.y, m=Math.hypot(ax,ay)||1;
        foe.vx = (ax/m)*2.1 + (Math.random()-0.5)*1.4;
        foe.vy = (ay/m)*2.1 + (Math.random()-0.5)*1.4; }
      foe.x+=foe.vx; foe.y+=foe.vy; foe.vx*=0.9; foe.vy*=0.9; clampFoe();
      if (foe.wob <= 0){ foe.state='normal'; E.banner('定着 失敗','輪郭が 定まってしまった',900); updateBars(); }
      return;
    }
    const dx=P.x-foe.x, dy=P.y-foe.y, d=Math.hypot(dx,dy)||1;
    if (foe.tele > 0){ foe.tele--; if (foe.tele===0) foeAttack(); }
    else {
      foe.atkCD--;
      if (d>60){ foe.x+=dx/d*1.1; foe.y+=dy/d*1.1; } else if (d<40){ foe.x-=dx/d*0.8; foe.y-=dy/d*0.8; }
      if (foe.atkCD<=0 && d<130){ foe.tele=40; foe.atkCD=(140+Math.random()*70|0)/foe.atkSpd; }
    }
    clampFoe();
  }
  function foeAttack(){
    const dx=P.x-foe.x, dy=P.y-foe.y, d=Math.hypot(dx,dy)||1;
    foe.vx=dx/d*5; foe.vy=dy/d*5; foe.lungeT=10;
  }
  function clampFoe(){
    foe.x = Math.max(foe.r, Math.min(E.W-foe.r, foe.x));
    foe.y = Math.max(foe.r+40, Math.min(E.H-20, foe.y));
  }

  function update(onLose){
    if (!P.inSeam){
      const {dx,dy,m} = E.readAxis();
      if (m>0){ P.dir.x=dx/m; P.dir.y=dy/m; P.x+=dx/m*B.playerSpd; P.y+=dy/m*B.playerSpd; }
    }
    if (P.dashT>0){ P.x+=P.dashX; P.y+=P.dashY; P.dashT--; }
    P.x = Math.max(P.r, Math.min(E.W-P.r, P.x)); P.y = Math.max(P.r+40, Math.min(E.H-20, P.y));
    if (P.atkCD>0)P.atkCD--; if (P.atkAnim>0)P.atkAnim--;
    if (P.skillCD>0)P.skillCD--; if (P.shiftCD>0)P.shiftCD--;
    if (P.iFrames>0){ P.iFrames--; if (P.iFrames===0)P.inSeam=false; }
    if (P.slow>0){ P.slow--; if (P.slow===0)St.slowmo=1; }

    if (foe){
      if (foe.weak>0) foe.weak--;
      if (foe.lungeT>0){
        foe.x+=foe.vx; foe.y+=foe.vy; foe.lungeT--; clampFoe();
        if (Math.hypot(foe.x-P.x, foe.y-P.y) < P.r+foe.r){
          if (P.iFrames>0){} else {
            const dmg = 8+Math.random()*5|0; P.hp-=dmg; flash('#d0596b');
            const dx=P.x-foe.x, dy=P.y-foe.y, m=Math.hypot(dx,dy)||1; P.x+=dx/m*10; P.y+=dy/m*10;
            E.banner('被弾','−'+dmg,500); foe.lungeT=0;
            if (P.hp<=0 && onLose) onLose();
          }
        }
      }
      foeAI();
    }
    if (ally && foe && foe.state!=='wobble'){
      const dx=foe.x-ally.ex, dy=foe.y-ally.ey, d=Math.hypot(dx,dy)||1;
      ally.edir = {x:dx/d,y:dy/d};
      if (d>44){ ally.ex+=dx/d*2.0; ally.ey+=dy/d*2.0; }
      else { ally.atkCD--; if (ally.atkCD<=0){ ally.atkCD=55; foe.hp-=6+Math.random()*3|0; checkWobble(); updateBars(); } }
    }
    if (proj){
      proj.x+=proj.dx; proj.y+=proj.dy; proj.life--;
      let hit=false;
      if (foe && Math.hypot(foe.x-proj.x, foe.y-proj.y) < foe.r+8) hit=true;
      if (proj.life<=0 || proj.x<0||proj.x>E.W||proj.y<0||proj.y>E.H) hit=true;
      if (hit){ explode(proj.x, proj.y); proj=null; }
    }
    explosions.forEach(e=>e.life--); explosions = explosions.filter(e=>e.life>0);
    if (St.t % B.kiwaRegenIdleInterval === 0) St.kiwa = Math.min(100, St.kiwa+1);
  }

  let flashCol=null, flashT=0;
  function flash(c){ flashCol=c; flashT=10; }

  function drawFoeSprite(f){
    const wob = f.state==='wobble'; const bob = Math.sin(St.t*0.06)*2;
    E.shadow(f.x, f.y);
    ctx.save();
    if (wob) ctx.globalAlpha = 0.45+0.4*Math.abs(Math.sin(St.t*0.3));
    if (f.tele>0){ ctx.shadowColor='#d0596b'; ctx.shadowBlur=14; }
    ctx.translate(f.x, f.y-14+bob*0.4);
    ctx.fillStyle = wob ? '#9aa7c7' : '#3d3560';
    ctx.beginPath(); ctx.ellipse(0,0,20,16,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-11,-8); ctx.lineTo(-17,-22); ctx.lineTo(-4,-12); ctx.fill();
    ctx.beginPath(); ctx.moveTo(11,-8); ctx.lineTo(17,-22); ctx.lineTo(4,-12); ctx.fill();
    ctx.shadowBlur=0;
    ctx.fillStyle = f.weak>0 ? '#d0596b' : '#e8c86a';
    ctx.fillRect(-8,-2,4,3); ctx.fillRect(4,-2,4,3);
    if (f.weak>0){
      ctx.strokeStyle='#d0596b'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.arc(0,0,22+Math.sin(St.t*0.3)*2,0,Math.PI*2); ctx.stroke();
      ctx.fillStyle='#d0596b'; ctx.font='10px monospace'; ctx.textAlign='center'; ctx.fillText('弱点',0,-30);
    }
    if (f.tele>0){ ctx.fillStyle='#d0596b'; ctx.font='12px monospace'; ctx.textAlign='center'; ctx.fillText('▼',0,-34); }
    ctx.restore();
    ctx.fillStyle='#9aa7c7'; ctx.font='9px monospace'; ctx.textAlign='center'; ctx.fillText(f.name, f.x, f.y-40);
  }
  function drawProj(){
    if (!proj) return;
    ctx.save(); ctx.fillStyle='#e8c86a'; ctx.shadowColor='#e8c86a'; ctx.shadowBlur=12;
    ctx.beginPath(); ctx.arc(proj.x, proj.y, 6, 0, Math.PI*2); ctx.fill(); ctx.restore();
  }
  function drawExplosions(){
    explosions.forEach(e => {
      const p = 1-e.life/16;
      ctx.save(); ctx.globalAlpha=1-p; ctx.strokeStyle='#e8c86a'; ctx.lineWidth=3;
      ctx.beginPath(); ctx.arc(e.x,e.y,10+p*46,0,Math.PI*2); ctx.stroke(); ctx.restore();
    });
  }
  function drawPlayerSprite(){
    E.shadow(P.x, P.y);
    ctx.save(); if (P.inSeam) ctx.globalAlpha = 0.55;
    if (P.atkAnim>0){
      ctx.fillStyle = 'rgba(232,200,106,'+(P.atkAnim/10*0.4)+')';
      ctx.beginPath(); ctx.arc(P.x+P.dir.x*24, P.y+P.dir.y*24-8, 17, 0, Math.PI*2); ctx.fill();
    }
    E.drawPerson(P.x, P.y, P.dir, {body:'#2a2540',face:'#d8b98a',hair:'#1a1730'});
    ctx.restore();
  }
  function drawAllySprite(){
    if (!ally) return;
    E.shadow(ally.ex, ally.ey);
    E.drawPerson(ally.ex, ally.ey, ally.edir||{x:0,y:1},
      {body:'#245a52',face:'#c8b98a',hair:'#123330',label:'#7fd1c1'}, ally.name);
  }

  function draw(){
    E.drawGround();
    const gy0 = E.horizon();
    const sxTop = E.W*0.52, sxBot = E.W*0.48 + Math.sin(St.t*0.02)*3;
    ctx.save(); ctx.globalAlpha = .5+.2*Math.sin(St.t*0.08);
    const grad = ctx.createLinearGradient(0,gy0,0,E.H);
    grad.addColorStop(0,'rgba(232,200,106,.15)'); grad.addColorStop(1,'rgba(232,200,106,.55)');
    ctx.fillStyle = grad; ctx.beginPath();
    ctx.moveTo(sxTop-3,gy0); ctx.lineTo(sxTop+3,gy0); ctx.lineTo(sxBot+14,E.H); ctx.lineTo(sxBot-14,E.H);
    ctx.closePath(); ctx.fill(); ctx.restore();

    const list = [{y:P.y, fn:drawPlayerSprite}];
    if (ally) list.push({y:ally.ey, fn:drawAllySprite});
    if (foe) list.push({y:foe.y, fn:()=>drawFoeSprite(foe)});
    E.drawYSorted(list);
    drawProj(); drawExplosions();
    if (flashT>0){ ctx.fillStyle=flashCol; ctx.globalAlpha=flashT/10*0.22; ctx.fillRect(0,0,E.W,E.H); ctx.globalAlpha=1; flashT--; }
  }

  return { start, update, draw, attack, skill, useItem, shift, anchor,
    get foe(){ return foe; }, get ally(){ return ally; }, set ally(v){ ally=v; },
    bindShared };
})();
