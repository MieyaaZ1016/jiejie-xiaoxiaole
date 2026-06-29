/* ==========================================================================
   personality.js — 决策人格算法（纯函数：传入 state + streak，返回结果）
   ========================================================================== */
import { personas, badges } from './data';

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, Math.round(v))); }

function topTag(tagCount) {
  let max = 0, top = null;
  for (const [k, v] of Object.entries(tagCount)) {
    if (v > max) { max = v; top = k; }
  }
  return top;
}

function buildRecap(s) {
  if (s.history.length === 0) return '还没有足够的数据。去拆几个盲盒看看～';
  const top = topTag(s.tagCount);
  const recent = s.history[0];
  const lines = [];
  lines.push(`你最近拆了 ${s.history.length} 个小事。`);
  if (top) {
    const tip = {
      '吃喝': '看来最近"今天吃什么"上花的脑子最多。',
      '社交': '最近多在权衡和别人的关系，注意给自己留 idle 时间。',
      '消费': '在花钱这件事上你想得很认真。',
      '成长': '一直在想"对自己好的事"，记得留点纯玩耍。',
      '生活': '日常的微小选择最多，这其实是生活美学。',
    }[top] || '';
    if (tip) lines.push(tip);
  }
  if (recent) lines.push(`最近一个："${recent.q}" → ${recent.ans}。`);
  if (s.acceptRate > 0.6) lines.push('你拆完就执行的比例很高，少内耗。');
  else if (s.acceptRate > 0 && s.acceptRate < 0.3) lines.push('你更愿意多试几次再定，没问题，纠结也是一种思考。');
  return lines.join(' ');
}

export function compute(state, streak = 0) {
  const s = state || {};
  const history = s.history || [];

  const tagCount = {};
  history.forEach(h => { tagCount[h.tag] = (tagCount[h.tag] || 0) + 1; });
  const total = history.length || 1;
  const tagRatio = {};
  ['吃喝', '社交', '消费', '成长', '生活'].forEach(t => {
    tagRatio[t] = (tagCount[t] || 0) / total;
  });

  const acceptRate = s.opened > 0 ? Math.min(1, s.saved / s.opened) : 0;

  const summary = {
    saved: s.saved || 0,
    opened: s.opened || 0,
    acceptRate,
    tagRatio,
    tagCount,
    votes: s.votes || {},
    daysActive: (s.activeDays || []).length,
    streak,
    history,
  };

  const candidates = personas.slice().sort((a, b) => b.priority - a.priority);
  const persona = candidates.find(p => p.check(summary)) || candidates[candidates.length - 1];

  const traits = [
    ['少内耗指数', clamp(36 + summary.saved * 6, 36, 96)],
    ['小快乐合法化', clamp(56 + summary.opened * 4, 50, 92)],
    ['冷静消费力', clamp(50 + tagRatio['消费'] * 60 + (summary.saved > 0 ? 10 : 0), 50, 95)],
    ['轻量行动力', clamp(48 + summary.opened * 5, 48, 95)],
    ['关系温度', clamp(55 + tagRatio['社交'] * 60, 55, 95)],
  ];

  const earnedBadges = badges.filter(b => b.has(summary)).map(b => b.key);
  const recap = buildRecap(summary);

  return { persona, traits, badges: earnedBadges, recap, summary };
}
