declare module "customer/CustomerLookupModule" {
  import type { ComponentType } from "react";
  import type { CustomerSummary } from "@riptacrm/shared-types";

  export interface CustomerLookupModuleProps {
    onCustomerIdentified?: (customer: CustomerSummary) => void;
    closeRequested?: boolean;
    onInteractionEnded?: () => void;
  }

  const CustomerLookupModule: ComponentType<CustomerLookupModuleProps>;
  export default CustomerLookupModule;
}

declare module "caseManagement/CaseManagementModule" {
  import type { ComponentType } from "react";

  const CaseManagementModule: ComponentType;
  export default CaseManagementModule;
}

declare module "messageBroadcast/MessageBroadcastModule" {
  import type { ComponentType } from "react";

  const MessageBroadcastModule: ComponentType;
  export default MessageBroadcastModule;
}
