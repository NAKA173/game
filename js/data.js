/*
 * data.js
 * 設計書・食べ歩き帖マスターの実データをもとにした最小データセット。
 * まずは「本町」エリア1駅分だけを実データ化。他の24駅も同じ形式で追加していける。
 */
window.Hazama = window.Hazama || {};

Hazama.Data = {

  // 駅データ（境目線 全25駅。食べ歩き帖マスターの実データを反映）
  // type: 'major'=主要駅 / 'minor'=小規模駅 / 'pass'=通過駅(店舗なし) / 'special'=特殊条件駅
  stations: {

    // ── 環状線 ──────────────────────────────
    honmachi: { name:'本町', line:'環状線', type:'major', shops:[
      { id:'komachi_pan', name:'こまち製パン', genre:'パン', bg:'#5e4a2e',
        menu:[{n:'あんぱん',price:120},{n:'カツサンド',price:380},{n:'特製クリームパン',price:780}], favorFor:'場所の際' },
      { id:'honmachi_shokudo', name:'本町食堂', genre:'定食・丼', bg:'#7a2e2e',
        menu:[{n:'かけそば',price:200},{n:'親子丼',price:520},{n:'上天丼',price:980}], favorFor:'状態の際' },
      { id:'ekimae_stand', name:'駅前スタンド', genre:'甘味', bg:'#6b3a63',
        menu:[{n:'ソフトクリーム',price:150},{n:'パフェ',price:450},{n:'特製あんみつ',price:720}], favorFor:'時間の際' },
    ]},
    futatsumori: { name:'二ツ森', line:'環状線', type:'minor', shops:[
      { id:'futatsumori_bunko', name:'二ツ森文庫喫茶', genre:'甘味・軽食', bg:'#6b3a63',
        menu:[{n:'珈琲ゼリー',price:180},{n:'ホットケーキ',price:480},{n:'名物モンブラン',price:850}], favorFor:'時間の際' },
    ]},
    shotengaimae: { name:'商店街前', line:'環状線', type:'major', shops:[
      { id:'hokkyo_ramen', name:'北境ラーメン', genre:'ラーメン', bg:'#7a2e2e',
        menu:[{n:'しょうゆ',price:420},{n:'味噌チャーシュー',price:680},{n:'特製全部のせ',price:1200}], favorFor:'状態の際' },
      { id:'shotengai_burger', name:'商店街バーガー', genre:'ハンバーガー', bg:'#7a4a2e',
        menu:[{n:'ベーシック',price:300},{n:'照り焼き',price:600},{n:'際バーガー',price:1100}], favorFor:'場所の際' },
      { id:'kasumi_amamidokoro', name:'甘味処 かすみ', genre:'和菓子', bg:'#5e3a63',
        menu:[{n:'みたらし団子',price:130},{n:'大福',price:350},{n:'上生菓子',price:700}], favorFor:'時間の際' },
      { id:'yorozu_shoten', name:'よろず商店', genre:'駄菓子・雑貨', bg:'#5e5a2e',
        menu:[{n:'駄菓子詰め',price:150},{n:'カップ麺',price:150},{n:'缶詰各種',price:300}], favorFor:'万能' },
    ]},
    kamotsuekiato: { name:'貨物駅跡', line:'環状線', type:'pass', shops:[] },
    oiwake: { name:'追分', line:'環状線・野際支線・幻の支線', type:'major', shops:[
      { id:'oiwake_drivein', name:'追分ドライブイン', genre:'定食・丼', bg:'#6b4a2e',
        menu:[{n:'カレーライス',price:350},{n:'かつ丼',price:650},{n:'スタミナ定食',price:1000}], favorFor:'状態の際' },
      { id:'wakaremichi_chaya', name:'分かれ道の茶屋', genre:'甘味', bg:'#6b3a63',
        menu:[{n:'ところてん',price:150},{n:'かき氷（夏）',price:300},{n:'クリームぜんざい',price:550}], favorFor:'時間の際' },
    ]},
    nakasu: { name:'中洲', line:'環状線', type:'minor', shops:[
      { id:'nakasu_kawadoko', name:'中洲の川床茶屋', genre:'海鮮・川魚', bg:'#2e4f5e',
        menu:[{n:'川魚の塩焼き',price:350},{n:'うな重（並）',price:900},{n:'うな重（特上）',price:1500}], favorFor:'場所の際' },
    ]},
    hashiba: { name:'橋場', line:'環状線・臨海支線', type:'major', shops:[
      { id:'hashiba_meshidokoro', name:'橋場めし処', genre:'定食・丼', bg:'#6b4a2e',
        menu:[{n:'焼き魚定食',price:400},{n:'生姜焼き定食',price:620},{n:'特上まぐろ丼',price:1050}], favorFor:'状態の際' },
      { id:'hashinotamotoya', name:'橋のたもと屋', genre:'おでん', bg:'#7a5a2e',
        menu:[{n:'おでん3種',price:200},{n:'おでん盛り',price:500},{n:'極上おでん',price:900}], favorFor:'状態の際' },
    ]},
    wasurezaka: { name:'忘坂', line:'環状線', type:'minor', shops:[
      { id:'wasurezaka_amazake', name:'忘坂の甘酒屋台', genre:'甘味・駄菓子', bg:'#6b3a63',
        menu:[{n:'甘酒',price:130},{n:'みたらし',price:250},{n:'忘れ団子（名物）',price:600}], favorFor:'時間の際' },
    ]},
    miyanosakai: { name:'宮ノ境', line:'環状線・田園支線', type:'major', shops:[
      { id:'miyanosakai_sandochaya', name:'宮ノ境 参道茶屋', genre:'和菓子', bg:'#5e3a63',
        menu:[{n:'草餅',price:150},{n:'桜餅（春限定）',price:400},{n:'上用まんじゅう',price:780}], favorFor:'時間の際' },
      { id:'monzen_soba', name:'門前そば', genre:'そば', bg:'#2e5e4a',
        menu:[{n:'かけそば',price:300},{n:'天ざる',price:700},{n:'特上鴨南蛮',price:1150}], favorFor:'状態の際' },
    ]},
    tsukino: { name:'月野', line:'環状線', type:'special', note:'夜間限定', shops:[
      { id:'tsukino_yonakisoba', name:'月野の夜鳴きそば', genre:'ラーメン', bg:'#7a2e2e',
        menu:[{n:'夜鳴きそば',price:400},{n:'月見ラーメン',price:700},{n:'満月特製',price:1250}], favorFor:'状態の際' },
      { id:'tsukimi_dangoya', name:'月見団子屋（夜のみ）', genre:'和菓子', bg:'#5e3a63',
        menu:[{n:'月見団子',price:150},{n:'三色団子',price:400},{n:'十五夜盛り',price:900}], favorFor:'時間の際・レア' },
    ]},

    // ── 野際支線 ──────────────────────────────
    nogiwa: { name:'野際', line:'野際支線', type:'major', shops:[
      { id:'nogiwa_bbq', name:'野際バーベキュー', genre:'肉', bg:'#7a2e2e',
        menu:[{n:'焼肉丼',price:500},{n:'ステーキ',price:950},{n:'特上カルビ盛り',price:1400}], favorFor:'状態の際' },
      { id:'nogiwa_parlor', name:'野際パーラー', genre:'甘味', bg:'#6b3a63',
        menu:[{n:'プリン',price:200},{n:'クリームソーダ',price:450},{n:'際パフェ',price:800}], favorFor:'時間の際' },
    ]},
    yamagiwa: { name:'山際', line:'野際支線', type:'major', shops:[
      { id:'yamagiwa_sansaisoba', name:'山際 山菜そば処', genre:'そば', bg:'#2e5e4a',
        menu:[{n:'山菜そば',price:350},{n:'きのこ天そば',price:680},{n:'特上けんちんそば',price:1100}], favorFor:'状態の際' },
      { id:'toge_dangoya', name:'峠の団子屋', genre:'和菓子', bg:'#5e3a63',
        menu:[{n:'焼き団子',price:150},{n:'五平餅',price:350},{n:'栗まんじゅう（秋）',price:700}], favorFor:'時間の際' },
    ]},
    mumei: { name:null, line:'野際支線', type:'minor', note:'名前が擦り切れて読めない無人駅', shops:[] },
    shimizu: { name:'清水', line:'野際支線', type:'special', note:'秘境・臨時停車のみ', shops:[
      { id:'shimizu_yusuichaya', name:'清水の湧水茶屋', genre:'精進・甘味', bg:'#3a5e4a',
        menu:[{n:'湧水豆腐',price:300},{n:'山菜膳',price:800},{n:'幻の清水そば',price:1600}], favorFor:'レア' },
    ]},

    // ── 田園支線 ──────────────────────────────
    inamori: { name:'稲守', line:'田園支線', type:'minor', shops:[
      { id:'inamori_chokubai', name:'稲守 農産直売スタンド', genre:'やさい・おにぎり', bg:'#4a5e2e',
        menu:[{n:'焼きおにぎり',price:120},{n:'新米おにぎり',price:300},{n:'特選おにぎり膳',price:650}], favorFor:'場所の際' },
    ]},
    hozakai: { name:'穂境', line:'田園支線', type:'major', shops:[
      { id:'hozakai_kamameshi', name:'穂境の釜めし屋', genre:'定食・丼', bg:'#6b4a2e',
        menu:[{n:'五目釜めし',price:400},{n:'鶏釜めし',price:700},{n:'特上松茸釜めし（秋）',price:1300}], favorFor:'状態の際' },
      { id:'hozakai_kanmido', name:'穂境甘味堂', genre:'和菓子', bg:'#5e3a63',
        menu:[{n:'おはぎ',price:150},{n:'みたらし',price:350},{n:'季節の練り切り',price:750}], favorFor:'時間の際' },
    ]},
    nokyomae: { name:'農協前', line:'田園支線', type:'minor', shops:[
      { id:'nokyomae_chokubai', name:'農協前 直売コーナー', genre:'やさい', bg:'#4a5e2e',
        menu:[{n:'季節の野菜スティック',price:100},{n:'漬物盛り',price:300},{n:'特選野菜膳',price:600}], favorFor:'場所の際' },
    ]},
    dambata: { name:'段畑', line:'田園支線', type:'minor', note:'無人の終着駅・自販機1台のみ', shops:[
      { id:'dambata_jihanki', name:'段畑の自販機', genre:'飲料', bg:'#2e4a5e',
        menu:[{n:'冷たいお茶',price:130},{n:'缶しるこ',price:150},{n:'謎のご当地ドリンク',price:250}], favorFor:'万能' },
    ]},

    // ── 臨海支線 ──────────────────────────────
    misakihama: { name:'岬浜', line:'臨海支線', type:'minor', shops:[
      { id:'misakihama_isodachi', name:'岬浜 磯の立ち食い', genre:'海鮮', bg:'#2e4f5e',
        menu:[{n:'あおさ汁',price:200},{n:'海鮮丼（並）',price:750},{n:'特上海鮮丼',price:1400}], favorFor:'場所の際' },
    ]},
    hamadori: { name:'浜通', line:'臨海支線', type:'minor', shops:[
      { id:'hamadori_gampeki', name:'浜通 岸壁食堂', genre:'定食・丼', bg:'#6b4a2e',
        menu:[{n:'焼き魚定食',price:400},{n:'海鮮フライ定食',price:650},{n:'大盛り漁師飯',price:1000}], favorFor:'状態の際' },
      { id:'hamadori_ramen', name:'浜通ラーメン', genre:'ラーメン', bg:'#7a2e2e',
        menu:[{n:'塩ラーメン',price:450},{n:'磯ラーメン',price:700},{n:'特製海老そば',price:1200}], favorFor:'状態の際' },
    ]},
    minatomachi: { name:'湊町', line:'臨海支線', type:'major', shops:[
      { id:'minatomachi_kaiten', name:'湊町 回転寿司', genre:'海鮮・寿司', bg:'#2e4f5e',
        menu:[{n:'にぎり盛り（並）',price:500},{n:'特上にぎり',price:1000},{n:'大漁盛り',price:1600}], favorFor:'場所の際' },
      { id:'minato_kakigori', name:'港のかき氷屋（夏）', genre:'甘味', bg:'#6b3a63',
        menu:[{n:'氷いちご',price:150},{n:'氷あずき',price:300},{n:'特製みぞれ',price:500}], favorFor:'時間の際' },
      { id:'minatomachi_pan', name:'湊町パン工房', genre:'パン', bg:'#5e4a2e',
        menu:[{n:'塩パン',price:130},{n:'カレーパン',price:350},{n:'際あんぱん',price:700}], favorFor:'場所の際' },
    ]},
    watarise: { name:'渡瀬', line:'臨海支線', type:'minor', note:'終着駅・渡し船乗り場', shops:[
      { id:'watarise_chaya', name:'渡瀬 渡し場茶屋', genre:'海鮮・甘味', bg:'#3a5a5e',
        menu:[{n:'あさり汁',price:250},{n:'焼き蛤',price:700},{n:'対岸を望む特製膳',price:1300}], favorFor:'場所の際・レア' },
    ]},

    // ── 幻の支線（すべて特殊条件駅、店舗なし） ──────────────────────────────
    tokimori: { name:'時守', line:'幻の支線', type:'special', note:'0時ちょうどにだけ路線図に現れる', shops:[] },
    kasumigaya: { name:'霞ヶ谷', line:'幻の支線', type:'special', note:'輪郭が薄く、降車が確実でない', shops:[] },
    ikuno: { name:'幾野', line:'幻の支線', type:'special', note:'見るたびに路線図上の駅数が矛盾する', shops:[] },
    higan: { name:'彼岸', line:'幻の支線', type:'special', note:'終点。クリア後限定で幻のメニューが1つだけ出る', shops:[
      { id:'higan_chaya', name:'彼岸の茶屋', genre:'？？？', bg:'#8a7a3f',
        menu:[{n:'幻のメニュー（クリア後限定・非売品）',price:null}], favorFor:'？' },
    ]},
  },

  // 路線ごとの駅の並び（駅間移動の隣接判定に使う）。環状線は循環、支線は末端で行き止まり。
  // 支線は分岐元の環状線の駅IDを配列の先頭に含める形で表現する（例：野際支線は追分から分岐）。
  // これにより追分のような乗換駅は、環状線の隣駅に加えて支線の隣駅も自動的に得られる。
  lines: {
    kanjosen: { name:'環状線', loop:true, stations:[
      'honmachi','futatsumori','shotengaimae','kamotsuekiato','oiwake',
      'nakasu','hashiba','wasurezaka','miyanosakai','tsukino',
    ]},
    nogiwasen: { name:'野際支線', loop:false, stations:[
      'oiwake','nogiwa','yamagiwa','mumei','shimizu',
    ]},
    denensen: { name:'田園支線', loop:false, stations:[
      'miyanosakai','inamori','hozakai','nokyomae','dambata',
    ]},
    rinkaisen: { name:'臨海支線', loop:false, stations:[
      'hashiba','misakihama','hamadori','minatomachi','watarise',
    ]},
    maboroshisen: { name:'幻の支線', loop:false, stations:[
      'oiwake','tokimori','kasumigaya','ikuno','higan',
    ]},
  },

  // 指定駅から電車で行ける隣駅（前後）を、駅が乗り入れている路線ごとに列挙する。
  // 環状線のように loop:true な路線は末端でも反対側に循環してつながる。
  adjacentStations(stationId){
    const result = [];
    Object.values(this.lines).forEach(line => {
      const i = line.stations.indexOf(stationId);
      if (i === -1) return;
      const n = line.stations.length;
      const prevOk = line.loop || i > 0;
      const nextOk = line.loop || i < n - 1;
      if (prevOk) result.push({ dir:'prev', lineName:line.name, id: line.stations[(i - 1 + n) % n] });
      if (nextOk) result.push({ dir:'next', lineName:line.name, id: line.stations[(i + 1) % n] });
    });
    return result;
  },

  // あわいもの（敵/仲間になり得る個体）の基礎ステータス
  foes: {
    yodomineko: {
      name: 'よどみネコ', r:16, hp:100, maxhp:100, atkCD:150, atkSpd:1.1,
      attribute:'状態の際', wobbleThreshold:0.30,
    },
    tasogareazarashi: {
      name: 'たそがれあざらし', r:18, hp:150, maxhp:150, atkCD:110, atkSpd:1.4,
      attribute:'場所の際', wobbleThreshold:0.30,
    },
  },

  // アイテム（現時点では戦闘で使う最小セットのみ。もちものアプリ全体は別途拡張）
  items: {
    nagorimizu: { name:'なごり水', category:'薬', effect:'heal', value:30, category2:'下位' },
  },

  // 際力・こうげき等のバランス定数（企画書の数値をそのまま定数化）
  balance: {
    playerSpd: 2.6,
    attackDamageMin: 9, attackDamageMax: 13,
    critMultiplier: 2.4,
    shiftCost: 14, shiftCooldown: 42, iFrames: 16,
    skillCost: 20, skillCooldown: 95, skillRadius: 46,
    skillDamageMin: 14, skillDamageMax: 20, skillCritMultiplier: 2.2,
    anchorBaseChance: 0.45, anchorKiwaFactor: 0.004, anchorWobbleFactor: 0.3,
    kiwaRegenPerAttack: 7, kiwaRegenIdleInterval: 40,
  },
};
