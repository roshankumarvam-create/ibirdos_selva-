"use client";

import { useMemo, useState } from "react";

type PayableInvoice = {
  id: string;
  vendor: string;
  invoice: string;
  date: string;
  due: string;
  items: number;
  amount: number;
  posted: "Posted" | "Pending";
  status: "Approved" | "Paid" | "Pending" | "Overdue";
  ai: "AI Extracted" | "Pending";
  note?: string;
};

type ReceivableInvoice = {
  id: string;
  customer: string;
  invoice: string;
  event: string;
  amount: number;
  method: "Card on File" | "ACH" | "Check";
  status: "Ready to Charge" | "Pending Collection" | "Awaiting Payment";
  due: string;
};

const payableSeed: PayableInvoice[] = [
  {
    id: "p1",
    vendor: "Sysco Food Service",
    invoice: "755148608",
    date: "Apr 16",
    due: "May 1",
    items: 24,
    amount: 3218,
    posted: "Posted",
    status: "Approved",
    ai: "AI Extracted",
    note: "FDA Alert",
  },
  {
    id: "p2",
    vendor: "Sysco Food Service",
    invoice: "755148607",
    date: "Apr 9",
    due: "Apr 24",
    items: 18,
    amount: 2904,
    posted: "Pending",
    status: "Paid",
    ai: "AI Extracted",
  },
  {
    id: "p3",
    vendor: "US Foods",
    invoice: "USF-44192",
    date: "Apr 8",
    due: "Apr 22",
    items: 11,
    amount: 1445,
    posted: "Pending",
    status: "Pending",
    ai: "Pending",
  },
  {
    id: "p4",
    vendor: "Cash & Carry",
    invoice: "CC-7721",
    date: "Apr 5",
    due: "Apr 19",
    items: 9,
    amount: 612,
    posted: "Posted",
    status: "Overdue",
    ai: "AI Extracted",
  },
];

const receivableSeed: ReceivableInvoice[] = [
  {
    id: "r1",
    customer: "Microsoft Catering",
    invoice: "AR-2208",
    event: "Corporate Lunch",
    amount: 8400,
    method: "Card on File",
    status: "Ready to Charge",
    due: "Apr 22",
  },
  {
    id: "r2",
    customer: "Amazon Team Event",
    invoice: "AR-2209",
    event: "Buffet Dinner",
    amount: 6800,
    method: "ACH",
    status: "Pending Collection",
    due: "Apr 23",
  },
  {
    id: "r3",
    customer: "Private Dining Client",
    invoice: "AR-2210",
    event: "Tasting",
    amount: 1950,
    method: "Check",
    status: "Awaiting Payment",
    due: "Apr 24",
  },
];

function fmtMoney(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function statusStyle(status: string) {
  if (
    status === "Approved" ||
    status === "Paid" ||
    status === "Ready to Charge"
  ) {
    return { color: "#166534", background: "#DCFCE7" };
  }
  if (status === "Pending" || status === "Pending Collection") {
    return { color: "#92400E", background: "#FEF3C7" };
  }
  if (status === "Overdue" || status === "Awaiting Payment") {
    return { color: "#991B1B", background: "#FEE2E2" };
  }
  return { color: "#475569", background: "#F1F5F9" };
}

export default function InvoicesPage() {
  const [payables] = useState<PayableInvoice[]>(payableSeed);
  const [receivables] = useState<ReceivableInvoice[]>(receivableSeed);

  const totalPayable = useMemo(
    () =>
      payables
        .filter((x) => x.status !== "Paid")
        .reduce((sum, x) => sum + x.amount, 0),
    [payables]
  );

  const totalReceivable = useMemo(
    () => receivables.reduce((sum, x) => sum + x.amount, 0),
    [receivables]
  );

  const overdue = useMemo(
    () => payables.filter((x) => x.status === "Overdue").length,
    [payables]
  );

  const monthClose = [
    { label: "Month Sales", value: "$84,220", color: "#2563EB" },
    { label: "Accounts Payable", value: "$12,940", color: "#DC2626" },
    { label: "Inventory Value", value: "$18,600", color: "#7C3AED" },
    { label: "LC", value: "$21,480", color: "#F59E0B" },
    { label: "PC", value: "$23,960", color: "#10B981" },
    { label: "Gross Profit", value: "$38,780", color: "#16A34A" },
    { label: "Operating Cost", value: "$9,640", color: "#D97706" },
    { label: "Last Profit Margin", value: "24.3%", color: "#4338CA" },
  ];

  return (
    <div
      style={{
        fontFamily: "Inter, sans-serif",
        background: "#FFFFFF",
        minHeight: "100vh",
        color: "#0F172A",
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg, #1E293B 0%, #233A67 100%)",
          borderRadius: "24px",
          padding: "28px 32px",
          marginBottom: "24px",
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.12)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "20px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "38px",
                fontWeight: 800,
                margin: 0,
                color: "#FFFFFF",
              }}
            >
              Invoice Processing
            </h1>
            <div
              style={{
                marginTop: "10px",
                color: "#BFDBFE",
                fontSize: "16px",
                lineHeight: 1.6,
              }}
            >
              AP Payables · AR Receivables · eVia · ACH · Credit / Debit
            </div>
          </div>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <a
              href="/reports"
              style={{
                textDecoration: "none",
                background: "rgba(255,255,255,0.08)",
                color: "#FFFFFF",
                border: "1px solid rgba(255,255,255,0.16)",
                padding: "12px 18px",
                borderRadius: "12px",
                fontSize: "14px",
                fontWeight: 700,
              }}
            >
              Month-End Reports
            </a>

            <button
              style={{
                background: "#6366F1",
                color: "#FFFFFF",
                padding: "12px 18px",
                borderRadius: "12px",
                fontSize: "14px",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
              }}
            >
              + Upload Invoice PDF
            </button>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "12px",
            marginTop: "22px",
          }}
        >
          {[
            {
              label: "Total Payable",
              value: fmtMoney(totalPayable),
              sub: "owed to vendors",
              color: "#FCA5A5",
            },
            {
              label: "Total Receivable",
              value: fmtMoney(totalReceivable),
              sub: "owed by customers",
              color: "#86EFAC",
            },
            {
              label: "Overdue",
              value: String(overdue),
              sub: "needs immediate action",
              color: "#FCA5A5",
            },
            {
              label: "AI Extraction Rate",
              value: "98.2%",
              sub: "avg 2.1s per invoice",
              color: "#93C5FD",
            },
          ].map((card) => (
            <div
              key={card.label}
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "16px",
                padding: "18px 16px",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  color: "#B8C4E0",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: "8px",
                  fontWeight: 700,
                }}
              >
                {card.label}
              </div>
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: 800,
                  color: card.color,
                  marginBottom: "6px",
                }}
              >
                {card.value}
              </div>
              <div style={{ fontSize: "13px", color: "#94A3B8" }}>{card.sub}</div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: "20px",
          overflow: "hidden",
          marginBottom: "18px",
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
        }}
      >
        <div
          style={{
            padding: "18px 22px",
            borderBottom: "1px solid #E2E8F0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: "24px", fontWeight: 800 }}>
            Vendor Invoices — Accounts Payable
          </div>
          <div style={{ fontSize: "14px", color: "#64748B" }}>
            Total outstanding:{" "}
            <strong style={{ color: "#334155" }}>{fmtMoney(totalPayable)}</strong>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8FAFC" }}>
                {[
                  "Vendor",
                  "Invoice #",
                  "Date",
                  "Due Date",
                  "Items",
                  "Amount",
                  "GL Posted",
                  "Status",
                  "AI",
                  "Action",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "14px 16px",
                      textAlign: "left",
                      fontSize: "11px",
                      fontWeight: 800,
                      color: "#94A3B8",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      borderBottom: "1px solid #E2E8F0",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payables.map((row) => {
                const badge = statusStyle(row.status);
                return (
                  <tr
                    key={row.id}
                    style={{
                      borderBottom: "1px solid #F1F5F9",
                      background: row.status === "Overdue" ? "#FFF7ED" : "#FFFFFF",
                    }}
                  >
                    <td style={{ padding: "16px" }}>
                      <div style={{ fontWeight: 700 }}>{row.vendor}</div>
                      {row.note ? (
                        <div style={{ fontSize: "12px", color: "#DC2626", marginTop: "4px" }}>
                          ⚠ {row.note}
                        </div>
                      ) : null}
                    </td>
                    <td style={{ padding: "16px", color: "#4F46E5", fontWeight: 700 }}>
                      {row.invoice}
                    </td>
                    <td style={{ padding: "16px", color: "#475569" }}>{row.date}</td>
                    <td
                      style={{
                        padding: "16px",
                        color: row.status === "Overdue" ? "#DC2626" : "#475569",
                        fontWeight: row.status === "Overdue" ? 700 : 500,
                      }}
                    >
                      {row.due}
                    </td>
                    <td style={{ padding: "16px", color: "#475569" }}>{row.items}</td>
                    <td style={{ padding: "16px", fontWeight: 800, fontSize: "16px" }}>
                      {fmtMoney(row.amount)}
                    </td>
                    <td
                      style={{
                        padding: "16px",
                        color: row.posted === "Posted" ? "#166534" : "#94A3B8",
                        fontWeight: 700,
                      }}
                    >
                      {row.posted}
                    </td>
                    <td style={{ padding: "16px" }}>
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          color: badge.color,
                          background: badge.background,
                          padding: "6px 10px",
                          borderRadius: "999px",
                        }}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "16px",
                        color: row.ai === "Pending" ? "#92400E" : "#166534",
                        fontWeight: 700,
                      }}
                    >
                      {row.ai}
                    </td>
                    <td style={{ padding: "16px" }}>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <a
                          href="/reports"
                          style={{
                            textDecoration: "none",
                            background: "#FFFFFF",
                            border: "1px solid #E2E8F0",
                            color: "#334155",
                            borderRadius: "8px",
                            padding: "6px 10px",
                            fontSize: "13px",
                            fontWeight: 600,
                          }}
                        >
                          View
                        </a>
                        <button
                          style={{
                            background: row.status === "Paid" ? "#F1F5F9" : "#6366F1",
                            color: row.status === "Paid" ? "#64748B" : "#FFFFFF",
                            borderRadius: "8px",
                            padding: "6px 10px",
                            fontSize: "13px",
                            fontWeight: 700,
                            border: "none",
                            cursor: row.status === "Paid" ? "default" : "pointer",
                          }}
                        >
                          {row.status === "Paid" ? "Done" : "Pay"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: "20px",
          overflow: "hidden",
          marginBottom: "18px",
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
        }}
      >
        <div
          style={{
            padding: "18px 22px",
            borderBottom: "1px solid #E2E8F0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: "24px", fontWeight: 800 }}>
            Customer Invoices — Accounts Receivable
          </div>
          <div style={{ fontSize: "14px", color: "#64748B" }}>
            Total receivable:{" "}
            <strong style={{ color: "#334155" }}>{fmtMoney(totalReceivable)}</strong>
          </div>
        </div>

        <div style={{ display: "grid", gap: "12px", padding: "18px 22px" }}>
          {receivables.map((row) => {
            const badge = statusStyle(row.status);
            return (
              <div
                key={row.id}
                style={{
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "16px",
                  padding: "16px",
                  display: "grid",
                  gridTemplateColumns: "1.6fr 1fr 1fr 1fr 1fr 1.2fr",
                  gap: "12px",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: "15px" }}>{row.customer}</div>
                  <div style={{ fontSize: "12px", color: "#64748B", marginTop: "4px" }}>
                    {row.event}
                  </div>
                </div>
                <div style={{ color: "#4F46E5", fontWeight: 700 }}>{row.invoice}</div>
                <div style={{ fontWeight: 800 }}>{fmtMoney(row.amount)}</div>
                <div style={{ color: "#475569", fontWeight: 600 }}>{row.method}</div>
                <div>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: badge.color,
                      background: badge.background,
                      padding: "6px 10px",
                      borderRadius: "999px",
                    }}
                  >
                    {row.status}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                  <a
                    href="/customer"
                    style={{
                      textDecoration: "none",
                      background: "#FFFFFF",
                      border: "1px solid #E2E8F0",
                      color: "#334155",
                      borderRadius: "8px",
                      padding: "7px 10px",
                      fontSize: "13px",
                      fontWeight: 600,
                    }}
                  >
                    Profile
                  </a>
                  <button
                    style={{
                      background: "#16A34A",
                      color: "#FFFFFF",
                      borderRadius: "8px",
                      padding: "7px 10px",
                      fontSize: "13px",
                      fontWeight: 700,
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Collect
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "18px",
          marginBottom: "18px",
        }}
      >
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "20px",
            padding: "22px",
            boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
          }}
        >
          <div style={{ fontSize: "24px", fontWeight: 800, marginBottom: "18px" }}>
            Payable Payment Methods
          </div>

          <div style={{ display: "grid", gap: "14px" }}>
            {[
              ["eVia", "Direct to Sysco / US Foods — 1 business day", "Preferred", "#4338CA", "#EEF2FF"],
              ["ACH Bank Transfer", "Bank to bank — 2 to 3 business days", "Low cost", "#166534", "#DCFCE7"],
              ["Credit / Debit Card", "Fast vendor payment option if accepted", "Fast", "#92400E", "#FEF3C7"],
              ["Check", "Physical check — 5 to 7 days", "Traditional", "#64748B", "#F1F5F9"],
            ].map(([name, desc, badge, color, bg]) => (
              <div
                key={String(name)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  paddingBottom: "12px",
                  borderBottom: "1px solid #F1F5F9",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, marginBottom: "4px" }}>{name}</div>
                  <div style={{ fontSize: "13px", color: "#64748B" }}>{desc}</div>
                </div>
                <span
                  style={{
                    alignSelf: "center",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: String(color),
                    background: String(bg),
                    padding: "6px 10px",
                    borderRadius: "999px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {badge}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "20px",
            padding: "22px",
            boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
          }}
        >
          <div style={{ fontSize: "24px", fontWeight: 800, marginBottom: "18px" }}>
            Receivable Collection Methods
          </div>

          <div style={{ display: "grid", gap: "14px" }}>
            {[
              ["Customer Card on File", "Charge from customer profile default card", "Instant", "#4338CA", "#EEF2FF"],
              ["ACH Pull", "Charge customer's linked bank account", "B2B", "#166534", "#DCFCE7"],
              ["Check Collection", "Manual receivable collection", "Manual", "#92400E", "#FEF3C7"],
            ].map(([name, desc, badge, color, bg]) => (
              <div
                key={String(name)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  paddingBottom: "12px",
                  borderBottom: "1px solid #F1F5F9",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, marginBottom: "4px" }}>{name}</div>
                  <div style={{ fontSize: "13px", color: "#64748B" }}>{desc}</div>
                </div>
                <span
                  style={{
                    alignSelf: "center",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: String(color),
                    background: String(bg),
                    padding: "6px 10px",
                    borderRadius: "999px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {badge}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: "20px",
          padding: "22px",
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "18px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ fontSize: "24px", fontWeight: 800 }}>
            Month-End Close Summary
          </div>

          <a
            href="/reports"
            style={{
              textDecoration: "none",
              background: "#EEF2FF",
              color: "#4338CA",
              padding: "10px 14px",
              borderRadius: "12px",
              fontSize: "13px",
              fontWeight: 700,
            }}
          >
            Run Closing Report
          </a>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: "14px",
          }}
        >
          {monthClose.map((item) => (
            <a
              key={item.label}
              href="/reports"
              style={{
                textDecoration: "none",
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: "16px",
                padding: "16px",
                display: "block",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "#94A3B8",
                  marginBottom: "8px",
                  fontWeight: 800,
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  fontSize: "26px",
                  fontWeight: 800,
                  color: item.color,
                }}
              >
                {item.value}
              </div>
            </a>
          ))}
        </div>

        <div
          style={{
            marginTop: "18px",
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
            borderRadius: "16px",
            padding: "16px",
            fontSize: "14px",
            color: "#475569",
            lineHeight: 1.7,
          }}
        >
          This section should connect to your B2B reporting workflow and calculate closing month totals from
          sales, accounts payable, accounts receivable, inventory, LC, PC, gross profit, operating cost, and final profit margin.
        </div>
      </div>
    </div>
  );
}