'use strict';
/* MapSystem / CollisionManager：格子地圖、碰撞、視線、尋路、地圖繪製（斜 45 度俯視佔位美術） */
OSHI.SMap = (() => {
  const SC = OSHI.SORTIE, T = SC.tile, TY = SC.types;

  function build(def) {
    const W = def.w, H = def.h, cells = new Array(W * H).fill(def.base);
    const put = (r, t) => { for (let y = Math.floor(r.y); y < Math.ceil(r.y + r.h); y++) for (let x = Math.floor(r.x); x < Math.ceil(r.x + r.w); x++) if (x >= 0 && y >= 0 && x < W && y < H) cells[y * W + x] = t; };
    def.floors.forEach(r => put(r, r.t));
    def.props.forEach(r => put(r, r.t));
    // 外框一律是牆
    for (let x = 0; x < W; x++) { if (!TY[cells[x]].solid) cells[x] = def.base; if (!TY[cells[(H - 1) * W + x]].solid && cells[(H - 1) * W + x] !== 'door') cells[(H - 1) * W + x] = def.base; }
    for (let y = 0; y < H; y++) { cells[y * W] = TY[cells[y * W]].solid ? cells[y * W] : def.base; if (!TY[cells[y * W + W - 1]].solid) cells[y * W + W - 1] = def.base; }
    // 有正式圖片的物件：那些格子不再畫成方塊
    const imaged = new Uint8Array(W * H);
    def.props.forEach(r => { if (!r.img) return; for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) imaged[y * W + x] = 1; });
    // 建築物朝南（面向道路）的那一面，自動排上店面
    const facades = [];
    if (def.facades) {
      let n = 0;
      for (let ty = 0; ty < H - 1; ty++) {
        let tx = 0;
        while (tx < W) {
          const front = x => cells[ty * W + x] === 'bld' && !TY[cells[(ty + 1) * W + x]].solid;
          if (!front(tx)) { tx++; continue; }
          let end = tx; while (end < W && front(end)) end++;
          let L = end - tx, x = tx;
          while (L > 0) {
            const cw = L === 4 ? 2 : Math.min(3, L), mid = x + Math.floor(cw / 2);
            let rows = 0; for (let y = ty; y >= 0 && TY[cells[y * W + mid]].solid; y--) rows++;
            facades.push({ x: x * T, w: cw * T, bottom: (ty + 1) * T, cap: rows * T + 34, img: def.facades[n++ % def.facades.length] });
            x += cw; L -= cw;
          }
          tx = end;
        }
      }
    }
    // 物件（車、柱子、販賣機、貨架…）：碰撞改用「比格子小一圈」的矩形，避免被看不到的格子邊緣卡住
    const BIG = { bld: 1, resto: 1, store: 1, swall: 1 }, inset = .22, propCell = new Uint8Array(W * H), rects = [];
    def.props.forEach(r => {
      if (BIG[r.t]) return;
      for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) propCell[y * W + x] = 1;
      rects.push([(r.x + inset) * T, (r.y + inset) * T, (r.x + r.w - inset) * T, (r.y + r.h - inset * .6) * T]);
    });
    return { def, W, H, cells, pxW: W * T, pxH: H * T, imaged, facades, propCell, rects };
  }

  const cell = (m, tx, ty) => (tx < 0 || ty < 0 || tx >= m.W || ty >= m.H) ? m.def.base : m.cells[ty * m.W + tx];
  const solidAt = (m, tx, ty) => !!TY[cell(m, tx, ty)].solid;
  const sightAt = (m, tx, ty) => !!TY[cell(m, tx, ty)].sight;
  const solidPx = (m, x, y) => solidAt(m, Math.floor(x / T), Math.floor(y / T));
  const sightPx = (m, x, y) => sightAt(m, Math.floor(x / T), Math.floor(y / T));

  // 圓形角色移動（分軸碰撞，貼牆滑動）
  function hitsCircle(m, x, y, r) {
    for (const [x0, y0, x1, y1] of m.rects) {
      if (x + r < x0 || x - r > x1 || y + r < y0 || y - r > y1) continue;
      const cx = Math.max(x0, Math.min(x, x1)), cy = Math.max(y0, Math.min(y, y1));
      if ((cx - x) ** 2 + (cy - y) ** 2 < r * r) return true;
    }
    for (let ty = Math.floor((y - r) / T); ty <= Math.floor((y + r) / T); ty++)
      for (let tx = Math.floor((x - r) / T); tx <= Math.floor((x + r) / T); tx++) {
        if (!solidAt(m, tx, ty)) continue;
        if (tx >= 0 && ty >= 0 && tx < m.W && ty < m.H && m.propCell[ty * m.W + tx]) continue;
        const cx = Math.max(tx * T, Math.min(x, tx * T + T)), cy = Math.max(ty * T, Math.min(y, ty * T + T));
        if ((cx - x) ** 2 + (cy - y) ** 2 < r * r) return true;
      }
    return false;
  }
  function move(m, e, dx, dy, r) {
    if (dx && !hitsCircle(m, e.x + dx, e.y, r)) e.x += dx;
    if (dy && !hitsCircle(m, e.x, e.y + dy, r)) e.y += dy;
  }

  // 視線：從 a 到 b 中間有沒有擋視線的格子
  function los(m, x1, y1, x2, y2) {
    const d = Math.hypot(x2 - x1, y2 - y1), n = Math.ceil(d / 12);
    for (let i = 1; i < n; i++) { const k = i / n; if (sightPx(m, x1 + (x2 - x1) * k, y1 + (y2 - y1) * k)) return false; }
    return true;
  }
  function ray(m, x, y, a, max, solidOnly) {
    const c = Math.cos(a), s = Math.sin(a);
    for (let d = 8; d < max; d += 9) { const px = x + c * d, py = y + s * d; if (solidOnly ? solidPx(m, px, py) : sightPx(m, px, py)) return d; }
    return max;
  }
  // 走得過去（考慮角色寬度）的直線
  function clearWalk(m, x1, y1, x2, y2, r) {
    const d = Math.hypot(x2 - x1, y2 - y1), n = Math.ceil(d / 16);
    for (let i = 1; i <= n; i++) { const k = i / n; if (hitsCircle(m, x1 + (x2 - x1) * k, y1 + (y2 - y1) * k, r + 2)) return false; }
    return true;
  }

  // 尋路：格子 BFS（8 方向，不切牆角），回傳像素路徑點
  function path(m, x1, y1, x2, y2) {
    const sx = Math.floor(x1 / T), sy = Math.floor(y1 / T);
    let gx = Math.floor(x2 / T), gy = Math.floor(y2 / T);
    if (solidAt(m, gx, gy)) { const n = nearestOpen(m, gx, gy); if (!n) return null; [gx, gy] = n; }
    const W = m.W, prev = new Int32Array(W * m.H).fill(-1), q = [sy * W + sx]; prev[sy * W + sx] = sy * W + sx;
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    let found = false;
    for (let qi = 0; qi < q.length; qi++) {
      const c = q[qi], cx = c % W, cy = (c - cx) / W;
      if (cx === gx && cy === gy) { found = true; break; }
      for (const [dx, dy] of dirs) {
        const nx = cx + dx, ny = cy + dy;
        if (solidAt(m, nx, ny) || prev[ny * W + nx] !== -1) continue;
        if (dx && dy && (solidAt(m, cx + dx, cy) || solidAt(m, cx, cy + dy))) continue;
        prev[ny * W + nx] = c; q.push(ny * W + nx);
      }
    }
    if (!found) return null;
    const out = []; let c = gy * W + gx;
    while (c !== sy * W + sx) { const cx = c % W; out.push([cx * T + T / 2, (c - cx) / W * T + T / 2]); c = prev[c]; }
    out.reverse();
    if (out.length && !solidPx(m, x2, y2)) out[out.length - 1] = [x2, y2];
    return out;
  }
  function nearestOpen(m, tx, ty) {
    for (let r = 1; r < 6; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (!solidAt(m, tx + dx, ty + dy)) return [tx + dx, ty + dy];
    return null;
  }
  // 放置角色時如果卡在牆裡，挪到最近的空格中心
  function settle(m, e, r) {
    if (!hitsCircle(m, e.x, e.y, r)) return;
    const tx = Math.floor(e.x / T), ty = Math.floor(e.y / T);
    if (!solidAt(m, tx, ty)) { e.x = tx * T + T / 2; e.y = ty * T + T / 2; return; }
    const n = nearestOpen(m, tx, ty); if (n) { e.x = n[0] * T + T / 2; e.y = n[1] * T + T / 2; }
  }
  // 隨機找一個可以走的點（殭屍閒逛用）
  function randomOpenNear(m, x, y, r) {
    for (let i = 0; i < 20; i++) {
      const px = x + (Math.random() * 2 - 1) * r * T, py = y + (Math.random() * 2 - 1) * r * T;
      if (!hitsCircle(m, px, py, 22)) return [px, py];
    }
    return [x, y];
  }

  /* ---------- 繪製 ---------- */
  // 地面材質：512px 的圖重複拼貼，1 張蓋 4×4 格
  const pats = {};
  function pattern(ctx, m, t) {
    if (!SC.mapArt) return null;
    const name = m.def.floorImg && m.def.floorImg[t]; if (!name) return null;
    if (pats[name]) return pats[name];
    const im = OSHI.SSprites && OSHI.SSprites.env(name); if (!im) return null;
    const p = ctx.createPattern(im, 'repeat'); if (p.setTransform) p.setTransform(new DOMMatrix().scale(T * 4 / im.width));
    return (pats[name] = p);
  }
  function drawImg(ctx, name, cx, bottom, w, maxH, shadow = true) {
    const im = OSHI.SSprites && OSHI.SSprites.env(name); if (!im) return false;
    let h = w * im.height / im.width; if (maxH && h > maxH) { w *= maxH / h; h = maxH; }
    if (shadow) { ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(cx, bottom - 4, w * .46, Math.min(14, w * .12), 0, 0, 7); ctx.fill(); }
    ctx.drawImage(im, cx - w / 2, bottom - h, w, h); return true;
  }
  function underFloor(m, tx, ty) {
    for (let r = 1; r < 6; r++) for (const [dx, dy] of [[0, r], [0, -r], [r, 0], [-r, 0]]) { const t = cell(m, tx + dx, ty + dy); if (!TY[t].solid && t !== 'door' && t !== 'rail') return t; }
    return null;
  }
  // GPT 畫的整張地圖背景：有就整張畫上去，不再畫格子地面、方塊和物件圖
  const bgCache = {};
  function bgImgs(m) {
    if (!m.def.bg) return null;
    const out = [];
    for (const b of m.def.bg) {
      let im = bgCache[b.img]; if (!im) { im = bgCache[b.img] = new Image(); im.src = 'assets/sortie_bg/' + b.img + '.jpg'; }
      if (!im.complete || !im.naturalWidth) return null; out.push([im, b]);
    }
    return out;
  }
  function drawBg(ctx, m, cam, vw, vh) {
    const bs = bgImgs(m); if (!bs) return false;
    for (const [im, b] of bs) {
      const x = b.x * T, y = b.y * T, w = b.w * T, h = b.h * T;
      const sx = Math.max(0, cam.x - x), sy = Math.max(0, cam.y - y), ex = Math.min(w, cam.x + vw - x), ey = Math.min(h, cam.y + vh - y);
      if (ex <= sx || ey <= sy) continue;
      const kx = im.width / w, ky = im.height / h;
      ctx.drawImage(im, sx * kx, sy * ky, (ex - sx) * kx, (ey - sy) * ky, x + sx, y + sy, ex - sx, ey - sy);
    }
    return true;
  }
  function drawFloor(ctx, m, cam, vw, vh) {
    const x0 = Math.max(0, Math.floor(cam.x / T)), y0 = Math.max(0, Math.floor(cam.y / T) - 1);
    const x1 = Math.min(m.W - 1, Math.ceil((cam.x + vw) / T)), y1 = Math.min(m.H - 1, Math.ceil((cam.y + vh) / T) + 2);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      let t = cell(m, tx, ty), d = TY[t];
      if (d.solid) {   // 用圖片畫的物件底下也要有地板：沿用旁邊的地面
        if (!SC.mapArt || !m.imaged[ty * m.W + tx]) continue;
        t = underFloor(m, tx, ty); if (!t) continue; d = TY[t];
      }
      const x = tx * T, y = ty * T, pat = pattern(ctx, m, t);
      ctx.fillStyle = pat || d.color; ctx.fillRect(x, y, T, T);
      if (pat && t === 'arcade') { ctx.fillStyle = 'rgba(255,240,210,.12)'; ctx.fillRect(x, y, T, T); }
      ctx.strokeStyle = d.line; ctx.lineWidth = 1;
      if (pat && t !== 'park' && t !== 'rail' && t !== 'door') continue;
      if (t === 'side' || t === 'tile') { ctx.strokeRect(x + .5, y + .5, T / 2, T / 2); ctx.strokeRect(x + T / 2 + .5, y + T / 2 + .5, T / 2 - 1, T / 2 - 1); }
      else if (t === 'arcade') { ctx.strokeRect(x + .5, y + .5, T - 1, T - 1); if ((tx + ty) % 2) { ctx.fillStyle = 'rgba(0,0,0,.04)'; ctx.fillRect(x, y, T, T); } }
      else if (t === 'park') { if (ty === 1 || ty === 3 || ty === 5) { ctx.fillStyle = d.line; ctx.fillRect(x + T - 3, y + 6, 3, T - 12); } }
      else if (t === 'rail' && pat) { const im = OSHI.SSprites.env('rx_rail'); if (im) { ctx.save(); ctx.translate(x + T / 2, y + T / 2); ctx.rotate(Math.PI / 2); ctx.drawImage(im, -T * .62, -T * .55, T * 1.24, T * 1.1); ctx.restore(); } }
      else if (t === 'rail') { ctx.fillStyle = '#5e564c'; for (let i = 0; i < 4; i++) ctx.fillRect(x + i * 16 + 2, y, 8, T); ctx.fillStyle = '#ccc'; ctx.fillRect(x, y + 18, T, 4); ctx.fillRect(x, y + 42, T, 4); }
      else if (t === 'door') { ctx.fillStyle = '#5f9068'; ctx.fillRect(x + 8, y + 8, T - 16, T - 16); }
      else { ctx.strokeRect(x + .5, y + .5, T - 1, T - 1); }
    }
  }
  // 牆與物件：回傳可排序的繪製項目（依底邊 y）
  function solidItems(m, cam, vw, vh) {
    const items = [];
    const x0 = Math.max(0, Math.floor(cam.x / T)), y0 = Math.max(0, Math.floor(cam.y / T));
    const x1 = Math.min(m.W - 1, Math.ceil((cam.x + vw) / T)), y1 = Math.min(m.H - 1, Math.ceil((cam.y + vh) / T) + 3);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const t = cell(m, tx, ty); if (!TY[t].solid) continue;
      if (SC.mapArt && m.imaged[ty * m.W + tx] && OSHI.SSprites && OSHI.SSprites.env('st_shelf')) continue;   // 用正式圖片畫
      items.push({ y: ty * T + T, draw: ctx => drawBlock(ctx, m, tx, ty, t) });
    }
    const vis = (x0, x1, y1) => x1 > cam.x - T && x0 < cam.x + vw + T && y1 > cam.y - T && y1 < cam.y + vh + 6 * T;
    if (!SC.mapArt) return items;
    // 物件圖片
    for (const p of m.def.props) {
      if (!p.img || !vis(p.x * T, (p.x + p.w) * T, (p.y + p.h) * T)) continue;
      const sc = p.scale || 1;
      if (p.vrep) { for (let r = 0; r < p.h; r++) { const b = (p.y + r + 1) * T; items.push({ y: b - 1, draw: c => drawImg(c, p.img, (p.x + p.w / 2) * T, b, p.w * T * sc) }); } continue; }
      const rep = p.rep || 1, slot = p.w * T / rep, b = (p.y + p.h) * T;
      for (let i = 0; i < rep; i++) items.push({ y: b - 1, draw: c => drawImg(c, p.img, p.x * T + slot * (i + .5), b, slot * sc * .98) });
    }
    for (const f of m.facades) if (vis(f.x, f.x + f.w, f.bottom)) items.push({ y: f.bottom + 1, draw: c => drawImg(c, f.img, f.x + f.w / 2, f.bottom + 2, f.w * .98, f.cap, false) });
    for (const d of m.def.decor || []) if (d.t === 'img' && vis(d.x * T - 200, d.x * T + 200, d.y * T)) items.push({ y: d.y * T, draw: c => drawImg(c, d.img, d.x * T, d.y * T, d.w * T) });
    return items;
  }
  function drawBlock(ctx, m, tx, ty, t) {
    const d = TY[t], x = tx * T, y = ty * T, h = Math.min(d.h, 40), same = (dx, dy) => cell(m, tx + dx, ty + dy) === t;
    const low = h < 40, inset = low ? 6 : 0;
    // 正面（下方不是同種物件才畫）
    if (!same(0, 1)) { ctx.fillStyle = d.front; ctx.fillRect(x + inset, y + T - h, T - inset * 2, h); }
    // 頂面
    ctx.fillStyle = d.top; ctx.fillRect(x + inset, y - h + inset, T - inset * 2, T - inset);
    ctx.strokeStyle = '#151515'; ctx.lineWidth = 2; ctx.beginPath();
    if (!same(0, -1)) { ctx.moveTo(x + inset, y - h + inset); ctx.lineTo(x + T - inset, y - h + inset); }
    if (!same(-1, 0)) { ctx.moveTo(x + inset, y - h + inset); ctx.lineTo(x + inset, y + T - (same(0, 1) ? 0 : 0)); }
    if (!same(1, 0)) { ctx.moveTo(x + T - inset, y - h + inset); ctx.lineTo(x + T - inset, y + T); }
    if (!same(0, 1)) { ctx.moveTo(x + inset, y + T - h); ctx.lineTo(x + T - inset, y + T - h); ctx.moveTo(x + inset, y + T); ctx.lineTo(x + T - inset, y + T); }
    ctx.stroke();
    // 物件細節
    if (t === 'vend') { ctx.fillStyle = '#fff8c8'; ctx.fillRect(x + 12, y + T - h + 10, T - 24, 22); }
    if (t === 'fridge' && !same(0, 1)) { ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(x + 8, y + T - h + 8, T - 16, h - 16); }
    if (t === 'shelf') { ctx.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 0; i < 3; i++) ctx.fillRect(x + 6 + i * 19, y - h + 12, 12, T - 24); }
    if (t === 'car') { ctx.fillStyle = 'rgba(30,40,50,.35)'; ctx.fillRect(x + 10, y - h + 14, T - 20, T - 30); }
    if ((t === 'bld' || t === 'resto' || t === 'store') && !same(0, 1)) { ctx.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i < 2; i++) ctx.fillRect(x + 10 + i * 26, y + T - h + 18, 16, 26); }
  }
  // 吊在高處的東西（拱廊燈籠）：畫在角色上面
  function drawHang(ctx, m) {
    if (!SC.mapArt) return;
    for (const d of m.def.decor || []) if (d.t === 'hang') drawImg(ctx, d.img, d.x * T, d.y * T, d.w * T, 0, false);
  }
  function drawLabels(ctx, m) {
    (m.def.labels || []).forEach(l => {
      ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
      const w = ctx.measureText(l.text).width + 20, x = l.x * T, y = l.y * T - 70;
      ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(x - w / 2, y - 22, w, 32); ctx.strokeStyle = '#151515'; ctx.lineWidth = 2; ctx.strokeRect(x - w / 2, y - 22, w, 32);
      ctx.fillStyle = '#151515'; ctx.fillText(l.text, x, y + 2); ctx.textAlign = 'left';
    });
  }
  function drawDecor(ctx, m) {
    (m.def.decor || []).forEach(d => {
      const x = d.x * T, y = d.y * T;
      if (d.t === 'recycle' && SC.mapArt && OSHI.SSprites && OSHI.SSprites.env('sr_recycle')) return;
      if (d.t === 'crossing' && SC.mapArt) return;
      if (d.t === 'crossing') { ctx.fillStyle = '#151515'; ctx.fillRect(x - 3, y - 60, 6, 64); ctx.fillStyle = '#d33'; ctx.beginPath(); ctx.arc(x - 9, y - 54, 7, 0, 7); ctx.arc(x + 9, y - 54, 7, 0, 7); ctx.fill(); ctx.fillStyle = '#f5d000'; ctx.fillRect(x - 16, y - 40, 32, 6); }
      if (d.t === 'recycle') { ctx.strokeStyle = '#2d6a3a'; ctx.lineWidth = 3; ctx.strokeRect(x - 70, y - 30, 100, 90); ctx.fillStyle = '#2d6a3a'; ctx.font = 'bold 16px sans-serif'; ctx.fillText('♻ 回收區', x - 66, y - 36); }
    });
  }

  // 小地圖
  function drawMini(ctx, m, rx, ry, rw, rh) {
    const k = Math.min(rw / m.pxW, rh / m.pxH), ox = rx + (rw - m.pxW * k) / 2, oy = ry + (rh - m.pxH * k) / 2, s = T * k;
    for (let ty = 0; ty < m.H; ty++) for (let tx = 0; tx < m.W; tx++) {
      const t = cell(m, tx, ty), d = TY[t];
      ctx.fillStyle = d.solid ? (d.sight ? '#2a2a2a' : '#555') : (t === 'door' ? '#7fb38a' : '#d8d4ca');
      ctx.fillRect(ox + tx * s, oy + ty * s, Math.ceil(s), Math.ceil(s));
    }
    return { k, ox, oy };
  }

  return { build, settle, drawHang, drawImg, drawBg, cell, solidAt, solidPx, sightPx, hitsCircle, move, los, ray, clearWalk, path, randomOpenNear, drawFloor, solidItems, drawLabels, drawDecor, drawMini, T };
})();
