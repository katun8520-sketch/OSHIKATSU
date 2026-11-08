'use strict';
/* 動畫播放器（料理、餵食、裝甲升級、日夜轉場）
   所有演出在 1280×720 畫面上繪製；點擊或按 E 可跳過 */
OSHI.Cut = (() => {
  const A = OSHI.Art, INK = A.INK, PINK = A.PINK, SW = 1280, SH = 720;
  let active = null;

  // 一段播完到下一段開始之間，會有一兩幀空檔；這段時間繼續畫上一段的最後一格，避免閃回遊戲畫面
  let last = null, hold = 0;
  function play(fn, dur, data = {}) {
    hold = 0; last = null;
    return new Promise(res => { active = { fn, dur, el: 0, res, data }; });
  }
  function update(dt) { if (!active) { if (hold > 0) hold--; return; } active.el += dt; if (active.el >= active.dur) end(); }
  function end() { const a = active; active = null; if (a) { last = a; hold = 3; a.res(); } }
  function skip() { if (active && active.el > .25) end(); }
  function draw(ctx, t) {
    const a = active || (hold > 0 ? last : null); if (!a) return;
    const k = active ? Math.min(1, a.el / a.dur) : 1; a.fn(ctx, k, active ? a.el : a.dur, a.data, t);
  }

  /* ---------- 共用效果 ---------- */
  function rays(ctx, cx, cy, color, n = 36, spin = 0, inner = 60) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(spin); ctx.fillStyle = color;
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, w = Math.PI / n * .55; ctx.beginPath(); ctx.moveTo(Math.cos(a - w) * inner, Math.sin(a - w) * inner); ctx.lineTo(Math.cos(a) * 1600, Math.sin(a) * 1600); ctx.lineTo(Math.cos(a + w) * inner, Math.sin(a + w) * inner); ctx.fill(); }
    ctx.restore();
  }
  function speedLines(ctx, cx, cy, seed, color = INK) {
    ctx.strokeStyle = color;
    for (let i = 0; i < 70; i++) { const a = i * 2.39996 + seed, r0 = 220 + ((i * 53) % 160); ctx.lineWidth = 1 + (i % 3); ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * 1200, cy + Math.sin(a) * 1200); ctx.stroke(); }
  }
  function sfx(ctx, text, x, y, size = 90, rot = -.12, fill = '#fff') {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.font = `900 italic ${size}px serif`; ctx.lineJoin = 'round';
    ctx.strokeStyle = INK; ctx.lineWidth = size / 9; ctx.strokeText(text, 0, 0); ctx.fillStyle = fill; ctx.fillText(text, 0, 0); ctx.restore();
  }
  function caption(ctx, text, sub) {
    ctx.fillStyle = 'rgba(0,0,0,.75)'; ctx.fillRect(0, SH - 96, SW, 96);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 30px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(text, SW / 2, SH - 48);
    if (sub) { ctx.fillStyle = '#bbb'; ctx.font = '16px sans-serif'; ctx.fillText(sub, SW / 2, SH - 20); } ctx.textAlign = 'left';
  }
  function paper(ctx, c = '#f4f1ea') { ctx.fillStyle = c; ctx.fillRect(0, 0, SW, SH); }
  function board(ctx, x, y) { A.rr(ctx, x - 190, y - 30, 380, 60, 8); A.fillStroke(ctx, '#e9dcc4', INK, 4); ctx.fillStyle = '#d6c6a8'; ctx.fillRect(x - 180, y + 20, 360, 6); }
  const ease = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  const seg = (k, a, b) => Math.max(0, Math.min(1, (k - a) / (b - a)));

  /* ---------- 料理四步驟 ---------- */
  function cookCut(ctx, k, el) {
    if (k < .28) { // 砧板上的食材（可辨識為手）＋舉刀
      paper(ctx); speedLines(ctx, 760, 420, 0, 'rgba(0,0,0,.15)');
      board(ctx, 780, 520);
      ctx.fillStyle = '#cdb9a8'; ctx.strokeStyle = INK; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(660, 505); ctx.quadraticCurveTo(760, 470, 860, 490); for (let i = 0; i < 4; i++) { ctx.lineTo(880 + i * 4, 470 + i * 10); ctx.lineTo(920, 478 + i * 10); ctx.lineTo(884 + i * 4, 486 + i * 10); } ctx.lineTo(860, 520); ctx.quadraticCurveTo(760, 530, 660, 520); ctx.closePath(); ctx.fill(); ctx.stroke();
      A.chef(ctx, 330, 690, 2.3, { face: 1, expr: 'serious', hold: 'knife', armRaise: ease(seg(k, .05, .25)) });
      sfx(ctx, '……', 980, 230, 70, 0);
    } else if (k < .78) { // 黑色剪影高速揮刀
      paper(ctx, '#fff'); const j = (el * 40) % 6;
      speedLines(ctx, 640, 380, el * 3, INK);
      A.chef(ctx, 470 + Math.sin(el * 50) * 6, 700, 2.6, { face: 1, silhouette: true, hold: 'knife', armRaise: (Math.sin(el * 38) + 1) / 2 });
      ctx.strokeStyle = INK; ctx.lineWidth = 7; for (let i = 0; i < 5; i++) { const a = el * 25 + i * 1.3; ctx.beginPath(); ctx.arc(820, 440, 120 + i * 18, a, a + .9); ctx.stroke(); }
      sfx(ctx, '唰唰唰唰！', 690 + j, 200, 100);
    } else { // 完成，眼睛冒星星
      paper(ctx); rays(ctx, 640, 360, 'rgba(0,0,0,.06)', 30, el * .3);
      board(ctx, 820, 520);
      ctx.fillStyle = '#c99a8a'; for (let i = 0; i < 12; i++) { A.rr(ctx, 680 + (i % 6) * 46, 478 + Math.floor(i / 6) * 22, 34, 18, 4); A.fillStroke(ctx, '#c99a8a', INK, 2); }
      A.chef(ctx, 330, 690, 2.3, { face: 1, expr: 'star', t: el });
      A.star(ctx, 380, 210, 22, '#fff7a8'); A.star(ctx, 520, 260, 14, '#fff7a8');
      sfx(ctx, '完美切塊！', 760, 230, 70);
    }
    caption(ctx, '一、切肉');
  }
  function cookFire(ctx, k, el) {
    paper(ctx, '#fff'); speedLines(ctx, 760, 330, 1, 'rgba(0,0,0,.25)');
    const flip = Math.sin(el * 7);
    // 火焰
    for (let i = 0; i < 14; i++) { const fx = 640 + i * 22, h = 120 + Math.abs(Math.sin(el * 13 + i)) * 120; ctx.fillStyle = i % 2 ? '#ffb347' : '#fff'; ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(fx - 22, 560); ctx.quadraticCurveTo(fx - 10, 560 - h * .6, fx, 560 - h); ctx.quadraticCurveTo(fx + 10, 560 - h * .6, fx + 22, 560); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    // 炒鍋
    ctx.save(); ctx.translate(800, 520 - flip * 20); ctx.rotate(flip * .15);
    ctx.beginPath(); ctx.arc(0, -10, 150, .1 * Math.PI, .9 * Math.PI); ctx.closePath(); A.fillStroke(ctx, '#2a2a2a', INK, 5);
    ctx.fillStyle = '#2a2a2a'; ctx.fillRect(-340, 20, 200, 18); ctx.restore();
    // 飛起的食材
    for (let i = 0; i < 8; i++) { const a = el * 6 + i, px = 800 + Math.cos(a) * 80, py = 360 - Math.abs(Math.sin(a)) * 160; A.rr(ctx, px, py, 28, 18, 4); A.fillStroke(ctx, '#b07a5a', INK, 2); }
    // 蒸氣
    ctx.strokeStyle = 'rgba(80,80,80,.4)'; ctx.lineWidth = 6; for (let i = 0; i < 6; i++) { const sy = (el * 160 + i * 60) % 260; ctx.beginPath(); ctx.moveTo(700 + i * 40, 300 - sy); ctx.quadraticCurveTo(720 + i * 40, 270 - sy, 700 + i * 40, 240 - sy); ctx.stroke(); }
    A.chef(ctx, 330, 700, 2.3, { face: 1, expr: k > .6 ? 'star' : 'serious', armRaise: (flip + 1) * .3, t: el });
    sfx(ctx, '轟——！', 820, 150, 110);
    caption(ctx, '二、下鍋烹調');
  }
  function cookSeason(ctx, k, el) {
    paper(ctx); rays(ctx, 640, 300, 'rgba(0,0,0,.08)', 40, el * .5);
    A.chef(ctx, 560, 900, 3.4, { face: 1, expr: k > .35 ? 'glint' : 'serious', armRaise: .7 + Math.sin(el * 20) * .1, t: el });
    ctx.fillStyle = '#fff'; ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
    for (let i = 0; i < 60; i++) { const px = 820 + ((i * 37) % 260), py = ((el * 500 + i * 41) % 520) + 160; ctx.beginPath(); ctx.arc(px, py, 3, 0, 7); ctx.fill(); ctx.stroke(); }
    A.rr(ctx, 860, 120, 70, 110, 10); A.fillStroke(ctx, '#fff', INK, 4); ctx.fillStyle = INK; ctx.font = 'bold 26px serif'; ctx.fillText('鹽', 880, 186);
    if (k > .35) sfx(ctx, '鏘！', 150, 200, 120, -.2);
    caption(ctx, '三、調味');
  }
  function cookPlate(ctx, k, el, d) {
    const glow = seg(k, .48, .6);
    paper(ctx, glow ? '#fff8e8' : '#f4f1ea');
    if (glow) { rays(ctx, 640, 380, `rgba(255,205,90,${.55 * glow})`, 40, el * .4); rays(ctx, 640, 380, `rgba(241,156,185,${.35 * glow})`, 24, -el * .3, 120); }
    // 盤子
    const dimg = OSHI.Sprites.get('dish' + d.chapter);
    if (!dimg) { A.ell(ctx, 640, 470, 270, 70); A.fillStroke(ctx, '#fff', INK, 5); A.ell(ctx, 640, 462, 200, 48); A.fillStroke(ctx, '#fbfbfb', '#ccc', 2); }
    if (dimg) { const dw = 460, dh = dw * dimg.height / dimg.width; ctx.drawImage(dimg, 640 - dw / 2, 470 - dh * .62, dw, dh); } else dish(ctx, d.chapter, 640, 440);
    if (k < .48) { // 最後一片裝飾
      const hy = 300 + ease(seg(k, 0, .4)) * 110;
      A.chef(ctx, 230, 700, 2.1, { face: 1, expr: 'serious', t: el });
      ctx.fillStyle = '#7fb36a'; A.ell(ctx, 650, hy, 16, 9, .4); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
      A.ell(ctx, 668, hy - 22, 20, 20); A.fillStroke(ctx, A.SKIN, INK, 3);
      if (k > .38) sfx(ctx, '……', 900, 220, 70, 0);
    } else {
      ctx.fillStyle = '#7fb36a'; A.ell(ctx, 650, 410, 16, 9, .4); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
      for (let i = 0; i < 16; i++) { const a = i * .9 + el, r = 260 + (i % 4) * 50; const x = 640 + Math.cos(a) * r, y = 380 + Math.sin(a) * r * .55; if (i % 3 === 0) A.star(ctx, x, y, 14 + (i % 2) * 8, '#fff2a0'); else if (i % 3 === 1) A.heart(ctx, x, y, 16); else { ctx.fillStyle = '#f7c4d6'; A.ell(ctx, x, y, 10, 6, a); ctx.fill(); } }
      A.chef(ctx, 180, 700, 1.8, { face: 1, expr: 'star', t: el });
      ctx.fillStyle = INK; ctx.font = '900 46px serif'; ctx.textAlign = 'center'; ctx.lineWidth = 8; ctx.strokeStyle = '#fff'; ctx.strokeText(`「${d.dish}」`, 640, 140); ctx.fillText(`「${d.dish}」`, 640, 140); ctx.textAlign = 'left';
      sfx(ctx, '完成！！', 920, 640, 90, -.1, '#ffe27a');
    }
    caption(ctx, '四、擺盤');
  }
  function dish(ctx, ch, x, y) {
    if (ch === 1) { A.ell(ctx, x, y, 110, 46); A.fillStroke(ctx, '#7a4a2e', INK, 4); ctx.fillStyle = '#4a2716'; A.ell(ctx, x, y - 8, 90, 28); ctx.fill(); A.heart(ctx, x, y - 6, 26, '#f6e7c8'); }
    else if (ch === 2) { ctx.beginPath(); ctx.ellipse(x, y + 10, 130, 70, 0, Math.PI, 0); ctx.closePath(); A.fillStroke(ctx, '#ffd86a', INK, 4); A.heart(ctx, x, y - 22, 30, '#d8323f'); }
    else if (ch === 3) { A.ell(ctx, x, y + 6, 140, 50); A.fillStroke(ctx, '#fff', INK, 4); A.ell(ctx, x, y, 120, 38); A.fillStroke(ctx, '#7b3b22', INK, 2); for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? '#f08a3a' : '#c79a72'; A.rr(ctx, x - 90 + i * 30, y - 14 + (i % 2) * 10, 22, 16, 4); ctx.fill(); } }
    else if (ch === 4) { ctx.strokeStyle = '#8a2b2b'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(x, y + 10, 140, .1, 2.8); ctx.stroke(); A.rr(ctx, x - 60, y - 60, 120, 70, 10); A.fillStroke(ctx, '#8b5636', INK, 4); A.rr(ctx, x - 40, y - 90, 80, 34, 8); A.fillStroke(ctx, '#f2e2b6', INK, 3); A.star(ctx, x, y - 104, 12, '#ffe27a'); }
    else { for (const [dx, c] of [[-120, '#7a4a2e'], [0, '#ffd86a'], [120, '#7b3b22']]) { A.ell(ctx, x + dx, y, 56, 30); A.fillStroke(ctx, c, INK, 3); } A.heart(ctx, x, y - 50, 34, PINK); A.star(ctx, x - 120, y - 40, 12, '#fff2a0'); A.star(ctx, x + 120, y - 40, 12, '#fff2a0'); }
  }

  /* ---------- 餵食 ---------- */
  function feed(ctx, k, el, d) {
    if (k < .45) {
      paper(ctx, '#8f9294');
      A.rr(ctx, 240, 60, 800, 700, 10); A.fillStroke(ctx, '#b9bec0', INK, 6);
      A.rr(ctx, 440, 380, 400, 120, 8); A.fillStroke(ctx, '#3a3e40', INK, 5); ctx.fillStyle = '#050505'; ctx.fillRect(470, 420, 340, 46);
      const px = 1150 - ease(seg(k, .05, .4)) * 520;
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, SW, SH); ctx.rect(470, 420, 340, 46); ctx.clip('evenodd');
      const dimg = OSHI.Sprites.get('dish' + d.chapter);
      if (dimg) ctx.drawImage(dimg, px - 110, 446 - 150, 220, 220 * dimg.height / dimg.width); else { A.ell(ctx, px, 446, 120, 22); A.fillStroke(ctx, '#fff', INK, 4); dishMini(ctx, d.chapter, px, 432); }
      A.ell(ctx, px + 150, 460, 42, 40); A.fillStroke(ctx, A.SKIN, INK, 4); ctx.restore();
      sfx(ctx, '喀啦——', 850, 240, 70, -.05);
      caption(ctx, '將料理從送餐口推進去');
    } else if (k < .78) {
      paper(ctx, '#050505'); const sh = Math.sin(el * 40) * 6;
      sfx(ctx, '喀嚓……', 200 + sh, 260, 90, -.1); sfx(ctx, '喀嚓喀嚓', 640, 420 + sh, 70, .08); sfx(ctx, '咕嚕。', 820, 600, 80, -.05);
    } else {
      paper(ctx, '#fff4f8'); rays(ctx, 640, 360, 'rgba(241,156,185,.28)', 30, el * .2);
      const im = OSHI.Sprites.get('idol_stage' + d.chapter);
      A.rr(ctx, 440, 70, 400, 404, 6); A.fillStroke(ctx, '#fff', INK, 5);
      if (im) ctx.drawImage(im, 452, 82, 376, 380 * im.height / im.width > 380 ? 380 : 376 * im.height / im.width);
      ctx.fillStyle = INK; ctx.font = '900 40px serif'; ctx.textAlign = 'center'; ctx.lineWidth = 8; ctx.strokeStyle = '#fff4f8';
      ctx.strokeText(`恢復：${d.restore}`, 640, 540); ctx.fillText(`恢復：${d.restore}`, 640, 540);
      ctx.font = '15px sans-serif'; ctx.fillStyle = '#999'; ctx.fillText('〔身體恢復漫畫　待提供〕', 640, 572);
      ctx.textAlign = 'left';
      for (let i = 0; i < 10; i++) A.heart(ctx, 120 + i * 120, 600 + Math.sin(el * 2 + i) * 20, 18);
      caption(ctx, '她的身體……正在恢復！', '（主角眼中）');
    }
  }
  function dishMini(ctx, ch, x, y) { ctx.save(); ctx.translate(x, y); ctx.scale(.45, .45); dish(ctx, ch, 0, 0); ctx.restore(); }

  /* ---------- 紙板鋼彈升級（約 3 秒）---------- */
  function upgrade(ctx, k, el, d) {
    if (k < .72) {
      paper(ctx, '#e9e5dc'); speedLines(ctx, 640, 420, el, 'rgba(0,0,0,.18)');
      // 背對鏡頭坐在地上的黑色剪影
      const j = Math.sin(el * 30) * 4;
      ctx.fillStyle = INK; A.ell(ctx, 640 + j, 470, 190, 160); ctx.fill(); A.ell(ctx, 640 + j, 270, 110, 100); ctx.fill();
      A.ell(ctx, 470, 560, 70, 40); ctx.fill(); A.ell(ctx, 810, 560, 70, 40); ctx.fill();
      for (let i = 0; i < 8; i++) { const a = el * 5 + i; ctx.save(); ctx.translate(640 + Math.cos(a) * 330, 380 + Math.sin(a * 1.3) * 200); ctx.rotate(a); A.rr(ctx, -26, -16, 52, 32, 2); A.fillStroke(ctx, A.CARD, A.CARD_D, 3); ctx.restore(); }
      const words = ['喀嚓喀嚓！', '嘶啦——', '噗咻——'], w = words[Math.min(2, Math.floor(k / .24))];
      sfx(ctx, w, 120, 180, 90, -.1);
      if (k > .48) { ctx.fillStyle = 'rgba(120,130,150,.35)'; for (let i = 0; i < 30; i++) { A.ell(ctx, 840 + ((i * 29) % 200), 200 + ((i * 47 + el * 300) % 260), 14, 14); ctx.fill(); } }
    } else {
      paper(ctx, '#fff'); rays(ctx, 640, 380, 'rgba(0,0,0,.1)', 36, el * .4);
      A.chef(ctx, 640, 690, 2.4, { face: 1, expr: 'star', armor: d.level, armRaise: .9, t: el });
      sfx(ctx, `紙板鋼彈 LV${d.level}！`, 760, 180, 64, -.08, '#ffe27a');
    }
    caption(ctx, '紙板鋼彈升級中', '永久保留・不需維修・只提高承受傷害的次數');
  }

  /* ---------- 轉場卡 ---------- */
  function fadeCard(text, sub, color = '#000') {
    return (ctx, k) => {
      const a = k < .3 ? k / .3 : k > .75 ? (1 - k) / .25 : 1;
      ctx.globalAlpha = Math.min(1, a * 1.2); ctx.fillStyle = color; ctx.fillRect(0, 0, SW, SH);
      ctx.fillStyle = color === '#000' ? '#f3eee8' : INK; ctx.textAlign = 'center'; ctx.font = '900 54px serif'; ctx.fillText(text, SW / 2, SH / 2);
      if (sub) { ctx.font = '20px sans-serif'; ctx.fillStyle = '#999'; ctx.fillText(sub, SW / 2, SH / 2 + 50); }
      ctx.textAlign = 'left'; ctx.globalAlpha = 1;
    };
  }

  return { play, update, draw, skip, get active() { return !!active || hold > 0; }, cookCut, cookFire, cookSeason, cookPlate, feed, upgrade, fadeCard };
})();
