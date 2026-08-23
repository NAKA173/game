/*
 * save.js
 * 日記アプリ＝セーブ機能。localStorage に3スロット保存する。
 * 保存内容は「章・イベントフラグ」を持つ仕組みがまだ無いため最小限（操作キャラ・駅・位置・所持縁・
 * 経過時間）に留め、日記文はそこから定型文で自動生成する（systems_expansion_economy_apps_items.md §2.2）。
 */
window.Hazama = window.Hazama || {};

Hazama.Save = (function(){
  const KEY_PREFIX = 'hazama_save_';
  const SLOT_COUNT = 3;

  // 保存データから、直前の状況を一言で表す日記文を定型文＋変数で生成する。
  // 章・クエストの進行ログが実装されたら、そちらの直近イベントを差し込む形に拡張する。
  function diaryLine(charId, stationId, gt){
    const D = Hazama.Data;
    const char = D.characters[charId];
    const station = D.stations[stationId];
    const m = Math.floor(gt) % 1440;
    const hh = String(Math.floor(m/60)).padStart(2,'0'), mm = String(m%60).padStart(2,'0');
    const name = (station && station.name) || '名も無い場所';
    const who = (char && char.name) || '？？？';
    return `${who}は${hh}:${mm}、${name}にいた。`;
  }

  function slotKey(slot){ return KEY_PREFIX + slot; }

  function save(slot, data){
    const rec = {
      charId: data.charId, stationId: data.stationId,
      px: data.px, py: data.py, en: data.en, gt: data.gt,
      playtimeSec: data.playtimeSec,
      inventory: data.inventory,
      diary: diaryLine(data.charId, data.stationId, data.gt),
      savedAt: Date.now(),
    };
    try { localStorage.setItem(slotKey(slot), JSON.stringify(rec)); return true; }
    catch(e){ return false; }
  }

  function load(slot){
    try {
      const raw = localStorage.getItem(slotKey(slot));
      return raw ? JSON.parse(raw) : null;
    } catch(e){ return null; }
  }

  function remove(slot){
    try { localStorage.removeItem(slotKey(slot)); } catch(e){}
  }

  function list(){
    const out = [];
    for (let i=1; i<=SLOT_COUNT; i++) out.push({ slot:i, data: load(i) });
    return out;
  }

  function hasAny(){
    return list().some(s => s.data);
  }

  return { save, load, remove, list, hasAny, SLOT_COUNT };
})();
