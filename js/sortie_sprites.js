'use strict';
/* 出擊關卡的正式角色素材（斜 45 度俯視，GPT 生成後切圖）。
   影格資料由切圖程式產生：w/h 尺寸、ax/by 腳底錨點。圖片載入失敗時退回程式畫的佔位角色。
   所有圖都是「面向右」，面向左時左右翻轉。 */
OSHI.SSprites = (() => {
  const F = {"chef_d0":{"w":204,"h":360,"ax":100.7,"by":355.7},"chef_d1":{"w":205,"h":348,"ax":102.8,"by":344.4},"chef_d2":{"w":205,"h":358,"ax":101.2,"by":354.6},"chef_d3":{"w":203,"h":351,"ax":101.3,"by":347.7},"chef_u0":{"w":241,"h":360,"ax":131.7,"by":354.3},"chef_u1":{"w":236,"h":358,"ax":128.2,"by":352.1},"chef_u2":{"w":240,"h":360,"ax":131.1,"by":354.3},"chef_u3":{"w":237,"h":357,"ax":128.3,"by":352.1},"chef_s0":{"w":220,"h":357,"ax":103.1,"by":353.8},"chef_s1":{"w":186,"h":359,"ax":80.7,"by":355.8},"chef_s2":{"w":224,"h":357,"ax":100.6,"by":353.8},"chef_s3":{"w":184,"h":360,"ax":78.8,"by":356.4},"z0_walk":{"w":213,"h":360,"ax":137.7,"by":355.1},"z1_walk":{"w":215,"h":353,"ax":140.1,"by":347.5},"z2_walk":{"w":203,"h":343,"ax":131.7,"by":337.1},"z0_eat":{"w":245,"h":190,"ax":122.7,"by":185.6},"z1_eat":{"w":240,"h":189,"ax":120.2,"by":183.5},"z2_eat":{"w":241,"h":196,"ax":120.6,"by":190.4},"z0_down":{"w":288,"h":150,"ax":143.9,"by":145.3},"z1_down":{"w":280,"h":141,"ax":140.0,"by":136.2},"z2_down":{"w":281,"h":147,"ax":140.7,"by":141.8},"f0_stand":{"w":244,"h":360,"ax":88.4,"by":355.0},"f1_stand":{"w":265,"h":356,"ax":89.6,"by":350.8},"f2_stand":{"w":263,"h":353,"ax":89.2,"by":348.0},"r0_stand":{"w":147,"h":348,"ax":56.5,"by":343.0},"r1_stand":{"w":164,"h":349,"ax":61.7,"by":344.4},"r2_stand":{"w":147,"h":341,"ax":55.4,"by":335.9},"r0_run":{"w":229,"h":324,"ax":139.8,"by":318.1},"r0_cower":{"w":185,"h":259,"ax":96.7,"by":253.7},"r0_ko":{"w":355,"h":168,"ax":177.7,"by":162.2},"f0_attack":{"w":285,"h":360,"ax":183.7,"by":354.6},"f0_look":{"w":199,"h":356,"ax":93.1,"by":350.7},"f0_ko":{"w":391,"h":192,"ax":195.5,"by":187.0},"r1_run":{"w":216,"h":308,"ax":134.4,"by":302.1},"r1_cower":{"w":202,"h":249,"ax":96.3,"by":243.6},"r1_ko":{"w":340,"h":184,"ax":170.0,"by":178.6},"f1_attack":{"w":282,"h":360,"ax":152.1,"by":355.0},"f1_look":{"w":243,"h":349,"ax":129.6,"by":344.3},"f1_ko":{"w":372,"h":214,"ax":186.1,"by":209.3},"r2_run":{"w":206,"h":310,"ax":115.0,"by":304.9},"r2_cower":{"w":184,"h":269,"ax":78.3,"by":263.4},"r2_ko":{"w":362,"h":166,"ax":180.8,"by":160.8},"f2_attack":{"w":343,"h":360,"ax":116.6,"by":354.7},"f2_look":{"w":237,"h":354,"ax":118.8,"by":348.7},"f2_ko":{"w":373,"h":251,"ax":186.4,"by":246.0},"z0_w0":{"w":215,"h":358,"ax":133.8,"by":351.9},"z0_w1":{"w":184,"h":358,"ax":106.9,"by":351.9},"z0_w2":{"w":223,"h":353,"ax":146.8,"by":346.4},"z0_w3":{"w":187,"h":355,"ax":112.2,"by":349.1},"z1_w0":{"w":217,"h":348,"ax":136.8,"by":341.0},"z1_w1":{"w":177,"h":351,"ax":103.0,"by":344.6},"z1_w2":{"w":223,"h":347,"ax":142.0,"by":341.0},"z1_w3":{"w":176,"h":348,"ax":102.9,"by":341.9},"z2_w0":{"w":229,"h":358,"ax":148.4,"by":351.9},"z2_w1":{"w":192,"h":360,"ax":110.0,"by":353.7},"z2_w2":{"w":233,"h":360,"ax":154.2,"by":352.8},"z2_w3":{"w":195,"h":357,"ax":115.4,"by":351.0},"f0_w0":{"w":206,"h":347,"ax":96.1,"by":340.6},"f0_w1":{"w":194,"h":343,"ax":88.4,"by":336.9},"f0_w2":{"w":216,"h":334,"ax":107.9,"by":327.6},"f0_w3":{"w":187,"h":341,"ax":79.8,"by":333.2},"f1_w0":{"w":243,"h":338,"ax":121.3,"by":331.3},"f1_w1":{"w":230,"h":345,"ax":110.3,"by":337.8},"f1_w2":{"w":248,"h":334,"ax":128.9,"by":326.7},"f1_w3":{"w":221,"h":343,"ax":101.7,"by":336.9},"f2_w0":{"w":237,"h":358,"ax":108.8,"by":350.7},"f2_w1":{"w":230,"h":359,"ax":101.5,"by":352.6},"f2_w2":{"w":248,"h":349,"ax":120.9,"by":342.4},"f2_w3":{"w":224,"h":360,"ax":96.8,"by":352.6},"r0_w0":{"w":150,"h":342,"ax":85.7,"by":336.2},"r0_w1":{"w":130,"h":345,"ax":68.1,"by":338.6},"r0_w2":{"w":167,"h":341,"ax":97.5,"by":335.4},"r0_w3":{"w":134,"h":345,"ax":72.6,"by":339.4},"r1_w0":{"w":164,"h":356,"ax":89.5,"by":350.5},"r1_w1":{"w":146,"h":360,"ax":70.7,"by":353.7},"r1_w2":{"w":178,"h":355,"ax":101.4,"by":349.7},"r1_w3":{"w":151,"h":358,"ax":77.1,"by":352.9},"r2_w0":{"w":158,"h":350,"ax":87.4,"by":344.9},"r2_w1":{"w":142,"h":350,"ax":71.4,"by":344.1},"r2_w2":{"w":169,"h":347,"ax":95.7,"by":341.0},"r2_w3":{"w":142,"h":349,"ax":71.6,"by":342.6},"r0_run0":{"w":245,"h":341,"ax":149.8,"by":332.8},"r0_run1":{"w":186,"h":344,"ax":115.5,"by":335.7},"r0_run2":{"w":244,"h":339,"ax":143.7,"by":331.9},"r0_run3":{"w":207,"h":310,"ax":118.5,"by":301.8},"r1_run0":{"w":242,"h":354,"ax":134.2,"by":347.4},"r1_run1":{"w":191,"h":358,"ax":110.6,"by":351.3},"r1_run2":{"w":250,"h":348,"ax":147.3,"by":341.6},"r1_run3":{"w":202,"h":298,"ax":112.6,"by":291.1},"r2_run0":{"w":232,"h":357,"ax":133.2,"by":350.3},"r2_run1":{"w":175,"h":360,"ax":95.2,"by":353.2},"r2_run2":{"w":246,"h":347,"ax":145.4,"by":340.6},"r2_run3":{"w":213,"h":311,"ax":111.3,"by":303.7},"chef_a1_d0":{"w":198,"h":330,"ax":100.3,"by":323.0},"chef_a1_d1":{"w":197,"h":330,"ax":96.4,"by":322.0},"chef_a1_d2":{"w":194,"h":331,"ax":95.0,"by":324.0},"chef_a1_d3":{"w":197,"h":329,"ax":96.4,"by":322.0},"chef_a1_u0":{"w":208,"h":315,"ax":110.9,"by":308.0},"chef_a1_u1":{"w":207,"h":313,"ax":110.0,"by":306.0},"chef_a1_u2":{"w":213,"h":314,"ax":115.1,"by":306.0},"chef_a1_u3":{"w":207,"h":314,"ax":108.8,"by":307.0},"chef_a1_s0":{"w":210,"h":332,"ax":97.7,"by":325.0},"chef_a1_s1":{"w":176,"h":333,"ax":75.7,"by":326.0},"chef_a1_s2":{"w":209,"h":332,"ax":90.4,"by":325.0},"chef_a1_s3":{"w":176,"h":333,"ax":74.0,"by":326.0},"chef_a2_d1":{"w":207,"h":326,"ax":105.8,"by":319.0},"chef_a2_u0":{"w":224,"h":337,"ax":117.0,"by":330.0},"chef_a2_u2":{"w":224,"h":336,"ax":115.9,"by":329.0},"chef_a2_u3":{"w":224,"h":331,"ax":114.9,"by":324.0},"chef_a2_s1":{"w":184,"h":343,"ax":87.2,"by":342.0},"chef_a3_d0":{"w":237,"h":351,"ax":115.7,"by":344.5},"chef_a3_d1":{"w":234,"h":345,"ax":116.0,"by":339.3},"chef_a3_d2":{"w":232,"h":351,"ax":115.2,"by":344.5},"chef_a3_d3":{"w":233,"h":345,"ax":115.4,"by":339.3},"chef_a3_u0":{"w":218,"h":343,"ax":107.3,"by":336.7},"chef_a3_u1":{"w":217,"h":329,"ax":107.1,"by":322.9},"chef_a3_u2":{"w":223,"h":342,"ax":112.7,"by":335.8},"chef_a3_u3":{"w":224,"h":325,"ax":114.0,"by":319.4},"chef_a3_s0":{"w":241,"h":358,"ax":119.8,"by":352.2},"chef_a3_s1":{"w":233,"h":360,"ax":120.4,"by":353.1},"chef_a3_s2":{"w":249,"h":360,"ax":120.1,"by":354.0},"chef_a3_s3":{"w":226,"h":358,"ax":120.5,"by":352.2},"chef_a2_d0":{"w":214,"h":341,"ax":108.6,"by":334.0},"chef_a2_d2":{"w":207,"h":338,"ax":104.3,"by":331.0},"chef_a2_d3":{"w":216,"h":335,"ax":106.8,"by":328.0},"chef_a2_u1":{"w":220,"h":335,"ax":112.4,"by":328.0},"chef_a2_s0":{"w":210,"h":342,"ax":96.7,"by":341.0},"chef_a2_s2":{"w":218,"h":342,"ax":99.3,"by":341.0},"chef_a2_s3":{"w":193,"h":342,"ax":93.3,"by":341.0}};
  const ENV = {"ext_resto":{"w":532,"h":776},"ext_store":{"w":566,"h":773},"shop_ramen":{"w":443,"h":642},"shop_drug":{"w":464,"h":671},"shop_izakaya":{"w":474,"h":667},"arc_pillar":{"w":169,"h":565},"arc_lantern":{"w":578,"h":254},"arc_roof":{"w":600,"h":209},"al_wall":{"w":322,"h":207},"al_rack":{"w":343,"h":333},"al_vend":{"w":234,"h":424},"al_bin":{"w":169,"h":256},"al_bike":{"w":377,"h":232},"rx_post":{"w":217,"h":583},"rx_bar":{"w":556,"h":253},"rx_rail":{"w":565,"h":224},"pk_car1":{"w":457,"h":387},"pk_car2":{"w":465,"h":387},"pk_bike":{"w":353,"h":240},"pk_meter":{"w":188,"h":425},"jk_box":{"w":329,"h":326},"jk_bags":{"w":352,"h":328},"jk_cone":{"w":237,"h":339},"jk_stones":{"w":263,"h":191},"jk_poster":{"w":265,"h":400},"st_shelf":{"w":800,"h":521},"st_endcap":{"w":334,"h":506},"st_counter":{"w":485,"h":548},"st_door":{"w":386,"h":600},"st_mag":{"w":391,"h":549},"st_fridge":{"w":697,"h":800},"st_comp":{"w":509,"h":444},"sr_boxes":{"w":347,"h":475},"sr_rack":{"w":355,"h":543},"sr_recycle":{"w":440,"h":535},"sr_door":{"w":295,"h":589},"br_table":{"w":700,"h":538},"br_locker":{"w":386,"h":700}};   // 場景物件（assets/sortie_env）
  const UNIT = 360;              // 素材中「站著的人」大約的高度
  const H = { chef: 112, npc: 106 };  // 遊戲畫面上的身高（像素）
  const img = {};
  for (const k of Object.keys(F)) { const i = new Image(); i.onload = () => { img[k] = i; }; i.src = 'assets/sortie/' + k + '.png'; }
  for (const k of Object.keys(ENV)) { const i = new Image(); i.onload = () => { img['env:' + k] = i; }; i.src = 'assets/sortie_env/' + k + '.png'; }
  for (const k of ['g_side', 'g_road', 'g_alley', 'g_tile', 'g_conc']) { const i = new Image(); i.onload = () => { img['env:' + k] = i; }; i.src = 'assets/sortie_env/' + k + '.jpg'; }
  const has = k => !!img[k];
  const env = k => img['env:' + k] || null;
  // 純黑剪影（死亡動畫用），做一次就快取
  const silCache = {};
  function sil(key, isEnv) {
    const ck = (isEnv ? 'e:' : '') + key; if (silCache[ck]) return silCache[ck];
    const im = isEnv ? env(key) : img[key]; if (!im) return null;
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const x = c.getContext('2d'); x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height);
    return (silCache[ck] = c);
  }

  // (x,y) = 腳底；flip = 面向左
  function draw(ctx, key, x, y, height, flip, alpha = 1) {
    const im = img[key]; if (!im) return false;
    const m = F[key], k = height / UNIT;
    ctx.save(); ctx.translate(x, y); if (flip) ctx.scale(-1, 1); if (alpha < 1) ctx.globalAlpha *= alpha;
    ctx.drawImage(im, -m.ax * k, -m.by * k, m.w * k, m.h * k);
    ctx.restore(); return true;
  }
  const top = (key, height) => F[key] ? F[key].by * height / UNIT : height;

  /* 胖廚師：依面向挑下／上／側面，走路 4 格 */
  const chefBase = armor => armor > 0 && has('chef_a' + armor + '_d0') ? 'chef_a' + armor + '_' : 'chef_';   // 紙板鋼彈等級
  function chef(ctx, P, armor = 0) {
    const c = Math.cos(P.face), s = Math.sin(P.face), vert = Math.abs(s) > Math.abs(c) * 1.1;
    const dir = vert ? (s > 0 ? 'd' : 'u') : 's';
    const f = P.moving ? Math.floor(P.phase) % 4 : (dir === 's' ? 1 : 0);
    const key = chefBase(armor) + dir + f;
    if (!has(key)) return false;
    shadow(ctx, P.x, P.y, 26);
    return draw(ctx, key, P.x, P.y, H.chef, dir === 's' && P.dirX < 0);
  }

  /* 殭屍與人類 */
  // 走路時用 4 格走路圖（_w0–_w3）
  const walkKey = (p, a) => a.moving && has(p + '_w0') ? p + '_w' + (Math.floor(a.phase * 1.2) % 4) : null;
  function npcKey(a) {
    const v = (a.v || 0) % 3;
    if (a.type === 'zombie') return a.state === 'down' ? 'z' + v + '_down' : a.state === 'eat' ? 'z' + v + '_eat' : walkKey('z' + v, a) || 'z' + v + '_walk';
    const p = (a.kind === 'fight' ? 'f' : 'r') + v;
    if (a.ko) return p + '_ko';
    if (a.state === 'cower') return p + '_cower';
    if (a.state === 'flee') return has(p + '_run0') ? p + '_run' + (Math.floor(a.phase * .9) % 4) : p + '_run';
    if (a.kind === 'fight' && (a.state === 'chase' || a.atk > 0)) return p + '_attack';
    if (a.kind === 'fight' && (a.state === 'spot' || a.state === 'sus' || a.state === 'search' || a.state === 'look')) return p + '_look';
    return walkKey(p, a) || p + '_stand';
  }
  function npc(ctx, a, t) {
    const key = npcKey(a); if (!has(key)) return null;
    const lying = /_(ko|down|eat)$/.test(key);
    // 有走路影格就逐格播放；沒有的姿勢（例如逃跑時的跑步圖）用踏步彈跳
    const framed = /_(w|run)\d$/.test(key), walk = a.moving && !lying && !framed, ph = a.phase * 1.4;
    const bob = walk ? Math.abs(Math.sin(ph)) * 9 : framed ? Math.abs(Math.sin(a.phase * 1.2 * Math.PI)) * 2 : 0;
    const sway = walk ? Math.sin(ph) * .12 : 0;
    shadow(ctx, a.x, a.y, lying ? 40 : 24);
    ctx.save(); ctx.translate(a.x, a.y - bob); ctx.rotate(sway);
    if (walk) { const sq = 1 - (1 - Math.abs(Math.sin(ph))) * .06; ctx.scale(2 - sq, sq); }  // 腳踩地時稍微壓扁
    if (a.hurtT > 0) ctx.globalAlpha = .6;
    draw(ctx, key, 0, 0, H.npc, Math.cos(a.face) < 0);
    ctx.restore();
    return { head: a.y - bob - top(key, H.npc) - 8 };
  }
  function shadow(ctx, x, y, r) { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x, y, r, r * .32, 0, 0, 7); ctx.fill(); }

  return { chef, npc, has, H, env, sil, frame: k => F[k], envInfo: k => ENV[k], chefBase, UNIT };
})();
