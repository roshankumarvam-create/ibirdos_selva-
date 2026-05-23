import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
});

export async function POST(req: Request) {
  try {
    const { action, platform } = await req.json();
    
    if (platform === 'google') {
      const googleToken = process.env.GOOGLE_MY_BUSINESS_TOKEN;
      const gmb = await fetch('https://mybusiness.googleapis.com/v4/accounts', {
        headers: { 
          Authorization: `Bearer ${googleToken}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await gmb.json();
      return NextResponse.json(data);
    }
    
    if (platform === 'yelp') {
      const yelpKey = process.env.YELP_API_KEY;
      const bizId = process.env.YELP_BUSINESS_ID;
      
      const yelp = await fetch(
        `https://api.yelp.com/v3/businesses/${bizId}/reviews`,
        {
          headers: { 
            Authorization: `Bearer ${yelpKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const reviews = await yelp.json();
      
      if (reviews.reviews?.length > 0) {
        // AI response generator
        const message = await client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 200,
          messages: [{
            role: 'user',
            content: `Write a professional, friendly response to this Yelp review: "${reviews.reviews[0].text}"`
          }]
        });
        
        const suggestedReply = message.content[0].type === 'text' 
          ? message.content[0].text 
          : '';
        
        return NextResponse.json({ 
          review: reviews.reviews[0],
          suggested_reply: suggestedReply 
        });
      }
    }
    
    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
    
  } catch (error) {
    console.error('SEO manager error:', error);
    return NextResponse.json({ 
      error: 'Failed to process request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}