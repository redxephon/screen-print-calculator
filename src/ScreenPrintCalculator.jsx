import { useState, useMemo } from "react";

const DEFAULT_PARAMS = [
  { screens: 1, setup: 44.17, variable: 0.8421, minQty: 12 },
  { screens: 2, setup: 65.03, variable: 1.0258, minQty: 12 },
  { screens: 3, setup: 95.57, variable: 1.1066, minQty: 12 },
  { screens: 4, setup: 107.25, variable: 1.3436, minQty: 13 },
  { screens: 5, setup: 189.87, variable: 1.1877, minQty: 50 },
  { screens: 6, setup: 202.31, variable: 1.3252, minQty: 50 },
];

const QTY_TIERS = [
  { label: "12", min: 12, rep: 12 },
  { label: "13-24", min: 13, rep: 13 },
  { label: "25-49", min: 25, rep: 25 },
  { label: "50-74", min: 50, rep: 50 },
  { label: "75-149", min: 75, rep: 75 },
  { label: "150-249", min: 150, rep: 150 },
  { label: "250-499", min: 250, rep: 250 },
  { label: "500-999", min: 500, rep: 500 },
  { label: "1000-1999", min: 1000, rep: 1000 },
  { label: "2000+", min: 2000, rep: 2000 },
];

const CURRENT_2023 = {
  1: [5.15, 3.82, 2.16, 1.56, 1.41, 1.25, 1.15, 1.05, 0.95, null],
  2: [6.90, 5.64, 3.22, 2.62, 2.08, 1.50, 1.20, 1.10, 1.05, null],
  3: [9.75, 7.76, 4.63, 3.53, 2.27, 1.80, 1.55, 1.20, 1.10, null],
  4: [null, 9.70, 5.04, 4.46, 2.48, 2.10, 1.80, 1.50, 1.25, null],
  5: [null, null, null, 5.50, 2.90, 2.45, 2.00, 1.75, 1.45, null],
  6: [null, null, null, 6.04, 2.97, 2.65, 2.20, 1.95, 1.65, null],
};

const SCREEN_COLORS = [
  { color: "#ef4444" },
  { color: "#f97316" },
  { color: "#eab308" },
  { color: "#22c55e" },
  { color: "#3b82f6" },
  { color: "#a855f7" },
];

function calcPrice(setup, variable, qty, increase) {
  if (qty <= 0) return 0;
  return (1 + increase / 100) * (setup / qty + variable);
}

function formatPrice(val) {
  return "$" + val.toFixed(2);
}

function formatPct(val) {
  const sign = val >= 0 ? "+" : "";
  return sign + val.toFixed(1) + "%";
}

function initParams() {
  return DEFAULT_PARAMS.map((p) => ({ ...p }));
}

export default function ScreenPrintCalculator() {
  const [increase, setIncrease] = useState(15);
  const [params, setParams] = useState(initParams);
  const [locations, setLocations] = useState([{ id: 1, screens: 1, label: "Front" }]);
  const [quickQty, setQuickQty] = useState(100);
  const [showComparison, setShowComparison] = useState(false);
  const [activeTab, setActiveTab] = useState("card");
  const [includeFoldBag, setIncludeFoldBag] = useState(false);
  const [includeFleece, setIncludeFleece] = useState(false);
  const [includeSticker, setIncludeSticker] = useState(false);
  const [includeSleeve, setIncludeSleeve] = useState(false);
  const [includeUnbag, setIncludeUnbag] = useState(false);
  const [pantoneColors, setPantoneColors] = useState(0);

  const LOCATION_LABELS = ["Front", "Back", "Sleeve", "Other"];

  const addLocation = () => {
    if (locations.length >= 4) return;
    const nextLabel = LOCATION_LABELS[locations.length] || `Loc ${locations.length + 1}`;
    setLocations((prev) => [...prev, { id: Date.now(), screens: 1, label: nextLabel }]);
  };

  const removeLocation = (id) => {
    if (locations.length <= 1) return;
    setLocations((prev) => prev.filter((l) => l.id !== id));
  };

  const updateLocationScreens = (id, screens) => {
    setLocations((prev) => prev.map((l) => (l.id === id ? { ...l, screens } : l)));
  };

  const updateParam = (idx, field, value) => {
    setParams((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: parseFloat(value) || 0 };
      return next;
    });
  };

  const rateCard = useMemo(() => {
    return params.map((p) => {
      return QTY_TIERS.map((tier) => {
        if (tier.rep < p.minQty) return null;
        return calcPrice(p.setup, p.variable, tier.rep, increase);
      });
    });
  }, [params, increase]);

  const quickBreakdown = useMemo(() => {
    if (quickQty < 1) return null;
    let totalPrintPerUnit = 0;
    let totalScreenFees = 0;
    const locationDetails = [];
    for (const loc of locations) {
      const p = params[loc.screens - 1];
      if (!p) return null;
      const price = calcPrice(p.setup, p.variable, quickQty, increase);
      totalPrintPerUnit += price;
      totalScreenFees += 27.0 * loc.screens;
      locationDetails.push({ label: loc.label, screens: loc.screens, price });
    }
    const perUnitAddOns =
      (includeFoldBag ? 0.45 : 0) +
      (includeFleece ? 0.50 : 0) +
      (includeSticker ? 0.25 : 0) +
      (includeSleeve ? 0.25 * locations.length : 0) +
      (includeUnbag ? 0.15 : 0);
    const pantoneFees = pantoneColors * 15.0;
    const allInPerUnit = totalPrintPerUnit + perUnitAddOns;
    const printSubtotal = allInPerUnit * quickQty;
    const orderTotal = printSubtotal + totalScreenFees + pantoneFees;
    const totalScreens = locations.reduce((sum, l) => sum + l.screens, 0);
    return {
      totalPrintPerUnit,
      totalScreenFees,
      pantoneFees,
      perUnitAddOns,
      allInPerUnit,
      printSubtotal,
      orderTotal,
      totalScreens,
      locationDetails,
    };
  }, [locations, params, quickQty, increase, includeFoldBag, includeFleece, includeSticker, includeSleeve, includeUnbag, pantoneColors]);

  return (
    <>
      {/* Price Increase Slider */}
      <div className="panel p-4 mb-4">
        <div className="flex items-center gap-4 flex-wrap">
          <label className="section-label whitespace-nowrap">Price Increase</label>
          <input
            type="range"
            min={-20}
            max={50}
            step={1}
            value={increase}
            onChange={(e) => setIncrease(Number(e.target.value))}
            className="rf-slider flex-1 min-w-32"
          />
          <span className="panel-elevated tnum px-3 py-1.5" style={{
            fontSize: 14,
            fontWeight: 700,
            color: increase > 0 ? "var(--ji-green)" : increase < 0 ? "var(--warn-red)" : "var(--text-secondary)",
            borderRadius: "var(--radius-sm)",
          }}>
            {increase}%
          </span>
        </div>
        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
          Price = (1 + Increase%) x (Setup$ / Qty + Variable$/Unit)
        </p>
      </div>

      {/* Quick Calculator */}
      <div className="panel p-4 mb-4">
        <h2 className="section-label mb-3">Quick Price Check</h2>

        {/* Print Locations */}
        <div className="flex flex-wrap items-end gap-5 mb-3">
          {locations.map((loc) => (
            <div key={loc.id}>
              <div className="flex items-center gap-2 mb-1.5">
                <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>{loc.label}</span>
                {locations.length > 1 && (
                  <button
                    onClick={() => removeLocation(loc.id)}
                    style={{
                      width: 16, height: 16, borderRadius: "50%", border: "1px solid var(--border-medium)",
                      background: "var(--bg-surface)", color: "var(--text-muted)", fontSize: 11, lineHeight: 1,
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6].map((s) => (
                  <button
                    key={s}
                    onClick={() => updateLocationScreens(loc.id, s)}
                    style={{
                      width: 32, height: 32, borderRadius: "var(--radius-sm)", fontSize: 12,
                      fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                      border: loc.screens === s ? `2px solid ${SCREEN_COLORS[s - 1].color}` : "1px solid var(--border-medium)",
                      background: loc.screens === s ? "var(--bg-deep)" : "var(--bg-surface)",
                      color: loc.screens === s ? SCREEN_COLORS[s - 1].color : "var(--text-muted)",
                      cursor: "pointer", transition: "all 0.15s ease",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {locations.length < 4 && (
            <button
              onClick={addLocation}
              style={{
                padding: "6px 12px", fontSize: 12, fontWeight: 600, borderRadius: "var(--radius-sm)",
                border: "1px dashed var(--border-medium)", background: "transparent",
                color: "var(--text-muted)", cursor: "pointer", alignSelf: "flex-end",
              }}
            >
              + Location
            </button>
          )}
          <div style={{ width: 1, height: 32, background: "var(--border-subtle)", alignSelf: "flex-end" }} />
          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Quantity</label>
            <input
              type="number"
              min={1}
              value={quickQty}
              onChange={(e) => setQuickQty(Math.max(1, Number(e.target.value)))}
              className="field-editable"
              style={{ width: 100, padding: "7px 10px", textAlign: "center", fontSize: 14, fontWeight: 600 }}
            />
          </div>
        </div>

        {/* Fee Toggles */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2" style={{ fontSize: 12, color: "var(--text-muted)" }}>
          <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>
            Screens: {locations.reduce((s, l) => s + l.screens, 0)} total ({formatPrice(27.0 * locations.reduce((s, l) => s + l.screens, 0))})
          </span>
          <span style={{ color: "var(--border-medium)" }}>|</span>
          {[
            { label: "Fold & Bag (+$0.45)", checked: includeFoldBag, set: setIncludeFoldBag },
            { label: "Fleece (+$0.50)", checked: includeFleece, set: setIncludeFleece },
            { label: "Sticker (+$0.25)", checked: includeSticker, set: setIncludeSticker },
            { label: "Sleeve/Pocket (+$0.25)", checked: includeSleeve, set: setIncludeSleeve },
            { label: "Unbag/Detag (+$0.15)", checked: includeUnbag, set: setIncludeUnbag },
          ].map(({ label, checked, set }) => (
            <label key={label} className="flex items-center gap-1.5 cursor-pointer select-none">
              <input type="checkbox" checked={checked} onChange={(e) => set(e.target.checked)} className="rf-check" />
              {label}
            </label>
          ))}
          <span style={{ color: "var(--border-medium)" }}>|</span>
          <label className="flex items-center gap-1.5 select-none">
            <span>Pantone</span>
            <input
              type="number"
              min={0}
              max={20}
              value={pantoneColors}
              onChange={(e) => setPantoneColors(Math.max(0, Number(e.target.value)))}
              className="field-editable"
              style={{ width: 48, padding: "3px 6px", textAlign: "center", fontSize: 12, fontWeight: 600 }}
            />
            <span style={{ color: "var(--text-muted)" }}>× $15</span>
          </label>
        </div>

        {/* Results */}
        {quickBreakdown !== null && (
          <div className="flex gap-6 items-end mt-4 flex-wrap">
            <div className="panel-inset p-3 text-right">
              <div className="kpi-label mb-1">Per Unit (all locations)</div>
              <div className="kpi-value" style={{ color: "var(--ji-green)" }}>
                {formatPrice(quickBreakdown.allInPerUnit)}
              </div>
              <div className="tnum" style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                {quickBreakdown.locationDetails.map((d, i) => (
                  <span key={i}>{i > 0 && " + "}{formatPrice(d.price)} {d.label.toLowerCase()}</span>
                ))}
                {quickBreakdown.perUnitAddOns > 0 && (
                  <span> + {formatPrice(quickBreakdown.perUnitAddOns)} fees</span>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="kpi-label">Screen Fees</div>
              <div className="tnum" style={{ fontSize: 22, fontWeight: 600, color: "var(--text-primary)" }}>
                {formatPrice(quickBreakdown.totalScreenFees)}
              </div>
              <div className="tnum" style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                $27 × {quickBreakdown.totalScreens} screen{quickBreakdown.totalScreens > 1 ? "s" : ""}
                {quickBreakdown.pantoneFees > 0 && <><br />+ {formatPrice(quickBreakdown.pantoneFees)} Pantone</>}
              </div>
            </div>
            <div className="text-right">
              <div className="kpi-label">Order Total</div>
              <div className="tnum" style={{ fontSize: 22, fontWeight: 700, color: "var(--ji-green)" }}>
                {formatPrice(quickBreakdown.orderTotal)}
              </div>
              <div className="tnum" style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                {quickQty} units
              </div>
            </div>
            <div className="text-right">
              <div className="kpi-label">Per-Location Breakdown</div>
              <div className="tnum" style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
                {quickBreakdown.locationDetails.map((d, i) => (
                  <div key={i}>
                    {d.label}: {formatPrice(d.price)}/ea × {d.screens} screen{d.screens > 1 ? "s" : ""}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 mb-4">
        {[
          { id: "card", label: "Rate Card" },
          { id: "params", label: "Parameters" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={activeTab === tab.id ? "btn-active" : "btn"}
            style={{ padding: "6px 16px", fontSize: 12, borderRadius: "var(--radius-sm)", border: activeTab === tab.id ? "1px solid var(--ji-green)" : "1px solid var(--border-medium)", background: activeTab === tab.id ? "var(--bg-deep)" : "var(--bg-surface)", color: activeTab === tab.id ? "var(--ji-green)" : "var(--text-muted)", cursor: "pointer", fontWeight: activeTab === tab.id ? 600 : 400 }}
          >
            {tab.label}
          </button>
        ))}
        <div className="flex-1" />
        {activeTab === "card" && (
          <label className="flex items-center gap-2 cursor-pointer select-none" style={{ fontSize: 12, color: "var(--text-muted)" }}>
            <input
              type="checkbox"
              checked={showComparison}
              onChange={(e) => setShowComparison(e.target.checked)}
              className="rf-check"
            />
            Show % change from 2023
          </label>
        )}
      </div>

      {/* Rate Card */}
      {activeTab === "card" && (
        <div className="panel overflow-hidden mb-4">
          <div className="overflow-x-auto">
            <table className="rf-table">
              <thead>
                <tr>
                  <th style={{ textAlign: "left", paddingLeft: 12, width: 70 }}>Screens</th>
                  {QTY_TIERS.map((tier) => (
                    <th key={tier.label} style={{ textAlign: "center" }}>{tier.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rateCard.map((row, si) => (
                  <tr key={si} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td style={{ paddingLeft: 12, fontWeight: 700, color: SCREEN_COLORS[si].color, textAlign: "center", fontSize: 15 }}>
                      {si + 1}
                    </td>
                    {row.map((price, qi) => {
                      const old2023 = CURRENT_2023[si + 1][qi];
                      const pctChange = price !== null && old2023 !== null ? ((price - old2023) / old2023) * 100 : null;

                      return (
                        <td key={qi} style={{ textAlign: "center", padding: "8px 6px" }}>
                          {price === null ? (
                            <span style={{ color: "var(--warn-red)", fontSize: 10, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>CALL</span>
                          ) : (
                            <div>
                              <div className="tnum" style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 13 }}>
                                {formatPrice(price)}
                              </div>
                              {showComparison && pctChange !== null && (
                                <div className="tnum" style={{
                                  fontSize: 10,
                                  marginTop: 2,
                                  color: pctChange > 20 ? "var(--warn-red)" : pctChange > 0 ? "var(--fund-amber)" : pctChange > -5 ? "var(--text-muted)" : "var(--ji-green)",
                                }}>
                                  {formatPct(pctChange)}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Parameters Panel */}
      {activeTab === "params" && (
        <div className="panel p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="section-label">Cost Parameters Per Screen Count</h2>
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                Setup$ = fixed cost amortized over quantity | Variable$/Unit = per-unit floor cost
              </p>
            </div>
            <button
              onClick={() => setParams(initParams)}
              className="btn"
              style={{ fontSize: 12, padding: "5px 14px" }}
            >
              Reset to Fitted
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {params.map((p, i) => (
              <div key={i} className="panel-elevated p-4">
                <div style={{ fontWeight: 700, color: SCREEN_COLORS[i].color, marginBottom: 10, display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "var(--radius-sm)", background: SCREEN_COLORS[i].color, display: "inline-block" }} />
                  {p.screens} Screen{p.screens > 1 ? "s" : ""}
                </div>
                <div className="space-y-2.5">
                  {[
                    { label: "Setup $", field: "setup", step: 1 },
                    { label: "Var $/u", field: "variable", step: 0.01 },
                    { label: "Min Qty", field: "minQty", step: 1 },
                  ].map(({ label, field, step }) => (
                    <div key={field} className="flex items-center gap-2">
                      <label style={{ fontSize: 12, color: "var(--text-muted)", width: 52, fontWeight: 500 }}>{label}</label>
                      <input
                        type="number"
                        step={step}
                        value={p[field]}
                        onChange={(e) => updateParam(i, field, e.target.value)}
                        className="field-editable"
                        style={{ flex: 1, padding: "5px 8px", textAlign: "center", fontSize: 13, fontWeight: 600 }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Additional Fees */}
      <div className="panel p-4">
        <h2 className="section-label mb-3">Additional Fees & Notes</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1" style={{ fontSize: 13 }}>
          {[
            ["Screen Fee", "$27.00 /screen"],
            ["Screen Set-up (Reorder <1yr)", "$7.00 /screen"],
            ["Fold and Bag", "$0.45 each"],
            ["Sticker", "+$0.25 each"],
            ["Pantone Color Match", "+$15.00 each"],
            ["Fleece Printing", "+$0.50 each"],
            ["Sleeve/Pocket/Pant Leg", "+$0.25 /location"],
            ["Unbagging/Detagging", "$0.15 each"],
            ["Spoilage Allowance", "3%"],
            ["Minimum Order", "12 pieces"],
            ["Turnaround", "2-3 weeks"],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between py-1.5" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              <span style={{ color: "var(--text-muted)" }}>{label}</span>
              <span className="tnum" style={{ fontWeight: 600, color: "var(--text-secondary)" }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
