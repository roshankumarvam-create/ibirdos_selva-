export default function NotificationsPage() {
  const summaryCards = [
    { label: "Unread Alerts", value: "12", sub: "need review", color: "#DC2626" },
    { label: "System Notices", value: "4", sub: "platform updates", color: "#2563EB" },
    { label: "Billing Alerts", value: "3", sub: "invoice or payment", color: "#D97706" },
    { label: "AI Recommendations", value: "9", sub: "action suggested", color: "#16A34A" },
  ];

  const notifications = [
    {
      type: "FDA Alert",
      title: "Romaine recall matched Sysco invoice INV-2891",
      desc: "Urgent review recommended. Remove affected stock and confirm waste log action.",
      time: "10 min ago",
      level: "High",
      href: "/fda-alerts",
    },
    {
      type: "Billing",
      title: "Monthly Stripe invoice paid successfully",
      desc: "Cafe 71 subscription renewed. Billing profile updated.",
      time: "1 hr ago",
      level: "Info",
      href: "/invoices",
    },
    {
      type: "AI Suggestion",
      title: "Chicken demand trending above forecast",
      desc: "Order AI recommends pre-buying 22 lbs before next pricing change.",
      time: "2 hrs ago",
      level: "Medium",
      href: "/purchasing",
    },
    {
      type: "Operations",
      title: "Waste cost exceeded target by $48",
      desc: "Review waste log and compare with production yield entries.",
      time: "Today",
      level: "Medium",
      href: "/waste",
    },
    {
      type: "Receivable",
      title: "Customer invoice AR-2208 ready to collect",
      desc: "Charge customer profile card on file or send ACH reminder.",
      time: "Today",
      level: "Medium",
      href: "/invoices",
    },
    {
      type: "Reports",
      title: "Month-end close report is ready",
      desc: "Sales, AP, inventory, LC, PC, gross profit, and margin summary prepared.",
      time: "Today",
      level: "Info",
      href: "/reports",
    },
  ];

  const levelStyle = (level: string) => {
    if (level === "High") {
      return { color: "#991B1B", background: "#FEE2E2" };
    }
    if (level === "Medium") {
      return { color: "#92400E", background: "#FEF3C7" };
    }
    return { color: "#1D4ED8", background: "#DBEAFE" };
  };

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
          Notification Center
        </div>

        <h1
          style={{
            fontSize: "36px",
            fontWeight: 800,
            margin: 0,
          }}
        >
          Notifications
        </h1>

        <p
          style={{
            fontSize: "15px",
            color: "#64748B",
            marginTop: "10px",
            marginBottom: 0,
          }}
        >
          Review alerts, billing events, AI recommendations, and system updates in one place.
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
        {summaryCards.map((card) => (
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
        <div
          style={{
            fontSize: "24px",
            fontWeight: 800,
            marginTop: 0,
            marginBottom: "18px",
          }}
        >
          Recent Notifications
        </div>

        <div style={{ display: "grid", gap: "12px" }}>
          {notifications.map((item) => {
            const badge = levelStyle(item.level);

            return (
              <a
                key={item.title}
                href={item.href}
                style={{
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "16px",
                  padding: "16px",
                  textDecoration: "none",
                  display: "grid",
                  gridTemplateColumns: "140px 1fr 90px 110px",
                  gap: "14px",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#4F46E5",
                  }}
                >
                  {item.type}
                </div>

                <div>
                  <div
                    style={{
                      fontSize: "15px",
                      fontWeight: 700,
                      color: "#0F172A",
                      marginBottom: "5px",
                    }}
                  >
                    {item.title}
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#64748B",
                      lineHeight: 1.6,
                    }}
                  >
                    {item.desc}
                  </div>
                </div>

                <div
                  style={{
                    fontSize: "12px",
                    color: "#64748B",
                    fontWeight: 600,
                  }}
                >
                  {item.time}
                </div>

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
                    {item.level}
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}