"use client";

import React, { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const EVENT_TYPES = [
  { value: "", label: "All types" },
  { value: "lab_result", label: "Lab Results" },
  { value: "imaging_result", label: "Imaging" },
  { value: "appointment", label: "Appointments" },
  { value: "procedure", label: "Procedures" },
  { value: "flare", label: "Flares" },
  { value: "note", label: "Notes" }
];

const SPECIALTIES = [
  { value: "", label: "All specialties" },
  { value: "primary_care", label: "Primary Care" },
  { value: "neurology", label: "Neurology" },
  { value: "vascular", label: "Vascular" },
  { value: "cardiology", label: "Cardiology" },
  { value: "rheumatology", label: "Rheumatology" },
  { value: "gastroenterology", label: "Gastroenterology" },
  { value: "immunology", label: "Immunology" }
];

const VERIFICATION_OPTIONS = [
  { value: "", label: "All events" },
  { value: "true", label: "Verified only" },
  { value: "false", label: "Pending only" }
];

export function TimelineFilter(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentType = searchParams.get("type") ?? "";
  const currentSpecialty = searchParams.get("specialty") ?? "";
  const currentVerified = searchParams.get("verified") ?? "";
  const currentCondition = searchParams.get("condition") ?? "";
  const currentFrom = searchParams.get("from") ?? "";
  const currentTo = searchParams.get("to") ?? "";

  function updateFilter(key: string, value: string): void {
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    startTransition(() => {
      router.push(`/timeline?${params.toString()}`);
    });
  }

  function clearFilters(): void {
    startTransition(() => {
      router.push("/timeline");
    });
  }

  const hasFilters = currentType || currentSpecialty || currentVerified || currentCondition || currentFrom || currentTo;

  return (
    <div className="rounded-lg border border-[#CCD3DD] bg-white p-4">
      <div className="flex flex-wrap items-end gap-4">
        {/* Event Type */}
        <div className="min-w-[150px]">
          <label htmlFor="type-filter" className="mb-1 block text-xs font-medium text-muted">
            Event Type
          </label>
          <select
            id="type-filter"
            value={currentType}
            onChange={(e) => updateFilter("type", e.target.value)}
            className="w-full rounded-lg border border-[#CCD3DD] px-3 py-2 text-sm"
            disabled={isPending}
          >
            {EVENT_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Specialty */}
        <div className="min-w-[150px]">
          <label htmlFor="specialty-filter" className="mb-1 block text-xs font-medium text-muted">
            Specialty
          </label>
          <select
            id="specialty-filter"
            value={currentSpecialty}
            onChange={(e) => updateFilter("specialty", e.target.value)}
            className="w-full rounded-lg border border-[#CCD3DD] px-3 py-2 text-sm"
            disabled={isPending}
          >
            {SPECIALTIES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Verification Status */}
        <div className="min-w-[150px]">
          <label htmlFor="verified-filter" className="mb-1 block text-xs font-medium text-muted">
            Verification
          </label>
          <select
            id="verified-filter"
            value={currentVerified}
            onChange={(e) => updateFilter("verified", e.target.value)}
            className="w-full rounded-lg border border-[#CCD3DD] px-3 py-2 text-sm"
            disabled={isPending}
          >
            {VERIFICATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Condition search */}
        <div className="min-w-[180px]">
          <label htmlFor="condition-filter" className="mb-1 block text-xs font-medium text-muted">
            Condition
          </label>
          <input
            id="condition-filter"
            type="text"
            value={currentCondition}
            onChange={(e) => updateFilter("condition", e.target.value)}
            placeholder="e.g., mcas, thyroid"
            className="w-full rounded-lg border border-[#CCD3DD] px-3 py-2 text-sm"
            disabled={isPending}
          />
        </div>

        <div className="min-w-[150px]">
          <label htmlFor="from-filter" className="mb-1 block text-xs font-medium text-muted">
            From Date
          </label>
          <input
            id="from-filter"
            type="date"
            value={currentFrom}
            onChange={(e) => updateFilter("from", e.target.value)}
            className="w-full rounded-lg border border-[#CCD3DD] px-3 py-2 text-sm"
            disabled={isPending}
          />
        </div>

        <div className="min-w-[150px]">
          <label htmlFor="to-filter" className="mb-1 block text-xs font-medium text-muted">
            To Date
          </label>
          <input
            id="to-filter"
            type="date"
            value={currentTo}
            onChange={(e) => updateFilter("to", e.target.value)}
            className="w-full rounded-lg border border-[#CCD3DD] px-3 py-2 text-sm"
            disabled={isPending}
          />
        </div>

        {/* Clear button */}
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-lg border border-[#D1D7E0] bg-white px-3 py-2 text-sm font-medium text-[#374151] hover:bg-[#F8FAFC]"
            disabled={isPending}
          >
            Clear filters
          </button>
        )}

        {/* Loading indicator */}
        {isPending && (
          <span className="text-xs text-muted">Loading...</span>
        )}
      </div>

      {/* Active filter count */}
      {hasFilters && (
        <div className="mt-2 text-xs text-muted">
          {[currentType, currentSpecialty, currentVerified, currentCondition, currentFrom, currentTo].filter(Boolean).length} filter(s) active
        </div>
      )}
    </div>
  );
}
