import { NextResponse } from 'next/server';
import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

export async function POST(req: Request) {
  const formData = await req.formData();
  const speechResult = formData.get('SpeechResult');
  const leadId = formData.get('leadId') as string;
  
  const twiml = new VoiceResponse();
  
  if (!speechResult) {
    // OPENING PITCH
    const gather = twiml.gather({
      input: ['speech'],
      action: `/api/outbound/ai-script?leadId=${leadId}`,
      language: 'en-US',
      speechTimeout: '3'
    });
    
     gather.say(
     { voice: "Polly.Joanna" }, 
     "Hi, this is Sarah from iBirdOS. Do you have 60 seconds to learn how we can help you control kitchen cost and protect event profit?", // CHANGED
    ); 
  } else {
    // Analyze response
    const response = speechResult.toString().toLowerCase();
    
    if (response.includes('yes') || response.includes('sure')) {
      twiml.say({
        voice: 'Polly.Joanna'
      }, 'Great! iBirdOS gives you FDA alerts, AI voice ordering, and production tracking. Can I send you a demo video?');
      
      console.log('✅ INTERESTED LEAD');
      
    } else if (response.includes('no') || response.includes('busy')) {
      twiml.say('No problem! Have a great day!');
      twiml.hangup();
      
      console.log('❌ NOT INTERESTED');
    } else {
      twiml.say('Let me send you more info. Thanks for your time!');
    }
  }
  
  return new Response(twiml.toString(), {
    headers: { 'Content-Type': 'text/xml' }
  });
}