import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem as MuiMenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import type { CustomMenuItem, MenuItemDisplayType } from "@riptacrm/shared-types";
import { createMenuItem, listMenuItems } from "../api/client";

interface MenuItemListProps {
  onSelect: (menuItemId: string) => void;
  authToken?: string | null;
}

export function MenuItemList({ onSelect, authToken }: MenuItemListProps) {
  const [items, setItems] = useState<CustomMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [displayType, setDisplayType] = useState<MenuItemDisplayType>("IFRAME");
  const [iframeUrl, setIframeUrl] = useState("");
  const [remoteEntryUrl, setRemoteEntryUrl] = useState("");
  const [remoteName, setRemoteName] = useState("");
  const [exposedModule, setExposedModule] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    listMenuItems(authToken)
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [authToken]);

  function resetForm() {
    setLabel("");
    setDisplayType("IFRAME");
    setIframeUrl("");
    setRemoteEntryUrl("");
    setRemoteName("");
    setExposedModule("");
  }

  const canCreate =
    label.trim() &&
    (displayType === "IFRAME" ? iframeUrl.trim() : remoteEntryUrl.trim() && remoteName.trim() && exposedModule.trim());

  async function handleCreate() {
    setSaving(true);
    setSaveError(null);
    try {
      const created = await createMenuItem(
        {
          label: label.trim(),
          displayType,
          iframeUrl: displayType === "IFRAME" ? iframeUrl.trim() : undefined,
          remoteEntryUrl: displayType === "MFE" ? remoteEntryUrl.trim() : undefined,
          remoteName: displayType === "MFE" ? remoteName.trim() : undefined,
          exposedModule: displayType === "MFE" ? exposedModule.trim() : undefined,
        },
        authToken,
      );
      setDialogOpen(false);
      resetForm();
      onSelect(created.id);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to create menu item.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h5">Menu Items</Typography>
        <Button variant="contained" onClick={() => setDialogOpen(true)}>
          New Menu Item
        </Button>
      </Box>

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      )}
      {error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && (
        <Paper variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Label</TableCell>
                <TableCell>Type</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} hover sx={{ cursor: "pointer" }} onClick={() => onSelect(item.id)}>
                  <TableCell>{item.label}</TableCell>
                  <TableCell>
                    <Chip size="small" label={item.displayType} />
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2}>
                    <Typography color="text.secondary">No menu items yet.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New Menu Item</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {saveError && <Alert severity="error">{saveError}</Alert>}
            <TextField label="Label" value={label} onChange={(e) => setLabel(e.target.value)} fullWidth />
            <TextField
              select
              label="Type"
              value={displayType}
              onChange={(e) => setDisplayType(e.target.value as MenuItemDisplayType)}
              fullWidth
            >
              <MuiMenuItem value="IFRAME">Embedded webpage (iframe)</MuiMenuItem>
              <MuiMenuItem value="MFE">Module Federation remote</MuiMenuItem>
            </TextField>
            {displayType === "IFRAME" ? (
              <TextField
                label="Page URL"
                value={iframeUrl}
                onChange={(e) => setIframeUrl(e.target.value)}
                placeholder="https://example.com"
                fullWidth
              />
            ) : (
              <>
                <TextField
                  label="Remote entry URL"
                  value={remoteEntryUrl}
                  onChange={(e) => setRemoteEntryUrl(e.target.value)}
                  placeholder="https://example.com/remoteEntry.js"
                  fullWidth
                />
                <TextField
                  label="Remote name"
                  value={remoteName}
                  onChange={(e) => setRemoteName(e.target.value)}
                  helperText="The remote's own declared federation name, not a label of your choosing"
                  fullWidth
                />
                <TextField
                  label="Exposed module"
                  value={exposedModule}
                  onChange={(e) => setExposedModule(e.target.value)}
                  placeholder="./SomeModule"
                  fullWidth
                />
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={!canCreate || saving} onClick={handleCreate}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
