import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userState = searchParams.get('state') || 'WA'; // Default to Washington
  
  try {
    const myIngredients = [
      'chicken', 'beef', 'pork', 'fish', 'shrimp',
      'rice', 'pasta', 'bread', 'flour',
      'milk', 'cheese', 'eggs', 'butter',
      'lettuce', 'tomato', 'onion', 'garlic',
      'chocolate', 'coffee', 'nuts', 'peanut'
    ];
    
    // Fetch FDA data
    const fdaResponse = await fetch(
      'https://api.fda.gov/food/enforcement.json?limit=1000'
    );
    
    if (!fdaResponse.ok) {
      throw new Error('FDA API request failed');
    }
    
    const fdaData = await fdaResponse.json();
    
    // Filter by ingredients AND state
    const relevantAlerts = fdaData.results.filter((alert: any) => {
      // Check if ingredient matches
      const ingredientMatch = myIngredients.some(ingredient => 
        alert.product_description?.toLowerCase().includes(ingredient)
      );
      
      if (!ingredientMatch) return false;
      
      // Check if state matches
      const distribution = alert.distribution_pattern?.toLowerCase() || '';
      const alertState = alert.state || '';
      
      // Include if:
      // 1. Nationwide distribution
      // 2. Alert is from user's state
      // 3. Distribution includes user's state
      const stateMatch = 
        distribution.includes('nationwide') ||
        distribution.includes('us') ||
        alertState === userState ||
        distribution.includes(userState.toLowerCase());
      
      return stateMatch;
    });
    
    return NextResponse.json({
      success: true,
      user_state: userState,
      alerts_found: relevantAlerts.length,
      total_scanned: fdaData.results.length,
      alerts: relevantAlerts.map((a: any) => ({
        product: a.product_description,
        reason: a.reason_for_recall,
        date: a.recall_initiation_date,
        company: a.recalling_firm || 'Unknown',
        state: a.state || 'Not specified',
        distribution: a.distribution_pattern || 'Not specified'
      }))
    });
    
  } catch (error) {
    console.error('FDA check error:', error);
    return NextResponse.json({ 
      error: 'FDA check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}