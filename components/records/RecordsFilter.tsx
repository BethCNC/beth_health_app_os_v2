"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

interface RecordsFilterProps {
  specialties: string[];
  types: string[];
  initialFilters: {
    query?: string;
    specialty?: string;
    type?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}

export function RecordsFilter({ specialties, types, initialFilters }: RecordsFilterProps): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState(initialFilters.query ?? "");
  const [specialty, setSpecialty] = useState(initialFilters.specialty ?? "");
  const [type, setType] = useState(initialFilters.type ?? "");
  const [status, setStatus] = useState(initialFilters.status ?? "");
  const [dateFrom, setDateFrom] = useState(initialFilters.dateFrom ?? "");
  const [dateTo, setDateTo] = useState(initialFilters.dateTo ?? "");

  function applyFilters(): void {
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    if (specialty) params.set("specialty", specialty);
    if (type) params.set("type", type);
    if (status) params.set("status", status);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);

    startTransition(() => {
      router.push(`/records?${params.toString()}`);
    });
  }

  function clearFilters(): void {
    setQuery("");
    setSpecialty("");
    setType("");
    setStatus("");
    setDateFrom("");
    setDateTo("");
    startTransition(() => {
      router.push("/records");
    });
  }

  const hasActiveFilters = query || specialty || type || status || dateFrom || dateTo;

  return (
    <div className="rounded-lg border border-[#D1D7E0] bg-[#F8FAFC] p-4">
      <div className="flex flex-wrap items-end gap-3">
        {/* Search query */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold text-[#4B5563] mb-1" htmlFor="filter-query">
            Search
          </label>
          <input
            id="filter-query"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            placeholder="Search records..."
            className="w-full rounded-lg border border-[#CCD3DD] bg-white px-3 py-2 text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
          />
        </div>

        {/* Type filter */}
        <div className="w-[140px]">
          <label className="block text-xs font-semibold text-[#4B5563] mb-1" htmlFor="filter-type">
            Type
          </label>
          <select
            id="filter-type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded-lg border border-[#CCD3DD] bg-white px-3 py-2 text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
          >
            <option value="">All types</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>

        {/* Specialty filter */}
        <div className="w-[160px]">
          <label className="block text-xs font-semibold text-[#4B5563] mb-1" htmlFor="filter-specialty">
            Specialty
          </label>
          <select
            id="filter-specialty"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            className="w-full rounded-lg border border-[#CCD3DD] bg-white px-3 py-2 text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
          >
            <option value="">All specialties</option>
            {specialties.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>

        {/* Verification status filter */}
        <div className="w-[140px]">
          <label className="block text-xs font-semibold text-[#4B5563] mb-1" htmlFor="filter-status">
            Trust status
          </label>
          <select
            id="filter-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-lg border border-[#CCD3DD] bg-white px-3 py-2 text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
          >
            <option value="">All statuses</option>
            <option value="verified">Verified (trusted)</option>
            <option value="pending">Pending review</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Date range */}
        <div className="w-[130px]">
          <label className="block text-xs font-semibold text-[#4B5563] mb-1" htmlFor="filter-date-from">
            From
          </label>
          <input
            id="filter-date-from"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full rounded-lg border border-[#CCD3DD] bg-white px-3 py-2 text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
          />
        </div>

        <div className="w-[130px]">
          <label className="block text-xs font-semibold text-[#4B5563] mb-1" htmlFor="filter-date-to">
            To
          </label>
          <input
            id="filter-date-to"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full rounded-lg border border-[#CCD3DD] bg-white px-3 py-2 text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={applyFilters}
            disabled={isPending}
            className="rounded-lg border border-[#3B82F6] bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2563EB] disabled:opacity-60"
          >
            {isPending ? "..." : "Search"}
          </button>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              disabled={isPending}
              className="rounded-lg border border-[#BCC6D4] bg-white px-4 py-2 text-sm font-semibold text-[#374151] hover:bg-[#F8FAFC] disabled:opacity-60"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {hasActiveFilters && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="text-[#6B7280]">Active filters:</span>
          {query && (
            <span className="rounded-full bg-[#E0E7FF] px-2 py-0.5 text-[#3730A3]">
              &quot;{query}&quot;
            </span>
          )}
          {type && (
            <span className="rounded-full bg-[#E0E7FF] px-2 py-0.5 text-[#3730A3]">
              Type: {type.replace(/_/g, " ")}
            </span>
          )}
          {specialty && (
            <span className="rounded-full bg-[#E0E7FF] px-2 py-0.5 text-[#3730A3]">
              Specialty: {specialty.replace(/_/g, " ")}
            </span>
          )}
          {status && (
            <span className="rounded-full bg-[#E0E7FF] px-2 py-0.5 text-[#3730A3]">
              Status: {status}
            </span>
          )}
          {dateFrom && (
            <span className="rounded-full bg-[#E0E7FF] px-2 py-0.5 text-[#3730A3]">
              From: {dateFrom}
            </span>
          )}
          {dateTo && (
            <span className="rounded-full bg-[#E0E7FF] px-2 py-0.5 text-[#3730A3]">
              To: {dateTo}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
