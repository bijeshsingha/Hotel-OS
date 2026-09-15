import React from "react";
import { Plus, X } from "lucide-react";
import { formatINR, getTaxRateForSac } from "@/lib/gst/calculator";
import { ChargeFormState } from "./billing-types";

interface PostChargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeStay: any;
  chargeForm: ChargeFormState;
  setChargeForm: React.Dispatch<React.SetStateAction<ChargeFormState>>;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  loading: boolean;
}

export function PostChargeModal({
  isOpen,
  onClose,
  activeStay,
  chargeForm,
  setChargeForm,
  onSubmit,
  loading,
}: PostChargeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-md rounded-3xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#121215] p-5 sm:p-6 shadow-2xl space-y-4 text-zinc-900 dark:text-white">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Plus className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Post Charge to Room {activeStay?.roomAssignments?.[0]?.room?.number || "—"}
            </h2>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">
              Guest: {activeStay?.primaryGuest?.name || "In-House Guest"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 text-xs sm:text-sm">
          {/* 1. Single Clean Dropdown for Charge Category */}
          <div>
            <label className="text-xs uppercase font-bold font-mono text-zinc-500 tracking-wider block mb-1.5">
              Select Service / Category *
            </label>
            <select
              value={chargeForm.chargeCode}
              onChange={(e) => {
                const val = e.target.value;
                const presets: Record<string, { desc: string; sac: string }> = {
                  RESTAURANT_FOOD: { desc: "Kitchen Order (KOT)", sac: "996331" },
                  STAY_EXTENSION: { desc: "Stay Extension Charge", sac: "996311" },
                  ROOM_TARIFF: { desc: "Room Tariff / Extra Bed Adjustment", sac: "996311" },
                  LAUNDRY: { desc: "Laundry & Pressing Service", sac: "9997" },
                  TRANSPORT: { desc: "Cab / Airport Pick & Drop", sac: "9964" },
                  MISC: { desc: "Guest Service Charge", sac: "9999" },
                };
                const selected = presets[val] || { desc: "Guest Service Charge", sac: "996331" };
                setChargeForm((prev) => ({
                  ...prev,
                  chargeCode: val,
                  sacHsn: selected.sac,
                  description: prev.kotNumber?.trim()
                    ? `KOT #${prev.kotNumber.trim().toUpperCase()} — ${selected.desc}`
                    : selected.desc,
                }));
              }}
              className="w-full h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3.5 text-xs sm:text-sm text-zinc-900 dark:text-white font-semibold focus:outline-none focus:border-blue-500 transition cursor-pointer"
            >
              <option value="RESTAURANT_FOOD">🍽️ Food & Beverage / Kitchen Order (KOT) (5% GST)</option>
              <option value="STAY_EXTENSION">⏱️ Stay Extension Charge (5% GST)</option>
              <option value="ROOM_TARIFF">🛏️ Room Tariff / Extra Bed Adjustment (5% GST)</option>
              <option value="LAUNDRY">🧺 Laundry & Valet Service (5% GST)</option>
              <option value="TRANSPORT">🚗 Travel / Cab / Transfer (5% GST)</option>
              <option value="MISC">📦 Miscellaneous Guest Service (5% GST)</option>
            </select>
          </div>

          {/* 2. Optional KOT Slip Number */}
          <div>
            <label className="text-xs uppercase font-bold font-mono text-zinc-500 tracking-wider block mb-1.5 flex items-center justify-between">
              <span>KOT Slip Number (Optional / Deliveries)</span>
              <span className="text-[10px] text-zinc-400 font-sans">e.g. KOT-1042 / KOT-55</span>
            </label>
            <input
              type="text"
              placeholder="e.g. KOT-1042"
              value={chargeForm.kotNumber || ""}
              onChange={(e) => {
                const kotVal = e.target.value;
                setChargeForm((prev) => {
                  const baseName = prev.description.replace(/^KOT\s*#?\w+\s*[—–-]\s*/i, "");
                  return {
                    ...prev,
                    kotNumber: kotVal,
                    description: kotVal.trim()
                      ? `KOT #${kotVal.trim().toUpperCase()} — ${baseName || "Kitchen Order"}`
                      : baseName || "Kitchen Order (KOT)",
                  };
                });
              }}
              className="w-full h-11 rounded-xl bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/60 px-3.5 text-xs sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 font-mono font-bold focus:outline-none focus:border-orange-500 transition"
            />
          </div>

          {/* 3. Editable Description */}
          <div>
            <label className="text-xs uppercase font-bold font-mono text-zinc-500 tracking-wider block mb-1.5">
              Description / Item Details *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Dinner Service / Breakfast / Delivery"
              value={chargeForm.description}
              onChange={(e) => setChargeForm({ ...chargeForm, description: e.target.value })}
              className="w-full h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3.5 text-xs sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-blue-500 font-medium transition"
            />
          </div>

          {/* 4. Total Amount (Inclusive of 5% GST) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs uppercase font-bold font-mono text-zinc-500 tracking-wider">
                Total Amount (₹) *
              </label>
              <span className="text-[10.5px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
                ✓ 5% GST Inclusive
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 font-bold text-zinc-400 font-mono text-base">₹</span>
              <input
                type="number"
                required
                step="0.01"
                min="0.01"
                placeholder="0"
                value={chargeForm.amount}
                onChange={(e) => setChargeForm({ ...chargeForm, amount: e.target.value })}
                className="w-full h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 pl-8 pr-3.5 text-base text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono font-black transition"
              />
            </div>
          </div>

          {/* 5. Live 5% GST Inclusive Math Breakdown */}
          {(() => {
            const gross = Number(chargeForm.amount) || 0;
            const taxRatePercent = getTaxRateForSac(chargeForm.sacHsn, gross);
            const baseTaxable = Math.round((gross / (1 + taxRatePercent / 100)) * 100) / 100;
            const totalGst = Math.round((gross - baseTaxable) * 100) / 100;
            const halfRate = (taxRatePercent / 2).toFixed(1);
            const cgst = Math.round((totalGst / 2) * 100) / 100;
            const sgst = Math.round((totalGst - cgst) * 100) / 100;

            return (
              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-zinc-500 font-medium">Tax Calculation ({taxRatePercent}% Inclusive):</span>
                  <span className="font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                    CGST {halfRate}% + SGST {halfRate}%
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                  <div className="bg-white dark:bg-zinc-800/80 p-2 rounded-xl border border-zinc-200 dark:border-zinc-700/60 shadow-xs">
                    <span className="text-[10px] text-zinc-400 block uppercase">Base Taxable</span>
                    <span className="font-bold text-zinc-900 dark:text-white">{formatINR(baseTaxable)}</span>
                  </div>
                  <div className="bg-white dark:bg-zinc-800/80 p-2 rounded-xl border border-zinc-200 dark:border-zinc-700/60 shadow-xs">
                    <span className="text-[10px] text-zinc-400 block uppercase">CGST ({halfRate}%)</span>
                    <span className="font-bold text-zinc-900 dark:text-white">{formatINR(cgst)}</span>
                  </div>
                  <div className="bg-white dark:bg-zinc-800/80 p-2 rounded-xl border border-zinc-200 dark:border-zinc-700/60 shadow-xs">
                    <span className="text-[10px] text-zinc-400 block uppercase">SGST ({halfRate}%)</span>
                    <span className="font-bold text-zinc-900 dark:text-white">{formatINR(sgst)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Total Posted to Room:</span>
                  <span className="text-base sm:text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
                    {formatINR(gross)}
                  </span>
                </div>
              </div>
            );
          })()}

          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="h-10 px-5 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 font-black transition disabled:opacity-50 shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>{loading ? "Posting..." : "Post Charge (5% GST)"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
