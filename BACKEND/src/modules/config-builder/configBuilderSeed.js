const path = require("path");
const fs = require("fs");
const { query } = require("../../db/pool");
const { validateWorkflow } = require("./configBuilderValidation");

const DEFAULT_ACTORS = [
  { id: "BORROWER", name: "Borrower", description: "Primary loan applicant", is_system: false },
  { id: "COBORROWER", name: "Co-Borrower", description: "Secondary joint applicant", is_system: false },
  { id: "LENDER", name: "Lender / Underwriting", description: "Financial institution agent", is_system: false },
  { id: "MANAGER", name: "Risk Manager", description: "Supervisory risk and fraud reviewer", is_system: false },
  { id: "SYSTEM", name: "Automated System", description: "Deterministic engine background jobs", is_system: true },
  { id: "UNDERWRITER", name: "Credit Underwriter", description: "Credit policy assessment specialist", is_system: false },
  { id: "ADMIN", name: "Administrator", description: "Platform administrator", is_system: false },
];

const DEFAULT_MODULES = [
  { id: "DETAILS", name: "Personal Details", default_version: "V1", versions: ["V1", "V2"] },
  { id: "ADDRESS", name: "Address Information", default_version: "V1", versions: ["V1"] },
  { id: "KYC", name: "Identity & KYC", default_version: "V1", versions: ["V1", "V2"] },
  { id: "EMPLOYMENT", name: "Employment Information", default_version: "V1", versions: ["V1"] },
  { id: "SALARY", name: "Salary Details", default_version: "V1", versions: ["V1"] },
  { id: "BUSINESS", name: "Business Details", default_version: "V1", versions: ["V1"] },
  { id: "BANK", name: "Banking Details", default_version: "V1", versions: ["V1"] },
  { id: "DOCUMENT", name: "Document Management", default_version: "V1", versions: ["V1"] },
  { id: "CONSENT", name: "Legal Consents", default_version: "V1", versions: ["V1"] },
  { id: "OFFER", name: "Loan Offers", default_version: "V1", versions: ["V1"] },
  { id: "AGREEMENT", name: "Loan Agreements", default_version: "V1", versions: ["V1"] },
  { id: "MANDATE", name: "Payment Mandate", default_version: "V1", versions: ["V1"] },
  { id: "DISBURSEMENT", name: "Disbursement", default_version: "V1", versions: ["V1"] },
  { id: "REVIEW", name: "Manual Review", default_version: "V1", versions: ["V1"] },
  { id: "FRAUD-CHECK", name: "Fraud Screening", default_version: "V1", versions: ["V1"] },
  { id: "APPROVAL", name: "Final Approval", default_version: "V1", versions: ["V1"] },
  { id: "STATUS", name: "Application Status", default_version: "V1", versions: ["V1"] },
];

const TEMPLATES = [
  {
    id: "TPL-LOAN-APP",
    name: "Standard Loan Origination Workflow",
    description: "End-to-end multi-party loan origination with borrower KYC, bureau checks, underwriting, and disbursement.",
    category: "LENDING",
    definition: {
      workflowVersion: "LOAN-FLOW-V7",
      startState: "BORROWER-DETAILS-V1-PERSONAL-INFO-V1",
      states: {
        "BORROWER-DETAILS-V1-PERSONAL-INFO-V1": {
          type: "ACTOR",
          component: "PersonalInfoPage",
          access: { type: "PUBLIC" },
          metadata: {
            actor: "BORROWER",
            module: "DETAILS",
            moduleVersion: "V1",
            node: "PERSONAL-INFO",
            nodeVersion: "V1",
          },
          edges: {
            ED00: {
              toState: "BORROWER-STATUS-V1-REJECTED-V1",
              ruleEngine: {
                operator: "AND",
                conditions: [{ field: "PERSONALDETAILS.isMinor", operator: "=", value: true }],
              },
            },
            ED01: {
              toState: "BORROWER-ADDRESS-V1-ADDRESS-INFO-V1",
              ruleEngine: {
                operator: "AND",
                conditions: [{ field: "PERSONALDETAILS.isMinor", operator: "=", value: false }],
              },
            },
          },
        },
        "BORROWER-ADDRESS-V1-ADDRESS-INFO-V1": {
          type: "ACTOR",
          component: "AddressInfoPage",
          access: { type: "PUBLIC" },
          metadata: {
            actor: "BORROWER",
            module: "ADDRESS",
            moduleVersion: "V1",
            node: "ADDRESS-INFO",
            nodeVersion: "V1",
          },
          edges: {
            ED02: {
              toState: "BORROWER-KYC-V1-KYC-UPLOAD-V1",
              ruleEngine: {
                operator: "AND",
                conditions: [{ field: "ADDRESS.current.isValid", operator: "=", value: true }],
              },
            },
          },
        },
        "BORROWER-KYC-V1-KYC-UPLOAD-V1": {
          type: "ACTOR",
          component: "KYCUploadPage",
          access: { type: "PUBLIC", captcha: { required: true } },
          metadata: {
            actor: "BORROWER",
            module: "KYC",
            moduleVersion: "V1",
            node: "KYC-UPLOAD",
            nodeVersion: "V1",
          },
          edges: {
            ED03: {
              toState: "BORROWER-EMPLOYMENT-V1-EMPLOYMENT-INFO-V1",
              ruleEngine: {
                operator: "AND",
                conditions: [{ field: "KYC.documentsUploaded", operator: "=", value: true }],
              },
            },
          },
        },
        "BORROWER-EMPLOYMENT-V1-EMPLOYMENT-INFO-V1": {
          type: "ACTOR",
          component: "EmploymentInfoPage",
          access: { type: "PUBLIC" },
          metadata: {
            actor: "BORROWER",
            module: "EMPLOYMENT",
            moduleVersion: "V1",
            node: "EMPLOYMENT-INFO",
            nodeVersion: "V1",
          },
          edges: {
            ED04: {
              toState: "LENDER-OFFER-V1-LOAN-AMOUNT-V1",
              ruleEngine: {
                operator: "AND",
                conditions: [{ field: "EMPLOYMENT.verified", operator: "=", value: true }],
              },
            },
          },
        },
        "LENDER-OFFER-V1-LOAN-AMOUNT-V1": {
          type: "ACTOR",
          component: "LoanAmountPage",
          access: { type: "PUBLIC" },
          metadata: {
            actor: "LENDER",
            module: "OFFER",
            moduleVersion: "V1",
            node: "LOAN-AMOUNT",
            nodeVersion: "V1",
          },
          edges: {
            ED05: {
              toState: "LENDER-OFFER-V1-INTEREST-RATE-V1",
              ruleEngine: {
                operator: "AND",
                conditions: [{ field: "OFFER.amountSelected", operator: "=", value: true }],
              },
            },
          },
        },
        "LENDER-OFFER-V1-INTEREST-RATE-V1": {
          type: "SYSTEM_INTERNAL_PROCESS",
          processHandler: "calculateInterestRate",
          metadata: {
            actor: "LENDER",
            module: "OFFER",
            moduleVersion: "V1",
            node: "INTEREST-RATE",
            nodeVersion: "V1",
          },
          edges: {
            ED06: {
              toState: "BORROWER-STATUS-V1-APPROVED-V1",
              ruleEngine: {
                operator: "AND",
                conditions: [{ field: "OFFER.rateCalculated", operator: "=", value: true }],
              },
            },
          },
        },
        "BORROWER-STATUS-V1-APPROVED-V1": {
          type: "ACTOR",
          component: "ApplicationApprovedPage",
          access: { type: "PUBLIC" },
          metadata: {
            actor: "BORROWER",
            module: "STATUS",
            moduleVersion: "V1",
            node: "APPROVED",
            nodeVersion: "V1",
          },
          edges: {},
        },
        "BORROWER-STATUS-V1-REJECTED-V1": {
          type: "ACTOR",
          component: "ApplicationRejectedPage",
          access: { type: "PUBLIC" },
          metadata: {
            actor: "BORROWER",
            module: "STATUS",
            moduleVersion: "V1",
            node: "REJECTED",
            nodeVersion: "V1",
          },
          edges: {},
        },
      },
    },
  },
  {
    id: "TPL-KYC",
    name: "Automated KYC Verification Workflow",
    description: "Identity verification pipeline including document upload, Aadhaar OTP authentication, and automated OCR check.",
    category: "IDENTITY",
    definition: {
      workflowVersion: "KYC-FLOW-V2",
      startState: "BORROWER-KYC-V1-UPLOAD-DOCS-V1",
      states: {
        "BORROWER-KYC-V1-UPLOAD-DOCS-V1": {
          type: "ACTOR",
          component: "KYCUploadPage",
          access: { type: "PUBLIC" },
          metadata: {
            actor: "BORROWER",
            module: "KYC",
            moduleVersion: "V1",
            node: "UPLOAD-DOCS",
            nodeVersion: "V1",
          },
          edges: {
            KYC_E1: {
              toState: "SYSTEM-KYC-V1-OCR-EXTRACTION-V1",
              ruleEngine: {
                operator: "AND",
                conditions: [{ field: "KYC.docsUploaded", operator: "=", value: true }],
              },
            },
          },
        },
        "SYSTEM-KYC-V1-OCR-EXTRACTION-V1": {
          type: "SYSTEM_INTERNAL_PROCESS",
          processHandler: "extractDocumentOCR",
          metadata: {
            actor: "SYSTEM",
            module: "KYC",
            moduleVersion: "V1",
            node: "OCR-EXTRACTION",
            nodeVersion: "V1",
          },
          edges: {
            KYC_E2: {
              toState: "BORROWER-KYC-V1-AADHAAR-OTP-V1",
              ruleEngine: {
                operator: "AND",
                conditions: [{ field: "KYC.ocrConfidence", operator: ">=", value: 85 }],
              },
            },
          },
        },
        "BORROWER-KYC-V1-AADHAAR-OTP-V1": {
          type: "ACTOR",
          component: "GenericFormPage",
          access: { type: "AUTHENTICATED" },
          metadata: {
            actor: "BORROWER",
            module: "KYC",
            moduleVersion: "V1",
            node: "AADHAAR-OTP",
            nodeVersion: "V1",
          },
          edges: {
            KYC_E3: {
              toState: "BORROWER-STATUS-V1-APPROVED-V1",
              ruleEngine: {
                operator: "AND",
                conditions: [{ field: "KYC.otpVerified", operator: "=", value: true }],
              },
            },
          },
        },
        "BORROWER-STATUS-V1-APPROVED-V1": {
          type: "ACTOR",
          component: "ApplicationApprovedPage",
          access: { type: "PUBLIC" },
          metadata: {
            actor: "BORROWER",
            module: "STATUS",
            moduleVersion: "V1",
            node: "APPROVED",
            nodeVersion: "V1",
          },
          edges: {},
        },
      },
    },
  },
  {
    id: "TPL-DOC-VERIF",
    name: "Document Verification & Manual Review",
    description: "Upload customer financial documents with automated integrity check and manager exception routing.",
    category: "OPERATIONS",
    definition: {
      workflowVersion: "DOC-VERIF-V1",
      startState: "BORROWER-DOCUMENT-V1-DOC-SUBMIT-V1",
      states: {
        "BORROWER-DOCUMENT-V1-DOC-SUBMIT-V1": {
          type: "ACTOR",
          component: "GenericFormPage",
          access: { type: "PUBLIC" },
          metadata: {
            actor: "BORROWER",
            module: "DOCUMENT",
            moduleVersion: "V1",
            node: "DOC-SUBMIT",
            nodeVersion: "V1",
          },
          edges: {
            DOC_E1: {
              toState: "MANAGER-REVIEW-V1-DOC-AUDIT-V1",
              ruleEngine: {
                operator: "AND",
                conditions: [{ field: "DOCUMENT.submitted", operator: "=", value: true }],
              },
            },
          },
        },
        "MANAGER-REVIEW-V1-DOC-AUDIT-V1": {
          type: "ACTOR",
          component: "ManagerDocumentReviewPage",
          access: { type: "AUTHENTICATED" },
          metadata: {
            actor: "MANAGER",
            module: "REVIEW",
            moduleVersion: "V1",
            node: "DOC-AUDIT",
            nodeVersion: "V1",
          },
          edges: {
            DOC_E2: {
              toState: "BORROWER-STATUS-V1-APPROVED-V1",
              ruleEngine: {
                operator: "AND",
                conditions: [{ field: "REVIEW.verdict", operator: "=", value: "PASS" }],
              },
            },
            DOC_E3: {
              toState: "BORROWER-STATUS-V1-REJECTED-V1",
              ruleEngine: {
                operator: "AND",
                conditions: [{ field: "REVIEW.verdict", operator: "=", value: "FAIL" }],
              },
            },
          },
        },
        "BORROWER-STATUS-V1-APPROVED-V1": {
          type: "ACTOR",
          component: "ApplicationApprovedPage",
          access: { type: "PUBLIC" },
          metadata: {
            actor: "BORROWER",
            module: "STATUS",
            moduleVersion: "V1",
            node: "APPROVED",
            nodeVersion: "V1",
          },
          edges: {},
        },
        "BORROWER-STATUS-V1-REJECTED-V1": {
          type: "ACTOR",
          component: "ApplicationRejectedPage",
          access: { type: "PUBLIC" },
          metadata: {
            actor: "BORROWER",
            module: "STATUS",
            moduleVersion: "V1",
            node: "REJECTED",
            nodeVersion: "V1",
          },
          edges: {},
        },
      },
    },
  },
  {
    id: "TPL-APPROVAL",
    name: "Multi-Tier Underwriting & Approval Workflow",
    description: "Credit scoring engine with automated threshold decision and two-level management authorization.",
    category: "UNDERWRITING",
    definition: {
      workflowVersion: "UNDERWRITING-V3",
      startState: "SYSTEM-REVIEW-V1-CREDIT-CHECK-V1",
      states: {
        "SYSTEM-REVIEW-V1-CREDIT-CHECK-V1": {
          type: "SYSTEM_INTERNAL_PROCESS",
          processHandler: "fetchBureauScore",
          metadata: {
            actor: "SYSTEM",
            module: "REVIEW",
            moduleVersion: "V1",
            node: "CREDIT-CHECK",
            nodeVersion: "V1",
          },
          edges: {
            APP_E1: {
              toState: "BORROWER-STATUS-V1-APPROVED-V1",
              ruleEngine: {
                operator: "AND",
                conditions: [{ field: "bureau.score", operator: ">=", value: 750 }],
              },
            },
            APP_E2: {
              toState: "MANAGER-APPROVAL-V1-MANUAL-UNDERWRITE-V1",
              ruleEngine: {
                operator: "AND",
                conditions: [
                  { field: "bureau.score", operator: ">=", value: 650 },
                  { field: "bureau.score", operator: "<", value: 750 },
                ],
              },
            },
            APP_E3: {
              toState: "BORROWER-STATUS-V1-REJECTED-V1",
              ruleEngine: {
                operator: "AND",
                conditions: [{ field: "bureau.score", operator: "<", value: 650 }],
              },
            },
          },
        },
        "MANAGER-APPROVAL-V1-MANUAL-UNDERWRITE-V1": {
          type: "ACTOR",
          component: "ManagerApprovalPage",
          access: { type: "AUTHENTICATED" },
          metadata: {
            actor: "MANAGER",
            module: "APPROVAL",
            moduleVersion: "V1",
            node: "MANUAL-UNDERWRITE",
            nodeVersion: "V1",
          },
          edges: {
            APP_E4: {
              toState: "BORROWER-STATUS-V1-APPROVED-V1",
              ruleEngine: {
                operator: "AND",
                conditions: [{ field: "manager.decision", operator: "=", value: "APPROVE" }],
              },
            },
            APP_E5: {
              toState: "BORROWER-STATUS-V1-REJECTED-V1",
              ruleEngine: {
                operator: "AND",
                conditions: [{ field: "manager.decision", operator: "=", value: "REJECT" }],
              },
            },
          },
        },
        "BORROWER-STATUS-V1-APPROVED-V1": {
          type: "ACTOR",
          component: "ApplicationApprovedPage",
          access: { type: "PUBLIC" },
          metadata: {
            actor: "BORROWER",
            module: "STATUS",
            moduleVersion: "V1",
            node: "APPROVED",
            nodeVersion: "V1",
          },
          edges: {},
        },
        "BORROWER-STATUS-V1-REJECTED-V1": {
          type: "ACTOR",
          component: "ApplicationRejectedPage",
          access: { type: "PUBLIC" },
          metadata: {
            actor: "BORROWER",
            module: "STATUS",
            moduleVersion: "V1",
            node: "REJECTED",
            nodeVersion: "V1",
          },
          edges: {},
        },
      },
    },
  },
  {
    id: "TPL-API-INTEG",
    name: "API & Webhook Integration Pipeline",
    description: "External credit bureau API lookup, Webhook event emission, and data sync pipeline.",
    category: "INTEGRATION",
    definition: {
      workflowVersion: "API-INTEG-V1",
      startState: "SYSTEM-DETAILS-V1-FETCH-DATA-V1",
      states: {
        "SYSTEM-DETAILS-V1-FETCH-DATA-V1": {
          type: "API",
          endpoint: "https://api.partner-bureau.com/v1/score",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          metadata: {
            actor: "SYSTEM",
            module: "DETAILS",
            moduleVersion: "V1",
            node: "FETCH-DATA",
            nodeVersion: "V1",
          },
          edges: {
            API_E1: {
              toState: "SYSTEM-DETAILS-V1-DISPATCH-WEBHOOK-V1",
              ruleEngine: {
                operator: "AND",
                conditions: [{ field: "apiResponse.status", operator: "=", value: 200 }],
              },
            },
          },
        },
        "SYSTEM-DETAILS-V1-DISPATCH-WEBHOOK-V1": {
          type: "WEBHOOK",
          endpoint: "https://hooks.partner.com/events/loan-ready",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          metadata: {
            actor: "SYSTEM",
            module: "DETAILS",
            moduleVersion: "V1",
            node: "DISPATCH-WEBHOOK",
            nodeVersion: "V1",
          },
          edges: {
            API_E2: {
              toState: "BORROWER-STATUS-V1-APPROVED-V1",
              ruleEngine: {
                operator: "AND",
                conditions: [{ field: "webhookDelivered", operator: "=", value: true }],
              },
            },
          },
        },
        "BORROWER-STATUS-V1-APPROVED-V1": {
          type: "ACTOR",
          component: "ApplicationApprovedPage",
          access: { type: "PUBLIC" },
          metadata: {
            actor: "BORROWER",
            module: "STATUS",
            moduleVersion: "V1",
            node: "APPROVED",
            nodeVersion: "V1",
          },
          edges: {},
        },
      },
    },
  },
];

async function seedInitialData() {
  // 1. Seed Actors
  for (const actor of DEFAULT_ACTORS) {
    await query(
      `INSERT INTO workflow_actors (id, name, description, is_system)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description`,
      [actor.id, actor.name, actor.description, actor.is_system]
    );
  }

  // 2. Seed Modules
  for (const mod of DEFAULT_MODULES) {
    await query(
      `INSERT INTO workflow_modules (id, name, default_version, versions)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         versions = EXCLUDED.versions`,
      [mod.id, mod.name, mod.default_version, JSON.stringify(mod.versions)]
    );
  }

  // 3. Seed Templates
  for (const tpl of TEMPLATES) {
    await query(
      `INSERT INTO workflow_templates (id, name, description, category, definition)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         category = EXCLUDED.category,
         definition = EXCLUDED.definition`,
      [tpl.id, tpl.name, tpl.description, tpl.category, JSON.stringify(tpl.definition)]
    );
  }

  // 4. Seed Canonical Workflow Configuration WFC-LOAN-001 (if not exists)
  const existingConfig = await query(
    `SELECT id FROM workflow_configurations WHERE id = 'WFC-LOAN-001'`
  );

  if (existingConfig.rows.length === 0) {
    const loanTemplate = TEMPLATES[0];
    await query(
      `INSERT INTO workflow_configurations
        (id, workflow_id, name, description, current_version, status, definition, metadata)
       VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        "WFC-LOAN-001",
        "WF-LOAN-001",
        "Standard Multi-Product Loan Workflow",
        "Authoritative canonical configuration for LOAN-FLOW-V7",
        "LOAN-FLOW-V7",
        "PUBLISHED",
        JSON.stringify(loanTemplate.definition),
        JSON.stringify({
          canvasLayout: {
            "BORROWER-DETAILS-V1-PERSONAL-INFO-V1": { x: 80, y: 120 },
            "BORROWER-ADDRESS-V1-ADDRESS-INFO-V1": { x: 380, y: 80 },
            "BORROWER-KYC-V1-KYC-UPLOAD-V1": { x: 680, y: 80 },
            "BORROWER-EMPLOYMENT-V1-EMPLOYMENT-INFO-V1": { x: 980, y: 80 },
            "LENDER-OFFER-V1-LOAN-AMOUNT-V1": { x: 1280, y: 80 },
            "LENDER-OFFER-V1-INTEREST-RATE-V1": { x: 1580, y: 80 },
            "BORROWER-STATUS-V1-APPROVED-V1": { x: 1880, y: 80 },
            "BORROWER-STATUS-V1-REJECTED-V1": { x: 380, y: 280 },
          },
        }),
      ]
    );

    // Initial version snapshot
    await query(
      `INSERT INTO workflow_configuration_versions
        (configuration_id, workflow_id, version, status, definition, change_summary)
       VALUES
        ($1, $2, $3, $4, $5, $6)`,
      [
        "WFC-LOAN-001",
        "WF-LOAN-001",
        "LOAN-FLOW-V7",
        "PUBLISHED",
        JSON.stringify(loanTemplate.definition),
        "Initial seed version of canonical LOAN-FLOW-V7",
      ]
    );
  }
}

module.exports = { seedInitialData, TEMPLATES, DEFAULT_ACTORS, DEFAULT_MODULES };
