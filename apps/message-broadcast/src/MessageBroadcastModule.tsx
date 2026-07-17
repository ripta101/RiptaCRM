import { useState } from "react";
import { Box } from "@mui/material";
import { BroadcastList } from "./components/BroadcastList";
import { BroadcastComposer } from "./components/BroadcastComposer";

type View = { type: "list" } | { type: "composer"; broadcastId: string | null };

export default function MessageBroadcastModule() {
  const [view, setView] = useState<View>({ type: "list" });

  return (
    <Box>
      {view.type === "list" && (
        <BroadcastList
          onSelect={(id) => setView({ type: "composer", broadcastId: id })}
          onNew={() => setView({ type: "composer", broadcastId: null })}
        />
      )}
      {view.type === "composer" && (
        <BroadcastComposer broadcastId={view.broadcastId} onDone={() => setView({ type: "list" })} />
      )}
    </Box>
  );
}
