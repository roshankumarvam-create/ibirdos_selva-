"use client";

export default function CustomerPage() {
  const customers = [
    {
      name: "Microsoft Catering",
      type: "Corporate",
      contact: "events@microsoft.com",
      payment: "Card on File",
      status: "Active",
    },
    {
      name: "Amazon Team Event",
      type: "B2B Client",
      contact: "ops@amazon.com",
      payment: "ACH",
      status: "Active",
    },
    {
      name: "Private Dining Client",
      type: "Direct",
      contact: "client@email.com",
      payment: "Check",
      status: "Pending",
    },
  ];

  const statusStyle = (status: string) => {
    if (status === "Active") {
      return { color: "#166534", background: "#DCFCE7" };
    }
    return { color: "#92400E", background: "#FEF3C7" };
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
          Customer Hub
        </div>

        <h1
          style={{
            fontSize: "36px",
            fontWeight: 800,
            margin: 0,
          }}
        >
          Customers
        </h1>

        <p
          style={{
            fontSize: "15px",
            color: "#64748B",
            marginTop: "10px",
            marginBottom: 0,
          }}
        >
          Manage customer accounts, payment methods, and billing profiles.
        </p>
      </div>

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
            padding: "18px 22px",
            borderBottom: "1px solid #E2E8F0",
            fontSize: "22px",
            fontWeight: 800,
          }}
        >
          Customer Accounts
        </div>

        <div style={{ display: "grid", gap: "12px", padding: "18px 22px" }}>
          {customers.map((row) => {
            const badge = statusStyle(row.status);

            return (
              <div
                key={row.name}
                style={{
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "16px",
                  padding: "16px",
                  display: "grid",
                  gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr",
                  gap: "12px",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: "15px" }}>{row.name}</div>
                  <div style={{ fontSize: "12px", color: "#64748B", marginTop: "4px" }}>
                    {row.contact}
                  </div>
                </div>

                <div style={{ fontSize: "14px", color: "#334155", fontWeight: 600 }}>
                  {row.type}
                </div>

                <div style={{ fontSize: "14px", color: "#334155", fontWeight: 600 }}>
                  {row.payment}
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
                    {row.status}
                  </span>
                </div>

                <div>
                  <a
                    href="/invoices"
                    style={{
                      textDecoration: "none",
                      background: "#6366F1",
                      color: "#FFFFFF",
                      padding: "8px 12px",
                      borderRadius: "10px",
                      fontSize: "13px",
                      fontWeight: 700,
                      display: "inline-block",
                    }}
                  >
                    View Billing
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}