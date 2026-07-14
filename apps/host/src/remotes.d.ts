declare module "customer/CustomerLookupModule" {
  import type { ComponentType } from "react";
  import type { CustomerSummary } from "@riptacrm/shared-types";

  export interface CustomerLookupModuleProps {
    onCustomerIdentified?: (customer: CustomerSummary) => void;
  }

  const CustomerLookupModule: ComponentType<CustomerLookupModuleProps>;
  export default CustomerLookupModule;
}
