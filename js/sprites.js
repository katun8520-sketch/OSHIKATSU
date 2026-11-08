'use strict';
/* 正式素材載入與 Q 版胖廚師繪製。素材載入失敗時退回程式畫的佔位角色。 */
OSHI.Sprites = (() => {
  const F = OSHI.FRAMES, img = {}, sil = {};
  /* 觀察窗內的偶像動畫（GPT 做的 GIF 拆成影格）。key = 恢復階段 0–5；沒有的階段用靜態圖。
     ms = 每格毫秒數；gif = 觀察窗放大畫面直接播放的 GIF */
  const IDOL_ANIM = {
    0: { idle: [150, 150, 150, 150, 150, 150, 150, 150], bang: [180, 100, 170, 160, 170, 220], gif: 'characters/idol0_idle.gif' }
  };
  const animFrames = {};
  for (const [st, a] of Object.entries(IDOL_ANIM)) for (const mode of ['idle', 'bang']) a[mode].forEach((_, i) => { animFrames[`idol${st}_${mode}${i}`] = `characters/idol${st}_${mode}${i}.jpg`; });
  const BASE = 'assets/';
  const list = {
    ...Object.fromEntries(Object.keys(F).map(k => [k, `characters/${k}.${k.startsWith('idol') ? 'jpg' : 'png'}`])),
    dining_night: 'restaurant/dining_night.jpg', dining_day: 'restaurant/dining_day.jpg',
    kitchen_night: 'restaurant/kitchen_night.jpg', cold_night: 'restaurant/cold_night.jpg',
    dish1: 'cooking/dish1.png', dish2: 'cooking/dish2.png', dish3: 'cooking/dish3.png', dish4: 'cooking/dish4.png', dish5: 'cooking/dish5.png',
    icon_box: 'ui/icon_box.png', icon_tape: 'ui/icon_tape.png',
    ...animFrames
  };
  // only：只載入指定的素材（出擊試玩頁用）。每張最多等 8 秒，載不到就用程式畫的佔位圖，不會卡住
  function load(onProgress, only) {
    const entries = Object.entries(list).filter(([k]) => !only || only.some(p => k.startsWith(p)));
    let loaded = 0; const total = entries.length;
    return Promise.all(entries.map(([k, src]) => new Promise(res => {
      let done = false; const fin = ok => { if (done) return; done = true; if (ok) img[k] = i; loaded++; onProgress && onProgress(loaded / total); res(); };
      const i = new Image(); i.onload = () => fin(true); i.onerror = () => fin(false); setTimeout(() => fin(false), 8000); i.src = BASE + src;
    })));
  }
  const get = k => img[k] || null;

  // 黑色剪影版（料理切肉用）
  function silhouette(k) {
    if (sil[k] || !img[k]) return sil[k];
    const c = document.createElement('canvas'); c.width = img[k].width; c.height = img[k].height;
    const x = c.getContext('2d'); x.drawImage(img[k], 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#111'; x.fillRect(0, 0, c.width, c.height);
    return (sil[k] = c);
  }

  // 每組素材裡「沒有頭盔的胖廚師全身」高度，用來讓不同圖表的角色大小一致
  const UNIT = { walk: 460, face: 480, armor: 707 };

  /* 與 OSHI.Art.chef 相同參數：(x,y)=腳底，s=比例（約 215*s 像素高） */
  function chef(ctx, x, y, s, o = {}) {
    let key, unit;
    if (o.armor >= 1) { key = 'armor' + Math.min(3, o.armor); unit = UNIT.armor; }
    else if (o.moving) { key = 'walk' + (Math.floor(o.phase || 0) % 8); unit = UNIT.walk; }
    else { key = 'face_' + (o.expr || 'normal'); unit = UNIT.face; }
    const im = o.silhouette ? silhouette(key) : img[key];
    if (!im) return false;
    const m = F[key], k = 215 * s / unit, face = o.face || 1;
    const bob = !o.moving ? Math.sin((o.t || 0) * 2.2) * 1.2 * s : 0;
    ctx.save(); ctx.translate(x, y + bob); ctx.scale(face, 1);
    if (!o.silhouette) { ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(0, -bob, m.w * k * .32, 9 * s, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.drawImage(im, -m.ax * k, -m.by * k, m.w * k, m.h * k);
    // 手上的道具（素材沒有拿刀、端盤的動作，先用疊圖表示）
    const hx = 215 * s * .3, hy = -215 * s * .36, r = o.armRaise || 0;
    if (o.hold === 'knife') {
      ctx.save(); ctx.translate(hx, hy); ctx.rotate(-r * 2.2 + .2); ctx.scale(s, s);
      ctx.fillStyle = o.silhouette ? '#111' : '#eef1f3'; ctx.strokeStyle = '#151515'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(60, -14); ctx.lineTo(64, -2); ctx.lineTo(2, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#151515'; ctx.fillRect(-22, -5, 24, 10); ctx.restore();
    }
    if (o.hold === 'plate') { ctx.save(); ctx.translate(hx + 30 * s, hy); ctx.scale(s, s); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#151515'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(0, 0, 32, 8, 0, 0, 7); ctx.fill(); ctx.stroke(); ctx.restore(); }
    ctx.restore();
    return true;
  }

  // 依時間挑動畫影格：bangAge = 撞門開始後經過的秒數（沒有撞門時為 null）
  function pick(stage, t, bangAge) {
    const a = IDOL_ANIM[stage]; if (!a) return null;
    const seq = (mode, ms, loop) => {
      const total = a[mode].reduce((x, y) => x + y, 0); let m = loop ? ms % total : Math.min(ms, total - 1);
      for (let i = 0; i < a[mode].length; i++) { if (m < a[mode][i]) return img[`idol${stage}_${mode}${i}`]; m -= a[mode][i]; }
      return img[`idol${stage}_${mode}0`];
    };
    const bangTotal = a.bang.reduce((x, y) => x + y, 0);
    if (bangAge != null && bangAge * 1000 < bangTotal) return seq('bang', bangAge * 1000, false);
    return seq('idle', t * 1000, true);
  }
  const hasAnim = stage => !!IDOL_ANIM[stage];
  const gifSrc = stage => IDOL_ANIM[stage] ? BASE + IDOL_ANIM[stage].gif : BASE + list['idol_stage' + stage];

  // 觀察窗內的偶像：裁掉圖上的霜框，只取臉與肩膀
  function idol(ctx, stage, x, y, w, h, dx = 0, dy = 0, t = 0, bangAge = null) {
    stage = Math.max(0, Math.min(5, stage));
    const im = pick(stage, t, bangAge) || img['idol_stage' + stage]; if (!im) return false;
    const sx = im.width * .1, sw = im.width * .8, sh = sw * h / w, sy = im.height * .1;
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.drawImage(im, sx, sy, sw, sh, x + dx - 4, y + dy - 4, w + 8, h + 8);
    ctx.restore(); return true;
  }

  return { load, get, chef, idol, hasAnim, gifSrc, src: k => BASE + list[k] };
})();
