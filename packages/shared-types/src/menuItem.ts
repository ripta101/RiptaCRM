export type MenuItemDisplayType = "IFRAME" | "MFE";

export interface CustomMenuItem {
  id: string;
  label: string;
  displayType: MenuItemDisplayType;
  iframeUrl: string | null;
  remoteEntryUrl: string | null;
  remoteName: string | null;
  exposedModule: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMenuItemInput {
  label: string;
  displayType: MenuItemDisplayType;
  iframeUrl?: string;
  remoteEntryUrl?: string;
  remoteName?: string;
  exposedModule?: string;
}

export type UpdateMenuItemInput = Partial<CreateMenuItemInput>;
