import { Card, CardContent, List, ListItem, ListItemText, Typography } from "@mui/material";

const MOCK_ACTIVITY = [
  { id: "1", text: "Jane Doe replied to a WebChat conversation", time: "10 min ago" },
  { id: "2", text: "New case opened for Acme Corp", time: "42 min ago" },
  { id: "3", text: "Email sent to John Smith", time: "1 hour ago" },
];

export function RecentActivityWidget() {
  return (
    <Card>
      <CardContent>
        <Typography variant="overline" color="text.secondary">
          Recent Activity
        </Typography>
        <List dense disablePadding>
          {MOCK_ACTIVITY.map((item) => (
            <ListItem key={item.id} disableGutters>
              <ListItemText primary={item.text} secondary={item.time} />
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
}
