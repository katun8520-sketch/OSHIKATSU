'use strict';
/* 料理與餵食演出（資料驅動）
   - 切肉：黑影 GIF 影格（assets/cook/chop0.png…），沒有圖時用舊的程式剪影動畫代替
   - 烹調、調味、擺盤、餵食：漫畫格（OSHI.Comic），沒有圖時用佔位畫面＋說明文字
   - 擺盤後：成品卡（料理圖＋金光＋菜名）
   圖放好、改這裡的檔名或格數就會自動換上。 */
OSHI.COOK = {
  // 切肉 GIF：n＝格數、ms＝每格毫秒（最後一格停久一點）。圖放 assets/cook/chop0.png ～ chop{n-1}.png
  chop: { src: 'assets/cook/chop', n: 8, ms: [350, 300, 140, 260, 140, 260, 200, 1000], sfxFrames: [2, 4], sfx: '唰唰唰唰！', end: '完美切塊！' },
  // 料理四步驟（按一次播一段）
  steps: [
    { id: 'cut', label: '切肉', type: 'chop' },
    { id: 'fire', label: '下鍋／烹調', type: 'comic', cuts: [
      { id: 'COOK 01', img: 'assets/comic/cook_01.jpg', dur: 2.2, focusY: .15, fx: 'rays', push: .06, desc: '夜晚廚房：健太站在大火前，平底鍋裡的肉排滋滋作響，火焰竄起',
        sfx: [{ text: '滋——', x: 880, y: 210, size: 110, at: .2, rot: -.1 }], lines: [{ who: '健太', text: '火候，是料理的靈魂。', at: .5 }] },
      { id: 'COOK 02', img: 'assets/comic/cook_02.jpg', dur: 1.6, fx: 'speed', shake: true, shakeAt: .3, desc: '翻鍋特寫：肉排在空中翻面，油花和火焰四濺',
        sfx: [{ text: '轟！！', x: 470, y: 190, size: 160, at: .25, rot: -.14 }], lines: [] }
    ] },
    { id: 'season', label: '調味', type: 'comic', cuts: [
      { id: 'COOK 03', img: 'assets/comic/cook_03.jpg', dur: 2.4, focusY: .1, fx: 'rays', flashAt: .5, desc: '健太高舉手臂從高處撒鹽，鹽像瀑布落下，眼鏡反射白光',
        sfx: [{ text: '鏘！', x: 180, y: 220, size: 140, at: .5, rot: -.2 }], lines: [{ who: '健太', text: '（最後這一撮……是愛。）', at: .9, pink: true }] }
    ] },
    { id: 'plate', label: '擺盤', type: 'comic', card: true, cuts: [
      { id: 'COOK 04', img: 'assets/comic/cook_04.jpg', dur: 2.4, push: .1, desc: '健太屏住呼吸，用鑷子把最後一片香芹放到盤子上，額頭冒汗、極度專注',
        lines: [] }
    ] }
  ],
  // 料理成品圖（每章一道，透明 PNG）
  dishImg: ch => 'assets/cooking/dish' + ch + '.png',
  // 餵食漫畫（第一章：手臂、雙手恢復）
  feed: {
    1: [
      { id: 'FEED 01', img: 'assets/comic/feed1_01.jpg', dur: 2.4, focusY: .25, desc: '夜晚，健太捧著蓋著餐蓋的盤子，站在厚重的冷藏室鐵門前，表情溫柔',
        lines: [{ who: '健太', text: '美月，晚餐做好了喔。', at: .4 }] },
      { id: 'FEED 02', img: 'assets/comic/feed1_02.jpg', dur: 2.4, push: .08, desc: '送餐口特寫：健太把盤子從門下方的送餐口推進去，門內一片漆黑',
        sfx: [{ text: '喀啦——', x: 820, y: 220, size: 100, at: .3, rot: -.08 }], lines: [{ who: '健太', text: '是初戀的心跳漢堡排。', at: 1, pink: true }] },
      { id: 'FEED 03', img: 'assets/comic/feed1_03.jpg', dur: 2.6, desc: '漆黑的冷藏室裡傳來進食的聲音，觀察窗後只看得到模糊的影子',
        sfx: [{ text: '喀滋……', x: 300, y: 260, size: 90, at: .4, rot: -.1 }, { text: '喀滋……', x: 760, y: 470, size: 70, at: 1.4, rot: .08 }], lines: [] },
      { id: 'FEED 04', img: 'assets/comic/feed1_04.jpg', dur: 2.6, fx: 'rays', push: .1, desc: '觀察窗裡的特寫：一雙恢復成白皙光滑的女性手臂和手，手肘以上隱沒在黑暗中',
        lines: [] },
      { id: 'FEED 05', img: 'assets/comic/feed1_05.jpg', dur: 3, fx: 'hearts', desc: '健太貼在觀察窗外感動到流淚，眼鏡起霧、臉頰泛紅',
        lines: [{ who: '健太', text: '妳看，手已經好多了。', at: .3, pink: true }, { who: '健太', text: '我的方法沒有錯。', at: 1.8, pink: true }] }
    ]
  }
};

OSHI.Cook = (() => {
  const A = OSHI.Art, Cut = OSHI.Cut, INK = '#151515', PINK = '#f19cb9', SW = 1280, SH = 720, CFG = OSHI.COOK;
  const cache = {};
  const img = src => { if (!cache[src]) { const i = new Image(); i.src = src; cache[src] = i; } const i = cache[src]; return i.complete && i.naturalWidth ? i : null; };
  // 先載入，避免播放時才開始抓圖
  function preload(ch) {
    for (let i = 0; i < CFG.chop.n; i++) img(CFG.chop.src + i + '.png');
    for (const s of CFG.steps) for (const c of s.cuts || []) img(c.img);
    for (const c of CFG.feed[ch] || []) img(c.img);
    img(CFG.dishImg(ch));
  }
  function sfx(ctx, text, x, y, size, rot = -.12, fill = '#fff') {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.font = `900 italic ${size}px serif`; ctx.lineJoin = 'round';
    ctx.strokeStyle = INK; ctx.lineWidth = size / 9; ctx.strokeText(text, 0, 0); ctx.fillStyle = fill; ctx.fillText(text, 0, 0); ctx.restore();
  }
  function rays(ctx, cx, cy, color, n, spin, inner = 80) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(spin); ctx.fillStyle = color;
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, w = Math.PI / n * .55; ctx.beginPath(); ctx.moveTo(Math.cos(a - w) * inner, Math.sin(a - w) * inner); ctx.lineTo(Math.cos(a) * 1600, Math.sin(a) * 1600); ctx.lineTo(Math.cos(a + w) * inner, Math.sin(a + w) * inner); ctx.fill(); }
    ctx.restore();
  }
  function star(ctx, x, y, r, c) {
    ctx.save(); ctx.translate(x, y); ctx.fillStyle = c; ctx.beginPath();
    for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * .28 : r, a = i * Math.PI / 4; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill(); ctx.restore();
  }

  /* ---------- 切肉：黑影 GIF ---------- */
  const chopFrames = () => { const out = []; for (let i = 0; i < CFG.chop.n; i++) { const f = img(CFG.chop.src + i + '.png'); if (!f) return null; out.push(f); } return out; };
  const chopLen = () => CFG.chop.ms.reduce((a, b) => a + b, 0) / 1000;
  function drawChop(ctx, k, el) {
    const fr = chopFrames(), C = CFG.chop;
    let t = el * 1000, f = 0; while (f < C.n - 1 && t >= C.ms[f]) { t -= C.ms[f]; f++; }
    const chopping = C.sfxFrames.includes(f);
    ctx.fillStyle = '#f4f1ea'; ctx.fillRect(0, 0, SW, SH);
    if (chopping) { ctx.strokeStyle = 'rgba(0,0,0,.5)'; for (let i = 0; i < 60; i++) { const a = i * 2.39996 + el * 9, r0 = 300 + ((i * 53) % 160); ctx.lineWidth = 1 + (i % 3); ctx.beginPath(); ctx.moveTo(SW / 2 + Math.cos(a) * r0, SH / 2 + Math.sin(a) * r0); ctx.lineTo(SW / 2 + Math.cos(a) * 1300, SH / 2 + Math.sin(a) * 1300); ctx.stroke(); } }
    const S = 620, jit = chopping ? (Math.random() - .5) * 8 : 0;
    ctx.drawImage(fr[f], SW / 2 - S / 2 + jit, SH / 2 - S / 2 + 10 + jit, S, S);
    if (chopping) sfx(ctx, C.sfx, 760, 170, 96);
    if (f === C.n - 1) sfx(ctx, C.end, 820, 190, 76, -.08, '#fff2a0');
  }
  const blackWait = ctx => { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, SW, SH); ctx.fillStyle = '#888'; ctx.font = '22px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('載入中…', SW / 2, SH / 2); ctx.textAlign = 'left'; };
  async function waitFor(ok, ms = 15000) { const t0 = performance.now(); while (!ok() && performance.now() - t0 < ms) await Cut.play(blackWait, .15); }
  async function chop(ch) {
    preload(ch); await waitFor(() => chopFrames());   // 圖還在下載就先等，不要直接跳過
    if (chopFrames()) await Cut.play(drawChop, chopLen() + .3);
    else await Cut.play(Cut.cookCut, 3.4, { chapter: ch });   // 圖還沒到：用舊的剪影動畫
  }

  /* ---------- 成品卡 ---------- */
  function drawDish(ctx, k, el, d) {
    const inK = Math.min(1, el / .5), pop = 1 + Math.sin(Math.min(1, el / .5) * Math.PI) * .12;
    ctx.fillStyle = '#fff8e8'; ctx.fillRect(0, 0, SW, SH);
    rays(ctx, SW / 2, 380, `rgba(255,205,90,${.55 * inK})`, 40, el * .35);
    rays(ctx, SW / 2, 380, `rgba(241,156,185,${.35 * inK})`, 24, -el * .25, 140);
    const im = img(CFG.dishImg(d.chapter)), S = 470 * (.6 + .4 * inK) * pop;
    if (im) ctx.drawImage(im, SW / 2 - S / 2, 395 - S / 2, S, S);
    for (let i = 0; i < 18; i++) {
      const a = i * .9 + el * .8, r = 300 + (i % 4) * 46, x = SW / 2 + Math.cos(a) * r, y = 390 + Math.sin(a) * r * .55;
      if (i % 3 === 0) star(ctx, x, y, 18 + (i % 2) * 10, '#ffe27a'); else if (i % 3 === 1) A.heart(ctx, x, y, 18, PINK); else { ctx.fillStyle = '#f7c4d6'; ctx.beginPath(); ctx.ellipse(x, y, 11, 6, a, 0, 7); ctx.fill(); }
    }
    ctx.save(); ctx.globalAlpha = inK; ctx.textAlign = 'center'; ctx.font = '900 54px serif'; ctx.lineJoin = 'round';
    ctx.lineWidth = 10; ctx.strokeStyle = '#fff'; ctx.strokeText(`「${d.dish}」`, SW / 2, 110); ctx.fillStyle = INK; ctx.fillText(`「${d.dish}」`, SW / 2, 110); ctx.restore();
    if (el > .6) sfx(ctx, '完成！！', 850, 655, 88, -.1, '#ffe27a');
  }
  const dishCard = async (ch, dish) => { await waitFor(() => img(CFG.dishImg(ch))); await Cut.play(drawDish, 3.6, { chapter: ch, dish }); };

  /* ---------- 對外 ---------- */
  async function step(i, ch, dish) {
    const s = CFG.steps[i];
    if (s.type === 'chop') await chop(ch);
    else await OSHI.Comic.play(s.cuts);
    if (s.card) await dishCard(ch, dish);
  }
  async function feed(ch, fallback) {
    const cuts = CFG.feed[ch];
    if (cuts) await OSHI.Comic.play(cuts); else if (fallback) await fallback();
  }
  return { steps: CFG.steps, step, feed, dishCard, preload };
})();
