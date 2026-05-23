import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { location, businessType } = await req.json();
    
    console.log('🔍 Scraping leads from:', location);
    console.log('🏪 Business type:', businessType);
    
    // Simulate finding leads
    const mockLeads = [
      {
        businessName: "Joe's Pizza",
        phoneNumber: "+1-206-555-0101",
        address: "123 Main St, Seattle, WA",
        rating: 4.5,
        source: 'google_maps'
      },
      {
        businessName: "Maria's Tacos",
        phoneNumber: "+1-206-555-0102",
        address: "456 Pike St, Seattle, WA",
        rating: 4.8,
        source: 'google_maps'
      },
      {
        businessName: "Golden Dragon Restaurant",
        phoneNumber: "+1-206-555-0103",
        address: "789 1st Ave, Seattle, WA",
        rating: 4.2,
        source: 'google_maps'
      }
    ];
    
    return NextResponse.json({ 
      success: true,
      leads_found: mockLeads.length,
      leads: mockLeads,
      message: `Found ${mockLeads.length} leads in ${location}`
    });
    
  } catch (error) {
    console.error('Scraping error:', error);
    return NextResponse.json({ 
      error: 'Failed to scrape leads' 
    }, { status: 500 });
  }
}