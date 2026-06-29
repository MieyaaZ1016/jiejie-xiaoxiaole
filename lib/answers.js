/* ==========================================================================
   answers.js — 客户端答案引擎
   - 本地引擎（意图匹配模板）作为离线兜底
   - AI 模式走同源 API routes（/api/answer 等），key 在服务端，浏览器拿不到
   ========================================================================== */
import { intents, lenses } from './data';

/* ---------------- 本地引擎 ---------------- */
function scoreIntent(intent, q) {
  if (intent.name === 'default') return 0;
  let score = 0;
  for (const kw of intent.keywords) {
    if (q.includes(kw)) score += 1 + kw.length * 0.2;
  }
  return score;
}

function pickIntent(q) {
  const scored = intents
    .map(i => ({ intent: i, score: scoreIntent(i, q) }))
    .sort((a, b) => b.score - a.score);
  const top = scored[0];
  if (top && top.score > 0) return top.intent;
  return intents.find(i => i.name === 'default');
}

function tagOf(intent, q) {
  if (intent.tag && intent.tag !== '默认') return intent.tag;
  if (q.includes('吃') || q.includes('奶茶') || q.includes('喝')) return '吃喝';
  if (q.includes('消息') || q.includes('TA') || q.includes('朋友')) return '社交';
  if (q.includes('买') || q.includes('购')) return '消费';
  if (q.includes('健身') || q.includes('学') || q.includes('运动')) return '成长';
  return '生活';
}

export function localGenerate(q, lens = 'coin') {
  const intent = pickIntent(q);
  let pool = intent.templates;
  if (lens && lens !== 'coin') {
    const filtered = intent.templates.filter(t => t[3] === lens);
    if (filtered.length) pool = filtered;
  }
  const t = pool[Math.floor(Math.random() * pool.length)];
  return { kw: t[0], plan: t[1], why: t[2], tag: tagOf(intent, q), source: 'local', lens: lens || 'coin' };
}

export function localPollOptions(q) {
  const intent = pickIntent(q);
  if (intent.name === 'default') return ['选稳妥 / 熟悉的那个', '选新鲜 / 想试的那个'];
  const tpls = intent.templates;
  const i1 = Math.floor(Math.random() * tpls.length);
  let i2 = Math.floor(Math.random() * tpls.length), guard = 0;
  while (i2 === i1 && guard++ < 12) i2 = Math.floor(Math.random() * tpls.length);
  return [tpls[i1][0], tpls[i2][0]];
}

export function needsWebSearch(q) {
  if (!q) return false;
  return /(餐厅|外卖|奶茶|咖啡|火锅|烧烤|早午餐|brunch|甜品|烤肉|寿司|拉面|串串|麻辣烫|早餐|午餐|晚饭|宵夜|附近|哪家|哪里|去哪|地点|散步|遛弯|约会|玩点啥|玩什么|店|展览|商场)/i.test(q);
}

/* ---------------- API 调用 ---------------- */
async function postJSON(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let msg = 'HTTP ' + res.status;
    try { const j = await res.json(); if (j.error) msg = j.error; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

/* 盲盒答案：aiEnabled 时走后端，失败回退本地 */
export async function generate(q, opts = {}) {
  if (opts.aiEnabled) {
    try {
      return await postJSON('/api/answer', {
        q,
        lens: opts.lens || 'coin',
        personaName: opts.personaName || '',
        prevQ: opts.context && opts.context.prevQ,
        prevKw: opts.context && opts.context.prevKw,
      });
    } catch (e) {
      if (opts.onAiError) opts.onAiError(e.message);
    }
  }
  const localQ = (opts.context && opts.context.prevQ) ? (opts.context.prevQ + ' ' + q) : q;
  return localGenerate(localQ, opts.lens);
}

/* 带真实搜索的答案（只有后端配了支持搜索的 provider 才有效） */
export async function generateWithSearch(q, opts = {}) {
  return await postJSON('/api/answer-search', {
    q, lens: opts.lens || 'coin', loc: opts.loc || null,
  });
}

/* 社区投票选项：aiEnabled 时走后端，失败回退本地 */
export async function generatePollOptions(q, aiEnabled) {
  if (aiEnabled) {
    try {
      const r = await postJSON('/api/poll-options', { q });
      if (Array.isArray(r.a) && r.a.length >= 2) {
        return [String(r.a[0]).slice(0, 24), String(r.a[1]).slice(0, 24)];
      }
    } catch {}
  }
  return localPollOptions(q);
}

export function lensByKey(key) {
  return lenses.find(l => l.key === key) || null;
}
