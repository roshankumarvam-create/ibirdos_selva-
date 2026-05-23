import { NextResponse } from "next/server";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, {
  ssl: "require",
});

export async function GET() {
  try {
    const columns = await sql`
      SELECT 
        table_name,
        column_name,
        data_type,
        column_default
      FROM information_schema.columns
      WHERE table_name IN (
        'invoices',
        'ingredients',
        'invoice_lines',
        'price_history',
        'alerts'
      )
      ORDER BY table_name, ordinal_position;
    `;

    return NextResponse.json({
      success: true,
      columns,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}