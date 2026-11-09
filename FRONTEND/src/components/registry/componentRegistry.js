/**
 * Allow-list of workflow Vue components.
 *
 * Only names registered here may be rendered. Arbitrary JSON component names
 * produce a controlled error, not a dynamic import.
 */
import GenericFormPage from "@/components/workflow/nodes/GenericFormPage.vue";
import BorrowerPersonalInfoPage from "@/components/workflow/nodes/BorrowerPersonalInfoPage.vue";
import BorrowerAddressInfoPage from "@/components/workflow/nodes/BorrowerAddressInfoPage.vue";
import BorrowerKYCUploadPage from "@/components/workflow/nodes/BorrowerKYCUploadPage.vue";
import BorrowerEmploymentInfoPage from "@/components/workflow/nodes/BorrowerEmploymentInfoPage.vue";
import ApplicationApprovedPage from "@/components/workflow/nodes/terminal/ApplicationApprovedPage.vue";
import ApplicationRejectedPage from "@/components/workflow/nodes/terminal/ApplicationRejectedPage.vue";
import ApplicationCancelledPage from "@/components/workflow/nodes/terminal/ApplicationCancelledPage.vue";
import CoborrowerRejectedPage from "@/components/workflow/nodes/terminal/CoborrowerRejectedPage.vue";

function unknownComponent() {
  return {
    name: "UnknownComponent",
    props: ["componentName", "nodeKey"],
    render(h) {
      return h(
        "div",
        { class: "error unknown-component", attrs: { role: "alert", "aria-live": "polite" } },
        [
          h("h3", "Unknown workflow component"),
          h(
            "p",
            `The workflow resolved component "${this.componentName}" for node "${this.nodeKey}", but no matching component is registered.`
          ),
        ]
      );
    },
  };
}

const COMPONENT_REGISTRY = Object.freeze({
  PersonalInfoPage: BorrowerPersonalInfoPage,
  AddressInfoPage: BorrowerAddressInfoPage,
  KYCUploadPage: BorrowerKYCUploadPage,
  VerificationPendingPage: GenericFormPage,
  EmploymentInfoPage: BorrowerEmploymentInfoPage,
  SalaryInfoPage: GenericFormPage,
  BusinessInfoPage: GenericFormPage,
  BankDetailsPage: GenericFormPage,
  BankStatementUploadPage: GenericFormPage,
  DocumentUploadPage: GenericFormPage,
  LoanConsentPage: GenericFormPage,

  CoborrowerPersonalInfoPage: BorrowerPersonalInfoPage,
  CoborrowerAddressInfoPage: BorrowerAddressInfoPage,
  CoborrowerKYCUploadPage: BorrowerKYCUploadPage,
  CoborrowerEmploymentInfoPage: BorrowerEmploymentInfoPage,
  CoborrowerSalaryInfoPage: GenericFormPage,
  CoborrowerBusinessInfoPage: GenericFormPage,
  CoborrowerBankDetailsPage: GenericFormPage,

  LoanAmountPage: GenericFormPage,
  LoanOfferPage: GenericFormPage,
  ESignPage: GenericFormPage,
  MandateSetupPage: GenericFormPage,
  DisbursementFailedPage: GenericFormPage,

  ManagerCreditExceptionPage: GenericFormPage,
  ManagerFraudReviewPage: GenericFormPage,
  ManagerDocumentReviewPage: GenericFormPage,
  ManagerRiskReviewPage: GenericFormPage,
  ManagerEligibilityReviewPage: GenericFormPage,
  FraudCheckPendingPage: GenericFormPage,
  ManagerApprovalPage: GenericFormPage,
  ManagerDisbursementReviewPage: GenericFormPage,

  ApplicationApprovedPage,
  ApplicationRejectedPage,
  ApplicationCancelledPage,
  CoborrowerRejectedPage,
});

export function isRegistered(name) {
  return Object.prototype.hasOwnProperty.call(COMPONENT_REGISTRY, name);
}

export function getComponent(name) {
  return isRegistered(name) ? COMPONENT_REGISTRY[name] : null;
}

export function resolveComponent(name) {
  return getComponent(name) || unknownComponent();
}

export function registeredNames() {
  return Object.keys(COMPONENT_REGISTRY);
}
