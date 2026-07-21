import { useState, type FormEvent } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Alert, Box, Button, MenuItem, Paper, TextField, Typography } from "@mui/material";
import { useAuth, type ProfileChoice } from "@riptacrm/auth-client";

export function LoginPage() {
  const { isAuthenticated, login, selectProfile } = useAuth();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingChoice, setPendingChoice] = useState<{ preAuthToken: string; profiles: ProfileChoice[] } | null>(
    null,
  );
  const [selectedProfileId, setSelectedProfileId] = useState("");

  if (isAuthenticated) {
    const redirectTo = (location.state as { from?: string } | null)?.from ?? "/";
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await login(username, password);
      if (result.status === "choose-profile") {
        setPendingChoice({ preAuthToken: result.preAuthToken, profiles: result.profiles });
        setSelectedProfileId(result.profiles[0]?.id ?? "");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSelectProfile(event: FormEvent) {
    event.preventDefault();
    if (!pendingChoice || !selectedProfileId) return;
    setError(null);
    setSubmitting(true);
    try {
      await selectProfile(pendingChoice.preAuthToken, selectedProfileId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to select profile");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        px: 2,
      }}
    >
      <Paper elevation={3} sx={{ p: { xs: 3, sm: 4 }, width: "100%", maxWidth: 360 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          RiptaCRM
        </Typography>

        {pendingChoice ? (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Choose a profile to continue
            </Typography>
            <Box
              component="form"
              onSubmit={handleSelectProfile}
              sx={{ display: "flex", flexDirection: "column", gap: 2 }}
            >
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                select
                label="Profile"
                value={selectedProfileId}
                onChange={(e) => setSelectedProfileId(e.target.value)}
                fullWidth
              >
                {pendingChoice.profiles.map((profile) => (
                  <MenuItem key={profile.id} value={profile.id}>
                    {profile.name}
                  </MenuItem>
                ))}
              </TextField>
              <Button type="submit" variant="contained" size="large" disabled={submitting || !selectedProfileId}>
                {submitting ? "Continuing..." : "Continue"}
              </Button>
            </Box>
          </>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Sign in to continue
            </Typography>
            <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                fullWidth
              />
              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
              />
              <Button type="submit" variant="contained" size="large" disabled={submitting}>
                {submitting ? "Signing in..." : "Sign in"}
              </Button>
            </Box>
          </>
        )}
      </Paper>
    </Box>
  );
}
