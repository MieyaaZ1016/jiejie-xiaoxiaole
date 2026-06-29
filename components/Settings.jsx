'use client';
import { useState } from 'react';
import * as store from '@/lib/store';
import { themes } from '@/lib/data';
import { toast } from '@/lib/ui';

export default function Settings({ onClose, refresh, applyTheme }) {
  const s = store.get();
  const [theme, setTheme] = useState(s.prefs.theme || 'warm');
  const [sound, setSound] = useState(s.prefs.sound !== false);
  const [haptic, setHaptic] = useState(s.prefs.haptic !== false);
  const [aiEnabled, setAiEnabled] = useState(!!s.ai.enabled);

  const pickTheme = (t) => {
    setTheme(t); applyTheme(t); store.setPrefs({ theme: t });
  };
  const save = () => {
    store.setPrefs({ sound, haptic });
    store.setAi({ enabled: aiEnabled });
    refresh();
    onClose();
    toast(aiEnabled ? 'AI 智能答案已开启' : '已切回本地引擎');
  };
  const exportData = () => {
    const blob = new Blob([store.exportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `jiejie-data-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url); toast('已导出');
  };
  const clearData = () => {
    if (!confirm('清空所有本地数据？（AI 配置和主题偏好会保留）')) return;
    store.clearAll(); refresh(); onClose(); toast('已清空');
  };

  return (
    <div className="modal">
      <div className="modal-card">
        <div className="sectionTitle"><b>设置</b><button className="icon-btn" onClick={onClose} aria-label="关闭">✕</button></div>

        <h4>外观</h4>
        <div className="chips">
          {themes.map((t) => (
            <span key={t.key} className={'chip theme-chip' + (theme === t.key ? ' active' : '')} onClick={() => pickTheme(t.key)}>
              {t.emoji} {t.name}
            </span>
          ))}
        </div>
        <label className="toggle-row">
          <span>拆球音效</span>
          <input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} />
        </label>
        <label className="toggle-row">
          <span>震动反馈（手机端）</span>
          <input type="checkbox" checked={haptic} onChange={(e) => setHaptic(e.target.checked)} />
        </label>

        <hr />
        <h4>AI 智能答案</h4>
        <p className="muted">开启后，答案会用部署者配置的 AI 真正针对你输入的内容来生成（免费、无需你自己的 key）。关闭则用本地引擎，纯离线也能玩。</p>
        <label className="toggle-row">
          <span>用 AI 生成答案</span>
          <input type="checkbox" checked={aiEnabled} onChange={(e) => setAiEnabled(e.target.checked)} />
        </label>

        <hr />
        <h4>数据</h4>
        <div className="actions">
          <button className="secondary" onClick={exportData}>导出</button>
          <button className="secondary" onClick={clearData}>清空本地数据</button>
        </div>

        <div className="actions" style={{ marginTop: 14 }}>
          <button onClick={save}>保存</button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
}
