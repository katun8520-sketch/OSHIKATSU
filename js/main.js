'use strict';
/* GameManager + RestaurantSystem：餐廳基地的流程、輸入與主迴圈 */
(() => {
  const C = OSHI.CONFIG, Save = OSHI.Save, W = OSHI.World, UI = OSHI.UI, Cut = OSHI.Cut, A = OSHI.Art;
  const $ = id => document.getElementById(id);
  let SW = 1280; const SH = 720;   // 滿版：高固定 720，寬依螢幕比例

  let s = Save.load();
  const isNewSave = () => !s.seenComics.includes('ch1-open') && s.chapter === 1;
  const ch = () => C.chapters[s.chapter - 1];
  const ix = () => (s.interactions[s.chapter] = s.interactions[s.chapter] || { greet: false, knock: false, song: false });

  const player = { x: 1440, face: 1, phase: 0, moving: false };
  const fx = { night: true, radioOn: false, songOn: 0, bang: 0, bangText: '' };
  let started = false, camX = player.x - SW / 2, busy = false, paused = false, near = null, time = 0;

  /* ---------- 輸入（按鍵集中在 config.js）---------- */
  const held = new Set();
  const isKey = (code, act) => C.keys[act].includes(code);
  document.addEventListener('keydown', e => {
    if (OSHI.Sortie && OSHI.Sortie.active) return; // 出擊中由 sortie.js 處理
    if (e.repeat) { if (isKey(e.code, 'left') || isKey(e.code, 'right')) e.preventDefault(); return; }
    if (isKey(e.code, 'pause')) { e.preventDefault(); if (UI.panelOpen) UI.closePanel(null); else togglePause(); return; }
    if (paused) return;
    if (isKey(e.code, 'left') || isKey(e.code, 'right')) { held.add(e.code); e.preventDefault(); }
    if (isKey(e.code, 'interact') || e.code === 'Space') {
      if (UI.panelOpen) return; // 面板內交給按鈕本身
      e.preventDefault(); pressInteract();
    }
  });
  document.addEventListener('keyup', e => held.delete(e.code));
  window.addEventListener('blur', () => { held.clear(); touch.left = touch.right = false; });
  const touch = { left: false, right: false };
  function holdBtn(id, key) {
    const el = $(id);
    el.addEventListener('pointerdown', e => { e.preventDefault(); touch[key] = true; el.setPointerCapture(e.pointerId); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => el.addEventListener(t, () => touch[key] = false));
  }
  holdBtn('tLeft', 'left'); holdBtn('tRight', 'right');
  $('tAct').addEventListener('pointerdown', e => { e.preventDefault(); pressInteract(); });
  $('tPause').addEventListener('click', togglePause);
  $('game').addEventListener('pointerdown', e => { if (Cut.active) { const r = $('game').getBoundingClientRect(), b = cutBox(), lx = (e.clientX - r.left) / r.width * SW, ly = (e.clientY - r.top) / r.height * SH; if (OSHI.Comic && OSHI.Comic.tapAt((lx - b.ox) / b.sc, (ly - b.oy) / b.sc)) return; Cut.skip(); } else if (UI.dialogOpen) UI.advance(); });
  $('dialog').addEventListener('pointerdown', e => { e.stopPropagation(); UI.advance(); });
  if (matchMedia('(pointer:coarse)').matches) document.body.classList.add('touch');
  window.addEventListener('touchstart', () => document.body.classList.add('touch'), { once: true, passive: true });
  document.addEventListener('dblclick', e => e.preventDefault());
  document.addEventListener('gesturestart', e => e.preventDefault());

  function pressInteract() {
    if (Cut.active) { Cut.skip(); return; }
    if (UI.dialogOpen) { UI.advance(); return; }
    if (!busy && near) run(handlers[near.id]);
  }
  async function run(fn) { busy = true; held.clear(); touch.left = touch.right = false; try { await fn(); } finally { busy = false; Save.save(); } }

  /* ---------- 暫停 ---------- */
  function togglePause() { paused = !paused; $('pause').hidden = !paused; held.clear(); OSHI.Audio.pauseAll(paused); }
  $('btnResume').addEventListener('click', togglePause);
  $('btnMenu').addEventListener('click', () => { Save.save(); location.reload(); });   // 每次開都在主選單：重新整理就回到主選單
  $('btnSave').addEventListener('click', async () => {
    $('pause').hidden = true;
    const r = await UI.panel({ title: '存檔', body: '<p>選一個欄位存下目前進度。之後可以在主選單的「讀取進度」載入。</p>', buttons: [...slotButtons(), { id: null, label: '取消' }] });
    if (r) { Save.saveSlot(+r); UI.toast(`已存到 存檔 ${r}`); }
    $('pause').hidden = false;
  });

  /* ---------- 小工具 ---------- */
  const HERO = C.characters.hero.short, IDOL = C.characters.idol;
  const say = lines => UI.say(lines.map(l => typeof l === 'string' ? { who: HERO, text: l } : l));
  const think = text => ({ who: HERO, text, kind: 'fantasy' });
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const alertName = () => C.alertLevels[Math.min(C.alertLevels.length - 1, s.trips)];
  function affNote() {
    const left = (5 - s.chapter) * 18 + ['greet', 'knock', 'song'].reduce((t, k) => t + (ix()[k] ? 0 : C.affection[k]), 0);
    const best = s.affection + left, need = C.affection.happyThreshold;
    return `<p class="muted">之後最高還能到 <b>${best}%</b>・HAPPY END 需要 ${need}%${best < need ? '（已經來不及了……）' : `・還能漏掉 ${best - need}%`}</p>`;
  }
  async function card(text, sub, dur = 1.8, color) { await Cut.play(Cut.fadeCard(text, sub, color), dur); }

  /* ---------- 各物件互動 ---------- */
  const handlers = {
    async door() {
      if (s.ending) return say(['……']);
      if (!(OSHI.Sortie && OSHI.Sortie.supports(s.chapter))) return say([think(`（第${s.chapter}章「${ch().base}」……製作中，敬請期待。）`)]);
      if (!s.radioHeard) return say(['外面到處都是殭屍……', '先去廚房聽廣播，確認哪裡還有人吧。']);
      if (s.dishDone) return say(['料理已經做好了！', '先拿去冷藏室給她吧。']);
      if (s.stock >= ch().need) return say([`食材已經夠了（${s.stock}/${ch().need}）。`, '去料理台大展身手吧！']);
      const go = await UI.panel({ title: `出擊｜${ch().base}`, body: `<p>目前庫存 <b>${s.stock}/${ch().need}</b>。白天出門，穿過殭屍街道，潛入「${ch().base}」。</p><p>人類警戒等級：<b>${alertName()}</b>${s.trips ? `（本章已成功帶回 ${s.trips} 趟）` : ''}</p><p class="muted">紙板鋼彈 LV${s.armor}・武器：木製擀麵棍・身上材料與石頭從 0 開始</p>`, buttons: [{ id: 'go', label: '出擊', primary: true }, { id: null, label: '再準備一下' }] });
      if (go !== 'go') return;
      setTimeout(() => fx.night = false, 600);
      await card('白天', `前往：${ch().base}`, 2.2);
      await sortie();
    },
    async poster() { await say([think(`（${IDOL.nick}的出道海報……每天都要看一次。）`), think('（等妳完全恢復，我們再一起去看演唱會吧。）')]); },
    async armor() {
      const next = s.armor + 1, cost = C.armor.upgradeCost[next];
      const max = s.armor >= C.armor.maxLevel, enough = !max && s.cardboard >= cost.box && s.tape >= cost.tape;
      const r = await UI.panel({
        title: s.armor ? `紙板鋼彈 LV${s.armor}` : '紙板鋼彈（尚未製作）',
        body: `<p>可承受殭屍撕咬：<b>${C.armor.biteLimit[s.armor]} 次</b></p><p>持有：紙箱 <b>${s.cardboard}</b>・膠帶 <b>${s.tape}</b></p>` + (max ? '<p>已經是最強型態了。（看起來還是很廉價）</p>' : `<p>製作 LV${next} 需要：紙箱 <b>${cost.box}</b>・膠帶 <b>${cost.tape}</b></p><p class="muted">材料在街道與人類營地撿取，成功帶回才會保留。</p>`),
        buttons: [{ id: 'up', label: max ? '已達最高等級' : `製作 LV${next}`, note: max ? '' : `紙箱 ${s.cardboard}/${cost.box}・膠帶 ${s.tape}/${cost.tape}`, disabled: !enough, primary: true }, { id: null, label: '關閉' }]
      });
      if (r !== 'up') return;
      s.cardboard -= cost.box; s.tape -= cost.tape; s.armor = next; Save.save();
      await Cut.play(Cut.upgrade, 3.2, { level: next });
      UI.toast(`紙板鋼彈 LV${next}！`);
    },
    async radio() {
      if (s.radioHeard) return say([think(`（廣播說「${ch().base}」還有人……）`), { who: '', text: `目前警戒等級：${alertName()}`, kind: 'radio' }, '準備好就從正門出擊吧！']);
      fx.radioOn = true;
      await say([...ch().radio.map(t => ({ who: '廣播', text: t, kind: 'radio' })), { who: '', text: `目前警戒等級：${alertName()}`, kind: 'radio' }]);
      fx.radioOn = false;
      await say([`「${ch().base}」……！`, think('（等我，我馬上帶最新鮮的食材回來。）')]);
      s.radioHeard = true; Save.save();
      UI.toast(`取得情報：${ch().base}｜可從正門出擊`);
    },
    async prep() {
      if (s.dishDone) return say(['料理已經完成了！', '快送去冷藏室吧。']);
      if (s.stock < ch().need) return say([`食材還不夠……（${s.stock}/${ch().need}）`]);
      const steps = OSHI.Cook.steps.map(st => [st.id, st.label]); OSHI.Cook.preload(s.chapter);
      const ok = await UI.panel({ title: `製作「${ch().dish}」`, body: `<p>使用冷凍櫃中的 <b>${ch().need}</b> 份食材。依序按下指令，主廚會完成整段料理。</p>`, buttons: [{ id: 'go', label: '開始料理', primary: true }, { id: null, label: '等等' }] });
      if (ok !== 'go') return;
      for (let i = 0; i < steps.length; i++) {
        const r = await UI.panel({
          title: `「${ch().dish}」`,
          body: `<ol class="steps">${steps.map((st, j) => `<li class="${j < i ? 'done' : j === i ? 'now' : ''}">${st[1]}</li>`).join('')}</ol>`,
          buttons: [{ id: 'step', label: `${i + 1}．${steps[i][1]}`, primary: true }]
        });
        if (r !== 'step') { UI.toast('料理暫停，可以再回料理台繼續'); return; }
        await OSHI.Cook.step(i, s.chapter, ch().dish);
      }
      s.stock = 0; s.dishDone = true; Save.save();
      UI.toast(`完成「${ch().dish}」`);
      await say([think('（完美……這是只屬於妳的料理。）'), '趁熱送去冷藏室吧！']);
    },
    async stove() { await say([think('（火候，是料理的靈魂。）')]); },
    async freezer() {
      const n = ch().need, figs = Array.from({ length: n }, (_, i) => `<span class="fig ${i < s.stock ? 'on' : ''}"></span>`).join('');
      await UI.panel({ title: '商用冷凍櫃', body: `<div class="figs">${figs}</div><p class="big">${s.stock} / ${n}</p><p class="muted">${s.stock >= n ? '食材已經足夠，可以到料理台製作料理。' : '可以分批出擊累積。'}</p>`, buttons: [{ id: null, label: '關上冷凍櫃' }] });
    },
    async player() {
      if (!ix().song) return affection('song');
      const r = await UI.panel({ title: '偶像歌曲播放器', body: `<p>${IDOL.nick}的歌。</p><p class="muted">本章的親密度已經加過了，再聽不會加分。</p>`,
        buttons: [{ id: 'play', label: OSHI.Audio.playing() ? '從頭再放一次' : '再聽一次', primary: true }, ...(OSHI.Audio.playing() ? [{ id: 'stop', label: '停止播放' }] : []), { id: null, label: '關閉' }] });
      if (r === 'play') { OSHI.Audio.playSong(); await say([think(`（${IDOL.nick}的聲音……真好聽。）`)]); }
      if (r === 'stop') OSHI.Audio.stopSong();
    },
    async coldroom() {
      for (;;) {
        const d = ix(), A2 = C.affection;
        const r = await UI.panel({
          title: `冷藏室｜${IDOL.nick}`,
          body: `<p>門內傳來低沉的聲響……</p><p>親密度 <b>${s.affection}%</b>　身體恢復 <b>${s.restoreStage}/5</b></p>${affNote()}`,
          buttons: [
            { id: 'greet', label: '打招呼', note: d.greet ? '本章已完成' : `+${A2.greet}%`, disabled: d.greet },
            { id: 'knock', label: '敲門', note: d.knock ? '本章已完成' : `+${A2.knock}%`, disabled: d.knock },
            { id: 'song', label: '播放偶像歌曲', note: d.song ? '本章已完成' : `+${A2.song}%`, disabled: d.song },
            { id: 'feed', label: '餵食', note: s.dishDone ? `「${ch().dish}」` : '需要先完成料理', disabled: !s.dishDone, primary: s.dishDone },
            { id: 'look', label: '從觀察窗查看' },
            { id: null, label: '離開' }
          ]
        });
        if (!r) return;
        if (r === 'look') await look();
        else if (r === 'feed') { await feed(); return; }
        else await affection(r);
      }
    }
  };

  async function affection(kind) {
    const d = ix();
    if (d[kind]) return say([think('（今天已經做過了……明天再來吧。）')]);
    const lines = C.idolLines[kind][s.chapter - 1];
    if (kind === 'song') OSHI.Audio.playSong();
    await say(lines.map(t => ({ who: HERO, text: t, kind: 'fantasy' })));
    fx.bangText = C.idolLines.reply[(s.chapter + kind.length) % C.idolLines.reply.length];
    fx.bang = 1.4;
    await wait(500);
    await say([{ text: fx.bangText, kind: 'sfx' }, think(kind === 'song' ? '（她在跟著打節拍！）' : '（她在回應我！）')]);
    d[kind] = true; s.affection = Math.min(90, s.affection + C.affection[kind]);
    UI.toast(`親密度 +${C.affection[kind]}%`);
    if (d.greet && d.knock && d.song && !s.unlockedFantasy.includes(s.chapter)) { s.unlockedFantasy.push(s.chapter); setTimeout(() => UI.toast(`解鎖第${s.chapter}章戀愛幻想漫畫（待製作）`), 2500); }
    Save.save();
  }
  async function look() {
    const d = ix();
    const parts = C.chapters.map((c, i) => `<li class="${i < s.restoreStage ? 'ok' : i === s.restoreStage ? 'next' : ''}"><span>${i < s.restoreStage ? '✔' : i === s.restoreStage ? '▶' : '・'}</span>${c.restore}</li>`).join('');
    const acts = [['greet', '打招呼'], ['knock', '敲門'], ['song', '播放歌曲']].map(([k, n]) => `<li class="${d[k] ? 'ok' : ''}"><span>${d[k] ? '✔' : '・'}</span>${n}<em>+${C.affection[k]}%</em></li>`).join('');
    await UI.panel({
      title: `觀察窗｜${IDOL.name}`, wide: true,
      body: `<div class="look">
        <div class="look-img"><img src="${OSHI.Sprites.gifSrc(s.restoreStage)}" alt="觀察窗內的她"></div>
        <div class="look-info">
          <h3>身體恢復 ${s.restoreStage} / 5</h3><ul class="chk">${parts}</ul>
          <h3>親密度 <b class="aff">${s.affection}%</b></h3>
          <div class="bar"><i style="width:${s.affection / 90 * 100}%"></i><u style="left:${80 / 90 * 100}%"></u></div>
          ${affNote()}
          <h3>本章互動</h3><ul class="chk">${acts}</ul>
          <p class="muted">${s.dishDone ? `「${ch().dish}」已完成，可以餵食。` : `料理：${ch().dish}（庫存 ${s.stock}/${ch().need}）`}</p>
        </div></div>`,
      buttons: [{ id: null, label: '關閉觀察窗' }]
    });
  }
  async function feed() {
    const c = ch();
    OSHI.Cook.preload(s.chapter);
    await OSHI.Cook.feed(s.chapter, () => Cut.play(Cut.feed, 6.2, { chapter: s.chapter, restore: c.restore }));
    s.restoreStage = Math.max(s.restoreStage, s.chapter);
    if (!s.chaptersDone.includes(s.chapter)) s.chaptersDone.push(s.chapter);
    if (s.chapter >= 5) {
      s.ending = s.affection >= C.affection.happyThreshold ? 'HAPPY END' : "DIRECTOR'S CUT"; Save.save();
      await card(s.ending, `親密度 ${s.affection}%（結局漫畫待製作）`, 3, s.ending === 'HAPPY END' ? '#fff' : '#000');
      const r = await UI.panel({ title: s.ending, body: `<p>親密度 <b>${s.affection}%</b>。</p><p class="muted">80% 以上為 HAPPY END，其餘為 DIRECTOR'S CUT。</p>`, buttons: [{ id: 'again', label: '從第一章重新開始', primary: true }, { id: null, label: '留在餐廳' }] });
      if (r === 'again') { Save.reset(); location.reload(); }
      return;
    }
    const doneCh = ch();
    s.chapter++; s.stock = 0; s.trips = 0; s.taken = {}; s.radioHeard = false; s.dishDone = false; Save.save();
    await card(`第${doneCh.id}章 完成`, `${IDOL.name}的${doneCh.restore}恢復了`, 3, '#000');
    if (!(OSHI.Sortie && OSHI.Sortie.supports(s.chapter))) {
      const r = await UI.panel({ title: `第${doneCh.id}章「${doneCh.title}」完成`, body: `<p>${IDOL.name}的<b>${doneCh.restore}</b>恢復了。</p><p>妄想親密度：<b>${s.affection}%</b></p>${affNote()}<p class="muted">第${s.chapter}章「${ch().title}」（${ch().base}）製作中，敬請期待。</p>`, buttons: [{ id: 'stay', label: '留在餐廳', primary: true }, { id: 'again', label: '從頭再玩一次' }] });
      if (r === 'again') { Save.reset(); location.reload(); }
      return;
    }
    await card(`第${ch().id}章`, ch().title, 2.4);
    await say([think('（下一次，要讓妳變得更美。）'), '先去廚房聽聽廣播吧。']);
  }

  /* ---------- 正式出擊：殭屍街道 → 人類營地（js/sortie.js）---------- */
  async function sortie() {
    const r = await OSHI.Sortie.run(s);
    player.x = 230; player.face = 1; camX = 0;
    if (!r || r.abort) {
      Save.save();
      setTimeout(() => fx.night = true, 400);
      await card('夜晚', '……什麼都沒帶回來，先回餐廳重整吧', 2);
      return;
    }
    setTimeout(() => fx.night = true, 600);
    await card('夜晚', '返回餐廳', 2);
    s.stock = Math.min(ch().need, s.stock + r.people); s.cardboard += r.box; s.tape += r.tape;
    s.taken[s.chapter] = [...(s.taken[s.chapter] || []), ...(r.taken || [])];
    if (r.people > 0) s.trips++;
    Save.save();
    UI.toast(`${r.people ? `${r.people} 人存入冷凍櫃（${s.stock}/${ch().need}）` : '沒有帶回人'}・紙箱 +${r.box}・膠帶 +${r.tape}`);
    if (r.people > 0 && s.stock < ch().need) setTimeout(() => UI.toast(`人類警戒等級上升：${alertName()}`), 2600);
    if (s.stock >= ch().need) await say(['食材夠了！', think('（今晚就為妳做一道特別的料理。）')]);
  }

  /* ---------- 測試用出擊（還沒有地圖的章節先用這個）---------- */
  async function sortieTest() {
    const room = ch().need - s.stock, opts = [];
    for (let n = 0; n <= Math.min(3, room); n++) opts.push({ id: 'n' + n, label: n ? `帶回 ${n} 人` : '空手撤退', primary: n === Math.min(3, room) });
    opts.push({ id: 'dead', label: '死亡（測試）' });
    const r = await UI.panel({ title: '【測試】街道與人類基地製作中', body: `<p>這裡之後會是「${ch().base}」的殭屍街道與潛行關卡（警戒：${alertName()}）。</p><p class="muted">目前先選擇這趟出擊的結果，用來測試餐廳流程。成功撤退會隨機帶回少量紙箱與膠帶；死亡則本次人數與材料歸 0，也不算一趟。</p>`, buttons: opts });
    player.x = 230; player.face = 1; camX = 0;
    if (r === 'dead' || r === null) {
      await card('DEAD', '本次尚未帶回的捕獲人數已清除', 2.2);
      setTimeout(() => fx.night = true, 400);
      await card('夜晚', '……還是先回餐廳重整吧', 1.8);
      return;
    }
    const n = +r.slice(1);
    setTimeout(() => fx.night = true, 600);
    await card('夜晚', '返回餐廳', 2);
    const rnd = ([a, b]) => a + Math.floor(Math.random() * (b - a + 1));
    const box = rnd(C.testSortie.box), tape = rnd(C.testSortie.tape);
    s.stock = Math.min(ch().need, s.stock + n); s.cardboard += box; s.tape += tape;
    if (n > 0) s.trips++;
    Save.save();
    UI.toast(`${n ? `${n} 人存入冷凍櫃（${s.stock}/${ch().need}）` : '空手而回'}・紙箱 +${box}・膠帶 +${tape}`);
    if (n > 0 && s.stock < ch().need) setTimeout(() => UI.toast(`人類警戒等級上升：${alertName()}`), 2600);
    if (s.stock >= ch().need) await say(['食材夠了！', think('（今晚就為妳做一道特別的料理。）')]);
  }

  /* ---------- 主迴圈 ---------- */
  const canvas = $('game'), ctx = canvas.getContext('2d');
  function resize() {
    const dpr = Math.min(matchMedia('(pointer:coarse)').matches ? 1.25 : 2, window.devicePixelRatio || 1), w = canvas.clientWidth || 1280, h = canvas.clientHeight || 720;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    SW = Math.min(W.W, Math.max(960, SH * w / h)); if (OSHI.Sortie && OSHI.Sortie.setView) OSHI.Sortie.setView(SH * w / h);
  }
  function cutBox() { const sc = Math.min(SW / 1280, SH / 720); return { sc, ox: (SW - 1280 * sc) / 2, oy: (SH - 720 * sc) / 2 }; }
  function drawCut() { const b = cutBox(); ctx.save(); if (b.ox > 0 || b.oy > 0) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, SW, SH); } ctx.translate(b.ox, b.oy); ctx.scale(b.sc, b.sc); ctx.beginPath(); ctx.rect(0, 0, 1280, 720); ctx.clip(); Cut.draw(ctx, time); ctx.restore(); }
  window.addEventListener('resize', resize); window.addEventListener('orientationchange', () => setTimeout(resize, 250)); resize();
  OSHI.Sprites.load(p => { $('loadLabel').textContent = `載入素材中… ${Math.round(p * 100)}%`; }).then(() => {
    ready = true; $('loadLabel').hidden = true; refreshMenu();
    // 在主選單時先在背景下載序章和進店漫畫的圖
    if (OSHI.STORY) OSHI.Comic.preload(OSHI.STORY.prologue);
    try { OSHI.Comic.preload(OSHI.SORTIE.chapters[1].base.firstComic); } catch (e) {}
  });

  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);  // 先排下一幀：就算這一幀出錯，遊戲也不會整個停住
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (!paused) update(dt);
    render();
  }
  function update(dt) {
    time += dt; UI.tickDialog(dt); Cut.update(dt);
    if (OSHI.Sortie && OSHI.Sortie.active) { OSHI.Sortie.update(dt); document.body.classList.toggle('cut', Cut.active); return; }
    fx.bang = Math.max(0, fx.bang - dt); fx.songOn = OSHI.Audio.playing() ? 1 : 0;
    OSHI.Audio.update(dt, player.x, 2290);
    const canMove = started && !busy && !UI.dialogOpen && !UI.panelOpen && !Cut.active;
    const dir = canMove ? ((held.has('KeyD') || held.has('ArrowRight') || touch.right ? 1 : 0) - (held.has('KeyA') || held.has('ArrowLeft') || touch.left ? 1 : 0)) : 0;
    player.moving = dir !== 0;
    if (dir) { player.face = dir; player.x = Math.max(70, Math.min(W.W - 90, player.x + dir * C.walkSpeed * dt)); player.phase += dt * 11; }
    const target = Math.max(0, Math.min(W.W - SW, player.x - SW / 2));
    camX += (target - camX) * Math.min(1, dt * 6);
    near = null;
    if (canMove) { let best = C.interactRange; for (const o of W.objects) { const d = Math.abs(o.x - player.x); if (d < best) { best = d; near = o; } } }
    $('tAct').textContent = near ? near.label : '互動';
    $('tAct').classList.toggle('ready', !!near);
    UI.hud(s, ch(), W.zoneOf(player.x).name);
    document.body.classList.toggle('cut', Cut.active);
  }
  function render() {
    const k = canvas.height / SH; ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.clearRect(0, 0, SW, SH);
    if (OSHI.Sortie && OSHI.Sortie.active) { OSHI.Sortie.draw(ctx); if (Cut.active) drawCut(); return; }
    ctx.save(); ctx.translate(-Math.round(camX), 0);
    W.draw(ctx, { night: fx.night, t: time, armor: s.armor, stage: s.restoreStage, radioOn: fx.radioOn, bang: fx.bang > 0, bangAge: fx.bang > 0 ? 1.4 - fx.bang : null, bangText: fx.bangText, songOn: fx.songOn > 0, stock: s.stock, need: ch().need });
    A.chef(ctx, player.x, W.FLOOR, C.chefHeight / 215, { face: player.face, phase: player.phase, moving: player.moving, t: time, expr: fx.bang > 0 ? 'happy' : 'normal' });
    if (near && !UI.dialogOpen && !UI.panelOpen && !Cut.active) prompt(near);
    ctx.restore();
    if (Cut.active) drawCut();
  }
  function prompt(o) {
    const touchMode = document.body.classList.contains('touch');
    const text = touchMode ? o.label : `E　${o.label}`;
    ctx.font = 'bold 20px sans-serif'; const w = ctx.measureText(text).width + 30, x = o.x - w / 2, y = 150 + Math.sin(time * 4) * 4;
    A.rr(ctx, x, y, w, 40, 20); A.fillStroke(ctx, '#fff', A.INK, 3);
    ctx.fillStyle = A.INK; ctx.beginPath(); ctx.moveTo(o.x - 8, y + 40); ctx.lineTo(o.x + 8, y + 40); ctx.lineTo(o.x, y + 52); ctx.fill();
    ctx.fillText(text, x + 15, y + 27);
  }

  /* ---------- 主選單：繼續玩／重新開始／讀取進度 ---------- */
  const fmtTime = t => { if (!t) return ''; const d = new Date(t), p = n => String(n).padStart(2, '0'); return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`; };
  const sumOf = d => { const c = C.chapters[d.chapter - 1] || C.chapters[0]; return `第${d.chapter}章｜${c.title}・冷凍櫃 ${d.stock}/${c.need}・♥${d.affection}%`; };
  function slotButtons() {
    const out = [];
    for (let n = 1; n <= Save.SLOTS; n++) { const d = Save.peekSlot(n); out.push({ id: String(n), label: `存檔 ${n}`, note: d ? `${sumOf(d)}　${fmtTime(d.savedAt)}` : '（空）' }); }
    return out;
  }
  let ready = false;
  function refreshMenu() {
    if (!ready) { ['mContinue', 'mNew', 'mLoad'].forEach(id => $(id).disabled = true); return; }
    const d = Save.peekAuto(), has = !!d && !(d.chapter === 1 && !(d.seenComics || []).includes('ch1-open'));
    $('mContinue').disabled = !has; $('mContinueSub').textContent = has ? `${sumOf(d)}　${fmtTime(d.savedAt)}` : '沒有存檔';
    let any = false; for (let n = 1; n <= Save.SLOTS; n++) if (Save.peekSlot(n)) any = true;
    $('mLoad').disabled = !any; $('mNew').disabled = false;
    $('mNew').classList.remove('warn'); delete $('mNew').dataset.armed; $('mNewSub').textContent = has ? '會覆蓋「繼續玩」的進度（手動存檔不受影響）' : '從序章開始';
  }
  function showSlots() {
    $('menu').hidden = true; $('slots').hidden = false; $('title').classList.add('slotmode');
    const list = $('slotList'); list.replaceChildren();
    for (let n = 1; n <= Save.SLOTS; n++) {
      const d = Save.peekSlot(n), b = document.createElement('button'); b.className = 'mbtn'; b.disabled = !d;
      b.innerHTML = `<b>存檔 ${n}</b><small>${d ? `${sumOf(d)}　${fmtTime(d.savedAt)}` : '（空）'}</small>`;
      b.onclick = () => { s = Save.loadSlot(n); startGame(); };
      list.append(b);
    }
  }
  $('slotsBack').onclick = () => { $('slots').hidden = true; $('menu').hidden = false; $('title').classList.remove('slotmode'); };
  $('mContinue').onclick = () => { s = Save.load(); startGame(); };
  $('mLoad').onclick = showSlots;
  $('mNew').onclick = () => {
    if (!$('mContinue').disabled && !$('mNew').dataset.armed) { $('mNew').dataset.armed = '1'; $('mNew').classList.add('warn'); $('mNewSub').textContent = '再按一次確認：目前進度會被清除'; return; }
    s = Save.reset(); startGame();
  };
  refreshMenu();

  /* ---------- 開始 ---------- */
  async function startGame() {
    $('title').hidden = true; started = true;
    player.x = 1440; player.face = 1; camX = player.x - SW / 2; fx.night = true;
    const fs = document.documentElement.requestFullscreen; if (fs) document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
    if (isNewSave()) {
      s.seenComics.push('ch1-open'); Save.save();
      await run(async () => {
        if (OSHI.STORY) await OSHI.Comic.play(OSHI.STORY.prologue);   // 序章漫畫
        setTimeout(() => fx.night = true, 0);
        await card('第1章', '初次約會', 2.2);
        await say([think('（今晚開始，我們就住在一起了。）'), think('（妳一定會恢復的。由我來負責妳的每一餐！）'), '……先去廚房聽聽廣播吧。']);
      });
      UI.toast(document.body.classList.contains('touch') ? '左下按鈕移動・右下按鈕互動' : 'A／D 或方向鍵移動・E 互動・Esc 暫停');
    } else UI.toast(`第${s.chapter}章｜${ch().title}`);
  }
  OSHI.debug = { player, fx, get s() { return s; } }; // 測試用
  requestAnimationFrame(frame);
})();
