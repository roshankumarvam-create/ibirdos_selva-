import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const recordingUrl = formData.get('RecordingUrl') as string;
    const callSid = formData.get('CallSid') as string;
    const duration = formData.get('RecordingDuration') as string;
    
    console.log('🎙️ Recording saved:');
    console.log('  Call:', callSid);
    console.log('  Duration:', duration, 'seconds');
    console.log('  URL:', recordingUrl);
    
    // In production, download and save to /recordings/super-admin/
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Recording callback error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}