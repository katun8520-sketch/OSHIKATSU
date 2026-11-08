'use strict';
/* DialogueSystem / 選單面板 / 提示訊息 / HUD */
OSHI.UI = (() => {
  const $ = id => document.getElementById(id);

  /* ---------- 對白 ---------- */
  let dlg = null;
  function say(lines) {
    return new Promise(res => { dlg = { lines, i: 0, shown: 0, res }; $('dialog').hidden = false; showLine(); });
  }
  function showLine() {
    const l = dlg.lines[dlg.i];
    $('dialog').className = 'dialog ' + (l.kind || '');
    $('dlgName').textContent = l.who || '';
    $('dlgName').hidden = !l.who;
    dlg.shown = 0; $('dlgText').textContent = '';
  }
  function tickDialog(dt) {
    if (!dlg) return;
    const full = dlg.lines[dlg.i].text;
    if (dlg.shown < full.length) { dlg.shown = Math.min(full.length, dlg.shown + dt * 40); $('dlgText').textContent = full.slice(0, Math.floor(dlg.shown)); }
  }
  function advance() {
    if (!dlg) return false;
    const full = dlg.lines[dlg.i].text;
    if (dlg.shown < full.length) { dlg.shown = full.length; $('dlgText').textContent = full; return true; }
    dlg.i++;
    if (dlg.i >= dlg.lines.length) { const r = dlg.res; dlg = null; $('dialog').hidden = true; r(); }
    else showLine();
    return true;
  }

  /* ---------- 選單面板 ---------- */
  let pnl = null;
  function panel({ title, body = '', buttons = [], wide = false }) {
    return new Promise(res => {
      pnl = { res };
      const el = $('panel'), portrait = matchMedia('(orientation:portrait)').matches;
      el.classList.toggle('wide', wide); el.classList.toggle('portrait', portrait);
      // 手機直放時，選單與觀察窗改成全螢幕（放到遊戲畫面外，才不會被 16:9 畫面縮小）
      (portrait ? document.body : $('playerFrame')).appendChild(el);
      $('pnlTitle').textContent = title; $('pnlBody').innerHTML = body;
      const box = $('pnlButtons'); box.replaceChildren();
      buttons.forEach(b => {
        const el = document.createElement('button'); el.className = 'pbtn' + (b.primary ? ' primary' : '');
        el.innerHTML = `<b>${b.label}</b>${b.note ? `<small>${b.note}</small>` : ''}`; el.disabled = !!b.disabled;
        el.addEventListener('click', () => closePanel(b.id)); box.append(el);
      });
      $('panel').hidden = false;
      const first = box.querySelector('button:not(:disabled)'); first && first.focus();
    });
  }
  function closePanel(v = null) { if (!pnl) return; const r = pnl.res; pnl = null; $('panel').hidden = true; r(v); }
  $('pnlClose').addEventListener('click', () => closePanel(null));

  /* ---------- 提示 ---------- */
  let toastTimer = 0;
  function toast(text) { const t = $('toast'); t.textContent = text; t.hidden = false; t.classList.remove('pop'); void t.offsetWidth; t.classList.add('pop'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.hidden = true, 2400); }

  /* ---------- HUD ---------- */
  function hud(s, ch, zone) {
    $('hudChapter').textContent = `第${ch.id}章｜${ch.title}`;
    $('hudZone').textContent = zone;
    $('hudStock').textContent = `${s.stock}/${ch.need}`;
    $('hudAff').textContent = `${s.affection}%`;
    $('hudArmor').textContent = s.armor ? `LV${s.armor}` : '無';
    $('hudBox').textContent = s.cardboard; $('hudTape').textContent = s.tape;
    $('hudGoal').textContent = `恢復目標：${ch.restore}`;
  }

  return { say, advance, tickDialog, panel, closePanel, toast, hud, get dialogOpen() { return !!dlg; }, get panelOpen() { return !!pnl; } };
})();
