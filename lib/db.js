/* ==========================================================================
   db.js — Postgres（Neon / Vercel Postgres）数据访问层
   - 社区广场：真·全网共享的 posts + votes
   - 限流：按天 + IP 计数
   - 没配 DATABASE_URL 时 isConfigured() 为 false，路由会优雅降级
   ========================================================================== */
import 'server-only';
import postgres from 'postgres';

const URL =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  '';

let sql = null;
if (URL) {
  sql = postgres(URL, {
    ssl: 'require',
    max: 1,            // serverless：每实例一条连接
    idle_timeout: 20,
    connect_timeout: 30, // Neon 免费档休眠唤醒可能超过 10s，放宽避免误报连接失败
  });
}

export function isConfigured() {
  return !!sql;
}

/* schema 只建一次（幂等） */
let schemaReady = null;
async function ensureSchema() {
  if (!sql) throw new Error('DB 未配置');
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS posts (
          id         TEXT PRIMARY KEY,
          q          TEXT NOT NULL,
          opt_a      TEXT NOT NULL,
          opt_b      TEXT NOT NULL,
          va         INTEGER NOT NULL DEFAULT 0,
          vb         INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )`;
      await sql`
        CREATE TABLE IF NOT EXISTS votes (
          post_id TEXT NOT NULL,
          voter   TEXT NOT NULL,
          choice  INTEGER NOT NULL,
          PRIMARY KEY (post_id, voter)
        )`;
      await sql`
        CREATE TABLE IF NOT EXISTS rate_limit (
          day   TEXT NOT NULL,
          ip    TEXT NOT NULL,
          count INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY (day, ip)
        )`;
      // 首次建表时塞几条种子，让广场不空
      const seeds = [
        ['seed-1', '今晚要不要出门见朋友？', '去，但只待 90 分钟', '不去，回家回血', 62, 38],
        ['seed-2', '这个包要不要买？', '放购物车冷静一天', '预算内就买小号', 71, 29],
        ['seed-3', '今天要不要运动？', '散步 20 分钟', '直接躺平', 84, 16],
      ];
      for (const [id, q, a, b, va, vb] of seeds) {
        await sql`
          INSERT INTO posts (id, q, opt_a, opt_b, va, vb)
          VALUES (${id}, ${q}, ${a}, ${b}, ${va}, ${vb})
          ON CONFLICT (id) DO NOTHING`;
      }
    })();
  }
  return schemaReady;
}

function pct(va, vb) {
  const total = va + vb;
  if (total === 0) return [50, 50];
  const a = Math.round((va / total) * 100);
  return [a, 100 - a];
}

/* 列出广场帖子（最新在前，种子置底） */
export async function listPosts(voter) {
  await ensureSchema();
  const rows = await sql`
    SELECT id, q, opt_a, opt_b, va, vb, created_at,
           (id LIKE 'seed-%') AS is_seed
    FROM posts
    ORDER BY is_seed ASC, created_at DESC
    LIMIT 60`;
  let voted = {};
  if (voter) {
    const vs = await sql`SELECT post_id, choice FROM votes WHERE voter = ${voter}`;
    for (const v of vs) voted[v.post_id] = v.choice;
  }
  return rows.map(r => {
    const [pa, pb] = pct(r.va, r.vb);
    return {
      id: r.id,
      q: r.q,
      a: [r.opt_a, r.opt_b],
      v: [pa, pb],
      total: r.va + r.vb,
      seed: r.is_seed,
      myVote: voted[r.id] !== undefined ? voted[r.id] : null,
    };
  });
}

export async function createPost({ id, q, optA, optB }) {
  await ensureSchema();
  await sql`
    INSERT INTO posts (id, q, opt_a, opt_b, va, vb)
    VALUES (${id}, ${q}, ${optA}, ${optB}, 0, 0)`;
  const [row] = await sql`SELECT id, q, opt_a, opt_b, va, vb FROM posts WHERE id = ${id}`;
  const [pa, pb] = pct(row.va, row.vb);
  return { id: row.id, q: row.q, a: [row.opt_a, row.opt_b], v: [pa, pb], total: 0, seed: false, myVote: null };
}

/* 投票：一人一帖只算一次（按 voter 去重） */
export async function votePost({ id, choice, voter }) {
  await ensureSchema();
  const c = choice === 1 ? 1 : 0;
  const inserted = await sql`
    INSERT INTO votes (post_id, voter, choice)
    VALUES (${id}, ${voter}, ${c})
    ON CONFLICT (post_id, voter) DO NOTHING
    RETURNING post_id`;
  if (inserted.length > 0) {
    if (c === 0) await sql`UPDATE posts SET va = va + 1 WHERE id = ${id}`;
    else         await sql`UPDATE posts SET vb = vb + 1 WHERE id = ${id}`;
  }
  const [row] = await sql`SELECT va, vb FROM posts WHERE id = ${id}`;
  if (!row) throw new Error('帖子不存在');
  const [pa, pb] = pct(row.va, row.vb);
  return { v: [pa, pb], total: row.va + row.vb, counted: inserted.length > 0, myVote: c };
}

/* 限流：返回 { ok, used, limit } */
export async function rateLimit(ip, limit) {
  if (!sql) return { ok: true, used: 0, limit }; // 没 DB 不限流
  await ensureSchema();
  const day = new Date().toISOString().slice(0, 10);
  const [row] = await sql`
    INSERT INTO rate_limit (day, ip, count)
    VALUES (${day}, ${ip}, 1)
    ON CONFLICT (day, ip) DO UPDATE SET count = rate_limit.count + 1
    RETURNING count`;
  const used = row.count;
  return { ok: used <= limit, used, limit };
}
