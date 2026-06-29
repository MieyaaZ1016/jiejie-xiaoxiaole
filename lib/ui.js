/* ==========================================================================
   ui.js — 客户端 UI 工具：Toast / 粒子高光 / 音效（Web Audio）/ 震动
   ========================================================================== */
import { get } from './store';

let toastTimer;
export function toast(text) {
  if (typeof document === 'undefined') return;
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1600);
}

export function burstAt(originEl, count = 24) {
  if (typeof document === 'undefined' || !originEl) return;
  const rect = originEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const layer = document.getElementById('burstLayer');
  if (!layer) return;
  const colors = ['#ff8a3d', '#ffd36d', '#ffb7a7', '#7eaa78', '#9ed7df', '#c5b8ff'];
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'burst-particle';
    p.style.left = (cx - 6) + 'px';
    p.style.top = (cy - 6) + 'px';
    p.style.background = colors[i % colors.length];
    const angle = (Math.PI * 2) * (i / count) + Math.random() * 0.4;
    const dist = 140 + Math.random() * 110;
    p.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
    p.style.setProperty('--dy', Math.sin(angle) * dist - 40 + 'px');
    p.style.animation = 'float-up .9s cubic-bezier(.2,.7,.3,1) forwards';
    layer.appendChild(p);
    setTimeout(() => p.remove(), 1000);
  }
}

/* ---------- 音效 ---------- */
let audioCtx = null;
function getCtx() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) audioCtx = new AC();
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}
function soundOn() {
  try { return get().prefs.sound !== false; } catch { return true; }
}
function tone(freq, dur, type = 'sine', gain = 0.16, delay = 0) {
  const ctx = getCtx();
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}
export const sfx = {
  pop() { if (!soundOn()) return; tone(420, 0.12, 'triangle', 0.14, 0); tone(660, 0.18, 'triangle', 0.12, 0.06); },
  ding() { if (!soundOn()) return; tone(740, 0.16, 'sine', 0.15, 0); tone(988, 0.30, 'sine', 0.14, 0.10); },
  tick() { if (!soundOn()) return; tone(520, 0.06, 'square', 0.06, 0); },
};

export function haptic(pattern) {
  try {
    if (get().prefs.haptic === false) return;
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(pattern);
  } catch {}
}
