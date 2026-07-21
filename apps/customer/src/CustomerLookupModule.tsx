import { useEffect, useState } from "react";
import { Alert, Box } from "@mui/material";
import {
  CUSTOMER_CREATE_FEATURE_ID,
  CUSTOMER_SEARCH_FEATURE_ID,
} from "@riptacrm/shared-types";
import type {
  CreateCustomerInput,
  CustomerDetail,
  CustomerSearchParams,
  CustomerSummary,
} from "@riptacrm/shared-types";
import { createCustomer, getCustomerById, searchCustomers } from "./api/client";
import { SearchForm } from "./components/SearchForm";
import { CreateCustomerForm } from "./components/CreateCustomerForm";
import { MasterDetailView } from "./components/MasterDetailView";
import { InteractionWorkspace } from "./components/InteractionWorkspace";
import { WrapUpScreen } from "./components/WrapUpScreen";
import type { CustomerMenuItem } from "./components/CustomerMenuBox";

type View =
  | { mode: "search" }
  | { mode: "create" }
  | { mode: "browse"; results: CustomerSummary[] }
  | { mode: "workspace" }
  | { mode: "wrapup" };

export interface CustomerLookupModuleProps {
  onCustomerIdentified?: (customer: CustomerSummary) => void;
  closeRequested?: boolean;
  onInteractionEnded?: () => void;
  currentUserId?: string | null;
  authToken?: string | null;
  // undefined defaults to all 5 features granted — keeps the standalone dev harness
  // (StandaloneApp.tsx) usable without wiring up a fake grant list.
  grantedFeatureIds?: string[];
}

export default function CustomerLookupModule({
  onCustomerIdentified,
  closeRequested,
  onInteractionEnded,
  currentUserId,
  authToken,
  grantedFeatureIds,
}: CustomerLookupModuleProps) {
  const isGranted = (featureId: string) => grantedFeatureIds === undefined || grantedFeatureIds.includes(featureId);
  const canSearch = isGranted(CUSTOMER_SEARCH_FEATURE_ID);
  const canCreate = isGranted(CUSTOMER_CREATE_FEATURE_ID);
  const [searchParams, setSearchParams] = useState<CustomerSearchParams>({});
  const [view, setView] = useState<View>({ mode: "search" });
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [createParams, setCreateParams] = useState<Partial<CreateCustomerInput>>({});
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [confirmedCustomers, setConfirmedCustomers] = useState<CustomerDetail[]>([]);
  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(null);
  const [activeMenuItem, setActiveMenuItem] = useState<CustomerMenuItem>("profile");

  useEffect(() => {
    if (closeRequested) {
      setView({ mode: "wrapup" });
    }
  }, [closeRequested]);

  function handleFieldChange(field: keyof CustomerSearchParams, value: string) {
    setSearchParams((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSearch() {
    setSearching(true);
    setSearchError(null);
    try {
      const results = await searchCustomers(searchParams, authToken);
      if (results.length === 0) {
        setSearchError("No customers matched your search. Try adjusting the criteria.");
        return;
      }
      setView({ mode: "browse", results });
      setDetailError(null);
      await handleSelectCustomer(results[0].id);
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
      const customerDetail = await getCustomerById(id, authToken);
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

  function handleShowCreateForm() {
    setCreateParams({
      firstName: searchParams.firstName,
      lastName: searchParams.lastName,
      phone: searchParams.phone,
      dateOfBirth: searchParams.dateOfBirth,
      email: searchParams.email,
      companyName: searchParams.companyName,
    });
    setCreateError(null);
    setView({ mode: "create" });
  }

  function handleCreateFieldChange(field: keyof CreateCustomerInput, value: string) {
    setCreateParams((prev) => ({ ...prev, [field]: value }));
  }

  async function handleCreateCustomer() {
    setCreating(true);
    setCreateError(null);
    try {
      const newCustomer = await createCustomer(createParams as CreateCustomerInput, authToken);
      setView({ mode: "browse", results: [newCustomer] });
      setSelectedCustomerId(newCustomer.id);
      setDetail(newCustomer);
      setDetailError(null);
      onCustomerIdentified?.(newCustomer);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create customer.");
    } finally {
      setCreating(false);
    }
  }

  function handleCustomerUpdated(detail: CustomerDetail) {
    setConfirmedCustomers((prev) => prev.map((c) => (c.id === detail.id ? detail : c)));
  }

  function addOrActivateCustomer(customer: CustomerDetail) {
    setConfirmedCustomers((prev) =>
      prev.some((c) => c.id === customer.id) ? prev : [...prev, customer],
    );
    setActiveCustomerId(customer.id);
    setActiveMenuItem("profile");
    setView({ mode: "workspace" });
    onCustomerIdentified?.(customer);
  }

  function handleSelectCustomerMenu(customerId: string, item: CustomerMenuItem) {
    setActiveCustomerId(customerId);
    setActiveMenuItem(item);
    const customer = confirmedCustomers.find((c) => c.id === customerId);
    if (customer) onCustomerIdentified?.(customer);
  }

  function handleEndInteraction(notes: string) {
    // Simulated save — no backend for interaction records yet.
    console.log("Interaction wrapped up", { confirmedCustomers, notes });
    onInteractionEnded?.();
  }

  if (view.mode === "search") {
    if (!canSearch) {
      return (
        <Box sx={{ maxWidth: 640 }}>
          <Alert severity="warning">You don't have access to Search Customer.</Alert>
        </Box>
      );
    }
    return (
      <SearchForm
        values={searchParams}
        onChange={handleFieldChange}
        onSubmit={handleSearch}
        onCreateCustomer={canCreate ? handleShowCreateForm : undefined}
        searching={searching}
        error={searchError}
      />
    );
  }

  if (view.mode === "create") {
    return (
      <CreateCustomerForm
        values={createParams}
        onChange={handleCreateFieldChange}
        onSubmit={handleCreateCustomer}
        onBack={() => setView({ mode: "search" })}
        submitting={creating}
        error={createError}
      />
    );
  }

  if (view.mode === "workspace") {
    return (
      <InteractionWorkspace
        confirmedCustomers={confirmedCustomers}
        activeCustomerId={activeCustomerId}
        activeMenuItem={activeMenuItem}
        currentUserId={currentUserId ?? null}
        authToken={authToken}
        grantedFeatureIds={grantedFeatureIds}
        onSelectCustomerMenu={handleSelectCustomerMenu}
        onCustomerAdded={addOrActivateCustomer}
        onCustomerUpdated={handleCustomerUpdated}
        onWrapUp={() => setView({ mode: "wrapup" })}
      />
    );
  }

  if (view.mode === "wrapup") {
    return (
      <WrapUpScreen confirmedCustomers={confirmedCustomers} onEndInteraction={handleEndInteraction} />
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
      onConfirm={addOrActivateCustomer}
    />
  );
}
