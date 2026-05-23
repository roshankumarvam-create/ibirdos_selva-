"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type CheckStatus = "checking" | "pass" | "fail";

type CheckItem = {
  name: string;
  description: string;
  endpoint: string;
  status: CheckStatus;
  message: string;
};

type ApiResult = {
  ok?: boolean;
  success?: boolean;
  error?: string;
  companyId?: string;
  session?: {
    company_id?: string;
    email?: string;
    role?: string;
  };
};

const initialChecks: CheckItem[] = [
  {
    name: "Auth",
    description: "Confirms logged-in user session works.",
    endpoint: "/api/auth-check",
    status: "checking",
    message: "Waiting",
  },
  {
    name: "Invoices API",
    description: "Checks supplier invoice data is company-scoped.",
    endpoint: "/api/invoices",
    status: "checking",
    message: "Waiting",
  },
  {
    name: "Sales API",
    description: "Checks daily sales closeout engine.",
    endpoint: "/api/sales",
    status: "checking",
    message: "Waiting",
  },
  {
    name: "Alerts API",
    description: "Checks invoice cost alert engine.",
    endpoint: "/api/alerts",
    status: "checking",
    message: "Waiting",
  },
  {
    name: "Quote Stats API",
    description: "Checks quote dashboard stats.",
    endpoint: "/api/dashboard/quote-stats",
    status: "checking",
    message: "Waiting",
  },
  {
    name: "Event Profit API",
    description: "Checks event profit dashboard data.",
    endpoint: "/api/dashboard/event-profit",
    status: "checking",
    message: "Waiting",
  },
];

function getStatusClass(status: CheckStatus): string {
  if (status === "pass") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (status === "fail") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  return "border-yellow-200 bg-yellow-50 text-yellow-800";
}

function getStatusLabel(status: CheckStatus): string {
  if (status === "pass") {
    return "PASS";
  }

  if (status === "fail") {
    return "FAIL";
  }

  return "CHECKING";
}

export default function SystemCheckPage() {
  const [checks, setChecks] = useState<CheckItem[]>(initialChecks);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [companyId, setCompanyId] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("");
  const [accessDenied, setAccessDenied] = useState<boolean>(false);

  const passedCount = useMemo(() => {
    return checks.filter((check) => check.status === "pass").length;
  }, [checks]);

  const failedCount = useMemo(() => {
    return checks.filter((check) => check.status === "fail").length;
  }, [checks]);

  async function runChecks(): Promise<void> {
    setIsRunning(true);
    setChecks(
      initialChecks.map((check) => ({
        ...check,
        status: "checking",
        message: "Checking",
      })),
    );

    const nextChecks: CheckItem[] = [];

    for (const check of initialChecks) {
      try {
        const response = await fetch(check.endpoint, {
          cache: "no-store",
        });

        const data = (await response.json()) as ApiResult;

        if (check.endpoint === "/api/auth-check" && data.session) {

  const role = (data.session.role ?? "").toLowerCase(); 

  setCompanyId(data.session.company_id ?? "");
  setUserEmail(data.session.email ?? "");
  setUserRole(role); 

  if (role !== "owner" && role !== "admin") {
    setAccessDenied(true);
    setIsRunning(false);
    return;
  }

  setAccessDenied(false);
}

        if (data.companyId) {
          setCompanyId(data.companyId);
        }

        const isSuccess =
          response.ok && (data.success === true || data.ok === true || !data.error);

        nextChecks.push({
          ...check,
          status: isSuccess ? "pass" : "fail",
          message: isSuccess
            ? "Working"
            : data.error ?? `HTTP ${response.status}`,
        });
      } catch (error: unknown) {
        nextChecks.push({
          ...check,
          status: "fail",
          message:
            error instanceof Error ? error.message : "Unknown system check error",
        });
      }

      setChecks([...nextChecks, ...initialChecks.slice(nextChecks.length)]);
    }

    setIsRunning(false);
  }

  useEffect(() => {
    void runChecks();
  }, []);

  return (
    <main className="min-h-screen bg-[#f7f1e3] px-6 py-10 text-[#002515]">
      <section className="mx-auto max-w-6xl rounded-[32px] border border-[#d7c49e] bg-white p-8 shadow">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.35em] text-[#9a5f13]">
              Admin System Check
            </p>
            <h1 className="mt-3 text-5xl font-black leading-tight">
              iBirdOS beta readiness.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-[#53627a]">
              Use this page before sharing beta access. It checks auth,
              company_id, invoices, sales, alerts, quote stats, and event profit
              APIs.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="rounded-2xl border border-[#005445] px-5 py-3 text-sm font-black text-[#005445]"
            >
              Dashboard
            </Link>
            <Link
              href="/signup"
              className="rounded-2xl bg-[#005445] px-5 py-3 text-sm font-black text-white"
            >
              Friend Signup Link
            </Link>
            <button
              type="button"
              onClick={() => void runChecks()}
              disabled={isRunning}
              className="rounded-2xl bg-[#a96f16] px-5 py-3 text-sm font-black text-white disabled:opacity-60"
            >
              {isRunning ? "Checking..." : "Run Check"}
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border bg-[#fff8eb] p-5">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#53627a]">
              Passed
            </p>
            <p className="mt-3 text-4xl font-black">{passedCount}</p>
          </div>

          <div className="rounded-3xl border bg-[#fff8eb] p-5">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#53627a]">
              Failed
            </p>
            <p className="mt-3 text-4xl font-black">{failedCount}</p>
          </div>

          <div className="rounded-3xl border bg-[#fff8eb] p-5">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#53627a]">
              User
            </p>
            <p className="mt-3 break-words text-sm font-black">
              {userEmail || "Not loaded"}
            </p>
          </div>

          <div className="rounded-3xl border bg-[#fff8eb] p-5">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#53627a]">
              Role
            </p>
            <p className="mt-3 text-sm font-black">{userRole || "Not loaded"}</p>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border bg-white p-5">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#53627a]">
            Company ID
          </p>
          <p className="mt-3 break-words text-sm font-black">
            {companyId || "Not loaded"}
          </p>
        </div>

        <section className="mt-8 grid gap-4">
          {checks.map((check) => (
            <div
              key={check.endpoint}
              className="rounded-3xl border border-[#d7c49e] bg-[#fffaf0] p-5"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-black">{check.name}</h2>
                  <p className="mt-2 text-sm text-[#53627a]">
                    {check.description}
                  </p>
                  <p className="mt-2 text-xs font-bold text-[#53627a]">
                    {check.endpoint}
                  </p>
                </div>

                <div className="flex flex-col items-start gap-2 md:items-end">
                  <span
                    className={`rounded-full border px-4 py-2 text-xs font-black ${getStatusClass(
                      check.status,
                    )}`}
                  >
                    {getStatusLabel(check.status)}
                  </span>
                  <p className="text-xs font-bold text-[#53627a]">
                    {check.message}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-3xl border border-[#d7c49e] bg-[#fff8eb] p-6">
          <h2 className="text-2xl font-black">Beta sharing rule</h2>
          <p className="mt-3 text-sm leading-6 text-[#53627a]">
            Share the signup link with friends only after all system checks pass.
            Do not share this admin page with test users.
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border bg-white p-4">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#9a5f13]">
                Friend link after deploy
              </p>
              <p className="mt-2 break-words text-sm font-black">
                https://beta.ibirdos.com/signup
              </p>
            </div>

            <div className="rounded-2xl border bg-white p-4">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#9a5f13]">
                Admin link after deploy
              </p>
              <p className="mt-2 break-words text-sm font-black">
                https://beta.ibirdos.com/admin/system-check
              </p>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}