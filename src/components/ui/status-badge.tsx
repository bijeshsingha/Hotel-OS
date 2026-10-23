"use client";

import React from "react";

export type StatusVariant = "blue" | "green" | "amber" | "red" | "grey";
interface StatusBadgeProps { label: string; variant?: StatusVariant; dot?: boolean; size?: "sm" | "md"; className?: string; }

export function StatusBadge({ label, variant = "grey", dot = false, size = "md", className = "" }: StatusBadgeProps) {
  return <span className={`ui-status ui-status-${variant} ${className}`} data-size={size}>{dot && <span className="ui-status-dot" aria-hidden="true" />}<span>{label}</span></span>;
}
