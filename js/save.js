'use strict';
/* SaveManager：localStorage 存檔，含版本號與舊版轉換 */
OSHI.Save = (() => {
  const KEY = 'oshikatsu_save';
  const VERSION = 1;
  const C = OSHI.CONFIG;

  function fresh() {
    return {
      version: VERSION,
      chapter: 1,               // 1–5
      scene: 'restaurant',
      stock: 0,                 // 當章冷凍櫃庫存
      cardboard: 0,             // 紙箱（升級材料，跨章累積）
      tape: 0,                  // 膠帶（升級材料，跨章累積）
      trips: 0,                 // 本章成功帶回的趟數 → 警戒等級
      taken: {},                // 已帶回的固定崗位目標 { '1': ['radio'] }，每章歸零
      affection: 0,             // 親密度總值（%）
      interactions: {},         // { '1': {greet:true, knock:false, song:true}, ... }
      armor: C.armor.startLevel,
      radioHeard: false,
      dishDone: false,
      restoreStage: 0,          // 0–5，已恢復部位數
      chaptersDone: [],
      seenComics: [],
      unlockedFantasy: [],
      ending: null,
      settings: {}
    };
  }

  function migrate(data) {
    // 之後改存檔格式時，在這裡依 data.version 逐版轉換
    const base = fresh();
    return { ...base, ...data, version: VERSION, settings: { ...base.settings, ...(data.settings || {}) } };
  }

  let data = fresh();
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) data = migrate(JSON.parse(raw));
    } catch (e) { data = fresh(); }
    return data;
  }
  function save() { data.savedAt = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* 無法存檔時照常遊玩 */ } }
  function reset() { data = fresh(); save(); return data; }

  // 手動存檔欄位（1～3）：自動存檔是「繼續玩」，手動欄位用「讀取進度」載入
  const SLOTS = 3, slotKey = n => KEY + '_slot' + n;
  const read = key => { try { const raw = localStorage.getItem(key); return raw ? migrate(JSON.parse(raw)) : null; } catch (e) { return null; } };
  const hasAuto = () => !!read(KEY);
  const peekAuto = () => read(KEY);
  const peekSlot = n => read(slotKey(n));
  function saveSlot(n) { save(); try { localStorage.setItem(slotKey(n), JSON.stringify(data)); return true; } catch (e) { return false; } }
  function loadSlot(n) { const d = read(slotKey(n)); if (!d) return null; data = d; save(); return data; }
  function deleteSlot(n) { try { localStorage.removeItem(slotKey(n)); } catch (e) {} }

  return { load, save, reset, hasAuto, peekAuto, peekSlot, saveSlot, loadSlot, deleteSlot, SLOTS, get data() { return data; } };
})();
