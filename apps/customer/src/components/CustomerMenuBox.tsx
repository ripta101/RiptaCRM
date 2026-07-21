import { List, ListItemButton, ListItemText, Paper, Typography } from "@mui/material";
import {
  CUSTOMER_AMEND_FEATURE_ID,
  CUSTOMER_LODGE_CASE_FEATURE_ID,
  CUSTOMER_PROFILE_FEATURE_ID,
} from "@riptacrm/shared-types";
import type { CustomerDetail } from "@riptacrm/shared-types";

export type CustomerMenuItem = "profile" | "amend" | "lodgeCase";

const MENU_ITEMS: { key: CustomerMenuItem; label: string; featureId: string }[] = [
  { key: "profile", label: "Customer Profile", featureId: CUSTOMER_PROFILE_FEATURE_ID },
  { key: "amend", label: "Amend Customer", featureId: CUSTOMER_AMEND_FEATURE_ID },
  { key: "lodgeCase", label: "Lodge a Case", featureId: CUSTOMER_LODGE_CASE_FEATURE_ID },
];

interface CustomerMenuBoxProps {
  customer: CustomerDetail;
  isActive: boolean;
  activeItem: CustomerMenuItem;
  grantedFeatureIds?: string[];
  onSelect: (customerId: string, item: CustomerMenuItem) => void;
}

export function CustomerMenuBox({ customer, isActive, activeItem, grantedFeatureIds, onSelect }: CustomerMenuBoxProps) {
  const visibleItems = MENU_ITEMS.filter(
    (item) => grantedFeatureIds === undefined || grantedFeatureIds.includes(item.featureId),
  );

  return (
    <Paper variant="outlined" sx={{ width: { xs: "100%", md: 260 }, flexShrink: 0 }}>
      <Typography variant="overline" color="text.secondary" sx={{ px: 2, pt: 2, display: "block" }}>
        {customer.firstName} {customer.lastName}
      </Typography>
      <List dense>
        {visibleItems.map((item) => (
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
