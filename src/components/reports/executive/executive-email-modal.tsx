"use client";

import React, { useState, useEffect } from "react";
import { X, Mail, Send, CheckCircle2, AlertCircle, FileSpreadsheet } from "lucide-react";
import { ExecutiveReportResult } from "@/lib/domain/executive-report-service";
import { formatINR } from "@/lib/gst/calculator";

interface ExecutiveEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: ExecutiveReportResult | null;
}

export const ExecutiveEmailModal: React.FC<ExecutiveEmailModalProps> = ({
  isOpen,
  onClose,
  report,
}) => {
  const [recipientEmail, setRecipientEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [memo, setMemo] = useState("");
  const [attachExcel, setAttachExcel] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<{
    type: "IDLE" | "SUCCESS" | "ERROR";
    message?: string;
  }>({ type: "IDLE" });

  useEffect(() => {
    if (report && isOpen) {
      const isSingleDay = report.filter.startDate === report.filter.endDate;
      const periodLabel = isSingleDay
        ? report.filter.startDate
        : `${report.filter.startDate} to ${report.filter.endDate}`;

      setSubject(`Executive Daily Report: ${report.property.displayName} (${periodLabel})`);
      setRecipientEmail(report.property.email || "");
      setMemo("");
      setStatus({ type: "IDLE" });
    }
  }, [report, isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSending) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, isSending]);

  if (!isOpen || !report) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail.trim() || !recipientEmail.includes("@")) {
      setStatus({
        type: "ERROR",
        message: "Please enter a valid recipient email address.",
      });
      return;
    }

    setIsSending(true);
    setStatus({ type: "IDLE" });

    try {
      const res = await fetch("/api/v1/reports/executive/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: report.property.id,
          startDate: report.filter.startDate,
          endDate: report.filter.endDate,
          recipientEmail: recipientEmail.trim(),
          subject: subject.trim(),
          memo: memo.trim(),
          attachExcel,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to dispatch email");
      }

      setStatus({
        type: "SUCCESS",
        message: `Report successfully dispatched to ${recipientEmail}`,
      });
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setStatus({
        type: "ERROR",
        message: err?.message || "Failed to deliver email. Please check SMTP configuration.",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="email-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg text-blue-600 dark:text-blue-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="email-modal-title"
                className="text-base font-bold text-slate-900 dark:text-slate-100"
              >
                Email Executive Report
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Send report summary and attached Excel workbook to management
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 text-xs">
          {status.type === "SUCCESS" && (
            <div className="p-3 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{status.message}</span>
            </div>
          )}

          {status.type === "ERROR" && (
            <div className="p-3 bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{status.message}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Recipient Email Address *
            </label>
            <input
              type="email"
              required
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="e.g. generalmanager@hotel.com"
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Subject Line *
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Management Memo (Optional Note)
            </label>
            <textarea
              rows={3}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="Add executive remarks, shift notes, or audit highlights..."
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
            />
          </div>

          <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
            <input
              type="checkbox"
              id="attach-excel-toggle"
              checked={attachExcel}
              onChange={(e) => setAttachExcel(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            <label
              htmlFor="attach-excel-toggle"
              className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Attach complete 7-sheet Excel workbook (.xlsx)</span>
            </label>
          </div>

          {/* Quick Metrics Preview */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/20 rounded border border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 space-y-1">
            <div className="font-semibold text-slate-700 dark:text-slate-300">
              Email Snapshot Summary:
            </div>
            <div className="flex justify-between">
              <span>Occupancy / Rooms Sold:</span>
              <strong className="text-slate-800 dark:text-slate-200">
                {report.summary.occupancyPct.current.toFixed(1)}% (
                {report.summary.roomsSold.current} rooms)
              </strong>
            </div>
            <div className="flex justify-between">
              <span>Earned Revenue:</span>
              <strong className="text-slate-800 dark:text-slate-200">
                {formatINR(report.summary.totalRevenue.current)}
              </strong>
            </div>
            <div className="flex justify-between">
              <span>Collections Inflow:</span>
              <strong className="text-emerald-700 dark:text-emerald-400">
                {formatINR(report.summary.totalCollections.current)}
              </strong>
            </div>
            <div className="flex justify-between">
              <span>Expected Closing Cash:</span>
              <strong className="text-slate-800 dark:text-slate-200">
                {formatINR(report.cashReconciliation.expectedClosingCash)}
              </strong>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSending}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white rounded transition-colors disabled:opacity-50"
            >
              {isSending ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Dispatch Email</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
