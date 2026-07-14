import { Card, CardContent, Typography } from "@mui/material";

export function OpenCasesWidget() {
  return (
    <Card>
      <CardContent>
        <Typography variant="overline" color="text.secondary">
          Open Cases
        </Typography>
        <Typography variant="h3">12</Typography>
        <Typography variant="body2" color="text.secondary">
          3 opened today
        </Typography>
      </CardContent>
    </Card>
  );
}
