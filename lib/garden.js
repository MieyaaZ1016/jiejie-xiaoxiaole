/* ==========================================================================
   garden.js — 小花园「花卉图鉴」收集系统
   每解一个小纠结，按概率掉落一种花。四个稀有度，可收集成图鉴。
   ========================================================================== */

export const RARITY = {
  common:    { key: 'common',    name: '普通', emoji: '🌱', color: '#7e9a5e', weight: 58 },
  rare:      { key: 'rare',      name: '稀有', emoji: '🔹', color: '#3b82f6', weight: 30 },
  epic:      { key: 'epic',      name: '史诗', emoji: '🔮', color: '#a855f7', weight: 10 },
  legendary: { key: 'legendary', name: '传说', emoji: '🌟', color: '#f5a623', weight: 2 },
};

const STEM = '<path d="M32 71 L32 38" stroke="#5f7d40" stroke-width="3" stroke-linecap="round" fill="none"/>';
const LEAF_L = '<path d="M32 56 C24 54 19 49 18 43 C26 43 31 48 32 55 Z" fill="#6e9150"/>';
const LEAF_R = '<path d="M32 50 C40 48 45 43 46 37 C38 37 33 42 32 49 Z" fill="#7ba35a"/>';

function bloom(inner, opts = {}) {
  const stem = opts.noStem ? '' : STEM;
  const leaves = opts.noLeaf ? '' : (LEAF_L + LEAF_R);
  return `<svg viewBox="0 0 64 72" xmlns="http://www.w3.org/2000/svg">${stem}${leaves}${inner}</svg>`;
}

/* —— 花瓣环：n 片绕中心 —— */
function petals(cx, cy, n, rx, ry, dist, fill, rot = 0) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const a = rot + (360 / n) * i;
    s += `<ellipse cx="${cx}" cy="${cy - dist}" rx="${rx}" ry="${ry}" fill="${fill}" transform="rotate(${a} ${cx} ${cy})"/>`;
  }
  return s;
}

/* ====================== 花卉库 ====================== */
export const SPECIES = [
  /* —— 普通 common —— */
  { id: 'daisy', name: '雏菊', rarity: 'common', tip: '最朴素的小确幸。',
    svg: bloom(petals(32, 24, 8, 4.2, 9, 9, '#fbfbf5') + '<circle cx="32" cy="24" r="6.5" fill="#f3c64a"/>') },
  { id: 'clover', name: '三叶草', rarity: 'common', tip: '攒着攒着就有好运。',
    svg: bloom('<path d="M32 26 C26 18 18 22 22 29 C16 30 18 38 26 35 C24 42 33 42 32 35 C40 41 45 33 39 31 C46 28 42 19 36 25 Z" fill="#5fa653"/><circle cx="32" cy="31" r="2" fill="#3f7a37"/>', { noLeaf: true }) },
  { id: 'morning', name: '牵牛花', rarity: 'common', tip: '清早第一个醒来。',
    svg: bloom('<path d="M20 24 Q32 6 44 24 Q32 32 20 24 Z" fill="#6f8fe0"/><path d="M24 23 Q32 12 40 23" fill="#9fb6ee"/><circle cx="32" cy="23" r="3" fill="#fff3c4"/>') },
  { id: 'dandelion', name: '蒲公英', rarity: 'common', tip: '一吹就飞，许个愿。',
    svg: bloom('<g stroke="#e7eef0" stroke-width="1.3">' + Array.from({length:14},(_,i)=>{const a=i/14*Math.PI*2;return `<line x1="32" y1="22" x2="${32+Math.cos(a)*13}" y2="${22+Math.sin(a)*13}"/>`}).join('') + '</g>' + Array.from({length:14},(_,i)=>{const a=i/14*Math.PI*2;return `<circle cx="${32+Math.cos(a)*13}" cy="${22+Math.sin(a)*13}" r="1.6" fill="#fff"/>`}).join('') + '<circle cx="32" cy="22" r="2.4" fill="#c9b079"/>') },
  { id: 'poppy', name: '虞美人', rarity: 'common', tip: '风里轻轻晃的红。',
    svg: bloom(petals(32, 24, 4, 8, 9, 6, '#e0533f', 45) + '<circle cx="32" cy="24" r="4" fill="#2b2622"/>') },
  { id: 'mossbun', name: '苔藓菇', rarity: 'common', tip: '潮乎乎，软绵绵。',
    svg: bloom('<ellipse cx="32" cy="30" rx="14" ry="9" fill="#8caf63"/><ellipse cx="32" cy="30" rx="14" ry="9" fill="#a6c47e" opacity="0.5"/><circle cx="26" cy="28" r="1.6" fill="#3f5a2c"/><circle cx="36" cy="31" r="1.4" fill="#3f5a2c"/><circle cx="31" cy="26" r="1.2" fill="#3f5a2c"/><rect x="28" y="36" width="8" height="9" rx="3" fill="#eee6d2"/>', { noLeaf: true }) },

  /* —— 稀有 rare —— */
  { id: 'tulip', name: '郁金香', rarity: 'rare', tip: '体面，但不端着。',
    svg: bloom('<path d="M22 28 Q22 12 32 12 Q42 12 42 28 Q38 32 32 30 Q26 32 22 28 Z" fill="#e76aa0"/><path d="M32 12 V30" stroke="#c8467e" stroke-width="1.5"/><path d="M26 16 Q24 24 27 30" stroke="#c8467e" stroke-width="1.2" fill="none"/>') },
  { id: 'sunflower', name: '向日葵', rarity: 'rare', tip: '永远朝着光那边。',
    svg: bloom(petals(32, 23, 12, 3.6, 8, 10, '#f5b21f') + '<circle cx="32" cy="23" r="8" fill="#6b4a2b"/><circle cx="32" cy="23" r="8" fill="#7d5732" opacity="0.5"/>') },
  { id: 'lavender', name: '薰衣草', rarity: 'rare', tip: '闻一下，整个人松下来。',
    svg: bloom('<g>' + Array.from({length:7},(_,i)=>`<ellipse cx="${32+(i%2?2:-2)}" cy="${14+i*3}" rx="3.2" ry="2.4" fill="#9b7fd4"/>`).join('') + '</g>', { noLeaf: true }) },
  { id: 'bluebell', name: '风铃草', rarity: 'rare', tip: '风一过，叮叮当当。',
    svg: bloom('<path d="M22 20 Q22 30 26 32 Q22 33 24 26 Z" fill="#6f8fe0"/><path d="M32 18 Q32 30 36 33 Q31 34 33 25 Z" fill="#5f81da"/><path d="M42 22 Q42 31 45 33 Q41 34 43 27 Z" fill="#7e9be6"/><path d="M22 20 Q30 12 42 22" stroke="#5f7d40" stroke-width="2" fill="none"/>', { noLeaf: true }) },

  /* —— 史诗 epic —— */
  { id: 'rose', name: '玫瑰', rarity: 'epic', tip: '有刺，但值得。',
    svg: bloom(petals(32, 24, 6, 6.5, 8, 6, '#d23b5e', 0) + petals(32, 24, 5, 4, 5, 3.5, '#e9637f', 36) + '<circle cx="32" cy="24" r="3.4" fill="#a82847"/>') },
  { id: 'lotus', name: '莲花', rarity: 'epic', tip: '出淤泥，不慌。',
    svg: bloom(petals(32, 26, 7, 4.5, 11, 9, '#f4a6c4') + petals(32, 26, 5, 3.6, 8, 5, '#fbd0e0', 30) + '<circle cx="32" cy="26" r="3.6" fill="#f3c64a"/><ellipse cx="32" cy="38" rx="17" ry="4" fill="#5fa653" opacity="0.6"/>', { noStem: true, noLeaf: true }) },
  { id: 'cactusflower', name: '仙人掌花', rarity: 'epic', tip: '熬得住旱，开得出花。',
    svg: bloom('<rect x="26" y="30" width="12" height="26" rx="6" fill="#4f8f5a"/><rect x="16" y="38" width="9" height="6" rx="3" fill="#5aa066"/><rect x="39" y="34" width="9" height="6" rx="3" fill="#5aa066"/>' + petals(32, 26, 6, 3.4, 6, 5, '#ff7aa8') + '<circle cx="32" cy="26" r="2.6" fill="#ffd84a"/>', { noStem: true, noLeaf: true }) },

  /* —— 传说 legendary —— */
  { id: 'spiderlily', name: '彼岸花', rarity: 'legendary', tip: '只在该出现的时候出现。',
    svg: bloom('<g stroke="#e23a3a" stroke-width="2.2" fill="none" stroke-linecap="round">' + Array.from({length:6},(_,i)=>{const a=i/6*Math.PI*2;const ex=32+Math.cos(a)*15;const ey=22+Math.sin(a)*13;return `<path d="M32 22 Q${32+Math.cos(a)*9} ${22+Math.sin(a)*9-6} ${ex} ${ey} q4 -4 1 -8"/>`}).join('') + '</g>' + '<g stroke="#f06a6a" stroke-width="1.2">' + Array.from({length:6},(_,i)=>{const a=i/6*Math.PI*2;return `<line x1="32" y1="22" x2="${32+Math.cos(a)*7}" y2="${22+Math.sin(a)*7-3}"/>`}).join('') + '</g><circle cx="32" cy="22" r="2.4" fill="#b81f1f"/>') },
  { id: 'starbloom', name: '星之花', rarity: 'legendary', tip: '据说会在愿望成真那天开。',
    svg: bloom('<g filter="url(#g)"></g><path d="M32 10 L36 21 L47 22 L38 29 L41 40 L32 33 L23 40 L26 29 L17 22 L28 21 Z" fill="#ffd84a"/><path d="M32 16 L34 22 L40 23 L35 27 L37 33 L32 29 L27 33 L29 27 L24 23 L30 22 Z" fill="#fff3b0"/><circle cx="32" cy="24" r="2.6" fill="#fff"/><circle cx="20" cy="14" r="1.6" fill="#ffe87a"/><circle cx="46" cy="16" r="1.4" fill="#ffe87a"/><circle cx="44" cy="36" r="1.5" fill="#ffe87a"/>') },
];

export const speciesById = Object.fromEntries(SPECIES.map(s => [s.id, s]));
export const totalSpecies = SPECIES.length;

/* 加权抽卡：先按稀有度抽档，再档内等概率 */
export function rollSpecies(rand = Math.random) {
  const tiers = Object.values(RARITY);
  const total = tiers.reduce((a, t) => a + t.weight, 0);
  let r = rand() * total;
  let tier = tiers[0];
  for (const t of tiers) { if (r < t.weight) { tier = t; break; } r -= t.weight; }
  const pool = SPECIES.filter(s => s.rarity === tier.key);
  return pool[Math.floor(rand() * pool.length)];
}

export function rarityOf(id) {
  const sp = speciesById[id];
  return sp ? RARITY[sp.rarity] : RARITY.common;
}
