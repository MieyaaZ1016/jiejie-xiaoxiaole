import { NextResponse } from 'next/server';
import { pickProvider } from '@/lib/llm';
import { guard } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  const over = await guard(req);
  if (over) return NextResponse.json({ error: '今日额度用完了，明天再来 🌱', ...over }, { status: 429 });

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: '请求体不是合法 JSON' }, { status: 400 }); }

  try {
    const res = await pickProvider().answer(body);
    return NextResponse.json(res);
  } catch (e) {
    if (e && e.status) return NextResponse.json({ error: 'Upstream ' + e.status, detail: e.detail }, { status: e.status });
    return NextResponse.json({ error: '服务端报错：' + (e?.message || String(e)) }, { status: 500 });
  }
}
