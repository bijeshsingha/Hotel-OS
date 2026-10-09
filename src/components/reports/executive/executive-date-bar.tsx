"use client";

import React from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Mail,
  Printer,
  RefreshCw,
  Building2,
} from "lucide-react";
import { PropertyInfo } from "@/lib/context/hotel-context";

export type DatePreset = "TODAY" | "YESTERDAY" | "LAST_7_DAYS" | "LAST_30_DAYS" | "CUSTOM";

interface ExecutiveDateBarProps {
  preset: DatePreset;
  startDate: string;
  endDate: string;
  onPresetChange: (preset: DatePreset) => void;
  onCustomDateChange: (start: string, end: string) => void;
  onStepDate: (direction: -1 | 1) => void;
  isLoading: boolean;
  onRefresh: () => void;
  onExportExcel: () => void;
  onOpenEmailModal: () => void;
  activeProperty: PropertyInfo | null;
  availableProperties: PropertyInfo[];
  onSwitchProperty: (propertyId: string) => void;
}

export const ExecutiveDateBar: React.FC<ExecutiveDateBarProps> = ({
  preset,
  startDate,
  endDate,
  onPresetChange,
  onCustomDateChange,
  onStepDate,
  isLoading,
  onRefresh,
  onExportExcel,
  onOpenEmailModal,
  activeProperty,
  availableProperties,
  onSwitchProperty,
}) => {
  const isSingleDay = startDate === endDate;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 sm:p-4 shadow-sm mb-6 print:hidden">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left Section: Property & Preset Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Multi-Property Selector */}
          {availableProperties.length > 1 && (
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5">
              <Building2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <select
                value={activeProperty?.id || ""}
                onChange={(e) => onSwitchProperty(e.target.value)}
                className="bg-transparent text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer"
                aria-label="Select Hotel Property"
              >
                {availableProperties.map((p) => (
                  <option key={p.id} value={p.id} className="dark:bg-slate-900">
                    {p.displayName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quick Preset Buttons */}
          <div className="inline-flex rounded-md p-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => onPresetChange("TODAY")}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                preset === "TODAY"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => onPresetChange("YESTERDAY")}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                preset === "YESTERDAY"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Yesterday
            </button>
            <button
              type="button"
              onClick={() => onPresetChange("LAST_7_DAYS")}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                preset === "LAST_7_DAYS"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => onPresetChange("LAST_30_DAYS")}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                preset === "LAST_30_DAYS"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Last 30 Days
            </button>
            <button
              type="button"
              onClick={() => onPresetChange("CUSTOM")}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                preset === "CUSTOM"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Custom Range
            </button>
          </div>

          {/* Stepper controls (Previous Day / Next Day) */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onStepDate(-1)}
              className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded border border-slate-200 dark:border-slate-700"
              title="Previous Day"
              aria-label="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onStepDate(1)}
              className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded border border-slate-200 dark:border-slate-700"
              title="Next Day"
              aria-label="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Section: Date Display / Inputs & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {preset === "CUSTOM" ? (
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1">
              <Calendar className="w-4 h-4 text-slate-500" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => onCustomDateChange(e.target.value, endDate)}
                className="bg-transparent text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none"
                aria-label="Start Date"
              />
              <span className="text-slate-400 text-xs font-medium">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => onCustomDateChange(startDate, e.target.value)}
                className="bg-transparent text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none"
                aria-label="End Date"
              />
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 px-2 py-1 bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-200/60 dark:border-slate-700/60">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {isSingleDay ? startDate : `${startDate} to ${endDate}`}
              </span>
            </div>
          )}

          {/* Refresh Button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            title="Refresh Report Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          {/* Export Excel (.xlsx) */}
          <button
            type="button"
            onClick={onExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
            title="Download 7-Sheet Excel Report (.xlsx)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>

          {/* Email Report */}
          <button
            type="button"
            onClick={onOpenEmailModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
            title="Send Report Summary via Email"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email</span>
          </button>

          {/* Print / PDF */}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            title="Print or Save PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>
    </div>
  );
};
