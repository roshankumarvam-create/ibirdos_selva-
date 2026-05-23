import Link from "next/link";

export default function QuotesPage() {
  return (
    <main className="min-h-screen bg-[#f6f0e6] px-6 py-8 text-[#172033]">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-[32px] border border-[#dfd1bd] bg-white p-8 shadow-lg">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#8b6f47]">
            Quote Control
          </p>

          <h1 className="mt-3 text-4xl font-black text-[#002515]">
            Quote Command Center
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#667085]">
            Manage catering quotes, approvals, and customer-ready quote actions.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Link
              href="/quotes/5cd5d703-d039-412f-b6a0-bf912bf466d2"
              className="rounded-3xl border border-[#002515] bg-[#002515] p-5 text-white transition hover:-translate-y-1 hover:shadow-lg"
            >
              <p className="text-sm font-bold">Open SanMar Quote</p>
              <p className="mt-3 text-sm text-[#d8efe5]">
                View the working quote detail page.
              </p>
            </Link>

            <Link
              href="/approvals"
              className="rounded-3xl border bg-white p-5 transition hover:-translate-y-1 hover:shadow-lg"
            >
              <p className="text-sm font-bold">Approvals</p>
              <p className="mt-3 text-sm text-[#667085]">
                Review quote approvals.
              </p>
            </Link>

            <Link
              href="/dashboard"
              className="rounded-3xl border bg-white p-5 transition hover:-translate-y-1 hover:shadow-lg"
            >
              <p className="text-sm font-bold">Back to Dashboard</p>
              <p className="mt-3 text-sm text-[#667085]">
                Return to command center.
              </p>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}