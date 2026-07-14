import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type { InteractionsState, InteractionTab } from "@riptacrm/shared-types";

type Action =
  | { type: "OPEN_TAB"; tab: InteractionTab }
  | { type: "CLOSE_TAB"; id: string }
  | { type: "SET_ACTIVE_TAB"; id: string | null }
  | { type: "RENAME_TAB"; id: string; title: string };

const initialState: InteractionsState = { tabs: [], activeTabId: null };

function reducer(state: InteractionsState, action: Action): InteractionsState {
  switch (action.type) {
    case "OPEN_TAB": {
      const existing = state.tabs.find((tab) => tab.id === action.tab.id);
      if (existing) {
        return { ...state, activeTabId: existing.id };
      }
      return { tabs: [...state.tabs, action.tab], activeTabId: action.tab.id };
    }
    case "CLOSE_TAB": {
      const closingIndex = state.tabs.findIndex((tab) => tab.id === action.id);
      if (closingIndex === -1) return state;

      const tabs = state.tabs.filter((tab) => tab.id !== action.id);

      if (state.activeTabId !== action.id) {
        return { tabs, activeTabId: state.activeTabId };
      }

      const fallback = tabs[closingIndex] ?? tabs[closingIndex - 1] ?? null;
      return { tabs, activeTabId: fallback ? fallback.id : null };
    }
    case "SET_ACTIVE_TAB":
      return { ...state, activeTabId: action.id };
    case "RENAME_TAB":
      return {
        ...state,
        tabs: state.tabs.map((tab) => (tab.id === action.id ? { ...tab, title: action.title } : tab)),
      };
    default:
      return state;
  }
}

interface InteractionsContextValue extends InteractionsState {
  openInteraction: (tab: InteractionTab) => void;
  closeInteraction: (id: string) => void;
  setActiveTab: (id: string | null) => void;
  renameTab: (id: string, title: string) => void;
}

const InteractionsContext = createContext<InteractionsContextValue | undefined>(undefined);

export function InteractionsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const openInteraction = useCallback((tab: InteractionTab) => {
    dispatch({ type: "OPEN_TAB", tab });
  }, []);

  const closeInteraction = useCallback((id: string) => {
    dispatch({ type: "CLOSE_TAB", id });
  }, []);

  const setActiveTab = useCallback((id: string | null) => {
    dispatch({ type: "SET_ACTIVE_TAB", id });
  }, []);

  const renameTab = useCallback((id: string, title: string) => {
    dispatch({ type: "RENAME_TAB", id, title });
  }, []);

  const value = useMemo<InteractionsContextValue>(
    () => ({ ...state, openInteraction, closeInteraction, setActiveTab, renameTab }),
    [state, openInteraction, closeInteraction, setActiveTab, renameTab],
  );

  return <InteractionsContext.Provider value={value}>{children}</InteractionsContext.Provider>;
}

export function useInteractions(): InteractionsContextValue {
  const ctx = useContext(InteractionsContext);
  if (!ctx) {
    throw new Error("useInteractions must be used within an InteractionsProvider");
  }
  return ctx;
}
