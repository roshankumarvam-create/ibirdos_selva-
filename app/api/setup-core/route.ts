import { NextResponse } from 'next/server';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!, {
  ssl: 'require',
});

export async function GET(req: Request) {
  try {
    // Get all companies
    const companies = await sql`
      SELECT DISTINCT company_id 
      FROM ingredients
    `;
    
    const results = [];
    
    // Check FDA for each company
    for (const company of companies) {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/cron/fda-check?company_id=${company.company_id}`
      );
      const data = await response.json();
      
      if (data.alerts_found > 0) {
        // Save alerts to database
        for (const alert of data.alerts) {
          await sql`
            INSERT INTO fda_alerts (
              company_id,
              product,
              reason,
              recall_date,
              state,
              distribution,
              status,
              created_at
            ) VALUES (
              ${company.company_id},
              ${alert.product},
              ${alert.reason},
              ${alert.date},
              ${alert.state},
              ${alert.distribution},
              'new',
              NOW()
            )
            ON CONFLICT (company_id, product, recall_date) 
            DO NOTHING
          `;
        }
        
        results.push({
          company_id: company.company_id,
          alerts: data.alerts_found
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      companies_checked: companies.length,
      total_alerts: results.reduce((sum, r) => sum + r.alerts, 0),
      results
    });
    
  } catch (error) {
    return NextResponse.json({ 
      error: 'Daily check failed',
      details: error instanceof Error ? error.message : 'Unknown'
    }, { status: 500 });
  }
}