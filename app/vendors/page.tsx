export default function VendorApplyPage() {
  const sections = [
    "Company Information",
    "Primary Contact",
    "Service Coverage",
    "Product Categories",
    "Compliance + Documents",
    "Operational Readiness",
  ];

  const checklist = [
    "Business license ready",
    "Insurance certificate ready",
    "Food safety documents ready",
    "Service cities listed",
    "Delivery capability explained",
    "References prepared",
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
              Become a Vendor with iBirdOS
            </div>
            <h1
              style={{
                fontSize: "36px",
                fontWeight: 800,
                margin: 0,
                color: "#0F172A",
              }}
            >
              Vendor Application
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
              Submit your company details for AI review, executive approval, and location inspection.
            </p>
          </div>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <a
              href="/vendors"
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
              Back to Vendor Review
            </a>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.5fr 0.8fr",
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
              marginBottom: "18px",
            }}
          >
            Application Form
          </h2>

          <div style={{ display: "grid", gap: "18px" }}>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "8px" }}>
                Company Name
              </div>
              <input
                placeholder="Enter legal business name"
                style={inputStyle}
              />
            </div>

            <div style={twoCol}>
              <div>
                <div style={labelStyle}>Business Type</div>
                <select style={inputStyle}>
                  <option>Produce Supplier</option>
                  <option>Protein Supplier</option>
                  <option>Dairy Supplier</option>
                  <option>Packaging Vendor</option>
                  <option>Broadline Distributor</option>
                  <option>Specialty Vendor</option>
                </select>
              </div>

              <div>
                <div style={labelStyle}>Years in Business</div>
                <input placeholder="e.g. 12" style={inputStyle} />
              </div>
            </div>

            <div style={twoCol}>
              <div>
                <div style={labelStyle}>Primary Contact</div>
                <input placeholder="Full name" style={inputStyle} />
              </div>

              <div>
                <div style={labelStyle}>Job Title</div>
                <input placeholder="Sales Manager / Owner / Director" style={inputStyle} />
              </div>
            </div>

            <div style={twoCol}>
              <div>
                <div style={labelStyle}>Email</div>
                <input placeholder="name@company.com" style={inputStyle} />
              </div>

              <div>
                <div style={labelStyle}>Phone</div>
                <input placeholder="(555) 555-5555" style={inputStyle} />
              </div>
            </div>

            <div style={twoCol}>
              <div>
                <div style={labelStyle}>Headquarters City</div>
                <input placeholder="Seattle, WA" style={inputStyle} />
              </div>

              <div>
                <div style={labelStyle}>Service Area</div>
                <input placeholder="Cities / states served" style={inputStyle} />
              </div>
            </div>

            <div>
              <div style={labelStyle}>Product Categories</div>
              <input
                placeholder="Produce, poultry, dairy, packaging, frozen, dry goods..."
                style={inputStyle}
              />
            </div>

            <div>
              <div style={labelStyle}>Delivery Capability</div>
              <textarea
                placeholder="Describe minimum order size, delivery days, lead times, refrigerated capability, and emergency support."
                style={textareaStyle}
              />
            </div>

            <div style={twoCol}>
              <div>
                <div style={labelStyle}>Business License Status</div>
                <select style={inputStyle}>
                  <option>Ready to upload</option>
                  <option>Pending renewal</option>
                  <option>Will send after submission</option>
                </select>
              </div>

              <div>
                <div style={labelStyle}>Insurance Status</div>
                <select style={inputStyle}>
                  <option>COI ready</option>
                  <option>Needs update</option>
                  <option>Will send after submission</option>
                </select>
              </div>
            </div>

            <div>
              <div style={labelStyle}>Certifications / Food Safety</div>
              <input
                placeholder="HACCP, SQF, ISO, local health compliance, organic, halal..."
                style={inputStyle}
              />
            </div>

            <div>
              <div style={labelStyle}>References</div>
              <textarea
                placeholder="List 2 or 3 client references with city and service type."
                style={textareaStyle}
              />
            </div>

            <div>
              <div style={labelStyle}>Why should iBirdOS approve your company?</div>
              <textarea
                placeholder="Share service strengths, pricing edge, reliability, and why you are a fit for the iBirdOS network."
                style={textareaStyle}
              />
            </div>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", paddingTop: "6px" }}>
              <a
                href="mailto:partner@ibirdos.com?subject=New Vendor Application"
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
                Submit Application
              </a>

              <a
                href="mailto:partner@ibirdos.com?subject=Vendor Application Draft"
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
                Save as Draft
              </a>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gap: "20px" }}>
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
              Before You Submit
            </h2>

            <div style={{ display: "grid", gap: "10px" }}>
              {checklist.map((item) => (
                <div
                  key={item}
                  style={{
                    background: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    borderRadius: "14px",
                    padding: "12px 14px",
                    fontSize: "13px",
                    color: "#334155",
                  }}
                >
                  ☐ {item}
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
              What Happens Next
            </h2>

            <div style={{ display: "grid", gap: "12px" }}>
              {sections.map((step, index) => (
                <div
                  key={step}
                  style={{
                    display: "flex",
                    gap: "12px",
                    alignItems: "flex-start",
                    background: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    borderRadius: "14px",
                    padding: "14px 16px",
                  }}
                >
                  <div
                    style={{
                      minWidth: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background: "#EEF2FF",
                      color: "#4338CA",
                      fontWeight: 800,
                      fontSize: "13px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {index + 1}
                  </div>

                  <div
                    style={{
                      fontSize: "13px",
                      color: "#334155",
                      lineHeight: 1.6,
                      fontWeight: 600,
                    }}
                  >
                    {step}
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: "18px",
                background: "#EEF2FF",
                color: "#4338CA",
                borderRadius: "14px",
                padding: "14px 16px",
                fontSize: "13px",
                fontWeight: 700,
                lineHeight: 1.6,
              }}
            >
              After submission, iBirdOS AI will review your application, prepare an internal summary, and move qualified vendors into inspection review.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #D8E0EC",
  borderRadius: "12px",
  padding: "12px 14px",
  fontSize: "14px",
  color: "#0F172A",
  background: "#FFFFFF",
  boxSizing: "border-box",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  minHeight: "110px",
  border: "1px solid #D8E0EC",
  borderRadius: "12px",
  padding: "12px 14px",
  fontSize: "14px",
  color: "#0F172A",
  background: "#FFFFFF",
  resize: "vertical",
  boxSizing: "border-box",
  fontFamily: "Inter, sans-serif",
};

const labelStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 700,
  marginBottom: "8px",
};

const twoCol: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "16px",
};