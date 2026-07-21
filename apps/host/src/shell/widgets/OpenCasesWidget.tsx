import { useEffect, useState } from "react";
import { Card, CardContent, Typography } from "@mui/material";
import { useAuth } from "@riptacrm/auth-client";
import { listOpenCasesAssignedTo } from "../../api/caseManagementClient";

export function OpenCasesWidget() {
  const { user } = useAuth();
  const [count, setCount] = useState<number | null>(null);
  const [openedToday, setOpenedToday] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!user) return;
    listOpenCasesAssignedTo(user.id, user.token)
      .then((cases) => {
        setCount(cases.length);
        const today = new Date().toDateString();
        setOpenedToday(cases.filter((c) => new Date(c.createdAt).toDateString() === today).length);
      })
      .catch(() => setError(true));
  }, [user]);

  return (
    <Card>
      <CardContent>
        <Typography variant="overline" color="text.secondary">
          Open Cases
        </Typography>
        {error ? (
          <Typography color="text.secondary">Unable to load open cases.</Typography>
        ) : (
          <>
            <Typography variant="h3">{count ?? "—"}</Typography>
            <Typography variant="body2" color="text.secondary">
              {openedToday} opened today
            </Typography>
          </>
        )}
      </CardContent>
    </Card>
  );
}
