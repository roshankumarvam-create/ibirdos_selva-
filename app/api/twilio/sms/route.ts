import { NextResponse } from 'next/server';
import twilio from 'twilio';

const VoiceResponse = twilio.twiml.MessagingResponse;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const body = formData.get('Body') as string;
    const from = formData.get('From') as string;
    
    console.log('📱 SMS from:', from);
    console.log('📱 Message:', body);
    
    const twiml = new VoiceResponse();
    
    twiml.message('Thanks for texting iBirdOS! Our team will contact you soon. Reply STOP to unsubscribe.');
    
    return new Response(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' }
    });
    
  } catch (error) {
    console.error('SMS error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}