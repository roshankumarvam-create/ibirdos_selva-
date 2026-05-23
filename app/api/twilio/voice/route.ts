import { NextResponse } from 'next/server';
import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const speechResult = formData.get('SpeechResult');
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const callSid = formData.get('CallSid') as string;
    
    const twiml = new VoiceResponse();
    
    // Determine if this is sales or client call
    const isIBirdOSSales = to === process.env.TWILIO_IBIRDOS_SALES_NUMBER;
    
    if (isIBirdOSSales) {
      // iBirdOS Sales AI Agent
      return handleSalesCall(twiml, speechResult, from, callSid);
    } else {
      // Client order call
      return handleOrderCall(twiml, speechResult, from, to, callSid);
    }
    
  } catch (error) {
    console.error('Twilio error:', error);
    const twiml = new VoiceResponse();
    twiml.say('Sorry, technical difficulties. Please try again.');
    return new Response(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' }
    });
  }
}

// Sales AI Agent (NO DATABASE)
async function handleSalesCall(twiml: any, speechResult: any, from: string, callSid: string) {
  if (!speechResult) {
    const gather = twiml.gather({
      input: ['speech'],
      action: '/api/twilio/voice',
      language: 'en-US',
      speechTimeout: '3'
    });
    
    gather.say({
      voice: 'Polly.Joanna'
    }, 'Hi! Thanks for calling iBirdOS! Are you interested in learning about our kitchen intelligence system for restaurants?');
    
  } else {
    const intent = analyzeIntent(speechResult.toString());
    
    if (intent === 'interested') {
      twiml.say({
        voice: 'Polly.Joanna'
      }, 'Wonderful! iBirdOS helps restaurants with FDA alerts, AI voice ordering, and production management. I\'ll have our sales team call you back within 24 hours.');
      
      console.log('✅ HOT LEAD:', from);
      
    } else if (intent === 'not_interested') {
      twiml.say('No problem! If you change your mind, call anytime. Have a great day!');
      console.log('❌ NOT INTERESTED:', from);
      
    } else {
      twiml.say('I can help you learn about our system. Would you like a quick overview?');
    }
    
    console.log('📞 Sales Call:', { from, callSid, transcript: speechResult });
  }
  
  return new Response(twiml.toString(), {
    headers: { 'Content-Type': 'text/xml' }
  });
}

// Client Order AI (NO DATABASE)
async function handleOrderCall(twiml: any, speechResult: any, from: string, to: string, callSid: string) {
  const restaurant = { id: 'rest-001', name: 'Joe\'s Pizza' };
  
  if (!speechResult) {
    const gather = twiml.gather({
      input: ['speech'],
      action: '/api/twilio/voice',
      language: 'en-US',
      speechTimeout: '3'
    });
    
    gather.say({
      voice: 'Polly.Joanna'
    }, `Welcome to ${restaurant.name}! What would you like to order?`);
    
  } else {
    // Process order
    try {
      const response = await fetch('http://localhost:3000/api/voice-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          transcript: speechResult.toString(),
          language: 'en',
          phone: from
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        twiml.say({
          voice: 'Polly.Joanna'
        }, `Perfect! Your order is confirmed. Order number ${data.order.id.slice(-6)}. Thank you!`);
        
        console.log('✅ Order placed:', data.order);
      }
    } catch (error) {
      twiml.say('Sorry, I had trouble with that order. Please try again.');
    }
  }
  
  return new Response(twiml.toString(), {
    headers: { 'Content-Type': 'text/xml' }
  });
}

function analyzeIntent(text: string) {
  const keywords = text.toLowerCase();
  if (keywords.includes('yes') || keywords.includes('interested') || keywords.includes('tell me more')) {
    return 'interested';
  } else if (keywords.includes('no') || keywords.includes('not interested')) {
    return 'not_interested';
  }
  return 'unclear';
}