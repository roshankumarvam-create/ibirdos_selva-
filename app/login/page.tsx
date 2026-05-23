"use client";

import { FormEvent, useState } from "react";

type LoginResponse = {
  success: boolean;
  error?: string;
  user?: {
    id: string;
    email: string;
    role: string;
    companyId: string;
  };
  company?: {
    id: string;
    name: string;
    plan: string | null;
    subscriptionStatus: string | null;
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
  };
};

export default function LoginPage() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const result = (await response.json()) as LoginResponse;

      if (!response.ok || !result.success) {
        setErrorMessage(result.error ?? "Login failed.");
        return;
      }

      window.location.href = "/dashboard";
    } catch {
      setErrorMessage("Unable to connect to login server.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#07160D] px-4 py-8 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-7xl items-center justify-center">
        <section className="grid w-full overflow-hidden rounded-[40px] border border-[#D8B767]/30 bg-[#0B1F12] shadow-[0_30px_120px_rgba(0,0,0,0.45)] lg:grid-cols-[1.1fr_0.9fr]">
          <div className="relative hidden overflow-hidden bg-[#081A10] p-10 lg:block">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#2B7A38_0%,transparent_32%),radial-gradient(circle_at_bottom_right,#D8B767_0%,transparent_28%)] opacity-40" />

            <div className="relative z-10 flex h-full flex-col justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.38em] text-[#D8B767]">
                  IBIRDOS
                </p>

                <h1 className="mt-10 max-w-xl text-6xl font-black leading-[0.95] tracking-tight">
                  Control kitchen cost.
                  <br />
                  Protect event profit.
                </h1>

                <p className="mt-6 max-w-xl text-base leading-7 text-[#DDE8D9]">
                  Sign in to your company workspace to manage quote approvals,
                  cost alerts, event actions, recipes, invoices, and profit
                  intelligence.
                </p>
              </div>

              <div className="grid gap-4">
                <div className="rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-[#D8B767]">
                    SaaS Engine
                  </p>
                  <p className="mt-3 text-lg font-black">
                    Invoice → Ingredient → Recipe → Event → Profit → Alert
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                    <p className="text-2xl font-black">AI</p>
                    <p className="mt-1 text-xs text-[#C7D5C9]">Cost Brain</p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                    <p className="text-2xl font-black">$</p>
                    <p className="mt-1 text-xs text-[#C7D5C9]">Margin Guard</p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                    <p className="text-2xl font-black">Ops</p>
                    <p className="mt-1 text-xs text-[#C7D5C9]">Kitchen Flow</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#F7F3EA] p-6 text-[#081A10] sm:p-8 lg:p-12">
            <div className="mx-auto flex max-w-md flex-col justify-center">
              <div className="mb-8 text-center lg:text-left">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#D8B767] bg-[#081A10] text-xl font-black text-[#D8B767] lg:mx-0">
                  iB
                </div>

                <p className="mt-6 text-xs font-black uppercase tracking-[0.28em] text-[#8B6F2E]">
                  Secure Workspace Login
                </p>

                <h2 className="mt-3 text-4xl font-black tracking-tight">
                  Welcome back
                </h2>

                <p className="mt-3 text-sm leading-6 text-[#647064]">
                  Access your company dashboard, subscription-gated workspace,
                  and operating command center.
                </p>
              </div>

              <form
                onSubmit={handleLogin}
                className="rounded-[32px] border border-[#D7C7A3] bg-white p-5 shadow-[0_22px_70px_rgba(8,26,16,0.12)] sm:p-6"
              >
                <label className="block">
                  <span className="text-sm font-black text-[#081A10]">
                    Email
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-[#D7C7A3] bg-[#FFFCF5] px-4 py-3 text-sm font-semibold text-[#081A10] outline-none transition focus:border-[#081A10] focus:ring-4 focus:ring-[#D8B767]/20"
                    placeholder="owner@company.com"
                    autoComplete="email"
                    required
                    suppressHydrationWarning // CHANGED
                  />
                </label>

                <label className="mt-4 block">
                  <span className="text-sm font-black text-[#081A10]">
                    Password
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-[#D7C7A3] bg-[#FFFCF5] px-4 py-3 text-sm font-semibold text-[#081A10] outline-none transition focus:border-[#081A10] focus:ring-4 focus:ring-[#D8B767]/20"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                    suppressHydrationWarning // CHANGED
                  />
                </label>

                {errorMessage.length > 0 ? (
                  <div className="mt-4 rounded-2xl border border-[#E7B8A7] bg-[#FFF3EC] px-4 py-3 text-sm font-bold text-[#A23416]">
                    {errorMessage}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="mt-5 w-full rounded-2xl bg-[#081A10] px-5 py-3 text-sm font-black text-white transition hover:bg-[#123B24] disabled:cursor-not-allowed disabled:opacity-60"
                  suppressHydrationWarning // CHANGED
                >
                  {isLoading ? "Signing in..." : "Sign in to dashboard"}
                </button>

                <div className="mt-5 rounded-2xl border border-[#D8B767] bg-[#FFF8E8] p-4">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-[#8B6F2E]">
                    Subscription Access
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#647064]">
                    Dashboard access is allowed only when the company
                    subscription is active or trialing.
                  </p>
                </div>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm font-semibold text-[#647064]">
                  New company workspace?
                </p>
                <a
                  href="/signup"
                  className="mt-2 inline-flex rounded-full border border-[#081A10] px-5 py-2 text-sm font-black text-[#081A10]"
                >
                  Create workspace
                </a>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <TrustBadge label="Company Secure" />
                <TrustBadge label="Stripe Gated" />
                <TrustBadge label="Role Based" />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function TrustBadge({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-[#D7C7A3] bg-white px-4 py-3 text-center text-xs font-black uppercase tracking-[0.16em] text-[#8B6F2E]">
      {label}
    </div>
  );
}