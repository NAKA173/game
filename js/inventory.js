/*
 * inventory.js
 * もちもの（所持アイテム）・装備の管理。data.js の itemInfo() を通じて全カテゴリを横断参照する。
 * 薬・際札の使用効果、装備の数値反映（明記された3種のみ）、売却額計算をここに集約する。
 */
window.Hazama = window.Hazama || {};

Hazama.Inventory = (function(){
  const D = Hazama.Data;

  const state = {
    items: {},                                    // itemId -> 所持数
    equipped: { belt:null, dial:null, needle:null }, // itemId ("equip:slot:idx") or null
    foodLog: 0,                                   // 食べ歩き帖の簡易カウンタ（品目数）
  };

  function add(id, n){ n = n||1; state.items[id] = (state.items[id]||0) + n; }
  function remove(id, n){
    n = n||1;
    if (!state.items[id]) return false;
    state.items[id] = Math.max(0, state.items[id]-n);
    return true;
  }
  function count(id){ return state.items[id] || 0; }
  function has(id, n){ return count(id) >= (n||1); }

  function equip(slot, id){
    if (id && !id.startsWith('equip:'+slot+':')) return false;
    state.equipped[slot] = id || null;
    return true;
  }
  // 明記された数値効果を持つ装備だけ実際にステータスへ反映する（36種のうち大半はドキュメント側にも
  // 数値が無い＝所持・装着はできるが効果はフレーバーのみ、という誠実な範囲に留めている）。
  function equipMod(){
    const mods = { dmgReduction:0, shiftFrameBonus:0, atkMult:1 };
    if (state.equipped.belt === 'equip:belt:11') mods.dmgReduction = 0.15;   // 幻のベルト
    if (state.equipped.dial === 'equip:dial:11') mods.shiftFrameBonus = 3;  // うるう秒の文字盤
    if (state.equipped.needle === 'equip:needle:11') mods.atkMult = 1.12;   // 確定を砕く針
    return mods;
  }

  // 薬・際札の使用効果。P（主人公共有オブジェクト）とSt（全体状態）を渡して直接書き換える。
  function useItem(id, P, St){
    if (!has(id)) return { ok:false, msg:'持っていない' };
    const info = D.itemInfo(id);
    if (!info) return { ok:false, msg:'不明なアイテム' };
    let msg;
    switch(id){
      case 'nagorimizu_ge': P.hp = Math.min(P.maxhp, P.hp+30); msg='HPが30回復した'; break;
      case 'yorimizu':       P.hp = Math.min(P.maxhp, P.hp+60); msg='HPが60回復した'; break;
      case 'sakamodorimizu': P.hp = P.maxhp; msg='HPが全回復した'; break;
      case 'yosuganoshizuku':P.hp = P.maxhp; msg='HPが全回復した'; break;
      case 'kiwazamashi_ge': St.kiwa = Math.min(100, St.kiwa+30); msg='際力が30%回復した'; break;
      case 'kiwazamashi_chu':St.kiwa = Math.min(100, St.kiwa+50); msg='際力が50%回復した'; break;
      case 'kiwazamashi_jou':St.kiwa = Math.min(100, St.kiwa+80); msg='際力が80%回復した'; break;
      case 'mezamashi_ippuku':St.kiwa = Math.min(100, St.kiwa+20); msg='際力が20%回復した'; break;
      case 'nigoridome': case 'bannou_nigoridome':
        msg = '干渉状態を治した（干渉システムは今後実装予定）'; break;
      default:
        msg = info.name + 'を使った（数値効果は今後実装）';
    }
    remove(id);
    return { ok:true, msg };
  }

  function sellValue(id, favorite){
    const info = D.itemInfo(id);
    if (!info || !info.price) return 0;
    return Math.round(info.price * (favorite ? D.economy.sellMultFavorite : D.economy.sellMultBase));
  }

  function reset(){ state.items = {}; state.equipped = {belt:null,dial:null,needle:null}; state.foodLog = 0; }
  function serialize(){ return { items:{...state.items}, equipped:{...state.equipped}, foodLog:state.foodLog }; }
  function deserialize(data){
    state.items = (data && data.items) || {};
    state.equipped = (data && data.equipped) || {belt:null,dial:null,needle:null};
    state.foodLog = (data && data.foodLog) || 0;
  }

  return { state, add, remove, count, has, equip, equipMod, useItem, sellValue, reset, serialize, deserialize };
})();
