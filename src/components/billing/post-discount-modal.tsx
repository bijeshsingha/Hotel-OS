import React from "react";
import { Plus, X } from "lucide-react";
import { DISCOUNT_REASONS } from "@/data";
import { DiscountFormState } from "./billing-types";

interface PostDiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeStay: any;
  discountForm: DiscountFormState;
  setDiscountForm: React.Dispatch<React.SetStateAction<DiscountFormState>>;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  loading: boolean;
}

export function PostDiscountModal({
  isOpen,
  onClose,
  activeStay,
  discountForm,
  setDiscountForm,
  onSubmit,
  loading,
}: PostDiscountModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-md rounded-3xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-[#121215] p-6 shadow-2xl space-y-5 text-zinc-900 dark:text-white">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Plus className="h-5 w-5 text-rose-600 dark:text-rose-400" />
            Add Discount / Rebate to Room {activeStay?.roomAssignments?.[0]?.room?.number}
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 text-xs sm:text-sm">
          <div>
            <label className="text-zinc-700 dark:text-zinc-300 font-bold block mb-1.5">Reason / Description *</label>
            <select
              required
              value={discountForm.description}
              onChange={(e) => setDiscountForm({ ...discountForm, description: e.target.value })}
              className="w-full h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 text-zinc-900 dark:text-white focus:outline-none focus:border-rose-500 font-medium cursor-pointer"
            >
              <option value="Discount / Rebate">General Discount / Rebate</option>
              {DISCOUNT_REASONS.map((r) => (
                <option key={r.id} value={r.label}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-700 dark:text-zinc-300 font-bold block mb-1.5">Discount Amount (₹) *</label>
              <input
                type="number"
                required
                min="1"
                value={discountForm.amount}
                onChange={(e) => setDiscountForm({ ...discountForm, amount: e.target.value })}
                className="w-full h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-rose-300 dark:border-rose-900/60 px-3 text-zinc-900 dark:text-white focus:outline-none focus:border-rose-500 font-mono font-black text-base"
              />
              <p className="text-[11px] text-zinc-500 mt-1">Deducted from final folio total.</p>
            </div>
            <div>
              <label className="text-zinc-700 dark:text-zinc-300 font-bold block mb-1.5">SAC / Tax Rule</label>
              <select
                value={discountForm.sacHsn}
                onChange={(e) => setDiscountForm({ ...discountForm, sacHsn: e.target.value })}
                className="w-full h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 text-zinc-900 dark:text-white focus:outline-none focus:border-rose-500 font-mono"
              >
                <option value="996311">SAC 996311 (Room 12%)</option>
                <option value="996331">SAC 996331 (F&B 5%)</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-5 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="h-11 px-6 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black transition disabled:opacity-50 shadow-md cursor-pointer"
            >
              {loading ? "Applying..." : "Apply Discount"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
