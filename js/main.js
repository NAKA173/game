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
  const Save = Hazama.Save;

  const P = { x:0, y:0, r:13, hp:100, maxhp:100, dir:{x:1,y:0}, charId:'saku',
    atkCD:0, atkAnim:0, skillCD:0, shiftCD:0, iFrames:0, inSeam:false, slow:0,
    dashX:0, dashY:0, dashT:0, items:3 };
  const St = { t:0, gt:17*60+42, kiwa:50, slowmo:1, en:0 };

  let MODE = 'explore';
  let loopStarted = false;
  let playStartMs = 0, playtimeBaseSec = 0;
  const DEFAULT_STATION = 'honmachi';

  Battle.bindShared(P, St);
  Explore.bindShared(P, St, enterBattle, enterStation);
  Station.bindShared(P, St, boardTrain, exitStationToTown);
  Train.bindShared(St, arriveAtStation);

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
    document.getElementById('allyMeter').style.display = 'none';
    document.getElementById('foot').innerHTML = (Battle.ally
      ? 'WASD 移動 ／ 仲間が街にもついてくる' : 'WASD 移動 ／ ヨドミに近づくと戦闘開始') + ' ／ Shift ダッシュ';
    P.x = Explore.state.worldW*0.5; P.y = Explore.state.worldH*0.30;
    if (Battle.ally){ Battle.ally.ex = P.x-30; Battle.ally.ey = P.y+10; }
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

  // ==== 開始（新規 or ロード） ==========================================
  // loadData を渡すとセーブデータから再開する（駅・位置・縁・時刻・プレイ時間を復元）。
  // 新規開始時は resolveStartStation() のデフォルト駅から、縁0・初期時刻で始まる。
  function start(charId, loadData){
    document.getElementById('introPane').style.display = 'none';
    document.getElementById('charSelect').style.display = 'none';
    document.getElementById('diaryPanel').style.display = 'none';
    document.getElementById('wrap').style.display = 'block';
    document.getElementById('touch').classList.add('on');
    document.getElementById('diaryBtn').style.display = 'inline-block';
    E.resize();

    // ロード時にバトル・駅構内・車内から再開することは無いはずだが、念のため探索状態へ揃えておく。
    MODE = 'explore';
    document.getElementById('battleHud').style.display = 'none';
    document.getElementById('battleBtns').style.display = 'none';
    document.getElementById('exploreBtns').style.display = 'grid';
    document.getElementById('allyMeter').style.display = 'none';
    document.getElementById('stationPanel').style.display = 'none';
    document.getElementById('trainPanel').style.display = 'none';
    Battle.ally = null;

    P.charId = charId;
    let stationId, spawn;
    if (loadData){
      stationId = D.stations[loadData.stationId] ? loadData.stationId : resolveStartStation();
      spawn = { x: loadData.px, y: loadData.py };
      St.en = loadData.en || 0;
      St.gt = loadData.gt != null ? loadData.gt : 17*60+42;
      playtimeBaseSec = loadData.playtimeSec || 0;
    } else {
      stationId = resolveStartStation();
      spawn = null;
      St.en = 0;
      St.gt = 17*60+42;
      playtimeBaseSec = 0;
    }
    playStartMs = Date.now();

    Explore.init(stationId, spawn);
    document.getElementById('enCur').textContent = '縁 ' + St.en;
    const station = D.stations[stationId];
    const charName = D.characters[charId].name;
    E.banner(station.name || '？？？', loadData ? charName + '、続きから' : '街の奥に ヨドミの気配', 1200);
    clockTxt();
    if (!loopStarted){ loopStarted = true; requestAnimationFrame(loop); }
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

  // ==== メインループ ====================================================
  const MODULES = { explore: Explore, battle: Battle, station: Station, train: Train };
  let acc = 0;
  function loop(){
    acc += St.slowmo;
    while (acc >= 1){
      St.t++; if (St.t % 2 === 0){ St.gt += 0.05; clockTxt(); }
      if (MODE === 'battle') Battle.update(onPlayerLose);
      else MODULES[MODE].update();
      acc--;
    }
    MODULES[MODE].draw();
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
  if (Save.hasAny()) document.getElementById('continueBtn').style.display = 'block';

  // 外部からのデバッグ起動用（引数省略時は朔で開始）。通常はキャラ選択カードのクリックから呼ばれる。
  window.Hazama.start = (charId) => startNewGame(charId || 'saku');
})();
