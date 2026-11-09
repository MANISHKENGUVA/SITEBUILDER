/**
 * Field schemas for registered workflow components.
 *
 * These describe UI fields only. Eligibility thresholds and transitions stay
 * on the backend. Event type is a client label; the server keys off nodeKey.
 */
const MANAGER_DECISION = {
  title: "Review decision",
  description: "Record the authorised decision for this review step.",
  fields: [
    {
      name: "decision",
      label: "Decision",
      type: "select",
      required: true,
      options: [
        { value: "APPROVED", label: "Approved" },
        { value: "REJECTED", label: "Rejected" },
        { value: "CLEAR", label: "Clear" },
      ],
    },
    { name: "remarks", label: "Remarks", type: "textarea" },
  ],
};

export const FORM_SCHEMAS = Object.freeze({
  SalaryInfoPage: {
    title: "Salary information",
    description: "Provide your current monthly income as recorded by your employer.",
    fields: [
      { name: "monthlyIncome", label: "Monthly income (INR)", type: "number", required: true, min: 0 },
      { name: "employerVerified", label: "I confirm this income is from my current employer", type: "checkbox", required: true },
    ],
  },
  BusinessInfoPage: {
    title: "Business information",
    description: "Tell us about the registered business this application relates to.",
    fields: [
      { name: "registrationVerified", label: "Business registration has been verified", type: "checkbox", required: true },
      { name: "annualRevenue", label: "Annual revenue (INR)", type: "number", required: true, min: 0 },
    ],
  },
  BankDetailsPage: {
    title: "Bank details",
    description: "Provide the account that will be used for disbursement.",
    fields: [
      { name: "holderName", label: "Account holder name", type: "text", required: true, max: 160 },
      { name: "accountNumber", label: "Account number", type: "text", required: true, pattern: "^[0-9]{9,18}$", hint: "9 to 18 digits" },
      { name: "ifsc", label: "IFSC", type: "text", required: true, max: 11 },
      { name: "bankName", label: "Bank name", type: "text" },
      { name: "branch", label: "Branch", type: "text" },
      { name: "consentGiven", label: "I authorise use of this account", type: "checkbox" },
      { name: "accountVerified", label: "I confirm these details are correct", type: "checkbox" },
    ],
  },
  BankStatementUploadPage: {
    title: "Bank statement",
    description: "Provide a file reference for the uploaded statement.",
    fields: [
      { name: "fileUrl", label: "Statement file reference", type: "text", required: true, hint: "local-upload://filename or https URL" },
    ],
  },
  DocumentUploadPage: {
    title: "Supporting documents",
    description: "Optional extra documents. Leave empty to continue without extras.",
    fields: [],
    extraDocuments: true,
  },
  LoanConsentPage: {
    title: "Loan consent",
    description: "Please confirm you understand and accept the application terms.",
    fields: [
      { name: "consentGiven", label: "I consent to this loan application proceeding", type: "checkbox", required: true },
    ],
  },
  LoanAmountPage: {
    title: "Requested amount",
    description: "Enter the amount to offer or request.",
    fields: [
      { name: "amount", label: "Amount (INR)", type: "number", required: true, min: 1 },
    ],
  },
  LoanOfferPage: {
    title: "Loan offer",
    description: "Accept or decline the prepared offer.",
    fields: [
      { name: "accepted", label: "I accept this offer", type: "checkbox", required: true },
    ],
  },
  ESignPage: {
    title: "Electronic signature",
    description: "Record the e-sign outcome returned by the signing service.",
    fields: [
      {
        name: "status",
        label: "E-sign status",
        type: "select",
        required: true,
        options: [
          { value: "SIGNED", label: "Signed" },
          { value: "FAILED", label: "Failed" },
        ],
      },
    ],
  },
  MandateSetupPage: {
    title: "Mandate setup",
    description: "Record the auto-debit mandate outcome.",
    fields: [
      {
        name: "status",
        label: "Mandate status",
        type: "select",
        required: true,
        options: [{ value: "ACTIVE", label: "Active" }],
      },
    ],
  },
  DisbursementFailedPage: {
    title: "Disbursement failed",
    description: "Choose whether a retry is allowed.",
    fields: [
      { name: "retry", label: "Allow a retry", type: "checkbox", required: true },
    ],
  },
  VerificationPendingPage: {
    title: "Verification pending",
    description: "This step waits for a verification outcome. Continue if you are authorised to record it.",
    fields: [],
  },
  FraudCheckPendingPage: {
    title: "Fraud check",
    description: "Record the fraud-check decision.",
    fields: [
      {
        name: "decision",
        label: "Decision",
        type: "select",
        required: true,
        options: [
          { value: "CLEAR", label: "Clear" },
          { value: "FLAGGED", label: "Flagged" },
        ],
      },
      { name: "remarks", label: "Remarks", type: "textarea" },
    ],
  },
  CoborrowerSalaryInfoPage: {
    title: "Salary information",
    description: "Provide the co-borrower's current monthly income.",
    fields: [
      { name: "monthlyIncome", label: "Monthly income (INR)", type: "number", required: true, min: 0 },
      { name: "employerVerified", label: "I confirm this income is from the current employer", type: "checkbox", required: true },
    ],
  },
  CoborrowerBusinessInfoPage: {
    title: "Business information",
    description: "Tell us about the co-borrower's registered business.",
    fields: [
      { name: "registrationVerified", label: "Business registration has been verified", type: "checkbox", required: true },
      { name: "annualRevenue", label: "Annual revenue (INR)", type: "number", required: true, min: 0 },
    ],
  },
  CoborrowerBankDetailsPage: {
    title: "Bank details",
    description: "Provide the co-borrower's bank account.",
    fields: [
      { name: "holderName", label: "Account holder name", type: "text", required: true, max: 160 },
      { name: "accountNumber", label: "Account number", type: "text", required: true, pattern: "^[0-9]{9,18}$" },
      { name: "ifsc", label: "IFSC", type: "text", required: true, max: 11 },
      { name: "consentGiven", label: "I authorise use of this account", type: "checkbox", required: true },
      { name: "accountVerified", label: "I confirm these details are correct", type: "checkbox", required: true },
    ],
  },
  ManagerCreditExceptionPage: MANAGER_DECISION,
  ManagerFraudReviewPage: MANAGER_DECISION,
  ManagerDocumentReviewPage: MANAGER_DECISION,
  ManagerRiskReviewPage: MANAGER_DECISION,
  ManagerEligibilityReviewPage: MANAGER_DECISION,
  ManagerApprovalPage: MANAGER_DECISION,
  ManagerDisbursementReviewPage: MANAGER_DECISION,
});

export function schemaFor(componentName) {
  return (
    FORM_SCHEMAS[componentName] || {
      title: "Application step",
      description: "Complete the required information for this step.",
      fields: [],
    }
  );
}
