export default function ReportsPage() {
  const reportCards = [
    { label: "Weekly Revenue", value: "$28,400", sub: "vs last week +18%", color: "#16A34A" },
    { label: "Net Profit", value: "$6,820", sub: "24% margin", color: "#2563EB" },
    { label: "Food Cost", value: "28.4%", sub: "target 30%", color: "#D97706" },
    { label: "Waste Trend", value: "1.9%", sub: "under review", color: "#DC2626" },
  ];

  const reports = [
    {
      name: "Weekly Sales Summary",
      desc: "Revenue, dine-in, takeout, and catering performance.",
      href: "/sales",
    },
    {
      name: "Finance P&L Snapshot",
      desc: "Food cost, labor, revenue, and profit summary.",
      href: "/finance",
    },
    {
      name: "Waste Control Report",
      desc: "Track waste cost and item-level loss trends.",
      href: "/waste",
    },
    {
      name: "Order Performance",
      desc: "Upcoming orders, event mix, and catering volume.",
      href: "/orders",
    },
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
          background: "linear-gradient(135deg, #F8FAFC 0%, #EEF2FF 100%)",
          border: "1px solid #E2E8F0",
          borderRadius: "24px",
          padding: "28px",
          marginBottom: "24px",
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
        }}
      >
        <div
          style={{
            fontSize: "12px",
            color: "#4F46E5",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: "8px",
          }}
        >
          Reporting Hub
        </div>

        <h1
          style={{
            fontSize: "36px",
            fontWeight: 800,
            margin: 0,
          }}
        >
          Reports
        </h1>

        <p
          style={{
            fontSize: "15px",
            color: "#64748B",
            marginTop: "10px",
            marginBottom: 0,
          }}
        >
          Review weekly performance, finance, orders, and waste reports in one place.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        {reportCards.map((card) => (
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
                fontSize: "11px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#94A3B8",
                marginBottom: "10px",
                fontWeight: 800,
              }}
            >
              {card.label}
            </div>
            <div
              style={{
                fontSize: "34px",
                fontWeight: 800,
                color: "#0F172A",
                marginBottom: "8px",
              }}
            >
              {card.value}
            </div>
            <div
              style={{
                fontSize: "13px",
                color: card.color,
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
          padding: "22px",
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
        }}
      >
        <h2
          style={{
            fontSize: "24px",
            fontWeight: 800,
            marginTop: 0,
            marginBottom: "18px",
          }}
        >
          Available Reports
        </h2>

        <div style={{ display: "grid", gap: "12px" }}>
          {reports.map((report) => (
            <a
              key={report.name}
              href={report.href}
              style={{
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: "16px",
                padding: "16px",
                textDecoration: "none",
                display: "block",
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  color: "#0F172A",
                  fontSize: "16px",
                  marginBottom: "6px",
                }}
              >
                {report.name}
              </div>
              <div
                style={{
                  fontSize: "13px",
                  color: "#64748B",
                  lineHeight: 1.6,
                }}
              >
                {report.desc}
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}