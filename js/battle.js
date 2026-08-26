/*
 * battle.js
 * リアルタイム鎮静バトル（統一3/4視点、探索と同じ E.project() を使う）。
 * 「倒す」のではなく、HPを削って揺らぎ状態にし、鎮静技で収める。第1章は
 * 空1人・鐘江(暴走状態)1体のみの一騎打ちで、鎮静に成功すると物語として確定で仲間になる
 * （旧作にあったような捕獲成功率のRNGは無い＝ここは筋書き上のスカウトなので必ず成功する）。
 */
window.Hazama = window.Hazama || {};

Hazama.Battle = (function(){
  const E = Hazama.Engine;
  const D = Hazama.Data;
  const B = D.balance;
  const ctx = E.ctx;
  const persp = Object.assign({}, E.DEFAULT_PERSPECTIVE, { horizon:0.24, depthMax:280, scaleNear:1.7, scaleFar:0.6 });
  const ARENA = { halfWidth: 130, depthMax: 240 };

  let P, St;
  let pos, pDir, foe, proj, explosions;

  function bindShared(sharedP, sharedSt){ P = sharedP; St = sharedSt; }

  function start(encounterCfg){
    const foeDef = D.foes[encounterCfg.foe];
    foe = Object.assign({}, foeDef, {
      kind: encounterCfg.foe, laneX: 0, depth: 200, state:'normal', wob:0, atkCD: 90, tele:0, vx:0, vy:0, lungeT:0,
    });
    pos = { laneX: 0, depth: 40 }; pDir = 'back';
    P.hp = P.maxhp; P.atkCD = 0; P.iFrames = 0;
    proj = null; explosions = [];
    document.getElementById('battleHud').style.display = 'flex';
    document.getElementById('battleBtns').style.display = 'grid';
    document.getElementById('foot').innerHTML = 'J こうげき ／ 揺らいだら K で鎮静';
    E.banner('際、ひらく', foe.name + ' が あらわれた', 1200);
    updateBars();
  }

  function updateBars(){
    document.getElementById('phpBar').style.width = Math.max(0,P.hp)/P.maxhp*100 + '%';
    document.getElementById('fhpBar').style.width = (foe ? Math.max(0,foe.hp)/foe.maxhp*100 : 0) + '%';
    document.getElementById('foeLab').textContent = foe
      ? (foe.state==='wobble' ? (foe.name+' ＜揺らぎ＞') : foe.name+' HP') : '（鎮静済）';
  }

  function dist2(ax,ad,bx,bd){ return Math.hypot(ax-bx, ad-bd); }

  function attack(){
    if (P.atkCD > 0) return;
    P.atkCD = 20; P.atkAnim = 10;
    if (!foe || foe.state === 'wobble') return;
    const dirVec = { back:[0,1], front:[0,-1], left:[-1,0], right:[1,0] }[pDir] || [0,1];
    const hx = pos.laneX + dirVec[0]*22, hd = pos.depth + dirVec[1]*22;
    if (dist2(hx,hd, foe.laneX, foe.depth) < foe.r+18){
      let dmg = B.attackDamageMin + Math.random()*(B.attackDamageMax-B.attackDamageMin) | 0;
      foe.hp -= dmg;
      foe.laneX += dirVec[0]*3; foe.depth += dirVec[1]*3;
      checkWobble(); updateBars();
    }
  }

  function pacify(onPacified){
    if (!foe || foe.state !== 'wobble'){ E.banner('まだ','HPを削り 揺らがせてから',700); return; }
    if (dist2(pos.laneX,pos.depth, foe.laneX,foe.depth) > B.pacifyRange){
      E.banner('遠い','揺らぎの相手に 近づいて',700); return;
    }
    E.banner('鎮静 成功', foe.name + 'が 静かになっていく', 1600);
    const kind = foe.kind; foe = null; updateBars();
    if (onPacified) onPacified(kind);
  }

  function checkWobble(){
    // 閾値をまたいだ一撃でHPが0以下まで飛んでも、揺らぎには必ず入る（そのまま鎮静できず
    // 詰むのを防ぐため、揺らぎ中は最低1は残す）。
    if (foe && foe.state==='normal' && foe.hp <= foe.maxhp*foe.wobbleThreshold){
      foe.hp = Math.max(1, foe.hp);
      foe.state = 'wobble'; foe.wob = B.pacifyGaugeMax;
      E.banner('揺らぎ状態', '追いつめて 鎮静せよ（K）', 1200);
    }
  }

  function foeAI(){
    if (!foe) return;
    if (foe.state === 'wobble'){
      foe.wob--;
      const ax = foe.laneX-pos.laneX, ad = foe.depth-pos.depth, m = Math.hypot(ax,ad)||1;
      if (foe.wob % 24 === 0){ foe.vx = ax/m*1.6+(Math.random()-0.5)*1.2; foe.vy = ad/m*1.6+(Math.random()-0.5)*1.2; }
      foe.laneX += foe.vx*0.4; foe.depth += foe.vy*0.4; foe.vx*=0.92; foe.vy*=0.92; clampFoe();
      if (foe.wob <= 0){ foe.state='normal'; foe.hp = Math.min(foe.maxhp, foe.hp + foe.maxhp*0.08);
        E.banner('揺らぎが 治まった', '鐘の音が また激しくなる', 1000); updateBars(); }
      return;
    }
    const dx = pos.laneX-foe.laneX, dd = pos.depth-foe.depth, m = Math.hypot(dx,dd)||1;
    if (foe.tele > 0){ foe.tele--; if (foe.tele===0) foeAttack(); }
    else {
      foe.atkCD--;
      if (m>70){ foe.laneX+=dx/m*1.1; foe.depth+=dd/m*1.1; } else if (m<48){ foe.laneX-=dx/m*0.7; foe.depth-=dd/m*0.7; }
      if (foe.atkCD<=0 && m<140){ foe.tele=38; foe.atkCD=(130+Math.random()*60|0)/foe.atkSpd; }
    }
    clampFoe();
  }
  function foeAttack(){
    const dx = pos.laneX-foe.laneX, dd = pos.depth-foe.depth, m = Math.hypot(dx,dd)||1;
    foe.vx = dx/m*5; foe.vy = dd/m*5; foe.lungeT = 10;
  }
  function clampFoe(){
    foe.laneX = Math.max(-ARENA.halfWidth, Math.min(ARENA.halfWidth, foe.laneX));
    foe.depth = Math.max(20, Math.min(ARENA.depthMax, foe.depth));
  }

  function update(onLose){
    const { dx, dy, m } = E.readAxis();
    if (m > 0){
      pos.laneX = Math.max(-ARENA.halfWidth, Math.min(ARENA.halfWidth, pos.laneX + dx/m*B.playerSpd));
      pos.depth = Math.max(10, Math.min(ARENA.depthMax, pos.depth - dy/m*B.playerSpd));
      if (Math.abs(dy) >= Math.abs(dx)) pDir = dy < 0 ? 'back' : 'front';
      else pDir = dx < 0 ? 'left' : 'right';
    }
    if (P.atkCD>0) P.atkCD--; if (P.atkAnim>0) P.atkAnim--;
    if (P.iFrames>0) P.iFrames--;

    if (foe){
      if (foe.lungeT > 0){
        foe.laneX += foe.vx; foe.depth += foe.vy; foe.lungeT--; clampFoe();
        if (dist2(pos.laneX,pos.depth, foe.laneX,foe.depth) < 26 && P.iFrames<=0){
          const dmg = (foe.atkMin||8)+Math.random()*((foe.atkMax||14)-(foe.atkMin||8))|0;
          P.hp -= dmg; P.iFrames = 40; flash('#d0596b');
          const dx=pos.laneX-foe.laneX, dd=pos.depth-foe.depth, m=Math.hypot(dx,dd)||1;
          pos.laneX += dx/m*10; pos.depth += dd/m*10;
          E.banner('被弾','−'+dmg,500); foe.lungeT = 0; updateBars();
          if (P.hp<=0 && onLose) onLose();
        }
      }
      foeAI();
    }
  }

  let flashCol=null, flashT=0;
  function flash(c){ flashCol=c; flashT=10; }

  function drawArenaGround(){
    ctx.fillStyle = '#1a1522'; ctx.fillRect(0, E.H*persp.horizon, E.W, E.H*(1-persp.horizon));
    const step = 30;
    for (let d=ARENA.depthMax; d>0; d-=step){
      const t = 1 - d/ARENA.depthMax;
      E.drawRoadBand(persp, ARENA.halfWidth+20, Math.max(0,d-step), d, E.shade('#241c30', 0.6+0.5*t));
    }
  }
  function foeDescriptor(){
    const p = E.project(persp, foe.laneX, foe.depth);
    return { y: p.y, fn: () => {
      const wob = foe.state==='wobble', bob = Math.sin(St.t*0.06)*2;
      ctx.save();
      if (wob) ctx.globalAlpha = 0.5+0.4*Math.abs(Math.sin(St.t*0.3));
      if (foe.tele>0){ ctx.shadowColor='#d0596b'; ctx.shadowBlur=14; }
      E.shadow(p.x, p.y, p.scale);
      E.drawSprite(foe.sprite||'foeBell', 'foe', p.x, p.y+bob*0.4*p.scale, 2.6*p.scale);
      ctx.shadowBlur = 0;
      if (foe.tele>0){ ctx.fillStyle='#d0596b'; ctx.font='12px monospace'; ctx.textAlign='center';
        ctx.fillText('▼', p.x, p.y-22*2.6*p.scale-18); }
      ctx.restore();
      ctx.fillStyle='#9aa7c7'; ctx.font='9px monospace'; ctx.textAlign='center';
      ctx.fillText(foe.name, p.x, p.y-22*2.6*p.scale-4);
    }};
  }
  function playerDescriptor(){
    const p = E.project(persp, pos.laneX, pos.depth);
    return { y: p.y, fn: () => {
      E.shadow(p.x, p.y, p.scale);
      ctx.save();
      if (P.atkAnim>0){ ctx.fillStyle='rgba(232,200,106,'+(P.atkAnim/10*0.4)+')';
        ctx.beginPath(); ctx.arc(p.x, p.y-16*p.scale, 17*p.scale, 0, Math.PI*2); ctx.fill(); }
      if (P.iFrames>0) ctx.globalAlpha = 0.6;
      const propId = pDir==='back'?'personBack':pDir==='front'?'personFront':'personSide';
      E.drawSprite(propId, 'char-sora', p.x, p.y, 2.8*p.scale, { pal: D.characters.sora.palette, flip: pDir==='right' });
      ctx.restore();
    }};
  }

  function draw(){
    E.drawSky(persp, '#211a30', '#8a4a34');
    drawArenaGround();
    const list = [playerDescriptor()];
    if (foe) list.push(foeDescriptor());
    E.drawYSorted(list);
    if (flashT>0){ ctx.fillStyle=flashCol; ctx.globalAlpha=flashT/10*0.22; ctx.fillRect(0,0,E.W,E.H); ctx.globalAlpha=1; flashT--; }
  }

  return { start, update, draw, attack, pacify, bindShared,
    get foe(){ return foe; } };
})();
