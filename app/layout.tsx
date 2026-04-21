import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "iBirdOS",
  description: "Work smarter, together.",
  icons: {
    icon: "/favicon.ico",
  },
};

const navSections = [
  {
    title: "Overview",
    defaultOpen: true,
    items: [
      { label: "Dashboard", href: "/" },
      { label: "Daily Sales", href: "/sales" },
      { label: "My Orders", href: "/orders" },
      { label: "Finance & P&L", href: "/finance" },
      { label: "Reports", href: "/reports" },
      { label: "Roadmap", href: "/roadmap" },
    ],
  },
  {
    title: "AI Modules",
    defaultOpen: false,
    items: [
      { label: "Voice Orders", href: "/customer" },
      { label: "FDA Alerts", href: "/fda-alerts" },
      { label: "Invoices", href: "/invoices" },
      { label: "Waste Log", href: "/waste" },
      { label: "Marketing AI", href: "/customer" },
      { label: "SEO & Reviews", href: "/customer" },
      { label: "Poster Designer", href: "/customer" },
    ],
  },
  {
    title: "Operations",
    defaultOpen: false,
    items: [
      { label: "Customer", href: "/customer" },
      { label: "Purchasing", href: "/purchasing" },
      { label: "Vendors", href: "/vendors" },
    ],
  },
  {
    title: "Culinary",
    defaultOpen: false,
    items: [
      { label: "Recipes", href: "/recipes" },
      { label: "Menu Works", href: "/menu" },
      { label: "Yield Log", href: "/yield" },
      { label: "Production", href: "/production" },
    ],
  },
  {
    title: "Settings",
    defaultOpen: false,
    items: [
      { label: "Integrations", href: "/integrations" },
      { label: "Team & Roles", href: "/customer" },
      { label: "Settings", href: "/customer" },
    ],
  },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "Inter, Arial, sans-serif",
          background: "#F8FAFC",
          color: "#0F172A",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "260px 1fr",
            minHeight: "100vh",
          }}
        >
          <aside
            style={{
              background: "#FFFFFF",
              borderRight: "1px solid #E2E8F0",
              padding: "20px 16px",
              position: "sticky",
              top: 0,
              height: "100vh",
              overflowY: "auto",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "20px",
              }}
            >
              <img
                src="/logo.png"
                alt="iBirdOS logo"
                style={{
                  width: "52px",
                  height: "52px",
                  objectFit: "contain",
                  borderRadius: "12px",
                  background: "#FFFFFF",
                  padding: "4px",
                  boxShadow: "0 4px 12px rgba(15, 23, 42, 0.08)",
                }}
              />

              <div>
                <div
                  style={{
                    fontSize: "22px",
                    fontWeight: 800,
                    color: "#0F172A",
                    lineHeight: 1.1,
                  }}
                >
                  iBirdOS
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#64748B",
                    marginTop: "4px",
                    lineHeight: 1.4,
                  }}
                >
                  Work smarter, together.
                </div>
              </div>
            </div>

            <div
              style={{
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: "18px",
                padding: "18px",
                marginBottom: "18px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "14px",
                }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#4F46E5",
                    background: "#EEF2FF",
                    padding: "6px 10px",
                    borderRadius: "999px",
                  }}
                >
                  Restaurant
                </span>

                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#475569",
                    background: "#F1F5F9",
                    padding: "6px 10px",
                    borderRadius: "999px",
                  }}
                >
                  RS-10001
                </span>
              </div>

              <div
                style={{
                  fontSize: "18px",
                  fontWeight: 800,
                  color: "#0F172A",
                }}
              >
                Cafe 71
              </div>
            </div>

            <nav style={{ display: "grid", gap: "10px" }}>
              {navSections.map((section) => (
                <details
                  key={section.title}
                  open={section.defaultOpen}
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: "14px",
                    overflow: "hidden",
                  }}
                >
                  <summary
                    style={{
                      listStyle: "none",
                      cursor: "pointer",
                      padding: "14px 14px",
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "#64748B",
                      fontWeight: 800,
                      background: "#F8FAFC",
                    }}
                  >
                    {section.title}
                  </summary>

                  <div
                    style={{
                      display: "grid",
                      gap: "4px",
                      padding: "10px",
                    }}
                  >
                    {section.items.map((item) => (
                      <a
                        key={item.label}
                        href={item.href}
                        style={{
                          textDecoration: "none",
                          color: "#0F172A",
                          fontSize: "15px",
                          fontWeight: 600,
                          padding: "10px 12px",
                          borderRadius: "10px",
                          display: "block",
                          background: "#FFFFFF",
                        }}
                      >
                        {item.label}
                      </a>
                    ))}
                  </div>
                </details>
              ))}
            </nav>
          </aside>

          <main
            style={{
              background: "#F8FAFC",
            }}
          >
            <div
              style={{
                position: "sticky",
                top: 0,
                zIndex: 20,
                background: "rgba(248,250,252,0.95)",
                backdropFilter: "blur(8px)",
                borderBottom: "1px solid #E2E8F0",
                padding: "16px 28px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "16px",
                    fontWeight: 800,
                    color: "#0F172A",
                  }}
                >
                  iBirdOS Workspace
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    color: "#64748B",
                    marginTop: "4px",
                  }}
                >
                  AI-powered operating system for restaurant control
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <a
                  href="/notifications"
                  style={{
                    border: "1px solid #E2E8F0",
                    background: "#FFFFFF",
                    color: "#334155",
                    borderRadius: "12px",
                    padding: "10px 16px",
                    fontSize: "14px",
                    fontWeight: 600,
                    textDecoration: "none",
                    display: "inline-block",
                  }}
                >
                  Notifications
                </a>

                <a
                  href="/customer"
                  style={{
                    background: "#6366F1",
                    color: "#FFFFFF",
                    borderRadius: "12px",
                    padding: "10px 16px",
                    fontSize: "14px",
                    fontWeight: 700,
                    textDecoration: "none",
                    display: "inline-block",
                  }}
                >
                  New Action
                </a>
              </div>
            </div>

            <div style={{ padding: "28px" }}>{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}