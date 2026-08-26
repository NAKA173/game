/*
 * explore.js
 * 本町の道モジュール歩き（統一3/4視点）。道は「深度(depth)を持つ直線区間の連なり」として
 * data.js の town.modules に定義し、プレイヤーは深度方向(前後)とレーンX方向(左右)に動く。
 * 深度が水平線への奥行きを兼ねるため、カメラは深度方向にだけ追従スクロールする。
 */
window.Hazama = window.Hazama || {};

Hazama.Explore = (function(){
  const E = Hazama.Engine;
  const D = Hazama.Data;
  const ctx = E.ctx;
  const persp = Object.assign({}, E.DEFAULT_PERSPECTIVE);

  let P, St, onEncounter;
  const state = {
    modules: [], moduleStarts: [], totalDepth: 0,
    cameraDepth: 0, seenBacktalk: false, encounterFired: {}, exhibitSeen:false,
    ally: null, allyDepth: 0, allyLane: 0, allyDir:'back',
  };

  function bindShared(sharedP, sharedSt, enterBattleFn){
    P = sharedP; St = sharedSt; onEncounter = enterBattleFn;
  }

  // ==== 人物プロップ：4方向（正面・背面・側面、右向きは側面の左右反転）====
  // 低頭身(約2.5頭身)。opts.pal に body/bodyLo/bodyHi/face/hair/collar を渡す。
  function personPalette(g, opts){
    const pal = opts.pal || {};
    return {
      body: pal.body||'#334', bodyLo: pal.bodyLo||E.shade(pal.body||'#334',0.72),
      bodyHi: pal.bodyHi||E.shade(pal.body||'#334',1.25),
      face: pal.face||'#e3c39a', hair: pal.hair||'#1a1a22', collar: pal.collar||null,
    };
  }
  E.defprop('personFront', 12, 22, (g, rng, opts) => {
    const c = personPalette(g, opts);
    E.rc(g,3,17,2,5,c.bodyLo); E.rc(g,7,17,2,5,c.bodyLo);
    E.rc(g,2,8,8,9,c.body); E.rc(g,2,8,1,9,c.bodyLo); E.rc(g,9,8,1,9,c.bodyHi); E.rc(g,2,8,8,1,c.bodyHi);
    if (c.collar) E.rc(g,4,8,4,2,c.collar);
    E.rc(g,1,9,1,6,c.bodyLo); E.rc(g,10,9,1,6,c.bodyLo);
    E.rc(g,3,2,6,6,c.face); E.rc(g,2,0,8,3,c.hair); E.rc(g,2,3,1,2,c.hair); E.rc(g,9,3,1,2,c.hair);
    E.px(g,4,5,E.shade(c.face,0.4)); E.px(g,7,5,E.shade(c.face,0.4));
  });
  E.defprop('personBack', 12, 22, (g, rng, opts) => {
    const c = personPalette(g, opts);
    E.rc(g,3,17,2,5,c.bodyLo); E.rc(g,7,17,2,5,c.bodyLo);
    E.rc(g,2,8,8,9,c.body); E.rc(g,2,8,1,9,c.bodyLo); E.rc(g,9,8,1,9,c.bodyHi); E.rc(g,2,8,8,1,c.bodyLo);
    E.rc(g,1,9,1,6,c.bodyLo); E.rc(g,10,9,1,6,c.bodyLo);
    E.rc(g,2,0,8,9,c.hair); E.rc(g,2,0,1,9,E.shade(c.hair,0.7)); E.rc(g,9,0,1,9,E.shade(c.hair,1.3));
  });
  E.defprop('personSide', 12, 22, (g, rng, opts) => {
    const c = personPalette(g, opts);
    E.rc(g,5,17,2,5,c.bodyLo); E.rc(g,7,18,2,4,c.bodyLo);
    E.rc(g,3,8,7,9,c.body); E.rc(g,3,8,1,9,c.bodyLo); E.rc(g,9,8,1,9,c.bodyHi);
    if (c.collar) E.rc(g,4,8,3,2,c.collar);
    E.rc(g,4,2,5,6,c.face); E.rc(g,3,0,7,3,c.hair); E.rc(g,3,3,1,2,c.hair);
    E.px(g,7,5,E.shade(c.face,0.4));
  });

  // ==== 街並みプロップ（真正面の絵のみ・情報量控えめ）====================
  E.defprop('houseFront', 26, 30, (g, rng, opts) => {
    const wall = opts.wall || '#4a4266';
    E.rc(g,1,10,24,20,wall); E.rc(g,1,10,1,20,E.shade(wall,0.75)); E.rc(g,24,10,1,20,E.shade(wall,1.2));
    E.rc(g,-1,4,28,7,E.PAL.roof); E.rc(g,-1,10,28,1,E.PAL.roofDark);
    E.rc(g,4,14,6,6,E.PAL.frame); E.rc(g,5,15,4,4,E.PAL.window);
    E.rc(g,16,14,6,6,E.PAL.frame); E.rc(g,17,15,4,4,rng.f()<0.5?E.PAL.window:E.PAL.windowDim);
    E.rc(g,10,21,6,9,E.PAL.door);
    E.speck(g, rng, 1,18,24,10, E.shade(wall,0.6), 6);
  });
  E.defprop('shopFront', 24, 26, (g, rng, opts) => {
    const wall = '#4a4266', accent = opts.accent || '#7a4e3a';
    E.rc(g,1,8,22,18,wall); E.rc(g,1,8,1,18,E.shade(wall,0.75)); E.rc(g,22,8,1,18,E.shade(wall,1.2));
    E.rc(g,-1,3,26,6,accent); E.rc(g,-1,8,26,1,E.shade(accent,0.6));
    E.rc(g,3,12,7,7,E.PAL.frame); E.rc(g,4,13,5,5,E.PAL.window);
    E.rc(g,14,12,7,7,E.PAL.frame); E.rc(g,15,13,5,5,E.PAL.windowDim);
    E.rc(g,9,18,6,8,E.PAL.door);
    E.speck(g, rng, 1,16,22,10, E.shade(wall,0.6), 5);
  });
  E.defprop('treeFront', 14, 24, (g, rng) => {
    const leaf = E.PAL.leaf, lit = E.PAL.leafLit, bark = E.PAL.bark;
    E.rc(g,6,16,2,8,bark); E.rc(g,6,16,1,8,E.shade(bark,0.7));
    E.rc(g,2,4,10,10,leaf); E.rc(g,3,2,8,4,leaf); E.rc(g,1,10,12,4,leaf);
    E.rc(g,3,3,5,4,lit); E.rc(g,8,11,3,3,lit);
    E.speck(g, rng, 1,2,12,12, E.shade(leaf,0.65), 7);
  });
  E.defprop('wallFront', 16, 20, (g, rng) => {
    const wall = '#39324a';
    E.rc(g,0,4,16,16,wall); E.rc(g,0,4,16,2,E.shade(wall,1.25));
    E.speck(g, rng, 0,6,16,14, E.shade(wall,0.6), 10);
    E.drip(g, rng, rng.i(2,13), 6, 12, E.shade(wall,0.5));
  });
  E.defprop('exhibitBoard', 22, 26, (g, rng) => {
    const post = '#2a2540', board = '#e9e6da';
    E.rc(g,9,10,4,16,post); E.rc(g,2,0,18,11,board);
    E.rc(g,2,0,18,2,'#8a7a3f'); E.rc(g,3,3,16,3,'#3a3550'); E.rc(g,3,7,12,2,'#6a5f8a');
    E.speck(g, rng, 2,0,18,11, '#c9c4b0', 8);
  });
  E.defprop('foeBell', 22, 22, (g, rng) => {
    const body = '#5a4a7a', lit = E.shade(body,1.35), lo = E.shade(body,0.7);
    E.rc(g,3,6,16,14,body); E.rc(g,3,6,16,2,lit); E.rc(g,3,18,16,2,lo);
    E.rc(g,8,0,6,7,body); E.rc(g,9,1,4,4,lit);
    E.rc(g,9,11,2,2,'#e8c86a'); E.rc(g,13,11,2,2,'#e8c86a');
    E.speck(g, rng, 3,6,16,14, lo, 8);
  });

  const PROP_BY_KIND = {
    house:{id:'houseFront', w:26,h:30, scale:2.6}, shop:{id:'shopFront', w:24,h:26, scale:2.6},
    tree:{id:'treeFront', w:14,h:24, scale:2.4}, wall:{id:'wallFront', w:16,h:20, scale:2.6},
    exhibit:{id:'exhibitBoard', w:22,h:26, scale:2.4},
  };

  // ==== 道モジュールの初期化：累積深度オフセットを前計算 ====================
  function init(){
    const town = D.town;
    state.modules = town.modules;
    let acc = 0; state.moduleStarts = [];
    town.modules.forEach(m => { state.moduleStarts.push(acc); acc += m.len; });
    state.totalDepth = acc;
    state.encounterFired = {};
    state.exhibitSeen = false;
    state.ally = null;

    P.depth = town.startDepth; P.laneX = town.startLane; P.dir = 'front';
    P.hp = P.maxhp;
    state.cameraDepth = 0;
    document.getElementById('foot').innerHTML = 'WASD 移動 ／ Shift ダッシュ ／ 奥へ進む';
  }

  function moduleAt(depth){
    let idx = 0;
    for (let i=0;i<state.modules.length;i++){
      if (depth >= state.moduleStarts[i]) idx = i; else break;
    }
    return { idx, module: state.modules[idx], localDepth: depth - state.moduleStarts[idx] };
  }

  function updateCamera(){
    const lookahead = E.DEFAULT_PERSPECTIVE.depthMax * 0.32;
    const maxCam = Math.max(0, state.totalDepth - E.DEFAULT_PERSPECTIVE.depthMax);
    state.cameraDepth = Math.max(0, Math.min(maxCam, P.depth - lookahead));
  }

  function update(){
    const { dx, dy, m } = E.readAxis();
    const spd = D.balance.playerSpd * (E.keys.run ? D.balance.dashMultiplier : 1);
    if (m > 0){
      const { module } = moduleAt(P.depth);
      P.depth = Math.max(0, Math.min(state.totalDepth-4, P.depth - dy/m*spd));
      const halfW = module.halfWidth - 10;
      P.laneX = Math.max(-halfW, Math.min(halfW, P.laneX + dx/m*spd));
      if (Math.abs(dy) >= Math.abs(dx)) P.dir = dy < 0 ? 'back' : 'front';
      else P.dir = dx < 0 ? 'left' : 'right';
    }
    updateCamera();

    // 仲間（鐘江）は主人公の少し後ろをついてくる。
    if (state.ally){
      const targetDepth = P.depth - 34, targetLane = P.laneX;
      const dD = targetDepth - state.allyDepth, dL = targetLane - state.allyLane;
      const dist = Math.hypot(dD, dL);
      if (dist > 4){
        const sp = Math.min(dist, spd*0.9);
        state.allyDepth += dD/dist*sp; state.allyLane += dL/dist*sp;
      }
      state.allyDir = dD < -2 ? 'back' : (dD > 2 ? 'front' : (dL < 0 ? 'left' : 'right'));
    }

    // 明澄会の展示パネルに近づいたら一度だけ説明バナーを出す。
    const { module: curModule, idx: curIdx } = moduleAt(P.depth);
    const modStart = state.moduleStarts[curIdx];
    if (!state.exhibitSeen){
      (curModule.props||[]).forEach(pr => {
        if (pr.kind === 'exhibit' && Math.abs(P.depth-(modStart+pr.depth)) < 40 && Math.abs(P.laneX-pr.laneX) < 40){
          state.exhibitSeen = true;
          E.banner('明澄会 展示パネル', pr.label, 1800);
        }
      });
    }
    if (curModule.dusk && !state.seenBacktalk){
      state.seenBacktalk = true;
      E.banner('……鐘の音？', '静かな路地に、何かの気配がする', 1400);
    }

    // 遭遇トリガー（区間内の深度レンジに入ったら一度だけ発火）。
    const enc = curModule.encounter;
    if (enc && !state.encounterFired[enc.id] && P.depth >= modStart+enc.fromDepth && P.depth <= modStart+enc.toDepth){
      state.encounterFired[enc.id] = true;
      E.fadeThen(() => { if (onEncounter) onEncounter(enc); }, 500);
    }
  }

  function drawGroundBands(){
    const step = 30, from = state.cameraDepth, to = Math.min(state.totalDepth, state.cameraDepth + E.DEFAULT_PERSPECTIVE.depthMax);
    for (let d = to; d > from; d -= step){
      const d0 = Math.max(from, d-step);
      const { module } = moduleAt(Math.min(state.totalDepth-1, (d0+d)/2));
      const t = 1 - (d - from) / E.DEFAULT_PERSPECTIVE.depthMax; // 0=奥,1=手前
      const base = module.dusk ? '#241c30' : '#312a44';
      const col = E.shade(base, 0.55 + 0.5*t);
      E.drawRoadBand(persp, module.halfWidth+34, d0-from, d-from, col);
    }
  }

  function drawProps(){
    const items = [];
    state.modules.forEach((mod, mi) => {
      (mod.props||[]).forEach(pr => {
        const absDepth = state.moduleStarts[mi] + pr.depth;
        const renderDepth = absDepth - state.cameraDepth;
        if (renderDepth < -20 || renderDepth > E.DEFAULT_PERSPECTIVE.depthMax) return;
        const spec = PROP_BY_KIND[pr.kind]; if (!spec) return;
        const proj = E.project(persp, pr.laneX, renderDepth);
        items.push({ y: proj.y, fn: () => {
          E.drawSprite(spec.id, mod.id+'#'+pr.depth+'#'+pr.laneX, proj.x, proj.y, spec.scale*proj.scale, { accent:'#7a4e3a' });
        }});
      });
    });
    return items;
  }

  function drawPersonAt(depth, laneX, dir, pal, label){
    const renderDepth = depth - state.cameraDepth;
    const proj = E.project(persp, laneX, renderDepth);
    const propId = dir==='back' ? 'personBack' : dir==='front' ? 'personFront' : 'personSide';
    const flip = dir === 'right';
    return { y: proj.y, fn: () => {
      E.shadow(proj.x, proj.y, proj.scale);
      E.drawSprite(propId, 'char-'+(label||'x'), proj.x, proj.y, 2.8*proj.scale, { pal, flip });
      if (label){
        ctx.fillStyle = '#9aa7c7'; ctx.font = (9*Math.max(0.6,proj.scale))+'px monospace'; ctx.textAlign='center';
        ctx.fillText(label, proj.x, proj.y - 60*proj.scale);
      }
    }};
  }

  function draw(){
    const { module } = moduleAt(P.depth);
    E.drawSky(persp, module.sky.top, module.sky.horizon);
    ctx.fillStyle = module.dusk ? '#1a1522' : '#221c30';
    ctx.fillRect(0, E.H*persp.horizon, E.W, E.H*(1-persp.horizon));
    drawGroundBands();

    const list = drawProps();
    const soraPal = D.characters.sora.palette;
    list.push(drawPersonAt(P.depth, P.laneX, P.dir, soraPal));
    if (state.ally){
      const kPal = D.allies.kanae.palette;
      list.push(drawPersonAt(state.allyDepth, state.allyLane, state.allyDir, kPal, D.allies.kanae.name));
    }
    E.drawYSorted(list);
  }

  function setAlly(join){
    if (join){ state.ally = true; state.allyDepth = P.depth-34; state.allyLane = P.laneX; state.allyDir = 'back'; }
    else state.ally = null;
  }

  // 戦闘に敗れた時、遭遇ゾーンの手前まで押し戻し、再挑戦できるようトリガーを解除する。
  function retreatFromEncounter(){
    const { module, idx } = moduleAt(P.depth);
    const enc = module.encounter;
    if (enc){
      state.encounterFired[enc.id] = false;
      P.depth = Math.max(0, state.moduleStarts[idx] + enc.fromDepth - 80);
    }
    P.hp = P.maxhp;
    updateCamera();
  }

  return { init, update, draw, bindShared, state, setAlly, moduleAt, retreatFromEncounter,
    get totalDepth(){ return state.totalDepth; } };
})();
