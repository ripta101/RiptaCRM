import { useEffect, useState } from "react";
import { Alert, Box, Chip, CircularProgress, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import type { Profile, UserSummary } from "@riptacrm/shared-types";
import { listProfiles, listUsers } from "../api/client";

// Membership is many-to-many, so "which profile(s) does this user hold" isn't visible
// from the Profiles list alone — this read-only overview joins the two client-side.
export function UsersOverview() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([listUsers(), listProfiles({ includeArchived: "true" })])
      .then(([u, p]) => {
        setUsers(u);
        setProfiles(p);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load users."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  const profilesByUserId = new Map<string, Profile[]>();
  for (const profile of profiles) {
    for (const userId of profile.memberUserIds) {
      profilesByUserId.set(userId, [...(profilesByUserId.get(userId) ?? []), profile]);
    }
  }

  return (
    <Paper variant="outlined">
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Username</TableCell>
            <TableCell>Profiles</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((u) => {
            const userProfiles = profilesByUserId.get(u.id) ?? [];
            return (
              <TableRow key={u.id}>
                <TableCell>{u.name}</TableCell>
                <TableCell>{u.username}</TableCell>
                <TableCell>
                  {userProfiles.length === 0 && <Typography color="text.secondary">No profile assigned</Typography>}
                  {userProfiles.map((p) => (
                    <Chip key={p.id} size="small" label={p.name} sx={{ mr: 0.5 }} />
                  ))}
                </TableCell>
              </TableRow>
            );
          })}
          {users.length === 0 && (
            <TableRow>
              <TableCell colSpan={3}>
                <Typography color="text.secondary">No users found.</Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Paper>
  );
}
