import { NextResponse } from "next/server";
import postgres from "postgres";

export const dynamic = "force-dynamic";

const sql = postgres(process.env.DATABASE_URL!, {
  ssl: "require",
});

async function getCurrentUser() {
  const users = await sql`
    SELECT id, email, role, company_id
    FROM users
    WHERE email = 'owner@ibirdos.com'
    LIMIT 1;
  `;

  const user = users[0];

  if (!user) throw new Error("User not found");
  if (!user.company_id) throw new Error("User missing company_id");

  return user;
}

async function ensureCoreColumns() {
  await sql`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
  `;

  await sql`
    ALTER TABLE ingredients
    ADD COLUMN IF NOT EXISTS company_id UUID,
    ADD COLUMN IF NOT EXISTS name TEXT,
    ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'lb',
    ADD COLUMN IF NOT EXISTS latest_cost NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
  `;

  await sql`
    ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS company_id UUID,
    ADD COLUMN IF NOT EXISTS vendor_name TEXT,
    ADD COLUMN IF NOT EXISTS invoice_number TEXT,
    ADD COLUMN IF NOT EXISTS invoice_date DATE,
    ADD COLUMN IF NOT EXISTS invoice_total NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'review',
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
  `;

  await sql`
    ALTER TABLE invoice_lines
    ADD COLUMN IF NOT EXISTS company_id UUID,
    ADD COLUMN IF NOT EXISTS invoice_id UUID,
    ADD COLUMN IF NOT EXISTS ingredient_id UUID,
    ADD COLUMN IF NOT EXISTS item_name TEXT,
    ADD COLUMN IF NOT EXISTS item_text TEXT,
    ADD COLUMN IF NOT EXISTS quantity NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'lb',
    ADD COLUMN IF NOT EXISTS unit_cost NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS line_total NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
  `;

  await sql`
    ALTER TABLE price_history
    ADD COLUMN IF NOT EXISTS company_id UUID,
    ADD COLUMN IF NOT EXISTS ingredient_id UUID,
    ADD COLUMN IF NOT EXISTS old_cost NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS new_cost NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS change_amount NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS change_percent NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'invoice',
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
  `;

  await sql`
    ALTER TABLE alerts
    ADD COLUMN IF NOT EXISTS company_id UUID,
    ADD COLUMN IF NOT EXISTS ingredient_id UUID,
    ADD COLUMN IF NOT EXISTS title TEXT,
    ADD COLUMN IF NOT EXISTS message TEXT,
    ADD COLUMN IF NOT EXISTS alert_type TEXT DEFAULT 'price_change',
    ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'info',
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new',
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
  `;
}

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    await ensureCoreColumns();

    const result = await sql.begin(async (tx) => {
      const vendorName = "Test Vendor";
      const itemName = "Chicken Breast";
      const unit = "lb";
      const quantity = 40;
      const newCost = 3.85;
      const lineTotal = quantity * newCost;

      const existingIngredients = await tx`
        SELECT id, name, latest_cost, unit
        FROM ingredients
        WHERE company_id = ${currentUser.company_id}
        AND LOWER(name) = LOWER(${itemName})
        LIMIT 1;
      `;

      let ingredient = existingIngredients[0];
      const oldCost = Number(ingredient?.latest_cost || 0);

      if (!ingredient) {
        const insertedIngredients = await tx`
          INSERT INTO ingredients (
            company_id,
            name,
            unit,
            latest_cost
          )
          VALUES (
            ${currentUser.company_id},
            ${itemName},
            ${unit},
            ${newCost}
          )
          RETURNING *;
        `;

        ingredient = insertedIngredients[0];
      } else {
        const updatedIngredients = await tx`
          UPDATE ingredients
          SET
            latest_cost = ${newCost},
            unit = ${unit},
            updated_at = NOW()
          WHERE id = ${ingredient.id}
          AND company_id = ${currentUser.company_id}
          RETURNING *;
        `;

        ingredient = updatedIngredients[0];
      }

      const invoices = await tx`
        INSERT INTO invoices (
          company_id,
          vendor_name,
          invoice_number,
          invoice_date,
          invoice_total,
          status
        )
        VALUES (
          ${currentUser.company_id},
          ${vendorName},
          ${`INV-${Date.now()}`},
          CURRENT_DATE,
          ${lineTotal},
          'processed'
        )
        RETURNING *;
      `;

      const invoice = invoices[0];

      const invoiceLines = await tx`
        INSERT INTO invoice_lines (
          company_id,
          invoice_id,
          ingredient_id,
          item_name,
          item_text,
          quantity,
          unit,
          unit_cost,
          line_total
        )
        VALUES (
          ${currentUser.company_id},
          ${invoice.id},
          ${ingredient.id},
          ${itemName},
          ${itemName},
          ${quantity},
          ${unit},
          ${newCost},
          ${lineTotal}
        )
        RETURNING *;
      `;

      const changeAmount = newCost - oldCost;
      const changePercent =
        oldCost > 0 ? (changeAmount / oldCost) * 100 : 0;

      const priceHistoryRows = await tx`
        INSERT INTO price_history (
          company_id,
          ingredient_id,
          old_cost,
          new_cost,
          change_amount,
          change_percent,
          source
        )
        VALUES (
          ${currentUser.company_id},
          ${ingredient.id},
          ${oldCost},
          ${newCost},
          ${changeAmount},
          ${changePercent},
          'invoice'
        )
        RETURNING *;
      `;

      let alert = null;

      if (oldCost > 0 && Math.abs(changePercent) >= 5) {
        const alertRows = await tx`
          INSERT INTO alerts (
            company_id,
            ingredient_id,
            title,
            message,
            alert_type,
            severity,
            status
          )
          VALUES (
            ${currentUser.company_id},
            ${ingredient.id},
            'Chicken Breast cost changed',
            ${`Chicken Breast changed from $${oldCost.toFixed(
              2
            )}/${unit} to $${newCost.toFixed(2)}/${unit}.`},
            'price_change',
            'warning',
            'new'
          )
          RETURNING *;
        `;

        alert = alertRows[0];
      }

      return {
        invoice,
        invoice_line: invoiceLines[0],
        ingredient,
        price_history: priceHistoryRows[0],
        alert,
      };
    });

    return NextResponse.json({
      success: true,
      message:
        "Invoice engine test passed: invoice → ingredient → price history → alert.",
      company_id: currentUser.company_id,
      data: result,
    });
  } catch (error: any) {
    console.error("test-invoice-engine error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}