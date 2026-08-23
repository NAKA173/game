/*
 * main.js
 * タイトル(キャラ選択)⇔探索⇔バトルのモード管理、メインループ、セーブ/ロード(日記アプリ)の配線。
 */
(function(){
  const E = Hazama.Engine;
  const D = Hazama.Data;
  const Battle = Hazama.Battle;
  const Explore = Hazama.Explore;
  const Station = Hazama.Station;
  const Train = Hazama.Train;
  const Interior = Hazama.Interior;
  const Inv = Hazama.Inventory;
  const Save = Hazama.Save;

  const P = { x:0, y:0, r:13, hp:100, maxhp:100, dir:{x:1,y:0}, charId:'saku',
    atkCD:0, atkAnim:0, skillCD:0, shiftCD:0, iFrames:0, inSeam:false, slow:0,
    dashX:0, dashY:0, dashT:0 };
  const St = { t:0, gt:17*60+42, kiwa:50, slowmo:1, en:0 };

  let MODE = 'explore';
  let loopStarted = false;
  let playStartMs = 0, playtimeBaseSec = 0;
  const DEFAULT_STATION = 'honmachi';

  Battle.bindShared(P, St);
  Explore.bindShared(P, St, enterBattle, enterStation, enterInterior);
  Station.bindShared(P, St, boardTrain, exitStationToTown);
  Train.bindShared(St, arriveAtStation);
  Interior.bindShared(P, St, exitInteriorToTown);

  // デバッグ／動作確認用：URL の ?station=shotengaimae のような形で開始駅を切り替えられる。
  // data.js の駅データさえあれば、本町以外の駅もこの入口からそのまま歩ける（新規開始時のみ。
  // ロード時はセーブデータの駅を優先する）。
  function resolveStartStation(){
    const q = new URLSearchParams(location.search).get('station');
    if (q && D.stations[q]) return q;
    return DEFAULT_STATION;
  }

  function clockTxt(){
    const m = Math.floor(St.gt) % 1440;
    document.getElementById('clock').textContent =
      String(Math.floor(m/60)).padStart(2,'0') + ':' + String(m%60).padStart(2,'0');
  }
  function getPlaytimeSec(){
    return playtimeBaseSec + Math.floor((Date.now()-playStartMs)/1000);
  }

  // ==== キャラクター選択 ==============================================
  function renderCharSelect(){
    const list = document.getElementById('charList');
    list.innerHTML = '';
    Object.entries(D.characters).forEach(([id, c]) => {
      const card = document.createElement('button');
      card.className = 'charCard';
      card.innerHTML =
        `<span class="charSwatch" style="background:${c.palette.body}"></span>` +
        `<span class="charInfo">` +
          `<span class="cname">${c.name}</span>` +
          `<span class="carea">${c.area}</span>` +
          `<span class="cblurb">${c.blurb}</span>` +
        `</span>`;
      card.addEventListener('click', () => startNewGame(id));
      list.appendChild(card);
    });
  }
  function showCharSelect(){
    document.getElementById('introPane').style.display = 'none';
    document.getElementById('charSelect').style.display = 'block';
    renderCharSelect();
  }
  function startNewGame(charId){
    document.getElementById('charSelect').style.display = 'none';
    start(charId, null);
  }

  // ==== バトル遷移 ====================================================
  function enterBattle(){
    MODE = 'battle';
    document.getElementById('exploreBtns').style.display = 'none';
    Battle.start('yodomineko');
  }
  function exitBattleToExplore(){
    MODE = 'explore';
    document.getElementById('battleHud').style.display = 'none';
    document.getElementById('battleBtns').style.display = 'none';
    document.getElementById('exploreBtns').style.display = 'grid';
    for (let i=0;i<3;i++) document.getElementById('allyMeter'+i).style.display = 'none';
    document.getElementById('foot').innerHTML = (Battle.party.front.length
      ? 'WASD 移動 ／ 仲間が街にもついてくる' : 'WASD 移動 ／ ヨドミに近づくと戦闘開始') + ' ／ Shift ダッシュ';
    P.x = Explore.state.worldW*0.5; P.y = Explore.state.worldH*0.30;
    Battle.party.front.forEach((a,i) => { a.ex = P.x-30-i*20; a.ey = P.y+10; });
  }

  function onAnchorPress(){
    Battle.anchor(() => {
      E.fadeThen(() => { exitBattleToExplore(); }, 1900);
    });
  }
  function onPlayerLose(){
    E.banner('気絶','際に のまれた…',1400);
    E.fadeThen(() => {
      P.hp = P.maxhp; MODE = 'explore';
      document.getElementById('battleHud').style.display = 'none';
      document.getElementById('battleBtns').style.display = 'none';
      document.getElementById('exploreBtns').style.display = 'grid';
      document.getElementById('foot').innerHTML = 'WASD 移動 ／ ヨドミに近づくと戦闘開始 ／ Shift ダッシュ';
      P.x = Explore.state.worldW*0.5; P.y = Explore.state.worldH*0.7;
    }, 1500);
  }

  // ==== 駅構内・電車遷移 ================================================
  // 街（explore.js）と駅構内（station.js）は完全に別モード。改札に触れると街の状態を保ったまま
  // 駅構内モードへ、「町へ戻る」で改札のすぐ外（毎回同じ場所）へ戻す。
  function enterStation(stationId){
    MODE = 'station';
    Station.enter(stationId);
  }
  function exitStationToTown(stationId){
    MODE = 'explore';
    Explore.init(stationId);
  }
  function boardTrain(adjInfo, destName, express){
    document.getElementById('stationPanel').style.display = 'none';
    MODE = 'train';
    Train.board(adjInfo, destName, express);
  }
  function arriveAtStation(stationId){
    MODE = 'station';
    Station.enter(stationId);
  }

  // ==== 建物内（店舗・自宅）遷移 ==========================================
  // 街（explore.js）の状態は破棄せず、モードを切り替えるだけ。戻る時は
  // Explore.releaseFromTrigger() で入店トリガーの範囲外へプレイヤーを押し出してから探索へ戻す。
  function enterInterior(cfg){
    MODE = 'interior';
    document.getElementById('exploreBtns').style.display = 'none';
    Interior.enter(cfg);
  }
  function exitInteriorToTown(){
    MODE = 'explore';
    document.getElementById('exploreBtns').style.display = 'grid';
    document.getElementById('foot').innerHTML = 'WASD 移動 ／ ヨドミに近づくと戦闘開始 ／ 改札で駅構内へ ／ Shift ダッシュ';
    Explore.releaseFromTrigger();
  }

  // ==== 開始（新規 or ロード） ==========================================
  // loadData を渡すとセーブデータから再開する（駅・位置・縁・時刻・プレイ時間を復元）。
  // 新規開始時は resolveStartStation() のデフォルト駅から、縁0・初期時刻で始まる。
  function start(charId, loadData){
    document.getElementById('introPane').style.display = 'none';
    document.getElementById('charSelect').style.display = 'none';
    document.getElementById('diaryPanel').style.display = 'none';
    document.getElementById('itemsPanel').style.display = 'none';
    document.getElementById('interiorPanel').style.display = 'none';
    document.getElementById('introDialogue').style.display = 'none';
    document.getElementById('wrap').style.display = 'block';
    document.getElementById('touch').classList.add('on');
    document.getElementById('diaryBtn').style.display = 'inline-block';
    document.getElementById('itemsBtn').style.display = 'inline-block';
    E.resize();

    // ロード時にバトル・駅構内・車内から再開することは無いはずだが、念のため探索状態へ揃えておく。
    MODE = 'explore';
    document.getElementById('battleHud').style.display = 'none';
    document.getElementById('battleBtns').style.display = 'none';
    document.getElementById('exploreBtns').style.display = 'grid';
    for (let i=0;i<3;i++) document.getElementById('allyMeter'+i).style.display = 'none';
    document.getElementById('stationPanel').style.display = 'none';
    document.getElementById('trainPanel').style.display = 'none';
    Battle.party.front.length = 0; Battle.party.reserve.length = 0;

    P.charId = charId;
    let stationId, spawn;
    if (loadData){
      stationId = D.stations[loadData.stationId] ? loadData.stationId : resolveStartStation();
      spawn = { x: loadData.px, y: loadData.py };
      St.en = loadData.en || 0;
      St.gt = loadData.gt != null ? loadData.gt : 17*60+42;
      playtimeBaseSec = loadData.playtimeSec || 0;
      Inv.deserialize(loadData.inventory);
    } else {
      stationId = resolveStartStation();
      spawn = null;
      St.en = 0;
      St.gt = 17*60+42;
      playtimeBaseSec = 0;
      Inv.reset();
    }
    playStartMs = Date.now();

    Explore.init(stationId, spawn);
    document.getElementById('enCur').textContent = '縁 ' + St.en;
    const station = D.stations[stationId];
    const charName = D.characters[charId].name;
    E.banner(station.name || '？？？', loadData ? charName + '、続きから' : '街の奥に ヨドミの気配', 1200);
    clockTxt();
    if (!loopStarted){ loopStarted = true; requestAnimationFrame(loop); }

    // 新規開始・朔のみ：序章冒頭シーン（story_bible_v1.md §5）を最初に1回流す。
    if (!loadData && charId === 'saku'){
      MODE = 'cutscene';
      document.getElementById('exploreBtns').style.display = 'none';
      playIntro(() => {
        MODE = 'explore';
        document.getElementById('exploreBtns').style.display = 'grid';
      });
    }
  }

  // ==== 序章の会話シーン ================================================
  function playIntro(onDone){
    const script = D.introScript;
    const dlg = document.getElementById('introDialogue');
    const spk = document.getElementById('introSpeaker');
    const txt = document.getElementById('introText');
    let idx = 0;
    dlg.style.display = 'flex';
    function showLine(){
      const line = script[idx];
      spk.style.display = line.speaker ? 'block' : 'none';
      spk.textContent = line.speaker;
      txt.textContent = line.text;
    }
    function advance(){
      idx++;
      if (idx >= script.length){
        dlg.style.display = 'none';
        dlg.removeEventListener('click', advance);
        document.removeEventListener('keydown', keyHandler);
        if (onDone) onDone();
        return;
      }
      showLine();
    }
    function keyHandler(e){ if (e.key === 'Enter') advance(); }
    dlg.addEventListener('click', advance);
    document.addEventListener('keydown', keyHandler);
    showLine();
  }

  // ==== 日記（セーブ/ロード） ==========================================
  // mode='title'：タイトルの「日記から続ける」から開いた場合。ロード/消去のみ許可。
  // mode='game'：ゲーム中に上部バーの「日記」から開いた場合。その場所へのセーブも許可。
  let diaryMode = 'game';
  function fmtDate(ms){
    const d = new Date(ms);
    return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }
  function fmtPlaytime(sec){
    const h = Math.floor(sec/3600), m = Math.floor((sec%3600)/60);
    return `プレイ時間 ${h}時間${m}分`;
  }
  function renderDiarySlots(){
    const wrap = document.getElementById('diarySlots');
    wrap.innerHTML = '';
    Save.list().forEach(({ slot, data }) => {
      const el = document.createElement('div');
      el.className = 'diarySlot';
      if (data){
        el.innerHTML =
          `<div class="dtext">${data.diary}</div>` +
          `<div class="dmeta">スロット${slot} ／ ${fmtDate(data.savedAt)} ／ ${fmtPlaytime(data.playtimeSec||0)}</div>` +
          `<div class="dactions"></div>`;
        const actions = el.querySelector('.dactions');
        const loadBtn = document.createElement('button');
        loadBtn.textContent = 'ロード';
        loadBtn.addEventListener('click', () => doLoad(slot));
        actions.appendChild(loadBtn);
        if (diaryMode === 'game'){
          const overwriteBtn = document.createElement('button');
          overwriteBtn.textContent = 'ここに上書き';
          overwriteBtn.addEventListener('click', () => doSave(slot));
          actions.appendChild(overwriteBtn);
        }
        const delBtn = document.createElement('button');
        delBtn.textContent = '消去'; delBtn.className = 'danger';
        delBtn.addEventListener('click', () => { Save.remove(slot); renderDiarySlots(); });
        actions.appendChild(delBtn);
      } else {
        el.innerHTML =
          `<div class="dtext">（空き）</div>` +
          `<div class="dmeta">スロット${slot}</div>` +
          `<div class="dactions"></div>`;
        if (diaryMode === 'game'){
          const actions = el.querySelector('.dactions');
          const saveBtn = document.createElement('button');
          saveBtn.textContent = 'ここにセーブ';
          saveBtn.addEventListener('click', () => doSave(slot));
          actions.appendChild(saveBtn);
        }
      }
      wrap.appendChild(el);
    });
  }
  function doSave(slot){
    Save.save(slot, {
      charId: P.charId, stationId: Explore.state.stationId,
      px: P.x, py: P.y, en: St.en, gt: St.gt, playtimeSec: getPlaytimeSec(),
      inventory: Inv.serialize(),
    });
    E.banner('日記','今日のことを 書き記した', 700);
    renderDiarySlots();
  }
  function doLoad(slot){
    const rec = Save.load(slot);
    if (!rec) return;
    closeDiary();
    start(rec.charId, rec);
  }
  function openDiary(mode){
    diaryMode = mode;
    document.getElementById('diaryPanel').style.display = 'flex';
    renderDiarySlots();
  }
  function closeDiary(){
    document.getElementById('diaryPanel').style.display = 'none';
  }

  // ==== もちもの（所持アイテム・装備・パーティ編成） ======================
  const CATEGORY_LABEL = { talismans:'際札', charms:'御守', blueprints:'際図', medicine:'薬', materials:'材料', equipment:'装備' };
  let itemsTab = 'items';
  function renderItemsPanel(){
    const tabs = document.getElementById('itemsTabs');
    tabs.innerHTML = '';
    [['items','所持品'],['party','編成'],['netshop','通販']].forEach(([key,label]) => {
      const b = document.createElement('button');
      b.className = 'ixTab' + (itemsTab===key ? ' active' : '');
      b.textContent = label;
      b.addEventListener('click', () => { itemsTab = key; renderItemsPanel(); });
      tabs.appendChild(b);
    });

    const list = document.getElementById('itemsList');
    list.innerHTML = '';
    if (itemsTab === 'party'){ renderPartyTab(list); return; }
    if (itemsTab === 'netshop'){ renderNetshopTab(list); return; }

    const entries = Object.entries(Inv.state.items).filter(([, n]) => n>0)
      .sort((a,b) => a[0].localeCompare(b[0]));
    if (!entries.length){ list.innerHTML = '<div class="ixEmpty">何も持っていない</div>'; return; }
    entries.forEach(([id, n]) => {
      const info = D.itemInfo(id);
      if (!info) return;
      const isEquip = info.category === 'equipment';
      const isEquipped = isEquip && Inv.state.equipped[info.slot] === id;
      const row = document.createElement('div'); row.className = 'ixRow' + (isEquipped ? ' equipped' : '');
      const nameSpan = document.createElement('span'); nameSpan.className = 'ixName';
      nameSpan.textContent = `［${CATEGORY_LABEL[info.category]||info.category}］${info.name}` +
        (n>1 ? ` ×${n}` : '') + (isEquipped ? '（装着中）' : '');
      row.appendChild(nameSpan);
      if (isEquip){
        const btn = document.createElement('button'); btn.className = 'ixTab';
        btn.style.cssText = 'flex:none;padding:5px 10px';
        btn.textContent = isEquipped ? '外す' : '装着';
        btn.addEventListener('click', () => { Inv.equip(info.slot, isEquipped ? null : id); renderItemsPanel(); });
        row.appendChild(btn);
      } else if (info.category === 'medicine' || info.category === 'talismans'){
        const btn = document.createElement('button'); btn.className = 'ixTab';
        btn.style.cssText = 'flex:none;padding:5px 10px';
        btn.textContent = '使う';
        btn.addEventListener('click', () => {
          const res = Inv.useItem(id, P, St);
          E.banner(res.ok ? info.name : 'できない', res.msg, 800);
          renderItemsPanel();
        });
        row.appendChild(btn);
      }
      list.appendChild(row);
    });
  }
  // 編成タブ：前衛3・控え3のスロットを並べ、1体選んでからもう1つのスロットを押すと入れ替わる。
  let partySelected = null;
  function renderPartyTab(list){
    const mkSlot = (group, idx) => {
      const a = Battle.party[group][idx];
      const slot = document.createElement('button'); slot.className = 'ixRow';
      const sel = partySelected && partySelected.group===group && partySelected.idx===idx;
      if (sel) slot.classList.add('equipped');
      slot.innerHTML = a
        ? `<span class="ixName">${a.name}</span><span class="ixPrice">HP ${Math.max(0,Math.round(a.hp))}/${a.maxhp}</span>`
        : `<span class="ixName ixEmpty" style="padding:0">（空き）</span>`;
      slot.addEventListener('click', () => {
        if (!partySelected){ if (a) partySelected = { group, idx }; renderItemsPanel(); return; }
        const from = partySelected, fromArr = Battle.party[from.group], toArr = Battle.party[group];
        if (from.group===group && from.idx===idx){ partySelected = null; renderItemsPanel(); return; }
        const fromVal = fromArr[from.idx], toVal = toArr[idx];
        if (fromVal === undefined){ partySelected = null; renderItemsPanel(); return; }
        if (toVal !== undefined){
          fromArr[from.idx] = toVal; toArr[idx] = fromVal; // 入れ替え
        } else {
          fromArr.splice(from.idx, 1); toArr.push(fromVal); // 空きスロットへ移動（前衛は3枠固定描画なので溢れない）
        }
        Battle.party.front = Battle.party.front.filter(x=>x); Battle.party.reserve = Battle.party.reserve.filter(x=>x);
        partySelected = null;
        renderItemsPanel();
      });
      return slot;
    };
    const frontHead = document.createElement('div'); frontHead.className = 'ixEmpty'; frontHead.textContent = '前衛';
    list.appendChild(frontHead);
    for (let i=0;i<3;i++) list.appendChild(mkSlot('front', i));
    const resHead = document.createElement('div'); resHead.className = 'ixEmpty'; resHead.textContent = '控え';
    list.appendChild(resHead);
    for (let i=0;i<3;i++) list.appendChild(mkSlot('reserve', i));
  }
  // 通販タブ：ハザマウォッチのアプリという体裁で、街を歩かず縁だけあればどこからでも注文できる。
  function renderNetshopTab(list){
    const note = document.createElement('div'); note.className = 'ixEmpty';
    note.textContent = '（ハザマウォッチ経由・どこでも注文できる）';
    list.appendChild(note);
    D.shopCatalogs.netshop.items.forEach(id => {
      const info = D.itemInfo(id);
      if (!info) return;
      const row = document.createElement('div'); row.className = 'ixRow';
      row.innerHTML = `<span class="ixName">${info.name}</span><span class="ixPrice">${info.price!=null ? info.price+'縁' : '非売品'}</span>`;
      row.addEventListener('click', () => {
        if (info.price == null){ E.banner('非売品','これは売っていない',700); return; }
        if (St.en < info.price){ E.banner('縁が足りない','あと'+(info.price-St.en)+'縁',800); return; }
        St.en -= info.price;
        document.getElementById('enCur').textContent = '縁 ' + St.en;
        Inv.add(id, 1);
        E.banner(info.name, '注文完了・手に入れた', 800);
      });
      list.appendChild(row);
    });
  }
  function openItems(){
    partySelected = null;
    document.getElementById('itemsPanel').style.display = 'flex';
    renderItemsPanel();
  }
  function closeItems(){
    document.getElementById('itemsPanel').style.display = 'none';
  }

  // ==== メインループ ====================================================
  // 'cutscene' は序章の会話演出専用。街の背景は描くが、操作・移動・トリガー判定は止める。
  const MODULES = { explore: Explore, battle: Battle, station: Station, train: Train, interior: Interior };
  let acc = 0;
  function loop(){
    acc += St.slowmo;
    while (acc >= 1){
      St.t++; if (St.t % 2 === 0){ St.gt += 0.05; clockTxt(); }
      if (MODE === 'battle') Battle.update(onPlayerLose);
      else if (MODE !== 'cutscene') MODULES[MODE].update();
      acc--;
    }
    if (MODE === 'cutscene') Explore.draw(); else MODULES[MODE].draw();
    requestAnimationFrame(loop);
  }

  E.bindKeyboard(k => {
    if (MODE !== 'battle') return;
    if (k === 'j') Battle.attack();
    if (k === 'k') Battle.shift();
    if (k === 'u') Battle.skill();
    if (k === 'i') Battle.useItem();
    if (k === 'l') onAnchorPress();
  });
  E.bindStick();
  E.bindButton('tAtk', () => Battle.attack());
  E.bindButton('tShift', () => Battle.shift());
  E.bindButton('tSkill', () => Battle.skill());
  E.bindButton('tItem', () => Battle.useItem());
  E.bindButton('tAnchor', onAnchorPress);
  E.bindHold('tDash', () => { E.keys.run = true; }, () => { E.keys.run = false; });
  addEventListener('resize', () => E.resize());

  document.getElementById('newGameBtn').addEventListener('click', showCharSelect);
  document.getElementById('continueBtn').addEventListener('click', () => openDiary('title'));
  document.getElementById('diaryBtn').addEventListener('click', () => openDiary('game'));
  document.getElementById('diaryCloseBtn').addEventListener('click', closeDiary);
  document.getElementById('itemsBtn').addEventListener('click', openItems);
  document.getElementById('itemsCloseBtn').addEventListener('click', closeItems);
  if (Save.hasAny()) document.getElementById('continueBtn').style.display = 'block';

  // 外部からのデバッグ起動用（引数省略時は朔で開始）。通常はキャラ選択カードのクリックから呼ばれる。
  window.Hazama.start = (charId) => startNewGame(charId || 'saku');
})();
