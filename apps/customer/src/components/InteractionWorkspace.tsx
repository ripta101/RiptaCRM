import { useState } from "react";
import { Box, Button, List, ListItemButton, ListItemText, Paper, Typography } from "@mui/material";
import type {
  CreateCustomerInput,
  CustomerDetail,
  CustomerSearchParams,
  CustomerSummary,
} from "@riptacrm/shared-types";
import { createCustomer, getCustomerById, searchCustomers } from "../api/client";
import { SearchForm } from "./SearchForm";
import { CreateCustomerForm } from "./CreateCustomerForm";
import { MasterDetailView } from "./MasterDetailView";
import { CustomerDetailPanel } from "./CustomerDetailPanel";
import { CustomerMenuBox, type CustomerMenuItem } from "./CustomerMenuBox";
import { LodgeCaseForm } from "./LodgeCaseForm";

type WorkspaceContent =
  | { kind: "menu" }
  | { kind: "search" }
  | { kind: "browse"; results: CustomerSummary[] }
  | { kind: "createCustomer" };

interface InteractionWorkspaceProps {
  confirmedCustomers: CustomerDetail[];
  activeCustomerId: string | null;
  activeMenuItem: CustomerMenuItem;
  currentUserId: string | null;
  onSelectCustomerMenu: (customerId: string, item: CustomerMenuItem) => void;
  onCustomerAdded: (detail: CustomerDetail) => void;
  onCustomerUpdated: (detail: CustomerDetail) => void;
  onWrapUp: () => void;
}

export function InteractionWorkspace({
  confirmedCustomers,
  activeCustomerId,
  activeMenuItem,
  currentUserId,
  onSelectCustomerMenu,
  onCustomerAdded,
  onCustomerUpdated,
  onWrapUp,
}: InteractionWorkspaceProps) {
  const [content, setContent] = useState<WorkspaceContent>({ kind: "menu" });

  const [searchParams, setSearchParams] = useState<CustomerSearchParams>({});
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [createParams, setCreateParams] = useState<Partial<CreateCustomerInput>>({});
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [candidateDetail, setCandidateDetail] = useState<CustomerDetail | null>(null);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [candidateError, setCandidateError] = useState<string | null>(null);

  function handleSearchFieldChange(field: keyof CustomerSearchParams, value: string) {
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
      setContent({ kind: "browse", results });
      setCandidateError(null);
      await handleSelectCandidate(results[0].id);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  }

  async function handleSelectCandidate(id: string) {
    setCandidateId(id);
    setCandidateLoading(true);
    setCandidateError(null);
    try {
      setCandidateDetail(await getCustomerById(id));
    } catch (err) {
      setCandidateError(err instanceof Error ? err.message : "Failed to load customer.");
    } finally {
      setCandidateLoading(false);
    }
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
    setContent({ kind: "createCustomer" });
  }

  function handleCreateFieldChange(field: keyof CreateCustomerInput, value: string) {
    setCreateParams((prev) => ({ ...prev, [field]: value }));
  }

  async function handleCreateCustomer() {
    setCreating(true);
    setCreateError(null);
    try {
      const newCustomer = await createCustomer(createParams as CreateCustomerInput);
      onCustomerAdded(newCustomer);
      setContent({ kind: "menu" });
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create customer.");
    } finally {
      setCreating(false);
    }
  }

  function handleConfirmCandidate(detail: CustomerDetail) {
    onCustomerAdded(detail);
    setContent({ kind: "menu" });
  }

  const activeCustomer = confirmedCustomers.find((c) => c.id === activeCustomerId) ?? null;

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 2,
          alignItems: { xs: "stretch", md: "flex-start" },
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
          <Paper variant="outlined" sx={{ width: { xs: "100%", md: 260 } }}>
            <Typography variant="overline" color="text.secondary" sx={{ px: 2, pt: 2, display: "block" }}>
              Interaction
            </Typography>
            <List dense>
              <ListItemButton
                selected={content.kind !== "menu"}
                onClick={() => setContent({ kind: "search" })}
              >
                <ListItemText primary="Search Customer" />
              </ListItemButton>
            </List>
          </Paper>

          {confirmedCustomers.map((customer) => (
            <CustomerMenuBox
              key={customer.id}
              customer={customer}
              isActive={content.kind === "menu" && customer.id === activeCustomerId}
              activeItem={activeMenuItem}
              onSelect={(id, item) => {
                onSelectCustomerMenu(id, item);
                setContent({ kind: "menu" });
              }}
            />
          ))}
        </Box>

        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          {content.kind === "menu" && activeCustomer && activeMenuItem === "profile" && (
            <CustomerProfileContent customer={activeCustomer} />
          )}
          {content.kind === "menu" && activeCustomer && activeMenuItem === "amend" && (
            <ComingSoonContent title="Amend Customer" customer={activeCustomer} />
          )}
          {content.kind === "menu" && activeCustomer && activeMenuItem === "lodgeCase" && (
            <LodgeCaseForm customer={activeCustomer} currentUserId={currentUserId} onCustomerUpdated={onCustomerUpdated} />
          )}

          {content.kind === "search" && (
            <SearchForm
              values={searchParams}
              onChange={handleSearchFieldChange}
              onSubmit={handleSearch}
              onCreateCustomer={handleShowCreateForm}
              searching={searching}
              error={searchError}
            />
          )}

          {content.kind === "browse" && (
            <MasterDetailView
              results={content.results}
              selectedCustomerId={candidateId}
              onSelectCustomer={handleSelectCandidate}
              detail={candidateDetail}
              detailLoading={candidateLoading}
              detailError={candidateError}
              onNewSearch={() => setContent({ kind: "search" })}
              onConfirm={handleConfirmCandidate}
            />
          )}

          {content.kind === "createCustomer" && (
            <CreateCustomerForm
              values={createParams}
              onChange={handleCreateFieldChange}
              onSubmit={handleCreateCustomer}
              onBack={() => setContent({ kind: "search" })}
              submitting={creating}
              error={createError}
            />
          )}
        </Box>
      </Box>

      <Box sx={{ display: "flex", justifyContent: "flex-start", mt: 2 }}>
        <Button variant="outlined" onClick={onWrapUp}>
          Wrap Up
        </Button>
      </Box>
    </Box>
  );
}

function CustomerProfileContent({ customer }: { customer: CustomerDetail }) {
  return <CustomerDetailPanel detail={customer} loading={false} error={null} />;
}

function ComingSoonContent({ title, customer }: { title: string; customer: CustomerDetail }) {
  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        {title}
      </Typography>
      <Typography color="text.secondary">
        Coming soon — for {customer.firstName} {customer.lastName}.
      </Typography>
    </Paper>
  );
}
