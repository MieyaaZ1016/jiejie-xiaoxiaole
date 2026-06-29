'use client';
import { useEffect, useRef } from 'react';

/* 真·刮刮乐：canvas 涂层 + pointer 擦除，擦到 ≥6% 自动揭晓。
   children 是被盖住的内容；alreadyDone=true 时一进来就是揭开态。 */
export default function ScratchCard({ children, onComplete, alreadyDone = false }) {
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const completedRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    const ctx = canvas.getContext('2d');
    let isDown = false, revealed = false, lastX = 0, lastY = 0, moveCount = 0;

    function resizeCanvas() {
      const rect = stage.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    }
    function drawCover() {
      const rect = stage.getBoundingClientRect();
      const w = rect.width, h = rect.height;
      ctx.fillStyle = '#ece3cf';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(31,28,25,0.035)';
      ctx.lineWidth = 5;
      for (let i = -h; i < w + h; i += 30) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + h, h); ctx.stroke();
      }
      const fontStack = '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#1f1c19';
      ctx.font = '800 24px ' + fontStack;
      ctx.fillText('刮开今天', w / 2, h / 2 - 12);
      ctx.font = '500 13px ' + fontStack;
      ctx.fillStyle = 'rgba(31,28,25,0.5)';
      ctx.fillText('轻划一下就开', w / 2, h / 2 + 18);
    }
    function pointerPos(e) {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    function scratch(x1, y1, x2, y2) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 80;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      if (x1 === x2 && y1 === y2) { ctx.beginPath(); ctx.arc(x1, y1, 36, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
    function checkProgress() {
      const sampleW = 60, sampleH = 36;
      const tmp = document.createElement('canvas');
      tmp.width = sampleW; tmp.height = sampleH;
      const tctx = tmp.getContext('2d');
      tctx.drawImage(canvas, 0, 0, sampleW, sampleH);
      const data = tctx.getImageData(0, 0, sampleW, sampleH).data;
      let cleared = 0; const total = sampleW * sampleH;
      for (let i = 3; i < data.length; i += 4) if (data[i] < 32) cleared++;
      if (cleared / total > 0.06 && !revealed) reveal();
    }
    function reveal() {
      revealed = true;
      canvas.classList.add('cleared');
      if (!completedRef.current) { completedRef.current = true; onComplete && onComplete(); }
    }
    function start(e) {
      if (revealed) return;
      canvas.setPointerCapture(e.pointerId);
      isDown = true;
      const p = pointerPos(e); lastX = p.x; lastY = p.y;
      scratch(p.x, p.y, p.x, p.y);
    }
    function move(e) {
      if (!isDown || revealed) return;
      const p = pointerPos(e);
      scratch(lastX, lastY, p.x, p.y); lastX = p.x; lastY = p.y;
      if (++moveCount % 2 === 0) checkProgress();
    }
    function end() { if (!isDown) return; isDown = false; checkProgress(); }

    resizeCanvas();
    drawCover();
    if (alreadyDone) { revealed = true; completedRef.current = true; canvas.classList.add('cleared'); }

    canvas.addEventListener('pointerdown', start);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('pointerleave', end);
    const onResize = () => { if (!revealed) { resizeCanvas(); drawCover(); } };
    window.addEventListener('resize', onResize);

    return () => {
      canvas.removeEventListener('pointerdown', start);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', end);
      canvas.removeEventListener('pointercancel', end);
      canvas.removeEventListener('pointerleave', end);
      window.removeEventListener('resize', onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alreadyDone]);

  return (
    <div className="scratch-stage" ref={stageRef}>
      {children}
      <canvas className={'sc-coating' + (alreadyDone ? ' cleared' : '')} ref={canvasRef} aria-hidden="true" />
    </div>
  );
}
