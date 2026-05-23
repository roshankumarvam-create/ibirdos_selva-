"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

type SignupResponse = {
  success?: boolean;
  ok?: boolean;
  error?: string;
};

export default function SignupPage() {
  const router = useRouter();

  const [companyName, setCompanyName] = useState<string>("");
  const [ownerName, setOwnerName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  async function handleSignup(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyName,
          ownerName,
          email,
          password,
        }),
      });

      const data = (await response.json()) as SignupResponse;

      if (!response.ok || (!data.success && !data.ok)) {
        throw new Error(data.error ?? "Could not create workspace.");
      }

      router.push("/dashboard");
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Could not create workspace.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#061A10] px-4 py-8">
      <section className="mx-auto grid max-w-6xl overflow-hidden rounded-[2rem] bg-[#f8f4ec] shadow-2xl md:grid-cols-2">
        <div className="bg-[#062414] p-8 text-white md:p-12">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-[#f1c75b]">
            iBirdOS
          </p>

          <h1 className="mt-10 text-5xl font-black leading-tight">
            Create your company workspace.
          </h1>

          <p className="mt-6 max-w-md text-base text-white/80">
            Company-secure workspace for invoices, recipes, events, kitchen packets, and profit control.
          </p>
        </div>

        <div className="p-8 md:p-12">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-[#8a6510]">
            New Workspace
          </p>

          <h2 className="mt-4 text-3xl font-black text-[#062414]">
            Create workspace
          </h2>

          <form onSubmit={handleSignup} className="mt-8 space-y-4">
            <label className="block">
              <span className="text-sm font-black text-[#111827]">
                Company name
              </span>
              <input
               suppressHydrationWarning 
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#d7c7ab] px-4 py-3 text-sm outline-none"
              />
            </label>

            <label className="block">
              <span className="text-sm font-black text-[#111827]">
                Owner name
              </span>
              <input
              suppressHydrationWarning 
                value={ownerName}
                onChange={(event) => setOwnerName(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#d7c7ab] px-4 py-3 text-sm outline-none"
              />
            </label>

            <label className="block">
              <span className="text-sm font-black text-[#111827]">
                Email
              </span>
              <input
              suppressHydrationWarning 
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#d7c7ab] px-4 py-3 text-sm outline-none"
              />
            </label>

            <label className="block">
              <span className="text-sm font-black text-[#111827]">
                Password
              </span>
              <input
              suppressHydrationWarning 
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#d7c7ab] px-4 py-3 text-sm outline-none"
              />
            </label>

            {error ? (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-[#062414] px-5 py-3 text-sm font-black text-white disabled:opacity-60"
            >
              {loading ? "Creating..." : "Create workspace"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="text-sm font-black text-[#062414] underline"
            >
              Back to login
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}