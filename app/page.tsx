"use client";

import { useEffect, useMemo, useState } from "react";

export default function HomePage() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const greeting = useMemo(() => {
    const hour = now.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, [now]);

  const formattedDate = useMemo(() => {
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(now);
  }, [now]);

  const formattedTime = useMemo(() => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    }).format(now);
  }, [now]);

  const timezoneLabel = useMemo(() => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }, []);

  const metrics = [
    {
      label: "Weekly Revenue",
      value: "$28,400",
      sub: "+18% vs last week",
      subColor: "#16A34A",
      icon: "💰",
    },
    {
      label: "Food Cost %",
      value: "28.4%",
      sub: "-2.1pts target 30%",
      subColor: "#16A34A",
      icon: "🍳",
    },
    {
      label: "Waste Cost",
      value: "$312",
      sub: "+$48 above target",
      subColor: "#DC2626",
      icon: "♻️",
    },
    {
      label: "Net Profit",
      value: "$6,820",
      sub: "+24% 24% margin",
      subColor: "#16A34A",
      icon: "📈",
    },
  ];

  const dailySales = [
    { date: "Apr 18, Fri", dineIn: "$2,840", takeout: "$1,200", catering: "$3,100", total: "$7,140" },
    { date: "Apr 17, Thu", dineIn: "$2,100", takeout: "$980", catering: "$1,800", total: "$4,880" },
    { date: "Apr 16, Wed", dineIn: "$1,800", takeout: "$760", catering: "$900", total: "$3,460" },
    { date: "Apr 15, Tue", dineIn: "$1,950", takeout: "$820", catering: "$1,200", total: "$3,970" },
    { date: "Apr 14, Mon", dineIn: "$1,600", takeout: "$700", catering: "$800", total: "$3,100" },
  ];

  const quickActions = [
    { label: "+ Add Sales", href: "/sales", bg: "#6366F1", color: "#FFFFFF" },
    { label: "Upload Invoice", href: "/invoices", bg: "#FFFFFF", color: "#0F172A" },
    { label: "FDA Alerts", href: "/fda-alerts", bg: "#FFF7ED", color: "#C2410C" },
    { label: "Finance P&L", href: "/finance", bg: "#FFFFFF", color: "#0F172A" },
    { label: "Log Waste", href: "/waste", bg: "#FFFFFF", color: "#0F172A" },
    { label: "Roadmap", href: "/roadmap", bg: "#FFFFFF", color: "#0F172A" },
  ];

  const aiModules = [
    { name: "Invoice AI", status: "Live", color: "#16A34A" },
    { name: "Order AI", status: "Live", color: "#16A34A" },
    { name: "FDA Recall AI", status: "Live", color: "#16A34A" },
    { name: "Marketing AI", status: "Setup", color: "#D97706" },
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
          background: "linear-gradient(135deg, #25345F 0%, #2E3F73 100%)",
          borderRadius: "24px",
          overflow: "hidden",
          marginBottom: "24px",
          boxShadow: "0 12px 30px rgba(15, 23, 42, 0.12)",
        }}
      >
        <div
          style={{
            padding: "28px 32px 22px 32px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "20px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                color: "#86EFAC",
                fontSize: "14px",
                fontWeight: 700,
                marginBottom: "14px",
              }}
            >
              ● Live · {formattedDate} · {formattedTime}
            </div>

            <h1
              style={{
                color: "#FFFFFF",
                fontSize: "34px",
                fontWeight: 800,
                margin: 0,
                lineHeight: 1.1,
              }}
            >
              {greeting}, Simbu 👋
            </h1>

            <div
              style={{
                color: "#D6E4FF",
                fontSize: "15px",
                marginTop: "12px",
                lineHeight: 1.6,
              }}
            >
              Cafe 71 · Redmond, WA · {timezoneLabel}
            </div>
          </div>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <a
              href="/sales"
              style={{
                textDecoration: "none",
                background: "#6366F1",
                color: "#FFFFFF",
                padding: "14px 20px",
                borderRadius: "14px",
                fontWeight: 700,
                fontSize: "14px",
                display: "inline-block",
              }}
            >
              + Add Sales Entry
            </a>

            <a
              href="/invoices"
              style={{
                textDecoration: "none",
                background: "rgba(255,255,255,0.08)",
                color: "#FFFFFF",
                border: "1px solid rgba(255,255,255,0.16)",
                padding: "14px 20px",
                borderRadius: "14px",
                fontWeight: 700,
                fontSize: "14px",
                display: "inline-block",
              }}
            >
              Upload Invoice
            </a>
          </div>
        </div>

        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(27, 42, 76, 0.55)",
            padding: "16px 32px",
            color: "#9CF7C2",
            fontSize: "14px",
            lineHeight: 1.7,
            fontWeight: 500,
          }}
        >
          🤖 Clow AI: Live dashboard synced to local device time. Revenue and alert summaries refresh by workflow data.
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        {metrics.map((card) => (
          <div
            key={card.label}
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
                marginBottom: "12px",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "#94A3B8",
                  fontWeight: 800,
                }}
              >
                {card.label}
              </div>
              <div style={{ fontSize: "22px" }}>{card.icon}</div>
            </div>

            <div
              style={{
                fontSize: "34px",
                fontWeight: 800,
                color: "#0F172A",
                marginBottom: "10px",
              }}
            >
              {card.value}
            </div>

            <div
              style={{
                fontSize: "13px",
                color: card.subColor,
                fontWeight: 600,
              }}
            >
              {card.sub}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: "20px",
          padding: "20px",
          marginBottom: "24px",
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
        }}
      >
        <div
          style={{
            fontSize: "18px",
            fontWeight: 800,
            marginBottom: "16px",
          }}
        >
          Quick Actions
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          {quickActions.map((action) => (
            <a
              key={action.label}
              href={action.href}
              style={{
                textDecoration: "none",
                background: action.bg,
                color: action.color,
                border: action.bg === "#FFFFFF" ? "1px solid #E2E8F0" : "none",
                borderRadius: "14px",
                padding: "12px 18px",
                fontWeight: 700,
                fontSize: "14px",
                display: "inline-block",
              }}
            >
              {action.label}
            </a>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.6fr 1fr",
          gap: "20px",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "20px",
            overflow: "hidden",
            boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
          }}
        >
          <div
            style={{
              padding: "20px 22px",
              borderBottom: "1px solid #E2E8F0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div
              style={{
                fontSize: "18px",
                fontWeight: 800,
              }}
            >
              Daily Sales — This Week
            </div>

            <a
              href="/sales"
              style={{
                textDecoration: "none",
                background: "#6366F1",
                color: "#FFFFFF",
                padding: "10px 14px",
                borderRadius: "12px",
                fontSize: "13px",
                fontWeight: 700,
              }}
            >
              + Add Entry
            </a>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F8FAFC" }}>
                  {["Date", "Dine-In", "Takeout", "Catering", "Total"].map((h) => (
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
                {dailySales.map((row) => (
                  <tr key={row.date} style={{ borderBottom: "1px solid #F1F5F9" }}>
                    <td style={{ padding: "16px", fontWeight: 600 }}>{row.date}</td>
                    <td style={{ padding: "16px", color: "#334155" }}>{row.dineIn}</td>
                    <td style={{ padding: "16px", color: "#334155" }}>{row.takeout}</td>
                    <td style={{ padding: "16px", color: "#334155" }}>{row.catering}</td>
                    <td style={{ padding: "16px", fontWeight: 800 }}>{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: "grid", gap: "20px" }}>
          <div
            style={{
              background: "#FFF7F7",
              border: "1px solid #F3D1D1",
              borderRadius: "20px",
              padding: "22px",
              boxShadow: "0 10px 30px rgba(15, 23, 42, 0.04)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "12px",
              }}
            >
              <div style={{ fontSize: "14px", fontWeight: 800, color: "#C2410C" }}>
                🚨 FDA Urgent Alert
              </div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  color: "#B91C1C",
                  background: "#FEE2E2",
                  padding: "6px 10px",
                  borderRadius: "999px",
                }}
              >
                Action Required
              </div>
            </div>

            <div
              style={{
                fontSize: "18px",
                fontWeight: 800,
                marginBottom: "10px",
              }}
            >
              Romaine Lettuce — E. coli Recall
            </div>

            <div
              style={{
                fontSize: "14px",
                color: "#64748B",
                lineHeight: 1.7,
                marginBottom: "16px",
              }}
            >
              Dole Fresh Vegetables · Lot #D-224-26 · Check Sysco INV-2891
            </div>

            <a
              href="/fda-alerts"
              style={{
                textDecoration: "none",
                background: "#DC2626",
                color: "#FFFFFF",
                padding: "12px 16px",
                borderRadius: "12px",
                fontSize: "14px",
                fontWeight: 700,
                display: "inline-block",
              }}
            >
              View + Resolve →
            </a>
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
                fontSize: "18px",
                fontWeight: 800,
                marginBottom: "18px",
              }}
            >
              AI Modules Status
            </div>

            <div style={{ display: "grid", gap: "12px" }}>
              {aiModules.map((mod) => (
                <div
                  key={mod.name}
                  style={{
                    background: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    borderRadius: "14px",
                    padding: "14px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{mod.name}</div>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: mod.color,
                      background: mod.color === "#16A34A" ? "#DCFCE7" : "#FEF3C7",
                      padding: "6px 10px",
                      borderRadius: "999px",
                    }}
                  >
                    {mod.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}