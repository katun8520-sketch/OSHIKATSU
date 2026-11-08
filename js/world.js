'use strict';
/* RestaurantWorld：使用正式背景圖（每區 1080×720）
   A 用餐區 0–1080 ｜ B 專業廚房 1080–2160 ｜ C 冷藏室門外 2160–3240 */
OSHI.World = (() => {
  const A = OSHI.Art, S = OSHI.Sprites, INK = A.INK, PINK = A.PINK;
  const PW = 1080, W = PW * 3, H = 720, FLOOR = 690; // FLOOR = 角色腳底高度
  const zones = [
    { name: '用餐區', from: 0, to: PW },
    { name: '專業廚房', from: PW, to: PW * 2 },
    { name: '冷藏室門外', from: PW * 2, to: W }
  ];
  const objects = [
    { id: 'door', x: 100, label: '正門' },
    { id: 'poster', x: 763, label: '偶像海報' },
    { id: 'armor', x: 1000, label: '紙板鋼彈' },
    { id: 'radio', x: 1202, label: '廣播收音機' },
    { id: 'prep', x: 1440, label: '料理台' },
    { id: 'stove', x: 1715, label: '瓦斯爐' },
    { id: 'freezer', x: 2002, label: '商用冷凍櫃' },
    { id: 'player', x: 2290, label: '偶像歌曲播放器' },
    { id: 'coldroom', x: 3024, label: '冷藏室' }
  ];
  const WIN = { x: PW * 2 + 798, y: 179, w: 150, h: 75 }; // 冷藏室觀察窗
  const zoneOf = x => zones.find(z => x >= z.from && x < z.to) || zones[zones.length - 1];

  function draw(ctx, s) {
    const bgs = [s.night ? 'dining_night' : 'dining_day', 'kitchen_night', 'cold_night'];
    bgs.forEach((k, i) => {
      const im = S.get(k);
      if (im) ctx.drawImage(im, i * PW, 0, PW, H);
      else { ctx.fillStyle = ['#ddd', '#eee', '#999'][i]; ctx.fillRect(i * PW, 0, PW, H); }
    });
    // 區域接縫
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(PW - 8, 0, 16, H); ctx.fillRect(PW * 2 - 8, 0, 16, H);

    armorRack(ctx, 1000, 400, s.armor);

    // 收音機雜訊
    if (s.radioOn) sfx(ctx, '沙沙…', 1240 + Math.sin(s.t * 20) * 2, 270, 30);
    // 炒鍋蒸氣
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 4;
    for (let i = 0; i < 3; i++) { const sy = (s.t * 30 + i * 30) % 80; ctx.globalAlpha = 1 - sy / 80; ctx.beginPath(); ctx.moveTo(1700 + i * 16, 380 - sy); ctx.quadraticCurveTo(1710 + i * 16, 365 - sy, 1700 + i * 16, 350 - sy); ctx.stroke(); }
    ctx.globalAlpha = 1;
    // 冷凍櫃庫存便條
    A.rr(ctx, 1950, 250, 104, 40, 3); A.fillStroke(ctx, '#fffbe6', INK, 2);
    ctx.fillStyle = INK; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(`庫存 ${s.stock}/${s.need}`, 2002, 277); ctx.textAlign = 'left';
    // 播放器音符
    if (s.songOn) { ctx.fillStyle = PINK; ctx.font = 'bold 30px serif'; for (let i = 0; i < 3; i++) ctx.fillText('♪', 2240 + i * 34 + Math.sin(s.t * 3 + i) * 8, 470 - ((s.t * 40 + i * 25) % 70)); }

    // 觀察窗裡的偶像
    const anim = S.hasAnim(s.stage);
    const jx = anim ? 0 : s.bang ? Math.sin(s.t * 70) * 3 : Math.sin(s.t * 1.3) * 2, jy = anim ? 0 : s.bang ? -4 : 0;
    ctx.fillStyle = '#05080a'; ctx.fillRect(WIN.x, WIN.y, WIN.w, WIN.h);
    if (!S.idol(ctx, s.stage, WIN.x, WIN.y, WIN.w, WIN.h, jx, jy, s.t, s.bangAge)) A.idolWindow(ctx, WIN.x, WIN.y, WIN.w, WIN.h, s.stage, s.t, s.bang);
    ctx.fillStyle = 'rgba(20,40,50,.35)'; ctx.fillRect(WIN.x, WIN.y, WIN.w, WIN.h); // 冰冷玻璃
    ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(WIN.x + 10, WIN.y + WIN.h - 6); ctx.lineTo(WIN.x + 60, WIN.y + 6); ctx.stroke();
    if (s.bang) sfx(ctx, s.bangText || '砰！', WIN.x + 150, 200, 64);
  }

  function sfx(ctx, text, x, y, size) {
    ctx.font = `900 italic ${size}px serif`; ctx.lineJoin = 'round'; ctx.fillStyle = '#fff'; ctx.strokeStyle = INK; ctx.lineWidth = size / 10;
    ctx.strokeText(text, x, y); ctx.fillText(text, x, y);
  }

  // 展示架上的紙板鋼彈（依目前等級）
  function armorRack(ctx, x, y, lv) {
    const C = '#cfc9bd', D = '#6d675d';
    ctx.save(); ctx.translate(x, y);
    if (!lv) {
      ctx.rotate(.05); A.rr(ctx, -46, 150, 92, 30, 3); A.fillStroke(ctx, C, D, 3);
      ctx.restore(); tag(ctx, x, y - 70, '未製作'); return;
    }
    if (lv >= 3) { ctx.beginPath(); ctx.moveTo(-20, 10); ctx.lineTo(-100, -60); ctx.lineTo(-76, 0); ctx.lineTo(-104, 12); ctx.lineTo(-24, 36); ctx.closePath(); A.fillStroke(ctx, C, D, 3); }
    ctx.rotate(-.05); A.rr(ctx, -42, 0, 84, 70, 3); A.fillStroke(ctx, C, D, 3);
    ctx.strokeStyle = '#ece7da'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-36, 24); ctx.lineTo(36, 18); ctx.stroke();
    A.rr(ctx, -70, -6, 32, 24, 2); A.fillStroke(ctx, C, D, 3); A.rr(ctx, 40, -2, 26, 20, 2); A.fillStroke(ctx, C, D, 3);
    A.heart(ctx, 14, 48, 9);
    if (lv >= 2) { ctx.rotate(.15); A.rr(ctx, -34, -60, 68, 34, 3); A.fillStroke(ctx, C, D, 3); }
    if (lv >= 3) { ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-10, -60); ctx.lineTo(-24, -98); ctx.stroke(); A.heart(ctx, -24, -104, 10); }
    ctx.restore(); tag(ctx, x, y - 110, 'LV' + lv);
  }
  function tag(ctx, x, y, t) {
    ctx.font = 'bold 16px sans-serif'; const w = ctx.measureText(t).width + 18;
    A.rr(ctx, x - w / 2, y - 18, w, 26, 4); A.fillStroke(ctx, '#fff', INK, 2);
    ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.fillText(t, x, y + 1); ctx.textAlign = 'left';
  }

  return { W, H, FLOOR, zones, objects, zoneOf, draw, loadImages() {} };
})();
