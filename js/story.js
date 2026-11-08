'use strict';
/* 劇情漫畫資料（OSHI.Comic 播放）。圖放 assets/comic/，改這裡就能換圖、改台詞、改秒數。 */
OSHI.STORY = {
  // 序章｜命運的相遇（新遊戲開始時播一次；台詞沿用序章試玩版）
  prologue: [
    { id: '序章 01', img: 'assets/comic/prologue-01.jpg', dur: 2.5, push: .03, desc: '殭屍災難中的商店街',
      sfx: [{ text: '嗚——　啊啊啊', x: 700, y: 150, size: 70, at: .3, rot: -.06 }], lines: [] },
    { id: '序章 02', img: 'assets/comic/prologue-02.jpg', dur: 2, push: .04, desc: '健太抱著寫真集逃跑', lines: [] },
    { id: '序章 03', img: 'assets/comic/prologue-03.jpg', dur: 2, fx: 'speed', focusY: .3, desc: '健太注意到什麼', lines: [{ who: '健太', text: '咦……？', at: .4 }] },
    { id: '序章 04', img: 'assets/comic/prologue-04.jpg', dur: 3, push: .07, desc: '熟悉的少女背影', lines: [{ who: '健太', text: '不會吧……是妳？', at: .6 }] },
    { id: '序章 05', img: 'assets/comic/prologue-05.jpg', dur: 3.2, flashAt: 0, shake: true, desc: '殭屍偶像回頭',
      lines: [{ burst: true, text: '是星野美月！', x: 1000, y: 585, size: 62, at: .25, rot: -.06 }] },
    { id: '序章 06', img: 'assets/comic/prologue-06.jpg', dur: 1.5, fx: 'speed', shake: true, desc: '她撲過來',
      sfx: [{ text: '砰！', x: 900, y: 560, size: 200, at: .1, rot: -.12 }], lines: [] },
    { id: '序章 06b', img: 'assets/comic/prologue-06b.jpg', dur: 1.3, push: .025, desc: '健太抱緊寫真閃開', lines: [] },
    { id: '序章 07', art: 'black', dur: 1.4, desc: '黑場', lines: [] },
    { id: '序章 08', img: 'assets/comic/prologue-08.jpg', dur: 2, desc: '她撲向路人', lines: [{ who: '路人', text: '等、等等……！', at: .3 }] },
    { id: '序章 09', img: 'assets/comic/prologue-09.jpg', dur: 2.5, push: .035, desc: '她正在進食', lines: [] },
    { id: '序章 09b', img: 'assets/comic/prologue-09b.jpg', dur: 3.2, push: .045, focusY: .35, desc: '臉頰一小塊恢復了', lines: [] },
    { id: '序章 10', img: 'assets/comic/prologue-10.jpg', dur: 2, push: .015, desc: '健太注意到變化', lines: [{ who: '健太', text: '難道說……', at: .3 }] },
    { id: '序章 11', img: 'assets/comic/prologue-11.jpg', dur: 3, fx: 'hearts', focusY: .3, desc: '錯誤的希望',
      lines: [{ who: '健太', text: '只要吃得夠營養……', at: .3, pink: true }, { who: '健太', text: '妳就能變回原本的樣子！？', at: 1.6, pink: true }] },
    { id: '序章 12', img: 'assets/comic/prologue-12.jpg', dur: 2.5, fx: 'hearts', focusY: .3, desc: '許下承諾',
      lines: [{ who: '健太', text: '我明白了！', at: .2, pink: true }, { who: '健太', text: '我一定會治好妳的！', at: 1.2, pink: true }] },
    { id: '序章 13', img: 'assets/comic/prologue-13.jpg', dur: 2.5, fx: 'hearts', focusY: .3, desc: '擁抱構圖', lines: [] },
    { id: '序章 14', art: 'title', dur: 2.4, push: 0, desc: '標題', lines: [] }
  ]
};
