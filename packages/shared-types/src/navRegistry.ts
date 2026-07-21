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

  // Feature-scoped grants inside the Customer MFE's own interaction workspace — not routes,
  // no path/icon, never rendered by SideMenu. Grantable to Profiles exactly like the items
  // above; the Customer MFE checks these directly rather than routing through NavItemRoute.
  { id: "customer-search", label: "Search Customer" },
  { id: "customer-create", label: "Create Customer" },
  { id: "customer-profile", label: "Customer Profile" },
  { id: "customer-amend", label: "Amend Customer" },
  { id: "customer-lodge-case", label: "Lodge a Case" },
];

// The one nav item the protected profile can never lose — otherwise an admin could lock
// themselves (and everyone else) out of Access Management entirely.
export const PROTECTED_PROFILE_REQUIRED_NAV_ITEM_ID = "access-management-config";

// Backend-checked customer-feature ids, referenced by both customer-api's route middleware
// and the Customer MFE's UI checks, so the two never drift into duplicated string literals.
export const CUSTOMER_SEARCH_FEATURE_ID = "customer-search";
export const CUSTOMER_CREATE_FEATURE_ID = "customer-create";
export const CUSTOMER_PROFILE_FEATURE_ID = "customer-profile";
export const CUSTOMER_AMEND_FEATURE_ID = "customer-amend";
export const CUSTOMER_LODGE_CASE_FEATURE_ID = "customer-lodge-case";
