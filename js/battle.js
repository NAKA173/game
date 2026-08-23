/*
 * battle.js
 * Yソート2Dバトル。際シフト・干渉・定着のコアループ＋際弾・なごり水・仲間連携。
 * 遠近圧縮は使わない（Hazama.Engineの等倍描画に準拠）。
 */
window.Hazama = window.Hazama || {};

Hazama.Battle = (function(){
  const E = Hazama.Engine;
  const D = Hazama.Data;
  const Inv = Hazama.Inventory;
  const B = D.balance;
  const ctx = E.ctx;

  let P, St; // main.js から共有される主人公・全体状態への参照
  // あわいものパーティ：前衛3体（バトル・街の両方に付いてきて戦う）＋控え3体（バトルには出ない待機枠）。
  const party = { front: [], reserve: [] };
  let allySeq = 0;
  let foe = null, proj = null, explosions = [];

  function bindShared(sharedP, sharedSt){
    P = sharedP; St = sharedSt;
  }

  function makeFoe(kind){
    const base = D.foes[kind];
    return Object.assign({}, base, {
      kind, x: 0, y: 0, state:'normal', vx:0, vy:0, tele:0, weak:0, wob:0, fleeT:0, lungeT:0,
    });
  }

  // 操作キャラクター（story_bible_v1.md §2.2）ごとの倍率。未選択・不明キャラは等倍で安全側に倒す。
  function charMod(key){
    const c = D.characters && P && D.characters[P.charId];
    return (c && c.mods && c.mods[key]) || 1;
  }

  // あわいもののドット絵プロップ。data.js の foes[kind].sprite で選ぶ（foeCat/foeSeal）。
  E.defprop('foeCat', 20, 16, (g, rng) => {
    const body = '#3d3560', bodyLit = E.shade(body,1.3), bodyLo = E.shade(body,0.75);
    E.rc(g,2,5,16,10,body); E.rc(g,2,5,16,2,bodyLit); E.rc(g,2,13,16,2,bodyLo);
    E.rc(g,3,0,4,6,body); E.rc(g,13,0,4,6,body);
    E.rc(g,4,1,2,3,bodyLit); E.rc(g,14,1,2,3,bodyLit);
    E.rc(g,6,8,3,2,'#e8c86a'); E.rc(g,12,8,3,2,'#e8c86a');
    E.speck(g, rng, 2,5,16,10, bodyLo, 6);
  });
  E.defprop('foeSeal', 24, 18, (g, rng) => {
    const body = '#3d3560', bodyLit = E.shade(body,1.3), bodyLo = E.shade(body,0.75);
    E.rc(g,1,6,22,11,body); E.rc(g,1,6,22,2,bodyLit); E.rc(g,1,15,22,2,bodyLo);
    E.rc(g,16,1,7,7,body); E.rc(g,17,2,4,3,bodyLit);
    E.rc(g,9,10,3,2,'#e8c86a'); E.rc(g,14,10,3,2,'#e8c86a');
    E.speck(g, rng, 1,6,22,11, bodyLo, 7);
  });
  const FOE_DIMS = { foeCat:{w:20,h:16,scale:3.4}, foeSeal:{w:24,h:18,scale:3.2} };

  function start(kind){
    foe = makeFoe(kind || 'yodomineko');
    foe.x = E.W * 0.68; foe.y = E.H * 0.40;
    P.x = E.W * 0.30; P.y = E.H * 0.62;
    P.atkCD=0; P.skillCD=0; P.shiftCD=0; P.iFrames=0; P.inSeam=false;
    proj = null; explosions = [];
    // 前衛メンバーを画面内・主人公の近くへ並べ直す（街での追従座標のまま持ち込まれるとバトル画面外に出るため）。
    party.front.forEach((a,i) => { a.ex = P.x - 60 - i*36; a.ey = P.y + 10 + i*14; a.atkCD = 20+i*10; });
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
    for (let i=0;i<3;i++){
      const a = party.front[i];
      const meter = document.getElementById('allyMeter'+i);
      if (!meter) continue;
      if (a){
        meter.style.display = 'block';
        document.getElementById('allyBar'+i).style.width = Math.max(0,a.hp)/a.maxhp*100 + '%';
        document.getElementById('allyLab'+i).textContent = a.name + ' HP';
      } else {
        meter.style.display = 'none';
      }
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
      dmg = Math.round(dmg * Inv.equipMod().atkMult);
      foe.hp -= dmg; St.kiwa = Math.min(100, St.kiwa + B.kiwaRegenPerAttack*charMod('kiwaRegenMult'));
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

  // 手持ちの回復薬から一番効果の高いものを自動選択して使う（バトル中はリアルタイム操作のため、
  // 一覧から選ぶメニューは置かず、Iキー1つで賄えるようにする簡易実装）。
  const HEAL_PRIORITY = ['sakamodorimizu','yosuganoshizuku','yorimizu','nagorimizu_ge'];
  function useItem(){
    if (P.hp >= P.maxhp){ E.banner('満タン','回復薬は 不要',600); return; }
    const id = HEAL_PRIORITY.find(pid => Inv.has(pid));
    if (!id){ E.banner('薬がない','回復できる薬を 持っていない',700); return; }
    const res = Inv.useItem(id, P, St);
    E.banner(D.itemInfo(id).name, res.msg, 700); updateBars();
  }

  function shift(){
    if (P.shiftCD > 0) return;
    if (St.kiwa < B.shiftCost){ E.banner('際力不足','際シフトには際力'+B.shiftCost+'以上',700); return; }
    St.kiwa -= B.shiftCost; P.shiftCD = Math.round(B.shiftCooldown*charMod('shiftCooldownMult'));
    P.iFrames = B.iFrames + Inv.equipMod().shiftFrameBonus; P.inSeam = true;
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
    if (party.front.length + party.reserve.length >= 6){
      E.banner('満員','これ以上 あわいものは 連れて歩けない',900); return;
    }
    const base = B.anchorBaseChance + St.kiwa*B.anchorKiwaFactor + (foe.wob/300)*B.anchorWobbleFactor;
    if (Math.random() < base){
      const newAlly = { id:'ally'+(++allySeq), ex:foe.x, ey:foe.y, edir:{x:-1,y:0},
        hp:80, maxhp:80, name:foe.name, atkCD:0, sprite:foe.sprite||'foeCat' };
      if (party.front.length < 3) party.front.push(newAlly); else party.reserve.push(newAlly);
      foe = null;
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
            const dmg = Math.round((8+Math.random()*5|0) * (1-Inv.equipMod().dmgReduction)); P.hp-=dmg; flash('#d0596b');
            const dx=P.x-foe.x, dy=P.y-foe.y, m=Math.hypot(dx,dy)||1; P.x+=dx/m*10; P.y+=dy/m*10;
            E.banner('被弾','−'+dmg,500); foe.lungeT=0;
            if (P.hp<=0 && onLose) onLose();
          }
        }
      }
      foeAI();
    }
    if (foe && foe.state!=='wobble'){
      party.front.forEach(a => {
        const dx=foe.x-a.ex, dy=foe.y-a.ey, d=Math.hypot(dx,dy)||1;
        a.edir = {x:dx/d,y:dy/d};
        if (d>44){ a.ex+=dx/d*2.0; a.ey+=dy/d*2.0; }
        else { a.atkCD--; if (a.atkCD<=0){ a.atkCD=55; foe.hp-=6+Math.random()*3|0; checkWobble(); updateBars(); } }
      });
    }
    if (proj){
      proj.x+=proj.dx; proj.y+=proj.dy; proj.life--;
      let hit=false;
      if (foe && Math.hypot(foe.x-proj.x, foe.y-proj.y) < foe.r+8) hit=true;
      if (proj.life<=0 || proj.x<0||proj.x>E.W||proj.y<0||proj.y>E.H) hit=true;
      if (hit){ explode(proj.x, proj.y); proj=null; }
    }
    explosions.forEach(e=>e.life--); explosions = explosions.filter(e=>e.life>0);
    if (St.t % B.kiwaRegenIdleInterval === 0) St.kiwa = Math.min(100, St.kiwa+1*charMod('kiwaRegenMult'));
  }

  let flashCol=null, flashT=0;
  function flash(c){ flashCol=c; flashT=10; }

  function drawFoeSprite(f){
    const wob = f.state==='wobble'; const bob = Math.sin(St.t*0.06)*2;
    const dim = FOE_DIMS[f.sprite] || FOE_DIMS.foeCat;
    E.shadow(f.x, f.y);
    ctx.save();
    if (wob) ctx.globalAlpha = 0.45+0.4*Math.abs(Math.sin(St.t*0.3));
    if (f.tele>0){ ctx.shadowColor='#d0596b'; ctx.shadowBlur=14; }
    E.drawSprite(f.sprite || 'foeCat', f.kind, f.x, f.y+bob*0.4, dim.scale);
    ctx.shadowBlur=0;
    if (f.weak>0){
      ctx.strokeStyle='#d0596b'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.arc(f.x,f.y-dim.h*dim.scale*0.5,dim.h*dim.scale*0.55+Math.sin(St.t*0.3)*2,0,Math.PI*2); ctx.stroke();
      ctx.fillStyle='#d0596b'; ctx.font='10px monospace'; ctx.textAlign='center'; ctx.fillText('弱点',f.x,f.y-dim.h*dim.scale-14);
    }
    if (f.tele>0){ ctx.fillStyle='#d0596b'; ctx.font='12px monospace'; ctx.textAlign='center'; ctx.fillText('▼',f.x,f.y-dim.h*dim.scale-18); }
    ctx.restore();
    ctx.fillStyle='#9aa7c7'; ctx.font='9px monospace'; ctx.textAlign='center'; ctx.fillText(f.name, f.x, f.y-dim.h*dim.scale-4);
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
    const pal = (D.characters[P.charId] && D.characters[P.charId].palette) || D.characters.saku.palette;
    E.drawSprite('person', 'player-'+P.charId, P.x, P.y, 4, pal);
    ctx.restore();
  }
  function drawAllySprite(a){
    E.shadow(a.ex, a.ey);
    E.drawSprite('person', 'ally-'+a.id, a.ex, a.ey, 4, {body:'#245a52',face:'#c8b98a',hair:'#123330'});
    ctx.fillStyle = '#7fd1c1'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
    ctx.fillText(a.name, a.ex, a.ey-86);
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
    party.front.forEach(a => list.push({y:a.ey, fn:()=>drawAllySprite(a)}));
    if (foe) list.push({y:foe.y, fn:()=>drawFoeSprite(foe)});
    E.drawYSorted(list);
    drawProj(); drawExplosions();
    if (flashT>0){ ctx.fillStyle=flashCol; ctx.globalAlpha=flashT/10*0.22; ctx.fillRect(0,0,E.W,E.H); ctx.globalAlpha=1; flashT--; }
  }

  return { start, update, draw, attack, skill, useItem, shift, anchor,
    get foe(){ return foe; }, party,
    bindShared };
})();
