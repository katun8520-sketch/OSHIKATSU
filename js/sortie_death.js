'use strict';
/* 死亡動畫（黑影）：被殭屍 4 種、被人類 3 種。每段約 3 秒，點擊可跳過，之後接 DEAD 畫面。
   角色剪影直接用正式素材塗黑（OSHI.SSprites.sil），所以跟遊戲裡的角色一模一樣。 */
OSHI.SDeath = (() => {
  const SW = 1280, SH = 720, INK = '#000', S = () => OSHI.SSprites;
  const seg = (k, a, b) => Math.max(0, Math.min(1, (k - a) / (b - a)));
  const ease = k => 1 - Math.pow(1 - k, 3);
  const pickv = d => (d.v || 0) % 3;
  const chefKey = d => (S().chefBase(d.armor || 0)) + 's1';

  // 畫剪影：(x,y)=腳底，h=身高；o.rot 以腳底為軸旋轉；o.clip=[上緣比例, 下緣比例] 只畫身體的一段
  function sil(ctx, key, x, y, h, o = {}) {
    const im = S().sil(key), m = S().frame(key); if (!im || !m) return;
    const k = h / 360;
    ctx.save(); ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot); if (o.flip) ctx.scale(-1, 1);
    if (o.clip) { ctx.beginPath(); ctx.rect(-2000, -m.by * k + m.h * k * o.clip[0], 4000, m.h * k * (o.clip[1] - o.clip[0])); ctx.clip(); }
    ctx.drawImage(im, -m.ax * k, -m.by * k, m.w * k, m.h * k); ctx.restore();
  }
  function paper(ctx, c = '#e9e5dc') { ctx.fillStyle = c; ctx.fillRect(0, 0, SW, SH); }
  function lines(ctx, cx, cy, t, a = .25) {
    ctx.strokeStyle = `rgba(0,0,0,${a})`;
    for (let i = 0; i < 60; i++) { const g = i * 2.39996 + t, r0 = 260 + ((i * 53) % 140); ctx.lineWidth = 1 + (i % 3); ctx.beginPath(); ctx.moveTo(cx + Math.cos(g) * r0, cy + Math.sin(g) * r0); ctx.lineTo(cx + Math.cos(g) * 1400, cy + Math.sin(g) * 1400); ctx.stroke(); }
  }
  function sfx(ctx, text, x, y, size = 110, rot = -.12, fill = '#fff', stroke = INK) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.font = `900 italic ${size}px serif`; ctx.lineJoin = 'round';
    ctx.strokeStyle = stroke; ctx.lineWidth = size / 8; ctx.strokeText(text, 0, 0); ctx.fillStyle = fill; ctx.fillText(text, 0, 0); ctx.restore();
  }
  function flash(ctx, k, a, b, col = '#fff') { const f = seg(k, a, b); if (f > 0 && f < 1) { ctx.fillStyle = col; ctx.globalAlpha = 1 - f; ctx.fillRect(0, 0, SW, SH); ctx.globalAlpha = 1; } }
  function shake(ctx, k, a, b, amp = 18) { const f = seg(k, a, b); if (f > 0 && f < 1) ctx.translate(Math.sin(k * 300) * amp * (1 - f), Math.cos(k * 260) * amp * (1 - f)); }
  function floor(ctx, y = 600) { ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(0, y, SW, SH - y); }
  function fadeEnd(ctx, k, from = .85) { const f = seg(k, from, 1); if (f) { ctx.fillStyle = '#000'; ctx.globalAlpha = f; ctx.fillRect(0, 0, SW, SH); ctx.globalAlpha = 1; } }

  /* ---------- 殭屍 ---------- */
  // 1 撲倒：殭屍從右邊撲上來，健太往後倒
  function zPounce(ctx, k, el, d) {
    paper(ctx); floor(ctx); ctx.save(); shake(ctx, k, .32, .6);
    const z = 'z' + pickv(d) + '_w0';
    if (k < .34) {
      lines(ctx, 760, 400, el * 2);
      sil(ctx, chefKey(d), 520, 620, 400);
      sil(ctx, z, 1500 - ease(seg(k, .05, .34)) * 820, 620, 400, { rot: -.35 * seg(k, .15, .34), flip: true });
    } else {
      const f = ease(seg(k, .34, .62));
      sil(ctx, chefKey(d), 560, 640, 400, { rot: -f * 1.5 });
      sil(ctx, z, 760 - f * 120, 640 - f * 70, 400, { rot: -.5 - f * .6, flip: true });
      if (k > .38) sfx(ctx, 'ガブッ！', 640, 230, 140, -.1, '#fff', '#000');
      if (k > .65) sfx(ctx, 'グチャ…', 860 + Math.sin(el * 30) * 3, 420, 70, .06);
    }
    ctx.restore(); flash(ctx, k, .34, .44); fadeEnd(ctx, k);
  }
  // 2 拖進黑暗：地上伸出黑手抓住腳，把他拖進左邊的黑暗
  function zDrag(ctx, k, el, d) {
    paper(ctx); floor(ctx, 560);
    const pull = ease(seg(k, .45, .95)), cx = 760 - pull * 820;
    const g = ctx.createLinearGradient(0, 0, 640, 0); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 640 + seg(k, .3, 1) * 500, SH);
    sil(ctx, chefKey(d), cx, 610, 380, { rot: Math.PI / 2 + Math.sin(el * 25) * .04 * (1 - pull) });   // 腳朝左（黑暗那邊）
    // 黑手
    ctx.fillStyle = INK;
    for (let i = 0; i < 5; i++) {
      const reach = ease(seg(k, .05 + i * .05, .4 + i * .04)), hx = -40 + reach * (cx + 10 + i * 12), hy = 560 + i * 18 - Math.sin(el * 6 + i) * 6;
      ctx.beginPath(); ctx.moveTo(-40, hy - 14); ctx.lineTo(hx, hy - 8); ctx.lineTo(hx, hy + 8); ctx.lineTo(-40, hy + 14); ctx.fill();
      for (let f = 0; f < 4; f++) { ctx.beginPath(); ctx.ellipse(hx + 14, hy - 12 + f * 8, 16, 4, -.3 + f * .2, 0, 7); ctx.fill(); }
    }
    if (k > .45) sfx(ctx, 'ズル…ズル…', 760, 220, 90, -.06);
    if (k < .4) sfx(ctx, '！？', 860, 330, 100, .1);
    fadeEnd(ctx, k);
  }
  // 3 包圍：殭屍從四周慢慢圍上來，圈越縮越小
  function zSurround(ctx, k, el, d) {
    paper(ctx, '#ddd8ce'); floor(ctx);
    const r = 760 - ease(seg(k, .05, .8)) * 600, n = 7, out = [];
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + .3; out.push({ x: 640 + Math.cos(a) * r, y: 610 + Math.sin(a) * r * .28, v: i % 3, flip: Math.cos(a) > 0 }); }
    out.push({ me: true, x: 640, y: 610 });
    out.sort((a, b) => a.y - b.y).forEach(o => {
      if (o.me) sil(ctx, chefKey(d), o.x + Math.sin(el * 30) * 2, o.y, 380);
      else sil(ctx, 'z' + o.v + '_w' + (Math.floor(el * 5 + o.v) % 4), o.x, o.y, 360 + (o.y - 520) * .4, { flip: o.flip });
    });
    // 暗角收縮
    const g = ctx.createRadialGradient(640, 420, Math.max(10, 520 - seg(k, .3, .95) * 520), 640, 420, 900);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.35, 'rgba(0,0,0,.85)'); g.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, SW, SH);
    if (k > .25) sfx(ctx, 'ウゥゥ…', 180, 160, 80, -.05, '#bbb');
    if (k > .62) sfx(ctx, 'ア゛ア゛…', 820, 230, 80, .05, '#bbb');
    fadeEnd(ctx, k, .9);
  }
  // 4 頭被咬掉：殭屍撲向頭部，咬下來的頭被叼走，身體站著倒下
  function zHead(ctx, k, el, d) {
    paper(ctx); floor(ctx); ctx.save(); shake(ctx, k, .4, .62, 22);
    const z = 'z' + pickv(d) + '_w0', neck = .4, ck = chefKey(d);
    if (k < .4) {
      lines(ctx, 600, 300, el * 2);
      sil(ctx, ck, 560, 620, 420);
      sil(ctx, z, 1450 - ease(seg(k, .08, .4)) * 760, 600 - Math.sin(seg(k, .2, .4) * Math.PI) * 120, 400, { rot: -.6 * seg(k, .2, .4), flip: true });
      if (k > .2) sfx(ctx, '！', 470, 170, 120, 0);
    } else {
      const fall = ease(seg(k, .62, .9)), fly = ease(seg(k, .4, .75));
      sil(ctx, ck, 560, 620, 420, { clip: [neck, 1], rot: -fall * 1.45 });                       // 身體
      ctx.save(); ctx.translate(fly * 260, -fly * 40);                                            // 被叼走的頭
      sil(ctx, ck, 560, 620, 420, { clip: [0, neck], rot: fly * .9 }); ctx.restore();
      sil(ctx, z, 760 + fly * 260, 600 - fly * 30, 400, { rot: -.6 + fly * .4, flip: true });
      sfx(ctx, 'ブチッ', 540, 220, 150, -.12, '#fff');
      if (k > .7) sfx(ctx, 'ドサッ', 330, 560, 80, .08);
    }
    ctx.restore(); flash(ctx, k, .4, .5, '#8a0000'); fadeEnd(ctx, k);
  }

  // 4b 頭被咬掉（使用者提供的 GIF 剪影動畫，6 格）
  const ZH = { ms: [450, 180, 160, 220, 220, 950], img: [] };
  for (let i = 0; i < 6; i++) { const im = new Image(); im.src = 'assets/death/zhead' + i + '.png'; ZH.img.push(im); }
  function zHeadGif(ctx, k, el) {
    paper(ctx); floor(ctx, 620);
    let t = el * 1000, f = 0; while (f < 5 && t >= ZH.ms[f]) { t -= ZH.ms[f]; f++; }
    ctx.save(); if (f === 2 && t < 200) ctx.translate(Math.sin(el * 300) * 16, Math.cos(el * 260) * 12);
    if (f <= 1) lines(ctx, 640, 330, el * 2, .18);
    const im = ZH.img[f]; if (im.complete && im.naturalWidth) ctx.drawImage(im, 640 - 360, 645 - 720 * .94, 720, 720);
    ctx.restore();
    if (f === 1) sfx(ctx, 'ガッ！', 840, 190, 110, .1);
    if (f >= 2) sfx(ctx, 'ブチッ', 330, 210, 150, -.12);
    if (f >= 4) sfx(ctx, 'ドサッ', 900, 560, 80, .08);
    if (f === 2) flash(ctx, Math.min(1, t / 250), 0, 1, '#8a0000');
    fadeEnd(ctx, k, .9);
  }

  // 人類：拿鐵管一直打（使用者提供的 GIF 剪影動畫，6 格，重複 3 次）
  const HB = { ms: [170, 80, 80, 100, 140, 140], img: [] };
  for (let i = 0; i < 6; i++) { const im = new Image(); im.src = 'assets/death/hbeat' + i + '.png'; HB.img.push(im); }
  function hBeatGif(ctx, k, el) {
    paper(ctx); floor(ctx, 620);
    const loop = HB.ms.reduce((a, b) => a + b, 0), n = Math.floor(el * 1000 / loop);
    let t = (n >= 3 ? loop - 1 : el * 1000 % loop), f = 0; while (f < 5 && t >= HB.ms[f]) { t -= HB.ms[f]; f++; }
    if (n >= 3) f = 5;
    ctx.save(); if (f === 2 && n < 3) ctx.translate(Math.sin(el * 300) * 12, Math.cos(el * 260) * 8);
    const im = HB.img[f]; if (im.complete && im.naturalWidth) ctx.drawImage(im, 640 - 360, 645 - 720 * .94, 720, 720);
    ctx.restore();
    const words = ['ドカッ', 'バキッ', 'ゴッ'];
    for (let i = 0; i <= Math.min(2, n); i++) if (i < n || f >= 2) sfx(ctx, words[i], [260, 820, 980][i], [200, 300, 130][i], 110, [-.15, .1, -.05][i]);
    fadeEnd(ctx, k, .88);
  }

  /* ---------- 人類 ---------- */
  // 1 一棍打倒
  function hSwing(ctx, k, el, d) {
    paper(ctx); floor(ctx); ctx.save(); shake(ctx, k, .42, .65);
    const f = 'f' + pickv(d), fall = ease(seg(k, .45, .75));
    if (k < .42) { lines(ctx, 700, 360, el * 2); sil(ctx, f + '_look', 400 + ease(seg(k, 0, .3)) * 120, 620, 400); }
    else sil(ctx, f + '_attack', 540, 620, 420);
    sil(ctx, chefKey(d), 820, 630, 400, { rot: fall * 1.5, flip: true });
    if (k > .42) sfx(ctx, 'ドカッ！！', 700, 240, 140, -.12);
    if (k > .78) sfx(ctx, 'ピヨ…', 980, 470, 60, .05);
    ctx.restore(); flash(ctx, k, .42, .52); fadeEnd(ctx, k);
  }
  // 2 圍毆
  function hGang(ctx, k, el, d) {
    paper(ctx); floor(ctx, 560); ctx.save();
    const hit = Math.floor(el * 4) % 3; ctx.translate(Math.sin(el * 70) * 4, 0);
    sil(ctx, chefKey(d), 640, 640, 360, { rot: -Math.PI / 2 });
    [[430, 0, false], [850, 1, true], [640, 2, false]].forEach(([x, v, flip], i) => {
      const up = hit === i ? Math.sin((el * 4 % 1) * Math.PI) : 0, y = i === 2 ? 520 : 600;
      sil(ctx, 'f' + v + (hit === i ? '_attack' : '_look'), x, y - up * 20, i === 2 ? 340 : 400, { flip });
    });
    const words = ['ドカッ', 'バキッ', 'ボコッ'];
    for (let i = 0; i < 3; i++) if (k > i * .2 + .05) sfx(ctx, words[i], [260, 860, 520][i], [220, 260, 150][i], 100, [-.15, .1, -.05][i]);
    ctx.restore(); fadeEnd(ctx, k);
  }
  // 3 貨架壓下來（只在便利商店）
  function hShelf(ctx, k, el, d) {
    paper(ctx); floor(ctx); ctx.save(); shake(ctx, k, .5, .75, 26);
    const tip = ease(seg(k, .15, .52)) * (1 - Math.abs(Math.sin(seg(k, .52, .62) * Math.PI)) * .06), im = S().sil('st_endcap', true);
    const me = () => sil(ctx, chefKey(d), 800, 630, 360, { rot: -ease(seg(k, .48, .56)) * Math.PI / 2, flip: true });
    if (k >= .48) me();
    if (k < .52) sfx(ctx, 'グラッ…', 900, 180, 90, .1);
    if (im) {
      const h = 560, w = h * im.width / im.height;   // 高高的貨架，以右下角為軸往左倒
      ctx.save(); ctx.translate(900, 630); ctx.rotate(-tip * Math.PI / 2 * .97); ctx.drawImage(im, 0, -h, w, h); ctx.restore();
    }
    if (k < .48) me();   // 倒下前：人在貨架前面
    if (k > .52) { sfx(ctx, 'ガシャーン！！', 300, 230, 120, -.1); ctx.fillStyle = INK; for (let i = 0; i < 12; i++) { const a = i * .9 + el; ctx.beginPath(); ctx.ellipse(640 + Math.cos(a) * (200 + i * 12) * seg(k, .52, .8), 600 - Math.abs(Math.sin(a)) * 160 * seg(k, .52, .7), 12, 8, a, 0, 7); ctx.fill(); } }
    ctx.restore(); flash(ctx, k, .52, .62); fadeEnd(ctx, k);
  }

  return {
    zombie: [
      { fn: zHeadGif, dur: 3, text: '頭被咬掉了' }   // 被殭屍弄死只用這一段（使用者指定）
    ],
    human: [
      { fn: hBeatGif, dur: 2.8, text: '被鐵管打死了' }   // 被人類弄死只用這一段（使用者指定）
    ]
  };
})();
