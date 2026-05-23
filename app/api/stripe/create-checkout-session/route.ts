import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import Stripe from "stripe";
import { getSessionFromRequest } from "../../../lib/server-auth";

export const dynamic = "force-dynamic";

type CompanyRow = {
  id: string;
  name: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: string | null;
  subscription_status: string | null;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    return JSON.stringify(error);
  }

  return "Unknown Stripe checkout error";
}

export async function POST(request: NextRequest) {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const coreRestaurantPriceId =
      process.env.STRIPE_CORE_RESTAURANT_PRICE_ID;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    if (!databaseUrl) {
      return NextResponse.json(
        { success: false, error: "DATABASE_URL is missing" },
        { status: 500 }
      );
    }

    if (!stripeSecretKey) {
      return NextResponse.json(
        { success: false, error: "STRIPE_SECRET_KEY is missing" },
        { status: 500 }
      );
    }

    if (!coreRestaurantPriceId) {
      return NextResponse.json(
        { success: false, error: "STRIPE_CORE_RESTAURANT_PRICE_ID is missing" },
        { status: 500 }
      );
    }

    const session = getSessionFromRequest(request);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Not logged in" },
        { status: 401 }
      );
    }

    const sql = postgres(databaseUrl, {
      ssl: databaseUrl.includes("localhost") ? false : "require",
    });

    const stripe = new Stripe(stripeSecretKey);

    const companies = await sql`
      SELECT
        id,
        name,
        stripe_customer_id,
        stripe_subscription_id,
        plan,
        subscription_status
      FROM companies
      WHERE id::text = ${session.company_id}
      LIMIT 1;
    `;

    const company = companies[0] as CompanyRow | undefined;

    if (!company) {
      return NextResponse.json(
        { success: false, error: "Company not found" },
        { status: 404 }
      );
    }

    let stripeCustomerId = company.stripe_customer_id;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: session.email,
        name: company.name,
        metadata: {
          company_id: company.id,
          user_id: session.user_id,
          source: "ibirdos",
        },
      });

      stripeCustomerId = customer.id;

      await sql`
        UPDATE companies
        SET stripe_customer_id = ${stripeCustomerId}
        WHERE id::text = ${company.id};
      `;
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      payment_method_types: ["card"], // CHANGED
      line_items: [
        {
          price: coreRestaurantPriceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/dashboard?stripe=success`,
      cancel_url: `${appUrl}/billing?stripe=cancelled`,
      client_reference_id: company.id,
      metadata: {
        company_id: company.id,
        user_id: session.user_id,
        plan: "core_restaurant",
      },
      subscription_data: {
        metadata: {
          company_id: company.id,
          user_id: session.user_id,
          plan: "core_restaurant",
        },
      },
    });

    await sql.end();

    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutSession.url,
    });
  } catch (error: unknown) {
    console.error("POST /api/stripe/create-checkout-session error:", error);

    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}