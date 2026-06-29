import { NextResponse } from 'next/server';
import { aiConfigured, providerName } from '@/lib/llm';
import { isConfigured as dbConfigured } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'jiejie-xiaoxiaole',
    ai: aiConfigured(),
    provider: providerName(),
    db: dbConfigured(),
    ts: Date.now(),
  });
}
