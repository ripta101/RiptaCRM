export interface NavItem {
  id: string;
  label: string;
  // Absent for feature-scoped grants that aren't top-level routes (e.g. the Customer MFE's
  // internal Search/Profile/Amend/Lodge-a-Case features) — SideMenu never renders these.
  path?: string;
  icon?: string;
}
