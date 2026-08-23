/*
 * main.js
 * 探索⇔バトルのモード管理とメインループ。
 */
(function(){
  const E = Hazama.Engine;
  const Battle = Hazama.Battle;
  const Explore = Hazama.Explore;

  const P = { x:0, y:0, r:13, hp:100, maxhp:100, dir:{x:1,y:0},
    atkCD:0, atkAnim:0, skillCD:0, shiftCD:0, iFrames:0, inSeam:false, slow:0,
    dashX:0, dashY:0, dashT:0, items:3 };
  const St = { t:0, gt:17*60+42, kiwa:50, slowmo:1, en:0 };

  let MODE = 'explore';
  const DEFAULT_STATION = 'honmachi';

  Battle.bindShared(P, St);
  Explore.bindShared(P, St, enterBattle);

  // デバッグ／動作確認用：URL の ?station=shotengaimae のような形で開始駅を切り替えられる。
  // data.js の駅データさえあれば、本町以外の駅もこの入口からそのまま歩ける。
  function resolveStartStation(){
    const q = new URLSearchParams(location.search).get('station');
    if (q && Hazama.Data.stations[q]) return q;
    return DEFAULT_STATION;
  }

  function clockTxt(){
    const m = Math.floor(St.gt) % 1440;
    document.getElementById('clock').textContent =
      String(Math.floor(m/60)).padStart(2,'0') + ':' + String(m%60).padStart(2,'0');
  }

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

  function start(){
    document.getElementById('introPane').style.display = 'none';
    document.getElementById('wrap').style.display = 'block';
    document.getElementById('touch').classList.add('on');
    E.resize();
    const stationId = resolveStartStation();
    Explore.init(stationId);
    document.getElementById('enCur').textContent = '縁 0';
    const station = Hazama.Data.stations[stationId];
    E.banner(station.name || '？？？','街の奥に ヨドミの気配', 1200);
    clockTxt();
    requestAnimationFrame(loop);
  }

  let acc = 0;
  function loop(){
    acc += St.slowmo;
    while (acc >= 1){
      St.t++; if (St.t % 2 === 0){ St.gt += 0.05; clockTxt(); }
      if (MODE === 'explore') Explore.update(); else Battle.update(onPlayerLose);
      acc--;
    }
    if (MODE === 'explore') Explore.draw(); else Battle.draw();
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

  window.Hazama.start = start;
})();
