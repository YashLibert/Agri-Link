import { useState } from "react";
import axios from "../api/axios";

// ── Constants ──────────────────────────────────────────────────────────────────

const CROPS = ["onion", "grape", "pomegranate", "mango", "tomato", "banana", "chilli", "soybean"];
const COUNTRIES = ["EU", "UK", "USA", "UAE"];
const DISTRICTS = ["nashik", "pune", "aurangabad", "mumbai", "nagpur", "kolhapur", "solapur", "satara"];
const PESTICIDES = [
  "chlorpyrifos", "thiamethoxam", "imidacloprid", "cypermethrin",
  "lambda_cyhalothrin", "profenofos", "mancozeb", "carbendazim",
  "acephate", "dimethoate"
];

const RISK_CONFIG = {
  CRITICAL: { color: "#7f1d1d", bg: "#fee2e2", icon: "🚫", label: "Critical Risk" },
  HIGH:    { color: "#991b1b", bg: "#fee2e2", icon: "⚠️", label: "High Risk" },
  MEDIUM:  { color: "#7b4f12", bg: "#fef3c7", icon: "🟡", label: "Medium Risk" },
  LOW:     { color: "#2d6a4f", bg: "#d8f3dc", icon: "🟢", label: "Low Risk" },
  VERY_LOW: { color: "#064e3b", bg: "#d1fae5", icon: "✅", label: "Very Low Risk" },
};

const FLAG_CONFIG = {
  CRITICAL: { color: "#7f1d1d", bg: "#fee2e2" },
  HIGH:     { color: "#991b1b", bg: "#fee2e2" },
  MEDIUM:   { color: "#7b4f12", bg: "#fef3c7" },
  LOW:      { color: "#2d6a4f", bg: "#d8f3dc" },
  VERY_LOW: { color: "#064e3b", bg: "#d1fae5" },
  UNKNOWN:  { color: "#4b5563", bg: "#f3f4f6" },
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function RiskBadge({ level }) {
  const cfg = RISK_CONFIG[level] || RISK_CONFIG.MEDIUM;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "6px",
      padding: "4px 12px", borderRadius: "999px",
      backgroundColor: cfg.bg, color: cfg.color,
      fontFamily: "DM Mono, monospace", fontSize: "13px", fontWeight: 600,
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function SectionCard({ title, children, accent = "#2d6a4f" }) {
  return (
    <div style={{
      background: "var(--cream, #faf8f3)",
      border: "1px solid #e5e0d5",
      borderLeft: `4px solid ${accent}`,
      borderRadius: "10px",
      padding: "20px 24px",
      marginBottom: "16px",
    }}>
      <p style={{
        fontFamily: "Playfair Display, serif",
        fontSize: "15px", fontWeight: 700,
        color: "#1a1a1a", marginBottom: "14px",
        letterSpacing: "0.01em",
      }}>{title}</p>
      {children}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px", gap: "12px" }}>
      <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: "13px", color: "#6b7280", flexShrink: 0 }}>{label}</span>
      <span style={{ fontFamily: "DM Mono, monospace", fontSize: "13px", color: "#1a1a1a", textAlign: "right" }}>{value}</span>
    </div>
  );
}

function PesticideTable({ breakdown }) {
  if (!breakdown?.length) return null;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", fontFamily: "DM Sans, sans-serif" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #e5e0d5" }}>
            {["Pesticide", "Risk Level", "MRL Limit", "PHI Status", "Risk Analysis"].map(h => (
              <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "#6b7280", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {breakdown.map((row, i) => {
            const flagCfg = FLAG_CONFIG[row.flag] || FLAG_CONFIG.UNKNOWN;
            return (
              <tr key={i} style={{ borderBottom: "1px solid #f0ede6" }}>
                <td style={{ padding: "10px 12px", fontFamily: "DM Mono, monospace", color: "#1a1a1a" }}>
                  {row.pesticide.replace(/_/g, " ")}
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <span style={{
                    padding: "2px 8px", borderRadius: "999px",
                    backgroundColor: flagCfg.bg, color: flagCfg.color,
                    fontWeight: 600, fontSize: "12px"
                  }}>{row.flag}</span>
                </td>
                <td style={{ padding: "10px 12px", fontFamily: "DM Mono, monospace" }}>{row.mrl_limit || "—"}</td>
                <td style={{ padding: "10px 12px", color: "#4b5563" }}>{row.phi_status || "—"}</td>
                <td style={{ padding: "10px 12px", color: "#6b7280", fontSize: "12px" }}>
                  {row.risk_factors ? (
                    <div style={{ lineHeight: 1.4 }}>
                      <div><strong>Score:</strong> {row.risk_points}/100</div>
                      <div><strong>MRL:</strong> {row.risk_factors.mrl_strictness}</div>
                      <div><strong>Status:</strong> {row.risk_factors.status_penalty}</div>
                      <div><strong>PHI:</strong> {row.risk_factors.phi_penalty}</div>
                      <div><strong>Qty:</strong> {row.risk_factors.quantity_penalty}</div>
                    </div>
                  ) : (
                    row.note || "—"
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ExportReadiness() {
  const [form, setForm] = useState({
    crop: "onion",
    country: "EU",
    origin_district: "nashik",
    quantity_quintals: 200,
    pesticides_used: [],
    days_since_last_spray: 14,
    demanded_price_per_quintal: "",
  });

  const [loading, setLoading]   = useState(false);
  const [result,  setResult]    = useState(null);
  const [error,   setError]     = useState(null);
  const [tab,     setTab]       = useState("phyto"); // phyto | logistics | action

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); }

  function togglePesticide(p) {
    setForm(f => ({
      ...f,
      pesticides_used: f.pesticides_used.includes(p)
        ? f.pesticides_used.filter(x => x !== p)
        : [...f.pesticides_used, p],
    }));
  }

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const payload = {
        ...form,
        quantity_quintals:     Number(form.quantity_quintals),
        days_since_last_spray: Number(form.days_since_last_spray),
        demanded_price_per_quintal: form.demanded_price_per_quintal ? Number(form.demanded_price_per_quintal) : null,
        pesticides_used: form.pesticides_used.length > 0 ? form.pesticides_used : null,
      };
      const { data } = await axios.post("/api/ml/export-readiness", payload);
      setResult(data);
      setTab("phyto");
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const risk    = result?.summary?.risk_level;
  const riskCfg = risk ? RISK_CONFIG[risk] : null;

  return (
    <div style={{ fontFamily: "DM Sans, sans-serif", color: "#1a1a1a" }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: "28px" }}>
        <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "22px", fontWeight: 700, margin: 0 }}>
          Export Readiness Check
        </h2>
        <p style={{ color: "#6b7280", fontSize: "14px", marginTop: "4px" }}>
          AI-powered compliance check — phytosanitary risk + full logistics chain for your crop
        </p>
      </div>

      {/* ── Form ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "16px",
        background: "var(--cream, #faf8f3)",
        border: "1px solid #e5e0d5",
        borderRadius: "12px",
        padding: "24px",
        marginBottom: "24px",
      }}>

        {/* Crop */}
        <div>
          <label style={labelStyle}>Crop</label>
          <select value={form.crop} onChange={e => set("crop", e.target.value)} style={selectStyle}>
            {CROPS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
        </div>

        {/* Country */}
        <div>
          <label style={labelStyle}>Target Country</label>
          <select value={form.country} onChange={e => set("country", e.target.value)} style={selectStyle}>
            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* District */}
        <div>
          <label style={labelStyle}>Origin District</label>
          <select value={form.origin_district} onChange={e => set("origin_district", e.target.value)} style={selectStyle}>
            {DISTRICTS.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
          </select>
        </div>

        {/* Quantity */}
        <div>
          <label style={labelStyle}>Quantity (Quintals)</label>
          <input
            type="number" min={1}
            value={form.quantity_quintals}
            onChange={e => set("quantity_quintals", e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Demanded Price */}
        <div>
          <label style={labelStyle}>Demanded Price (₹/Quintal)</label>
          <input
            type="number" min={0} step={10}
            value={form.demanded_price_per_quintal}
            onChange={e => set("demanded_price_per_quintal", e.target.value)}
            style={inputStyle}
            placeholder="Optional - for price validation"
          />
        </div>

        {/* Days since spray */}
        <div>
          <label style={labelStyle}>Days Since Last Spray</label>
          <input
            type="number" min={0} max={90}
            value={form.days_since_last_spray}
            onChange={e => set("days_since_last_spray", e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      {/* Pesticides multi-select */}
      <div style={{
        background: "var(--cream, #faf8f3)",
        border: "1px solid #e5e0d5",
        borderRadius: "12px",
        padding: "20px 24px",
        marginBottom: "24px",
      }}>
        <label style={{ ...labelStyle, display: "block", marginBottom: "12px" }}>
          Pesticides Used <span style={{ color: "#9ca3af", fontWeight: 400 }}>(leave empty to use crop defaults)</span>
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {PESTICIDES.map(p => {
            const selected = form.pesticides_used.includes(p);
            return (
              <button key={p} onClick={() => togglePesticide(p)} style={{
                padding: "5px 12px", borderRadius: "999px", border: "1.5px solid",
                borderColor: selected ? "#2d6a4f" : "#d1d5db",
                background: selected ? "#d8f3dc" : "white",
                color: selected ? "#2d6a4f" : "#4b5563",
                fontFamily: "DM Mono, monospace", fontSize: "12px",
                cursor: "pointer", transition: "all 0.15s ease",
                fontWeight: selected ? 600 : 400,
              }}>
                {p.replace(/_/g, " ")}
              </button>
            );
          })}
        </div>
      </div>

      {/* Submit */}
      <button onClick={handleSubmit} disabled={loading} style={{
        background: loading ? "#9ca3af" : "#2d6a4f",
        color: "white", border: "none", borderRadius: "8px",
        padding: "12px 32px", fontSize: "15px", fontWeight: 600,
        cursor: loading ? "not-allowed" : "pointer",
        fontFamily: "DM Sans, sans-serif",
        transition: "background 0.2s ease",
        marginBottom: "32px",
        width: "100%",
      }}>
        {loading ? "Analysing…" : "Check Export Readiness →"}
      </button>

      {error && (
        <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "8px", padding: "14px 18px", marginBottom: "20px", color: "#991b1b", fontSize: "14px" }}>
          {error}
        </div>
      )}

      {/* ── Results ── */}
      {result && (
        <div>

          {/* Summary banner */}
          <div style={{
            background: riskCfg ? riskCfg.bg : "#f3f4f6",
            border: `1.5px solid ${riskCfg ? riskCfg.color : "#d1d5db"}`,
            borderRadius: "12px",
            padding: "20px 24px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}>
            <div>
              <p style={{ fontFamily: "Playfair Display, serif", fontSize: "18px", fontWeight: 700, margin: 0, color: riskCfg?.color }}>
                {result.summary.crop.charAt(0).toUpperCase() + result.summary.crop.slice(1)} → {result.summary.country}
              </p>
              <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#4b5563" }}>
                {result.summary.quantity} · {result.summary.origin}
              </p>
              {result.summary.price_analysis && (
                <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#6b7280" }}>
                  {result.summary.price_analysis.domestic_vs_export} · {result.summary.price_analysis.farmer_positioning}
                </p>
              )}
            </div>
            <div style={{ textAlign: "right" }}>
              <RiskBadge level={risk} />
              <p style={{ margin: "6px 0 0", fontSize: "13px", color: riskCfg?.color, fontWeight: 600 }}>
                {result.summary.likely_result}
              </p>
            </div>
          </div>

          {/* Tab nav */}
          <div style={{ display: "flex", gap: "4px", marginBottom: "20px", borderBottom: "2px solid #e5e0d5" }}>
            {[
              { key: "phyto",     label: "🔬 Phytosanitary Risk" },
              { key: "price",     label: "💰 Price Analysis" },
              { key: "logistics", label: "🚢 Logistics Chain" },
              { key: "action",    label: "📋 Action Plan" },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                padding: "10px 18px", border: "none", background: "transparent",
                fontFamily: "DM Sans, sans-serif", fontSize: "14px", fontWeight: tab === t.key ? 700 : 400,
                color: tab === t.key ? "#2d6a4f" : "#6b7280",
                borderBottom: tab === t.key ? "2px solid #2d6a4f" : "2px solid transparent",
                marginBottom: "-2px", cursor: "pointer",
              }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Phyto Tab ── */}
          {tab === "phyto" && (() => {
            const p = result.phytosanitary;
            return (
              <div>
                <SectionCard title="Compliance Summary" accent={riskCfg?.color}>
                  <InfoRow label="Overall Risk"       value={<RiskBadge level={p.overall_risk} />} />
                  <InfoRow label="Likely Outcome"     value={p.likely_result} />
                  <InfoRow label="Days Since Spray"   value={`${p.days_since_last_spray} days`} />
                  {p.crop_context && <InfoRow label="Context" value={p.crop_context} />}
                </SectionCard>

                <SectionCard title="Pesticide Breakdown" accent="#7b4f12">
                  <PesticideTable breakdown={p.pesticide_breakdown} />
                </SectionCard>

                <SectionCard title="Recommendations" accent="#2d6a4f">
                  <ul style={{ margin: 0, padding: "0 0 0 18px" }}>
                    {p.recommendations?.map((r, i) => (
                      <li key={i} style={{ fontSize: "14px", marginBottom: "8px", lineHeight: 1.5, color: "#374151" }}>{r}</li>
                    ))}
                  </ul>
                </SectionCard>

                <SectionCard title="Recommended Lab Testing" accent="#4b5563">
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
                    {p.lab_testing_options?.map((lab, i) => (
                      <div key={i} style={{ background: "white", borderRadius: "8px", border: "1px solid #e5e0d5", padding: "14px" }}>
                        <p style={{ fontWeight: 700, fontSize: "14px", margin: "0 0 6px" }}>{lab.name}</p>
                        <p style={{ fontSize: "12px", color: "#6b7280", margin: "0 0 4px" }}>📍 {lab.location}</p>
                        <p style={{ fontSize: "12px", color: "#6b7280", margin: "0 0 4px" }}>💰 Rs.{lab.cost_inr}</p>
                        <p style={{ fontSize: "12px", color: "#6b7280", margin: 0 }}>⏱ {lab.turnaround_days} days</p>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </div>
            );
          })()}

          {/* ── Price Analysis Tab ── */}
          {tab === "price" && (() => {
            const pa = result.price_analysis;
            if (!pa || pa.error) {
              return (
                <SectionCard title="Price Analysis Unavailable" accent="#6b7280">
                  <p style={{ color: "#6b7280", fontSize: "14px" }}>
                    {pa?.error || "Price analysis requires demanded price input and valid crop data."}
                  </p>
                </SectionCard>
              );
            }

            return (
              <div>
                <SectionCard title="Price Validation" accent={pa.price_realistic && pa.price_competitive ? "#2d6a4f" : "#7b4f12"}>
                  <InfoRow label="Your Demanded Price" value={`₹${pa.demanded_price?.toLocaleString()}/quintal`} />
                  <InfoRow label="Market Domestic Best" value={`₹${pa.market_domestic_best?.toLocaleString()}/quintal`} />
                  <InfoRow label="Predicted Export Price" value={`₹${pa.predicted_export_price?.toLocaleString()}/quintal`} />
                  <InfoRow label="Export Premium" value={`₹${pa.export_premium?.toLocaleString()}/quintal`} />
                  <InfoRow label="Price Realistic" value={pa.price_realistic ? "✅ Yes" : "❌ No"} />
                  <InfoRow label="Price Competitive" value={pa.price_competitive ? "✅ Yes" : "❌ No"} />
                </SectionCard>

                <SectionCard title="Market Insights" accent="#1e40af">
                  {pa.market_insights && Object.entries(pa.market_insights).map(([key, value]) => (
                    <InfoRow key={key} label={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} value={value} />
                  ))}
                </SectionCard>

                <SectionCard title="Earnings Comparison" accent="#2d6a4f">
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                    <div style={{ background: "white", borderRadius: "8px", border: "1px solid #e5e0d5", padding: "16px", textAlign: "center" }}>
                      <p style={{ fontSize: "12px", color: "#6b7280", margin: "0 0 8px" }}>Domestic Market</p>
                      <p style={{ fontSize: "18px", fontWeight: 700, color: "#1a1a1a", margin: 0 }}>
                        ₹{(pa.market_domestic_best * form.quantity_quintals)?.toLocaleString()}
                      </p>
                      <p style={{ fontSize: "12px", color: "#6b7280", margin: "4px 0 0" }}>
                        {form.quantity_quintals} quintals × ₹{pa.market_domestic_best?.toLocaleString()}
                      </p>
                    </div>
                    <div style={{ background: "white", borderRadius: "8px", border: "1px solid #e5e0d5", padding: "16px", textAlign: "center" }}>
                      <p style={{ fontSize: "12px", color: "#6b7280", margin: "0 0 8px" }}>Export Market</p>
                      <p style={{ fontSize: "18px", fontWeight: 700, color: "#2d6a4f", margin: 0 }}>
                        ₹{(pa.predicted_export_price * form.quantity_quintals)?.toLocaleString()}
                      </p>
                      <p style={{ fontSize: "12px", color: "#6b7280", margin: "4px 0 0" }}>
                        {form.quantity_quintals} quintals × ₹{pa.predicted_export_price?.toLocaleString()}
                      </p>
                    </div>
                    <div style={{ background: "white", borderRadius: "8px", border: "1px solid #e5e0d5", padding: "16px", textAlign: "center" }}>
                      <p style={{ fontSize: "12px", color: "#6b7280", margin: "0 0 8px" }}>Potential Extra Income</p>
                      <p style={{ fontSize: "18px", fontWeight: 700, color: pa.export_premium > 0 ? "#2d6a4f" : "#991b1b", margin: 0 }}>
                        ₹{(pa.export_premium * form.quantity_quintals)?.toLocaleString()}
                      </p>
                      <p style={{ fontSize: "12px", color: "#6b7280", margin: "4px 0 0" }}>
                        {pa.export_premium > 0 ? '+' : ''}{((pa.export_premium / pa.market_domestic_best) * 100)?.toFixed(1)}% premium
                      </p>
                    </div>
                  </div>
                </SectionCard>
              </div>
            );
          })()}

          {/* ── Logistics Tab ── */}
          {tab === "logistics" && (() => {
            const l = result.logistics;
            return (
              <div>
                <SectionCard title="Export Port" accent="#1e40af">
                  <InfoRow label="Port"              value={l.port?.name} />
                  <InfoRow label="Distance from Farm" value={l.port?.distance_from_farm} />
                  <InfoRow label="Cold Chain"        value={l.port?.cold_chain} />
                  <InfoRow label="APEDA Office"      value={l.port?.apeda_office} />
                </SectionCard>

                <SectionCard title="Shipping Route" accent="#1e40af">
                  <InfoRow label="Destination Ports"  value={l.shipping?.destination_ports?.join(", ")} />
                  <InfoRow label="Shipping Lines"     value={l.shipping?.shipping_lines?.join(", ")} />
                  <InfoRow label="Transit Time"       value={`${l.shipping?.transit_days} days`} />
                  <InfoRow label="Frequency"          value={l.shipping?.frequency} />
                  <InfoRow label="Container Type"     value={l.shipping?.container_type} />
                  <InfoRow label="Incoterm"           value={l.shipping?.incoterm} />
                  <InfoRow label="Freight per MT"     value={`Rs.${l.shipping?.freight_per_mt_inr}`} />
                  <InfoRow label="Total Freight Est." value={l.shipping?.total_freight_inr} />
                </SectionCard>

                <SectionCard title="Destination Wholesale Markets" accent="#7c3aed">
                  {l.destination_markets?.wholesale_markets?.map((m, i) => (
                    <div key={i} style={{ marginBottom: "12px", paddingBottom: "12px", borderBottom: i < l.destination_markets.wholesale_markets.length - 1 ? "1px solid #e5e0d5" : "none" }}>
                      <p style={{ fontWeight: 700, fontSize: "14px", margin: "0 0 3px" }}>{m.name}</p>
                      <p style={{ fontSize: "12px", color: "#6b7280", margin: "0 0 3px" }}>📍 {m.city}</p>
                      <p style={{ fontSize: "12px", color: "#4b5563", margin: 0 }}>{m.note}</p>
                    </div>
                  ))}
                  <InfoRow label="Diaspora Demand"    value={l.destination_markets?.diaspora_demand} />
                  <InfoRow label="Peak Demand Season" value={l.destination_markets?.peak_demand_months} />
                </SectionCard>

                <SectionCard title="APEDA Export Handlers" accent="#2d6a4f">
                  {l.apeda_handlers?.map((h, i) => (
                    <div key={i} style={{ marginBottom: "12px", paddingBottom: "12px", borderBottom: i < l.apeda_handlers.length - 1 ? "1px solid #e5e0d5" : "none" }}>
                      <p style={{ fontWeight: 700, fontSize: "14px", margin: "0 0 4px" }}>{h.name}</p>
                      <p style={{ fontSize: "12px", color: "#6b7280", margin: "0 0 2px" }}>📞 {h.contact}</p>
                      <p style={{ fontSize: "12px", color: "#6b7280", margin: "0 0 2px" }}>🌐 {h.website}</p>
                      <p style={{ fontSize: "12px", color: "#4b5563", margin: 0 }}>{h.note}</p>
                    </div>
                  ))}
                </SectionCard>

                <SectionCard title="Required Documents" accent="#7b4f12">
                  <ul style={{ margin: 0, padding: "0 0 0 18px" }}>
                    {l.required_documents?.map((doc, i) => (
                      <li key={i} style={{ fontSize: "13px", marginBottom: "6px", color: "#374151", fontFamily: "DM Mono, monospace" }}>{doc}</li>
                    ))}
                  </ul>
                </SectionCard>

                <SectionCard title="Cold Chain Providers" accent="#4b5563">
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px" }}>
                    {l.cold_chain_providers?.map((c, i) => (
                      <div key={i} style={{ background: "white", borderRadius: "8px", border: "1px solid #e5e0d5", padding: "12px" }}>
                        <p style={{ fontWeight: 700, fontSize: "13px", margin: "0 0 5px" }}>{c.name}</p>
                        <p style={{ fontSize: "12px", color: "#6b7280", margin: "0 0 3px" }}>📍 {c.coverage}</p>
                        <p style={{ fontSize: "12px", color: "#2d6a4f", margin: 0 }}>🌐 {c.contact}</p>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </div>
            );
          })()}

          {/* ── Action Plan Tab ── */}
          {tab === "action" && (
            <SectionCard title="Step-by-Step Action Plan" accent={riskCfg?.color}>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {result.action_plan?.map((step, i) => (
                  <div key={i} style={{
                    background: "white",
                    border: "1px solid #e5e0d5",
                    borderRadius: "8px",
                    padding: "14px 16px",
                    fontSize: "14px",
                    lineHeight: 1.6,
                    color: i === 0 ? riskCfg?.color : "#374151",
                    fontWeight: i === 0 ? 700 : 400,
                  }}>
                    {step}
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

        </div>
      )}
    </div>
  );
}

// ── Shared styles ──────────────────────────────────────────────────────────────

const labelStyle = {
  fontFamily: "DM Sans, sans-serif",
  fontSize: "12px",
  fontWeight: 600,
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  display: "block",
  marginBottom: "6px",
};

const selectStyle = {
  width: "100%",
  padding: "9px 12px",
  border: "1.5px solid #d1d5db",
  borderRadius: "8px",
  fontSize: "14px",
  fontFamily: "DM Sans, sans-serif",
  background: "white",
  color: "#1a1a1a",
  outline: "none",
};

const inputStyle = {
  ...selectStyle,
};