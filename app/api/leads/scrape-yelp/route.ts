import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { location, category } = await req.json();
    
    console.log('🔍 Scraping Yelp:', location);
    
    // Mock Yelp results
    const mockLeads = [
      {
        businessName: "Seattle Fish House",
        phoneNumber: "+1-206-555-0201",
        address: "101 Waterfront, Seattle, WA",
        rating: 4.6,
        reviewCount: 342,
        source: 'yelp'
      }
    ];
    
    return NextResponse.json({ 
      success: true,
      leads: mockLeads 
    });
    
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed' 
    }, { status: 500 });
  }
}