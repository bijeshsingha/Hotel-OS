"use client";

import React from "react";
import { TrendingUp, TrendingDown, Minus, ArrowUpRight } from "lucide-react";
import { MetricComparison } from "@/lib/domain/executive-report-service";
import { formatINR } from "@/lib/gst/calculator";

interface ExecutiveKpiCardProps {
  title: string;
  comparison?: MetricComparison;
  customValue?: string | number;
  subtitle?: string;
  isCurrency?: boolean;
  isPercentage?: boolean;
  reverseColorPolarity?: boolean; // If UP is bad (e.g., expenses or cancellations)
  onClick?: () => void;
  drillDownLabel?: string;
}

export const ExecutiveKpiCard: React.FC<ExecutiveKpiCardProps> = ({
  title,
  comparison,
  customValue,
  subtitle,
  isCurrency = false,
  isPercentage = false,
  reverseColorPolarity = false,
  onClick,
  drillDownLabel,
}) => {
  const curVal = comparison ? comparison.current : Number(customValue || 0);

  let formattedValue = "";
  if (customValue !== undefined && !comparison) {
    formattedValue = String(customValue);
  } else if (isCurrency) {
    formattedValue = formatINR(curVal);
  } else if (isPercentage) {
    formattedValue = `${curVal.toFixed(1)}%`;
  } else {
    formattedValue = curVal.toLocaleString("en-IN");
  }

  // Trend styling
  let badgeColor = "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  let isUpGood = !reverseColorPolarity;

  if (comparison && comparison.trend !== "NEUTRAL") {
    if (comparison.trend === "UP") {
      badgeColor = isUpGood
        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
        : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800";
    } else {
      badgeColor = isUpGood
        ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800"
        : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800";
    }
  }

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 transition-all ${
        onClick
          ? "cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm group focus:outline-none focus:ring-2 focus:ring-slate-400"
          : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {title}
        </span>
        {onClick && (
          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200">
            <ArrowUpRight className="w-3.5 h-3.5" />
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-2 mb-1.5">
        <div className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          {formattedValue}
        </div>
      </div>

      {/* Comparison badge & subtitle */}
      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
        {comparison && (
          <div
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium border ${badgeColor}`}
          >
            {comparison.trend === "UP" && <TrendingUp className="w-3 h-3" />}
            {comparison.trend === "DOWN" && <TrendingDown className="w-3 h-3" />}
            {comparison.trend === "NEUTRAL" && <Minus className="w-3 h-3" />}
            <span>
              {comparison.pctChange >= 0 ? "+" : ""}
              {comparison.pctChange.toFixed(1)}% vs prior
            </span>
          </div>
        )}

        {subtitle && (
          <span className="text-slate-500 dark:text-slate-400 text-xs">
            {subtitle}
          </span>
        )}
      </div>

      {onClick && drillDownLabel && (
        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {drillDownLabel}
        </div>
      )}
    </div>
  );
};
