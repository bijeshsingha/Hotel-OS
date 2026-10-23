"use client";

import React from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: "default" | "blue" | "green" | "amber" | "red";
  badge?: string;
  onClick?: () => void;
  className?: string;
}

export function StatCard({ label, value, subtext, icon: Icon, variant = "default", badge, onClick, className = "" }: StatCardProps) {
  const content = <>
    <div className="ui-stat-top"><span>{label}</span><div className="ui-stat-meta">{badge && <span className="ui-count">{badge}</span>}{Icon && <Icon className="ui-stat-icon" />}</div></div>
    <div className="ui-stat-value">{value}</div>
    {subtext && <p className="ui-stat-note">{subtext}</p>}
  </>;
  return onClick
    ? <button type="button" onClick={onClick} className={`ui-stat ${className}`} data-variant={variant}>{content}</button>
    : <div className={`ui-stat ${className}`} data-variant={variant}>{content}</div>;
}
