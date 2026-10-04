# Deployment checklist

1. Obtain verbatim approved dimensions, definitions, questions, question order, and rating labels; governance owner signs the framework version. No placeholder may be active.
2. Confirm final status after HR Review Pending, retention/deletion policy, supporting document file limits/types, supported geographies, residency, DLP, licensing, and human accountability owner.
3. Create lists/library from `sharepoint-schema.md`; configure indexes, uniqueness, version history, owners, retention labels, and least-privilege connections.
4. Create a solution with Canvas App, environment variables, connection references, three requested flows plus atomic version flow, SharePoint, and Copilot Studio.
5. Create and publish **6C Assessment Analysis Agent** from `copilot-studio-agent.md`; disable web/general knowledge and configure the `AnalyzeAssessment` action and JSON contract.
6. Record the agent ID, environment ID, connection reference logical name, published version, flow service account, and responsible AI owner.
7. Assemble responsive screens and components from `screens-and-navigation.md`; apply formulas from `power-fx.md`; keep all writes keyed by AssessmentID.
8. Configure two-stage agent invocation in `PA_AssessmentSubmitted` and `PA_ManagerReviewSubmitted`, contract validation, deep links, notifications, retries, secure inputs/outputs, audit, and support alerts.
9. Replace sample data with tenant-approved test users. Run every test in `rbac-test-cases.md`, including direct SharePoint permission and prompt-injection supporting document tests.
10. Complete privacy impact assessment, GDPR/geography review, responsible AI review, accessibility review, threat model, performance/delegation test at expected list volume, and records-management approval.
11. Pilot with a limited GCM 7+ cohort. Verify every report citation against source IDs and obtain employee, manager, HR, framework owner, security, and AI governance sign-off.
12. Enable `PA_SecureAssessmentRecord` only after permission design is approved and tested. The prototype warning remains visible until enforceable item/file security is proven.

## Production blockers
Missing approved framework wording; unresolved SharePoint list provisioning/binding; Copilot Studio agent not yet created/published; agent/environment/connection IDs not supplied; unspecified retention/licensing/DLP; unresolved HR completion status; unapproved item-permission model. The package must not be represented as production-ready until these are closed.
