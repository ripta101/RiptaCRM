import { useCallback, useEffect, useState } from "react";
import {
  Background,
  Controls,
  MarkerType,
  Position,
  ReactFlow,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type OnNodeDrag,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Alert, Box, Typography } from "@mui/material";
import type { StageDefinition } from "@riptacrm/shared-types";
import { createStageTransition, deleteStage, deleteStageTransition, updateStage } from "../api/client";

const DEFAULT_NODE_STYLE = {
  border: "1px solid #1F4E79",
  borderRadius: 8,
  padding: 8,
  background: "#fff",
  fontSize: 13,
};

const TERMINAL_NODE_STYLE = {
  ...DEFAULT_NODE_STYLE,
  border: "1px solid #9e9e9e",
  background: "#f0f0f0",
  color: "#616161",
};

function toNodes(stages: StageDefinition[]): Node[] {
  return stages.map((s) => ({
    id: s.id,
    position: { x: s.positionX, y: s.positionY },
    data: { label: s.name },
    style: s.isTerminal ? TERMINAL_NODE_STYLE : DEFAULT_NODE_STYLE,
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  }));
}

function toEdges(stages: StageDefinition[]): Edge[] {
  return stages.flatMap((s) =>
    s.allowedNextStages.map((t) => ({
      id: t.id,
      source: s.id,
      target: t.toStageId,
      markerEnd: { type: MarkerType.ArrowClosed },
    })),
  );
}

interface StageFlowEditorProps {
  stages: StageDefinition[];
  editable: boolean;
  onChanged: () => void;
  onPositionChanged: (stageId: string, positionX: number, positionY: number) => void;
  authToken?: string | null;
}

export function StageFlowEditor({
  stages,
  editable,
  onChanged,
  onPositionChanged,
  authToken,
}: StageFlowEditorProps) {
  const [error, setError] = useState<string | null>(null);
  // React Flow needs to own node/edge selection, dragging-in-progress, etc. via its normal
  // onNodesChange/onEdgesChange delta API — passing `stages`-derived nodes/edges straight
  // through as fully-controlled props (recomputed fresh every render) fights with that
  // internal state and silently discards selection, which breaks click-then-Delete. Local
  // state is re-seeded from `stages` only when the server data actually changes.
  const [nodes, setNodes] = useState<Node[]>(() => toNodes(stages));
  const [edges, setEdges] = useState<Edge[]>(() => toEdges(stages));

  useEffect(() => {
    setNodes(toNodes(stages));
    setEdges(toEdges(stages));
  }, [stages]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );

  const handleNodeDragStop: OnNodeDrag<Node> = async (_event, node) => {
    // Deliberately no onChanged() here: that triggers a full server refetch, which
    // CaseTypeEditor renders as a page-wide spinner — a jarring blink for no benefit, since
    // React Flow's own onNodesChange already reflects the dragged position locally. Instead,
    // patch the position into the shared `stages` state directly (no network round-trip) so
    // sibling views (the stage list, sorted by position) stay in sync too.
    const positionX = Math.round(node.position.x);
    const positionY = Math.round(node.position.y);
    try {
      await updateStage(node.id, { positionX, positionY }, authToken);
      onPositionChanged(node.id, positionX, positionY);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save stage position.");
    }
  };

  async function handleConnect(connection: Connection) {
    if (!connection.source || !connection.target) return;
    try {
      await createStageTransition(connection.source, { toStageId: connection.target }, authToken);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create transition.");
    }
  }

  async function handleEdgesDelete(deleted: Edge[]) {
    try {
      await Promise.all(deleted.map((e) => deleteStageTransition(e.id, authToken)));
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete transition.");
      onChanged(); // resync — the edge wasn't actually deleted server-side
    }
  }

  async function handleNodesDelete(deleted: Node[]) {
    try {
      await Promise.all(deleted.map((n) => deleteStage(n.id, authToken)));
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete stage.");
      onChanged(); // resync — the stage wasn't actually deleted server-side
    }
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
        {editable
          ? "Drag a stage's handle to another stage to allow that transition. Select a stage or transition and press Delete to remove it."
          : "Read-only — create a draft version to edit transitions."}
      </Typography>
      <Box sx={{ height: 420, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={editable ? onNodesChange : undefined}
          onEdgesChange={editable ? onEdgesChange : undefined}
          onNodeDragStop={editable ? handleNodeDragStop : undefined}
          onConnect={editable ? handleConnect : undefined}
          onNodesDelete={editable ? handleNodesDelete : undefined}
          onEdgesDelete={editable ? handleEdgesDelete : undefined}
          nodesDraggable={editable}
          nodesConnectable={editable}
          elementsSelectable={editable}
          deleteKeyCode={editable ? ["Backspace", "Delete"] : null}
          fitView
        >
          <Background />
          <Controls showInteractive={false} />
        </ReactFlow>
      </Box>
    </Box>
  );
}
