import type { NavItem } from "@riptacrm/shared-types";

export const frontlineNavItems: NavItem[] = [
  { id: "home", label: "Home", path: "/", icon: "home" },
  { id: "it-support", label: "IT Support", path: "/it-support", icon: "it-support" },
];

export const adminNavItems: NavItem[] = [
  { id: "home", label: "Home", path: "/", icon: "home" },
  { id: "webchat-config", label: "WebChat", path: "/config/webchat", icon: "webchat" },
  { id: "email-config", label: "Email", path: "/config/email", icon: "email" },
  { id: "case-management-config", label: "Case Management", path: "/config/case-management", icon: "case-management" },
  { id: "broadcast-config", label: "Broadcasts", path: "/config/broadcasts", icon: "broadcast" },
];
