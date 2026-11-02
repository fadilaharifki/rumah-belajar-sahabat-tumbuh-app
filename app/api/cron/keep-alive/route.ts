import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Security check: If CRON_SECRET is defined in environment variables, verify the Authorization header
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized: Invalid or missing CRON_SECRET' },
      { status: 401 }
    );
  }

  const startTime = Date.now();

  try {
    // Send a lightweight query to Supabase to generate active API traffic and prevent free-tier pause
    const { data, error } = await supabase
      .from('roles')
      .select('id, name')
      .limit(1);

    if (error) {
      return NextResponse.json(
        {
          success: false,
          message: 'Error communicating with Supabase',
          error: error.message,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    const latencyMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: 'Supabase keep-alive ping succeeded',
      latency: `${latencyMs}ms`,
      timestamp: new Date().toISOString(),
      dataPreview: data
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        success: false,
        message: 'Unexpected error during keep-alive ping',
        error: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
