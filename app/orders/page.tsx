export default function OrdersPage() {
  const aiSuggestions = [
    "Chicken demand is trending 18% higher this week. Recommend pre-buying 22 lbs.",
    "Two catering orders overlap on Apr 23. Prep vegetables one day early.",
    "Projected onion shortage in 3 days based on current orders + inventory.",
    "Labor may run above target on Apr 24. Reduce manual prep by batch cooking sauce.",
  ];

  const priceAlerts = [
    {
      item: "Chicken Breast",
      change: "+$0.18/lb",
      impact: "High",
      note: "Affects 2 catering orders this week",
    },
    {
      item: "Yellow Onions",
      change: "+$0.07/lb",
      impact: "Medium",
      note: "Projected shortage in 3 days",
    },
    {
      item: "Heavy Cream",
      change: "+4.5%",
      impact: "Low",
      note: "Monitor dessert recipe margin",
    },
  ];

  const upcomingOrders = [
    {
      customer: "Microsoft Catering",
      type: "Corporate Lunch",
      date: "Apr 22, 2026",
      guests: 45,
      status: "Confirmed",
    },
    {
      customer: "Amazon Team Event",
      type: "Buffet Dinner",
      date: "Apr 23, 2026",
      guests: 80,
      status: "Draft",
    },
    {
      customer: "Private Tasting",
      type: "Food Tasting",
      date: "Apr 24, 2026",
      guests: 12,
      status: "Confirmed",
    },
    {
      customer: "Cafe 71 Office Drop",
      type: "Recurring Order",
      date: "Apr 25, 2026",
      guests: 20,
      status: "Pending",
    },
  ];

  const stats = [
    {
      label: "Orders This Week",
      value: "18",
      sub: "+4 vs last week",
      color: "#16A34A",
      href: "/orders",
    },
    {
      label: "Catering Revenue",
      value: "$6,420",
      sub: "3 confirmed events",
      color: "#2563EB",
      href: "/reports",
    },
    {
      label: "Upcoming Events",
      value: "5",
      sub: "Next 7 days",
      color: "#D97706",
      href: "/customer",
    },
    {
      label: "Draft Orders",
      value: "2",
      sub: "Need review",
      color: "#DC2626",
      href: "/orders",
    },
  ];

  const statusStyle = (status: string) => {
    if (status === "Confirmed") {
      return { color: "#166534", background: "#DCFCE7" };
    }
    if (status === "Pending") {
      return { color: "#92400E", background: "#FEF3C7" };
    }
    return { color: "#991B1B", background: "#FEE2E2" };
  };

  const impactColor = (impact: string) => {
    if (impact === "High") return "#DC2626";
    if (impact === "Medium") return "#D97706";
    return "#2563EB";
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
                fontSize: "12px",
                color: "#4F46E5",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: "8px",
              }}
            >
              Order AI • Live Forecast
            </div>
            <h1
              style={{
                fontSize: "36px",
                fontWeight: 800,
                margin: 0,
                color: "#0F172A",
              }}
            >
              My Orders
            </h1>
            <p
              style={{
                fontSize: "15px",
                color: "#64748B",
                marginTop: "10px",
                marginBottom: 0,
                maxWidth: "760px",
                lineHeight: 1.6,
              }}
            >
              Scan upcoming orders, pricing risk, demand forecast, and AI prep suggestions in one place.
            </p>
          </div>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <a
              href="/customer"
              style={{
                textDecoration: "none",
                background: "#4F46E5",
                color: "#FFFFFF",
                padding: "12px 18px",
                borderRadius: "12px",
                fontSize: "14px",
                fontWeight: 700,
                boxShadow: "0 10px 20px rgba(79, 70, 229, 0.18)",
              }}
            >
              + New Order
            </a>
            <a
              href="/purchasing"
              style={{
                textDecoration: "none",
                background: "#FFFFFF",
                color: "#334155",
                border: "1px solid #E2E8F0",
                padding: "12px 18px",
                borderRadius: "12px",
                fontSize: "14px",
                fontWeight: 700,
              }}
            >
              Open Shopping List
            </a>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        {stats.map((card) => (
          <a
            key={card.label}
            href={card.href}
            style={{
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "20px",
              padding: "22px",
              boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
              textDecoration: "none",
              display: "block",
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
          </a>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.55fr 1fr",
          gap: "20px",
          marginBottom: "24px",
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
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "18px",
            }}
          >
            <h2
              style={{
                fontSize: "24px",
                fontWeight: 800,
                margin: 0,
                color: "#0F172A",
              }}
            >
              Upcoming Orders
            </h2>
            <a
              href="/customer"
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
              Manage Customers
            </a>
          </div>

          <div style={{ display: "grid", gap: "12px" }}>
            {upcomingOrders.map((order, i) => {
              const badge = statusStyle(order.status);
              return (
                <a
                  key={i}
                  href="/customer"
                  style={{
                    background: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    borderRadius: "16px",
                    padding: "16px",
                    display: "grid",
                    gridTemplateColumns: "2fr 1.4fr 1fr 1fr",
                    gap: "12px",
                    alignItems: "center",
                    textDecoration: "none",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 700,
                        color: "#0F172A",
                        fontSize: "15px",
                      }}
                    >
                      {order.customer}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#64748B",
                        marginTop: "4px",
                      }}
                    >
                      {order.type}
                    </div>
                  </div>

                  <div style={{ fontSize: "13px", color: "#334155", fontWeight: 600 }}>
                    {order.date}
                  </div>

                  <div style={{ fontSize: "13px", color: "#334155", fontWeight: 600 }}>
                    {order.guests} guests
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
                      {order.status}
                    </span>
                  </div>
                </a>
              );
            })}
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
          <h2
            style={{
              fontSize: "24px",
              fontWeight: 800,
              marginTop: 0,
              marginBottom: "18px",
              color: "#0F172A",
            }}
          >
            Order AI Suggestions
          </h2>

          <div style={{ display: "grid", gap: "12px" }}>
            {aiSuggestions.map((tip, i) => (
              <div
                key={i}
                style={{
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderLeft: "4px solid #4F46E5",
                  borderRadius: "14px",
                  padding: "14px 16px",
                  fontSize: "13px",
                  color: "#334155",
                  lineHeight: 1.6,
                }}
              >
                {tip}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: "20px",
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
          <h2
            style={{
              fontSize: "24px",
              fontWeight: 800,
              marginTop: 0,
              marginBottom: "16px",
            }}
          >
            Demand Forecast
          </h2>

          <div style={{ display: "grid", gap: "10px" }}>
            {[
              { item: "Chicken Breast", qty: "22 lbs", risk: "High Demand" },
              { item: "Onions Yellow", qty: "14 lbs", risk: "Low Stock" },
              { item: "Tomatoes", qty: "10 lbs", risk: "Normal" },
              { item: "Garlic", qty: "4 lbs", risk: "Normal" },
            ].map((row) => (
              <div
                key={row.item}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "14px",
                  padding: "14px 16px",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: "#0F172A" }}>{row.item}</div>
                  <div style={{ fontSize: "12px", color: "#64748B" }}>
                    Needed for upcoming orders
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 700, color: "#0F172A" }}>{row.qty}</div>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color:
                        row.risk === "High Demand" || row.risk === "Low Stock"
                          ? "#D97706"
                          : "#2563EB",
                    }}
                  >
                    {row.risk}
                  </div>
                </div>
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
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <h2
              style={{
                fontSize: "24px",
                fontWeight: 800,
                margin: 0,
              }}
            >
              Price Alerts
            </h2>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 800,
                color: "#92400E",
                background: "#FEF3C7",
                padding: "5px 9px",
                borderRadius: "999px",
              }}
            >
              {priceAlerts.length} Alerts
            </span>
          </div>

          <div style={{ display: "grid", gap: "12px" }}>
            {priceAlerts.map((alert) => (
              <a
                key={alert.item}
                href="/vendors"
                style={{
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderLeft: `4px solid ${impactColor(alert.impact)}`,
                  borderRadius: "14px",
                  padding: "14px 16px",
                  textDecoration: "none",
                  display: "block",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "6px",
                  }}
                >
                  <div style={{ fontWeight: 700, color: "#0F172A" }}>{alert.item}</div>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: 800,
                      color: impactColor(alert.impact),
                    }}
                  >
                    {alert.change}
                  </div>
                </div>

                <div
                  style={{
                    fontSize: "12px",
                    color: "#64748B",
                    marginBottom: "6px",
                    lineHeight: 1.5,
                  }}
                >
                  {alert.note}
                </div>

                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: impactColor(alert.impact),
                  }}
                >
                  {alert.impact} Impact
                </div>
              </a>
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
          <h2
            style={{
              fontSize: "24px",
              fontWeight: 800,
              marginTop: 0,
              marginBottom: "16px",
            }}
          >
            Quick Actions
          </h2>

          <div style={{ display: "grid", gap: "12px" }}>
            {[
              { label: "Create Shopping List", href: "/purchasing" },
              { label: "Open Customer Orders", href: "/customer" },
              { label: "Check Vendors", href: "/vendors" },
              { label: "Review Sales Entry", href: "/sales" },
            ].map((btn) => (
              <a
                key={btn.label}
                href={btn.href}
                style={{
                  textDecoration: "none",
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  color: "#0F172A",
                  borderRadius: "14px",
                  padding: "15px 16px",
                  fontWeight: 700,
                  display: "block",
                }}
              >
                {btn.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}