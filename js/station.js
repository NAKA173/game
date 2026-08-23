/*
 * station.js
 * 駅構内シーン。街（explore.js）とは独立したモードとして、改札・プラットフォームのドット絵背景の上に
 * 発車案内（路線ごとの隣駅一覧）・路線図・乗車券購入のUIパネルを重ねる。
 * 乗車を確定すると train.js の乗車シーンへ遷移する。
 */
window.Hazama = window.Hazama || {};

Hazama.Station = (function(){
  const E = Hazama.Engine;
  const D = Hazama.Data;
  const ctx = E.ctx;

  let P, St, onBoardTrain, onExitToTown;
  let currentStationId = null;
  let routeMapDrawn = false;

  // 単発運賃（暫定・一律）。定期券等（data.js の items.passes）との連携は今後の課題。
  const FARE = 100;

  // 路線ごとの色分け。添付の路線図イラストの配色イメージに合わせている。
  const LINE_COLORS = {
    '環状線':'#3ea88a', '野際支線':'#c98a3e', '田園支線':'#6fa03e',
    '臨海支線':'#3e7ec9', '幻の支線':'#c9503e',
  };

  function bindShared(sharedP, sharedSt, boardFn, exitFn){
    P = sharedP; St = sharedSt; onBoardTrain = boardFn; onExitToTown = exitFn;
  }

  function hashStr(s){
    let h = 2166136261;
    for (let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  // ==== ドット絵プロップ（改札・座席の類） ============================
  E.defprop('ticketGate', 12, 22, (g, rng) => {
    const body='#2a2540', bodyHi=E.shade(body,1.35);
    E.rc(g,0,0,3,22,body); E.rc(g,9,0,3,22,body);
    E.rc(g,0,0,3,3,bodyHi); E.rc(g,9,0,3,3,bodyHi);
    E.rc(g,3,17,6,3,'#7fd1c1');
    E.speck(g, rng, 0,0,3,22, E.shade(body,0.7), 4);
    E.speck(g, rng, 9,0,3,22, E.shade(body,0.7), 4);
  });

  let platformPattern = null;
  function getPlatformPattern(){
    if (platformPattern) return platformPattern;
    const c = document.createElement('canvas'); c.width=16; c.height=16;
    const g = c.getContext('2d');
    const rng = E.makeRNG(9911);
    E.rc(g,0,0,16,16,'#463f56');
    E.speck(g, rng, 0,0,16,16,'#524a63', 10);
    E.speck(g, rng, 0,0,16,16,'#3a3448', 8);
    platformPattern = ctx.createPattern(c, 'repeat');
    return platformPattern;
  }

  // ==== 発車案内 =======================================================
  function renderDeparture(){
    const adj = D.adjacentStations(currentStationId);
    const list = document.getElementById('departureList');
    list.innerHTML = '';
    if (!adj.length){
      list.innerHTML = '<div class="depEmpty">この駅からの発着はありません（終着駅）。</div>';
      return;
    }
    adj.forEach((a, i) => {
      const st = D.stations[a.id];
      const destName = (st && st.name) || '？？？';
      const express = hashStr(currentStationId+a.id+a.dir) % 3 === 0;
      const nextIn = 1 + ((Math.floor(St.gt) + i*3) % 9);
      const row = document.createElement('button');
      row.className = 'depRow';
      row.innerHTML =
        `<span class="depLine" style="color:${LINE_COLORS[a.lineName]||'#e8c86a'}">${a.lineName}</span>` +
        `<span class="depDest">${a.dir==='next'?'▶':'◀'} ${destName}</span>` +
        `<span class="depType">${express?'急行':'各停'}</span>` +
        `<span class="depTime">次発 ${nextIn}分</span>`;
      row.addEventListener('click', () => showTicketConfirm(a, destName, express));
      list.appendChild(row);
    });
  }

  function showTicketConfirm(adjInfo, destName, express){
    const list = document.getElementById('departureList');
    list.innerHTML =
      `<div class="ticketBox">` +
        `<div class="tcLine">${adjInfo.lineName} ${destName}ゆき（${express?'急行':'各停'}）</div>` +
        `<div class="tcFare">運賃 ${FARE}縁（所持 ${St.en}縁）</div>` +
        `<div class="tcBtns"><button id="tcBuy">乗車券を購入して乗る</button><button id="tcCancel">やめる</button></div>` +
      `</div>`;
    document.getElementById('tcBuy').addEventListener('click', () => {
      if (St.en < FARE){ E.banner('縁が足りない', 'あと'+(FARE-St.en)+'縁 足りない', 900); return; }
      St.en -= FARE;
      document.getElementById('enCur').textContent = '縁 ' + St.en;
      if (onBoardTrain) onBoardTrain(adjInfo, destName, express);
    });
    document.getElementById('tcCancel').addEventListener('click', renderDeparture);
  }

  // ==== 路線図 =========================================================
  function drawRouteMap(){
    const cv = document.getElementById('routeMapCv');
    const g = cv.getContext('2d');
    g.clearRect(0,0,cv.width,cv.height);
    g.fillStyle = '#161320'; g.fillRect(0,0,cv.width,cv.height);
    const cx = cv.width/2, cy = cv.height/2 - 6, R = Math.min(cv.width,cv.height)*0.32;

    const loop = D.lines.kanjosen;
    const n = loop.stations.length;
    const angleOf = {};
    loop.stations.forEach((id, i) => { angleOf[id] = -Math.PI/2 + i*(Math.PI*2/n); });

    g.lineWidth = 3; g.strokeStyle = LINE_COLORS['環状線'];
    g.beginPath();
    loop.stations.forEach((id, i) => {
      const a = angleOf[id], x = cx+Math.cos(a)*R, y = cy+Math.sin(a)*R;
      if (i===0) g.moveTo(x,y); else g.lineTo(x,y);
    });
    g.closePath(); g.stroke();

    function branchXY(line, idx){
      const a = angleOf[line.stations[0]] || 0, dist = R + idx*26;
      return { x: cx+Math.cos(a)*dist, y: cy+Math.sin(a)*dist };
    }
    Object.entries(D.lines).forEach(([key, line]) => {
      if (key === 'kanjosen') return;
      g.strokeStyle = LINE_COLORS[line.name] || '#999'; g.lineWidth = 3;
      g.setLineDash(key === 'maboroshisen' ? [5,4] : []);
      g.beginPath();
      const a0 = angleOf[line.stations[0]] || 0;
      g.moveTo(cx+Math.cos(a0)*R, cy+Math.sin(a0)*R);
      line.stations.forEach((id, i) => { if (i===0) return; const {x,y} = branchXY(line, i); g.lineTo(x,y); });
      g.stroke(); g.setLineDash([]);
    });

    function stationXY(id){
      if (angleOf[id] != null) { const a=angleOf[id]; return { x:cx+Math.cos(a)*R, y:cy+Math.sin(a)*R }; }
      for (const line of Object.values(D.lines)){
        const idx = line.stations.indexOf(id);
        if (idx > 0) return branchXY(line, idx);
      }
      return { x:cx, y:cy };
    }
    Object.keys(D.stations).forEach(id => {
      const st = D.stations[id]; const { x, y } = stationXY(id);
      const isCurrent = id === currentStationId;
      g.beginPath(); g.arc(x, y, isCurrent?6:4, 0, Math.PI*2);
      g.fillStyle = isCurrent ? '#e8c86a' : (st.type==='pass' ? '#161320' : '#e9e6da'); g.fill();
      if (st.type==='pass' || st.type==='special'){ g.strokeStyle='#9aa7c7'; g.lineWidth=1.5; g.stroke(); }
      g.fillStyle = isCurrent ? '#e8c86a' : '#9aa7c7';
      g.font = (isCurrent?'bold ':'') + '9px sans-serif'; g.textAlign = 'center';
      g.fillText(st.name || '？', x, y-9);
    });
  }

  // ==== モード遷移 =====================================================
  function enter(stationId){
    currentStationId = stationId;
    routeMapDrawn = false;
    const station = D.stations[stationId];
    document.getElementById('stationTitle').textContent = (station && station.name || '？？？') + '駅 構内';
    document.getElementById('stationPanel').style.display = 'flex';
    document.getElementById('battleHud').style.display = 'none';
    document.getElementById('battleBtns').style.display = 'none';
    document.getElementById('exploreBtns').style.display = 'none';
    document.getElementById('foot').innerHTML = '発車案内から行き先を選ぶ ／ 町へ戻るで改札の外へ';
    showTab('departure');
  }
  function exit(){
    document.getElementById('stationPanel').style.display = 'none';
    document.getElementById('exploreBtns').style.display = 'grid';
    if (onExitToTown) onExitToTown(currentStationId);
  }
  function showTab(tab){
    const isDep = tab === 'departure';
    document.getElementById('tabDeparture').classList.toggle('active', isDep);
    document.getElementById('tabRouteMap').classList.toggle('active', !isDep);
    document.getElementById('departureList').style.display = isDep ? 'flex' : 'none';
    document.getElementById('routeMapView').style.display = isDep ? 'none' : 'flex';
    if (isDep) renderDeparture();
    else if (!routeMapDrawn){ drawRouteMap(); routeMapDrawn = true; }
  }

  function update(){ /* 静止シーン。プレイヤー操作はDOMパネル側で完結する */ }

  function draw(){
    ctx.save();
    ctx.fillStyle = getPlatformPattern();
    ctx.fillRect(0, 0, E.W, E.H);
    ctx.fillStyle = '#1c1830'; ctx.fillRect(0, E.H*0.50, E.W, E.H*0.10);
    ctx.fillStyle = '#e8c86a'; ctx.fillRect(0, E.H*0.485, E.W, 4);

    for (let i=0;i<6;i++) E.drawSprite('ticketGate', 'g'+i, E.W*0.5 + (i-2.5)*46, E.H*0.40, 3.6);

    E.shadow(E.W*0.5, E.H*0.40);
    const pal = (D.characters[P.charId] && D.characters[P.charId].palette) || D.characters.saku.palette;
    E.drawSprite('person', 'player-'+P.charId, E.W*0.5, E.H*0.40, 4, pal);

    ctx.fillStyle = '#9aa7c7'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
    ctx.fillText('改札', E.W*0.5, E.H*0.30);
    ctx.restore();
  }

  document.getElementById('stationExitBtn').addEventListener('click', exit);
  document.getElementById('tabDeparture').addEventListener('click', () => showTab('departure'));
  document.getElementById('tabRouteMap').addEventListener('click', () => showTab('routemap'));

  return { bindShared, enter, update, draw, get currentStationId(){ return currentStationId; } };
})();
