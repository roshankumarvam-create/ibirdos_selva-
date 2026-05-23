import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
});

interface OrderItem {
  name: string;
  quantity: number;
  mods: string[];
  station: string;
}

interface Order {
  id: string;
  timestamp: string;
  items: OrderItem[];
  special_instructions?: string;
  customer_name?: string;
  language: string;
  original_transcript: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const transcript = body.transcript;
    const language = body.language || 'en';
    
    if (!transcript) {
      return NextResponse.json({ error: 'No transcript provided' }, { status: 400 });
    }
    
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }
    
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `Extract order from: "${transcript}". Return ONLY JSON (no markdown):
{
  "items": [{"name": "Item Name", "quantity": 1, "mods": [], "station": "hot"}],
  "special_instructions": "",
  "customer_name": "",
  "language": "${language}"
}`
      }]
    });
    
    const responseText = message.content[0].type === 'text' ? message.content[0].text : '{}';
    const cleanJson = responseText.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    
    const orderData: Order = {
      id: `ORD-${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...parsed,
      original_transcript: transcript
    };
    
    console.log('\n🖨️ ORDER RECEIVED:');
    console.log(JSON.stringify(orderData, null, 2));
    
    return NextResponse.json({ success: true, order: orderData });
    
  } catch (error) {
    console.error('Voice order error:', error);
    return NextResponse.json({ 
      error: 'Failed to process order',
      details: error instanceof Error ? error.message : 'Unknown'
    }, { status: 500 });
  }
}