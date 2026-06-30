'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as store from '@/lib/store';
import * as ans from '@/lib/answers';
import * as creatures from '@/lib/creatures';
import { compute as computePersona } from '@/lib/personality';
import { lenses, dailies, quickQs, themes } from '@/lib/data';
import { toast, burstAt, sfx, haptic } from '@/lib/ui';
import ScratchCard from '@/components/ScratchCard';
import { Svg, Typewriter } from '@/components/bits';
import Community from '@/components/Community';
import Settings from '@/components/Settings';
import ShareModal from '@/components/ShareModal';

const SUBTEXT = {
  home: '把今天的小事拆成小答案',
  community: '纠结社区：把小纠结丢给大家投票',
  museum: '决策博物馆：看看你都拆过哪些小事',
  garden: '小花园：每解一个小纠结，就开一朵花',
};

function applyTheme(theme) {
  if (typeof document !== 'undefined') document.documentElement.dataset.theme = theme || 'warm';
}

export default function App() {
  const [mounted, setMounted] = useState(false);
  const [page, setPage] = useState('home');
  const [tick, setTick] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shareAnswer, setShareAnswer] = useState(null);

  const refresh = () => setTick((t) => t + 1);

  useEffect(() => {
    store.load();
    applyTheme(store.get().prefs.theme);
    setMounted(true);
  }, []);

  return (
    <>
      <div className="bg-blobs" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
      <div className="toast" id="toast" role="status" aria-live="polite">已更新</div>
      <div className="burst-layer" id="burstLayer" aria-hidden="true"></div>

      <div className="app">
        <header className="top">
          <div className="brand">
            <h1>纠结消消乐</h1>
            <p className="brand-sub">{SUBTEXT[page]}</p>
          </div>
          <div className="top-actions">
            <button className="icon-btn" onClick={() => setSettingsOpen(true)} title="设置" aria-label="设置">⚙️</button>
            <span className="pill">v3.1</span>
          </div>
        </header>

        {mounted && (
          <>
            <section className={'page' + (page === 'home' ? ' active' : '')} aria-label="今日">
              {page === 'home' && <Home tick={tick} refresh={refresh} onShare={setShareAnswer} />}
            </section>
            <section className={'page' + (page === 'community' ? ' active' : '')} aria-label="纠结社区">
              {page === 'community' && <Community />}
            </section>
            <section className={'page' + (page === 'museum' ? ' active' : '')} aria-label="决策博物馆">
              {page === 'museum' && <Museum tick={tick} />}
            </section>
            <section className={'page' + (page === 'garden' ? ' active' : '')} aria-label="小花园">
              {page === 'garden' && <Garden tick={tick} />}
            </section>
          </>
        )}
      </div>

      <nav className="nav" aria-label="主导航">
        {['home', 'community', 'museum', 'garden'].map((p) => (
          <button key={p} className={page === p ? 'active' : ''} onClick={() => { setPage(p); sfx.tick(); }}>
            {{ home: '今日', community: '社区', museum: '博物馆', garden: '小花园' }[p]}
          </button>
        ))}
      </nav>

      {settingsOpen && <Settings onClose={() => setSettingsOpen(false)} refresh={refresh} applyTheme={applyTheme} />}
      {shareAnswer && <ShareModal answer={shareAnswer} onClose={() => setShareAnswer(null)} />}
    </>
  );
}

/* ======================= 首页 ======================= */
function Home({ tick, refresh, onShare }) {
  const [pane, setPane] = useState('today');
  return (
    <>
      <div className="segment" role="tablist">
        <button className={'seg-btn' + (pane === 'today' ? ' active' : '')} role="tab" aria-selected={pane === 'today'}
          onClick={() => { setPane('today'); sfx.tick(); haptic(8); }}>今日刮卡</button>
        <button className={'seg-btn' + (pane === 'worry' ? ' active' : '')} role="tab" aria-selected={pane === 'worry'}
          onClick={() => { setPane('worry'); sfx.tick(); haptic(8); }}>聊个纠结</button>
        <span className="seg-thumb" aria-hidden="true"></span>
      </div>

      <div className={'pane pane-today' + (pane === 'today' ? ' active' : '')} hidden={pane !== 'today'}>
        <TodayScratch />
      </div>
      <div className={'pane pane-worry' + (pane === 'worry' ? ' active' : '')} hidden={pane !== 'worry'}>
        <Worry tick={tick} refresh={refresh} onShare={onShare} />
      </div>
    </>
  );
}

/* ---------- 今日刮卡 ---------- */
function TodayScratch() {
  const idx = useMemo(() => {
    const t = new Date();
    return (t.getFullYear() * 31 + t.getMonth() * 31 + t.getDate()) % dailies.length;
  }, []);
  const d = dailies[idx];
  const lens = lenses[idx % lenses.length].key;
  const already = store.isScratched(store.todayStr());
  const [revealed, setRevealed] = useState(already);

  const onComplete = () => {
    if (!store.isScratched(store.todayStr())) {
      store.markDailyScratched(store.todayStr());
      sfx.ding(); haptic([10, 40, 20]); toast('今天这颗球，刮开了');
    }
    setRevealed(true);
  };

  return (
    <>
      <ScratchCard onComplete={onComplete} alreadyDone={already}>
        <div className="sc-card">
          <Svg className="sc-blob pop" html={revealed ? creatures.svg(lens) : creatures.dormantBlob(lens, idx)} />
          <p className="sc-label">今天这颗球说</p>
          <h2 className="sc-kw">{d[0]}</h2>
          <p className="sc-tip">{d[1]}</p>
          <p className="sc-foot">忌 {d[2]} · 幸运数 {d[3]}</p>
        </div>
        <p className={'sc-hint' + (revealed ? ' hide' : '')}>轻划一下就开</p>
      </ScratchCard>
      {revealed && <p className="sc-after">明天再来一颗。</p>}
    </>
  );
}

/* ---------- 聊个纠结（盲盒 + 答案） ---------- */
function getOrAskLocation() {
  const cached = store.getLoc();
  const FRESH = 30 * 24 * 60 * 60 * 1000;
  if (cached && cached.lat && Date.now() - (cached.ts || 0) < FRESH) return Promise.resolve(cached);
  if (typeof navigator === 'undefined' || !navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const c = pos.coords;
        const loc = { lat: c.latitude, lng: c.longitude, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '' };
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${loc.lat}&lon=${loc.lng}&format=json&zoom=14&addressdetails=1&accept-language=zh`,
            { headers: { 'Accept-Language': 'zh,en' } });
          if (r.ok) {
            const j = await r.json(); const a = j.address || {};
            loc.city = a.city || a.town || a.county || a.state || a.village || '';
            loc.region = a.state || '';
            loc.country = (a.country_code || '').toUpperCase() || 'CN';
          }
        } catch {}
        store.setLoc(loc); resolve(loc);
      },
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 }
    );
  });
}

function safePersonaName() {
  try { return computePersona(store.get(), store.streak()).persona.key; } catch { return ''; }
}

function Worry({ tick, refresh, onShare }) {
  const [q, setQ] = useState('');
  const [phase, setPhase] = useState('empty'); // empty | shelf | answer
  const [boxState, setBoxState] = useState('等一颗');
  const [answer, setAnswer] = useState(null);
  const [shakeIdx, setShakeIdx] = useState(-1);
  const [planDone, setPlanDone] = useState(false);
  const [followQ, setFollowQ] = useState('');
  const currentQRef = useRef('');
  const boxRefs = useRef([]);

  const s = store.get();
  const aiEnabled = !!s.ai.enabled;

  const pack = (text) => {
    const val = (text != null ? text : q).trim();
    if (!val) return;
    currentQRef.current = val;
    setBoxState('挑一颗');
    setPhase('shelf');
    setAnswer(null);
    setShakeIdx(-1);
  };

  const openAnswer = async (lens, boxIdx) => {
    setShakeIdx(boxIdx);
    sfx.pop(); haptic([12, 28, 16]);
    await new Promise((r) => setTimeout(r, 620));
    if (boxRefs.current[boxIdx]) { burstAt(boxRefs.current[boxIdx], 28); }
    haptic(24);

    const qq = currentQRef.current || '这件小事';
    setPhase('answer');
    setBoxState('拆开中…');
    setPlanDone(false);

    const personaName = safePersonaName();
    const wantsSearch = aiEnabled && ans.needsWebSearch(qq);
    let a;
    if (wantsSearch) {
      setBoxState('正在找附近…');
      try {
        const loc = await getOrAskLocation();
        if (!loc) toast('没拿到位置，结果会泛一点');
        a = await ans.generateWithSearch(qq, { lens, loc });
      } catch (e) {
        toast('搜索失败：' + e.message);
        a = await ans.generate(qq, { lens, personaName, aiEnabled, onAiError: (m) => toast('AI：' + m + '，先用本地答案') });
      }
    } else {
      a = await ans.generate(qq, { lens, personaName, aiEnabled, onAiError: (m) => toast('AI：' + m + '，先用本地答案') });
    }
    a.q = qq;
    store.recordOpen();
    setAnswer(a);
    setBoxState('已拆开');
  };

  const doFollowup = async () => {
    const fq = followQ.trim();
    if (!fq) return;
    const prev = answer;
    setBoxState('追问中…'); sfx.tick();
    const personaName = safePersonaName();
    const a = await ans.generate(fq, {
      lens: prev ? prev.lens : 'coin', personaName, aiEnabled,
      context: prev ? { prevQ: prev.q, prevKw: prev.kw } : null,
      onAiError: (m) => toast('AI：' + m + '，先用本地答案'),
    });
    a.q = fq;
    store.recordOpen();
    setAnswer(a); setPlanDone(false); setFollowQ(''); setBoxState('已拆开');
  };

  const accept = () => {
    if (!answer) return;
    store.recordAccept({
      q: answer.q, tag: answer.tag, ans: answer.kw, plan: answer.plan, why: answer.why,
      time: new Date().toLocaleString(), source: answer.source, lens: answer.lens,
    });
    sfx.ding(); haptic([10, 40, 10, 40, 20]); refresh(); toast('已存进博物馆');
  };

  const counters = `今天少想：${s.saved} 次｜已拆小事：${s.opened} 个`;
  const streakN = store.streak();

  return (
    <>
      <div className="card input-card">
        <div className="sectionTitle"><b>把小纠结装进去</b><span>今天的一件小事</span></div>
        <textarea value={q} onChange={(e) => setQ(e.target.value)} placeholder="比如：今晚吃什么、要不要发消息、今天穿什么。" />
        <div className="chips">
          {['今晚吃什么？', '要不要点奶茶？', '要不要给 TA 发消息？', '今天穿什么风格？', '这个东西买不买？'].map((c) => (
            <span className="chip" key={c} onClick={() => { setQ(c); pack(c); }}>{c}</span>
          ))}
        </div>
        <div className="actions">
          <button onClick={() => pack()}>丢进去</button>
          <button className="secondary" onClick={() => { const r = quickQs[Math.floor(Math.random() * quickQs.length)]; setQ(r); pack(r); }}>随机来一个</button>
        </div>
        <div className="stat-row">
          <div className="counter">{counters}</div>
          {streakN >= 1 && <div className="streak-chip">🔥 连续 {streakN} 天</div>}
        </div>
        {aiEnabled && <p className="ai-hint">🤖 AI 模式已开启</p>}
      </div>

      <div className="card shelf-card">
        <div className="sectionTitle"><b>今天的情绪小球</b><span>{boxState}</span></div>
        <div>
          {phase !== 'answer' ? (
            <>
              <ShelfGrid phase={phase} shakeIdx={shakeIdx} boxRefs={boxRefs}
                onPick={(i) => { if (phase !== 'shelf' || shakeIdx >= 0) return; const lens = lenses[Math.floor(Math.random() * lenses.length)].key; openAnswer(lens, i); }} />
              <p className="empty">{phase === 'empty' ? '先写下一件小纠结，情绪小球就会出现。' : '挑一颗拆开 —— 它们都一样，拆开才知道里面什么视角。'}</p>
            </>
          ) : answer ? (
            <AnswerCard answer={answer} planDone={planDone} setPlanDone={setPlanDone}
              followQ={followQ} setFollowQ={setFollowQ} onFollowup={doFollowup}
              onAccept={accept} onAgain={() => pack(currentQRef.current)} onShare={() => onShare(answer)} />
          ) : (
            <p className="empty">拆开中…</p>
          )}
        </div>
      </div>
    </>
  );
}

function ShelfGrid({ phase, shakeIdx, boxRefs, onPick }) {
  const disabled = phase === 'empty';
  const ball = (i) => (
    <div key={i}
      ref={(el) => (boxRefs.current[i] = el)}
      className={'blindBox' + ((disabled || (shakeIdx >= 0 && shakeIdx !== i)) ? ' disabled' : '') + (shakeIdx === i ? ' shake open-burst' : '')}
      onClick={() => onPick(i)}>
      <Svg html={creatures.dormant(i)} />
    </div>
  );
  return (
    <div className="shelfUnit">
      <div className="shelf">{ball(0)}{ball(1)}{ball(2)}</div>
      <div className="shelf">{ball(3)}{ball(4)}{ball(5)}</div>
    </div>
  );
}

function AnswerCard({ answer, planDone, setPlanDone, followQ, setFollowQ, onFollowup, onAccept, onAgain, onShare }) {
  const lensObj = lenses.find((l) => l.key === answer.lens) || {};
  const sourceLabel = answer.source === 'ai-web' ? '🌐 实时搜索' : answer.source === 'ai' ? 'AI' : '本地';
  return (
    <div className="answer">
      {lensObj.name && (
        <div className="lens-reveal r0">
          <Svg className="lens-creature" html={creatures.svg(answer.lens)} />
          <div className="lens-text">
            <b>拆到了：{lensObj.name}视角</b>
            <span>{lensObj.tip}</span>
          </div>
        </div>
      )}
      <p className="answer-q r1">关于「{answer.q}」 · {sourceLabel}</p>
      {answer.lens === 'coin' && <p className="coin-intro r1">心里有点想反驳？那答案可能在另一面。</p>}
      <h2 className="answer-kw kw-pop r2">{answer.kw}</h2>
      <Typewriter className="answer-plan r3" text={answer.plan} speed={30} start onDone={() => setPlanDone(true)} />
      <Typewriter className="answer-why r4" text={answer.why} speed={30} start={planDone} />
      {answer.places && answer.places.length > 0 && (
        <div className="answer-places r4">
          {answer.places.map((p, i) => (
            <div className="place-card" key={i}>
              <p className="place-name">{p.name || ''}</p>
              {p.area && <p className="place-area">{p.area}</p>}
              {p.why && <p className="place-why">{p.why}</p>}
            </div>
          ))}
        </div>
      )}
      {answer.sources && answer.sources.length > 0 && (
        <details className="answer-sources r4">
          <summary>来源 · {answer.sources.length}</summary>
          <ul>
            {answer.sources.map((sc, i) => (
              <li key={i}><a href={sc.url || '#'} target="_blank" rel="noopener noreferrer">{sc.title || sc.url || ''}</a></li>
            ))}
          </ul>
        </details>
      )}
      <div className="followup r4">
        <input value={followQ} onChange={(e) => setFollowQ(e.target.value)} placeholder="想再追问一句？比如：那如果…"
          onKeyDown={(e) => { if (e.key === 'Enter') onFollowup(); }} />
        <button className="secondary" onClick={onFollowup}>追问</button>
      </div>
      <div className="actions r4">
        <button onClick={onAccept}>行，就这个</button>
        <button className="secondary" onClick={onAgain}>再换一颗</button>
        <button className="secondary" onClick={onShare}>保存成图片</button>
      </div>
    </div>
  );
}

/* ======================= 博物馆 ======================= */
function Museum({ tick }) {
  const [filter, setFilter] = useState('all');
  const h = store.get().history || [];
  const list = filter === 'all' ? h : h.filter((x) => x.tag === filter);
  return (
    <>
      <div className="card">
        <div className="sectionTitle"><b>决策博物馆</b><span>历史回顾</span></div>
        <p className="empty">这里收藏你拆过、投过、保存过的小决定。点标签可以筛选。</p>
        <div className="chips filters">
          {['all', '吃喝', '社交', '消费', '成长', '生活'].map((f) => (
            <span key={f} className={'chip' + (filter === f ? ' active' : '')} onClick={() => setFilter(f)}>{f === 'all' ? '全部' : f}</span>
          ))}
        </div>
      </div>
      <div className="museumGrid">
        {list.length ? list.map((x, i) => {
          const lensObj = lenses.find((l) => l.key === x.lens);
          return (
            <div className="ticket" key={i}>
              <div className="ticket-tags">
                {lensObj && <Svg className="ticket-creature" html={creatures.svg(x.lens)} />}
                <span className={'tag t-' + (x.tag || '生活')}>{x.tag || '生活'}</span>
                {lensObj && <span className="lens-tag">{lensObj.name}视角</span>}
              </div>
              <h3>{x.ans}</h3>
              <p><b>纠结：</b>{x.q}</p>
              <p>{x.plan}</p>
              <small>{x.time}</small>
            </div>
          );
        }) : <div className="card"><p className="empty">这个标签还没有记录。去拆一颗情绪小球吧。</p></div>}
      </div>
    </>
  );
}

/* ======================= 小花园 ======================= */
const FLOWER_COLORS = [
  { petal: '#e8551f', center: '#f0b32a' },
  { petal: '#f0a6c8', center: '#cd6a3c' },
  { petal: '#a4c736', center: '#2f9e44' },
  { petal: '#1f5fa8', center: '#f0a6c8' },
  { petal: '#f0b32a', center: '#e8551f' },
  { petal: '#cd6a3c', center: '#a4c736' },
];
function flowerSVG(x, y, colorIdx, scale, fresh) {
  const c = FLOWER_COLORS[colorIdx % FLOWER_COLORS.length];
  return `<g class="${fresh ? 'g-flower fresh' : 'g-flower'}" transform="translate(${x},${y}) scale(${scale})">
    <line x1="0" y1="0" x2="0" y2="44" stroke="#5a7a3e" stroke-width="3.5" stroke-linecap="round"/>
    <ellipse cx="-7" cy="24" rx="6.5" ry="3.5" fill="#5a7a3e" transform="rotate(-30 -7 24)"/>
    <ellipse cx="7" cy="32" rx="6.5" ry="3.5" fill="#5a7a3e" transform="rotate(30 7 32)"/>
    <circle cx="0" cy="-12" r="9.5" fill="${c.petal}"/><circle cx="11" cy="-4" r="9.5" fill="${c.petal}"/>
    <circle cx="-11" cy="-4" r="9.5" fill="${c.petal}"/><circle cx="7" cy="8" r="9.5" fill="${c.petal}"/>
    <circle cx="-7" cy="8" r="9.5" fill="${c.petal}"/><circle cx="0" cy="-2" r="7" fill="${c.center}"/>
    <circle cx="-2.4" cy="-3" r="1.1" fill="#1f1c19"/><circle cx="2.4" cy="-3" r="1.1" fill="#1f1c19"/>
    <path d="M-2 1 Q0 3 2 1" stroke="#1f1c19" stroke-width="1.2" fill="none" stroke-linecap="round"/></g>`;
}
function sproutSVG(x, y) {
  return `<g class="g-sprout" transform="translate(${x},${y})">
    <line x1="0" y1="0" x2="0" y2="16" stroke="#9aab7a" stroke-width="2" stroke-linecap="round"/>
    <ellipse cx="-4.5" cy="6" rx="4" ry="2.5" fill="#9aab7a" transform="rotate(-40 -4.5 6)"/>
    <ellipse cx="4.5" cy="3" rx="4" ry="2.5" fill="#9aab7a" transform="rotate(40 4.5 3)"/></g>`;
}
function weedSVG(x, y, sway) {
  return `<g class="g-weed" transform="translate(${x},${y}) rotate(${sway})">
    <path d="M0 0 Q-3 -8 -1 -16 Q3 -22 1 -28" stroke="#6e8a4d" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M0 0 Q4 -7 2 -14" stroke="#6e8a4d" stroke-width="2" fill="none" stroke-linecap="round"/></g>`;
}
function gardenTagline(n, streak) {
  if (n === 0) return streak > 0 ? '今天先扫了地，等下一颗种子。' : '你这片地刚翻好，等第一颗种子。';
  if (n <= 2) return '冒头了，慢慢来。';
  if (n <= 5) return '开始热闹了。';
  if (n <= 10) return '花圃丰盛，杂草也长起来。';
  return '一整片小宇宙。';
}

function Garden({ tick }) {
  const s = store.get();
  const history = s.history || [];
  const flowers = history.length;
  const opened = s.opened || 0;
  const streak = store.streak();

  const svg = useMemo(() => {
    const VW = 360, VH = 200, slots = 16, cols = 4, rows = 4;
    const cellW = VW / cols, cellH = (VH - 32) / rows;
    let out = `<svg viewBox="0 0 ${VW} ${VH}" xmlns="http://www.w3.org/2000/svg" class="garden-svg">`;
    out += `<rect x="0" y="${VH - 28}" width="${VW}" height="28" fill="#dec79f"/>`;
    out += `<rect x="0" y="${VH - 28}" width="${VW}" height="3" fill="#b8a37d"/>`;
    const weeds = Math.min(streak * 2, 12);
    for (let i = 0; i < weeds; i++) out += weedSVG((i * 53) % VW, VH - 26, ((i * 17) % 30) - 15);
    const visible = Math.min(flowers, slots);
    for (let i = 0; i < slots; i++) {
      const r = Math.floor(i / cols), col = i % cols;
      const baseX = col * cellW + cellW / 2 + ((i * 11) % 9) - 4;
      const baseY = (r + 1) * cellH - 4 + ((i * 7) % 6) - 3;
      if (i < visible) {
        const newest = i === visible - 1;
        out += flowerSVG(baseX, baseY, i, newest ? 1.1 : 0.9 + (i % 3) * 0.05, newest);
      } else if (i < visible + 2) {
        out += sproutSVG(baseX, baseY + 24);
      }
    }
    out += '</svg>';
    return out;
  }, [flowers, streak]);

  const persona = useMemo(() => { try { return computePersona(s, streak); } catch { return null; } }, [tick]);
  const recent = history.slice(0, 5);

  return (
    <>
      <div className="card garden-hero">
        <div className="sectionTitle"><b>小花园</b><span>每解一个小纠结，就开一朵花</span></div>
        <p className="garden-tagline">{gardenTagline(flowers, streak)}</p>
        <div className="garden-stats">
          <div className="g-stat"><b>{flowers}</b><span>朵花</span></div>
          <div className="g-stat"><b>{streak}</b><span>天连续</span></div>
          <div className="g-stat"><b>{opened}</b><span>颗已拆</span></div>
        </div>
      </div>
      <div className="card">
        <div className="sectionTitle"><b>花圃</b><span>{flowers === 0 ? '这里很安静' : flowers + ' 朵在长'}</span></div>
        <Svg className="garden-canvas" html={svg} />
      </div>
      <div className="card">
        <div className="sectionTitle"><b>最近的收成</b><span>近 5 个小决定</span></div>
        <div className="garden-recent">
          {recent.length === 0 ? (
            <p className="empty">还没收成。去「今日」拆一颗情绪小球。</p>
          ) : recent.map((hh, i) => {
            const dt = new Date(hh.time || Date.now());
            const c = FLOWER_COLORS[i % FLOWER_COLORS.length];
            return (
              <div className="harvest-item" key={i}>
                <span className="harvest-dot" style={{ background: c.petal }}></span>
                <div className="harvest-body">
                  <p className="harvest-q">{hh.q || '一颗小纠结'}</p>
                  <p className="harvest-a">{hh.plan || hh.ans || ''}</p>
                </div>
                <span className="harvest-date">{(dt.getMonth() + 1) + '/' + dt.getDate()}</span>
              </div>
            );
          })}
        </div>
      </div>
      {persona && (
        <div className="card">
          <div className="sectionTitle"><b>决策人格</b><span>本地行为分析</span></div>
          <h3 className="persona-name">{persona.persona.key}</h3>
          <p className="muted">{persona.persona.desc}</p>
          <div>
            {persona.traits.map(([name, val]) => (
              <div className="trait" key={name}>
                <div className="traitTop"><span>{name}</span><b>{val}%</b></div>
                <div className="traitBar"><i style={{ width: val + '%' }}></i></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
