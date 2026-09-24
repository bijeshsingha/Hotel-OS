"use client";

import React, { useState } from "react";
import { Mail, Send, X, CheckCircle2, AlertCircle, RefreshCw, Calendar, FileText, Shield } from "lucide-react";
import { useHotel } from "@/lib/context/hotel-context";

export type ReportEmailType = "COMPREHENSIVE_AUDIT" | "DAILY_MANAGER_MIDNIGHT" | "CASHIER_SHIFT" | "EXECUTIVE_FLASH";

interface EmailReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultReportType?: ReportEmailType;
  targetDate?: string;
}

export function EmailReportModal({
  isOpen,
  onClose,
  defaultReportType = "COMPREHENSIVE_AUDIT",
  targetDate,
}: EmailReportModalProps) {
  const { activeProperty } = useHotel();
  const [reportType, setReportType] = useState<ReportEmailType>(defaultReportType);
  const [recipientEmail, setRecipientEmail] = useState("singhabijesh7@gmail.com");
  const [memo, setMemo] = useState("");
  const [sending, setSending] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!isOpen) return null;

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProperty?.id) return;
    setSending(true);
    setStatusMsg(null);

    try {
      const res = await fetch("/api/v1/reports/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: activeProperty.id,
          reportType,
          recipientEmail: recipientEmail.trim(),
          date: targetDate || activeProperty.businessDate,
          memo: memo.trim() || undefined,
          actorName: "Master Administrator",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to dispatch email");
      }

      setStatusMsg({
        type: "success",
        text: `Report sent successfully to ${recipientEmail}!`,
      });
      setTimeout(() => {
        onClose();
        setStatusMsg(null);
      }, 2500);
    } catch (err: any) {
      setStatusMsg({
        type: "error",
        text: err.message || "Failed to deliver email. Please check SMTP settings.",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* HEADER */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white">
                Email Report Dispatch
              </h2>
              <p className="text-xs text-zinc-500">
                Send live executive & audit briefings via SMTP
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSendEmail} className="p-5 space-y-4">
          
          {/* Report Type Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Report Category
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setReportType("COMPREHENSIVE_AUDIT")}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  reportType === "COMPREHENSIVE_AUDIT"
                    ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200 font-bold"
                    : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                }`}
              >
                <div className="text-xs font-bold flex items-center justify-between">
                  <span>Comprehensive Audit</span>
                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">Recommended</span>
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">Money, Rooms, Admin modifications</div>
              </button>

              <button
                type="button"
                onClick={() => setReportType("DAILY_MANAGER_MIDNIGHT")}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  reportType === "DAILY_MANAGER_MIDNIGHT"
                    ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200 font-bold"
                    : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                }`}
              >
                <div className="text-xs font-bold">Midnight Audit</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">Collections, expenses, till</div>
              </button>

              <button
                type="button"
                onClick={() => setReportType("CASHIER_SHIFT")}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  reportType === "CASHIER_SHIFT"
                    ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200 font-bold"
                    : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                }`}
              >
                <div className="text-xs font-bold">Cashier Shift</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">Till handover, payouts</div>
              </button>

              <button
                type="button"
                onClick={() => setReportType("EXECUTIVE_FLASH")}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  reportType === "EXECUTIVE_FLASH"
                    ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200 font-bold"
                    : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                }`}
              >
                <div className="text-xs font-bold">Executive Flash</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">Occupancy, ADR, RevPAR</div>
              </button>
            </div>
          </div>

          {/* Recipient Email */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Recipient Email Address <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              required
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="singhabijesh7@gmail.com"
              className="w-full h-11 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-900 dark:text-white focus:border-blue-600 focus:outline-none transition"
            />
          </div>

          {/* Business Date & Property Metadata */}
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
              <Calendar className="h-4 w-4 text-zinc-400" />
              <span>Operational Business Date:</span>
            </div>
            <span className="font-mono font-bold text-zinc-900 dark:text-white">
              {targetDate || activeProperty?.businessDate || new Date().toISOString().split("T")[0]}
            </span>
          </div>

          {/* Memo / Executive Note */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Executive Memo / Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="e.g. End of day management audit completed, all collections reconciled."
              className="w-full p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white focus:border-blue-600 focus:outline-none transition resize-none"
            />
          </div>

          {/* STATUS NOTIFICATION */}
          {statusMsg && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                statusMsg.type === "success"
                  ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                  : "bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
              }`}
            >
              {statusMsg.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* ACTION BUTTONS */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending}
              className="h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 transition shadow-xs cursor-pointer active:scale-98 disabled:opacity-50"
            >
              {sending ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Dispatching Email...</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>Send Report via Email</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
