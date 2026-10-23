"use client";

import React from "react";
import { Calendar } from "lucide-react";
import { StatusBadge } from "./status-badge";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeVariant?: "live" | "neutral" | "success" | "warning" | "danger" | "info";
  businessDate?: string;
  metadata?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, icon: Icon, badge, badgeVariant = "live", businessDate, metadata, actions }: PageHeaderProps) {
  const variants = { live: "green", neutral: "grey", success: "green", warning: "amber", danger: "red", info: "blue" } as const;
  return <div className="ui-page-header">
    <div>
      <div className="ui-page-heading">
        {Icon && <Icon className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />}
        <h1 className="ui-page-title">{title}</h1>
        {badge && <StatusBadge label={badge} variant={variants[badgeVariant]} dot={badgeVariant === "live"} />}
      </div>
      {description && <p className="ui-page-description">{description}</p>}
    </div>
    <div className="ui-page-actions">
      {metadata}
      {businessDate && <span className="ui-date"><Calendar className="h-4 w-4" aria-hidden="true" />Business date <strong>{businessDate}</strong></span>}
      {actions}
    </div>
  </div>;
}
