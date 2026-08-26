/*
 * data.js
 * 『あわいの旅路』第1章「誰そ彼」体験版スライスのデータ定義。
 * 章立て・経済・アプリ群は設計書上は膨大だが、このスライスは本町エリア限定・
 * 空単独・鐘江との出会いまでを縦に通すことだけを目的に絞ってある。
 */
window.Hazama = window.Hazama || {};

Hazama.Data = {
  // ==== 主人公 ==========================================================
  characters: {
    sora: {
      name:'空', reading:'そら', area:'新市街・本町',
      blurb:'本町のマンション育ち。小さい頃から「際」がうっすら見えていたが、誰にも言えずにいる。',
      palette: { body:'#23262e', bodyLo:'#171921', bodyHi:'#343945', face:'#e3c39a', hair:'#1a1c22', collar:'#c94b4b' },
    },
  },

  // ==== あわいもの（第1章は鐘江のみ・物語固定・収集要素なし） ============
  allies: {
    kanae: {
      name:'鐘江', reading:'かなえ', motif:'鐘の音', role:'バランス／鎮静技',
      palette: { body:'#5a4a7a', bodyLo:'#40355c', bodyHi:'#7a68a0', accent:'#e8c86a' },
      hp:70, atkMin:5, atkMax:9, atkCD:60,
      note:'言葉を持たない。鐘の音で応える。',
    },
  },

  // ==== 敵 ================================================================
  foes: {
    kanae_wild: {
      name:'暴走した鐘江', hp:160, maxhp:160, r:20, atkCD:130, atkSpd:1.0,
      wobbleThreshold:0.35, sprite:'foeBell',
      atkMin:9, atkMax:14,
    },
  },

  // ==== 本町：道モジュール（直線区間の連なり）======================
  // depth は区間をまたいだ累積のワールド深度。laneX は道の中心を0とした左右オフセット。
  // 各区間は halfWidth（歩ける横幅の半分）と、街並みとして並べる建物・装飾のリストを持つ。
  town: {
    id:'honmachi', name:'本町',
    modules: [
      {
        id:'school_street', name:'通学路', len:300, halfWidth:70,
        sky:{ top:'#3a2f4a', horizon:'#e8a25a' },
        props: [
          { kind:'house', depth:60,  laneX:-58 },
          { kind:'house', depth:60,  laneX: 58 },
          { kind:'tree',  depth:130, laneX:-66 },
          { kind:'house', depth:190, laneX:-58 },
          { kind:'house', depth:190, laneX: 58 },
          { kind:'tree',  depth:250, laneX: 66 },
        ],
      },
      {
        id:'main_street', name:'本町大通り', len:380, halfWidth:92,
        sky:{ top:'#33283f', horizon:'#e0955a' },
        props: [
          { kind:'shop',    depth:40,  laneX:-78 },
          { kind:'shop',    depth:40,  laneX: 78 },
          { kind:'exhibit', depth:160, laneX: 60, label:'明澄会 再開発展示「明るい街、確かな明日」' },
          { kind:'shop',    depth:220, laneX:-78 },
          { kind:'tree',    depth:300, laneX:-84 },
          { kind:'tree',    depth:300, laneX: 84 },
        ],
      },
      {
        id:'dusk_backalley', name:'黄昏の裏路地', len:260, halfWidth:46,
        dusk:true,
        sky:{ top:'#1c1830', horizon:'#a85a3a' },
        props: [
          { kind:'wall', depth:60,  laneX:-40 },
          { kind:'wall', depth:60,  laneX: 40 },
          { kind:'wall', depth:160, laneX:-40 },
          { kind:'wall', depth:160, laneX: 40 },
        ],
        // このゾーンの奥（区間内の深度180〜260＝終端付近）に踏み込むと、鐘の音の気配→暴走鐘江との遭遇バトルへ。
        // fromDepth/toDepth は区間内ローカル深度（区間の先頭=0〜len）。
        encounter: { fromDepth:180, toDepth:260, foe:'kanae_wild', id:'kanae_first' },
      },
    ],
    // 空の家前＝ゲーム開始位置。
    startDepth: 20, startLane: 0,
  },

  // ==== 序章の会話（本町・学校帰り、探索開始前） ==========================
  introScript: [
    { speaker:'', text:'（学校帰り、本町の駅前広場。夕方の光が長く伸びている）' },
    { speaker:'空', text:'……今日も長かったな。' },
    { speaker:'', text:'（広場の一角に、明澄会の再開発展示パネル。「明るい街、確かな明日」）' },
    { speaker:'空', text:'また新しい看板、増えてる。' },
    { speaker:'', text:'（ふと、視界の端で何かが揺らいだ気がした）' },
    { speaker:'空', text:'……気のせい、だよな。' },
    { speaker:'', text:'空は昔から、時々「薄いもの」が見える。誰にも言ったことはない。今日は、いつもよりはっきりしている気がした。' },
  ],
  // ==== 黄昏の裏路地・鐘江との遭遇（戦闘直前に再生） ========================
  encounterScript: [
    { speaker:'', text:'（鐘の音だけが響く、静かな路地）' },
    { speaker:'空', text:'……こっちから、聞こえる。' },
    { speaker:'', text:'（路地の奥に、輪郭の揺らいだ何かがうずくまっている。鐘のような音が、悲鳴のように響く）' },
    { speaker:'空', text:'うわっ……なんだ、これ。' },
    { speaker:'', text:'空は初めて、これほどはっきりと「際」を見た。' },
  ],
  // ==== 鎮静後・鐘江が仲間になる会話 ======================================
  joinScript: [
    { speaker:'', text:'（鐘の音が、静かに凪いでいく）' },
    { speaker:'空', text:'……大丈夫か？' },
    { speaker:'', text:'（鐘の形をした揺らぎが、小さく頷くように鳴った）' },
    { speaker:'空', text:'鐘江、って呼んでいいか。何となく、そう思ったんだ。' },
    { speaker:'', text:'鐘江は答えない。ただ、優しい音で応えた。' },
  ],

  // ==== バトル・移動の数値バランス ========================================
  balance: {
    playerSpd: 3.2, dashMultiplier: 1.7,
    attackDamageMin: 8, attackDamageMax: 14, critMultiplier: 1.8,
    pacifyRange: 46,       // 鎮静技が届く間合い
    pacifyGaugeMax: 300,   // 揺らぎ状態の持続フレーム数（この間に鎮静技を当てる）
    allyAtkCD: 55, allyRange: 40,
  },
};
