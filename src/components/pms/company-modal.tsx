"use client";

import React, { useState } from "react";
import {
  X,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Percent,
  DollarSign,
} from "lucide-react";

interface AddCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (company: any) => void;
  activeProperty?: any;
  defaultType?: "COMPANY" | "TRAVEL_AGENT" | "OTA";
}

export function AddCompanyModal({
  isOpen,
  onClose,
  onSuccess,
  activeProperty,
  defaultType = "COMPANY",
}: AddCompanyModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<{
    accountType: "COMPANY" | "TRAVEL_AGENT" | "OTA";
    accountName: string;
    shortName: string;
    city: string;
    address: string;
    phone: string;
    mobile: string;
    email: string;
    gstin: string;
    panNo: string;
    foodPlan: string;
    fbDiscountPercent: number;
    creditLimit: number;
    commissionPercent: number;
    remarks: string;
  }>({
    accountType: defaultType,
    accountName: "",
    shortName: "",
    city: "",
    address: "",
    phone: "",
    mobile: "",
    email: "",
    gstin: "",
    panNo: "",
    foodPlan: "EP",
    fbDiscountPercent: 0,
    creditLimit: 0,
    commissionPercent: 0,
    remarks: "",
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.accountName.trim()) {
      setError("Company / Agent Name is required.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/v1/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: activeProperty?.id,
          accountType: form.accountType,
          accountName: form.accountName.trim(),
          shortName: form.shortName.trim() || undefined,
          city: form.city.trim() || undefined,
          address: form.address.trim() || undefined,
          phone: form.phone.trim() || undefined,
          mobile: form.mobile.trim() || undefined,
          email: form.email.trim() || undefined,
          gstin: form.gstin.trim() ? form.gstin.trim().toUpperCase() : undefined,
          panNo: form.panNo.trim() ? form.panNo.trim().toUpperCase() : undefined,
          foodPlan: form.foodPlan,
          fbDiscountPercent: Number(form.fbDiscountPercent) || 0,
          creditLimit: Number(form.creditLimit) || 0,
          commissionPercent: Number(form.commissionPercent) || 0,
          remarks: form.remarks.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save company profile");

      onSuccess(data.company);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save company");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-2xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/80 dark:bg-zinc-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-zinc-900 dark:text-white flex items-center gap-2">
                <span>Add Company / Travel Agent Master</span>
                <span className="text-[10px] font-mono font-bold bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-500/30">
                  B2B Corporate
                </span>
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Register corporate clients, travel agents, and OTAs for quick selection in GRC & Future Bookings.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-4 sm:mx-6 mt-3.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 font-medium">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          
          {/* Account Type Selector */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-1.5 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setForm({ ...form, accountType: "COMPANY" })}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                form.accountType === "COMPANY"
                  ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-zinc-200 dark:border-zinc-700"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <Briefcase className="h-3.5 w-3.5" />
              <span>Corporate Company</span>
            </button>

            <button
              type="button"
              onClick={() => setForm({ ...form, accountType: "TRAVEL_AGENT" })}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                form.accountType === "TRAVEL_AGENT"
                  ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-zinc-200 dark:border-zinc-700"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Travel Agency / Agent</span>
            </button>

            <button
              type="button"
              onClick={() => setForm({ ...form, accountType: "OTA" })}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                form.accountType === "OTA"
                  ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-zinc-200 dark:border-zinc-700"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Online OTA / Portal</span>
            </button>
          </div>

          {/* Primary Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                Company / Agency Account Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. ABB INDIA LTD or Asian Paint Ltd."
                value={form.accountName}
                onChange={(e) => setForm({ ...form, accountName: e.target.value })}
                className="w-full h-9 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white font-semibold focus:border-indigo-500 focus:outline-none transition shadow-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                Short Name / Code
              </label>
              <input
                type="text"
                placeholder="e.g. MMT, SCS, YCS"
                value={form.shortName}
                onChange={(e) => setForm({ ...form, shortName: e.target.value })}
                className="w-full h-9 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white font-mono focus:border-indigo-500 focus:outline-none transition shadow-xs"
              />
            </div>
          </div>

          {/* GSTIN & Tax Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                GSTIN Number (15-Digit B2B Tax Credit)
              </label>
              <input
                type="text"
                maxLength={15}
                placeholder="e.g. 18AAACA3834B1Z7"
                value={form.gstin}
                onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                className="w-full h-9 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white font-mono uppercase focus:border-indigo-500 focus:outline-none transition shadow-xs font-semibold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                PAN Number
              </label>
              <input
                type="text"
                maxLength={10}
                placeholder="e.g. AAACA3834B"
                value={form.panNo}
                onChange={(e) => setForm({ ...form, panNo: e.target.value.toUpperCase() })}
                className="w-full h-9 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white font-mono uppercase focus:border-indigo-500 focus:outline-none transition shadow-xs"
              />
            </div>
          </div>

          {/* Contacts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                Mobile Number
              </label>
              <input
                type="tel"
                placeholder="10-digit phone"
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                className="w-full h-9 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white font-mono focus:border-indigo-500 focus:outline-none transition shadow-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                Landline / Phone
              </label>
              <input
                type="tel"
                placeholder="Landline / office phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full h-9 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white font-mono focus:border-indigo-500 focus:outline-none transition shadow-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                Email Address
              </label>
              <input
                type="email"
                placeholder="accounts@company.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full h-9 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white focus:border-indigo-500 focus:outline-none transition shadow-xs"
              />
            </div>
          </div>

          {/* Location & Address */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                City / Region
              </label>
              <input
                type="text"
                placeholder="e.g. Guwahati / Kolkata / Delhi"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full h-9 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white focus:border-indigo-500 focus:outline-none transition shadow-xs"
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                Full Registered Billing Address
              </label>
              <input
                type="text"
                placeholder="Street address, building, pin code"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full h-9 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white focus:border-indigo-500 focus:outline-none transition shadow-xs"
              />
            </div>
          </div>

          {/* Financial & Commercial Terms */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                Default Food Plan
              </label>
              <select
                value={form.foodPlan}
                onChange={(e) => setForm({ ...form, foodPlan: e.target.value })}
                className="w-full h-9 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white font-semibold focus:border-indigo-500 focus:outline-none transition shadow-xs cursor-pointer"
              >
                <option value="EP">EP (Room Only)</option>
                <option value="CP">CP (Continental / Breakfast)</option>
                <option value="MAP">MAP (Breakfast + Dinner)</option>
                <option value="AP">AP (Full Board)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                Credit Limit (₹ Max BTC)
              </label>
              <input
                type="number"
                placeholder="0"
                value={form.creditLimit}
                onChange={(e) => setForm({ ...form, creditLimit: Number(e.target.value) })}
                className="w-full h-9 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white font-mono focus:border-indigo-500 focus:outline-none transition shadow-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                Agent Commission (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                placeholder="0"
                value={form.commissionPercent}
                onChange={(e) => setForm({ ...form, commissionPercent: Number(e.target.value) })}
                className="w-full h-9 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white font-mono focus:border-indigo-500 focus:outline-none transition shadow-xs"
              />
            </div>
          </div>

          {/* Remarks */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
              Remarks / Special Billing Instructions
            </label>
            <input
              type="text"
              placeholder="e.g. 30-day BTC payment terms, requires manager approval for alcohol"
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              className="w-full h-9 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white focus:border-indigo-500 focus:outline-none transition shadow-xs"
            />
          </div>

        </form>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-3 bg-zinc-50/80 dark:bg-zinc-900/50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 font-bold text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={handleSubmit}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs transition flex items-center gap-2 shadow-lg shadow-indigo-600/30 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <span>Saving Master Profile...</span>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Save to Master Directory</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
