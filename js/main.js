/*
 * main.js
 * タイトル→序章会話→探索→遭遇会話→戦闘→鎮静→仲間加入会話→探索、という
 * 第1章「誰そ彼」体験版スライスの一本道進行を管理する。
 */
(function(){
  const E = Hazama.Engine;
  const D = Hazama.Data;
  const Battle = Hazama.Battle;
  const Explore = Hazama.Explore;

  const P = { hp:100, maxhp:100, atkCD:0, atkAnim:0, iFrames:0 };
  const St = { t:0 };

  let MODE = 'explore';
  let loopStarted = false;

  Battle.bindShared(P, St);
  Explore.bindShared(P, St, onEncounter);

  // ==== 会話オーバーレイ（序章・遭遇・仲間加入の全カットシーンで共用） =======
  function playScript(script, onDone){
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

  // ==== 探索 → 遭遇 → 戦闘 ================================================
  function onEncounter(encounterCfg){
    MODE = 'cutscene';
    document.getElementById('exploreBtns').style.display = 'none';
    playScript(D.encounterScript, () => {
      MODE = 'battle';
      document.getElementById('battleBtns').style.display = 'grid';
      Battle.start(encounterCfg);
    });
  }
  function onPacifyPress(){
    Battle.pacify((foeKind) => {
      E.fadeThen(() => {
        MODE = 'cutscene';
        document.getElementById('battleHud').style.display = 'none';
        document.getElementById('battleBtns').style.display = 'none';
        playScript(D.joinScript, () => {
          Explore.setAlly(true);
          MODE = 'explore';
          document.getElementById('exploreBtns').style.display = 'grid';
          document.getElementById('foot').innerHTML = 'WASD 移動 ／ 鐘江が ついてくる';
          E.banner('第1章 ここまで', '（体験版はここで終わりです）', 2600);
        });
      }, 1700);
    });
  }
  function onPlayerLose(){
    E.banner('気絶','際に のまれかけた…',1400);
    E.fadeThen(() => {
      P.hp = P.maxhp; MODE = 'explore';
      document.getElementById('battleHud').style.display = 'none';
      document.getElementById('battleBtns').style.display = 'none';
      document.getElementById('exploreBtns').style.display = 'grid';
      Explore.retreatFromEncounter();
    }, 1500);
  }

  // ==== 開始 ==============================================================
  function start(){
    document.getElementById('introPane').style.display = 'none';
    document.getElementById('wrap').style.display = 'block';
    document.getElementById('touch').classList.add('on');
    E.resize();

    MODE = 'explore';
    document.getElementById('battleHud').style.display = 'none';
    document.getElementById('battleBtns').style.display = 'none';
    document.getElementById('exploreBtns').style.display = 'grid';

    Explore.init();
    if (!loopStarted){ loopStarted = true; requestAnimationFrame(loop); }

    MODE = 'cutscene';
    document.getElementById('exploreBtns').style.display = 'none';
    playScript(D.introScript, () => {
      MODE = 'explore';
      document.getElementById('exploreBtns').style.display = 'grid';
    });
  }

  // ==== メインループ ========================================================
  const MODULES = { explore: Explore, battle: Battle };
  let acc = 0;
  function loop(){
    acc += 1;
    while (acc >= 1){
      St.t++;
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
    if (k === 'k') onPacifyPress();
  });
  E.bindStick();
  E.bindButton('tAtk', () => Battle.attack());
  E.bindButton('tPacify', onPacifyPress);
  E.bindHold('tDash', () => { E.keys.run = true; }, () => { E.keys.run = false; });
  addEventListener('resize', () => E.resize());

  document.getElementById('newGameBtn').addEventListener('click', start);

  // 外部からのデバッグ起動用。
  window.Hazama.start = start;
})();
