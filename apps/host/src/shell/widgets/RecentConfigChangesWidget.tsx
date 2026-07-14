import { Card, CardContent, List, ListItem, ListItemText, Typography } from "@mui/material";

const MOCK_CHANGES = [
  { id: "1", text: "WebChat greeting message updated", time: "25 min ago" },
  { id: "2", text: "Email template \"Welcome\" edited", time: "2 hours ago" },
  { id: "3", text: "Case Management SLA rules changed", time: "1 day ago" },
];

export function RecentConfigChangesWidget() {
  return (
    <Card>
      <CardContent>
        <Typography variant="overline" color="text.secondary">
          Recent Configuration Changes
        </Typography>
        <List dense disablePadding>
          {MOCK_CHANGES.map((item) => (
            <ListItem key={item.id} disableGutters>
              <ListItemText primary={item.text} secondary={item.time} />
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
}
