/**
 * Progress display derived only from the backend resolution.
 *
 * The frontend does not walk JSON edges to guess completed steps. Until the
 * API returns a verified step list, only the current authorized node is shown.
 */
const NODE_LABELS = Object.freeze({
  "PERSONAL-INFO": "Personal information",
  "ADDRESS-INFO": "Address",
  "KYC-UPLOAD": "Identity documents",
  "FACE-VERIFICATION": "Face verification",
  "AADHAR-VERIFICATION": "Aadhaar verification",
  "PAN-VERIFICATION": "PAN verification",
  "VERIFICATION": "Verification",
  "EMPLOYMENT-INFO": "Employment",
  "SALARY-INFO": "Salary",
  "BUSINESS-INFO": "Business",
  "BANK-DETAILS": "Bank details",
  "BANK-STATEMENT-UPLOAD": "Bank statement",
  "DOCUMENT-UPLOAD": "Documents",
  "LOAN-CONSENT": "Consent",
  "LOAN-AMOUNT": "Loan amount",
  "LOAN-OFFER": "Loan offer",
  "ESIGN": "E-sign",
  "MANDATE-SETUP": "Mandate",
  "DISBURSEMENT": "Disbursement",
  "APPROVED": "Approved",
  "REJECTED": "Not approved",
  "CANCELLED": "Cancelled",
});

function humanize(value) {
  if (!value) return "Current step";
  return String(value)
    .replace(/-V\d+$/g, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function stepsFromResolution(resolution) {
  if (!resolution || !resolution.node) return [];

  const view = resolution.componentView || {};
  const nodeName = view.componentKey || view.node || resolution.node;
  const shortKey = String(nodeName).replace(/-V\d+$/g, "");
  const label = NODE_LABELS[shortKey] || humanize(shortKey);

  let status = "current";
  if (resolution.status === "NOT_YOUR_TURN") status = "blocked";
  if (resolution.status === "WORKFLOW_COMPLETED" || resolution.applicationStatus === "APPROVED") {
    status = "completed";
  }
  if (resolution.applicationStatus === "REJECTED" || resolution.applicationStatus === "CANCELLED") {
    status = "blocked";
  }

  return [
    {
      key: resolution.node,
      label,
      module: view.module || null,
      status,
    },
  ];
}
