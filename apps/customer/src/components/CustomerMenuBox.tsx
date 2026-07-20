import { List, ListItemButton, ListItemText, Paper, Typography } from "@mui/material";
import type { CustomerDetail } from "@riptacrm/shared-types";

export type CustomerMenuItem = "profile" | "amend" | "lodgeCase";

const MENU_ITEMS: { key: CustomerMenuItem; label: string }[] = [
  { key: "profile", label: "Customer Profile" },
  { key: "amend", label: "Amend Customer" },
  { key: "lodgeCase", label: "Lodge a Case" },
];

interface CustomerMenuBoxProps {
  customer: CustomerDetail;
  isActive: boolean;
  activeItem: CustomerMenuItem;
  onSelect: (customerId: string, item: CustomerMenuItem) => void;
}

export function CustomerMenuBox({ customer, isActive, activeItem, onSelect }: CustomerMenuBoxProps) {
  return (
    <Paper variant="outlined" sx={{ width: { xs: "100%", md: 260 }, flexShrink: 0 }}>
      <Typography variant="overline" color="text.secondary" sx={{ px: 2, pt: 2, display: "block" }}>
        {customer.firstName} {customer.lastName}
      </Typography>
      <List dense>
        {MENU_ITEMS.map((item) => (
          <ListItemButton
            key={item.key}
            selected={isActive && activeItem === item.key}
            onClick={() => onSelect(customer.id, item.key)}
          >
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
    </Paper>
  );
}
