"use client";

type OrderItem = {
  customer: string;
  type: string;
  date: string;
  guests: number;
  status: "Confirmed" | "Draft" | "Pending";
};

type PriceAlert = {
  item: string;
  change: string;
  impact: "High" | "Medium" | "Low";
  note: string;
};

type DemandRow = {
  item: string;
  qty: string;
  risk: string;
};

export default function OrdersPage() {
  const stats = [
    { label: "Orders This Week", value: "18", sub: "+4 vs last week", color: "#16A34A" },
    { label: "Catering Revenue", value: "$6,420", sub: "3 confirmed events", color: "#4F46E5" },
    { label: "Upcoming Events", value: "5", sub: "next 7 days", color: "#D97706" },
    { label: "Draft Orders", value: "2", sub: "need review", color: "#DC2626" },
  ];

  const upcomingOrders: OrderItem[] = [
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

  const aiSuggestions = [
    "Chicken demand is trending 18% higher this week. Recommend pre-buying 22 lbs.",
    "Two catering orders overlap on Apr 23. Prep vegetables one day early.",
    "Projected onion shortage in 3 days based on current orders + inventory.",
    "Labor may run above target on Apr 24. Reduce manual prep by batch cooking sauce.",
  ];

  const priceAlerts: PriceAlert[] = [
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

  const demandForecast: DemandRow[] = [
    { item: "Chicken Breast", qty: "22 lbs", risk: "High Demand" },
    { item: "Onions Yellow", qty: "14 lbs", risk: "Low Stock" },
    { item: "Tomatoes", qty: "10 lbs", risk: "Normal" },
    { item: "Garlic", qty: "4 lbs", risk: "Normal" },
  ];

  const shoppingList = [
    { vendor: "Sysco", items: 8, total: "$284", note: "Best broadline price" },
    { vendor: "US Foods", items: 3, total: "$122", note: "Backup availability" },
    { vendor: "Vesta", items: 2, total: "$76", note: "Specialty item match" },
  ];

  const statusStyle = (status: OrderItem["status"]) => {
    if (status === "Confirmed") {
      return { color: "#166534", background: "#DCFCE7" };
    }
    if (status === "Pending") {
      return { color: "#92400E", background: "#FEF3C7" };
    }
    return { color: "#991B1B", background: "#FEE2E2" };
  };

  const impactStyle = (impact: PriceAlert["impact"]) => {
    if (impact === "High") {
      return { color: "#991B1B", background: "#FEE2E2" };
    }
    if (impact === "Medium") {
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
                maxWidth: "820px",
                lineHeight: 1.6,
              }}
            >
              Scan upcoming orders, pricing risk, demand forecast, and AI prep suggestions in one place.
            </p>
          </div>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <a
              href="/notifications"
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
              Notifications
            </a>

            <a
              href="/customer"
              style={{
                textDecoration: "none",
                background: "#6366F1",
                color: "#FFFFFF",
                padding: "12px 18px",
                borderRadius: "12px",
                fontSize: "14px",
                fontWeight: 700,
                boxShadow: "0 10px 20px rgba(79, 70, 229, 0.18)",
              }}
            >
              New Action
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
          display: "grid",
          gridTemplateColumns: "1.5fr 1fr",
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
            {upcomingOrders.map((order) => {
              const badge = statusStyle(order.status);

              return (
                <div
                  key={`${order.customer}-${order.date}`}
                  style={{
                    background: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    borderRadius: "16px",
                    padding: "16px",
                    display: "grid",
                    gridTemplateColumns: "1.6fr 1fr 1fr 1fr",
                    gap: "12px",
                    alignItems: "center",
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
                </div>
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
            {aiSuggestions.map((item) => (
              <div
                key={item}
                style={{
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderLeft: "4px solid #6366F1",
                  borderRadius: "14px",
                  padding: "14px",
                  fontSize: "14px",
                  color: "#334155",
                  lineHeight: 1.7,
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
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
          <h2
            style={{
              fontSize: "24px",
              fontWeight: 800,
              marginTop: 0,
              marginBottom: "18px",
            }}
          >
            Demand Forecast
          </h2>

          <div style={{ display: "grid", gap: "10px" }}>
            {demandForecast.map((row) => (
              <div
                key={row.item}
                style={{
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "14px",
                  padding: "14px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: "14px" }}>{row.item}</div>
                  <div style={{ fontSize: "12px", color: "#64748B", marginTop: "4px" }}>
                    Suggested buy qty: {row.qty}
                  </div>
                </div>

                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color:
                      row.risk === "High Demand"
                        ? "#991B1B"
                        : row.risk === "Low Stock"
                          ? "#92400E"
                          : "#166534",
                    background:
                      row.risk === "High Demand"
                        ? "#FEE2E2"
                        : row.risk === "Low Stock"
                          ? "#FEF3C7"
                          : "#DCFCE7",
                    padding: "6px 10px",
                    borderRadius: "999px",
                  }}
                >
                  {row.risk}
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
          <h2
            style={{
              fontSize: "24px",
              fontWeight: 800,
              marginTop: 0,
              marginBottom: "18px",
            }}
          >
            Price Alerts
          </h2>

          <div style={{ display: "grid", gap: "12px" }}>
            {priceAlerts.map((alert) => {
              const badge = impactStyle(alert.impact);

              return (
                <div
                  key={alert.item}
                  style={{
                    background: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    borderRadius: "14px",
                    padding: "14px 16px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "12px",
                      marginBottom: "8px",
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: "14px" }}>{alert.item}</div>

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
                      {alert.impact}
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: 800,
                      color: "#4F46E5",
                      marginBottom: "6px",
                    }}
                  >
                    {alert.change}
                  </div>

                  <div
                    style={{
                      fontSize: "13px",
                      color: "#64748B",
                      lineHeight: 1.6,
                    }}
                  >
                    {alert.note}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
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
          <h2
            style={{
              fontSize: "24px",
              fontWeight: 800,
              marginTop: 0,
              marginBottom: "18px",
            }}
          >
            Shopping List Suggestions
          </h2>

          <div style={{ display: "grid", gap: "12px" }}>
            {shoppingList.map((row) => (
              <a
                key={row.vendor}
                href="/purchasing"
                style={{
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
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
                    gap: "12px",
                    alignItems: "center",
                    marginBottom: "6px",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: "14px", color: "#0F172A" }}>
                    {row.vendor}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: "14px", color: "#4F46E5" }}>
                    {row.total}
                  </div>
                </div>

                <div style={{ fontSize: "12px", color: "#64748B", marginBottom: "4px" }}>
                  {row.items} items
                </div>

                <div style={{ fontSize: "12px", color: "#64748B" }}>{row.note}</div>
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
              marginBottom: "18px",
            }}
          >
            Order AI Model Scope
          </h2>

          <div style={{ display: "grid", gap: "10px" }}>
            {[
              "Reads upcoming orders + guest count",
              "Compares menu demand vs inventory on hand",
              "Checks live vendor pricing and price jumps",
              "Builds suggested shopping list by vendor",
              "Flags margin risk before order is posted",
              "Suggests prep timing and labor-saving actions",
            ].map((item) => (
              <div
                key={item}
                style={{
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "14px",
                  padding: "12px 14px",
                  fontSize: "13px",
                  color: "#334155",
                  lineHeight: 1.5,
                }}
              >
                ✅ {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}