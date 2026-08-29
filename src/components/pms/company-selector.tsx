"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Building2,
  Briefcase,
  Search,
  Plus,
  Check,
  ChevronDown,
  Building,
  MapPin,
  Phone,
  FileText,
  X,
} from "lucide-react";
import { AddCompanyModal } from "./company-modal";

export interface CompanyItem {
  id?: string;
  accountType: "COMPANY" | "TRAVEL_AGENT" | "OTA" | "CORPORATE";
  accountName: string;
  shortName?: string | null;
  city?: string | null;
  address?: string | null;
  phone?: string | null;
  mobile?: string | null;
  email?: string | null;
  gstin?: string | null;
  panNo?: string | null;
  foodPlan?: string | null;
  creditLimit?: number;
  commissionPercent?: number;
  status?: string;
  remarks?: string | null;
}

interface CompanySelectorProps {
  value?: string;
  selectedCompany?: CompanyItem | null;
  onSelect: (company: CompanyItem | null) => void;
  filterType?: "ALL" | "COMPANY" | "TRAVEL_AGENT";
  activeProperty?: any;
  placeholder?: string;
  className?: string;
}

import initialCompaniesJson from "@/data/initial-companies.json";

const defaultCompanies: CompanyItem[] = (initialCompaniesJson as any[]).map((c, idx) => ({
  id: `comp-init-${idx + 1}`,
  accountType: (c.accountType as any) || "COMPANY",
  accountName: c.accountName,
  shortName: c.shortName || null,
  city: c.city || null,
  address: c.address || null,
  phone: c.phone || null,
  mobile: c.mobile || null,
  email: c.email || null,
  gstin: c.gstin || null,
  panNo: c.panNo || null,
  foodPlan: c.foodPlan || "EP",
  creditLimit: c.creditLimit || 0,
  commissionPercent: c.commissionPercent || 0,
  remarks: c.remarks || null,
  status: (c.status as any) || "ACTIVE",
}));

export function CompanySelector({
  value,
  selectedCompany,
  onSelect,
  filterType = "ALL",
  activeProperty,
  placeholder = "Search & Select Company / Travel Agent...",
  className = "",
}: CompanySelectorProps) {
  const [companies, setCompanies] = useState<CompanyItem[]>(defaultCompanies);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch companies from API
  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/v1/companies?propertyId=${activeProperty?.id || ""}&type=${filterType}&query=${encodeURIComponent(search)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setCompanies(data);
          return;
        }
      }
    } catch (e) {
      console.warn("Client fallback to default companies in selector:", e);
    } finally {
      setLoading(false);
    }

    let filtered = [...defaultCompanies];
    if (filterType !== "ALL") {
      if (filterType === "TRAVEL_AGENT") {
        filtered = filtered.filter((c) => c.accountType === "TRAVEL_AGENT" || c.accountType === "OTA");
      } else {
        filtered = filtered.filter((c) => c.accountType === filterType);
      }
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.accountName?.toLowerCase().includes(q) ||
          c.shortName?.toLowerCase().includes(q) ||
          c.gstin?.toLowerCase().includes(q) ||
          c.mobile?.toLowerCase().includes(q) ||
          c.city?.toLowerCase().includes(q) ||
          c.address?.toLowerCase().includes(q)
      );
    }
    setCompanies(filtered);
  };

  useEffect(() => {
    fetchCompanies();
  }, [activeProperty?.id, filterType]);

  // Search filter
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCompanies();
    }, 200);
    return () => clearTimeout(timer);
  }, [search]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentSelectionName = selectedCompany?.accountName || value || "";

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Selector Trigger Button */}
      <div className="relative flex items-center">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full h-10 px-3 pr-16 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white flex items-center justify-between gap-2 focus:border-indigo-500 focus:outline-none transition shadow-xs cursor-pointer text-left"
        >
          <div className="flex items-center gap-2 truncate">
            {selectedCompany?.accountType === "TRAVEL_AGENT" ? (
              <Building2 className="h-4 w-4 text-blue-500 shrink-0" />
            ) : (
              <Briefcase className="h-4 w-4 text-indigo-500 shrink-0" />
            )}
            <span className={`truncate font-semibold ${currentSelectionName ? "text-zinc-900 dark:text-white" : "text-zinc-400"}`}>
              {currentSelectionName || placeholder}
            </span>
            {selectedCompany?.gstin && (
              <span className="hidden sm:inline-block text-[10px] font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 shrink-0">
                GST: {selectedCompany.gstin}
              </span>
            )}
          </div>
        </button>

        {/* Action Controls in Input: Clear X + Dropdown Arrow */}
        <div className="absolute right-2 flex items-center gap-1">
          {currentSelectionName ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(null);
                setIsOpen(false);
              }}
              title="Unselect / Clear Company"
              className="p-1 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-white transition cursor-pointer"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 max-h-72 flex flex-col">
          
          {/* Search Header */}
          <div className="p-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-zinc-400 shrink-0 ml-1" />
            <input
              type="text"
              autoFocus
              placeholder="Search company, agent, GSTIN or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent border-none text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 px-1"
              >
                Clear
              </button>
            )}
          </div>

          {/* Company Items List */}
          <div className="overflow-y-auto p-1.5 space-y-1 flex-1">
            
            {/* Clear / None Option */}
            {currentSelectionName && (
              <button
                type="button"
                onClick={() => {
                  onSelect(null);
                  setIsOpen(false);
                }}
                className="w-full p-2 rounded-xl text-left transition flex items-center gap-2 bg-rose-50/60 hover:bg-rose-100/80 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold text-xs cursor-pointer border border-dashed border-rose-200 dark:border-rose-900/40"
              >
                <X className="h-3.5 w-3.5 shrink-0" />
                <span>✕ None / Clear Company (Individual / Direct Guest)</span>
              </button>
            )}

            {companies.length === 0 ? (
              <div className="p-4 text-center text-xs text-zinc-500">
                {loading ? "Searching master list..." : `No matching companies found for "${search}"`}
              </div>
            ) : (
              companies.map((c) => {
                const isSelected = selectedCompany?.accountName === c.accountName || value === c.accountName;
                return (
                  <button
                    key={c.id || c.accountName}
                    type="button"
                    onClick={() => {
                      onSelect(c);
                      setIsOpen(false);
                    }}
                    className={`w-full p-2 rounded-xl text-left transition flex items-start justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? "bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-indigo-950 dark:text-indigo-200"
                        : "hover:bg-zinc-100 dark:hover:bg-zinc-800/70 text-zinc-800 dark:text-zinc-200"
                    }`}
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs truncate">{c.accountName}</span>
                        {c.shortName && (
                          <span className="text-[10px] font-mono bg-zinc-200 dark:bg-zinc-800 px-1 rounded text-zinc-700 dark:text-zinc-300 font-semibold">
                            {c.shortName}
                          </span>
                        )}
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                          c.accountType === "TRAVEL_AGENT"
                            ? "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                            : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                        }`}>
                          {c.accountType === "TRAVEL_AGENT" ? "Agent" : "Company"}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                        {c.gstin ? (
                          <span>GST: <strong>{c.gstin}</strong></span>
                        ) : (
                          <span className="text-zinc-400 italic">No GST</span>
                        )}
                        {c.mobile && <span>Ph: {c.mobile}</span>}
                        {c.city && <span>📍 {c.city}</span>}
                      </div>
                    </div>

                    {isSelected && <Check className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-1" />}
                  </button>
                );
              })
            )}
          </div>

          {/* Quick Add Company Button */}
          <div className="p-2 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/60 shrink-0">
            <button
              type="button"
              onClick={() => {
                setShowAddModal(true);
                setIsOpen(false);
              }}
              className="w-full py-1.5 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add New Company / Travel Agent</span>
            </button>
          </div>

        </div>
      )}

      {/* Add Company Modal */}
      {showAddModal && (
        <AddCompanyModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          defaultType={filterType === "TRAVEL_AGENT" ? "TRAVEL_AGENT" : "COMPANY"}
          activeProperty={activeProperty}
          onSuccess={(newCompany) => {
            fetchCompanies();
            onSelect(newCompany);
          }}
        />
      )}
    </div>
  );
}
