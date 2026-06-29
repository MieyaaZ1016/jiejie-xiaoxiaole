'use client';
import { useEffect, useState } from 'react';

/* 渲染一段 SVG 字符串 */
export function Svg({ html, className }) {
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

/* 打字机：逐字显示 text，done 后触发 onDone */
export function Typewriter({ text, speed = 30, start = true, onDone, className }) {
  const [shown, setShown] = useState('');
  useEffect(() => {
    if (!start) return;
    setShown('');
    const chars = Array.from(text || '');
    let i = 0;
    const timer = setInterval(() => {
      setShown(chars.slice(0, i + 1).join(''));
      i++;
      if (i >= chars.length) { clearInterval(timer); onDone && onDone(); }
    }, speed);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, start]);
  return <p className={className}>{shown}</p>;
}
