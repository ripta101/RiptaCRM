import type { NavItem } from "./nav";

// Single source of truth for every top-level nav item that exists in the app. A Profile
// grants a subset of these ids; host renders whichever ones the active session's profile
// grants, in this fixed order. Not DB-backed — adding a new module/page is a one-line change
// here, same as today's now-removed navItems.ts arrays were.
export const ALL_NAV_ITEMS: NavItem[] = [
  { id: "home", label: "Home", path: "/", icon: "home" },
  { id: "it-support", label: "IT Support", path: "/it-support", icon: "it-support" },
  { id: "webchat-config", label: "WebChat", path: "/config/webchat", icon: "webchat" },
  { id: "email-config", label: "Email", path: "/config/email", icon: "email" },
  {
    id: "case-management-config",
    label: "Case Management",
    path: "/config/case-management",
    icon: "case-management",
  },
  { id: "broadcast-config", label: "Broadcasts", path: "/config/broadcasts", icon: "broadcast" },
  {
    id: "access-management-config",
    label: "Access Management",
    path: "/config/access-management",
    icon: "access-management",
  },
];

// The one nav item the protected profile can never lose — otherwise an admin could lock
// themselves (and everyone else) out of Access Management entirely.
export const PROTECTED_PROFILE_REQUIRED_NAV_ITEM_ID = "access-management-config";
