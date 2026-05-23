import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

type StripeCustomerValue =
  | string
  | Stripe.Customer
  | Stripe.DeletedCustomer
  | null;

type SubscriptionWithPeriod = Stripe.Subscription & {
  current_period_end?: number | null;
  items?: {
    data: Array<{
      current_period_end?: number | null;
    }>;
  };
};

type CompanyUpdateInput = {
  companyId: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  plan: string;
  subscriptionStatus: string;
  currentPeriodEnd: Date | null;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    return JSON.stringify(error);
  }

  return "Unknown Stripe webhook error";
}

function getStripeId(value: StripeCustomerValue): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  return value.id;
}

function getSubscriptionPeriodEnd(subscription: Stripe.Subscription): Date | null {
  const subscriptionWithPeriod = subscription as SubscriptionWithPeriod; // CHANGED

  const periodEnd =
    subscriptionWithPeriod.current_period_end ??
    subscriptionWithPeriod.items?.data[0]?.current_period_end ??
    null; // CHANGED

  if (!periodEnd) {
    return null;
  }

  return new Date(periodEnd * 1000);
}

async function updateCompanySubscription(input: CompanyUpdateInput): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is missing");
  }

  const sql = postgres(databaseUrl, {
    ssl: databaseUrl.includes("localhost") ? false : "require",
  });

  try {
    if (input.companyId) {
      await sql`
        UPDATE companies
        SET
          stripe_customer_id = COALESCE(${input.stripeCustomerId}, stripe_customer_id),
          stripe_subscription_id = COALESCE(${input.stripeSubscriptionId}, stripe_subscription_id),
          plan = ${input.plan},
          subscription_status = ${input.subscriptionStatus},
          current_period_end = COALESCE(${input.currentPeriodEnd}, current_period_end),
          subscription_status = ${input.subscriptionStatus},
          current_period_end = COALESCE(${input.currentPeriodEnd}, current_period_end)
          WHERE id::text = ${input.companyId};
      `;

      return;
    }

    if (input.stripeSubscriptionId) {
      await sql`
        UPDATE companies
        SET
          stripe_customer_id = COALESCE(${input.stripeCustomerId}, stripe_customer_id),
          plan = ${input.plan},
          subscription_status = ${input.subscriptionStatus},
          current_period_end = COALESCE(${input.currentPeriodEnd}, current_period_end), 
          subscription_status = ${input.subscriptionStatus},
          current_period_end = COALESCE(${input.currentPeriodEnd}, current_period_end)
          WHERE stripe_subscription_id = ${input.stripeSubscriptionId};
      `;

      return;
    }

    if (input.stripeCustomerId) {
      await sql`
        UPDATE companies
        SET
          plan = ${input.plan},
          subscription_status = ${input.subscriptionStatus},
          current_period_end = COALESCE(${input.currentPeriodEnd}, current_period_end)
          subscription_status = ${input.subscriptionStatus},
          current_period_end = COALESCE(${input.currentPeriodEnd}, current_period_end)
          WHERE stripe_customer_id = ${input.stripeCustomerId};
      `;
    }
  } finally {
    await sql.end();
  }
}

export async function POST(request: NextRequest) {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripeSecretKey) {
      return NextResponse.json(
        { success: false, error: "STRIPE_SECRET_KEY is missing" },
        { status: 500 }
      );
    }

    if (!webhookSecret) {
      return NextResponse.json(
        { success: false, error: "STRIPE_WEBHOOK_SECRET is missing" },
        { status: 500 }
      );
    }

    const stripe = new Stripe(stripeSecretKey);
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { success: false, error: "Missing Stripe signature header" },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (error: unknown) {
      return NextResponse.json(
        {
          success: false,
          error: `Webhook signature verification failed: ${getErrorMessage(
            error
          )}`,
        },
        { status: 400 }
      );
    }

    if (event.type === "checkout.session.completed") {
      const checkoutSession = event.data.object as Stripe.Checkout.Session;

      const companyId = checkoutSession.metadata?.company_id ?? null;
      const stripeCustomerId = getStripeId(checkoutSession.customer);
      const stripeSubscriptionId =
        typeof checkoutSession.subscription === "string"
          ? checkoutSession.subscription
          : checkoutSession.subscription?.id ?? null;

      await updateCompanySubscription({
        companyId,
        stripeCustomerId,
        stripeSubscriptionId,
        plan: checkoutSession.metadata?.plan ?? "core_restaurant",
        subscriptionStatus: "active",
        currentPeriodEnd:
  stripeSubscriptionId
    ? getSubscriptionPeriodEnd(await stripe.subscriptions.retrieve(stripeSubscriptionId))
    : null,
      });
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated"
    ) {
      const subscription = event.data.object as Stripe.Subscription;

      await updateCompanySubscription({
        companyId: subscription.metadata.company_id ?? null,
        stripeCustomerId: getStripeId(subscription.customer),
        stripeSubscriptionId: subscription.id,
        plan: subscription.metadata.plan ?? "core_restaurant",
        subscriptionStatus: subscription.status,
        currentPeriodEnd: getSubscriptionPeriodEnd(subscription),
      });
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;

      await updateCompanySubscription({
        companyId: subscription.metadata.company_id ?? null,
        stripeCustomerId: getStripeId(subscription.customer),
        stripeSubscriptionId: subscription.id,
        plan: subscription.metadata.plan ?? "core_restaurant",
        subscriptionStatus: "canceled",
        currentPeriodEnd: getSubscriptionPeriodEnd(subscription),
      });
    }

    return NextResponse.json({
      success: true,
      received: true,
      eventType: event.type,
    });
  } catch (error: unknown) {
    console.error("POST /api/stripe/webhook error:", error);

    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}