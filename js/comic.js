'use strict';
/* ComicPlayer：資料驅動的動態漫畫（每格一張圖＋對白＋效果）。
   用法：await OSHI.Comic.play(cuts)。點一下畫面／按互動鍵＝下一格；右上「略過」跳過整段。
   圖還沒到時，用灰底＋說明文字代替，對白照常播放。 */
OSHI.Comic = (() => {
  const SW = 1280, SH = 720, INK = '#151515', PINK = '#f19cb9';
  const cache = {};
  const load = src => { if (!cache[src]) { const i = new Image(); i.onerror = () => { i._err = true; }; i.src = src; cache[src] = i; } return cache[src]; };
  const img = src => { if (!src) return null; const i = load(src); return i.complete && i.naturalWidth ? i : null; };
  const pending = src => { if (!src) return false; const i = load(src); return !i._err && !(i.complete && i.naturalWidth); };   // 還在下載中
  let skipAll = false;

  // 每格長度：至少 cut.dur，且最後一句對白出現後留夠閱讀時間
  const lenOf = c => Math.max(c.dur || 2, ...(c.lines || []).map(l => (l.at || 0) + .9 + l.text.length * .085));

  function cover(ctx, im, zoom, focusY = .5) {
    const k = Math.max(SW / im.width, SH / im.height) * zoom, w = im.width * k, h = im.height * k;
    ctx.drawImage(im, (SW - w) / 2, (SH - h) * focusY, w, h);
  }
  function rays(ctx, color, spin) {
    ctx.save(); ctx.translate(SW / 2, SH / 2); ctx.rotate(spin); ctx.fillStyle = color;
    for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2, w = .045; ctx.beginPath(); ctx.moveTo(Math.cos(a - w) * 120, Math.sin(a - w) * 120); ctx.lineTo(Math.cos(a) * 1500, Math.sin(a) * 1500); ctx.lineTo(Math.cos(a + w) * 120, Math.sin(a + w) * 120); ctx.fill(); }
    ctx.restore();
  }
  function speed(ctx, el) {
    ctx.strokeStyle = 'rgba(0,0,0,.55)';
    for (let i = 0; i < 70; i++) { const a = i * 2.39996 + el * 9, r0 = 300 + ((i * 53) % 160); ctx.lineWidth = 1 + (i % 3); ctx.beginPath(); ctx.moveTo(SW / 2 + Math.cos(a) * r0, SH / 2 + Math.sin(a) * r0); ctx.lineTo(SW / 2 + Math.cos(a) * 1300, SH / 2 + Math.sin(a) * 1300); ctx.stroke(); }
  }
  function hearts(ctx, el) {
    for (let i = 0; i < 26; i++) {
      const x = (i * 197 + el * 60 * (i % 2 ? 1 : -1)) % SW, y = (i * 131 + el * 90) % SH, s = 14 + (i % 4) * 6;
      if (i % 3) OSHI.Art.heart(ctx, x, y, s, i % 2 ? PINK : '#ffd1e1');
      else { ctx.fillStyle = '#f7c4d6'; ctx.beginPath(); ctx.ellipse(x, y, 9, 5, el + i, 0, 7); ctx.fill(); }
    }
  }
  function sfx(ctx, text, x, y, size, rot = -.1) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.font = `900 italic ${size}px serif`; ctx.lineJoin = 'round';
    ctx.strokeStyle = INK; ctx.lineWidth = size / 7; ctx.strokeText(text, 0, 0); ctx.fillStyle = '#fff'; ctx.fillText(text, 0, 0); ctx.restore();
  }
  function wrap(ctx, text, maxW) {
    const out = []; let line = '';
    for (const ch of text) { if (ctx.measureText(line + ch).width > maxW && line) { out.push(line); line = ch; } else line += ch; }
    if (line) out.push(line); return out;
  }
  // 爆炸框（喊叫用）：鋸齒狀白框＋粗字，位置由 l.x / l.y 決定
  function burst(ctx, l, el) {
    const t = el - (l.at || 0), pop = Math.min(1, t / .12), sc = (1.25 - .25 * pop) * (l.scale || 1), x = l.x ?? 900, y = l.y ?? 560;
    ctx.save(); ctx.translate(x + Math.sin(el * 60) * (t < .3 ? 4 : 0), y); ctx.scale(sc, sc); ctx.rotate(l.rot ?? -.05); ctx.globalAlpha = pop;
    ctx.font = `900 ${l.size || 64}px sans-serif`; const tw = ctx.measureText(l.text).width, rx = tw / 2 + 70, ry = (l.size || 64) / 2 + 62, n = 22;
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * Math.PI * 2, r = i % 2 ? .78 : 1.08 + ((i * 37) % 7) / 40; ctx.lineTo(Math.cos(a) * rx * r, Math.sin(a) * ry * r); }
    ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineJoin = 'miter'; ctx.lineWidth = 7; ctx.strokeStyle = INK; ctx.stroke();
    ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(l.text, 0, 4);
    ctx.restore();
  }
  function bubbles(ctx, lines, el) {
    lines.filter(l => l.burst && el >= (l.at || 0)).forEach(l => burst(ctx, l, el));
    lines = lines.filter(l => !l.burst);
    const shown = lines.filter(l => el >= (l.at || 0)).slice(-1);   // 一次只顯示一個對話框：下一句出來就換掉
    let y = SH - 26;
    for (let i = shown.length - 1; i >= 0; i--) {
      const l = shown[i], t = el - (l.at || 0), chars = Math.min(l.text.length, Math.floor(t * 38) + 1);
      ctx.font = 'bold 30px sans-serif'; const rows = wrap(ctx, l.text, 980), h = 30 + rows.length * 42;
      y -= h; const x = 120, w = SW - 240;
      ctx.globalAlpha = i === shown.length - 1 ? 1 : .75;
      OSHI.Art.rr(ctx, x, y, w, h, 14); OSHI.Art.fillStroke(ctx, l.pink ? '#fff1f6' : '#fff', l.pink ? '#c24f7a' : INK, 4);
      if (l.who) { ctx.font = 'bold 20px sans-serif'; const nw = ctx.measureText(l.who).width + 26; ctx.fillStyle = l.pink ? '#c24f7a' : INK; ctx.fillRect(x + 22, y - 16, nw, 30); ctx.fillStyle = '#fff'; ctx.fillText(l.who, x + 35, y + 6); }
      ctx.font = 'bold 30px sans-serif'; ctx.fillStyle = l.pink ? '#7a2f4c' : INK;
      let left = chars; rows.forEach((r, j) => { if (left <= 0) return; ctx.fillText(r.slice(0, left), x + 34, y + 48 + j * 42); left -= r.length; });
      ctx.globalAlpha = 1; y -= 18;
    }
  }

  function frame(cut) {
    return (ctx, k, el, d, t) => {
      const im = img(cut.img), zoom = 1 + (cut.push ?? .05) * k;
      ctx.save();
      if (cut.shake && el > (cut.shakeAt || 0) && el < (cut.shakeAt || 0) + .35) ctx.translate(Math.sin(el * 300) * 18, Math.cos(el * 270) * 12);
      ctx.fillStyle = '#e9e5dc'; ctx.fillRect(-40, -40, SW + 80, SH + 80);
      if (cut.fx === 'rays') rays(ctx, 'rgba(0,0,0,.08)', el * .3);
      if (cut.art === 'black') { ctx.fillStyle = '#000'; ctx.fillRect(-40, -40, SW + 80, SH + 80); }
      else if (cut.art === 'title') {   // 標題卡（程式畫）
        ctx.fillStyle = '#0b0b0b'; ctx.fillRect(-40, -40, SW + 80, SH + 80); const a = Math.min(1, el / .8); ctx.globalAlpha = a; ctx.textAlign = 'center';
        ctx.fillStyle = '#9a8f93'; ctx.font = '600 20px sans-serif'; ctx.fillText('A DEVOTION THAT NEVER DIES', SW / 2, 250);
        ctx.fillStyle = '#f3eee8'; ctx.font = '900 150px serif'; ctx.fillText('推し活', SW / 2, 410); ctx.fillStyle = PINK; ctx.fillRect(SW / 2 - 120, 440, 240, 4);
        ctx.fillStyle = '#bbb'; ctx.font = '22px sans-serif'; ctx.fillText('日本黑色幽默恐怖遊戲', SW / 2, 490); ctx.textAlign = 'left'; ctx.globalAlpha = 1;
      }
      else if (im) cover(ctx, im, zoom, cut.focusY ?? .5);
      else if (pending(cut.img)) { ctx.fillStyle = '#000'; ctx.fillRect(-40, -40, SW + 80, SH + 80); }   // 還在下載：先黑畫面，不顯示待補
      else {   // 圖還沒到：佔位
        ctx.fillStyle = '#d6d2c8'; ctx.fillRect(60, 60, SW - 120, SH - 120); ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.strokeRect(60, 60, SW - 120, SH - 120);
        ctx.fillStyle = '#555'; ctx.textAlign = 'center'; ctx.font = '900 44px serif'; ctx.fillText(cut.id + '（圖待補）', SW / 2, 200);
        ctx.font = '22px sans-serif'; wrap(ctx, cut.desc || '', 900).forEach((r, i) => ctx.fillText(r, SW / 2, 260 + i * 34)); ctx.textAlign = 'left';
      }
      if (cut.fx === 'speed') speed(ctx, el);
      if (cut.fx === 'hearts') { ctx.fillStyle = 'rgba(255,200,220,.18)'; ctx.fillRect(0, 0, SW, SH); hearts(ctx, el); }
      if (cut.flashAt != null) { const f = (el - cut.flashAt) / .3; if (f > 0 && f < 1) { ctx.fillStyle = `rgba(255,255,255,${1 - f})`; ctx.fillRect(-40, -40, SW + 80, SH + 80); } }
      (cut.sfx || []).forEach(s => { if (el >= (s.at || 0)) sfx(ctx, s.text, s.x, s.y, s.size || 140, s.rot ?? -.1); });
      ctx.restore();
      bubbles(ctx, cut.lines || [], el);
      // 漫畫格外框＋略過
      ctx.strokeStyle = INK; ctx.lineWidth = 10; ctx.strokeRect(5, 5, SW - 10, SH - 10);
      ctx.fillStyle = 'rgba(0,0,0,.55)'; OSHI.Art.rr(ctx, SW - 150, 22, 124, 40, 20); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = 'bold 18px sans-serif'; ctx.fillText('略過 ▶▶', SW - 128, 49);
      if (k > .98 && cut.hold) { ctx.fillStyle = 'rgba(0,0,0,.0)'; }
    };
  }

  // 載入中畫面：等這段漫畫的圖都下載好再播，避免出現「待補」
  function loadingFrame(cuts) {
    return (ctx, k, el) => {
      const srcs = cuts.map(c => c.img).filter(Boolean), done = srcs.filter(x => !pending(x)).length;
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, SW, SH);
      ctx.fillStyle = '#888'; ctx.textAlign = 'center'; ctx.font = '22px sans-serif';
      ctx.fillText(`載入中…　${done} / ${srcs.length}`, SW / 2, SH / 2);
      ctx.fillStyle = '#333'; ctx.fillRect(SW / 2 - 160, SH / 2 + 24, 320, 6); ctx.fillStyle = PINK; ctx.fillRect(SW / 2 - 160, SH / 2 + 24, 320 * (srcs.length ? done / srcs.length : 1), 6);
      ctx.textAlign = 'left';
    };
  }
  function preload(cuts) { for (const c of cuts || []) if (c.img) load(c.img); }
  async function play(cuts) {
    skipAll = false; preload(cuts);
    const t0 = performance.now(), fr = loadingFrame(cuts);
    while (!skipAll && cuts.some(c => pending(c.img)) && performance.now() - t0 < 20000) await OSHI.Cut.play(fr, .15);   // 最多等 20 秒
    for (const c of cuts) { if (skipAll) break; await OSHI.Cut.play(frame(c), lenOf(c)); }
    skipAll = false;
  }
  // 點右上角＝略過整段（座標以 1280×720 為準）
  function tapAt(x, y) { if (x > SW - 170 && y < 80) { skipAll = true; OSHI.Cut.skip(); return true; } return false; }

  return { play, tapAt, lenOf, preload };
})();
