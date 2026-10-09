"use client";

import React, { useState, useEffect } from "react";
import { X, Search, FileText } from "lucide-react";
import { formatINR } from "@/lib/gst/calculator";

export interface DrillDownColumn {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
  render?: (row: any) => React.ReactNode;
}

export interface DrillDownConfig {
  title: string;
  subtitle: string;
  columns: DrillDownColumn[];
  rows: any[];
  searchKeys?: string[];
  totalLabel?: string;
  totalValue?: number | string;
}

interface ExecutiveDrillDownModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: DrillDownConfig | null;
}

export const ExecutiveDrillDownModal: React.FC<ExecutiveDrillDownModalProps> = ({
  isOpen,
  onClose,
  config,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !config) return null;

  // Filter rows by searchTerm
  const filteredRows = config.rows.filter((row) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();

    if (config.searchKeys && config.searchKeys.length > 0) {
      return config.searchKeys.some((k) =>
        String(row[k] || "")
          .toLowerCase()
          .includes(term)
      );
    }

    // Default: search all string values
    return Object.values(row).some((val) =>
      String(val || "")
        .toLowerCase()
        .includes(term)
    );
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="drilldown-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2
              id="drilldown-title"
              className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100"
            >
              {config.title}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {config.subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search bar */}
        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Showing {filteredRows.length} of {config.rows.length} records
          </div>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-auto p-0">
          {filteredRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                No matching records found
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Try adjusting your search criteria.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 border-b border-slate-200 dark:border-slate-700 z-10">
                <tr>
                  {config.columns.map((col) => (
                    <th
                      key={col.key}
                      className={`px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[11px] ${
                        col.align === "right"
                          ? "text-right"
                          : col.align === "center"
                          ? "text-center"
                          : "text-left"
                      }`}
                    >
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRows.map((row, idx) => (
                  <tr
                    key={row.id || idx}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    {config.columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-3 py-2.5 text-slate-800 dark:text-slate-200 ${
                          col.align === "right"
                            ? "text-right font-medium"
                            : col.align === "center"
                            ? "text-center"
                            : "text-left"
                        }`}
                      >
                        {col.render ? col.render(row) : String(row[col.key] ?? "-")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer with summary total */}
        {config.totalLabel && (
          <div className="flex items-center justify-between p-3 sm:p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              {config.totalLabel}
            </span>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {typeof config.totalValue === "number"
                ? formatINR(config.totalValue)
                : config.totalValue}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
