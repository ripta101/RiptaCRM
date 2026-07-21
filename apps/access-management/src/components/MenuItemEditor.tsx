import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem as MuiMenuItem,
  Paper,
  Stack,
  TextField,
} from "@mui/material";
import type { CustomMenuItem, MenuItemDisplayType } from "@riptacrm/shared-types";
import { deleteMenuItem, getMenuItem, updateMenuItem } from "../api/client";

interface MenuItemEditorProps {
  menuItemId: string;
  onBack: () => void;
}

export function MenuItemEditor({ menuItemId, onBack }: MenuItemEditorProps) {
  const [item, setItem] = useState<CustomMenuItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [label, setLabel] = useState("");
  const [displayType, setDisplayType] = useState<MenuItemDisplayType>("IFRAME");
  const [iframeUrl, setIframeUrl] = useState("");
  const [remoteEntryUrl, setRemoteEntryUrl] = useState("");
  const [remoteName, setRemoteName] = useState("");
  const [exposedModule, setExposedModule] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getMenuItem(menuItemId)
      .then((i) => {
        setItem(i);
        setLabel(i.label);
        setDisplayType(i.displayType);
        setIframeUrl(i.iframeUrl ?? "");
        setRemoteEntryUrl(i.remoteEntryUrl ?? "");
        setRemoteName(i.remoteName ?? "");
        setExposedModule(i.exposedModule ?? "");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load menu item."))
      .finally(() => setLoading(false));
  }, [menuItemId]);

  const canSave =
    label.trim() &&
    (displayType === "IFRAME" ? iframeUrl.trim() : remoteEntryUrl.trim() && remoteName.trim() && exposedModule.trim());

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateMenuItem(menuItemId, {
        label: label.trim(),
        displayType,
        iframeUrl: displayType === "IFRAME" ? iframeUrl.trim() : undefined,
        remoteEntryUrl: displayType === "MFE" ? remoteEntryUrl.trim() : undefined,
        remoteName: displayType === "MFE" ? remoteName.trim() : undefined,
        exposedModule: displayType === "MFE" ? exposedModule.trim() : undefined,
      });
      setItem(updated);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save menu item.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleteError(null);
    try {
      await deleteMenuItem(menuItemId);
      onBack();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete menu item.");
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !item) {
    return <Alert severity="error">{error ?? "Menu item not found."}</Alert>;
  }

  return (
    <Box>
      <Button onClick={onBack} sx={{ mb: 2 }}>
        Back to Menu Items
      </Button>

      {saveError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {saveError}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Stack spacing={2} sx={{ maxWidth: 480 }}>
          <TextField label="Label" value={label} onChange={(e) => setLabel(e.target.value)} size="small" />
          <TextField
            select
            label="Type"
            value={displayType}
            onChange={(e) => setDisplayType(e.target.value as MenuItemDisplayType)}
            size="small"
          >
            <MuiMenuItem value="IFRAME">Embedded webpage (iframe)</MuiMenuItem>
            <MuiMenuItem value="MFE">Module Federation remote</MuiMenuItem>
          </TextField>
          {displayType === "IFRAME" ? (
            <TextField
              label="Page URL"
              value={iframeUrl}
              onChange={(e) => setIframeUrl(e.target.value)}
              size="small"
            />
          ) : (
            <>
              <TextField
                label="Remote entry URL"
                value={remoteEntryUrl}
                onChange={(e) => setRemoteEntryUrl(e.target.value)}
                size="small"
              />
              <TextField
                label="Remote name"
                value={remoteName}
                onChange={(e) => setRemoteName(e.target.value)}
                helperText="The remote's own declared federation name, not a label of your choosing"
                size="small"
              />
              <TextField
                label="Exposed module"
                value={exposedModule}
                onChange={(e) => setExposedModule(e.target.value)}
                size="small"
              />
            </>
          )}
          <Box>
            <Button variant="contained" disabled={!canSave || saving} onClick={handleSave}>
              Save
            </Button>
          </Box>
        </Stack>
      </Paper>

      {deleteError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {deleteError}
        </Alert>
      )}
      <Button color="error" onClick={handleDelete}>
        Delete
      </Button>
    </Box>
  );
}
