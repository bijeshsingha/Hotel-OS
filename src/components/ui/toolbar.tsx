"use client";

import React from "react";
import { Search, X } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({ value, onChange, placeholder = "Search...", className = "" }: SearchInputProps) {
  return <div className={`ui-search ${className}`}>
    <Search size={17} aria-hidden="true" />
    <input type="text" aria-label={placeholder.replace(/\.{3}$/, "")} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />
    {value && <button type="button" aria-label="Clear search" onClick={() => onChange("")} className="ui-search-clear"><X size={16} aria-hidden="true" /></button>}
  </div>;
}

interface ToolbarProps { children: React.ReactNode; className?: string; }
export function Toolbar({ children, className = "" }: ToolbarProps) {
  return <div className={`ui-toolbar ${className}`}>{children}</div>;
}
