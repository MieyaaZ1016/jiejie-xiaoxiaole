/* ==========================================================================
   llm.js — 服务端 LLM 代理（从 Cloudflare Worker 迁移）
   - 默认 Gemini（免费），可切 Anthropic
   - 只在 server 端运行（API routes），key 走 process.env，永不下发给浏览器
   ========================================================================== */
import 'server-only';

const TAGS = ['吃喝', '社交', '消费', '成长', '生活'];

function answerSystem(lens, personaName) {
  const lensTips = {
    rational:  '理性视角：用得失、机会成本来想，给出冷静直接的判断。',
    emotional: '情绪视角：先承认感受，再给一个温柔的小动作。',
    rest:      '躺平视角：不行动也是一种行动，鼓励减法，把事做到最小。',
    adventure: '冒险视角：选那个让你今天感觉更鲜的选项。',
    elder:     '长辈视角：过来人口吻，稳妥接地气。',
    coin:      '硬币视角：随便选一面，重点是看用户心里有没有冒出反对意见。',
  };
  const lensTip = lensTips[lens] || '';
  return (
    '你是「纠结消消乐」的答案引擎。用户写下一件小纠结，你给一颗"情绪小球"的小答案。\n' +
    '风格：轻松、温柔、不说教、有一点点俏皮。' +
    (personaName ? `用户的决策人格倾向：${personaName}。` : '') + '\n' +
    (lensTip ? `本次视角：${lensTip}\n` : '') +
    '严格输出 JSON，不要 markdown 不要其他字：\n' +
    '{"kw":"3-6 字关键词","plan":"15-30 字一句具体小建议","why":"10-25 字温柔理由",' +
    '"tag":"吃喝|社交|消费|成长|生活 之一"}'
  );
}

function searchSystem(loc) {
  const locLine = loc
    ? `用户当前位置：纬度 ${(loc.lat || 0).toFixed(4)}, 经度 ${(loc.lng || 0).toFixed(4)}（${[loc.city, loc.region, loc.country].filter(Boolean).join(' ')}）。`
    : '没有用户位置（搜索结果尽量泛化）。';
  return (
    '你是「纠结消消乐」的答案引擎。用户的这个小纠结需要真实的店/地点/事实信息。\n' +
    locLine + '\n' +
    '请先用搜索工具搜，拿到 3-5 个用户附近真实存在、贴合问题的店或地点，' +
    '然后写一个轻松短小的小建议。\n' +
    '最终输出严格 JSON，不要 markdown：\n' +
    '{"kw":"3-6 字关键词","plan":"15-30 字小建议","why":"10-25 字理由","tag":"吃喝|社交|消费|成长|生活 之一",' +
    '"places":[{"name":"真实店名","area":"街区/距离","why":"为啥推荐 5-15 字"}],' +
    '"sources":[{"title":"标题","url":"https://..."}]}'
  );
}

function pollSystem() {
  return (
    '用户在「纠结消消乐」社区发起一个二选一小纠结。' +
    '请针对它给出两个简短、对立、各有道理的选项，' +
    '每个 4-14 字，口吻轻松接地气，不要"选A/选B"前缀。' +
    '严格输出 JSON：{"a":["选项一","选项二"]}'
  );
}

function pickJson(text) {
  if (!text) throw new Error('LLM 返回空');
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('LLM 没返回 JSON');
  return JSON.parse(m[0]);
}

/* ---------------- Gemini ---------------- */
const GEMINI = {
  async call({ model, system, user, useSearch }) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw { status: 500, detail: '后端没配 GEMINI_API_KEY' };
    const m = model || process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`;
    const body = {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: {
        temperature: 0.75,
        maxOutputTokens: useSearch ? 2048 : 320,
        ...(useSearch ? {} : { responseMimeType: 'application/json' }),
      },
      ...(useSearch ? { tools: [{ google_search: {} }] } : {}),
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw { status: res.status, detail: 'Gemini: ' + text.slice(0, 400) };
    }
    return res.json();
  },
  extractText(data) {
    const cand = data.candidates && data.candidates[0];
    if (!cand) return '';
    const parts = (cand.content && cand.content.parts) || [];
    return parts.map(p => p.text || '').join('');
  },
  extractSources(data) {
    const cand = data.candidates && data.candidates[0];
    if (!cand || !cand.groundingMetadata) return [];
    const chunks = cand.groundingMetadata.groundingChunks || [];
    return chunks.map(c => (c.web ? { title: c.web.title || c.web.uri, url: c.web.uri } : null)).filter(Boolean);
  },
  async answer({ q, lens, personaName, prevQ, prevKw }) {
    const userContent = prevQ
      ? `我之前的纠结是："${prevQ}"，你给的答案是："${prevKw || ''}"。现在我想追问：${q}`
      : q;
    const data = await GEMINI.call({ system: answerSystem(lens, personaName), user: userContent, useSearch: false });
    const parsed = pickJson(GEMINI.extractText(data));
    return normAnswer(parsed, lens, 'ai');
  },
  async answerSearch({ q, lens, loc }) {
    const data = await GEMINI.call({
      model: process.env.GEMINI_SEARCH_MODEL || process.env.GEMINI_MODEL || 'gemini-2.0-flash',
      system: searchSystem(loc), user: q, useSearch: true,
    });
    const text = GEMINI.extractText(data);
    const fallback = GEMINI.extractSources(data);
    return normSearch(text, fallback, lens);
  },
  async pollOptions({ q }) {
    const data = await GEMINI.call({ system: pollSystem(), user: q, useSearch: false });
    return normPoll(pickJson(GEMINI.extractText(data)));
  },
};

/* ---------------- Anthropic ---------------- */
const ANTHROPIC = {
  async call(body) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw { status: 500, detail: '后端没配 ANTHROPIC_API_KEY' };
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw { status: res.status, detail: 'Anthropic: ' + text.slice(0, 400) };
    }
    return res.json();
  },
  extractText(data) {
    let t = '';
    for (const b of (data.content || [])) if (b.type === 'text') t += b.text;
    return t;
  },
  extractSources(data) {
    const out = [];
    for (const b of (data.content || [])) {
      if (b.type === 'web_search_tool_result') {
        for (const r of (b.content || [])) {
          if (r.type === 'web_search_result' && r.url) out.push({ title: r.title || r.url, url: r.url });
        }
      }
    }
    return out;
  },
  async answer({ q, lens, personaName, prevQ, prevKw }) {
    const userContent = prevQ
      ? `我之前的纠结是："${prevQ}"，你给的答案是："${prevKw || ''}"。现在我想追问：${q}`
      : q;
    const data = await ANTHROPIC.call({
      model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5',
      max_tokens: 280, system: answerSystem(lens, personaName),
      messages: [{ role: 'user', content: userContent }],
    });
    return normAnswer(pickJson(ANTHROPIC.extractText(data)), lens, 'ai');
  },
  async answerSearch({ q, lens, loc }) {
    const tools = [{
      type: 'web_search_20260209', name: 'web_search', max_uses: 2,
      ...(loc && (loc.city || loc.country) ? {
        user_location: {
          type: 'approximate',
          ...(loc.city ? { city: loc.city } : {}),
          ...(loc.region ? { region: loc.region } : {}),
          ...(loc.country ? { country: loc.country } : {}),
          ...(loc.timezone ? { timezone: loc.timezone } : {}),
        },
      } : {}),
    }];
    const data = await ANTHROPIC.call({
      model: process.env.ANTHROPIC_SEARCH_MODEL || 'claude-sonnet-4-6',
      max_tokens: 2048, system: searchSystem(loc), tools,
      messages: [{ role: 'user', content: q }],
    });
    return normSearch(ANTHROPIC.extractText(data), ANTHROPIC.extractSources(data), lens);
  },
  async pollOptions({ q }) {
    const data = await ANTHROPIC.call({
      model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5',
      max_tokens: 160, system: pollSystem(), messages: [{ role: 'user', content: q }],
    });
    return normPoll(pickJson(ANTHROPIC.extractText(data)));
  },
};

/* ---------------- 归一化 ---------------- */
function normAnswer(parsed, lens, source) {
  return {
    kw: parsed.kw || '轻松一点',
    plan: parsed.plan || '先做最小的一步。',
    why: parsed.why || '小事不用想太重。',
    tag: TAGS.includes(parsed.tag) ? parsed.tag : '生活',
    source, lens: lens || 'coin',
  };
}
function normSearch(text, fallback, lens) {
  let parsed = null;
  try { parsed = pickJson(text); } catch {}
  if (!parsed) {
    return {
      kw: '看看这些', plan: (text || '').slice(0, 80) || '挑一家就去。', why: '挑近的去。',
      tag: '吃喝', places: [], sources: fallback.slice(0, 5), source: 'ai-web', lens: lens || 'coin',
    };
  }
  return {
    kw: parsed.kw || '试一家',
    plan: parsed.plan || '挑最近的那家，今天就去。',
    why: parsed.why || '决定 > 完美。',
    tag: TAGS.includes(parsed.tag) ? parsed.tag : '吃喝',
    places: Array.isArray(parsed.places) ? parsed.places.slice(0, 5) : [],
    sources: Array.isArray(parsed.sources) && parsed.sources.length ? parsed.sources.slice(0, 5) : fallback.slice(0, 5),
    source: 'ai-web', lens: lens || 'coin',
  };
}
function normPoll(parsed) {
  if (!Array.isArray(parsed.a) || parsed.a.length < 2) throw new Error('LLM 没返回有效选项');
  return { a: [String(parsed.a[0]).slice(0, 24), String(parsed.a[1]).slice(0, 24)] };
}

/* ---------------- OpenAI 兼容（DeepSeek / OpenAI / OpenRouter 等） ----------------
   国内可直连 DeepSeek（platform.deepseek.com）。没有内建联网搜索，
   answerSearch 退化成普通答案（无 places/sources）。 */
function makeOpenAICompatible({ endpointEnv, keyEnv, modelEnv, defaultEndpoint, defaultModel }) {
  async function call(system, user, maxTokens) {
    const key = process.env[keyEnv];
    if (!key) throw { status: 500, detail: `后端没配 ${keyEnv}` };
    const endpoint = process.env[endpointEnv] || defaultEndpoint;
    const model = process.env[modelEnv] || defaultModel;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        temperature: 0.8,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw { status: res.status, detail: `${modelEnv}: ` + text.slice(0, 400) };
    }
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || '';
  }
  return {
    async answer({ q, lens, personaName, prevQ, prevKw }) {
      const userContent = prevQ
        ? `我之前的纠结是："${prevQ}"，你给的答案是："${prevKw || ''}"。现在我想追问：${q}`
        : q;
      return normAnswer(pickJson(await call(answerSystem(lens, personaName), userContent, 320)), lens, 'ai');
    },
    async answerSearch({ q, lens, personaName }) {
      // 无内建搜索：退化为普通答案
      return normAnswer(pickJson(await call(answerSystem(lens, personaName), q, 320)), lens, 'ai');
    },
    async pollOptions({ q }) {
      return normPoll(pickJson(await call(pollSystem(), q, 160)));
    },
  };
}

const DEEPSEEK = makeOpenAICompatible({
  endpointEnv: 'DEEPSEEK_ENDPOINT', keyEnv: 'DEEPSEEK_API_KEY', modelEnv: 'DEEPSEEK_MODEL',
  defaultEndpoint: 'https://api.deepseek.com/chat/completions', defaultModel: 'deepseek-chat',
});

const OPENAI = makeOpenAICompatible({
  endpointEnv: 'OPENAI_ENDPOINT', keyEnv: 'OPENAI_API_KEY', modelEnv: 'OPENAI_MODEL',
  defaultEndpoint: 'https://api.openai.com/v1/chat/completions', defaultModel: 'gpt-4o-mini',
});

// 智谱 GLM —— glm-4-flash 免费，国内可注册（bigmodel.cn）
const ZHIPU = makeOpenAICompatible({
  endpointEnv: 'ZHIPU_ENDPOINT', keyEnv: 'ZHIPU_API_KEY', modelEnv: 'ZHIPU_MODEL',
  defaultEndpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions', defaultModel: 'glm-4-flash',
});

const PROVIDERS = { gemini: GEMINI, anthropic: ANTHROPIC, deepseek: DEEPSEEK, openai: OPENAI, zhipu: ZHIPU };
const KEY_ENV = { gemini: 'GEMINI_API_KEY', anthropic: 'ANTHROPIC_API_KEY', deepseek: 'DEEPSEEK_API_KEY', openai: 'OPENAI_API_KEY', zhipu: 'ZHIPU_API_KEY' };

export function pickProvider() {
  return PROVIDERS[providerName()] || GEMINI;
}

export function aiConfigured() {
  return !!process.env[KEY_ENV[providerName()] || 'GEMINI_API_KEY'];
}

export function providerName() {
  return (process.env.LLM_PROVIDER || 'gemini').toLowerCase();
}
