/* ==========================================================================
   creatures.js — 6 个视角小生物（Bunch of Humans 风纯色 blob + 手绘表情）
   返回 SVG 字符串，React 里用 dangerouslySetInnerHTML 注入。
   ========================================================================== */
const ink = '#1f1c19';

function blob(color, face, label) {
  return `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" aria-label="${label}">
    <path d="M40 4 C58 4 76 20 75 41 C74 60 58 76 40 75 C21 76 5 59 5 40 C5 20 22 5 40 4 Z" fill="${color}"/>
    ${face}
  </svg>`;
}

const creatures = {
  rational: blob('#1f5fa8', `
    <path d="M30 40 L37 39.4 M44 39.4 L51 40" stroke="${ink}" stroke-width="3" stroke-linecap="round" fill="none"/>
    <path d="M33 53 Q40 55 47 52.6" stroke="${ink}" stroke-width="3.2" stroke-linecap="round" fill="none"/>`, '理性视角'),
  emotional: blob('#f0a6c8', `
    <path d="M31 41 Q34 37.5 37 41 M44 40 Q47 36.5 50 40" stroke="${ink}" stroke-width="3" stroke-linecap="round" fill="none"/>
    <path d="M31 51 Q40 61 49 50" stroke="${ink}" stroke-width="3.4" stroke-linecap="round" fill="none"/>`, '感性视角'),
  rest: blob('#a4c736', `
    <path d="M30 42 Q34 46 38 42 M43 42 Q47 46 51 42" stroke="${ink}" stroke-width="3" stroke-linecap="round" fill="none"/>
    <path d="M37 53 Q40 55 43 52.6" stroke="${ink}" stroke-width="2.8" stroke-linecap="round" fill="none"/>`, '躺平视角'),
  adventure: blob('#f0b32a', `
    <circle cx="33" cy="40" r="2.7" fill="${ink}"/>
    <circle cx="48" cy="39" r="2.7" fill="${ink}"/>
    <ellipse cx="40" cy="53" rx="3" ry="3.7" fill="${ink}"/>`, '冒险视角'),
  elder: blob('#9d92cf', `
    <path d="M30 41 Q34 38.5 38 41 M43 40.5 Q47 38 51 40.5" stroke="${ink}" stroke-width="2.8" stroke-linecap="round" fill="none"/>
    <path d="M34 52 Q40 57 47 51.4" stroke="${ink}" stroke-width="3" stroke-linecap="round" fill="none"/>`, '长辈视角'),
  coin: blob('#e8551f', `
    <circle cx="33" cy="40" r="2.7" fill="${ink}"/>
    <circle cx="48" cy="40" r="2.7" fill="${ink}"/>
    <path d="M33 53 Q40 58 49 49" stroke="${ink}" stroke-width="3.2" stroke-linecap="round" fill="none"/>`, '硬币视角'),
};

export function svg(lensKey) {
  return creatures[lensKey] || creatures.coin;
}

const dormantFaces = [
  `<path d="M27 43 Q33 48 39 43 M44 43 Q50 48 56 43" stroke="${ink}" stroke-width="3.4" stroke-linecap="round" fill="none"/>`,
  `<path d="M28 41 Q33 45 38 41 M45 41 Q50 45 55 41" stroke="${ink}" stroke-width="3.4" stroke-linecap="round" fill="none"/>
   <path d="M37 54 L46 54" stroke="${ink}" stroke-width="3" stroke-linecap="round" fill="none"/>`,
  `<path d="M24 44 Q29 48 34 44" stroke="${ink}" stroke-width="3.4" stroke-linecap="round" fill="none"/>
   <circle cx="49" cy="43" r="2.6" fill="${ink}"/>`,
  `<path d="M31 48 Q40 54 50 47" stroke="${ink}" stroke-width="3.4" stroke-linecap="round" fill="none"/>`,
  `<path d="M22 42 Q26 46 30 42 M34 42 Q38 46 42 42" stroke="${ink}" stroke-width="3.2" stroke-linecap="round" fill="none"/>
   <path d="M26 52 Q31 55 37 51" stroke="${ink}" stroke-width="3" stroke-linecap="round" fill="none"/>`,
  `<path d="M28 44 L37 44 M44 44 L53 44" stroke="${ink}" stroke-width="3.2" stroke-linecap="round" fill="none"/>`,
];

export function dormant(i) {
  const face = dormantFaces[(i | 0) % dormantFaces.length];
  return `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${face}</svg>`;
}

export const lensColors = {
  rational: '#1f5fa8',
  emotional: '#f0a6c8',
  rest: '#a4c736',
  adventure: '#f0b32a',
  elder: '#9d92cf',
  coin: '#e8551f',
};

export function dormantBlob(lensKey, i) {
  const color = lensColors[lensKey] || lensColors.coin;
  const face = dormantFaces[(i | 0) % dormantFaces.length];
  return blob(color, face, '未拆开的情绪小球');
}
