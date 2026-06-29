/* ==========================================================================
   store.js — 本地状态（localStorage）。个人数据留本地；社区走 DB。
   从 vanilla state.js 迁移；加 SSR 守卫，仅浏览器可用。
   ========================================================================== */
const KEY = 'jiejie_state_v3';
const VOTER_KEY = 'jiejie_voter_id';

const defaultState = {
  saved: 0,
  opened: 0,
  history: [],            // {q, tag, ans, plan, why, time, source, lens}
  votes: {},              // 本地记录投过的 postId -> choice（仅用于人格徽章统计）
  ai: { enabled: true },  // 默认走后端 AI；可在设置里关
  prefs: { theme: 'warm', sound: true, haptic: true },
  dailyScratched: {},
  firstSeen: 0,
  activeDays: [],
  loc: null,
};

let state = null;

const hasWindow = () => typeof window !== 'undefined';

export function load() {
  if (!hasWindow()) return JSON.parse(JSON.stringify(defaultState));
  if (state) return state;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      state = Object.assign({}, JSON.parse(JSON.stringify(defaultState)), JSON.parse(raw));
      if (typeof state.dailyScratched !== 'object') state.dailyScratched = {};
      if (!Array.isArray(state.activeDays)) state.activeDays = [];
      if (!state.ai) state.ai = { enabled: true };
      if (typeof state.ai.enabled !== 'boolean') state.ai.enabled = true;
      state.prefs = Object.assign({}, defaultState.prefs, state.prefs || {});
    } else {
      state = JSON.parse(JSON.stringify(defaultState));
      state.firstSeen = Date.now();
    }
  } catch {
    state = JSON.parse(JSON.stringify(defaultState));
  }
  markActiveToday();
  return state;
}

export function save() {
  if (!hasWindow() || !state) return;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}

export function get() { return state || load(); }

export function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function markActiveToday() {
  if (!state) return;
  const today = todayStr();
  if (!state.activeDays.includes(today)) {
    state.activeDays.unshift(today);
    state.activeDays = state.activeDays.slice(0, 60);
    save();
  }
}

export function recordAccept(entry) {
  const s = get();
  s.saved++;
  s.history.unshift(entry);
  s.history = s.history.slice(0, 50);
  save();
}

export function recordOpen() { const s = get(); s.opened++; save(); }

export function recordVote(postId, choice) { const s = get(); s.votes[postId] = choice; save(); }

export function markDailyScratched(dateStr) { const s = get(); s.dailyScratched[dateStr] = true; save(); }
export function isScratched(dateStr) { return !!get().dailyScratched[dateStr]; }

export function setAi(patch) { const s = get(); s.ai = Object.assign({}, s.ai, patch); save(); }
export function setPrefs(patch) { const s = get(); s.prefs = Object.assign({}, s.prefs, patch); save(); }

export function setLoc(loc) { const s = get(); s.loc = Object.assign({}, s.loc || {}, loc, { ts: Date.now() }); save(); }
export function getLoc() { return get().loc; }

export function streak() {
  const s = get();
  const days = s.activeDays || [];
  if (!days.length) return 0;
  const set = new Set(days);
  let count = 0;
  const cursor = new Date();
  if (!set.has(todayStr())) cursor.setDate(cursor.getDate() - 1);
  for (;;) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, '0');
    const d = String(cursor.getDate()).padStart(2, '0');
    if (set.has(`${y}-${m}-${d}`)) { count++; cursor.setDate(cursor.getDate() - 1); }
    else break;
  }
  return count;
}

export function exportJson() { return JSON.stringify(get(), null, 2); }

export function clearAll() {
  const aiBackup = get().ai;
  const prefsBackup = get().prefs;
  state = JSON.parse(JSON.stringify(defaultState));
  state.firstSeen = Date.now();
  state.ai = aiBackup;
  state.prefs = prefsBackup;
  markActiveToday();
  save();
}

/* 匿名投票身份（给社区去重用），存本地 */
export function voterId() {
  if (!hasWindow()) return 'server';
  let id = localStorage.getItem(VOTER_KEY);
  if (!id) {
    id = 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(VOTER_KEY, id);
  }
  return id;
}
