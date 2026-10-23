"use client";

import React from "react";

export interface SegmentOption<T extends string = string> {
  value: T;
  label: string;
  badge?: string | number;
  badgeVariant?: "blue" | "green" | "amber" | "red" | "grey";
  icon?: React.ComponentType<{ className?: string }>;
}
interface SegmentedControlProps<T extends string = string> { options: SegmentOption<T>[]; value: T; onChange: (value: T) => void; size?: "sm" | "md"; className?: string; }

export function SegmentedControl<T extends string = string>({ options, value, onChange, size = "md", className = "" }: SegmentedControlProps<T>) {
  return <div className={`ui-segments ${className}`} data-size={size}>
    {options.map((option) => { const Icon = option.icon; return <button key={option.value} type="button" className="ui-segment" aria-pressed={option.value === value} onClick={() => onChange(option.value)}>
      {Icon && <Icon className="h-4 w-4" />}<span>{option.label}</span>{option.badge !== undefined && <span className={`ui-count${option.badgeVariant ? ` ui-status-${option.badgeVariant}` : ""}`}>{option.badge}</span>}
    </button>; })}
  </div>;
}
