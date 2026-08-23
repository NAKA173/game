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

  // 操作キャラクター3人（story_bible_v1.md §1, §2.4）。
  // 本来は玲は8章合流まで操作不可（story_bible_v1.md §6.5）だが、まだ章・フラグの管理システムが
  // 無いため、システム土台として現時点では3人とも選択可能にしている（locked フラグは将来の判定用に残す）。
  // mods は battle.js が際シフト・際力回復に掛ける倍率。ステータス差別化の最終数値は未確定
  // （story_bible_v1.md §8 TODO）なので、プレイ感が破綻しない範囲の暫定値。
  characters: {
    saku: {
      name:'常盤 朔', area:'新市街', locked:false,
      blurb:'うるう秒に生まれた新市街の主人公。斜に構えず、まっすぐ突き進むタイプ。',
      palette:{ body:'#2a2540', face:'#d8b98a', hair:'#1a1730' },
      mods:{ shiftCooldownMult:0.85, kiwaRegenMult:1.0 }, // 際シフト中心の攻めタイプ
    },
    akari: {
      name:'宮野 灯里', area:'旧市街', locked:false,
      blurb:'旧市街育ちで、土地の言い伝えに詳しい。口数は少ないが折れない芯を持つ。',
      palette:{ body:'#5a3a55', face:'#c8b98a', hair:'#2a1a30' },
      mods:{ shiftCooldownMult:1.0, kiwaRegenMult:1.25 }, // 干渉解除・連携寄りの支援タイプ
    },
    rei: {
      name:'冬野 玲', area:'サダメ機関（8章合流後）', locked:false,
      blurb:'サダメ機関の元構成員。本来は8章合流後に操作可能になる想定だが、システム土台として先行実装。',
      palette:{ body:'#3a3a4a', face:'#d0c0b0', hair:'#101018' },
      mods:{ shiftCooldownMult:0.92, kiwaRegenMult:1.1 },
    },
  },

  // あわいもの（敵/仲間になり得る個体）の基礎ステータス
  foes: {
    yodomineko: {
      name: 'よどみネコ', r:16, hp:100, maxhp:100, atkCD:150, atkSpd:1.1,
      attribute:'状態の際', wobbleThreshold:0.30, sprite:'foeCat',
    },
    tasogareazarashi: {
      name: 'たそがれあざらし', r:18, hp:150, maxhp:150, atkCD:110, atkSpd:1.4, sprite:'foeSeal',
      attribute:'場所の際', wobbleThreshold:0.30,
    },
  },

  // アイテム全カテゴリ（systems_expansion_economy_apps_items.md §1 の数値確定版をそのまま定数化）。
  // nagorimizu は battle.js の useItem() が直接参照しているため後方互換のためトップレベルに残す
  // （medicine.revival[0] と重複するが、実効値のソースは変えていない）。
  items: {
    nagorimizu: { name:'なごり水', category:'薬', effect:'heal', value:30, category2:'下位' },

    // 際札：戦闘中1回の使い捨て
    talismans: {
      ashidome: { name:'足止め札', effect:'敵1体を短時間その場に縫い止める', value:'拘束2.0秒・1戦闘1枚まで', price:400 },
      yusaburi: { name:'揺さぶり札', effect:'敵のHPを最大値の10%ぶん強制的に揺らぎ閾値へ近づける（HP自体は減らない）', price:600 },
      utsushi: { name:'写し札', effect:'次の1回のこうげき/技のダメージを2回分適用（際力消費は1回分のまま）', price:800 },
      sakaime: { name:'境目札', effect:'15秒間、任意の属性（場所/時間/状態）に変更', price:500 },
    },

    // 御守：常時発動パッシブ、装備枠1〜2個
    charms: {
      hayaoki: { name:'早起きの御守', effect:'朝6:00〜9:00の際力自然回復量+50%', source:'宮ノ境 授与所' },
      mayoigo: { name:'迷い子の御守', effect:'状態の際系統の出現率+20%', source:'宮ノ境 授与所（ストーリー進行で解放）' },
      shokutsu: { name:'食通の御守', effect:'好物効果（定着補助値）+15%', source:'食べ歩き帖30品制覇報酬' },
      saime: { name:'際目の御守', effect:'際シフトのジャスト判定猶予+2フレーム', source:'クリア後、際位ランクS到達報酬' },
    },

    // 際図：際図＋際材2〜3種 → 装備 or 際札(上位)
    blueprints: {
      yakoumojiban: { name:'夜光文字盤の設計図', materials:{ kaihei_kakera:2, tasogare_kona:1 },
        result:'夜光文字盤（暗所での視力+10%）', source:'商店街前 際屋' },
      joutou_tomegu: { name:'上等な留め具の設計図', materials:{ madoromi_ito:3 },
        result:'上等な留め具（定着成功率+10%）', source:'野際 際屋相当店' },
      sakaimefuda_kai: { name:'境目札(上位)の設計図', materials:{ kaihei_kakera:1, tasogare_kona:1, madoromi_ito:1 },
        result:'境目札・改（効果時間25秒に延長）', source:'清水（秘境駅限定）' },
    },

    // 薬（拡張版20種）：復活4＋干渉状態別特効8＋際力/戦闘外回復5＋予防特殊3
    medicine: {
      revival: [
        { id:'nagorimizu_ge', name:'なごり水（下位）', effect:'気絶を50%で復活／HP30回復（戦闘外）', price:300 },
        { id:'yorimizu', name:'より水（中位）', effect:'気絶を70%で復活／HP60回復', price:700 },
        { id:'sakamodorimizu', name:'さかもどり水（上位）', effect:'気絶を100%で復活／HP全回復', price:1500 },
        { id:'yosuganoshizuku', name:'よすがの雫（最上位）', effect:'味方全員を100%で復活', price:4000, source:'際生堂限定' },
      ],
      interference: [
        { id:'nigoridome', name:'にごり止め', effect:'干渉状態（種類問わず）を1つ治す＝万能薬', price:250 },
        { id:'genwaku_mint', name:'幻惑ざましミント', effect:'幻惑を治す、効果時間中は再度かかりにくい', price:200 },
        { id:'suriashi_kouyaku', name:'すり足軽くする膏薬', effect:'緩慢を治す', price:200 },
        { id:'monowasure_omamori', name:'物忘れ防止のお守り薬', effect:'忘却を治す', price:200 },
        { id:'kanashibari_shio', name:'金縛り解きの塩', effect:'金縛りを治す', price:200 },
        { id:'bannou_nigoridome', name:'万能にごり止め（上位）', effect:'干渉状態を全て一括で治す', price:600 },
        { id:'kiwayoidome', name:'際酔い止め', effect:'電車移動中に稀発生する「際酔い」を予防', price:150 },
        { id:'kitsukesenkou', name:'気付け線香', effect:'揺らぎ状態の相手の揺らぎ持続時間を一時的に延長する（定着の補助）', price:500 },
      ],
      recoveryOut: [
        { id:'kiwazamashi_ge', name:'際覚まし（下位）', effect:'際力を30%回復（戦闘外専用）', price:200 },
        { id:'kiwazamashi_chu', name:'際覚まし（中位）', effect:'際力を50%回復', price:350 },
        { id:'kiwazamashi_jou', name:'際覚まし（上位）', effect:'際力を80%回復', price:700 },
        { id:'kuufukushinogi', name:'空腹しのぎ', effect:'一時的にHP上限を10%引き上げる（30分限定）', price:300 },
        { id:'mezamashi_ippuku', name:'目覚ましの一服', effect:'パーティ全員の際力を20%回復（戦闘外）', price:900 },
      ],
      special: [
        { id:'kiwayoidome_jou', name:'際酔い止め（上位）', effect:'際酔いを完全無効化（1日分）', price:400 },
        { id:'omamori_senjigusuri', name:'お守り煎じ薬', effect:'次の戦闘1回だけ、気絶時に自動でなごり水と同等の効果が発動', price:800 },
        { id:'bannou_saiseitan', name:'万能際生丹', effect:'状態異常無効＋HP際力ともに30%回復の万能薬', price:2000, source:'際生堂限定' },
      ],
    },

    // 装備（ハザマウォッチパーツ、3スロット×12種＝36種）
    equipment: {
      belt: ['革ベルト','編み込みベルト','鎖ベルト','夜光ベルト','木製ベルト（宮ノ境限定）','潮風ベルト（湊町限定）',
        '土のベルト（田園支線限定）','忘れ物ベルト（忘れ物10個届けると解放）','際生地のベルト','鉄板ベルト','絹のベルト',
        '幻のベルト（クリア後・最上位、被ダメ-15%）'],
      dial: ['素通しの文字盤','夜光文字盤（際図で作成）','砂時計の文字盤','満月の文字盤（月野限定）','潮汐の文字盤（臨海支線限定）',
        '稲穂の文字盤（田園支線限定）','古びた文字盤','鏡面の文字盤','際図専用の特製文字盤','二重写しの文字盤（撮影枚数条件で解放）',
        '幾何学模様の文字盤','うるう秒の文字盤（クリア後・最上位、際シフトの猶予+3フレーム）'],
      needle: ['標準の針','黒鉄の針','硝子の針','稲妻の針','忘れ物の針（忘れ物リレー全達成で解放）','提灯の針（月野・岬浜限定）',
        '竹の針（田園支線限定）','際図専用の特製針','記憶のかけらの針（かけら交換所限定）','潮の針（渡瀬限定）',
        '鐘の針（鐘尾硯撃破後に入手）','確定を砕く針（クリア後・最上位、こうげき威力+12%）'],
    },

    // キーアイテム・機能解放（25種）：売却・使用不可、所持そのものに意味がある
    keyItems: {
      story: ['ハザマウォッチ（序章）','灯里の祖母の紹介状（2章）','黄昏の写真（3章）','玲の名刺（4章、破られている）',
        '迷子の靴（5章）','祭りのお守り（6章）','取り壊し決定通知書（6章）','機関の身分証（写し）（7章）',
        '鐘尾硯の判子（7章、撃破後入手）','崩れかけの地図（8章）','一色誉の名刺（6章）',
        '悠の忘れ物（サブクエスト起点、貨物駅跡で発見）','宵宮一の記録の断片（終盤）','彼岸行きの切符（10章直前）',
        'うるう秒証明書（クリア後解放条件）'],
      unlock: ['自転車（際位ランクC到達＋購入で入手）','二重写し用フィルター','ポケットうんがい鏡の欠片×3',
        '急行乗車証（際位ランクB到達で自動入手）','聞き耳受信機','ゴースト場登録証','かけら鑑定キット',
        '際暦手帳','たのみごと受付票','ネットショップ会員証'],
    },

    // ガシャコイン・各種パス（15種）
    passes: [
      { name:'際くじコイン', use:'際くじ（駄菓子屋）で使用', price:100 },
      { name:'特製際くじコイン', use:'際くじの高レア景品専用抽選券', source:'イベント報酬のみ' },
      { name:'際定期券（1日）', use:'その日1日、境目線乗り放題', price:300 },
      { name:'際定期券（1週間）', use:'7日間乗り放題', price:1800 },
      { name:'際定期券（1ヶ月）', use:'30日間乗り放題', price:6000 },
      { name:'急行券', use:'急行に一時的に乗車できる（ランク前でも）', price:500 },
      { name:'臨時列車の招待状', use:'幻の支線イベント専用、深夜のみ使用可', source:'都市伝説クエスト報酬' },
      { name:'ゴースト場参加チケット', use:'際位マッチング1回分', source:'無料（1日1枚配布）' },
      { name:'ゴースト場追加チケット', use:'1日の上限を超えて対戦する用', price:200 },
      { name:'際暦カレンダーシール', use:'コレクション用、実績と連動', source:'季節イベント報酬' },
      { name:'際位ブースト券', use:'経験値を1戦闘分だけ1.5倍にする', price:400 },
      { name:'バイト優先出勤証', use:'その日のバイトの日給を+20%', source:'バイト熟練度報酬' },
      { name:'際弁当引換券', use:'車内販売の際弁当と交換', source:'際くじ景品' },
      { name:'常磐屋招待状', use:'常磐屋（幻の宿）に確実に一度だけ辿り着ける', source:'激レア入手' },
      { name:'彼岸の茶屋 幻のメニュー引換券', use:'クリア後限定メニューと交換', source:'かけら交換所30個' },
    ],

    // 際材（系統別、基本+上位＝9種）。既存の呼び水系統（favorFor）と対応させやすいよう属性名を揃えている。
    materials: {
      kaihei_kakera: { name:'開閉の欠片', tier:'基本', attribute:'場所の際' },
      tasogare_kona: { name:'黄昏の粉', tier:'基本', attribute:'時間の際' },
      madoromi_ito: { name:'まどろみの糸', tier:'基本', attribute:'状態の際' },
      kaihei_kesshou: { name:'開閉の結晶', tier:'上位', attribute:'場所の際' },
      tasogare_shizuku: { name:'黄昏の雫', tier:'上位', attribute:'時間の際' },
      madoromi_mayu: { name:'まどろみの繭', tier:'上位', attribute:'状態の際' },
      kiwa_no_suna: { name:'際の砂', tier:'万能', note:'低確率ドロップ' },
      sukitoori_no_kona: { name:'透きとおりの粉', tier:'専用', note:'透きとおり個体専用進化素材' },
      kiwa_no_shin: { name:'際の芯', tier:'共通', note:'合成進化共通素材' },
    },

    // コレクション・フレーバー系（12種）
    collectibles: ['駅スタンプ（26駅ぶん）','二重写し用フィルム','都市伝説の手紙','忘れ物台帳の白紙ページ','古い切符',
      '際の欠片標本','旧市街の写真','悠の絵日記の切れ端','宮ノ境のお札','忘坂の甘酒レシピ','常磐屋の宿帳','際暦の栞'],

    // クエスト系消費アイテム（11種）
    questItems: ['迷子探し用の呼び子（5章）','灯里の祖母の手紙（3章）','鐘尾硯の書類（7章の証拠品）',
      '一色誉の設計図（6章の証拠品）','宵宮一の記録（終盤）','際力測定器','忘れ物リレー中継票',
      '聞き耳ラジオの部品','ゴースト場のログ帳','かけらの地図','際位手帳の予備バッテリー'],

    // 記憶のかけら 交換レート
    fragmentExchange: [
      { item:'限定装備（際目の御守以外の隠し御守1種）', cost:15 },
      { item:'レア際材（系統指定1種）', cost:5 },
      { item:'際図（ランダム1枚、既出のものは除外）', cost:8 },
      { item:'彼岸の茶屋 幻のメニュー引換券（クリア後限定）', cost:30 },
    ],
  },

  // 際位ランクと経験値カーブ（systems_expansion_economy_apps_items.md §3.1）
  kiwaRanks: [
    { rank:'E', exp:0, unlock:'初期状態' },
    { rank:'D', exp:800, unlock:'ヨドミでの合成進化' },
    { rank:'C', exp:2500, unlock:'自転車、郊外エリア相当の解禁' },
    { rank:'B', exp:6000, unlock:'際シフト上位版、急行運行開始' },
    { rank:'A', exp:12000, unlock:'大晦日イベント解禁' },
    { rank:'S', exp:20000, unlock:'クリア後コンテンツ全般' },
  ],

  // バイト7種（§3.2）。熟練度は10回で中位、25回でMAXという簡易カーブ（ミニゲーム自体は未実装）。
  jobs: [
    { name:'駅弁売り子', baseWage:400, maxWage:700, difficulty:'低（タイミングゲーム）' },
    { name:'商店街の呼び込み', baseWage:350, maxWage:600, difficulty:'低' },
    { name:'港の荷揚げ', baseWage:600, maxWage:1000, difficulty:'中（力仕事系、体力ゲージ消費）' },
    { name:'稲刈り手伝い（秋限定）', baseWage:800, maxWage:1300, difficulty:'中、季節限定で稀少価値' },
    { name:'神社の巫女/助勤', baseWage:450, maxWage:750, difficulty:'低、御守割引券が低確率で追加' },
    { name:'灯台守の補助（夜間）', baseWage:700, maxWage:1100, difficulty:'中、夜型プレイヤー向け' },
    { name:'忘れ物預かり所の受付', baseWage:300, maxWage:550, difficulty:'低、忘れ物リレーの進捗と連動' },
  ],

  // 売却倍率・ネットショップ送料（§3.3, §3.4）
  economy: {
    sellMultBase: 0.35, sellMultFavorite: 0.55,
    lostItemSellMin: 100, lostItemSellMax: 300,
    shippingFee: 150, shippingDays: 1,
  },

  // 際力・こうげき等のバランス定数（企画書の数値をそのまま定数化）
  balance: {
    playerSpd: 2.6, dashMultiplier: 1.85,
    attackDamageMin: 9, attackDamageMax: 13,
    critMultiplier: 2.4,
    shiftCost: 14, shiftCooldown: 42, iFrames: 16,
    skillCost: 20, skillCooldown: 95, skillRadius: 46,
    skillDamageMin: 14, skillDamageMax: 20, skillCritMultiplier: 2.2,
    anchorBaseChance: 0.45, anchorKiwaFactor: 0.004, anchorWobbleFactor: 0.3,
    kiwaRegenPerAttack: 7, kiwaRegenIdleInterval: 40,
  },
};
