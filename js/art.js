'use strict';
/* =========================================================
   佔位美術：全部用程式繪製（Q 版胖廚師、餐廳背景、冷藏室窗內）
   正式素材到位後可逐項替換（見 README 素材清單）
   ========================================================= */
OSHI.Art = (() => {
  const INK = '#151515', PINK = '#f19cb9', SKIN = '#f3dcc7', CARD = '#c8ab7f', CARD_D = '#8f7450';

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function ell(ctx, x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); }
  function fillStroke(ctx, fill, stroke = INK, lw = 3) { if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); } }
  function star(ctx, x, y, r, fill = '#fff') {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * .45 : r; ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
  }
  function heart(ctx, x, y, s, fill = PINK) {
    ctx.beginPath(); ctx.moveTo(x, y + s * .35);
    ctx.bezierCurveTo(x - s, y - s * .35, x - s * .45, y - s, x, y - s * .45);
    ctx.bezierCurveTo(x + s * .45, y - s, x + s, y - s * .35, x, y + s * .35);
    ctx.fillStyle = fill; ctx.fill();
  }

  /* ---------- Q 版胖廚師 ----------
     (x,y) = 腳底中心。o.face: 1 右 / -1 左。o.expr: normal happy star glint shock serious */
  function chef(ctx, x, y, s, o = {}) {
    if (OSHI.Sprites && OSHI.Sprites.chef(ctx, x, y, s, o)) return; // 有正式素材就用素材
    const face = o.face || 1, ph = o.phase || 0, mv = o.moving ? 1 : 0;
    const sil = !!o.silhouette;
    const C = sil ? { skin: INK, shirt: INK, apron: INK, hair: INK, line: INK, card: INK } : { skin: SKIN, shirt: '#fbfaf6', apron: '#262626', hair: '#111', line: INK, card: CARD };
    const bob = mv ? Math.abs(Math.sin(ph)) * -5 : Math.sin((o.t || 0) * 2.2) * 1.5;
    ctx.save(); ctx.translate(x, y); ctx.scale(s * face, s);

    // 影子
    if (!sil) { ctx.fillStyle = 'rgba(0,0,0,.18)'; ell(ctx, 0, 2, 58, 10); ctx.fill(); }

    // LV3 翅膀在身後
    if (o.armor >= 3) armorWings(ctx, bob, C);

    // 腿
    const l1 = mv ? Math.sin(ph) * 7 : 0;
    ctx.fillStyle = C.apron;
    rr(ctx, -30, -34 - Math.max(0, l1), 24, 34 + Math.max(0, l1) - 6, 6); ctx.fill();
    rr(ctx, 6, -34 - Math.max(0, -l1), 24, 34 + Math.max(0, -l1) - 6, 6); ctx.fill();
    ctx.fillStyle = sil ? INK : '#0d0d0d';
    ell(ctx, -16 + 3, -5 - Math.max(0, l1), 17, 8); ctx.fill();
    ell(ctx, 20 + 3, -5 - Math.max(0, -l1), 17, 8); ctx.fill();

    ctx.translate(0, bob);
    // 手（身後那隻）
    const arm = mv ? Math.sin(ph) * 10 : 0;
    const raise = o.armRaise || 0; // 0..1 舉手
    ell(ctx, -52, -82, 15, 13); fillStroke(ctx, C.shirt, C.line, 3);
    ell(ctx, -57 - arm * .3, -60 - arm, 11, 11); fillStroke(ctx, C.skin, C.line, 2.5);

    // 身體
    ell(ctx, 0, -66, 58, 50); fillStroke(ctx, C.shirt, C.line, 3.5);
    // 圍裙
    ctx.beginPath(); ctx.moveTo(-36, -96); ctx.lineTo(36, -96); ctx.quadraticCurveTo(52, -60, 46, -30); ctx.quadraticCurveTo(0, -22, -46, -30); ctx.quadraticCurveTo(-52, -60, -36, -96); ctx.closePath();
    fillStroke(ctx, C.apron, C.line, 2.5);
    ctx.strokeStyle = C.apron; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-30, -96); ctx.lineTo(-24, -112); ctx.moveTo(30, -96); ctx.lineTo(24, -112); ctx.stroke();
    if (!sil) {
      ctx.fillStyle = '#555'; ell(ctx, -10, -103, 3, 3); ctx.fill(); ell(ctx, 10, -103, 3, 3); ctx.fill();
      ctx.fillStyle = PINK; ell(ctx, 22, -80, 7, 7); ctx.fill(); heart(ctx, 22, -79, 4.5, '#fff');
      ctx.strokeStyle = '#3a3a3a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-20, -48); ctx.lineTo(-4, -48); ctx.moveTo(6, -48); ctx.lineTo(22, -48); ctx.stroke();
    }

    // 胸甲
    if (o.armor >= 1) armorBody(ctx, o.armor, C);

    // 前面那隻手
    ctx.save();
    if (raise) { ctx.translate(48, -84); ctx.rotate(-raise * 2.3); ctx.translate(-48, 84); }
    ell(ctx, 50, -82, 15, 13); fillStroke(ctx, C.shirt, C.line, 3);
    ell(ctx, 56 + arm * .3, -60 + arm, 11, 11); fillStroke(ctx, C.skin, C.line, 2.5);
    if (o.hold === 'knife') {
      ctx.fillStyle = sil ? INK : '#e9ecee'; ctx.beginPath(); ctx.moveTo(60, -66); ctx.lineTo(108, -84); ctx.lineTo(112, -72); ctx.lineTo(62, -56); ctx.closePath(); ctx.fill(); ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.stroke();
    }
    if (o.hold === 'plate') { ell(ctx, 74, -66, 30, 8); fillStroke(ctx, sil ? INK : '#fff', C.line, 2.5); ell(ctx, 74, -72, 16, 8); fillStroke(ctx, sil ? INK : '#d9a066', C.line, 2); }
    ctx.restore();

    // 頭
    head(ctx, o, C, sil);
    if (o.armor >= 2) armorHelmet(ctx, o.armor, C);
    ctx.restore();
  }

  function head(ctx, o, C, sil) {
    const hy = -150;
    ell(ctx, -56, hy + 6, 10, 13); fillStroke(ctx, C.skin, C.line, 2.5);
    ell(ctx, 56, hy + 6, 10, 13); fillStroke(ctx, C.skin, C.line, 2.5);
    // 臉（圓臉＋雙下巴）
    ell(ctx, 0, hy + 4, 58, 54); fillStroke(ctx, C.skin, C.line, 3.5);
    ctx.strokeStyle = C.line; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(2, hy + 40, 22, .25 * Math.PI, .75 * Math.PI); ctx.stroke();
    // 頭髮：黑色中分
    ctx.fillStyle = C.hair;
    ctx.beginPath(); ctx.ellipse(0, hy - 18, 60, 42, 0, Math.PI, 0); ctx.lineTo(60, hy - 6); ctx.quadraticCurveTo(46, hy - 30, 8, hy - 36); ctx.lineTo(4, hy - 22); ctx.lineTo(-2, hy - 36);
    ctx.quadraticCurveTo(-46, hy - 30, -60, hy - 4); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-60, hy - 6); ctx.quadraticCurveTo(-64, hy + 12, -56, hy + 16); ctx.lineTo(-52, hy - 8); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(60, hy - 8); ctx.quadraticCurveTo(64, hy + 10, 56, hy + 14); ctx.lineTo(52, hy - 10); ctx.closePath(); ctx.fill();
    if (sil) return;
    if (!o.hideHairShine) { ctx.strokeStyle = '#555'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(-24, hy - 42, 14, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke(); }
    // 腮紅
    ctx.fillStyle = 'rgba(241,140,170,.35)'; ell(ctx, -34, hy + 22, 11, 6); ctx.fill(); ell(ctx, 40, hy + 22, 11, 6); ctx.fill();
    const e = o.expr || 'normal', gx = 6;
    // 眼睛
    ctx.fillStyle = INK; ctx.strokeStyle = INK; ctx.lineWidth = 3;
    if (e === 'happy') { ctx.beginPath(); ctx.arc(-14 + gx, hy + 6, 6, Math.PI * 1.1, Math.PI * 1.9); ctx.moveTo(30 + gx, hy + 6); ctx.arc(24 + gx, hy + 6, 6, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
    else if (e === 'star') { star(ctx, -14 + gx, hy + 4, 8, '#fff7a8'); star(ctx, 24 + gx, hy + 4, 8, '#fff7a8'); }
    else if (e === 'shock') { ctx.lineWidth = 2; ell(ctx, -14 + gx, hy + 4, 5, 5); ctx.stroke(); ell(ctx, 24 + gx, hy + 4, 5, 5); ctx.stroke(); }
    else if (e !== 'glint') { ell(ctx, -14 + gx, hy + 5, 3.6, e === 'serious' ? 2.4 : 4.2); ctx.fill(); ell(ctx, 24 + gx, hy + 5, 3.6, e === 'serious' ? 2.4 : 4.2); ctx.fill(); }
    if (e === 'serious') { ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-26 + gx, hy - 12); ctx.lineTo(-4 + gx, hy - 6); ctx.moveTo(36 + gx, hy - 12); ctx.lineTo(14 + gx, hy - 6); ctx.stroke(); }
    // 長方框眼鏡
    ctx.lineWidth = 2.6; ctx.strokeStyle = INK;
    rr(ctx, -30 + gx, hy - 5, 32, 19, 4); if (e === 'glint') { ctx.fillStyle = '#fff'; ctx.fill(); } ctx.stroke();
    rr(ctx, 8 + gx, hy - 5, 32, 19, 4); if (e === 'glint') { ctx.fillStyle = '#fff'; ctx.fill(); } ctx.stroke();
    ctx.beginPath(); ctx.moveTo(2 + gx, hy + 2); ctx.lineTo(8 + gx, hy + 2); ctx.moveTo(-30 + gx, hy + 2); ctx.lineTo(-50, hy); ctx.stroke();
    if (e === 'glint') { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; for (const lx of [-14, 24]) { ctx.beginPath(); ctx.moveTo(lx + gx - 18, hy - 14); ctx.lineTo(lx + gx + 18, hy + 22); ctx.stroke(); } star(ctx, 46 + gx, hy - 16, 9, '#fff'); }
    // 鼻、嘴
    ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(6 + gx, hy + 18); ctx.quadraticCurveTo(10 + gx, hy + 22, 5 + gx, hy + 23); ctx.stroke();
    ctx.lineWidth = 2.6; ctx.beginPath();
    if (e === 'happy' || e === 'star') { ctx.arc(6 + gx, hy + 30, 9, .1 * Math.PI, .9 * Math.PI); ctx.stroke(); }
    else if (e === 'shock') { ell(ctx, 6 + gx, hy + 34, 6, 8); ctx.fillStyle = '#5a1f2a'; ctx.fill(); ctx.stroke(); }
    else { ctx.moveTo(-2 + gx, hy + 34); ctx.lineTo(12 + gx, hy + 34); ctx.stroke(); }
  }

  /* ---------- 紙板鋼彈（廉價、歪斜、不對稱）---------- */
  function armorBody(ctx, lv, C) {
    ctx.save(); ctx.rotate(-.04);
    rr(ctx, -46, -108, 90, 62, 3); fillStroke(ctx, C.card, CARD_D, 3);
    ctx.strokeStyle = '#d8d0b8'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-40, -86); ctx.lineTo(40, -92); ctx.stroke(); // 膠帶
    ctx.strokeStyle = CARD_D; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-10, -104); ctx.lineTo(-12, -50); ctx.stroke();
    ctx.restore();
    // 肩甲（左右大小不一）
    ctx.save(); ctx.translate(-56, -100); ctx.rotate(.25); rr(ctx, -20, -10, 38, 26, 2); fillStroke(ctx, C.card, CARD_D, 3); ctx.restore();
    ctx.save(); ctx.translate(58, -98); ctx.rotate(-.12); rr(ctx, -16, -12, 30, 22, 2); fillStroke(ctx, C.card, CARD_D, 3); ctx.restore();
    if (lv >= 2) { // 不均勻噴漆
      ctx.fillStyle = 'rgba(80,90,110,.45)'; ell(ctx, -18, -80, 20, 12, .4); ctx.fill(); ell(ctx, 22, -66, 12, 8); ctx.fill();
      ctx.fillStyle = '#111'; ctx.font = 'bold 14px sans-serif'; ctx.fillText('V2', 8, -90);
    }
    if (lv >= 3) { heart(ctx, -24, -60, 11, PINK); heart(ctx, 30, -100, 8, PINK); }
  }
  function armorHelmet(ctx, lv, C) {
    ctx.save(); ctx.translate(0, -206); ctx.rotate(.13);
    rr(ctx, -44, -20, 86, 30, 3); fillStroke(ctx, C.card, CARD_D, 3);
    ctx.strokeStyle = '#d8d0b8'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-40, -6); ctx.lineTo(38, -4); ctx.stroke();
    if (lv >= 3) { // 歪天線
      ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-10, -20); ctx.lineTo(-26, -66); ctx.lineTo(-14, -74); ctx.moveTo(16, -20); ctx.lineTo(30, -50); ctx.stroke();
      ctx.fillStyle = '#ffd84a'; ell(ctx, -14, -76, 6, 6); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }
  function armorWings(ctx, bob, C) {
    ctx.save(); ctx.translate(0, bob);
    ctx.beginPath(); ctx.moveTo(-30, -100); ctx.lineTo(-150, -190); ctx.lineTo(-120, -120); ctx.lineTo(-160, -110); ctx.lineTo(-40, -70); ctx.closePath(); fillStroke(ctx, C.card, CARD_D, 3);
    ctx.beginPath(); ctx.moveTo(30, -96); ctx.lineTo(96, -150); ctx.lineTo(84, -90); ctx.closePath(); fillStroke(ctx, C.card, CARD_D, 3);
    ctx.fillStyle = PINK; heart(ctx, -110, -140, 12);
    ctx.restore();
  }

  /* ---------- 冷藏室觀察窗內的偶像（只看得到輪廓）---------- */
  function idolWindow(ctx, x, y, w, h, stage, t, bang) {
    ctx.save(); rr(ctx, x, y, w, h, 6); ctx.clip();
    const g = ctx.createLinearGradient(x, y, x, y + h); g.addColorStop(0, '#0d1418'); g.addColorStop(1, '#1e2a2e'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    const sway = Math.sin(t * 1.3) * 5 + (bang ? Math.sin(t * 60) * 4 : 0);
    const cx = x + w / 2 + sway, cy = y + h * .62 + (bang ? -6 : 0);
    const lerp = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
    const hairK = stage >= 3 ? 1 : 0, skinK = stage >= 5 ? 1 : stage / 8;
    const hair = lerp([70, 64, 64], [120, 52, 46], hairK), skin = lerp([92, 98, 92], [226, 196, 180], skinK);
    ctx.fillStyle = `rgb(${hair})`; ell(ctx, cx, cy, w * .3, h * .5); ctx.fill();
    ctx.fillStyle = `rgb(${skin})`; ell(ctx, cx, cy + 2, w * .17, h * .26); ctx.fill();
    ctx.fillStyle = `rgb(${hair})`; ctx.beginPath(); ctx.ellipse(cx, cy - h * .14, w * .2, h * .16, 0, Math.PI, 0); ctx.fill();
    // 無神的眼睛
    ctx.fillStyle = stage >= 5 ? '#6f8fc9' : 'rgba(230,240,240,.85)';
    ell(ctx, cx - w * .06, cy, 3, 2.4); ctx.fill(); ell(ctx, cx + w * .06, cy, 3, 2.4); ctx.fill();
    ctx.fillStyle = '#d4a93c'; ctx.beginPath(); ctx.moveTo(cx + w * .1, cy - h * .3); ctx.lineTo(cx + w * .14, cy - h * .4); ctx.lineTo(cx + w * .17, cy - h * .32); ctx.lineTo(cx + w * .2, cy - h * .4); ctx.lineTo(cx + w * .2, cy - h * .28); ctx.closePath(); ctx.fill(); // 小皇冠
    // 玻璃反光與霜
    ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 8, y + h - 8); ctx.lineTo(x + w * .4, y + 6); ctx.stroke();
    ctx.restore();
  }

  return { chef, idolWindow, rr, ell, star, heart, fillStroke, INK, PINK, SKIN, CARD, CARD_D };
})();
