export default function PurchasingPage() {
  const summaryCards = [
    {
      label: "Projected Buy Total",
      value: "$2,184",
      sub: "next 3 days",
      color: "#2563EB",
      href: "/vendors",
    },
    {
      label: "Urgent Items",
      value: "6",
      sub: "buy today",
      color: "#DC2626",
      href: "/vendors",
    },
    {
      label: "Vendor Alerts",
      value: "3",
      sub: "price or stock risk",
      color: "#D97706",
      href: "/vendors",
    },
    {
      label: "Margin Risk Items",
      value: "4",
      sub: "watch recipe cost",
      color: "#7C3AED",
      href: "/orders",
    },
  ];

  const buyList = [
    {
      item: "Chicken Breast",
      needed: "22 lbs",
      stock: "6 lbs",
      vendor: "Sysco",
      estCost: "$72.38",
      priority: "Urgent",
    },
    {
      item: "Yellow Onions",
      needed: "14 lbs",
      stock: "3 lbs",
      vendor: "US Foods",
      estCost: "$18.20",
      priority: "Urgent",
    },
    {
      item: "Heavy Cream",
      needed: "8 qts",
      stock: "2 qts",
      vendor: "Sysco",
      estCost: "$31.40",
      priority: "Review",
    },
    {
      item: "Tomatoes",
      needed: "10 lbs",
      stock: "5 lbs",
      vendor: "Vesta",
      estCost: "$24.50",
      priority: "Normal",
    },
    {
      item: "Garlic",
      needed: "4 lbs",
      stock: "1 lb",
      vendor: "US Foods",
      estCost: "$12.80",
      priority: "Normal",
    },
  ];

  const aiSuggestions = [
    "Buy chicken today from Sysco. Current order demand is high and price is likely to move again.",
    "Split onion purchase between US Foods and Vesta if tomorrow volume increases above forecast.",
    "Heavy cream price is trending up. Review dessert menu margin before next catering event.",
    "Tomatoes can wait until tomorrow unless one more event order is confirmed.",
  ];

  const vendorCards = [
    {
      name: "Sysco",
      note: "Best for poultry + dairy today",
      bg: "#EEF2FF",
      color: "#4338CA",
      href: "/vendors",
    },
    {
      name: "US Foods",
      note: "Better price on produce",
      bg: "#F0FDF4",
      color: "#166534",
      href: "/vendors",
    },
    {
      name: "Vesta",
      note: "Backup vendor for shortage items",
      bg: "#FFF7ED",
      color: "#C2410C",
      href: "/vendors",
    },
  ];

  const priorityStyle = (priority: string) => {
    if (priority === "Urgent") {
      return { color: "#991B1B", background: "#FEE2E2" };
    }
    if (priority === "Review") {
      return { color: "#92400E", background: "#FEF3C7" };
    }
    return { color: "#166534", background: "#DCFCE7" };
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
              Purchasing AI • Live Buy Plan
            </div>
            <h1
              style={{
                fontSize: "36px",
                fontWeight: 800,
                margin: 0,
                color: "#0F172A",
              }}
            >
              Purchasing
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
              Review suggested buys, vendor pricing risk, and AI purchasing recommendations before placing orders.
            </p>
          </div>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <a
              href="/vendors"
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
              Open Vendors
            </a>
            <a
              href="/orders"
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
              Back to Orders
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
        {summaryCards.map((card) => (
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
              Suggested Buy List
            </h2>
            <a
              href="/vendors"
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
              Compare Vendors
            </a>
          </div>

          <div style={{ display: "grid", gap: "12px" }}>
            {buyList.map((row) => {
              const badge = priorityStyle(row.priority);
              return (
                <a
                  key={row.item}
                  href="/vendors"
                  style={{
                    background: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    borderRadius: "16px",
                    padding: "16px",
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr",
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
                      {row.item}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#64748B",
                        marginTop: "4px",
                      }}
                    >
                      AI recommended buy
                    </div>
                  </div>

                  <div style={{ fontSize: "13px", color: "#334155", fontWeight: 600 }}>
                    Need: {row.needed}
                  </div>

                  <div style={{ fontSize: "13px", color: "#334155", fontWeight: 600 }}>
                    Stock: {row.stock}
                  </div>

                  <div style={{ fontSize: "13px", color: "#334155", fontWeight: 700 }}>
                    {row.vendor}
                  </div>

                  <div style={{ fontSize: "13px", color: "#0F172A", fontWeight: 800 }}>
                    {row.estCost}
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
                      {row.priority}
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
            AI Purchasing Suggestions
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
        {vendorCards.map((vendor) => (
          <a
            key={vendor.name}
            href={vendor.href}
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
                display: "inline-block",
                padding: "6px 10px",
                borderRadius: "999px",
                background: vendor.bg,
                color: vendor.color,
                fontSize: "12px",
                fontWeight: 800,
                marginBottom: "12px",
              }}
            >
              Preferred Vendor
            </div>

            <div
              style={{
                fontSize: "26px",
                fontWeight: 800,
                color: "#0F172A",
                marginBottom: "8px",
              }}
            >
              {vendor.name}
            </div>

            <div
              style={{
                fontSize: "14px",
                color: "#64748B",
                lineHeight: 1.6,
              }}
            >
              {vendor.note}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}