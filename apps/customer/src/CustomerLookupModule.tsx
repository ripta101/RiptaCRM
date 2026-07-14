import { useState } from "react";
import type { CustomerDetail, CustomerSearchParams, CustomerSummary } from "@riptacrm/shared-types";
import { getCustomerById, searchCustomers } from "./api/client";
import { SearchForm } from "./components/SearchForm";
import { MasterDetailView } from "./components/MasterDetailView";

type View = { mode: "search" } | { mode: "browse"; results: CustomerSummary[] };

export interface CustomerLookupModuleProps {
  onCustomerIdentified?: (customer: CustomerSummary) => void;
}

export default function CustomerLookupModule({ onCustomerIdentified }: CustomerLookupModuleProps) {
  const [searchParams, setSearchParams] = useState<CustomerSearchParams>({});
  const [view, setView] = useState<View>({ mode: "search" });
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  function handleFieldChange(field: keyof CustomerSearchParams, value: string) {
    setSearchParams((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSearch() {
    setSearching(true);
    setSearchError(null);
    try {
      const results = await searchCustomers(searchParams);
      if (results.length === 0) {
        setSearchError("No customers matched your search. Try adjusting the criteria.");
        return;
      }
      setView({ mode: "browse", results });
      setSelectedCustomerId(null);
      setDetail(null);
      setDetailError(null);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  }

  async function handleSelectCustomer(id: string) {
    setSelectedCustomerId(id);
    setDetailLoading(true);
    setDetailError(null);
    try {
      const customerDetail = await getCustomerById(id);
      setDetail(customerDetail);
      onCustomerIdentified?.(customerDetail);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : "Failed to load customer.");
    } finally {
      setDetailLoading(false);
    }
  }

  function handleNewSearch() {
    setView({ mode: "search" });
    setSelectedCustomerId(null);
    setDetail(null);
    setDetailError(null);
  }

  if (view.mode === "search") {
    return (
      <SearchForm
        values={searchParams}
        onChange={handleFieldChange}
        onSubmit={handleSearch}
        searching={searching}
        error={searchError}
      />
    );
  }

  return (
    <MasterDetailView
      results={view.results}
      selectedCustomerId={selectedCustomerId}
      onSelectCustomer={handleSelectCustomer}
      detail={detail}
      detailLoading={detailLoading}
      detailError={detailError}
      onNewSearch={handleNewSearch}
    />
  );
}
