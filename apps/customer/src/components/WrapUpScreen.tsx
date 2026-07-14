import { useState } from "react";
import { Box, Button, Divider, List, ListItem, ListItemText, Paper, TextField, Typography } from "@mui/material";
import type { CustomerDetail } from "@riptacrm/shared-types";

interface MockAction {
  id: string;
  name: string;
  description: string;
  startTime: string;
  duration: string;
}

function getMockActions(customer: CustomerDetail): MockAction[] {
  return [
    {
      id: `${customer.id}-1`,
      name: "Viewed Profile",
      description: "Reviewed customer account details",
      startTime: "10:32 AM",
      duration: "2 min",
    },
    {
      id: `${customer.id}-2`,
      name: "Verified Identity",
      description: "Confirmed customer identity via security questions",
      startTime: "10:35 AM",
      duration: "1 min",
    },
  ];
}

interface WrapUpScreenProps {
  confirmedCustomers: CustomerDetail[];
  onEndInteraction: (notes: string) => void;
}

export function WrapUpScreen({ confirmedCustomers, onEndInteraction }: WrapUpScreenProps) {
  const [notes, setNotes] = useState("");

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Wrap Up
      </Typography>

      {confirmedCustomers.length === 0 ? (
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          No customers were confirmed during this interaction.
        </Typography>
      ) : (
        confirmedCustomers.map((customer) => {
          const actions = getMockActions(customer);
          return (
            <Paper key={customer.id} variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Typography variant="overline" color="text.secondary">
                {customer.firstName} {customer.lastName}
              </Typography>
              <List dense disablePadding>
                {actions.map((action, i) => (
                  <Box key={action.id}>
                    {i > 0 && <Divider component="li" />}
                    <ListItem disableGutters>
                      <ListItemText
                        primary={`${action.name} — ${action.description}`}
                        secondary={`Started ${action.startTime} · ${action.duration}`}
                      />
                    </ListItem>
                  </Box>
                ))}
              </List>
            </Paper>
          );
        })
      )}

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="overline" color="text.secondary" sx={{ display: "block", mb: 1 }}>
          Notes
        </Typography>
        <TextField
          placeholder="Type your interaction notes here"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          multiline
          minRows={4}
          fullWidth
        />
      </Paper>

      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <Button variant="contained" onClick={() => onEndInteraction(notes)}>
          End Interaction
        </Button>
      </Box>
    </Box>
  );
}
