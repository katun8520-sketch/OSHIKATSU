'use strict';
/* AudioManager：目前只有偶像歌曲（みーちゃん的歌）。之後的音效也放這裡。 */
OSHI.Audio = (() => {
  const song = new Audio('assets/audio/idol_song.mp3');
  song.preload = 'auto';
  let target = 1, wasPlaying = false;

  function playSong() {
    song.currentTime = 0; song.volume = target = 1;
    const p = song.play(); if (p && p.catch) p.catch(() => {});
  }
  function stopSong() { target = 0; }
  const playing = () => !song.paused && !song.ended;

  // 每一幀呼叫：依主角和播放器的距離調整音量（離開冷藏室走廊會慢慢變小）
  function update(dt, playerX, sourceX) {
    if (!playing()) return;
    const d = Math.abs(playerX - sourceX), byDist = Math.max(.12, Math.min(1, 1 - (d - 300) / 1500));
    const want = Math.min(target, byDist);
    song.volume = Math.max(0, Math.min(1, song.volume + (want - song.volume) * Math.min(1, dt * 3)));
    if (target === 0 && song.volume < .02) song.pause();
  }
  function pauseAll(p) {
    if (p) { wasPlaying = playing(); song.pause(); }
    else if (wasPlaying) { const r = song.play(); r && r.catch && r.catch(() => {}); }
  }

  return { playSong, stopSong, playing, update, pauseAll };
})();
