import { NextResponse } from 'next/server';
import { isConfigured, listPosts, createPost } from '@/lib/db';
import { seedPosts } from '@/lib/data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* 列出广场帖子 */
export async function GET(req) {
  const voter = new URL(req.url).searchParams.get('voter') || '';
  if (!isConfigured()) {
    return NextResponse.json({
      db: false,
      posts: seedPosts.map(p => ({ ...p, total: p.v[0] + p.v[1], myVote: null })),
    });
  }
  try {
    const posts = await listPosts(voter);
    return NextResponse.json({ db: true, posts });
  } catch (e) {
    // DB 连不上时别让广场空着：退回种子帖（只读），DB 恢复后自动回到真实数据
    return NextResponse.json({
      db: false,
      degraded: true,
      error: e?.message || String(e),
      posts: seedPosts.map(p => ({ ...p, total: p.v[0] + p.v[1], myVote: null })),
    });
  }
}

/* 发起一个纠结 */
export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: '请求体不是合法 JSON' }, { status: 400 }); }
  const q = (body.q || '').toString().trim().slice(0, 120);
  const optA = (body.optA || '').toString().trim().slice(0, 24);
  const optB = (body.optB || '').toString().trim().slice(0, 24);
  if (!q || !optA || !optB) return NextResponse.json({ error: '缺少 q / 选项' }, { status: 400 });

  if (!isConfigured()) {
    // 没 DB：返回一个临时帖子，让前端能即时显示（仅本地，不持久）
    return NextResponse.json({
      db: false,
      post: { id: 'local-' + Date.now(), q, a: [optA, optB], v: [50, 50], total: 0, seed: false, myVote: null },
    });
  }
  try {
    const id = 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const post = await createPost({ id, q, optA, optB });
    return NextResponse.json({ db: true, post });
  } catch (e) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
