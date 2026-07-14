import {
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Typography,
} from "@mui/material";
import type { CustomerSummary } from "@riptacrm/shared-types";

interface ResultsListProps {
  results: CustomerSummary[];
  selectedCustomerId: string | null;
  onSelectCustomer: (id: string) => void;
}

export function ResultsList({ results, selectedCustomerId, onSelectCustomer }: ResultsListProps) {
  return (
    <Paper variant="outlined" sx={{ width: 320, flexShrink: 0 }}>
      <Typography variant="overline" color="text.secondary" sx={{ px: 2, pt: 2, display: "block" }}>
        {results.length} matching customer{results.length === 1 ? "" : "s"}
      </Typography>
      <List dense>
        {results.map((customer) => (
          <ListItemButton
            key={customer.id}
            selected={customer.id === selectedCustomerId}
            onClick={() => onSelectCustomer(customer.id)}
          >
            <ListItemText
              primary={`${customer.firstName} ${customer.lastName}`}
              secondary={customer.phone}
            />
          </ListItemButton>
        ))}
      </List>
    </Paper>
  );
}
