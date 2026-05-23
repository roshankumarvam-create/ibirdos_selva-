"use client";

import { useEffect, useState } from "react";

type Company = {
  id: string;
  name: string;
  plan: string | null;
  subscriptionStatus: string | null;
  trialEndsAt: string | null;
  createdAt: string | null;
};

type OwnerUser = {
  id: string;
  email: string;
  role: string;
  companyId: string;
  fullName: string | null;
  createdAt: string | null;
};

type CompaniesResponse = {
  success: boolean;
  companies?: unknown[];
  data?: unknown[];
  error?: string;
};

type CreateCompanyResponse = {
  success: boolean;
  company?: unknown;
  ownerUser?: unknown;
  message?: string;
  error?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function readNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function normalizeCompany(value: unknown): Company | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readString(value.id, "");

  if (!id) {
    return null;
  }

  return {
    id,
    name: readString(value.name, "Unnamed Company"),
    plan: readNullableString(value.plan),
    subscriptionStatus: readNullableString(
      value.subscriptionStatus ?? value.subscription_status,
    ),
    trialEndsAt: readNullableString(value.trialEndsAt ?? value.trial_ends_at),
    createdAt: readNullableString(value.createdAt ?? value.created_at),
  };
}

function normalizeOwnerUser(value: unknown): OwnerUser | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readString(value.id, "");

  if (!id) {
    return null;
  }

  return {
    id,
    email: readString(value.email, ""),
    role: readString(value.role, "owner"),
    companyId: readString(value.companyId ?? value.company_id, ""),
    fullName: readNullableString(value.fullName ?? value.full_name),
    createdAt: readNullableString(value.createdAt ?? value.created_at),
  };
}

function formatDate(value: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString();
}

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyName, setCompanyName] = useState<string>("");
  const [ownerName, setOwnerName] = useState<string>("");
  const [ownerEmail, setOwnerEmail] = useState<string>("");
  const [plan, setPlan] = useState<string>("proof_of_concept");
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>("pilot");
  const [createdOwner, setCreatedOwner] = useState<OwnerUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

  async function loadCompanies(): Promise<void> {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/companies", {
        cache: "no-store",
      });

      const data = (await response.json()) as CompaniesResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Failed to load companies.");
      }

      const source = Array.isArray(data.companies)
        ? data.companies
        : Array.isArray(data.data)
          ? data.data
          : [];

      const normalizedCompanies = source
        .map((item) => normalizeCompany(item))
        .filter((item): item is Company => item !== null);

      setCompanies(normalizedCompanies);
    } catch (caughtError) {
      const cleanMessage =
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong loading companies.";

      setError(cleanMessage);
    } finally {
      setLoading(false);
    }
  }

  async function createPilotCompany(): Promise<void> {
    setSaving(true);
    setError("");
    setMessage("");
    setCreatedOwner(null);

    try {
      const response = await fetch("/api/admin/companies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyName,
          ownerName,
          ownerEmail,
          plan,
          subscriptionStatus,
        }),
      });

      const data = (await response.json()) as CreateCompanyResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Failed to create pilot company.");
      }

      const owner = normalizeOwnerUser(data.ownerUser);

      setCreatedOwner(owner);
      setMessage(data.message ?? "Pilot company created.");
      setCompanyName("");
      setOwnerName("");
      setOwnerEmail("");

      await loadCompanies();
    } catch (caughtError) {
      const cleanMessage =
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong creating company.";

      setError(cleanMessage);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    void loadCompanies();
  }, []);

  return (
    <main className="min-h-screen bg-[#f8f4ec] px-4 py-6 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl border border-[#eadfce] bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#a05a2c]">
            iBirdOS Admin
          </p>

          <h1 className="mt-2 text-3xl font-bold text-[#111827]">
            Pilot Company Creator
          </h1>

          <p className="mt-2 text-sm text-[#6b7280]">
            Create free proof-of-concept restaurant accounts with no card
            required.
          </p>

          {error ? (
            <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </p>
          ) : null}

          {message ? (
            <p className="mt-4 rounded-2xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
              {message}
            </p>
          ) : null}
        </section>

        <section className="rounded-3xl border border-[#eadfce] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-[#111827]">
            Create Restaurant Pilot Account
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-[#374151]">
                Restaurant / Company Name
              </span>
              <input
                suppressHydrationWarning
                type="text"
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                placeholder="Friend Restaurant Demo"
                className="mt-2 w-full rounded-2xl border border-[#eadfce] px-4 py-3 text-sm outline-none"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-[#374151]">
                Owner Name
              </span>
              <input
                suppressHydrationWarning
                type="text"
                value={ownerName}
                onChange={(event) => setOwnerName(event.target.value)}
                placeholder="Restaurant Owner"
                className="mt-2 w-full rounded-2xl border border-[#eadfce] px-4 py-3 text-sm outline-none"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-[#374151]">
                Owner Email
              </span>
              <input
                suppressHydrationWarning
                type="email"
                value={ownerEmail}
                onChange={(event) => setOwnerEmail(event.target.value)}
                placeholder="owner@restaurant.com"
                className="mt-2 w-full rounded-2xl border border-[#eadfce] px-4 py-3 text-sm outline-none"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-[#374151]">
                Plan
              </span>
              <select
                suppressHydrationWarning
                value={plan}
                onChange={(event) => setPlan(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#eadfce] px-4 py-3 text-sm outline-none"
              >
                <option value="proof_of_concept">Proof of Concept</option>
                <option value="starter">Starter</option>
                <option value="growth">Growth</option>
                <option value="pro_ops">Pro Ops</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-[#374151]">
                Subscription Status
              </span>
              <select
                suppressHydrationWarning
                value={subscriptionStatus}
                onChange={(event) => setSubscriptionStatus(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#eadfce] px-4 py-3 text-sm outline-none"
              >
                <option value="pilot">Pilot</option>
                <option value="trialing">Trialing</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </select>
            </label>
          </div>

          <button
            suppressHydrationWarning
            type="button"
            disabled={saving}
            onClick={() => void createPilotCompany()}
            className="mt-6 rounded-2xl bg-[#111827] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Creating..." : "Create Pilot Company"}
          </button>

          {createdOwner ? (
            <div className="mt-5 rounded-2xl border border-[#eadfce] bg-[#fbf7ef] p-4">
              <p className="text-sm font-semibold text-[#6b7280]">
                Owner login created
              </p>
              <p className="mt-1 font-bold text-[#111827]">
                {createdOwner.email}
              </p>
              <p className="mt-1 text-sm text-[#6b7280]">
                Role: {createdOwner.role} · Company ID:{" "}
                {createdOwner.companyId}
              </p>
            </div>
          ) : null}
        </section>

        <section className="rounded-3xl border border-[#eadfce] bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <h2 className="text-xl font-bold text-[#111827]">
                Recent Companies
              </h2>
              <p className="mt-1 text-sm text-[#6b7280]">
                Pilot and subscription companies created in iBirdOS.
              </p>
            </div>

            <button
              suppressHydrationWarning
              type="button"
              onClick={() => void loadCompanies()}
              className="rounded-2xl border border-[#eadfce] bg-white px-5 py-3 text-sm font-semibold text-[#111827]"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <p className="mt-4 rounded-2xl bg-[#fbf7ef] px-4 py-3 text-sm text-[#6b7280]">
              Loading companies...
            </p>
          ) : null}

          {!loading && companies.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-[#fbf7ef] px-4 py-3 text-sm text-[#6b7280]">
              No companies found yet.
            </p>
          ) : null}

          {companies.length > 0 ? (
            <div className="mt-5 overflow-x-auto rounded-2xl border border-[#eadfce]">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-[#fbf7ef] text-[#6b7280]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Company</th>
                    <th className="px-4 py-3 font-semibold">Plan</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Trial Ends</th>
                    <th className="px-4 py-3 font-semibold">Created</th>
                    <th className="px-4 py-3 font-semibold">Company ID</th>
                  </tr>
                </thead>

                <tbody>
                  {companies.map((company) => (
                    <tr key={company.id} className="border-t border-[#eadfce]">
                      <td className="px-4 py-3 font-semibold text-[#111827]">
                        {company.name}
                      </td>
                      <td className="px-4 py-3 text-[#111827]">
                        {company.plan ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-[#111827]">
                        {company.subscriptionStatus ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-[#111827]">
                        {formatDate(company.trialEndsAt)}
                      </td>
                      <td className="px-4 py-3 text-[#111827]">
                        {formatDate(company.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#6b7280]">
                        {company.id}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}