import { useState } from "react";
import { Box } from "@mui/material";
import { BroadcastList } from "./components/BroadcastList";
import { BroadcastComposer } from "./components/BroadcastComposer";

type View = { type: "list" } | { type: "composer"; broadcastId: string | null };

interface MessageBroadcastModuleProps {
  authToken?: string | null;
}

export default function MessageBroadcastModule({ authToken }: MessageBroadcastModuleProps) {
  const [view, setView] = useState<View>({ type: "list" });

  return (
    <Box>
      {view.type === "list" && (
        <BroadcastList
          authToken={authToken}
          onSelect={(id) => setView({ type: "composer", broadcastId: id })}
          onNew={() => setView({ type: "composer", broadcastId: null })}
        />
      )}
      {view.type === "composer" && (
        <BroadcastComposer
          authToken={authToken}
          broadcastId={view.broadcastId}
          onDone={() => setView({ type: "list" })}
        />
      )}
    </Box>
  );
}
