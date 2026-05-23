import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function GET() {
  try {
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!
    });

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: 'Say "iBirdOS setup successful!" in one sentence'
      }]
    });

    return NextResponse.json({
      status: '✅ SUCCESS',
      anthropic_key: process.env.ANTHROPIC_API_KEY ? '✅ Set' : '❌ Missing',
      smtp: process.env.SMTP_USER ? '✅ Set' : '⚠️ Optional',
      response: message.content[0].type === 'text' ? message.content[0].text : ''
    });

  } catch (error) {
    return NextResponse.json({
      status: '❌ ERROR',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}