import { useState, useMemo, useCallback, useRef } from "react";

const DEFAULT_SETTINGS = {
  jiFeePct: 15,
  jiMinPerUnit: 2.0,
  apparelMarkupPct: 10,
  clientFeePct: 12,
  clientMinPerUnit: 2.5,
  fundraiserPct: 8,
  fundraiserMin: 3.0,
  decoMarginPct: 30,
  clientName: "Fairview Equestrian",
  contractClient: "Jeff",
};

const DEFAULT_ITEMS = [
  { id: 1, product: "Womens Fitted Tee", location: "Front", decoCogs: 5.38, apparelCost: 3.39, qty: 5 },
  { id: 2, product: "Youth Crewneck Sweatshirt", location: "Front", decoCogs: 5.38, apparelCost: 6.92, qty: 0 },
  { id: 3, product: "Youth Hooded Sweatshirt", location: "Front", decoCogs: 5.38, apparelCost: 11.10, qty: 4 },
  { id: 4, product: "Womens Tank Top", location: "Front", decoCogs: 5.38, apparelCost: 3.61, qty: 1 },
  { id: 5, product: "Carhartt Hoodie", location: "Front", decoCogs: 5.38, apparelCost: 45.64, qty: 4 },
  { id: 6, product: "Women's Fleece Jacket", location: "Back", decoCogs: 5.38, apparelCost: 24.83, qty: 0 },
  { id: 7, product: "Carhartt Mock Zip Hoodie", location: "Back", decoCogs: 5.38, apparelCost: 49.44, qty: 0 },
  { id: 8, product: "Men's/Womens Jacket", location: "Front Left Chest", decoCogs: 7.63, apparelCost: 22.35, qty: 5 },
  { id: 9, product: "Womens Leggings", location: "Front Hip", decoCogs: 2.80, apparelCost: 18.23, qty: 1 },
  { id: 10, product: "Youth Joggers", location: "Front Hip", decoCogs: 2.80, apparelCost: 10.79, qty: 2 },
  { id: 11, product: "Mesh Cap", location: "Front", decoCogs: 4.76, apparelCost: 9.23, qty: 0 },
  { id: 12, product: "Beanie", location: "Front", decoCogs: 4.76, apparelCost: 15.21, qty: 0 },
  { id: 13, product: "Visor", location: "Front", decoCogs: 4.76, apparelCost: 5.02, qty: 1 },
  { id: 14, product: "Headband", location: "Front", decoCogs: 4.76, apparelCost: 2.49, qty: 2 },
];

const LOCATIONS = ["Front", "Back", "Front Left Chest", "Front Hip", "Sleeve", "Full Front", "Full Back"];

const fmt = (v) => "$" + v.toFixed(2);
const fmtPct = (v) => v.toFixed(1) + "%";

function calcItem(item, s) {
  const jiPct = s.jiFeePct / 100;
  const jiMin = s.jiMinPerUnit;
  const mkupPct = s.apparelMarkupPct / 100;
  const clientPct = s.clientFeePct / 100;
  const clientMin = s.clientMinPerUnit;
  const fundPct = s.fundraiserPct / 100;
  const fundMin = s.fundraiserMin;
  const decoMgn = s.decoMarginPct / 100;

  const decoPrice = item.decoCogs * (1 + decoMgn);
  const decoProfit = decoPrice - item.decoCogs;
  const apparelMarkup = item.apparelCost * mkupPct;
  const hardCosts = decoPrice + item.apparelCost + apparelMarkup;

  // Iteratively solve for retail that satisfies all minimums
  const baseDenom = 1 - jiPct - clientPct - fundPct;
  let retail = baseDenom > 0 ? hardCosts / baseDenom : hardCosts * 10;

  for (let i = 0; i < 5; i++) {
    const jiIsMin = jiMin > retail * jiPct;
    const clientIsMin = clientMin > retail * clientPct;
    const fundIsMin = fundMin > retail * fundPct;

    let pctDenom = 1;
    let fixedCosts = hardCosts;
    if (jiIsMin) { fixedCosts += jiMin; } else { pctDenom -= jiPct; }
    if (clientIsMin) { fixedCosts += clientMin; } else { pctDenom -= clientPct; }
    if (fundIsMin) { fixedCosts += fundMin; } else { pctDenom -= fundPct; }

    const newRetail = pctDenom > 0 ? fixedCosts / pctDenom : fixedCosts * 10;
    if (Math.abs(newRetail - retail) < 0.005) break;
    retail = newRetail;
  }

  const roundedRetail = Math.ceil(retail);

  const jiFeeAmt = Math.max(roundedRetail * jiPct, jiMin);
  const jiMinApplied = jiMin > roundedRetail * jiPct;
  const clientFeeAmt = Math.max(roundedRetail * clientPct, clientMin);
  const clientMinApplied = clientMin > roundedRetail * clientPct;
  const fundAmt = Math.max(roundedRetail * fundPct, fundMin);
  const fundMinApplied = fundMin > roundedRetail * fundPct;

  const jiTotalPerUnit = jiFeeAmt + apparelMarkup + decoProfit;

  const revenue = roundedRetail * item.qty;
  const fundPayout = fundAmt * item.qty;
  const clientFeeTotal = clientFeeAmt * item.qty;
  const apparelTotal = (item.apparelCost + apparelMarkup) * item.qty;
  const decoCogTotal = item.decoCogs * item.qty;
  const decoProfitTotal = decoProfit * item.qty;
  const apparelMarkupTotal = apparelMarkup * item.qty;
  const jiGross = jiTotalPerUnit * item.qty;

  return {
    decoPrice, decoProfit, apparelMarkup, hardCosts, roundedRetail,
    jiFeeAmt, jiMinApplied, clientFeeAmt, clientMinApplied, fundAmt, fundMinApplied,
    jiTotalPerUnit, revenue, fundPayout, clientFeeTotal, apparelTotal,
    decoCogTotal, decoProfitTotal, apparelMarkupTotal, jiGross,
  };
}

function SettingInput({ label, value, onChange, step, unit, color = "gray" }) {
  const colors = {
    emerald: "border-emerald-200 text-emerald-700 focus:ring-emerald-400",
    blue: "border-blue-200 text-blue-700 focus:ring-blue-400",
    amber: "border-amber-200 text-amber-700 focus:ring-amber-400",
    gray: "border-gray-200 text-gray-700 focus:ring-gray-400",
  };
  return (
    <div className="flex items-center justify-between">
      <label className="text-sm text-gray-600">{label}</label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          step={step}
          min={0}
          className={`w-20 px-2 py-1.5 border rounded-lg text-right font-bold focus:ring-2 outline-none text-sm bg-white ${colors[color]}`}
        />
        <span className="text-xs text-gray-400 w-4">{unit}</span>
      </div>
    </div>
  );
}

export default function WebstoreCalculator() {
  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS });
  const [items, setItems] = useState(DEFAULT_ITEMS.map((i) => ({ ...i })));
  const [showBreakdown, setShowBreakdown] = useState(false);
  const nextId = useRef(100);

  const updateSetting = useCallback((key, val) => {
    setSettings((prev) => ({ ...prev, [key]: val }));
  }, []);

  const updateItem = useCallback((id, field, value) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  }, []);

  const addItem = useCallback(() => {
    setItems((prev) => [...prev, { id: ++nextId.current, product: "", location: "Front", decoCogs: 0, apparelCost: 0, qty: 0 }]);
  }, []);

  const removeItem = useCallback((id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const calculated = useMemo(() => items.map((item) => ({ item, calc: calcItem(item, settings) })), [items, settings]);

  const totals = useMemo(() => {
    const t = { qty: 0, revenue: 0, fundPayout: 0, clientFeeTotal: 0, apparelTotal: 0, decoCogTotal: 0, decoProfitTotal: 0, apparelMarkupTotal: 0, jiGross: 0, rawApparelCost: 0 };
    calculated.forEach(({ item, calc }) => {
      t.qty += item.qty;
      t.revenue += calc.revenue;
      t.fundPayout += calc.fundPayout;
      t.clientFeeTotal += calc.clientFeeTotal;
      t.apparelTotal += calc.apparelTotal;
      t.decoCogTotal += calc.decoCogTotal;
      t.decoProfitTotal += calc.decoProfitTotal;
      t.apparelMarkupTotal += calc.apparelMarkupTotal;
      t.jiGross += calc.jiGross;
      t.rawApparelCost += item.apparelCost * item.qty;
    });
    t.jiFeeRevenue = t.jiGross - t.decoProfitTotal - t.apparelMarkupTotal;
    t.totalPayouts = t.fundPayout + t.clientFeeTotal + t.apparelTotal + t.decoCogTotal;
    t.grossMargin = t.revenue > 0 ? (t.jiGross / t.revenue) * 100 : 0;
    return t;
  }, [calculated]);

  const allocationPct = settings.jiFeePct + settings.clientFeePct + settings.fundraiserPct;
  const overAllocated = allocationPct >= 100;

  return (
    <>
      {/* Store header bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-4 items-center">
          <div>
            <label className="text-xs text-gray-400">Store Name</label>
            <input
              value={settings.clientName}
              onChange={(e) => updateSetting("clientName", e.target.value)}
              className="block w-48 px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-emerald-400 focus:bg-white outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">Contract Client</label>
            <input
              value={settings.contractClient}
              onChange={(e) => updateSetting("contractClient", e.target.value)}
              className="block w-36 px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-emerald-400 focus:bg-white outline-none"
            />
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-emerald-600 tabular-nums">{fmt(totals.jiGross)}</div>
          <div className="text-xs text-gray-400">JI Profit on {totals.qty} units</div>
        </div>
      </div>

      {/* Settings + Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
        <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* JI Settings */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2.5 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Jersey Ink
              </h3>
              <div className="bg-emerald-50/50 rounded-lg p-3 space-y-2.5 border border-emerald-100">
                <SettingInput label="JI Fee %" value={settings.jiFeePct} onChange={(v) => updateSetting("jiFeePct", v)} step={0.5} unit="%" color="emerald" />
                <SettingInput label="JI Min $/Unit" value={settings.jiMinPerUnit} onChange={(v) => updateSetting("jiMinPerUnit", v)} step={0.25} unit="$" color="emerald" />
                <SettingInput label="Apparel Markup" value={settings.apparelMarkupPct} onChange={(v) => updateSetting("apparelMarkupPct", v)} step={0.5} unit="%" color="emerald" />
                <SettingInput label="Deco Margin" value={settings.decoMarginPct} onChange={(v) => updateSetting("decoMarginPct", v)} step={1} unit="%" color="emerald" />
              </div>
            </div>

            {/* Client Settings */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2.5 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Client ({settings.contractClient})
              </h3>
              <div className="bg-blue-50/50 rounded-lg p-3 space-y-2.5 border border-blue-100">
                <SettingInput label="Client Fee %" value={settings.clientFeePct} onChange={(v) => updateSetting("clientFeePct", v)} step={0.5} unit="%" color="blue" />
                <SettingInput label="Client Min $/Unit" value={settings.clientMinPerUnit} onChange={(v) => updateSetting("clientMinPerUnit", v)} step={0.25} unit="$" color="blue" />
              </div>
            </div>

            {/* Fundraiser Settings */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2.5 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Fundraiser
              </h3>
              <div className="bg-amber-50/50 rounded-lg p-3 space-y-2.5 border border-amber-100">
                <SettingInput label="Fundraiser %" value={settings.fundraiserPct} onChange={(v) => updateSetting("fundraiserPct", v)} step={0.5} unit="%" color="amber" />
                <SettingInput label="Fund Min $/Unit" value={settings.fundraiserMin} onChange={(v) => updateSetting("fundraiserMin", v)} step={0.25} unit="$" color="amber" />
              </div>
            </div>
          </div>

          {/* Allocation Bar */}
          <div className="mt-4 pt-3 border-t border-gray-200">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-gray-500 font-medium">Retail % Allocation</span>
              <span className={`font-bold ${overAllocated ? "text-red-500" : "text-gray-700"}`}>{fmtPct(allocationPct)}</span>
            </div>
            <div className="h-4 bg-gray-100 rounded-full overflow-hidden flex">
              <div className="bg-emerald-500 transition-all" style={{ width: `${Math.min(settings.jiFeePct, 100)}%` }} />
              <div className="bg-blue-400 transition-all" style={{ width: `${Math.min(settings.clientFeePct, 100 - settings.jiFeePct)}%` }} />
              <div className="bg-amber-400 transition-all" style={{ width: `${Math.min(settings.fundraiserPct, 100 - settings.jiFeePct - settings.clientFeePct)}%` }} />
            </div>
            <div className="flex gap-3 mt-1.5 text-xs">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> JI</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" /> Client</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Fund</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-200 border border-gray-300" /> Costs</span>
            </div>
            {overAllocated && (
              <div className="mt-2 text-xs text-red-600 font-medium bg-red-50 rounded-lg p-2 border border-red-200">
                Fees exceed 100% — retail cannot cover costs
              </div>
            )}
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Order Summary</h2>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Total Units</span><span className="font-bold text-gray-800">{totals.qty}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Total Revenue</span><span className="font-bold text-gray-800 text-base">{fmt(totals.revenue)}</span></div>

            <div className="border-t border-gray-100 pt-2 space-y-1.5">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Payouts</div>
              <div className="flex justify-between"><span className="text-amber-600">Fundraiser</span><span className="text-amber-600 tabular-nums">{fmt(totals.fundPayout)}</span></div>
              <div className="flex justify-between"><span className="text-blue-600">{settings.contractClient} Fees</span><span className="text-blue-600 tabular-nums">{fmt(totals.clientFeeTotal)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Apparel Cost + Markup</span><span className="text-gray-600 tabular-nums">{fmt(totals.apparelTotal)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Deco COGS</span><span className="text-gray-600 tabular-nums">{fmt(totals.decoCogTotal)}</span></div>
              <div className="flex justify-between border-t border-gray-100 pt-1.5">
                <span className="font-medium text-gray-600">Total Payouts + COGS</span>
                <span className="font-medium text-gray-700 tabular-nums">{fmt(totals.totalPayouts)}</span>
              </div>
            </div>

            <div className="border-t-2 border-emerald-200 pt-2.5 space-y-1.5">
              <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Jersey Ink Earnings</div>
              <div className="flex justify-between text-xs"><span className="text-gray-500">JI Fee Revenue</span><span className="tabular-nums">{fmt(totals.jiFeeRevenue)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-500">Apparel Markup Revenue</span><span className="tabular-nums">{fmt(totals.apparelMarkupTotal)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-500">Deco Profit (margin)</span><span className="tabular-nums">{fmt(totals.decoProfitTotal)}</span></div>
              <div className="flex justify-between text-lg pt-1 border-t border-emerald-100">
                <span className="font-bold text-emerald-800">JI Total Profit</span>
                <span className="font-bold text-emerald-800 tabular-nums">{fmt(totals.jiGross)}</span>
              </div>
            </div>

            <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
              <div className="text-xs text-emerald-600 font-medium">Gross Margin</div>
              <div className="text-2xl font-bold text-emerald-700">{fmtPct(totals.grossMargin)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-4">
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h2 className="text-sm font-bold text-gray-700">Product Pricing Table</h2>
          <div className="flex gap-3 items-center">
            <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none hover:text-gray-700 transition-colors">
              <input type="checkbox" checked={showBreakdown} onChange={(e) => setShowBreakdown(e.target.checked)} className="rounded accent-emerald-600" />
              Full breakdown
            </label>
            <button onClick={addItem} className="text-xs px-3 py-1.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium shadow-sm">
              + Add Item
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800 text-white text-xs">
                <th className="px-1 py-2.5 w-7"></th>
                <th className="px-2 py-2.5 text-left font-semibold uppercase tracking-wider">Product</th>
                <th className="px-2 py-2.5 text-left font-semibold uppercase tracking-wider w-28">Location</th>
                <th className="px-2 py-2.5 text-right font-semibold uppercase tracking-wider w-20">
                  <div>Deco</div><div className="text-slate-400 font-normal normal-case">COGS</div>
                </th>
                <th className="px-2 py-2.5 text-right font-semibold uppercase tracking-wider w-20">
                  <div>Deco</div><div className="text-slate-400 font-normal normal-case">Price</div>
                </th>
                <th className="px-2 py-2.5 text-right font-semibold uppercase tracking-wider w-20">Apparel $</th>
                <th className="px-2 py-2.5 text-right font-semibold uppercase tracking-wider w-20 bg-slate-700">Retail</th>
                <th className="px-2 py-2.5 text-center font-semibold uppercase tracking-wider w-20">
                  <div>Fund</div><div className="text-slate-400 font-normal normal-case">$/unit</div>
                </th>
                <th className="px-2 py-2.5 text-center font-semibold uppercase tracking-wider w-20">
                  <div>Client</div><div className="text-slate-400 font-normal normal-case">$/unit</div>
                </th>
                <th className="px-2 py-2.5 text-center font-semibold uppercase tracking-wider w-20">
                  <div>JI</div><div className="text-slate-400 font-normal normal-case">$/unit</div>
                </th>
                {showBreakdown && (
                  <>
                    <th className="px-2 py-2.5 text-right font-semibold uppercase tracking-wider w-16 bg-slate-700/50">
                      <div>Deco</div><div className="text-slate-400 font-normal normal-case">Profit</div>
                    </th>
                    <th className="px-2 py-2.5 text-right font-semibold uppercase tracking-wider w-16 bg-slate-700/50">
                      <div>Apprl</div><div className="text-slate-400 font-normal normal-case">Markup</div>
                    </th>
                  </>
                )}
                <th className="px-2 py-2.5 text-center font-semibold uppercase tracking-wider w-14">Qty</th>
                <th className="px-2 py-2.5 text-right font-semibold uppercase tracking-wider w-20">Revenue</th>
                <th className="px-2 py-2.5 text-right font-semibold uppercase tracking-wider w-20 bg-emerald-900/30">JI Profit</th>
              </tr>
            </thead>
            <tbody>
              {calculated.map(({ item, calc }, idx) => (
                <tr key={item.id} className={`border-b border-gray-100 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"} hover:bg-emerald-50/30 transition-colors`}>
                  <td className="px-1 py-1.5 text-center">
                    <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-500 transition-colors text-xs leading-none" title="Remove">×</button>
                  </td>
                  <td className="px-2 py-1.5">
                    <input value={item.product} onChange={(e) => updateItem(item.id, "product", e.target.value)}
                      className="w-full bg-transparent border-0 text-sm font-medium text-gray-800 focus:ring-0 outline-none px-0" placeholder="Product name..." />
                  </td>
                  <td className="px-2 py-1.5">
                    <select value={item.location} onChange={(e) => updateItem(item.id, "location", e.target.value)}
                      className="w-full bg-transparent border-0 text-xs text-gray-600 focus:ring-0 outline-none px-0 cursor-pointer">
                      {LOCATIONS.map((loc) => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="number" value={item.decoCogs} onChange={(e) => updateItem(item.id, "decoCogs", parseFloat(e.target.value) || 0)}
                      step={0.01} min={0} className="w-full bg-transparent border-0 text-sm text-right font-medium text-blue-700 focus:ring-0 outline-none tabular-nums" />
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-gray-600 text-sm">{fmt(calc.decoPrice)}</td>
                  <td className="px-2 py-1.5">
                    <input type="number" value={item.apparelCost} onChange={(e) => updateItem(item.id, "apparelCost", parseFloat(e.target.value) || 0)}
                      step={0.01} min={0} className="w-full bg-transparent border-0 text-sm text-right font-medium text-blue-700 focus:ring-0 outline-none tabular-nums" />
                  </td>
                  <td className="px-2 py-1.5 text-right bg-gray-50/50">
                    <span className="font-bold text-gray-900 tabular-nums text-base">{fmt(calc.roundedRetail)}</span>
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <div className="flex items-center justify-center gap-0.5">
                      <span className="tabular-nums font-medium text-amber-700 text-xs">{fmt(calc.fundAmt)}</span>
                      {calc.fundMinApplied && <span className="text-xs bg-amber-100 text-amber-700 px-1 rounded font-bold leading-tight">M</span>}
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <div className="flex items-center justify-center gap-0.5">
                      <span className="tabular-nums font-medium text-blue-600 text-xs">{fmt(calc.clientFeeAmt)}</span>
                      {calc.clientMinApplied && <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded font-bold leading-tight">M</span>}
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <div className="flex items-center justify-center gap-0.5">
                      <span className="tabular-nums font-medium text-emerald-600 text-xs">{fmt(calc.jiFeeAmt)}</span>
                      {calc.jiMinApplied && <span className="text-xs bg-emerald-100 text-emerald-700 px-1 rounded font-bold leading-tight">M</span>}
                    </div>
                  </td>
                  {showBreakdown && (
                    <>
                      <td className="px-2 py-1.5 text-right tabular-nums text-emerald-600 text-xs bg-gray-50/30">{fmt(calc.decoProfit)}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-emerald-600 text-xs bg-gray-50/30">{fmt(calc.apparelMarkup)}</td>
                    </>
                  )}
                  <td className="px-2 py-1.5">
                    <input type="number" step={1} min={0} value={item.qty}
                      onChange={(e) => updateItem(item.id, "qty", parseInt(e.target.value) || 0)}
                      className="w-14 bg-transparent border-0 text-sm text-center text-blue-700 font-semibold focus:ring-0 outline-none tabular-nums" />
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums font-medium text-gray-700">
                    {item.qty > 0 ? fmt(calc.revenue) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className={`px-2 py-1.5 text-right tabular-nums font-bold ${calc.jiGross > 0 ? "text-emerald-700" : calc.jiGross < 0 ? "text-red-600" : "text-gray-300"}`}>
                    {item.qty > 0 ? fmt(calc.jiGross) : <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-800 text-white font-semibold text-xs">
                <td colSpan={showBreakdown ? 12 : 10} className="px-2 py-2.5 text-right uppercase tracking-wider">Totals</td>
                <td className="px-2 py-2.5 text-center tabular-nums">{totals.qty}</td>
                <td className="px-2 py-2.5 text-right tabular-nums">{fmt(totals.revenue)}</td>
                <td className="px-2 py-2.5 text-right tabular-nums text-emerald-300 text-sm">{fmt(totals.jiGross)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Revenue Waterfall */}
      {totals.revenue > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2.5">Revenue Waterfall</h3>
          <div className="h-10 rounded-xl overflow-hidden flex text-xs font-bold text-white shadow-inner">
            {[
              { val: totals.fundPayout, color: "bg-amber-500", label: "Fund" },
              { val: totals.clientFeeTotal, color: "bg-blue-500", label: "Client" },
              { val: totals.rawApparelCost, color: "bg-gray-400", label: "Apparel" },
              { val: totals.decoCogTotal, color: "bg-red-400", label: "Deco COGS" },
              { val: totals.decoProfitTotal, color: "bg-teal-500", label: "Deco Profit" },
              { val: totals.jiFeeRevenue, color: "bg-emerald-600", label: "JI Fees" },
              { val: totals.apparelMarkupTotal, color: "bg-emerald-400", label: "Apprl Mkup" },
            ].map((seg, i) => {
              const pct = (seg.val / totals.revenue) * 100;
              return pct > 0.5 ? (
                <div key={i} className={`${seg.color} flex items-center justify-center transition-all`}
                  style={{ width: `${pct}%` }} title={`${seg.label}: ${fmt(seg.val)} (${fmtPct(pct)})`}>
                  {pct > 7 ? `${seg.label} ${fmtPct(pct)}` : ""}
                </div>
              ) : null;
            })}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5 text-xs">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-500" /> Fund {fmt(totals.fundPayout)}</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-500" /> Client {fmt(totals.clientFeeTotal)}</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-gray-400" /> Apparel {fmt(totals.rawApparelCost)}</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-400" /> Deco COGS {fmt(totals.decoCogTotal)}</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-teal-500" /> Deco Profit {fmt(totals.decoProfitTotal)}</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-600" /> JI Fees+Markup {fmt(totals.jiFeeRevenue + totals.apparelMarkupTotal)}</span>
          </div>
        </div>
      )}
    </>
  );
}
