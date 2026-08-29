"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Building2,
  Briefcase,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  FileText,
  CreditCard,
  Percent,
  CheckCircle2,
  Calendar,
  ExternalLink,
  Filter,
  Copy,
  Check,
  Globe,
  Compass,
  CalendarPlus,
  ShieldCheck,
  ChevronRight,
  Info,
} from "lucide-react";
import { AddCompanyModal } from "./company-modal";
import { CompanyItem } from "./company-selector";
import initialCompaniesJson from "@/data/initial-companies.json";

interface CompanyDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProperty?: any;
  onSelectForBooking?: (company: CompanyItem) => void;
}

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
  fbDiscountPercent: 0,
  creditLimit: c.creditLimit || 0,
  openingBalance: 0,
  commissionPercent: c.commissionPercent || 0,
  remarks: c.remarks || null,
  status: (c.status as any) || "ACTIVE",
}));

// Helper to get initials for avatar monogram
function getInitials(name: string): string {
  if (!name) return "CO";
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

// State code helper from 15-digit GSTIN
function getGstinState(gstin?: string | null): string | null {
  if (!gstin || gstin.length < 2) return null;
  const code = gstin.slice(0, 2);
  const stateMap: Record<string, string> = {
    "18": "Assam",
    "19": "West Bengal",
    "06": "Haryana",
    "07": "Delhi",
    "03": "Punjab",
    "23": "Madhya Pradesh",
    "17": "Meghalaya",
    "12": "Arunachal Pradesh",
    "14": "Manipur",
    "15": "Mizoram",
    "13": "Nagaland",
    "11": "Sikkim",
    "16": "Tripura",
    "27": "Maharashtra",
    "29": "Karnataka",
    "33": "Tamil Nadu",
  };
  return stateMap[code] ? `${stateMap[code]} (${code})` : `State (${code})`;
}

export function CompanyDirectoryModal({
  isOpen,
  onClose,
  activeProperty,
  onSelectForBooking,
}: CompanyDirectoryModalProps) {
  const [companies, setCompanies] = useState<CompanyItem[]>(defaultCompanies);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "COMPANY" | "TRAVEL_AGENT" | "OTA">("ALL");
  const [showAddModal, setShowAddModal] = useState(false);
  const [copiedGstin, setCopiedGstin] = useState<string | null>(null);
  const [selectedCompanyDetail, setSelectedCompanyDetail] = useState<CompanyItem | null>(null);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/v1/companies?propertyId=${activeProperty?.id || ""}&type=${typeFilter}&query=${encodeURIComponent(search)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setCompanies(data);
          return;
        }
      }
    } catch (e) {
      console.warn("Client fallback to default companies:", e);
    } finally {
      setLoading(false);
    }

    // Instant client filter fallback
    let filtered = [...defaultCompanies];
    if (typeFilter !== "ALL") {
      if (typeFilter === "TRAVEL_AGENT") {
        filtered = filtered.filter((c) => c.accountType === "TRAVEL_AGENT");
      } else if (typeFilter === "OTA") {
        filtered = filtered.filter((c) => c.accountType === "OTA");
      } else {
        filtered = filtered.filter((c) => c.accountType === typeFilter);
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
    if (isOpen) {
      fetchCompanies();
    }
  }, [isOpen, activeProperty?.id, typeFilter]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      fetchCompanies();
    }, 150);
    return () => clearTimeout(timer);
  }, [search]);

  if (!isOpen) return null;

  const totalCount = defaultCompanies.length;
  const corporateCount = defaultCompanies.filter((c) => c.accountType === "COMPANY").length;
  const agentCount = defaultCompanies.filter((c) => c.accountType === "TRAVEL_AGENT").length;
  const otaCount = defaultCompanies.filter((c) => c.accountType === "OTA").length;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedGstin(text);
    setTimeout(() => setCopiedGstin(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in">
      <div className="w-full max-w-6xl bg-white dark:bg-[#111114] border border-zinc-200/90 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* ========================================================================= */}
        {/* 1. EXECUTIVE MODAL HEADER & METRICS                                       */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-6 border-b border-zinc-200/80 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
          
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-zinc-900 dark:text-white tracking-tight">
                  Corporate & Travel Agent Master
                </h2>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold font-mono px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {totalCount} Active Master Records
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium">
                Central B2B Corporate Ledger • 15-Digit GSTIN ITC Profiles • Travel Agencies & OTA Channels
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 self-end md:self-auto">
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="h-10 px-4 rounded-xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-black text-xs flex items-center gap-2 transition hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow-md active:scale-95 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add Company / Agent</span>
            </button>

            <button
              onClick={onClose}
              className="h-10 w-10 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-zinc-800 flex items-center justify-center transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* 2. FILTER RIBBON & STATS BAR                                              */}
        {/* ========================================================================= */}
        <div className="p-3.5 sm:p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#141417] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0">
          
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by company, short code, GSTIN, phone, city, or address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-8 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-950 focus:outline-none transition shadow-xs font-medium"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Segmented Filter Pills */}
          <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-900/90 p-1 rounded-xl border border-zinc-200/80 dark:border-zinc-800 text-xs font-bold overflow-x-auto">
            <button
              type="button"
              onClick={() => setTypeFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer ${
                typeFilter === "ALL"
                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs font-black"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              All ({totalCount})
            </button>

            <button
              type="button"
              onClick={() => setTypeFilter("COMPANY")}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                typeFilter === "COMPANY"
                  ? "bg-white dark:bg-zinc-800 text-emerald-700 dark:text-emerald-400 shadow-xs font-black"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <Briefcase className="h-3.5 w-3.5" />
              <span>Corporates ({corporateCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setTypeFilter("TRAVEL_AGENT")}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                typeFilter === "TRAVEL_AGENT"
                  ? "bg-white dark:bg-zinc-800 text-purple-700 dark:text-purple-400 shadow-xs font-black"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <Compass className="h-3.5 w-3.5" />
              <span>Agents ({agentCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setTypeFilter("OTA")}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                typeFilter === "OTA"
                  ? "bg-white dark:bg-zinc-800 text-blue-700 dark:text-blue-400 shadow-xs font-black"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <Globe className="h-3.5 w-3.5" />
              <span>OTAs ({otaCount})</span>
            </button>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* 3. MASTER DIRECTORY ENTERPRISE TABLE                                      */}
        {/* ========================================================================= */}
        <div className="overflow-x-auto overflow-y-auto flex-1 bg-white dark:bg-[#111114]">
          <table className="w-full text-left border-collapse text-xs">
            
            {/* Header Row */}
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[10.5px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-900/80 sticky top-0 z-10 backdrop-blur-xs">
                <th className="py-3 px-4 font-bold">Company / Account Name</th>
                <th className="py-3 px-3 font-bold">Account Type</th>
                <th className="py-3 px-3 font-bold">GSTIN (B2B Tax Credit)</th>
                <th className="py-3 px-3 font-bold">Contact & Phone</th>
                <th className="py-3 px-3 font-bold">City & Address</th>
                <th className="py-3 px-3 font-bold">Terms & Plan</th>
                <th className="py-3 px-4 font-bold text-right">Quick Action</th>
              </tr>
            </thead>

            {/* Body Rows */}
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {companies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-zinc-400 font-mono text-xs">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Search className="h-8 w-8 text-zinc-300 dark:text-zinc-700" />
                      <span className="font-bold text-zinc-700 dark:text-zinc-300">
                        No master accounts found matching "{search}"
                      </span>
                      <button
                        onClick={() => {
                          setSearch("");
                          setTypeFilter("ALL");
                        }}
                        className="text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:underline"
                      >
                        Reset search filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                companies.map((c, idx) => {
                  const isOTA = c.accountType === "OTA" || c.accountName === "MakeMyTrip India Pvt. Ltd." || c.accountName === "Agoda" || c.accountName === "CLEARTRIP";
                  const isAgent = c.accountType === "TRAVEL_AGENT" || c.accountName === "Mr.Kartik kowar" || c.accountName === "Rajesh 11" || c.accountName === "TRAVELGURU";
                  const isCorporate = !isOTA && !isAgent;
                  const initials = getInitials(c.accountName);
                  const stateBadge = getGstinState(c.gstin);

                  return (
                    <tr
                      key={c.id || c.accountName || idx}
                      className="hover:bg-indigo-50/40 dark:hover:bg-zinc-800/40 transition duration-150 group"
                    >
                      {/* 1. Account Name + Monogram Avatar + Code */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          
                          {/* Monogram Circle */}
                          <div
                            className={`h-9 w-9 rounded-xl flex items-center justify-center text-xs font-black text-white shrink-0 shadow-xs ${
                              isCorporate
                                ? "bg-gradient-to-br from-emerald-600 to-teal-700"
                                : isOTA
                                ? "bg-gradient-to-br from-blue-600 to-cyan-700"
                                : "bg-gradient-to-br from-purple-600 to-indigo-700"
                            }`}
                          >
                            {initials}
                          </div>

                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-extrabold text-zinc-950 dark:text-zinc-100 text-[13px] tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                                {c.accountName}
                              </span>
                              {c.shortName && (
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                                  {c.shortName}
                                </span>
                              )}
                            </div>

                            {c.remarks ? (
                              <p className="text-[11px] text-zinc-400 truncate max-w-xs italic">
                                {c.remarks}
                              </p>
                            ) : (
                              <p className="text-[10.5px] text-zinc-400 font-mono">
                                Registered Master B2B Account
                              </p>
                            )}
                          </div>

                        </div>
                      </td>

                      {/* 2. Account Type Pill */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {isCorporate && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 font-bold text-[11px]">
                            <Briefcase className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                            <span>Corporate B2B</span>
                          </span>
                        )}

                        {isOTA && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 font-bold text-[11px]">
                            <Globe className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                            <span>OTA Channel</span>
                          </span>
                        )}

                        {isAgent && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 font-bold text-[11px]">
                            <Compass className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                            <span>Travel Agent</span>
                          </span>
                        )}
                      </td>

                      {/* 3. GSTIN & Tax Details */}
                      <td className="py-3 px-3">
                        {c.gstin ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 font-mono">
                              <span className="font-extrabold text-zinc-900 dark:text-zinc-100 text-xs tracking-tight bg-zinc-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
                                {c.gstin}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(c.gstin!)}
                                title="Copy GSTIN"
                                className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-800 dark:hover:text-white transition cursor-pointer"
                              >
                                {copiedGstin === c.gstin ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                            {stateBadge && (
                              <div className="text-[10px] text-zinc-500 font-mono font-medium">
                                📍 {stateBadge}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-zinc-400 font-mono text-[11px] italic">
                            — No GSTIN on file
                          </span>
                        )}
                      </td>

                      {/* 4. Contact Phone & Email */}
                      <td className="py-3 px-3">
                        <div className="space-y-1 font-mono text-[11.5px]">
                          {(c.mobile || c.phone) ? (
                            <a
                              href={`tel:${c.mobile || c.phone}`}
                              className="font-bold text-zinc-900 dark:text-zinc-100 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1.5 transition"
                            >
                              <Phone className="h-3 w-3 text-zinc-400" />
                              <span>{c.mobile || c.phone}</span>
                            </a>
                          ) : (
                            <span className="text-zinc-400 italic text-[11px]">— No Phone</span>
                          )}

                          {c.email && (
                            <a
                              href={`mailto:${c.email}`}
                              className="text-[10.5px] text-zinc-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1.5 truncate max-w-[180px]"
                            >
                              <Mail className="h-3 w-3 text-zinc-400 shrink-0" />
                              <span className="truncate">{c.email}</span>
                            </a>
                          )}
                        </div>
                      </td>

                      {/* 5. City & Full Address */}
                      <td className="py-3 px-3">
                        <div className="space-y-0.5 max-w-xs">
                          {c.city ? (
                            <div className="font-extrabold text-zinc-900 dark:text-zinc-100 text-xs flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
                              <span>{c.city}</span>
                            </div>
                          ) : null}

                          {c.address ? (
                            <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400 line-clamp-1" title={c.address}>
                              {c.address}
                            </p>
                          ) : (
                            <span className="text-zinc-400 italic text-[11px]">Direct / Assam</span>
                          )}
                        </div>
                      </td>

                      {/* 6. Terms & Food Plan */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="space-y-1">
                          <span className="inline-block px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-mono font-bold text-[10.5px]">
                            {c.foodPlan || "EP"} (Plan)
                          </span>
                          {c.commissionPercent ? (
                            <div className="text-[10.5px] font-bold text-amber-600 dark:text-amber-400 font-mono">
                              {c.commissionPercent}% Comm.
                            </div>
                          ) : (
                            <div className="text-[10px] text-zinc-400 font-mono">
                              Cr Limit: ₹{c.creditLimit || 0}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 7. Action Button */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            if (onSelectForBooking) {
                              onSelectForBooking(c);
                              onClose();
                            } else {
                              setSelectedCompanyDetail(c);
                            }
                          }}
                          className="h-8 px-3.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white dark:bg-indigo-950/60 dark:hover:bg-indigo-600 dark:text-indigo-300 dark:hover:text-white border border-indigo-200/80 dark:border-indigo-800 font-extrabold text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 inline-flex"
                        >
                          <CalendarPlus className="h-3.5 w-3.5" />
                          <span>Book Stay</span>
                        </button>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>

          </table>
        </div>

        {/* ========================================================================= */}
        {/* 4. FOOTER STATUS BAR                                                      */}
        {/* ========================================================================= */}
        <div className="p-3.5 sm:p-4 border-t border-zinc-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/60 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 shrink-0 font-medium">
          <div className="flex items-center gap-2">
            <span>Showing <strong>{companies.length}</strong> of <strong>{totalCount}</strong> Master Accounts</span>
            <span>•</span>
            <span className="hidden sm:inline">Official GST Rule 46 Registered Entities</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold text-xs hover:bg-zinc-100 dark:hover:bg-zinc-700 transition cursor-pointer shadow-xs"
          >
            Close Directory
          </button>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 5. ADD COMPANY MODAL MODAL                                                */}
      {/* ========================================================================= */}
      {showAddModal && (
        <AddCompanyModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={(newCompany) => {
            setCompanies((prev) => [newCompany, ...prev]);
            setShowAddModal(false);
          }}
          activeProperty={activeProperty}
          defaultType={typeFilter === "TRAVEL_AGENT" ? "TRAVEL_AGENT" : typeFilter === "OTA" ? "OTA" : "COMPANY"}
        />
      )}

      {/* ========================================================================= */}
      {/* 6. COMPANY DETAIL MODAL (IF CLICKED)                                      */}
      {/* ========================================================================= */}
      {selectedCompanyDetail && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white font-black flex items-center justify-center">
                  {getInitials(selectedCompanyDetail.accountName)}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-zinc-950 dark:text-white">
                    {selectedCompanyDetail.accountName}
                  </h3>
                  <span className="text-[11px] font-mono text-zinc-500">
                    {selectedCompanyDetail.accountType} &bull; {selectedCompanyDetail.city || "Assam"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedCompanyDetail(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono bg-zinc-50 dark:bg-zinc-900/60 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <div className="flex justify-between">
                <span className="text-zinc-500">GSTIN:</span>
                <span className="font-bold text-zinc-950 dark:text-white">{selectedCompanyDetail.gstin || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Phone:</span>
                <span className="font-bold text-zinc-950 dark:text-white">{selectedCompanyDetail.mobile || selectedCompanyDetail.phone || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Address:</span>
                <span className="font-bold text-zinc-950 dark:text-white max-w-xs text-right">{selectedCompanyDetail.address || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Food Plan:</span>
                <span className="font-bold text-zinc-950 dark:text-white">{selectedCompanyDetail.foodPlan || "EP"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Credit Limit:</span>
                <span className="font-bold text-zinc-950 dark:text-white">₹{selectedCompanyDetail.creditLimit || 0}</span>
              </div>
              {selectedCompanyDetail.commissionPercent ? (
                <div className="flex justify-between">
                  <span className="text-zinc-500">Commission:</span>
                  <span className="font-bold text-amber-600">{selectedCompanyDetail.commissionPercent}%</span>
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedCompanyDetail(null)}
                className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300"
              >
                Close
              </button>
              <button
                onClick={() => {
                  if (onSelectForBooking) {
                    onSelectForBooking(selectedCompanyDetail);
                  }
                  setSelectedCompanyDetail(null);
                  onClose();
                }}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md"
              >
                <CalendarPlus className="h-4 w-4" />
                <span>Create Booking For This Company</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
