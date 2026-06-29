'use client';
import { useRef } from 'react';
import { toast } from '@/lib/ui';

export default function ShareModal({ answer, onClose }) {
  const cardRef = useRef(null);
  const today = new Date();
  const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;

  async function render() {
    const dom = cardRef.current;
    if (!dom) throw new Error('卡片未就绪');
    const html2canvas = (await import('html2canvas')).default;
    return await html2canvas(dom, { backgroundColor: null, scale: 2, useCORS: true });
  }
  async function download() {
    try {
      const canvas = await render();
      const link = document.createElement('a');
      link.download = `纠结消消乐-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast('已下载');
    } catch { toast('生成失败，再试一下'); }
  }
  async function copy() {
    try {
      const canvas = await render();
      canvas.toBlob(async (blob) => {
        try {
          if (navigator.clipboard && window.ClipboardItem) {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            toast('已复制到剪贴板');
          } else { toast('当前浏览器不支持，请用下载'); }
        } catch { toast('复制失败，请用下载'); }
      });
    } catch { toast('生成失败，再试一下'); }
  }

  return (
    <div className="modal">
      <div className="modal-card share-modal">
        <div className="sectionTitle"><b>保存这张小纸条</b><button className="icon-btn" onClick={onClose} aria-label="关闭">✕</button></div>
        <div className="share-preview">
          <div className="share-card" ref={cardRef}>
            <div className="share-brand">🎁 纠结消消乐 · 小纸条</div>
            <p className="share-q">你的纠结：{answer.q || '一个小事'}</p>
            <div className="share-kw">{answer.kw}</div>
            <p className="share-plan">{answer.plan}</p>
            <p className="share-why">{answer.why}</p>
            <div className="share-foot">{dateStr} · 拆于 jiejie-xiaoxiaole</div>
          </div>
        </div>
        <div className="actions">
          <button onClick={download}>下载图片</button>
          <button className="secondary" onClick={copy}>复制图片</button>
        </div>
        <p className="muted small">长按图片可以保存（手机端）。</p>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
}
