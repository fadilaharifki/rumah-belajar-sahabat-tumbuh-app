import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST() {
  try {
    await supabase.auth.signOut();
    return NextResponse.json({ success: true, message: 'Berhasil keluar' });
  } catch (err: any) {
    return NextResponse.json({ success: true, note: 'Local sign out fallback' });
  }
}
