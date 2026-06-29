import 'server-only';
import { rateLimit } from './db';

export function clientIp(req) {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'anon';
}

/* 返回 null 表示放行；否则返回一个 429 友好信息对象 */
export async function guard(req) {
  const limit = parseInt(process.env.DAILY_LIMIT || '40', 10);
  const ip = clientIp(req);
  try {
    const rl = await rateLimit(ip, limit);
    if (!rl.ok) return { used: rl.used, limit: rl.limit };
    return null;
  } catch {
    return null; // DB 出问题不挡用户
  }
}
