"use client";

import React from "react";

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: React.ComponentType<{ className?: string }>;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction, actionIcon: ActionIcon, secondaryActionLabel, onSecondaryAction, className = "" }: EmptyStateProps) {
  return <div className={`ui-empty ${className}`}><Icon className="h-6 w-6" /><h3>{title}</h3>{description && <p>{description}</p>}
    {(onAction || onSecondaryAction) && <div className="ui-empty-actions">
      {onSecondaryAction && secondaryActionLabel && <button type="button" onClick={onSecondaryAction} className="ui-button ui-button-secondary">{secondaryActionLabel}</button>}
      {onAction && actionLabel && <button type="button" onClick={onAction} className="ui-button ui-button-primary">{ActionIcon && <ActionIcon className="h-4 w-4" />}{actionLabel}</button>}
    </div>}
  </div>;
}
