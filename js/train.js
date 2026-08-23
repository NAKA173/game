/*
 * train.js
 * 電車乗車シーン。station.js で乗車券を購入すると始まる、独立したモード。
 * 車内（座席・窓の外に流れる景色）を描画しつつ進捗バーを進め、時間経過で到着駅へコールバックする。
 */
window.Hazama = window.Hazama || {};

Hazama.Train = (function(){
  const E = Hazama.Engine;
  const D = Hazama.Data;
  const ctx = E.ctx;

  let St, onArrive;
  let ride = null; // { toId, lineName, destName, express, t, dur }
  const RIDE_FRAMES = 210; // 演出用の乗車時間（実時間ではなく体感重視の固定尺）

  function bindShared(sharedSt, arriveFn){ St = sharedSt; onArrive = arriveFn; }

  E.defprop('trainSeat', 20, 14, (g, rng) => {
    const seat = '#5a3a55', seatHi = E.shade(seat,1.3), seatLo = E.shade(seat,0.75);
    E.rc(g,0,4,20,10,seat); E.rc(g,0,4,20,2,seatHi); E.rc(g,0,0,20,5,seatLo);
    E.speck(g, rng, 0,4,20,10, E.shade(seat,0.85), 5);
  });

  function board(adjInfo, destName, express){
    ride = { toId: adjInfo.id, lineName: adjInfo.lineName, destName, express, t: 0, dur: RIDE_FRAMES };
    document.getElementById('trainPanel').style.display = 'block';
    document.getElementById('trainRouteText').textContent =
      adjInfo.lineName + '　' + destName + 'ゆき（' + (express ? '急行' : '各停') + '）';
    document.getElementById('trainProgressBar').style.width = '0%';
    document.getElementById('foot').innerHTML = '車内 ─ まもなく到着します';
  }

  function update(){
    if (!ride) return;
    ride.t++;
    document.getElementById('trainProgressBar').style.width = Math.min(100, ride.t/ride.dur*100) + '%';
    if (ride.t >= ride.dur){
      const toId = ride.toId;
      ride = null;
      document.getElementById('trainPanel').style.display = 'none';
      if (onArrive) onArrive(toId);
    }
  }

  function draw(){
    ctx.save();
    const grad = ctx.createLinearGradient(0,0,0,E.H);
    grad.addColorStop(0,'#241f3a'); grad.addColorStop(1,'#15121f');
    ctx.fillStyle = grad; ctx.fillRect(0,0,E.W,E.H);
    ctx.fillStyle = '#332c46'; ctx.fillRect(0, E.H*0.60, E.W, E.H*0.40);
    ctx.fillStyle = '#241f3a'; ctx.fillRect(0, E.H*0.58, E.W, 4);

    const winY = E.H*0.16, winH = E.H*0.32, winW = E.W*0.13;
    const t = St ? St.t : 0;
    for (let wx = E.W*0.08; wx < E.W*0.92; wx += E.W*0.19){
      ctx.save();
      ctx.beginPath(); ctx.rect(wx, winY, winW, winH); ctx.clip();
      ctx.fillStyle = '#0e0c16'; ctx.fillRect(wx, winY, winW, winH);
      const scroll = t * 3.2;
      for (let i=-1; i<4; i++){
        const bx = wx + winW - ((scroll + i*90) % (winW+90));
        ctx.fillStyle = i % 2 === 0 ? 'rgba(232,200,106,.5)' : 'rgba(154,167,199,.4)';
        ctx.fillRect(bx, winY+winH*0.4, 12, winH*0.55);
      }
      const flicker = 0.5 + 0.5*Math.sin(t*0.05);
      ctx.fillStyle = `rgba(232,200,106,${0.05+flicker*0.05})`; ctx.fillRect(wx, winY, winW, winH);
      ctx.restore();
      ctx.strokeStyle = '#1c1830'; ctx.lineWidth = 5; ctx.strokeRect(wx, winY, winW, winH);
    }

    for (let sx = E.W*0.15; sx < E.W*0.9; sx += E.W*0.24){
      E.drawSprite('trainSeat', 'seat'+sx, sx, E.H*0.88, 3.4);
    }
    ctx.restore();
  }

  return { bindShared, board, update, draw, get riding(){ return !!ride; } };
})();
