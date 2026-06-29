import { NextResponse } from 'next/server';
import { isConfigured, votePost } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: '请求体不是合法 JSON' }, { status: 400 }); }
  const id = (body.id || '').toString();
  const choice = body.choice === 1 ? 1 : 0;
  const voter = (body.voter || '').toString().slice(0, 64);
  if (!id || !voter) return NextResponse.json({ error: '缺少 id / voter' }, { status: 400 });

  if (!isConfigured() || id.startsWith('seed-') || id.startsWith('local-')) {
    // 没 DB 或种子/本地帖：前端自己乐观更新
    return NextResponse.json({ db: false, counted: true, myVote: choice });
  }
  try {
    const r = await votePost({ id, choice, voter });
    return NextResponse.json({ db: true, ...r });
  } catch (e) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
