/*
 * interior.js
 * 建物の中に入った時の共通シーン（食事処・コンビニ・際屋などの店舗内、および主人公の自宅）。
 * 街（explore.js）・駅構内（station.js）とは独立したモードで、店員（NPC）との簡単な会話フレーバー、
 * 買う/売るのDOMパネル、自宅では「休む」を提供する。設定オブジェクト(config)ひとつで
 * 店舗の種類を汎用的に扱う＝ショップ用に個別モジュールを増やさない設計。
 */
window.Hazama = window.Hazama || {};

Hazama.Interior = (function(){
  const E = Hazama.Engine;
  const D = Hazama.Data;
  const Inv = Hazama.Inventory;
  const ctx = E.ctx;

  let P, St, onExit;
  let config = null;
  // config: { kind:'shop'|'home', title, npcName, npcPalette, greeting, catalog, mode, stationId }

  function bindShared(sharedP, sharedSt, exitFn){ P = sharedP; St = sharedSt; onExit = exitFn; }

  let floorPattern = null;
  function getFloorPattern(){
    if (floorPattern) return floorPattern;
    const c = document.createElement('canvas'); c.width=16; c.height=16;
    const g = c.getContext('2d'); const rng = E.makeRNG(555);
    E.rc(g,0,0,16,16,'#3c3552'); E.speck(g, rng, 0,0,16,16,'#463f5c', 10); E.speck(g, rng, 0,0,16,16,'#302a44', 6);
    floorPattern = ctx.createPattern(c,'repeat');
    return floorPattern;
  }

  function enter(cfg){
    config = Object.assign({ mode:'buy' }, cfg);
    document.getElementById('interiorPanel').style.display = 'flex';
    document.getElementById('interiorTitle').textContent = cfg.title;
    document.getElementById('interiorNpcLine').textContent = cfg.greeting || '';
    document.getElementById('battleHud').style.display = 'none';
    document.getElementById('battleBtns').style.display = 'none';
    document.getElementById('exploreBtns').style.display = 'none';
    document.getElementById('foot').innerHTML = cfg.kind==='home' ? '休む ／ 出るで町へ戻る' :
      cfg.kind==='vending' ? '買うを選ぶ ／ 出るで町へ戻る' :
      cfg.kind==='lottery' ? 'くじを引く ／ 出るで町へ戻る' : '買う／売るを選ぶ ／ 出るで町へ戻る';
    renderBody();
  }
  function exit(){
    document.getElementById('interiorPanel').style.display = 'none';
    const stationId = config && config.stationId;
    config = null;
    if (onExit) onExit(stationId);
  }

  function renderBody(){
    const body = document.getElementById('interiorBody');
    body.innerHTML = '';
    if (!config) return;

    if (config.kind === 'home'){
      const restBtn = document.createElement('button');
      restBtn.className = 'ixBigBtn';
      restBtn.textContent = '休む（HP・際力を全回復する）';
      restBtn.addEventListener('click', () => {
        P.hp = P.maxhp; St.kiwa = 100;
        E.banner('おかえりなさい', 'ゆっくり休んで、体力が戻った', 1000);
        renderBody();
      });
      body.appendChild(restBtn);
      return;
    }

    if (config.kind === 'lottery'){
      const info = document.createElement('div'); info.className = 'ixEmpty';
      info.textContent = `1回 ${config.cost}縁 ─ 何が出るかはお楽しみ`;
      body.appendChild(info);
      const drawBtn = document.createElement('button');
      drawBtn.className = 'ixBigBtn';
      drawBtn.textContent = `くじを引く（${config.cost}縁）`;
      drawBtn.addEventListener('click', () => {
        if (St.en < config.cost){ E.banner('縁が足りない','あと'+(config.cost-St.en)+'縁',800); return; }
        St.en -= config.cost;
        document.getElementById('enCur').textContent = '縁 ' + St.en;
        const id = config.catalog[Math.floor(Math.random()*config.catalog.length)];
        const info2 = D.itemInfo(id);
        Inv.add(id, 1);
        E.banner('くじ結果', (info2 ? info2.name : id) + ' が当たった！', 1200);
      });
      body.appendChild(drawBtn);
      return;
    }

    if (config.kind === 'vending'){ config.mode = 'buy'; }
    else {
      const tabs = document.createElement('div'); tabs.className = 'ixTabs';
      ['buy','sell'].forEach(m => {
        const b = document.createElement('button');
        b.className = 'ixTab' + (config.mode===m ? ' active' : '');
        b.textContent = m==='buy' ? '買う' : '売る';
        b.addEventListener('click', () => { config.mode = m; renderBody(); });
        tabs.appendChild(b);
      });
      body.appendChild(tabs);
    }

    const list = document.createElement('div'); list.className = 'ixList';
    if (config.mode === 'buy'){
      config.catalog.forEach(entry => {
        const isFood = typeof entry === 'object';
        const info = isFood ? null : D.itemInfo(entry);
        const name = isFood ? entry.n : ((info && info.name) || entry);
        const price = isFood ? entry.price : (info && info.price);
        const row = document.createElement('button'); row.className = 'ixRow';
        row.innerHTML = `<span class="ixName">${name}</span><span class="ixPrice">${price!=null ? price+'縁' : '非売品'}</span>`;
        row.addEventListener('click', () => {
          if (price == null){ E.banner('非売品','これは売っていない',700); return; }
          if (St.en < price){ E.banner('縁が足りない','あと'+(price-St.en)+'縁',800); return; }
          St.en -= price;
          document.getElementById('enCur').textContent = '縁 ' + St.en;
          if (isFood){
            Inv.state.foodLog++;
            E.banner(name, '美味しかった（食べ歩き帖 '+Inv.state.foodLog+'品目）', 900);
          } else {
            Inv.add(entry, 1);
            E.banner(name, '手に入れた', 700);
          }
        });
        list.appendChild(row);
      });
    } else {
      const owned = Object.entries(Inv.state.items).filter(([, n]) => n>0);
      if (!owned.length){ list.innerHTML = '<div class="ixEmpty">売れる物を持っていない</div>'; }
      owned.forEach(([id, n]) => {
        const info = D.itemInfo(id);
        if (!info || !info.price) return;
        const value = Inv.sellValue(id, false);
        const row = document.createElement('button'); row.className = 'ixRow';
        row.innerHTML = `<span class="ixName">${info.name} ×${n}</span><span class="ixPrice">${value}縁で売る</span>`;
        row.addEventListener('click', () => {
          Inv.remove(id,1); St.en += value;
          document.getElementById('enCur').textContent = '縁 ' + St.en;
          E.banner('売却', '+'+value+'縁', 600);
          renderBody();
        });
        list.appendChild(row);
      });
    }
    body.appendChild(list);
  }

  function update(){ /* 静止シーン。操作はDOMパネル側で完結する */ }
  function draw(){
    ctx.save();
    ctx.fillStyle = getFloorPattern(); ctx.fillRect(0,0,E.W,E.H);
    ctx.fillStyle = '#1c1830'; ctx.fillRect(0,0,E.W,E.H*0.30);
    if (config){
      if (config.npcPalette){
        E.shadow(E.W*0.36, E.H*0.34);
        E.drawSprite('person', 'npc-'+(config.npcId||config.title), E.W*0.36, E.H*0.34, 4, config.npcPalette);
        ctx.fillStyle = '#9aa7c7'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
        ctx.fillText(config.npcName || '', E.W*0.36, E.H*0.34-84);
      }
      if (P){
        const pal = (D.characters[P.charId] && D.characters[P.charId].palette) || D.characters.saku.palette;
        E.shadow(E.W*0.64, E.H*0.34);
        E.drawSprite('person', 'player-'+P.charId, E.W*0.64, E.H*0.34, 4, pal);
      }
    }
    ctx.restore();
  }

  document.getElementById('interiorExitBtn').addEventListener('click', exit);

  return { bindShared, enter, exit, update, draw };
})();
