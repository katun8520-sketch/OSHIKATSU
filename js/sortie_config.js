'use strict';
/* =========================================================
   《推し活》出擊關卡（殭屍街道＋人類營地）：所有可調整數值與地圖資料
   地圖用「矩形」描述：先整片填滿 base，再依序挖出地面、放上物件。
   座標單位都是「格」（1 格 = tile 像素），可以用小數。
   ========================================================= */
OSHI.SORTIE = {
  tile: 64,
  mapArt: false,   // false＝地圖用初稿的色塊（角色、石頭、紙箱、膠帶仍用正式圖）；true＝地面材質＋物件圖

  // ---- 按鍵（可自行更改）----
  keys: {
    up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'],
    faceUp: ['ArrowUp'], faceDown: ['ArrowDown'], faceLeft: ['ArrowLeft'], faceRight: ['ArrowRight'],
    attack: ['KeyJ'], interact: ['KeyE', 'Enter', 'Space'], drop: ['KeyQ'], run: ['ShiftLeft', 'ShiftRight'],
    throw: ['KeyF'], map: ['KeyM'], pause: ['Escape']
  },

  // ---- 玩家 ----
  player: {
    walk: 230, run: 370, radius: 16,
    runNoise: 170, runNoiseEvery: .35,      // 奔跑時腳步聲半徑（像素）與間隔（秒）
    attackCooldown: .45, attackRange: 88, attackArc: 1.1,  // 擀麵棍：冷卻、距離、角度（弧度）
    invuln: 1.1,                             // 受傷後無敵時間
    hpPerBite: 2                             // 生命 = 可承受撕咬次數 × 2（人類徒手打一下扣 1）
  },

  // ---- 黑袋（V1.1 §11）----
  bag: { emptyMul: .95, perPerson: .1, minMul: .45, range: 60 },

  // ---- 石頭（V1.1 §8-1）----
  stone: { maxDist: 380, flight: .45, noise: 400 },

  // ---- 視線與發現 ----
  sight: {
    rays: 20,
    detectTime: 1.5,        // 站在視線正中央、很近時約幾秒被發現（第一章較寬鬆）
    decay: .7,              // 離開視線後，發現量每秒減少
    touch: 46,              // 貼到身邊一定會被發現
    startle: .8             // 被發現後，敵人愣住（喊「誰！？」）的時間：玩家的逃走窗口
  },

  zombie: {
    range: 300, fov: 1.75, eatRange: .5, eatFov: 1.0,
    wander: 55, investigate: 80, chase: 255,
    hits: [4, 5], downTime: 1.5,
    attackRange: 46, attackWindup: .35, attackCooldown: 1.1,
    loseTime: 3, lookAround: 2.5
  },

  human: {
    range: 330, fov: 1.6,
    walk: 80, search: 115, chase: 265, flee: 285,
    attackRange: 50, attackWindup: .4, attackCooldown: 1.15, damage: 1,
    frontHits: 3,           // 反擊型正面衝突（已發現你）要打幾下；偷襲和逃跑型一律一下
    suspicious: 1.2, lookAround: 3, loseTime: 4,
    callRadius: 420, screamRadius: 520
  },

  // ---- 人類警戒等級（V1.1 §10-1）：依本章成功帶回趟數，只影響人類營地 ----
  alert: {
    sightMul: [1, 1.12, 1.25, 1.4, 1.55],
    searchMul: [1, 1.2, 1.4, 1.6, 1.8],
    callMul: [1, 1.15, 1.3, 1.45, 1.6],
    extraPatrol: [0, 1, 1, 2, 2]
  },

  // ---- 地面與物件種類 ----
  // solid：擋路；sight：擋視線；h：斜 45 度俯視時的高度（像素）
  types: {
    side:   { color: '#cfcac0', line: '#b9b3a7' },
    road:   { color: '#6f6f6f', line: '#666' },
    alley:  { color: '#a9a69e', line: '#99968e' },
    arcade: { color: '#ddd6c6', line: '#c9c0ac' },
    park:   { color: '#7c7c7c', line: '#e8e8e8' },
    rail:   { color: '#8b8378', line: '#4c4640' },
    tile:   { color: '#ecebe6', line: '#d8d6cf' },
    conc:   { color: '#b5b3ad', line: '#a4a29c' },
    door:   { color: '#7fb38a', line: '#5f9068' },
    bld:    { solid: 1, sight: 1, h: 96, top: '#555', front: '#333' },
    resto:  { solid: 1, sight: 1, h: 96, top: '#6b4a3a', front: '#3f2b22' },
    store:  { solid: 1, sight: 1, h: 96, top: '#e6e3da', front: '#9a968c' },
    swall:  { solid: 1, sight: 1, h: 56, top: '#d9d6cc', front: '#8d8a82' },
    wall:   { solid: 1, sight: 1, h: 52, top: '#a3a09a', front: '#6f6c66' },
    pillar: { solid: 1, sight: 1, h: 90, top: '#8a8278', front: '#5b544c' },
    car:    { solid: 1, sight: 1, h: 36, top: '#9aa3ab', front: '#59616a' },
    vend:   { solid: 1, sight: 1, h: 72, top: '#e9e9e9', front: '#c0392b' },
    rack:   { solid: 1, sight: 1, h: 58, top: '#b9b4aa', front: '#7d786f' },
    shelf:  { solid: 1, sight: 1, h: 58, top: '#cfc8b8', front: '#8e8778' },
    fridge: { solid: 1, sight: 1, h: 80, top: '#d7e3ea', front: '#7d94a3' },
    counter:{ solid: 1, sight: 0, h: 30, top: '#c7b8a0', front: '#86765e' },
    low:    { solid: 1, sight: 0, h: 24, top: '#a58e6b', front: '#6e5b40' },
    table:  { solid: 1, sight: 0, h: 26, top: '#b49b78', front: '#7a6447' }
  },

  /* =========================================================
     第一章：商店街（殭屍街道）＋便利商店（人類營地）
     依《第一章_便利商店_地圖筆記》
     ========================================================= */
  chapters: {
    1: {
      street: {
        name: '車站前商店街',
        w: 56, h: 24, base: 'bld',
        bg: [{ img: 'ch1_street', x: 0, y: 0, w: 56, h: 24 }],   // GPT 上色的整張地圖（4 等份拼起來）
        floors: [
          { t: 'alley', x: 8, y: 16, w: 45, h: 5 },     // 住宅後巷（繞遠、安全）
          { t: 'side', x: 7, y: 9, w: 3, h: 12 },       // 餐廳旁的人行道
          { t: 'arcade', x: 7, y: 9, w: 45, h: 4 },     // 商店街拱廊（最短、最危險）
          { t: 'road', x: 48, y: 5, w: 5, h: 16 },      // 東側道路
          { t: 'park', x: 13, y: 1, w: 22, h: 6 },      // 投幣停車場（支路）
          { t: 'side', x: 21, y: 7, w: 3, h: 2 },       // 拱廊 → 停車場
          { t: 'road', x: 35, y: 5, w: 13, h: 2 },      // 停車場 → 便利商店後門
          { t: 'rail', x: 27, y: 16, w: 3, h: 5 },      // 平交道
          { t: 'door', x: 45, y: 4, w: 1, h: 1 }        // 便利商店後門
        ],
        props: [
          { t: 'resto', x: 1, y: 16, w: 6, h: 7, img: 'ext_resto', scale: .95 },
          { t: 'store', x: 40, y: 1, w: 15, h: 3 },
          { t: 'store', x: 40, y: 4, w: 5, h: 1 }, { t: 'store', x: 46, y: 4, w: 9, h: 1 },
          // 拱廊柱子（只有兩側，中間很空）
          ...[12, 18, 24, 30, 36, 42].flatMap(x => [{ t: 'pillar', x, y: 9, w: 1, h: 1, img: 'arc_pillar', scale: .5 }, { t: 'pillar', x, y: 12, w: 1, h: 1, img: 'arc_pillar', scale: .5 }]),
          { t: 'low', x: 20, y: 11, w: 1, h: 1, img: 'jk_box', scale: 1.1 }, { t: 'low', x: 33, y: 10, w: 1, h: 1, img: 'jk_box', scale: 1.1 },
          { t: 'low', x: 9, y: 14, w: 1, h: 1, img: 'al_bin', scale: .7 },
          // 後巷：轉角多、遮蔽多
          { t: 'wall', x: 13, y: 18, w: 3, h: 1, img: 'al_wall', rep: 2 }, { t: 'vend', x: 19, y: 16, w: 1, h: 1, img: 'al_vend', scale: .85 }, { t: 'rack', x: 23, y: 19, w: 2, h: 1, img: 'al_rack' },
          { t: 'wall', x: 33, y: 17, w: 1, h: 2, img: 'al_wall', vrep: 1 }, { t: 'vend', x: 38, y: 20, w: 1, h: 1, img: 'al_vend', scale: .85 }, { t: 'rack', x: 41, y: 17, w: 2, h: 1, img: 'al_rack' },
          { t: 'low', x: 46, y: 19, w: 1, h: 1, img: 'al_bin', scale: .7 }, { t: 'wall', x: 45, y: 16, w: 1, h: 2, img: 'al_wall', vrep: 1 }, { t: 'low', x: 31, y: 20, w: 1, h: 1, img: 'al_bike', scale: 1.5 },
          // 東側道路
          { t: 'car', x: 49, y: 8, w: 2, h: 1, img: 'pk_car2', scale: 1.15 }, { t: 'car', x: 51, y: 15, w: 1, h: 2, img: 'pk_car1', scale: 1.6 }, { t: 'low', x: 50, y: 11, w: 1, h: 1, img: 'jk_cone', scale: .6 },
          // 停車場：車子是遮蔽
          { t: 'car', x: 15, y: 2, w: 2, h: 1, img: 'pk_car1', scale: 1.15 }, { t: 'car', x: 19, y: 2, w: 2, h: 1, img: 'pk_car2', scale: 1.15 }, { t: 'car', x: 26, y: 4, w: 2, h: 1, img: 'pk_car1', scale: 1.15 },
          { t: 'car', x: 30, y: 2, w: 2, h: 1, img: 'pk_car2', scale: 1.15 }, { t: 'car', x: 16, y: 5, w: 2, h: 1, img: 'pk_car1', scale: 1.15 }, { t: 'low', x: 23, y: 5, w: 1, h: 1, img: 'pk_bike', scale: 1.4 },
          { t: 'low', x: 33, y: 1, w: 1, h: 1, img: 'pk_meter', scale: .6 },
          { t: 'low', x: 38, y: 5, w: 1, h: 1, img: 'jk_bags', scale: .9 }, { t: 'low', x: 42, y: 6, w: 1, h: 1, img: 'jk_box', scale: 1.1 }
        ],
        labels: [{ text: '洋食 さとう', x: 4, y: 19 }, { text: 'コンビニ', x: 47, y: 2 }],
        decor: [{ t: 'crossing', x: 26.6, y: 16.2 }, { t: 'crossing', x: 30.4, y: 20.6 }, { t: 'img', img: 'rx_post', x: 26.6, y: 16.3, w: .9 }, { t: 'img', img: 'rx_post', x: 30.4, y: 20.9, w: .9 }, { t: 'img', img: 'ext_store', x: 45.82, y: 5.02, w: 3.6 },
          ...[15, 21, 27, 33, 39].map(x => ({ t: 'hang', img: 'arc_lantern', x, y: 9.2, w: 3.2 }))],
        facades: ['shop_ramen', 'shop_drug', 'shop_izakaya'],   // 建築物面向道路的那一面自動排上店面
        floorImg: { side: 'g_side', arcade: 'g_side', road: 'g_road', park: 'g_road', alley: 'g_alley', rail: 'g_alley' },
        start: { x: 9.3, y: 19.5, face: 0 },
        home: { x: 7.5, y: 19.5, label: '回餐廳' },             // 餐廳門口：可以中途回家
        entrance: { x: 45.5, y: 4.6, label: '進入便利商店', frame: { x: 45.06, y: 3.01, w: .88, h: 1.77 }, frameBlock: { x: 45, y: 3.45, w: 1, h: 1.55 } },   // 人類營地入口（frame＝門的外框，只框左、上、右）
        target: { x: 46, y: 3, r: 5 },                          // 地圖上顯示的「大致位置」
        zombies: [
          { x: 12.5, y: 17.5, mode: 'idle', face: 0 },          // 教學：背對玩家，用石頭引開
          { x: 28, y: 10.4, mode: 'eat', face: Math.PI / 2 }, { x: 29.2, y: 11.3, mode: 'eat', face: Math.PI }, { x: 27, y: 11.4, mode: 'eat', face: 0 },
          { x: 18, y: 10.5, mode: 'wander', r: 3 }, { x: 40, y: 11, mode: 'wander', r: 4 },
          { x: 36.5, y: 18.5, mode: 'wander', r: 3 }, { x: 43.5, y: 18, mode: 'wander', r: 2 },
          { x: 50, y: 12.5, mode: 'wander', r: 3 }, { x: 28.5, y: 2.5, mode: 'wander', r: 3 }
        ],
        stones: { count: [1, 3], chance: .85, spots: [[9.5, 17.5], [10, 12.3], [17.5, 3.6], [24, 4], [33, 19.5], [50.5, 7], [22, 17], [44, 10]], always: [[9.5, 17.5]] },
        tape: { chance: .35, spots: [[31.5, 3.6], [40, 18.6], [11, 10]] },
        boxes: { spots: [] },
        stories: [{ id: 'ch1-poster', x: 20.5, y: 6.3, label: '查看海報',
          lines: ['（這是……みーちゃん的出道海報！）', '（是誰把它撕破的……不可原諒。）', '（……放心，真正的妳，我會好好照顧。）'] }],
        intro: ['（白天的商店街……以前這裡很熱鬧的。）', '（みーちゃん，等我帶最新鮮的食材回去。）']
      },

      base: {
        name: '便利商店',
        w: 30, h: 18, base: 'swall',
        bg: [{ img: 'ch1_store', x: 0, y: 0, w: 30, h: 18 }],
        floors: [
          { t: 'tile', x: 1, y: 1, w: 21, h: 11 },      // 賣場
          { t: 'conc', x: 23, y: 1, w: 6, h: 10 },      // 儲藏室
          { t: 'conc', x: 22, y: 5, w: 1, h: 2 },       // 賣場 ↔ 儲藏室
          { t: 'tile', x: 1, y: 13, w: 12, h: 4 },      // 廁所走廊
          { t: 'conc', x: 14, y: 13, w: 7, h: 4 },      // 員工休息區
          { t: 'conc', x: 22, y: 13, w: 7, h: 4 },      // 後門區
          { t: 'tile', x: 3, y: 12, w: 2, h: 1 },       // 賣場 ↔ 廁所走廊
          { t: 'conc', x: 18, y: 12, w: 2, h: 1 },      // 賣場 ↔ 休息區
          { t: 'conc', x: 25, y: 11, w: 2, h: 2 },      // 儲藏室 ↔ 後門區
          { t: 'conc', x: 13, y: 14, w: 1, h: 2 },      // 走廊 ↔ 休息區
          { t: 'conc', x: 21, y: 14, w: 1, h: 2 },      // 休息區 ↔ 後門區
          { t: 'door', x: 25, y: 17, w: 1, h: 1 }       // 後門（唯一出入口）
        ],
        props: [
          { t: 'shelf', x: 3, y: 5, w: 10, h: 1, img: 'st_shelf', rep: 3, scale: .86 }, { t: 'shelf', x: 3, y: 7, w: 10, h: 1, img: 'st_shelf', rep: 3, scale: .86 }, { t: 'shelf', x: 3, y: 9, w: 10, h: 1, img: 'st_shelf', rep: 3, scale: .86 },
          { t: 'shelf', x: 15, y: 6, w: 1, h: 3, img: 'st_endcap', vrep: 1, scale: 1.1 },
          { t: 'counter', x: 11, y: 2, w: 5, h: 1, img: 'st_counter', rep: 2 },
          { t: 'shelf', x: 2, y: 1, w: 6, h: 1, img: 'st_door', rep: 3 },      // 封死正門
          { t: 'shelf', x: 1, y: 3, w: 1, h: 2, img: 'st_mag', vrep: 1 },      // 雜誌架
          { t: 'fridge', x: 21, y: 1, w: 1, h: 3, img: 'st_fridge', vrep: 1, scale: 1.2 }, { t: 'fridge', x: 21, y: 7, w: 1, h: 3, img: 'st_fridge', vrep: 1, scale: 1.2 },  // 冷藏食品牆（中間是通往儲藏室的門）
          { t: 'shelf', x: 27, y: 2, w: 2, h: 1, img: 'sr_rack', rep: 2 }, { t: 'shelf', x: 27, y: 5, w: 2, h: 1, img: 'sr_rack', rep: 2 }, { t: 'shelf', x: 27, y: 8, w: 2, h: 1, img: 'sr_rack', rep: 2 },
          { t: 'low', x: 23, y: 9, w: 2, h: 1, img: 'sr_boxes', rep: 2 },
          { t: 'table', x: 16, y: 14, w: 2, h: 1, img: 'br_table', scale: 1.1 }, { t: 'shelf', x: 20, y: 13, w: 1, h: 1, img: 'br_locker', scale: .8 },
          { t: 'low', x: 1, y: 16, w: 1, h: 1, img: 'sr_boxes', scale: .9 }
        ],
        labels: [{ text: '正門（封死）', x: 5, y: 0.6 }, { text: '儲藏室', x: 25.5, y: 0.6 }],
        decor: [{ t: 'recycle', x: 25.5, y: 1.5 }, { t: 'img', img: 'sr_recycle', x: 25.9, y: 1.7, w: 1.1 }, { t: 'img', img: 'st_comp', x: 20.35, y: 3.05, w: .85 }, { t: 'img', img: 'sr_door', x: 25.5, y: 17.25, w: .9 }],
        floorImg: { tile: 'g_tile', conc: 'g_conc' },
        start: { x: 25.5, y: 16.3, face: -Math.PI / 2 },
        exit: { x: 25.5, y: 16.5, label: '撤退回餐廳' },
        noise: [{ id: 'compressor', x: 20.4, y: 2.6, label: '打開壓縮機', radius: 420, duration: 5 }],
        boxes: { spots: [[23.8, 1.8], [24.8, 1.8], [23.8, 2.8], [24.8, 2.8]] },   // 回收區紙箱（固定）
        tape: { pick: [1, 2], spots: [[12.5, 3.4], [17, 15.5], [6, 14.5], [8.5, 3.6]] }, // 膠帶（隨機）
        // 固定崗位的人
        posts: [
          { id: 'radio', x: 17, y: 15.4, kind: 'flee', look: [-Math.PI / 2, 0, -Math.PI / 2, Math.PI], role: '修收音機的人' },
          { id: 'cashier', x: 13, y: 1.5, kind: 'fight', look: [Math.PI / 2, Math.PI * .7, Math.PI / 2, Math.PI * .3], pace: [[12, 1.5], [14.8, 1.5]], role: '顧物資的人' }
        ],
        // 隨機走動的人（依序抽種類；第一個一定在儲藏室背對後門＝新手第一個目標）
        walkers: { kinds: ['flee', 'flee', 'fight'], first: [[25, 4.3], [24.5, 7]], firstFace: -Math.PI / 2,
          spawns: [[5, 4.5], [8, 6.5], [14, 8], [10, 10.5], [18, 6], [6, 10.5], [18, 3.6], [2, 8], [16.5, 10.5], [6, 14.5]],
          modes: ['wander', 'idle', 'wander'], groupChance: .5, groupMax: 2, groupPull: 1 },
        waypoints: [[2, 4], [2, 10.5], [8, 4], [8, 6], [8, 8], [8, 10.4], [14, 4], [14, 10.5], [18, 3.5], [18, 10.5], [19.5, 6], [24, 4], [25, 7.5], [4, 14.5], [10, 15], [15, 15.5], [24, 14.5]],
        patrol: [[14, 3.6], [14, 10.5], [2, 10.5], [2, 4], [8, 4]],
        fleePoints: [[4, 3.4], [12, 3.6], [19.5, 2.4], [2, 15.5], [27.5, 15.5], [24, 1.8], [10, 10.5]],
        intro: ['（便利商店……廣播就是從這裡發出來的。）', '（五人份。今晚的漢堡排，一定要用最新鮮的。）'],
        // 第一次進入便利商店的過場漫畫（只播一次）。圖放 assets/comic/，還沒到時用佔位畫面
        firstComic: [
          { id: 'CUT 01', img: 'assets/comic/ch1_store_01.jpg', dur: 2.5, fx: 'rays', desc: '健太推開後門走進來，守門的店員一看到他就露出驚喜表情，上前半步',
            lines: [{ who: '店員', text: '天啊！你是倖存者嗎！？', at: .3 }, { who: '店員', text: '你一定是聽到我們的廣播才來的吧！', at: 1.6 }] },
          { id: 'CUT 02', img: 'assets/comic/ch1_store_02.jpg', dur: 2.5, desc: '健太推推眼鏡，有點不好意思地站著',
            lines: [{ who: '健太', text: '呃……', at: .3 }, { who: '健太', text: '其實我是來拿食材的。', at: 1.3 }] },
          { id: 'CUT 03', img: 'assets/comic/ch1_store_03.jpg', dur: 3, desc: '店員愣了一下，露出「原來是這個意思」的理解表情，背後看得到貨架',
            lines: [{ who: '店員', text: '食材？', at: .2 }, { who: '店員', text: '啊……抱歉，店裡的物資要先保留在這邊。', at: 1.1 }, { who: '店員', text: '大家得一起想辦法活下去啊！', at: 2.8 }] },
          { id: 'CUT 04', img: 'assets/comic/ch1_store_04.jpg', dur: 1.8, focusY: .25, fx: 'speed', push: .12, desc: '健太突然睜大眼睛，誇張地指向店員身後',
            lines: [{ who: '健太', text: '啊！！', at: .1 }, { who: '健太', text: '星野美月！！！', at: .6 }] },
          { id: 'CUT 05', img: 'assets/comic/ch1_store_06.jpg', dur: 2.2, fx: 'hearts', push: .08, desc: '店員猛然轉頭找美月，眼睛變成愛心；健太在他背後眼鏡反光',
            lines: [{ who: '店員', text: '什麼！？在哪裡！？', at: .1, pink: true }, { who: '店員', text: '美月！？', at: 1, pink: true }] },
          { id: 'CUT 06a', img: 'assets/comic/ch1_store_07.jpg', dur: .9, focusY: .2, push: .02, desc: '健太面無表情，從背後高高舉起擀麵棍', lines: [] },
          { id: 'CUT 06b', img: 'assets/comic/ch1_store_08.jpg', dur: 1.3, push: .03, shake: true, shakeAt: .05, flashAt: 0, desc: '黑白剪影：擀麵棍敲在店員頭上，店員往前倒',
            sfx: [{ text: '咚！！！', x: 560, y: 250, size: 170, at: .05, rot: -.12 }], lines: [] },
          { id: 'CUT 07', img: 'assets/comic/ch1_store_09.jpg', dur: 2, desc: '店員昏倒在入口內側的地上，健太站在旁邊低頭看他',
            lines: [{ who: '健太', text: '……', at: .2 }, { who: '健太', text: '好，第一份食材。', at: 1 }] },
          { id: 'CUT 08', img: 'assets/comic/ch1_store_10.jpg', dur: 1.2, push: 0, desc: '健太打開黑色大袋子，袋口朝向地上的店員（停格）', lines: [] }
        ],
        firstClerk: { x: 23.3, y: 14.3, face: Math.PI },   // 過場後昏倒的店員位置（後門內側）
        firstBagAt: { x: 24.6, y: 15.1 },                   // 過場後黑袋放在主角旁邊
        lines: { radio: ['（原來是你在廣播啊。謝謝你的情報。）'], firstBag: ['（裝好了。要小心，不要碰傷食材。）'] }
      }
    }
  },

  // 死亡動畫後的畫面：每次隨機一句（被殭屍、被人類共用）
  deadLines: [
    '你辜負了星野美月。', '美月還在等你吃飯。', '你連美月的幸福都守護不了。', '你讓美月失望了。',
    '美月相信你。雖然只是你自己這麼認為。', '美月值得更好的男人。',
    '你已永久退出粉絲俱樂部。', '你的終身應援資格已遭取消。', '連末日都無法阻止你當個失敗的粉絲。', '你不配自稱美月的頭號粉絲。',
    '你的忠誠度未達最低標準。', '美月的粉絲名單已將你除名。', '你連最後一場應援都沒能完成。', '你的愛，連粉絲俱樂部的年費都不值。'
  ],
  deadSub: '你的愛，只有這點程度嗎？',
  deadButton: '重新應援',
  deaths: {
    zombie: ['被殭屍撲倒了', '被拖進巷子的黑暗裡', '被殭屍包圍了', '脖子被咬住了', '紙板裝甲被扯爛了'],
    human: ['被倖存者圍毆', '被鐵管打倒了', '被壓在貨架下', '被掃把打昏了', '被人群踩過去']
  }
};
