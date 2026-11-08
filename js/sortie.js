'use strict';
/* MissionSystem：出擊關卡（殭屍街道 → 人類營地 → 撤退）
   PlayerController、CombatSystem、BagSystem、石頭、材料撿取、死亡重試、HUD、地圖都在這裡。
   餐廳呼叫 OSHI.Sortie.run(save) → 回傳 { people, box, tape, taken } 或 { abort:true } */
OSHI.Sortie = (() => {
  const SC = OSHI.SORTIE, M = OSHI.SMap, AI = OSHI.SAI, T = SC.tile, SH = 720, INK = '#151515', PINK = '#f19cb9';
  const UI = () => OSHI.UI, Cut = () => OSHI.Cut, A = () => OSHI.Art;
  const C = OSHI.CONFIG, HERO = () => C.characters.hero.short;
  let R = null;
  let SW = 1280;   // 畫面寬（邏輯像素）：高固定 720，寬依螢幕比例變化（滿版）
  const setView = w => { SW = Math.max(960, Math.round(w)); };

  const supports = ch => !!SC.chapters[ch];
  const keyIs = (code, act) => SC.keys[act].includes(code);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const think = t => ({ who: HERO(), text: t, kind: 'fantasy' });

  /* =========================================================
     開始出擊
     ========================================================= */
  function run(save) {
    return new Promise(resolve => {
      const ch = C.chapters[save.chapter - 1];
      R = { save, ch, cfg: SC.chapters[save.chapter], resolve, room: Math.max(0, ch.need - save.stock), alertLv: Math.min(4, save.trips),
        stones: 0, entryStones: 0, box: 0, tape: 0, taken: [], paused: false, mapOpen: false, busy: false, hint: null, rings: [], thrown: [], fx: [], time: 0, shake: 0 };
      document.body.classList.add('sortie');
      setupStreet();
      R.busy = true;
      UI().say(R.cfg.street.intro.map(think)).then(() => { R.busy = false; hint('tut-cone', '扇形是敵人的視線範圍・待在裡面太久就會被發現'); });
    });
  }
  function finish(result) {
    const r = R; R = null; document.body.classList.remove('sortie');
    $('sPause').hidden = true; r.resolve(result);
  }

  function newPlayer(st) {
    const hp = (C.armor.biteLimit[R.save.armor] || 1) * SC.player.hpPerBite;
    return { x: st.x * T, y: st.y * T, face: st.face || 0, dirX: Math.cos(st.face || 0) < 0 ? -1 : 1, phase: 0, moving: false, running: false, dead: false,
      hp, maxHp: hp, inv: 0, atkT: 0, cd: 0, noiseT: 0, aimT: 0, hurtT: 0 };
  }
  function scatter(spec, extraAlways) {
    const out = [];
    (spec.spots || []).forEach(([x, y]) => {
      const always = (spec.always || []).some(([ax, ay]) => ax === x && ay === y);
      if (!always && Math.random() > (spec.chance ?? 1)) return;
      out.push({ x: x * T, y: y * T, n: spec.count ? Math.round(AI.rnd(spec.count[0], spec.count[1] + .99) - .49) || 1 : 1 });
    });
    return out;
  }

  function setupStreet() {
    const d = R.cfg.street;
    R.scene = 'street'; R.def = d; R.map = M.build(d);
    R.player = newPlayer(d.start);
    R.agents = d.zombies.map((z, i) => AI.make('zombie', { ...z, x: z.x * T, y: z.y * T, v: i, hp: Math.round(AI.rnd(SC.zombie.hits[0], SC.zombie.hits[1] + .99)) }));
    R.items = [...scatter(d.stones).map(o => ({ ...o, kind: 'stone' })), ...scatter(d.tape).map(o => ({ ...o, kind: 'tape' }))];
    R.agents.forEach(a => { M.settle(R.map, a, 19); a.home.x = a.x; a.home.y = a.y; });
    R.bag = null; R.stones = 0; R.box = 0; R.tape = 0; R.rings = []; R.thrown = [];
    R.world = world(d, { sightMul: 1, searchMul: 1, callMul: 1 });
    R.cam = camTarget();
  }

  function setupBase(first) {
    const d = R.cfg.base, A2 = SC.alert, lv = R.alertLv, takenBefore = (R.save.taken && R.save.taken[R.save.chapter]) || [];
    R.scene = 'base'; R.def = d; R.map = M.build(d);
    R.player = newPlayer(d.start);
    const agents = [];
    const posts = d.posts.filter(p => !takenBefore.includes(p.id));
    posts.forEach((p, i) => agents.push(AI.make('human', { id: p.id, kind: p.kind, mode: 'post', x: p.x * T, y: p.y * T, face: p.look[0], look: p.look, pace: p.pace && p.pace.map(q => q), v: i, role: p.role })));
    // 第一次進店：過場裡被敲昏的店員算一個目標，隨機走動的人少一個
    if (first && d.firstClerk && R.room > 0) agents.push(AI.make('human', { id: 'clerk', kind: 'flee', mode: 'idle', x: d.firstClerk.x * T, y: d.firstClerk.y * T, face: d.firstClerk.face, v: 0, ko: true, state: 'ko' }));
    const W2 = d.walkers, nWalk = Math.max(0, R.room - posts.length - (first && d.firstClerk && R.room > 0 ? 1 : 0)), spawns = shuffle(W2.spawns);
    let group = Math.random() < W2.groupChance && nWalk >= 3, gid = 0;
    for (let i = 0; i < nWalk; i++) {
      const o = n => ({ id: 'w' + n, kind: W2.kinds[n % W2.kinds.length], v: n + 1 });
      if (i === 0) { const [x, y] = pick(W2.first); agents.push(AI.make('human', { ...o(0), mode: 'idle', x: x * T, y: y * T, face: W2.firstFace })); continue; }
      const [x, y] = spawns.pop();
      if (group && nWalk - i >= 2) {   // 兩個人聚在一起（第一章最多一組 2 人）
        group = false; gid++;
        agents.push(AI.make('human', { ...o(i), mode: 'group', group: gid, x: x * T - 28, y: y * T, face: 0 }));
        agents.push(AI.make('human', { ...o(i + 1), mode: 'group', group: gid, x: x * T + 28, y: y * T, face: Math.PI }));
        i++; continue;
      }
      agents.push(AI.make('human', { ...o(i), mode: pick(W2.modes), x: x * T, y: y * T, face: AI.rnd(-3, 3) }));
    }
    for (let i = 0; i < A2.extraPatrol[lv]; i++) { const p = d.patrol[(i * 2) % d.patrol.length]; agents.push(AI.make('human', { id: 'patrol' + i, kind: 'fight', mode: 'patrol', x: p[0] * T, y: p[1] * T, patrolIdx: (i * 2 + 1) % d.patrol.length, v: 9 + i })); }
    agents.forEach(a => { M.settle(R.map, a, 19); a.home.x = a.x; a.home.y = a.y; });
    R.agents = agents;
    const tapes = shuffle(d.tape.spots).slice(0, Math.round(AI.rnd(d.tape.pick[0], d.tape.pick[1] + .99) - .49));
    R.items = [...d.boxes.spots.map(([x, y]) => ({ kind: 'box', x: x * T, y: y * T, n: 1 })), ...tapes.map(([x, y]) => ({ kind: 'tape', x: x * T, y: y * T, n: 1 }))];
    R.noiseObjs = (d.noise || []).map(n => ({ ...n, used: false }));
    R.bag = first && d.firstBagAt ? { x: d.firstBagAt.x * T, y: d.firstBagAt.y * T, count: 0, ids: [], carried: false } : { x: R.player.x, y: R.player.y, count: 0, ids: [], carried: true };
    R.tut = first && d.firstClerk ? 1 : 0;
    R.stones = R.entryStones; R.rings = []; R.thrown = [];
    R.world = world(d, { sightMul: A2.sightMul[lv], searchMul: A2.searchMul[lv], callMul: A2.callMul[lv] });
    R.cam = camTarget();
  }

  /* 給 AI 用的世界介面 */
  function world(def, alert) {
    return {
      def, alert, get map() { return R.map; }, get player() { return R.player; },
      hurt(dmg, src) { hurt(dmg, src); },
      onSpot(a) { hint(a.type === 'zombie' ? 'tut-spotZ' : 'tut-spotH', a.type === 'zombie' ? '被發現了！殭屍打不死，快跑（Shift）躲到牠看不到的地方' : a.kind === 'fight' ? '被發現了！他會衝過來打你——先下手敲昏他，或逃出視線' : '被發現了！他會大叫逃跑，叫聲會把其他人引過來'); },
      call(x, y, r, src) { for (const a of R.agents) if (a !== src && a.type === 'human' && Math.hypot(a.x - x, a.y - y) < r) AI.hear(R.world, a, R.player.x, R.player.y, 'call'); },
      scream(x, y, r, src) { ring(x, y, r, '#e23b3b'); for (const a of R.agents) if (a !== src && a.type === 'human' && Math.hypot(a.x - x, a.y - y) < r) AI.hear(R.world, a, x, y, a.kind === 'fight' ? 'call' : 'noise'); },
      suspects() {
        const out = [];
        for (const a of R.agents) if (a.ko && !a.bagged) out.push({ key: 'ko' + a.id, x: a.x, y: a.y, say: '有人倒下了！' });
        if (R.bag && !R.bag.carried && R.bag.count > 0) out.push({ key: 'bag' + R.bag.count, x: R.bag.x, y: R.bag.y, say: '那個袋子是什麼？' });
        return out;
      }
    };
  }

  /* =========================================================
     聲音、提示、受傷、死亡
     ========================================================= */
  function ring(x, y, r, col = '#fff') { R.rings.push({ x, y, r, t: 0, col }); }
  function noise(x, y, r, kind) {
    ring(x, y, r);
    const pulled = {};
    const list = R.agents.filter(a => !a.ko && Math.hypot(a.x - x, a.y - y) < r).sort((p, q) => Math.hypot(p.x - x, p.y - y) - Math.hypot(q.x - x, q.y - y));
    for (const a of list) {
      if (a.group) { pulled[a.group] = (pulled[a.group] || 0) + 1; if (pulled[a.group] > R.def.walkers.groupPull) continue; }
      AI.hear(R.world, a, x, y, kind);
    }
  }
  function hint(key, text) {
    const seen = R.save.seenComics;
    if (key && seen.includes(key)) return;
    if (key) seen.push(key);
    if (document.body.classList.contains('touch')) text = text.replace(/Shift/g, '奔跑鍵').replace(/F：/g, '投石鍵：').replace(/E /g, '互動鍵 ').replace(/按 Q /g, '按放袋鍵 ').replace(/按 E /g, '按互動鍵 ').replace(/（M 看地圖）/g, '');
    R.hint = { text, t: 5.5 };
  }
  function hurt(dmg, src) {
    const P = R.player; if (P.inv > 0 || P.dead) return;
    P.hp -= dmg; P.inv = SC.player.invuln; P.hurtT = .35; R.shake = .3;
    const a = Math.atan2(P.y - src.y, P.x - src.x); M.move(R.map, P, Math.cos(a) * 26, Math.sin(a) * 26, SC.player.radius);
    R.lastHit = src;
    if (P.hp <= 0) die(src.type);
  }
  // 死亡畫面：隨機一句＋「重新應援」按鈕
  let lastLine = -1;
  function deadCard() {
    return new Promise(res => {
      const L = SC.deadLines; let i; do i = Math.floor(Math.random() * L.length); while (L.length > 1 && i === lastLine); lastLine = i;
      const el = $('sDead'); el.querySelector('.dl').textContent = L[i];
      el.querySelector('.ds').textContent = SC.deadSub; el.querySelector('.db b').textContent = SC.deadButton;
      el.hidden = false; R.deadOpen = () => { el.hidden = true; R.deadOpen = null; res(); };
      setTimeout(() => el.querySelector('.db').focus(), 50);
    });
  }
  async function die(kind) {
    const P = R.player; P.dead = true; R.busy = true;
    await new Promise(r => setTimeout(r, 500));
    if (!R) return;
    const D = OSHI.SDeath, list = kind === 'zombie' ? D.zombie : D.human.filter(d => !d.baseOnly || R.scene === 'base'), d = pick(list);
    await Cut().play(d.fn, d.dur, { v: (R.lastHit && R.lastHit.v) || 0, armor: R.save.armor });
    if (!R) return;
    await deadCard();
    if (!R) return;
    if (R.scene === 'street') { setupStreet(); hint(null, '從商店街起點重來・身上的石頭與材料歸零'); }
    else { R.box = 0; R.tape = 0; setupBase(); hint(null, `從便利商店入口重來・石頭回到 ${R.entryStones} 顆・身上材料歸零・這次裝袋的人清除`); }
    R.busy = false;
  }

  /* =========================================================
     玩家動作
     ========================================================= */
  function speedMul() {
    const B = SC.bag, b = R.bag;
    return b && b.carried ? Math.max(B.minMul, B.emptyMul - B.perPerson * b.count) : 1;
  }
  function attack() {
    const P = R.player, S = SC.player;
    if (P.cd > 0 || P.dead) return;
    P.cd = S.attackCooldown; P.atkT = .24;
    let hit = false;
    for (const a of R.agents) {
      if (a.ko || a.state === 'down') continue;
      const d = Math.hypot(a.x - P.x, a.y - P.y);
      if (d > S.attackRange || Math.abs(AI.angDiff(P.face, Math.atan2(a.y - P.y, a.x - P.x))) > S.attackArc && d > 30) continue;
      hit = true; R.fx.push({ x: a.x, y: a.y - 50, t: 0, text: a.type === 'zombie' ? 'ボコッ' : 'ゴンッ！' });
      if (a.type === 'zombie') {
        a.hp--; a.hurtT = .2; M.move(R.map, a, Math.cos(P.face) * 18, Math.sin(P.face) * 18, 18);
        if (a.hp <= 0) { a.state = 'down'; a.t = SC.zombie.downTime; hint('tut-zombie', '殭屍只會倒下一下子，馬上就會站起來・快逃！'); }
        else if (a.state !== 'chase') { a.state = 'chase'; a.last = [P.x, P.y]; a.lost = 0; }
      } else if (a.kind === 'fight' && (a.state === 'chase' || a.state === 'spot')) {
        // 反擊型正面衝突（他已經發現你）：要打 3 下；偷襲（還沒發現你）一下就倒
        a.hits = (a.hits || 0) + 1; a.hurtT = .2; a.atk = 0; a.cd = Math.max(a.cd, .5);
        M.move(R.map, a, Math.cos(P.face) * 26, Math.sin(P.face) * 26, 18);
        if (a.hits < SC.human.frontHits) { R.fx.push({ x: a.x, y: a.y - 90, t: 0, text: `${a.hits}/${SC.human.frontHits}`, small: true }); hint('tut-front', '正面打要 3 下才會倒・從背後偷襲一下就倒'); continue; }
        a.ko = true; a.state = 'ko'; a.say = null; a.meter = 0;
        hint('tut-ko', '敲昏了！把黑袋拿到他旁邊，按 E 裝袋');
      } else {
        a.ko = true; a.state = 'ko'; a.say = null; a.meter = 0;
        hint('tut-ko', '敲昏了！把黑袋拿到他旁邊，按 E 裝袋');
        if (a.id === 'radio') setTimeout(() => R && UI().say(R.def.lines.radio.map(think)), 400);
      }
    }
    if (hit) noise(P.x, P.y, 140, 'hit');
  }
  function throwStone() {
    const P = R.player, S = SC.stone;
    if (R.stones <= 0) { hint(null, '沒有石頭了・石頭只能在街道上撿'); return; }
    R.stones--;
    const d = Math.max(20, M.ray(R.map, P.x, P.y - 10, P.face, S.maxDist, true) - 14);
    R.thrown.push({ sx: P.x, sy: P.y, ex: P.x + Math.cos(P.face) * d, ey: P.y + Math.sin(P.face) * d, t: 0 });
  }
  function dropBag() {
    const b = R.bag; if (!b) return;
    if (b.carried) { b.carried = false; b.x = R.player.x + Math.cos(R.player.face) * 30; b.y = R.player.y + Math.sin(R.player.face) * 30; if (M.hitsCircle(R.map, b.x, b.y, 14)) { b.x = R.player.x; b.y = R.player.y; } }
  }

  // 目前可以互動的東西（最近的一個）
  function nearest() {
    const P = R.player, cands = [], add = (d, o) => { if (d < (o.range || 62)) cands.push([d, o]); };
    const dd = (x, y) => Math.hypot(x - P.x, y - P.y);
    R.items.forEach(it => add(dd(it.x, it.y), { label: it.kind === 'stone' ? `撿石頭 ×${it.n}` : it.kind === 'tape' ? '撿膠帶' : '撿紙箱', act: () => takeItem(it) }));
    if (R.bag && !R.bag.carried) add(dd(R.bag.x, R.bag.y), { label: `拿起黑袋（${R.bag.count}人）`, act: () => { R.bag.carried = true; } });
    for (const a of R.agents) if (a.ko && !a.bagged) {
      const d = dd(a.x, a.y);
      if (R.bag && R.bag.carried) add(d, { range: SC.bag.range + 20, label: R.bag.count >= R.room ? '袋子已經夠了' : '裝袋', act: () => bagIt(a) });
      else add(d, { label: '（要把黑袋拿過來才能裝）', act: () => hint(null, R.bag ? `黑袋放在別的地方・去拿過來（現在 ${R.bag.count} 人）` : '……') });
    }
    const d = R.def;
    (d.stories || []).forEach(s => add(dd(s.x * T, s.y * T), { range: 80, label: s.label, act: () => story(s) }));
    (R.noiseObjs || []).forEach(n => add(dd(n.x * T, n.y * T), { range: 70, label: n.used ? '（壓縮機嗡嗡作響）' : n.label, act: () => useNoise(n) }));
    if (d.home) add(dd(d.home.x * T, d.home.y * T), { range: 70, label: d.home.label, act: goHome });
    if (d.entrance) add(dd(d.entrance.x * T, d.entrance.y * T), { range: 70, label: d.entrance.label, act: enterBase });
    if (d.exit) add(dd(d.exit.x * T, d.exit.y * T), { range: 70, label: d.exit.label, act: retreat });
    cands.sort((a, b) => a[0] - b[0]);
    return cands.length ? cands[0][1] : null;
  }
  function takeItem(it) {
    R.items.splice(R.items.indexOf(it), 1);
    if (it.kind === 'stone') { R.stones += it.n; hint('tut-stone', 'F：往面向的方向丟石頭・落地的聲音會把附近的敵人引過去'); }
    if (it.kind === 'tape') R.tape += it.n;
    if (it.kind === 'box') R.box += it.n;
    R.fx.push({ x: it.x, y: it.y - 30, t: 0, text: it.kind === 'stone' ? `石頭 +${it.n}` : it.kind === 'tape' ? '膠帶 +1' : '紙箱 +1', small: true });
  }
  function bagIt(a) {
    const b = R.bag;
    if (b.count >= R.room) { hint(null, `本章只需要再 ${R.room} 人・不能多帶`); return; }
    a.bagged = true; R.agents.splice(R.agents.indexOf(a), 1);
    b.count++; if (R.def.posts.some(p => p.id === a.id)) b.ids.push(a.id);
    R.busy = true; R.bagAnim = { t: 0, done: () => { if (!R) return; R.busy = false; afterBag(a); } };
  }
  function afterBag(a) {
    const b = R.bag, got = R.save.stock + b.count;
    R.fx.push({ x: a.x, y: a.y - 40, t: 0, text: `已收集 ${got} / ${R.ch.need}` });
    if (a.id === 'clerk') { R.tut = 0; R.hint = { text: `已收集 ${got} / ${R.ch.need}`, t: 3 }; }
    if (b.count === 1 && !R.save.seenComics.includes('ch1-firstbag')) { R.save.seenComics.push('ch1-firstbag'); R.busy = true; UI().say(R.def.lines.firstBag.map(think)).then(() => { if (R) { R.busy = false; hint(null, `已收集 ${R.save.stock + R.bag.count} / ${R.ch.need}・袋子越重走越慢，帶著黑袋回後門才算帶回去`); } }); }
    if (b.count >= R.room) setTimeout(() => R && hint(null, '人數夠了！帶著黑袋回後門撤退'), 600);
  }
  async function story(s) {
    R.busy = true; await UI().say(s.lines.map(think)); if (!R) return; R.busy = false;
    if (!R.save.seenComics.includes(s.id + '-read')) R.save.seenComics.push(s.id + '-read');
  }
  function useNoise(n) {
    if (n.used) return;
    n.used = true; n.left = n.duration; noise(n.x * T, n.y * T, n.radius, 'noise');
    hint(null, '壓縮機開始轟轟作響・附近的人會過來查看');
  }
  async function goHome() {
    R.busy = true;
    const r = await UI().panel({ title: '回餐廳？', body: `<p>這次出擊就到這裡，回到餐廳。</p><p class="muted">身上的材料（紙箱 ${R.box}・膠帶 ${R.tape}）會帶回去・石頭不會</p>`, buttons: [{ id: 'go', label: '回餐廳', primary: true }, { id: null, label: '繼續出擊' }] });
    if (!R) return; R.busy = false;
    if (r === 'go') finish({ people: 0, box: R.box, tape: R.tape, taken: [] });
  }
  async function enterBase() {
    R.busy = true;
    R.entryStones = R.stones;
    await Cut().play(Cut().fadeCard(R.cfg.base.name, `人類警戒等級：${C.alertLevels[R.alertLv]}・身上石頭 ${R.stones} 顆`, '#000'), 2);
    if (!R) return;
    const key = 'ch' + R.save.chapter + '-base', first = !R.save.seenComics.includes(key) && !!R.cfg.base.firstComic;
    setupBase(first);
    if (first) {   // 第一次進店：過場漫畫 → 店員昏倒在旁邊 → 玩家自己裝袋（教學）
      R.save.seenComics.push(key);
      await OSHI.Comic.play(R.def.firstComic);
      if (!R) return;
      R.busy = false; tutStep();
      return;
    }
    R.busy = false;
    hint('tut-bag', '你扛著黑袋・敲昏人類後走到他旁邊按 E 裝袋（袋子越重走越慢，可以按 Q 先放下）');
  }
  // 第一次裝袋教學：拿起黑袋 → 靠近昏迷的人 → 按互動鍵裝袋
  function tutStep() {
    if (!R || !R.tut) return;
    const ia = document.body.classList.contains('touch') ? '互動鍵' : 'E';
    const txt = { 1: `① 拿起黑袋（走到袋子旁按 ${ia}）`, 2: '② 靠近昏迷的人', 3: `③ 按 ${ia} 裝袋` }[R.tut];
    if (txt) R.hint = { text: txt, t: 9999 };
  }
  function tutUpdate() {
    if (!R.tut) return;
    const P = R.player, c = R.agents.find(a => a.id === 'clerk' && !a.bagged);
    let s = R.tut;
    if (!c) { R.tut = 0; return; }
    if (!R.bag.carried) s = 1; else s = Math.hypot(c.x - P.x, c.y - P.y) < SC.bag.range + 20 ? 3 : 2;
    if (s !== R.tut || !R.hint) { R.tut = s; tutStep(); }
  }
  async function retreat() {
    const b = R.bag;
    if (b && !b.carried && b.count > 0) {
      R.busy = true;
      const r = await UI().panel({ title: '黑袋還在店裡', body: `<p>黑袋（${b.count} 人）放在店裡，沒有帶在身上。</p><p class="muted">空手撤退的話，袋子裡的人不會帶回去。</p>`, buttons: [{ id: null, label: '回去拿袋子', primary: true }, { id: 'go', label: '空手撤退' }] });
      if (!R) return; R.busy = false;
      if (r !== 'go') return;
      return done(0, []);
    }
    if (!b || b.count === 0) {
      R.busy = true;
      const r = await UI().panel({ title: '撤退？', body: '<p>袋子是空的。要直接回餐廳嗎？</p><p class="muted">身上的材料會帶回去・沒有帶回人不算一趟</p>', buttons: [{ id: 'go', label: '撤退回餐廳', primary: true }, { id: null, label: '再找找' }] });
      if (!R) return; R.busy = false;
      if (r !== 'go') return;
      return done(0, []);
    }
    done(b.count, b.ids);
  }
  function done(people, ids) { finish({ people, box: R.box, tape: R.tape, taken: ids }); }

  /* =========================================================
     輸入（按鍵集中在 sortie_config.js）
     ========================================================= */
  const held = new Set(), touch = { mx: 0, my: 0, run: false };
  const blocked = () => !R || R.busy || R.paused || UI().dialogOpen || UI().panelOpen || Cut().active;
  document.addEventListener('keydown', e => {
    if (!R) return;
    const k = e.code;
    if (R.deadOpen) { if (keyIs(k, 'interact')) { e.preventDefault(); R.deadOpen(); } return; }
    if (keyIs(k, 'pause')) { e.preventDefault(); if (UI().panelOpen) UI().closePanel(null); else if (R.mapOpen) R.mapOpen = false; else togglePause(); return; }
    if (R.paused) return;
    if (keyIs(k, 'interact')) { e.preventDefault(); if (e.repeat) return; if (Cut().active) { Cut().skip(); return; } if (UI().dialogOpen) { UI().advance(); return; } if (!blocked()) { const n = nearest(); n && n.act(); } return; }
    if (keyIs(k, 'map')) { if (!blocked() || R.mapOpen) R.mapOpen = !R.mapOpen; return; }
    if (k.startsWith('Arrow') || k === 'Space') e.preventDefault();
    held.add(k);
    if (e.repeat || blocked()) return;
    if (keyIs(k, 'attack')) attack();
    if (keyIs(k, 'drop')) dropBag();
    if (keyIs(k, 'throw')) throwStone();
  });
  document.addEventListener('keyup', e => held.delete(e.code));
  window.addEventListener('blur', () => held.clear());
  const canvas = () => document.getElementById('game');
  function toWorld(e) { const r = canvas().getBoundingClientRect(); return [(e.clientX - r.left) / r.width * SW + R.cam.x, (e.clientY - r.top) / r.height * SH + R.cam.y]; }
  document.addEventListener('mousemove', e => { if (!R || e.target !== canvas()) return; const [x, y] = toWorld(e); R.player.aim = Math.atan2(y - R.player.y, x - R.player.x); R.player.aimT = 1.2; });
  document.addEventListener('mousedown', e => {
    if (!R || e.target !== canvas() || e.button !== 0 || document.body.classList.contains('touch')) return;  // 手機用攻擊按鈕，點畫面不揮棒
    if (R.mapOpen) { R.mapOpen = false; return; }
    if (blocked()) return;
    const [x, y] = toWorld(e); R.player.face = Math.atan2(y - R.player.y, x - R.player.x); R.player.aim = R.player.face; R.player.aimT = 1.2; attack();
  });

  /* 手機：虛擬搖桿＋按鈕 */
  const $ = id => document.getElementById(id);
  function buildTouch() {
    const f = $('playerFrame'); if (!f || $('sTouch')) return;
    const el = document.createElement('div'); el.id = 'sTouch';
    el.innerHTML = `<div class="sjoy" id="sJoy"><i id="sKnob"></i></div>
      <button class="sb sb-atk" data-a="attack">攻擊</button><button class="sb sb-act" data-a="interact" id="sAct">互動</button>
      <button class="sb sb-run" data-a="run">奔跑</button><button class="sb sb-thr" data-a="throw">投石</button>
      <button class="sb sb-drop" data-a="drop">放袋</button><button class="sb sb-map" data-a="map">地圖</button><button class="sb sb-pause" data-a="pause">Ⅱ</button>`;
    f.appendChild(el);
    const joy = $('sJoy'), knob = $('sKnob'); let jid = null;
    const setJoy = e => { const r = joy.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2; let dx = (e.clientX - cx) / (r.width / 2), dy = (e.clientY - cy) / (r.height / 2); const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; } touch.mx = Math.abs(dx) > .2 ? dx : 0; touch.my = Math.abs(dy) > .2 ? dy : 0; knob.style.transform = `translate(${dx * 50}%,${dy * 50}%)`; };
    joy.addEventListener('pointerdown', e => { e.preventDefault(); jid = e.pointerId; joy.setPointerCapture(jid); setJoy(e); });
    joy.addEventListener('pointermove', e => { if (e.pointerId === jid) setJoy(e); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => joy.addEventListener(t, () => { jid = null; touch.mx = touch.my = 0; knob.style.transform = ''; }));
    el.querySelectorAll('.sb').forEach(b => {
      const act = b.dataset.a;
      b.addEventListener('pointerdown', e => {
        e.preventDefault(); e.stopPropagation(); if (!R) return;
        if (act === 'run') { touch.run = true; b.setPointerCapture(e.pointerId); return; }
        if (act === 'pause') { if (R.mapOpen) R.mapOpen = false; else togglePause(); return; }
        if (act === 'interact') { if (Cut().active) return Cut().skip(); if (UI().dialogOpen) return UI().advance(); if (!blocked()) { const n = nearest(); n && n.act(); } return; }
        if (act === 'map') { if (!blocked() || R.mapOpen) R.mapOpen = !R.mapOpen; return; }
        if (blocked()) return;
        if (act === 'attack') attack(); if (act === 'drop') dropBag(); if (act === 'throw') throwStone();
      });
      if (act === 'run') ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => b.addEventListener(t, () => touch.run = false));
    });
  }
  function buildDead() {
    if ($('sDead')) return;
    const el = document.createElement('div'); el.id = 'sDead'; el.className = 'overlay'; el.hidden = true;
    el.innerHTML = `<div class="dcard"><small>推し活</small>
      <svg class="dh" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20s-7-4.4-9.2-9A5.2 5.2 0 0 1 12 6a5.2 5.2 0 0 1 9.2 5c-2.2 4.6-9.2 9-9.2 9z"/><path d="M12 6l-1.5 4 2.5 1.5-2 4"/></svg>
      <p class="dl"></p><p class="ds"></p><hr><button class="db"><b></b> <span>↻</span></button></div>`;
    $('playerFrame').appendChild(el);
    el.querySelector('.db').addEventListener('click', () => R && R.deadOpen && R.deadOpen());
  }
  function buildPause() {
    if ($('sPause')) return;
    const el = document.createElement('div'); el.id = 'sPause'; el.className = 'overlay'; el.hidden = true;
    el.innerHTML = `<div class="pbox center"><h2>暫停</h2>
      <p class="muted">WASD 移動・滑鼠或方向鍵改變面向・滑鼠左鍵／J 擀麵棍<br>E 互動／撿取／裝袋・Q 放下黑袋・Shift 奔跑（有腳步聲）・F 丟石頭・M 地圖</p>
      <div class="pbtns"><button id="sResume" class="pbtn primary"><b>繼續</b></button><button id="sGiveUp" class="pbtn"><b>放棄這次出擊</b><small>身上的人數與材料都不會帶回</small></button></div></div>`;
    $('playerFrame').appendChild(el);
    $('sResume').addEventListener('click', togglePause);
    $('sGiveUp').addEventListener('click', () => { if (!R) return; if ($('sGiveUp').dataset.armed) { delete $('sGiveUp').dataset.armed; finish({ abort: true }); } else { $('sGiveUp').dataset.armed = '1'; $('sGiveUp').querySelector('b').textContent = '再按一次確認放棄'; } });
  }
  function togglePause() {
    if (!R) return; R.paused = !R.paused; $('sPause').hidden = !R.paused; held.clear();
    const g = $('sGiveUp'); if (g) { delete g.dataset.armed; g.querySelector('b').textContent = '放棄這次出擊'; }
  }
  document.addEventListener('DOMContentLoaded', () => { buildTouch(); buildPause(); buildDead(); });
  if (document.readyState !== 'loading') setTimeout(() => { buildTouch(); buildPause(); buildDead(); });

  /* =========================================================
     更新
     ========================================================= */
  function update(dt) {
    if (!R || R.paused) return;
    R.time += dt;
    if (R.hint) { R.hint.t -= dt; if (R.hint.t <= 0) R.hint = null; }
    R.rings = R.rings.filter(r => (r.t += dt) < .8);
    R.fx = R.fx.filter(f => (f.t += dt) < 1);
    R.shake = Math.max(0, R.shake - dt);
    if (R.bagAnim && (R.bagAnim.t += dt) >= BAGA.len) { const f = R.bagAnim.done; R.bagAnim = null; f(); }
    const P = R.player, freeze = blocked() || R.mapOpen;
    if (!freeze) {
      const S = SC.player, K = n => SC.keys[n].some(c => held.has(c));
      let mx = (K('right') ? 1 : 0) - (K('left') ? 1 : 0) + touch.mx, my = (K('down') ? 1 : 0) - (K('up') ? 1 : 0) + touch.my;
      const l = Math.hypot(mx, my); if (l > 1) { mx /= l; my /= l; }
      P.running = (K('run') || touch.run) && l > 0;
      const sp = (P.running ? S.run : S.walk) * speedMul();
      P.moving = l > .1;
      if (P.moving) { M.move(R.map, P, mx * sp * dt, my * sp * dt, S.radius); P.phase += dt * (P.running ? 14 : 10) * speedMul(); }  // 袋子越重，腳步也越慢
      // 面向：滑鼠／方向鍵優先，否則跟移動方向
      const fx = (K('faceRight') ? 1 : 0) - (K('faceLeft') ? 1 : 0), fy = (K('faceDown') ? 1 : 0) - (K('faceUp') ? 1 : 0);
      if (fx || fy) { P.aim = Math.atan2(fy, fx); P.aimT = 1.2; }
      P.aimT -= dt;
      if (P.aimT > 0) P.face = P.aim; else if (P.moving) P.face = Math.atan2(my, mx);
      if (Math.abs(Math.cos(P.face)) > .2) P.dirX = Math.cos(P.face) < 0 ? -1 : 1;
      P.cd = Math.max(0, P.cd - dt); P.atkT = Math.max(0, P.atkT - dt); P.inv = Math.max(0, P.inv - dt); P.hurtT = Math.max(0, P.hurtT - dt);
      if (P.running) { P.noiseT -= dt; if (P.noiseT <= 0) { P.noiseT = S.runNoiseEvery; noise(P.x, P.y, S.runNoise, 'step'); } }
      if (R.bag && R.bag.carried) { R.bag.x = P.x; R.bag.y = P.y; }
      // 石頭飛行
      for (const s of R.thrown) { s.t += dt / SC.stone.flight; if (s.t >= 1 && !s.done) { s.done = true; noise(s.ex, s.ey, SC.stone.noise, 'stone'); R.fx.push({ x: s.ex, y: s.ey - 20, t: 0, text: 'カツン', small: true }); } }
      R.thrown = R.thrown.filter(s => s.t < 1.3);
      (R.noiseObjs || []).forEach(n => { if (n.used && n.left > 0) { n.left -= dt; if (Math.floor(n.left * 2) !== Math.floor((n.left + dt) * 2)) ring(n.x * T, n.y * T, n.radius * .5); } });
      for (const a of R.agents) (a.type === 'zombie' ? AI.zombie : AI.human)(R.world, a, dt);
      // 第一次看到石頭
      if (R.scene === 'street' && R.items.some(it => it.kind === 'stone' && Math.hypot(it.x - P.x, it.y - P.y) < 160)) hint('tut-stonesee', '地上有石頭・E 撿起來');
      R.near = nearest(); tutUpdate();
    } else R.near = null;
    const at = document.getElementById('sAct'); if (at) { at.textContent = R.near ? R.near.label.replace(/（.*）/, '') : '互動'; at.classList.toggle('ready', !!R.near); }
    const tgt = camTarget(); R.cam.x += (tgt.x - R.cam.x) * Math.min(1, dt * 7); R.cam.y += (tgt.y - R.cam.y) * Math.min(1, dt * 7);
  }
  function camTarget() {
    const P = R.player, m = R.map;
    return { x: Math.max(0, Math.min(m.pxW - SW, P.x - SW / 2)), y: Math.max(-60, Math.min(m.pxH - SH, P.y - SH / 2 - 30)) };
  }

  /* =========================================================
     繪製
     ========================================================= */
  function draw(ctx) {
    if (!R) return;
    const P = R.player, t = R.time, cam = R.cam;
    ctx.fillStyle = '#1b1b1b'; ctx.fillRect(0, 0, SW, SH);
    ctx.save();
    const sx = R.shake ? (Math.random() - .5) * 10 : 0, sy = R.shake ? (Math.random() - .5) * 10 : 0;
    ctx.translate(-Math.round(cam.x) + sx, -Math.round(cam.y) + sy);
    const bg = M.drawBg(ctx, R.map, cam, SW, SH);
    if (!bg) { M.drawFloor(ctx, R.map, cam, SW, SH); M.drawDecor(ctx, R.map); }
    // 出入口標示
    const d = R.def;
    [[d.home, '#c79a5b'], [d.entrance && !d.entrance.frame && d.entrance, '#7fb38a'], [d.exit, '#7fb38a']].forEach(([p, col]) => { if (!p) return; ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.arc(p.x * T, p.y * T, 30 + Math.sin(t * 3) * 3, 0, 7); ctx.stroke(); ctx.setLineDash([]); });
    for (const a of R.agents) AI.drawCone(ctx, R.world, a);
    // 地上的東西
    for (const it of R.items) drawItem(ctx, it, t);
    for (const s of d.stories || []) if (!R.save.seenComics.includes(s.id + '-read')) { ctx.fillStyle = PINK; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.rect(s.x * T - 18, s.y * T - 26, 36, 26); ctx.fill(); ctx.stroke(); }
    if (R.bag && !R.bag.carried) drawBag(ctx, R.bag.x, R.bag.y, R.bag.count);
    for (const r of R.rings) { ctx.strokeStyle = r.col; ctx.globalAlpha = .6 * (1 - r.t / .8); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(r.x, r.y, r.r * Math.min(1, r.t / .5), 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
    // 依 y 排序：牆、物件、角色
    const items = bg ? [] : M.solidItems(R.map, cam, SW, SH);
    for (const a of R.agents) items.push({ y: a.y, draw: c => AI.drawAgent(c, a, t) });
    items.push({ y: P.y, draw: c => drawPlayer(c, P, t, 1) });
    items.sort((a, b) => a.y - b.y).forEach(i => i.draw(ctx));
    if (d.entrance && d.entrance.frame) {   // 營地入口：門框亮起來（不框門底）
      const f = SC.mapArt ? d.entrance.frame : d.entrance.frameBlock || d.entrance.frame, x0 = f.x * T, y0 = f.y * T, x1 = (f.x + f.w) * T, y1 = (f.y + f.h) * T, pulse = .6 + Math.sin(t * 4) * .4;
      ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.strokeStyle = `rgba(255,70,140,${.25 * pulse})`; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(x0, y1); ctx.lineTo(x0, y0); ctx.lineTo(x1, y0); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.strokeStyle = '#ff3d8b'; ctx.lineWidth = 5; ctx.stroke(); ctx.restore();
    }
    // 被牆擋住時仍看得到自己（半透明）
    ctx.globalAlpha = .3; drawPlayer(ctx, P, t, 0); ctx.globalAlpha = 1;
    if (!bg) M.drawHang(ctx, R.map);
    M.drawLabels(ctx, R.map);
    for (const s of R.thrown) { if (s.t >= 1) continue; const x = s.sx + (s.ex - s.sx) * s.t, y = s.sy + (s.ey - s.sy) * s.t - Math.sin(s.t * Math.PI) * 70 - 30; const si = OSHI.SSprites && OSHI.SSprites.env('jk_stones'); if (si) { ctx.save(); ctx.translate(x, y); ctx.rotate(s.t * 12); ctx.drawImage(si, si.width * .62, si.height * .2, si.width * .3, si.height * .4, -9, -8, 18, 16); ctx.restore(); } else { ctx.fillStyle = '#888'; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill(); ctx.stroke(); } }
    for (const f of R.fx) { ctx.globalAlpha = 1 - f.t; ctx.font = f.small ? 'bold 18px sans-serif' : '900 italic 30px serif'; ctx.textAlign = 'center'; ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.strokeText(f.text, f.x, f.y - f.t * 30); ctx.fillStyle = f.small ? '#fff' : '#ffe14d'; ctx.fillText(f.text, f.x, f.y - f.t * 30); ctx.textAlign = 'left'; ctx.globalAlpha = 1; }
    if (R.near && !blocked() && !R.mapOpen) prompt(ctx, P, R.near.label, t);
    ctx.restore();
    if (P.hurtT > 0 || (P.hp <= 2 && P.hp < P.maxHp)) { ctx.fillStyle = `rgba(160,0,0,${P.hurtT > 0 ? .3 : .1 + Math.sin(t * 4) * .05})`; ctx.fillRect(0, 0, SW, SH); }
    hud(ctx);
    if (R.mapOpen) drawMap(ctx);
    if (R.bagAnim) drawBagAnim(ctx, R.bagAnim.t);
  }
  // 裝袋小動畫（使用者提供的 GIF，6 格）：每次把人收進袋子都播
  const BAGA = { ms: [180, 90, 90, 90, 130, 600], img: [], len: 1.45 };
  for (let i = 0; i < 6; i++) { const im = new Image(); im.src = 'assets/bag/bag' + i + '.png'; BAGA.img.push(im); }
  function drawBagAnim(ctx, el) {
    const inK = Math.min(1, el / .12), outK = Math.max(0, (el - (BAGA.len - .2)) / .2), a = inK * (1 - outK);
    let t = el * 1000, f = 0; while (f < 5 && t >= BAGA.ms[f]) { t -= BAGA.ms[f]; f++; }
    const S = 400, cx = SW / 2, cy = SH / 2 - 10, sc = .85 + .15 * (1 - Math.pow(1 - inK, 3)) + outK * .05;
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(0, 0, SW, SH);
    ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.rotate(-.02);
    ctx.fillStyle = '#111'; ctx.fillRect(-S / 2 + 8, -S / 2 + 10, S, S);
    ctx.fillStyle = '#f3efe7'; ctx.fillRect(-S / 2, -S / 2, S, S);
    ctx.lineWidth = 6; ctx.strokeStyle = '#111'; ctx.strokeRect(-S / 2, -S / 2, S, S);
    ctx.lineWidth = 3; ctx.strokeStyle = PINK; ctx.strokeRect(-S / 2 + 10, -S / 2 + 10, S - 20, S - 20);
    const im = BAGA.img[f], jit = f === 4 && t < 80 ? 3 : 0;
    if (im.complete && im.naturalWidth) ctx.drawImage(im, -S / 2 + 14 + jit, -S / 2 + 14, S - 28, S - 28);
    if (f >= 4) { ctx.font = '900 54px sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 8; ctx.strokeStyle = '#fff'; ctx.fillStyle = '#111';
      ctx.save(); ctx.translate(S / 2 - 90, -S / 2 + 70); ctx.rotate(.12); ctx.strokeText('ズボッ', 0, 0); ctx.fillText('ズボッ', 0, 0); ctx.restore(); ctx.textAlign = 'left'; }
    ctx.restore();
  }
  function drawItem(ctx, it, t) {
    const x = it.x, y = it.y + Math.sin(t * 3 + x) * 2;
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(it.x, it.y + 4, 16, 5, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 2;
    const stImg = it.kind === 'stone' && OSHI.SSprites && OSHI.SSprites.env('jk_stones');
    if (stImg) { const w = 30 + Math.min(3, it.n) * 10, h = w * stImg.height / stImg.width; ctx.drawImage(stImg, x - w / 2, y - h + 4, w, h); }
    else if (it.kind === 'stone') { for (let i = 0; i < Math.min(3, it.n); i++) { ctx.fillStyle = ['#8d8d8d', '#a5a5a5', '#777'][i]; ctx.beginPath(); ctx.ellipse(x - 8 + i * 9, y - 4 - (i % 2) * 5, 9, 7, 0, 0, 7); ctx.fill(); ctx.stroke(); } }
    else {
      const ic = OSHI.Sprites.get(it.kind === 'tape' ? 'icon_tape' : 'icon_box');
      if (ic) { const h = 40, w = ic.width / ic.height * h; ctx.drawImage(ic, x - w / 2, y - h, w, h); }
      else { ctx.fillStyle = it.kind === 'tape' ? '#b8864e' : '#c8ab7f'; ctx.fillRect(x - 14, y - 22, 28, 20); ctx.strokeRect(x - 14, y - 22, 28, 20); }
    }
  }
  function drawBag(ctx, x, y, n) {
    const s = 1 + Math.min(n, 5) * .18;
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x, y + 2, 24 * s, 7 * s, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#111'; ctx.strokeStyle = '#444'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, y - 16 * s, 22 * s, 18 * s, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 6, y - 32 * s); ctx.lineTo(x, y - 40 * s); ctx.lineTo(x + 6, y - 32 * s); ctx.fill();
    if (n) { ctx.fillStyle = '#fff'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(n, x, y - 11 * s); ctx.textAlign = 'left'; }
  }
  function drawPlayer(ctx, P, t, full) {
    if (P.dead && full) { ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(P.x, P.y - 12, 40, 16, 0, 0, 7); ctx.fill(); return; }
    if (full && P.inv > 0 && Math.floor(t * 14) % 2) return;
    const b = R.bag && R.bag.carried ? R.bag : null;
    if (b && full) drawBag(ctx, P.x - P.dirX * 22, P.y - 30, b.count);
    const sprite = OSHI.SSprites && OSHI.SSprites.chef(ctx, P, R.save.armor);
    if (!sprite) A().chef(ctx, P.x, P.y, .42, { face: P.dirX, phase: P.phase, moving: P.moving, t, armor: R.save.armor, expr: P.hurtT > 0 ? 'shock' : 'normal' });
    if (!full) return;
    // 擀麵棍（正式素材手上已經有擀麵棍，只有揮的時候才另外畫）
    if (!sprite || P.atkT > 0) {
    const swing = P.atkT > 0 ? (1 - P.atkT / .24) : 0, ang = P.face - .9 + swing * 1.8;
    ctx.save(); ctx.translate(P.x + Math.cos(P.face) * 14, P.y - 44); ctx.rotate(ang);
    ctx.fillStyle = '#d9b07a'; ctx.strokeStyle = INK; ctx.lineWidth = 2.5; OSHI.Art.rr(ctx, 8, -6, 46, 12, 6); ctx.fill(); ctx.stroke(); ctx.fillRect(52, -3, 10, 6); ctx.restore();
    }
    if (P.atkT > 0) { const sw = 1 - P.atkT / .24; ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(P.x, P.y - 40, 70, P.face - .9, P.face - .9 + sw * 1.8); ctx.stroke(); }
    // 面向
    ctx.fillStyle = PINK; ctx.beginPath(); const fx = P.x + Math.cos(P.face) * 40, fy = P.y + Math.sin(P.face) * 26;
    ctx.moveTo(fx + Math.cos(P.face) * 10, fy + Math.sin(P.face) * 10); ctx.lineTo(fx + Math.cos(P.face + 2.4) * 7, fy + Math.sin(P.face + 2.4) * 7); ctx.lineTo(fx + Math.cos(P.face - 2.4) * 7, fy + Math.sin(P.face - 2.4) * 7); ctx.fill();
  }
  function prompt(ctx, P, label, t) {
    const touchMode = document.body.classList.contains('touch'), text = touchMode ? label : `E　${label}`;
    ctx.font = 'bold 20px sans-serif'; const w = ctx.measureText(text).width + 28, x = P.x - w / 2, y = P.y - 150 + Math.sin(t * 4) * 3;
    OSHI.Art.rr(ctx, x, y, w, 36, 18); OSHI.Art.fillStroke(ctx, '#fff', INK, 3); ctx.fillStyle = INK; ctx.fillText(text, x + 14, y + 25);
  }
  function box(ctx, x, y, w, h) { ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h); ctx.fillStyle = INK; ctx.fillRect(x + 3, y + h, w, 3); ctx.fillRect(x + w, y + 3, 3, h); }
  function hud(ctx) {
    const P = R.player, base = R.scene === 'base';
    // 左上：地點與目標
    const goal = base ? `裝袋 ${R.bag ? R.bag.count : 0}/${R.room}・帶著黑袋回到後門撤退` : `找到「${R.ch.base}」的入口（M 看地圖）`;
    ctx.font = 'bold 18px sans-serif'; const w1 = Math.max(ctx.measureText(goal).width, 260) + 30;
    box(ctx, 16, 14, w1, 58); ctx.fillStyle = INK; ctx.fillText(`第${R.ch.id}章｜${R.def.name}`, 30, 38); ctx.font = '15px sans-serif'; ctx.fillStyle = '#555'; ctx.fillText(goal, 30, 61);
    // 右上：生命、石頭、材料、警戒
    const parts = [], hearts = Math.ceil(P.maxHp / 2);
    const x0 = SW - 16, items = [['石頭', R.stones], ['紙箱', R.box], ['膠帶', R.tape]];
    if (base) items.push(['警戒', C.alertLevels[R.alertLv]]);
    ctx.font = 'bold 17px sans-serif';
    const iw = items.reduce((s, [k, v]) => s + ctx.measureText(`${k} ${v}`).width + 22, 0), hw = hearts * 28 + 10, W2 = iw + hw + 20;
    box(ctx, x0 - W2, 14, W2, 40);
    let x = x0 - W2 + 14;
    for (let i = 0; i < hearts; i++) { const v = Math.max(0, Math.min(2, P.hp - i * 2)); A().heart(ctx, x + 11, 38, 13, '#ddd'); if (v === 2) A().heart(ctx, x + 11, 38, 13, '#e23b6a'); else if (v === 1) { ctx.save(); ctx.beginPath(); ctx.rect(x - 4, 0, 15, 80); ctx.clip(); A().heart(ctx, x + 11, 38, 13, '#e23b6a'); ctx.restore(); } x += 28; }
    x += 10; ctx.fillStyle = INK;
    for (const [k, v] of items) { const s = `${k} ${v}`; ctx.fillStyle = k === '警戒' && R.alertLv ? '#c0392b' : INK; ctx.fillText(s, x, 40); x += ctx.measureText(s).width + 22; }
    // 提示
    if (R.hint && !R.bagAnim) {
      ctx.globalAlpha = Math.min(1, R.hint.t * 2); ctx.font = 'bold 20px sans-serif';
      const w = ctx.measureText(R.hint.text).width + 40, y = SH - (document.body.classList.contains('touch') ? 260 : 80);
      ctx.fillStyle = 'rgba(21,21,21,.9)'; ctx.fillRect(SW / 2 - w / 2, y, w, 44); ctx.strokeStyle = PINK; ctx.lineWidth = 2; ctx.strokeRect(SW / 2 - w / 2, y, w, 44);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(R.hint.text, SW / 2, y + 29); ctx.textAlign = 'left'; ctx.globalAlpha = 1;
    }
  }
  function drawMap(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,.95)'; ctx.fillRect(0, 0, SW, SH);
    const { k, ox, oy } = M.drawMini(ctx, R.map, 90, 90, SW - 180, SH - 170), P = R.player, d = R.def;
    ctx.fillStyle = '#fff'; ctx.font = '900 28px serif'; ctx.fillText(`地圖｜${d.name}`, 90, 60);
    ctx.font = '15px sans-serif'; ctx.fillStyle = '#bbb'; ctx.fillText('M／Esc／點一下 關閉', SW - 250, 60);
    const at = (x, y) => [ox + x * k, oy + y * k];
    if (d.target) { const [x, y] = at(d.target.x * T, d.target.y * T); ctx.strokeStyle = PINK; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.arc(x, y, d.target.r * T * k, 0, 7); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = PINK; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(`廣播說的「${R.ch.base}」（大致位置）`, x, y + d.target.r * T * k + 22); ctx.textAlign = 'left'; }
    if (d.home) { const [x, y] = at(d.home.x * T, d.home.y * T); ctx.fillStyle = '#c79a5b'; ctx.font = 'bold 15px sans-serif'; ctx.fillText('餐廳', x - 40, y + 5); }
    if (d.exit) { const [x, y] = at(d.exit.x * T, d.exit.y * T); ctx.fillStyle = '#7fb38a'; ctx.beginPath(); ctx.arc(x, y, 8, 0, 7); ctx.fill(); ctx.font = 'bold 15px sans-serif'; ctx.fillText('後門（出口）', x + 12, y + 5); }
    if (R.bag && !R.bag.carried) { const [x, y] = at(R.bag.x, R.bag.y); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillText(`黑袋 ${R.bag.count}`, x + 10, y + 5); }
    const [px, py] = at(P.x, P.y); ctx.fillStyle = PINK; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(px, py, 9 + Math.sin(R.time * 6) * 2, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 15px sans-serif'; ctx.fillText('你', px + 12, py - 8);
  }

  return { run, update, draw, supports, setView, get active() { return !!R; }, get debug() { return R; } };
})();
