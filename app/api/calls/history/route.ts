import { NextResponse } from 'next/server';

// Mock call history data
const mockCalls = [
  {
    id: '1',
    callSid: 'CA123',
    phoneNumber: '+1-206-555-0101',
    duration: 125,
    transcript: 'I want 2 chicken bowls',
    callType: 'order',
    orderData: {
      items: [
        { name: 'Chicken Bowl', quantity: 2, mods: [], station: 'hot' }
      ]
    },
    recordingUrl: null,
    createdAt: new Date().toISOString(),
    companyId: 'rest-001'
  },
  {
    id: '2',
    callSid: 'CA456',
    phoneNumber: '+1-206-555-0202',
    duration: 89,
    transcript: 'Are you interested in iBirdOS?',
    callType: 'sales',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    companyId: null
  }
];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');
  
  try {
    // Filter by company if provided
    const calls = companyId 
      ? mockCalls.filter(c => c.companyId === companyId)
      : mockCalls;
    
    return NextResponse.json({ calls });
    
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}