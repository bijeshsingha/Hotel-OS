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
} from "lucide-react";
import { AddCompanyModal } from "./company-modal";
import { CompanyItem } from "./company-selector";

interface CompanyDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProperty?: any;
  onSelectForBooking?: (company: CompanyItem) => void;
}

export function CompanyDirectoryModal({
  isOpen,
  onClose,
  activeProperty,
  onSelectForBooking,
}: CompanyDirectoryModalProps) {
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "COMPANY" | "TRAVEL_AGENT">("ALL");
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/v1/companies?propertyId=${activeProperty?.id || ""}&type=${typeFilter}&query=${encodeURIComponent(search)}`
      );
      if (res.ok) {
        const data = await res.json();
        setCompanies(data);
      }
    } catch (e) {
      console.error("Failed to load company directory:", e);
    } finally {
      setLoading(false);
    }
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
    }, 200);
    return () => clearTimeout(timer);
  }, [search]);

  if (!isOpen) return null;

  const totalCount = companies.length;
  const corporateCount = companies.filter((c) => c.accountType === "COMPANY").length;
  const agentCount = companies.filter((c) => c.accountType === "TRAVEL_AGENT" || c.accountType === "OTA").length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
      <div className="w-full max-w-5xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/80 dark:bg-zinc-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-zinc-900 dark:text-white flex items-center gap-2">
                <span>Corporate Companies & Travel Agents Master</span>
                <span className="text-[10px] font-mono font-bold bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-500/30">
                  {companies.length} Registered
                </span>
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Central B2B accounts, GSTIN master profiles, credit terms, and travel agency rates.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs flex items-center gap-1.5 transition shadow-sm active:scale-95 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>+ Add Company / Agent</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="p-3 sm:p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          {/* Search */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search company, agent, GSTIN, phone, city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:border-indigo-500 focus:outline-none transition shadow-xs"
            />
          </div>

          {/* Type Filter Pills */}
          <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold self-stretch sm:self-auto">
            <button
              type="button"
              onClick={() => setTypeFilter("ALL")}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                typeFilter === "ALL"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs font-bold"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              All ({totalCount})
            </button>

            <button
              type="button"
              onClick={() => setTypeFilter("COMPANY")}
              className={`px-3 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                typeFilter === "COMPANY"
                  ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <Briefcase className="h-3 w-3" />
              <span>Companies ({corporateCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setTypeFilter("TRAVEL_AGENT")}
              className={`px-3 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                typeFilter === "TRAVEL_AGENT"
                  ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs font-bold"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <Building2 className="h-3 w-3" />
              <span>Agents / OTAs ({agentCount})</span>
            </button>
          </div>
        </div>

        {/* Directory Table */}
        <div className="overflow-x-auto overflow-y-auto flex-1 p-3 sm:p-4">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-mono uppercase text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/60 sticky top-0 z-10">
                <th className="p-3 font-bold">Company / Agency Name</th>
                <th className="p-3 font-bold">Type</th>
                <th className="p-3 font-bold">GSTIN (B2B Credit)</th>
                <th className="p-3 font-bold">Contact Phone</th>
                <th className="p-3 font-bold">City & Address</th>
                <th className="p-3 font-bold">Food Plan</th>
                <th className="p-3 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {companies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-500 font-mono text-xs">
                    {loading ? "Loading company directory..." : `No records found matching "${search}"`}
                  </td>
                </tr>
              ) : (
                companies.map((c) => (
                  <tr
                    key={c.id || c.accountName}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition group"
                  >
                    {/* Name & Short */}
                    <td className="p-3">
                      <div className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                        <span>{c.accountName}</span>
                        {c.shortName && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 font-semibold">
                            {c.shortName}
                          </span>
                        )}
                      </div>
                      {c.remarks && (
                        <p className="text-[10px] text-zinc-400 line-clamp-1 italic mt-0.5">
                          {c.remarks}
                        </p>
                      )}
                    </td>

                    {/* Type Badge */}
                    <td className="p-3">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                        c.accountType === "TRAVEL_AGENT" || c.accountType === "OTA"
                          ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                          : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                      }`}>
                        {c.accountType === "TRAVEL_AGENT" ? "Travel Agent" : c.accountType === "OTA" ? "OTA Portal" : "Corporate B2B"}
                      </span>
                    </td>

                    {/* GSTIN */}
                    <td className="p-3 font-mono font-bold text-zinc-700 dark:text-zinc-300">
                      {c.gstin ? (
                        <span className="bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 text-[11px]">
                          {c.gstin}
                        </span>
                      ) : (
                        <span className="text-zinc-400 font-normal italic text-[11px]">—</span>
                      )}
                    </td>

                    {/* Contact Phone */}
                    <td className="p-3 font-mono text-zinc-800 dark:text-zinc-200">
                      {c.mobile || c.phone ? (
                        <div className="space-y-0.5">
                          {c.mobile && <div className="font-semibold">{c.mobile}</div>}
                          {c.email && <div className="text-[10px] text-zinc-400">{c.email}</div>}
                        </div>
                      ) : (
                        <span className="text-zinc-400 font-normal italic">—</span>
                      )}
                    </td>

                    {/* City & Address */}
                    <td className="p-3 text-zinc-600 dark:text-zinc-400 max-w-[220px]">
                      {c.city && <span className="font-bold text-zinc-900 dark:text-white block truncate">{c.city}</span>}
                      {c.address ? (
                        <span className="text-[11px] truncate block opacity-90">{c.address}</span>
                      ) : (
                        <span className="text-zinc-400 italic text-[11px]">—</span>
                      )}
                    </td>

                    {/* Food Plan */}
                    <td className="p-3">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                        {c.foodPlan || "EP"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-right">
                      {onSelectForBooking && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectForBooking(c);
                            onClose();
                          }}
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] transition cursor-pointer"
                        >
                          Book Stay
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 flex items-center justify-between text-xs text-zinc-500 font-mono shrink-0">
          <span>Showing {companies.length} Master Accounts</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 font-bold text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            Close Directory
          </button>
        </div>

      </div>

      {/* Add Company Modal */}
      {showAddModal && (
        <AddCompanyModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          activeProperty={activeProperty}
          onSuccess={() => {
            fetchCompanies();
          }}
        />
      )}
    </div>
  );
}
