declare module "customer/CustomerLookupModule" {
  import type { ComponentType } from "react";
  import type { CustomerSummary } from "@riptacrm/shared-types";

  export interface CustomerLookupModuleProps {
    onCustomerIdentified?: (customer: CustomerSummary) => void;
    closeRequested?: boolean;
    onInteractionEnded?: () => void;
    currentUserId?: string | null;
    authToken?: string | null;
    grantedFeatureIds?: string[];
  }

  const CustomerLookupModule: ComponentType<CustomerLookupModuleProps>;
  export default CustomerLookupModule;
}

declare module "caseManagement/CaseManagementModule" {
  import type { ComponentType } from "react";

  export interface CaseManagementModuleProps {
    authToken?: string | null;
  }

  const CaseManagementModule: ComponentType<CaseManagementModuleProps>;
  export default CaseManagementModule;
}

declare module "messageBroadcast/MessageBroadcastModule" {
  import type { ComponentType } from "react";

  export interface MessageBroadcastModuleProps {
    authToken?: string | null;
  }

  const MessageBroadcastModule: ComponentType<MessageBroadcastModuleProps>;
  export default MessageBroadcastModule;
}

declare module "accessManagement/AccessManagementModule" {
  import type { ComponentType } from "react";

  export interface AccessManagementModuleProps {
    authToken?: string | null;
  }

  const AccessManagementModule: ComponentType<AccessManagementModuleProps>;
  export default AccessManagementModule;
}
