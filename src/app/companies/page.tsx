"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useHotel } from "@/lib/context/hotel-context";
import {
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
  CalendarPlus,
  Globe,
  Compass,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  X,
} from "lucide-react";
import { AddCompanyModal } from "@/components/pms/company-modal";
import { CompanyItem } from "@/components/pms/company-selector";
import initialCompaniesJson from "@/data/initial-companies.json";
import { useRouter } from "next/navigation";

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

function getInitials(name: string): string {
  if (!name) return "CO";
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

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

export default function CompaniesMasterPage() {
  const { activeProperty, refreshKey } = useHotel();
  const router = useRouter();

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
    fetchCompanies();
  }, [activeProperty?.id, typeFilter, refreshKey]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCompanies();
    }, 150);
    return () => clearTimeout(timer);
  }, [search]);

  const totalCount = defaultCompanies.length;
  const corporateCount = defaultCompanies.filter((c) => c.accountType === "COMPANY").length;
  const agentCount = defaultCompanies.filter((c) => c.accountType === "TRAVEL_AGENT").length;
  const otaCount = defaultCompanies.filter((c) => c.accountType === "OTA").length;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedGstin(text);
    setTimeout(() => setCopiedGstin(null), 2000);
  };

  const handleBookStayForCompany = (comp: CompanyItem) => {
    router.push(`/pms?action=walkin&company=${encodeURIComponent(comp.accountName)}&gstin=${encodeURIComponent(comp.gstin || "")}`);
  };

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto w-full text-zinc-900 dark:text-zinc-100">
      
      {/* 1. TOP HEADER & METRIC STATS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl bg-white dark:bg-[#111114] border border-zinc-200/90 dark:border-zinc-800 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs shrink-0">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-black text-zinc-900 dark:text-white tracking-tight">
                Corporate & Travel Agent Master Directory
              </h1>
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

        {/* Action Button */}
        <div className="flex items-center gap-2.5 self-end md:self-auto">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="h-10 px-4 rounded-xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-black text-xs flex items-center gap-2 transition hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow-md active:scale-95 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Company / Agent</span>
          </button>
        </div>
      </div>

      {/* 2. FILTER RIBBON & STATS BAR */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-2xs">
        
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by company, short code, GSTIN, phone, city, or address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-8 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 focus:outline-none transition shadow-2xs font-normal"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Segmented Filter Pills */}
        <div className="flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-medium overflow-x-auto">
          <button
            type="button"
            onClick={() => setTypeFilter("ALL")}
            className={`px-3 py-1.5 rounded-md transition whitespace-nowrap cursor-pointer ${
              typeFilter === "ALL"
                ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 shadow-2xs font-semibold border border-zinc-200/80 dark:border-zinc-700/60"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            All ({totalCount})
          </button>

          <button
            type="button"
            onClick={() => setTypeFilter("COMPANY")}
            className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              typeFilter === "COMPANY"
                ? "bg-white dark:bg-zinc-800 text-emerald-700 dark:text-emerald-400 shadow-2xs font-semibold border border-zinc-200/80 dark:border-zinc-700/60"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            <Briefcase className="h-3.5 w-3.5" />
            <span>Corporates ({corporateCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setTypeFilter("TRAVEL_AGENT")}
            className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              typeFilter === "TRAVEL_AGENT"
                ? "bg-white dark:bg-zinc-800 text-purple-700 dark:text-purple-400 shadow-2xs font-semibold border border-zinc-200/80 dark:border-zinc-700/60"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            <Compass className="h-3.5 w-3.5" />
            <span>Agents ({agentCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setTypeFilter("OTA")}
            className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              typeFilter === "OTA"
                ? "bg-white dark:bg-zinc-800 text-blue-700 dark:text-blue-400 shadow-2xs font-semibold border border-zinc-200/80 dark:border-zinc-700/60"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            <span>OTAs ({otaCount})</span>
          </button>
        </div>
      </div>

      {/* 3. MASTER DIRECTORY ENTERPRISE TABLE */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114] overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[11px] uppercase tracking-wider text-zinc-600 dark:text-zinc-400 bg-zinc-50/90 dark:bg-zinc-900/90 sticky top-0 z-10 backdrop-blur-xs font-semibold">
                <th className="py-3 px-4 font-semibold">Company / Account Name</th>
                <th className="py-3 px-4 font-semibold">Account Type</th>
                <th className="py-3 px-4 font-semibold">GSTIN (B2B Tax Credit)</th>
                <th className="py-3 px-4 font-semibold">Contact & Phone</th>
                <th className="py-3 px-4 font-semibold">City & Address</th>
                <th className="py-3 px-4 font-semibold">Terms & Plan</th>
                <th className="py-3 px-4 font-semibold text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/70 dark:divide-zinc-800/60">
              {companies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-zinc-400 dark:text-zinc-500 font-mono text-xs">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Search className="h-8 w-8 text-zinc-300 dark:text-zinc-600" />
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                        No master accounts found matching "{search}"
                      </span>
                      <button
                        onClick={() => {
                          setSearch("");
                          setTypeFilter("ALL");
                        }}
                        className="text-blue-600 dark:text-blue-400 text-xs font-medium hover:underline cursor-pointer"
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
                      className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40 transition-colors group"
                    >
                      {/* Account Name + Monogram */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-semibold text-white shrink-0 shadow-2xs ${
                              isCorporate
                                ? "bg-emerald-600"
                                : isOTA
                                ? "bg-blue-600"
                                : "bg-purple-600"
                            }`}
                          >
                            {initials}
                          </div>

                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {c.accountName}
                              </span>
                              {c.shortName && (
                                <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                                  {c.shortName}
                                </span>
                              )}
                            </div>

                            {c.remarks ? (
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-xs italic">
                                {c.remarks}
                              </p>
                            ) : (
                              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                                Registered Master B2B Account
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Account Type Pill */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isCorporate && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-medium text-xs">
                            <Briefcase className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                            <span>Corporate B2B</span>
                          </span>
                        )}

                        {isOTA && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 font-medium text-xs">
                            <Globe className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                            <span>OTA Channel</span>
                          </span>
                        )}

                        {isAgent && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 font-medium text-xs">
                            <Compass className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                            <span>Travel Agent</span>
                          </span>
                        )}
                      </td>

                      {/* GSTIN & Tax Details */}
                      <td className="py-3 px-4">
                        {c.gstin ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 font-mono">
                              <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs tracking-tight bg-zinc-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
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
                              <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono font-medium">
                                {stateBadge}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-zinc-400 dark:text-zinc-500 font-mono text-xs italic">
                            — No GSTIN
                          </span>
                        )}
                      </td>

                      {/* Contact Phone & Email */}
                      <td className="py-3 px-4">
                        <div className="space-y-1 font-mono text-xs">
                          {(c.mobile || c.phone) ? (
                            <a
                              href={`tel:${c.mobile || c.phone}`}
                              className="font-medium text-zinc-900 dark:text-zinc-100 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1.5 transition-colors"
                            >
                              <Phone className="h-3 w-3 text-zinc-400" />
                              <span>{c.mobile || c.phone}</span>
                            </a>
                          ) : (
                            <span className="text-zinc-400 dark:text-zinc-500 italic text-xs">— No Phone</span>
                          )}

                          {c.email && (
                            <a
                              href={`mailto:${c.email}`}
                              className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1.5 truncate max-w-[180px] transition-colors"
                            >
                              <Mail className="h-3 w-3 text-zinc-400 shrink-0" />
                              <span className="truncate">{c.email}</span>
                            </a>
                          )}
                        </div>
                      </td>

                      {/* City & Address */}
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

                      {/* Terms & Food Plan */}
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

                      {/* Action Button */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleBookStayForCompany(c)}
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

        {/* Status Footer */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/60 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 font-medium">
          <div>
            Showing <strong>{companies.length}</strong> of <strong>{totalCount}</strong> Master Accounts
          </div>
          <div className="font-mono text-[11px]">
            Official GST Rule 46 Registered Entities
          </div>
        </div>
      </div>

      {/* Add Company Modal */}
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
    </div>
  );
}
