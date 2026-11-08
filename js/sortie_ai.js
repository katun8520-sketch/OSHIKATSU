'use strict';
/* ZombieAI / HumanAI：視線偵測、警戒狀態、追逐、逃跑、攻擊；以及敵人的佔位美術與視線扇形 */
OSHI.SAI = (() => {
  const SC = OSHI.SORTIE, M = OSHI.SMap, T = SC.tile, INK = '#151515';
  const rnd = (a, b) => a + Math.random() * (b - a);
  const angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
  const turnTo = (a, ang, dt, speed = 6) => { const d = angDiff(a.face, ang); a.face += Math.sign(d) * Math.min(Math.abs(d), speed * dt); };
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function make(type, o) {
    return Object.assign({ type, x: 0, y: 0, face: 0, state: o.mode, mode: o.mode, t: rnd(0, 2), meter: 0, path: null, pathT: 0, goal: null,
      phase: 0, moving: false, atk: 0, cd: 0, lost: 0, last: null, noticed: new Set(), lookIdx: 0, paceIdx: 0, patrolIdx: 0, hurtT: 0 }, o,
      { home: { x: o.x, y: o.y, face: o.face || 0 } });
  }

  /* ---------- 移動：能直走就直走，否則用格子尋路 ---------- */
  function goTo(W, a, x, y, speed, dt) {
    const d = Math.hypot(x - a.x, y - a.y);
    if (d < 12) { a.moving = false; return true; }
    let tx = x, ty = y;
    if (!M.clearWalk(W.map, a.x, a.y, x, y, 18)) {
      a.pathT -= dt;
      if (!a.path || a.pathT <= 0 || !a.goal || Math.hypot(a.goal[0] - x, a.goal[1] - y) > T) { a.path = M.path(W.map, a.x, a.y, x, y); a.pathT = .5; a.goal = [x, y]; }
      if (!a.path || !a.path.length) { a.moving = false; return true; }
      while (a.path.length > 1 && Math.hypot(a.path[0][0] - a.x, a.path[0][1] - a.y) < 14) a.path.shift();
      if (a.path.length > 1 && M.clearWalk(W.map, a.x, a.y, a.path[1][0], a.path[1][1], 18)) a.path.shift();
      [tx, ty] = a.path[0];
    } else a.path = null;
    const dd = Math.hypot(tx - a.x, ty - a.y) || 1, step = Math.min(dd, speed * dt);
    const ang = Math.atan2(ty - a.y, tx - a.x);
    const bx = a.x, by = a.y;
    M.move(W.map, a, (tx - a.x) / dd * step, (ty - a.y) / dd * step, 18);
    if (Math.hypot(a.x - bx, a.y - by) < step * .2) {   // 卡住：重算路徑，卡太久就往格子中心挪
      a.pathT = 0; a.stuck = (a.stuck || 0) + dt;
      if (a.stuck > .3) { const cx = Math.floor(a.x / T) * T + T / 2, cy = Math.floor(a.y / T) * T + T / 2; M.move(W.map, a, Math.sign(cx - a.x) * Math.min(Math.abs(cx - a.x), speed * dt), Math.sign(cy - a.y) * Math.min(Math.abs(cy - a.y), speed * dt), 18); }
    } else a.stuck = 0;
    turnTo(a, ang, dt, 9); a.moving = true; a.phase += dt * speed / 22;
    return false;
  }

  /* ---------- 視線 ---------- */
  function sightOf(W, a) {
    if (a.type === 'zombie') { const Z = SC.zombie, eat = a.state === 'eat'; return { range: Z.range * (eat ? Z.eatRange : 1), fov: eat ? Z.eatFov : Z.fov }; }
    return { range: SC.human.range * W.alert.sightMul, fov: SC.human.fov };
  }
  function canSee(W, a, x, y) {
    const { range, fov } = sightOf(W, a), d = Math.hypot(x - a.x, y - a.y);
    if (d > range) return 0;
    if (Math.abs(angDiff(a.face, Math.atan2(y - a.y, x - a.x))) > fov / 2) return 0;
    if (!M.los(W.map, a.x, a.y - 10, x, y - 10)) return 0;
    return 1 - d / range + .15;
  }
  function detect(W, a, dt) {
    const P = W.player; if (P.dead) return false;
    const S = SC.sight, v = canSee(W, a, P.x, P.y), d = dist(a, P);
    if (d < S.touch && M.los(W.map, a.x, a.y, P.x, P.y)) a.meter = 1;
    else if (v) a.meter += dt / S.detectTime * (.55 + v * 1.4) * (P.running ? 1.3 : 1);
    else a.meter = Math.max(0, a.meter - S.decay * dt);
    return a.meter >= 1;
  }

  /* ---------- 聲音（石頭、奔跑、壓縮機、尖叫）---------- */
  function hear(W, a, x, y, kind) {
    if (a.ko || a.state === 'down' || a.state === 'chase' || a.state === 'spot' || a.state === 'flee' || a.state === 'cower') return;
    if (a.type === 'zombie') { a.state = 'investigate'; a.target = [x, y]; a.path = null; return; }
    if (kind === 'call' && a.kind === 'fight') { a.state = 'search'; a.target = [x, y]; a.path = null; a.t = 0; return; }
    a.state = 'sus'; a.t = SC.human.suspicious; a.target = [x, y]; a.path = null;
  }

  /* ---------- 殭屍 ---------- */
  function zombie(W, a, dt) {
    const Z = SC.zombie, P = W.player;
    a.moving = false; a.cd = Math.max(0, a.cd - dt); a.hurtT = Math.max(0, a.hurtT - dt);
    if (a.state === 'down') { a.t -= dt; if (a.t <= 0) { a.hp = Math.round(rnd(Z.hits[0], Z.hits[1] + .99)); a.state = 'chase'; a.last = [P.x, P.y]; a.lost = 0; } return; }
    const chasing = a.state === 'chase' || a.state === 'spot';
    if (!chasing && detect(W, a, dt)) { a.state = 'spot'; a.t = SC.sight.startle * .6; W.onSpot(a); }
    switch (a.state) {
      case 'idle': a.t -= dt; if (a.t <= 0) { a.t = rnd(2, 4); a.sway = rnd(-.35, .35); } turnTo(a, a.home.face + (a.sway || 0), dt, 1); break;
      case 'eat': break;
      case 'wander':
        if (a.t > 0) { a.t -= dt; break; }
        if (!a.target) a.target = M.randomOpenNear(W.map, a.home.x, a.home.y, a.r || 3);
        if (goTo(W, a, a.target[0], a.target[1], Z.wander, dt)) { a.target = null; a.t = rnd(1, 3); }
        break;
      case 'investigate': if (goTo(W, a, a.target[0], a.target[1], Z.investigate, dt)) { a.state = 'look'; a.t = Z.lookAround; } break;
      case 'look': a.t -= dt; a.face += dt * 1.6; if (a.t <= 0) a.state = 'return'; break;
      case 'return': if (goTo(W, a, a.home.x, a.home.y, Z.wander, dt)) { a.state = a.mode; a.face = a.home.face; a.meter = 0; } break;
      case 'spot': a.t -= dt; turnTo(a, Math.atan2(P.y - a.y, P.x - a.x), dt, 10); if (a.t <= 0) { a.state = 'chase'; a.last = [P.x, P.y]; a.lost = 0; } break;
      case 'chase': {
        if (canSee(W, a, P.x, P.y) || dist(a, P) < 90) { a.last = [P.x, P.y]; a.lost = 0; } else a.lost += dt;
        if (a.lost > Z.loseTime || P.dead) { a.state = 'investigate'; a.target = a.last; a.meter = 0; break; }
        const d = dist(a, P);
        if (a.atk > 0) { a.atk -= dt; if (a.atk <= 0) { a.cd = Z.attackCooldown; if (d < Z.attackRange + 14) W.hurt(SC.player.hpPerBite, a); } break; }
        if (d < Z.attackRange && a.cd <= 0) { a.atk = Z.attackWindup; break; }
        goTo(W, a, a.last[0], a.last[1], Z.chase, dt);
      }
    }
  }

  /* ---------- 人類 ---------- */
  function human(W, a, dt) {
    const H = SC.human, P = W.player, al = W.alert;
    a.moving = false; a.cd = Math.max(0, a.cd - dt);
    if (a.ko || a.state === 'cower') return;
    const busy = a.state === 'chase' || a.state === 'spot' || a.state === 'flee';
    if (!busy && detect(W, a, dt)) { a.state = 'spot'; a.t = SC.sight.startle; a.say = '誰！？'; W.onSpot(a); }
    // 發現昏倒的同伴、可疑的黑袋
    if (!busy) for (const o of W.suspects()) {
      if (a.noticed.has(o.key) || !canSee(W, a, o.x, o.y)) continue;
      a.noticed.add(o.key); a.state = 'sus'; a.t = H.suspicious; a.target = [o.x, o.y]; a.say = o.say;
      if (a.kind === 'fight') W.call(a.x, a.y, H.callRadius * al.callMul, a);
      break;
    }
    switch (a.state) {
      case 'post':
        if (a.pace) { const p = a.pace[a.paceIdx]; if (a.t > 0) a.t -= dt; else if (goTo(W, a, p[0] * T, p[1] * T, H.walk * .7, dt)) { a.paceIdx = (a.paceIdx + 1) % a.pace.length; a.t = rnd(1.5, 3); } }
        else { a.t -= dt; if (a.t <= 0) { a.lookIdx = (a.lookIdx + 1) % a.look.length; a.t = rnd(2.2, 3.5); } }
        if (!a.moving && a.look) turnTo(a, a.look[a.lookIdx % a.look.length], dt, 2);
        if (a.pace && !a.moving && a.t > 0) { a.lt = (a.lt || 0) - dt; if (a.lt <= 0) { a.lookIdx++; a.lt = 1.6; } }
        break;
      case 'idle': a.t -= dt; if (a.t <= 0) { a.t = rnd(2.5, 5); a.idleFace = a.home.face + rnd(-1.2, 1.2); } turnTo(a, a.idleFace ?? a.home.face, dt, 1.5); break;
      case 'group': turnTo(a, a.home.face, dt, 3); break;
      case 'wander':
        if (a.t > 0) { a.t -= dt; break; }
        if (!a.target) { const w = W.def.waypoints[Math.floor(Math.random() * W.def.waypoints.length)]; a.target = [w[0] * T, w[1] * T]; }
        if (goTo(W, a, a.target[0], a.target[1], H.walk, dt)) { a.target = null; a.t = rnd(1.5, 4); }
        break;
      case 'patrol': { const p = W.def.patrol[a.patrolIdx]; if (goTo(W, a, p[0] * T, p[1] * T, H.walk, dt)) a.patrolIdx = (a.patrolIdx + 1) % W.def.patrol.length; break; }
      case 'sus': a.t -= dt; turnTo(a, Math.atan2(a.target[1] - a.y, a.target[0] - a.x), dt, 5); if (a.t <= 0) { a.state = 'search'; a.say = null; } break;
      case 'search': if (goTo(W, a, a.target[0], a.target[1], H.search, dt)) { a.state = 'look'; a.t = H.lookAround * al.searchMul; } break;
      case 'look': a.t -= dt; a.face += dt * 1.4; if (a.t <= 0) { a.state = 'return'; a.meter = 0; } break;
      case 'return': if (a.mode === 'wander' || a.mode === 'patrol' || goTo(W, a, a.home.x, a.home.y, H.walk, dt)) { a.state = a.mode; a.target = null; a.face = a.home.face; } break;
      case 'spot':
        a.t -= dt; turnTo(a, Math.atan2(P.y - a.y, P.x - a.x), dt, 10);
        if (a.t <= 0) {
          a.say = null;
          if (a.kind === 'fight') { a.state = 'chase'; a.last = [P.x, P.y]; a.lost = 0; W.call(a.x, a.y, H.callRadius * al.callMul, a); a.say = '在這裡！'; a.sayT = 1.2; }
          else { a.state = 'flee'; a.say = '呀啊啊啊！'; a.sayT = 1.6; W.scream(a.x, a.y, H.screamRadius, a); a.target = fleeTarget(W, a); a.path = null; }
        }
        break;
      case 'flee': if (goTo(W, a, a.target[0], a.target[1], H.flee, dt)) { a.state = 'cower'; a.say = null; } break;
      case 'chase': {
        if (canSee(W, a, P.x, P.y) || dist(a, P) < 80) { a.last = [P.x, P.y]; a.lost = 0; } else a.lost += dt;
        if (a.lost > H.loseTime || P.dead) { a.state = 'search'; a.target = a.last; break; }
        const d = dist(a, P);
        if (a.atk > 0) { a.atk -= dt; if (a.atk <= 0) { a.cd = H.attackCooldown; if (d < H.attackRange + 16) W.hurt(H.damage, a); } break; }
        if (d < H.attackRange && a.cd <= 0) { a.atk = H.attackWindup; break; }
        goTo(W, a, a.last[0], a.last[1], H.chase, dt);
      }
    }
    if (a.sayT) { a.sayT -= dt; if (a.sayT <= 0) { a.sayT = 0; a.say = null; } }
  }
  function fleeTarget(W, a) {
    const P = W.player; let best = null, bd = -1;
    for (const [x, y] of W.def.fleePoints) { const px = x * T, py = y * T, d = Math.hypot(px - P.x, py - P.y) - Math.hypot(px - a.x, py - a.y) * .25; if (d > bd) { bd = d; best = [px, py]; } }
    return best;
  }

  /* ---------- 繪製：視線扇形 ---------- */
  function drawCone(ctx, W, a) {
    if (a.ko || a.state === 'down' || a.state === 'cower' || a.state === 'flee') return;
    const { range, fov } = sightOf(W, a), n = SC.sight.rays;
    const alarm = a.state === 'chase' || a.state === 'spot', sus = a.meter > .05 || a.state === 'sus' || a.state === 'search' || a.state === 'look' || a.state === 'investigate';
    ctx.fillStyle = alarm ? 'rgba(230,40,40,.26)' : sus ? 'rgba(255,200,40,.26)' : a.type === 'zombie' ? 'rgba(120,255,120,.2)' : 'rgba(60,170,255,.3)';
    ctx.beginPath(); ctx.moveTo(a.x, a.y);
    for (let i = 0; i <= n; i++) { const ang = a.face - fov / 2 + fov * i / n, d = M.ray(W.map, a.x, a.y, ang, range); ctx.lineTo(a.x + Math.cos(ang) * d, a.y + Math.sin(ang) * d); }
    ctx.closePath(); ctx.fill();
  }

  /* ---------- 繪製：Q 版佔位角色（正式素材到位後替換）---------- */
  const ZCOL = ['#4a4f5a', '#2f3b52', '#7a6a5a'];
  function drawAgent(ctx, a, t) {
    const sp = OSHI.SSprites && OSHI.SSprites.npc(ctx, a, t);
    if (sp) { if (!a.ko && a.state !== 'down') overlay(ctx, a, a.x, sp.head - 14, t); return; }
    const x = a.x, y = a.y, zom = a.type === 'zombie', big = a.kind === 'fight', s = big ? 1.12 : zom ? 1 : .92;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(0, 0, 22 * s, 8, 0, 0, 7); ctx.fill();
    const skin = zom ? '#9fae9c' : '#f3dcc7', cloth = zom ? ZCOL[a.v % 3] : big ? '#6b4b3a' : ['#f2f2ee', '#7fb0d8', '#e8c9d8'][a.v % 3];
    if (a.ko || a.state === 'down') {
      ctx.fillStyle = cloth; ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(6, -10, 26 * s, 12, 0, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(-24 * s, -12, 13 * s, 0, 7); ctx.fill(); ctx.stroke();
      if (a.ko) { ctx.strokeStyle = INK; ctx.lineWidth = 2; for (const ex of [-29, -20]) { ctx.beginPath(); ctx.moveTo(ex * s - 3, -16); ctx.lineTo(ex * s + 3, -10); ctx.moveTo(ex * s + 3, -16); ctx.lineTo(ex * s - 3, -10); ctx.stroke(); } }
      else { ctx.fillStyle = '#fff'; ctx.font = 'bold 14px sans-serif'; ctx.fillText('z', 10, -30 - Math.sin(t * 4) * 3); }
      ctx.restore(); return;
    }
    const bob = a.moving ? Math.abs(Math.sin(a.phase)) * 3 : 0, cos = Math.cos(a.face), sin = Math.sin(a.face), back = sin < -.55;
    const lean = zom ? 4 : 0, cower = a.state === 'cower';
    ctx.translate(0, -bob + (cower ? 14 : 0));
    // 腳
    ctx.fillStyle = INK; const st = a.moving ? Math.sin(a.phase) * 5 : 0;
    ctx.fillRect(-10 * s + st, -16, 8 * s, 16); ctx.fillRect(3 * s - st, -16, 8 * s, 16);
    // 身體
    ctx.fillStyle = cloth; ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
    OSHI.Art.rr(ctx, -17 * s + cos * lean, -48 * s, 34 * s, 36 * s, 10); ctx.fill(); ctx.stroke();
    // 手（殭屍往前伸）
    ctx.fillStyle = skin;
    if (zom && (a.state === 'chase' || a.atk > 0)) { ctx.beginPath(); ctx.ellipse(cos * 26, -38 + sin * 10, 7, 5, 0, 0, 7); ctx.fill(); ctx.stroke(); }
    // 武器（反擊型拿鐵管）
    if (big) { ctx.strokeStyle = '#777'; ctx.lineWidth = 6; ctx.beginPath(); const sw = a.atk > 0 ? -1.2 : 0; ctx.moveTo(cos * 16, -34); ctx.lineTo(cos * 16 + Math.cos(a.face - .9 + sw) * 34, -34 + Math.sin(a.face - .9 + sw) * 20 - 18); ctx.stroke(); }
    // 頭
    ctx.fillStyle = skin; ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(cos * lean, -66 * s, 22 * s, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = zom ? '#4c544b' : big ? '#2a2a2a' : '#4a3426';
    ctx.beginPath(); ctx.arc(cos * lean, -70 * s, 22 * s, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
    if (back) { ctx.beginPath(); ctx.arc(cos * lean, -66 * s, 20 * s, 0, 7); ctx.fill(); }
    else {
      const ex = cos * 9 + cos * lean, ey = -64 * s + Math.max(0, sin) * 4;
      ctx.fillStyle = zom ? '#f4f4f4' : INK;
      for (const k of [-1, 1]) { ctx.beginPath(); ctx.arc(ex + k * 7 * s, ey, zom ? 4 : 2.6, 0, 7); ctx.fill(); }
      if (zom) { ctx.strokeStyle = '#6b3a3a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ex - 6, ey + 10); ctx.lineTo(ex + 6, ey + 10); ctx.stroke(); }
      if (cower) { ctx.fillStyle = '#8fc4ff'; ctx.beginPath(); ctx.arc(ex + 14, ey - 6, 3, 0, 7); ctx.fill(); }
    }
    ctx.restore();
    overlay(ctx, a, x, y - 100 * s - bob, t);
  }
  // 頭上的狀態：！？、發現量、發抖、對話
  function overlay(ctx, a, x, hy, t) {
    const cower = a.state === 'cower';
    if (a.state === 'spot' || a.state === 'chase') mark(ctx, x, hy, '!', '#e23b3b');
    else if (a.state === 'sus' || a.state === 'search' || a.state === 'investigate') mark(ctx, x, hy, '?', '#f2b705');
    else if (a.meter > .05) { ctx.strokeStyle = '#f2b705'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x, hy, 11, -Math.PI / 2, -Math.PI / 2 + a.meter * Math.PI * 2); ctx.stroke(); }
    if (cower) { ctx.fillStyle = '#5a7dbb'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('ブルブル', x + Math.sin(t * 30) * 2, hy + 14); ctx.textAlign = 'left'; }
    if (a.say) bubble(ctx, x, hy - 22, a.say);
  }
  function mark(ctx, x, y, ch, col) {
    ctx.font = '900 30px sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.strokeText(ch, x, y + 10); ctx.fillStyle = col; ctx.fillText(ch, x, y + 10); ctx.textAlign = 'left';
  }
  function bubble(ctx, x, y, text) {
    ctx.font = 'bold 18px sans-serif'; const w = ctx.measureText(text).width + 18;
    OSHI.Art.rr(ctx, x - w / 2, y - 26, w, 30, 8); OSHI.Art.fillStroke(ctx, '#fff', INK, 2.5);
    ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.fillText(text, x, y - 5); ctx.textAlign = 'left';
  }

  return { make, zombie, human, hear, drawCone, drawAgent, bubble, dist, angDiff, rnd };
})();
