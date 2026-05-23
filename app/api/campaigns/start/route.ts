import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { campaignName, location, maxCalls } = await req.json();
    
    console.log('🚀 Starting campaign:', campaignName);
    console.log('📍 Location:', location);
    console.log('📞 Max calls:', maxCalls);
    
    // For now, just simulate the campaign
    // Later we'll add real calling logic
    
    return NextResponse.json({ 
      success: true,
      message: `Campaign "${campaignName}" started! AI will call ${maxCalls} leads in ${location}.`,
      campaign: {
        name: campaignName,
        location,
        maxCalls,
        status: 'active'
      }
    });
    
  } catch (error) {
    console.error('Campaign error:', error);
    return NextResponse.json({ 
      error: 'Failed to start campaign' 
    }, { status: 500 });
  }
}