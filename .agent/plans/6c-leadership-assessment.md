# 6C Leadership Potential Assessment Framework — Maker-ready Power Apps plan

## Deliverable

- Produce a maker-ready implementation package for a responsive Power Apps Canvas App named **6C Leadership Potential Assessment Framework**.
- Include copy-ready SharePoint list definitions, Power Fx formulas, screen/control specifications, navigation and state logic, Power Automate flow definitions, Copilot/AI prompts and guardrails, sample records, and RBAC/validation test cases.
- Do not claim or provide an importable `.msapp`; the package is intended for a Power Apps maker to assemble in the target Microsoft 365 tenant.
- Treat the exact approved framework wording as a deployment prerequisite: the meeting notes identify the six factors but do not contain the verbatim dimensions, definitions, questions, or rating labels.

## Framework integrity

- Preserve the approved factors: Capability, Capacity, Character, Customer Centricity, Commercial Acumen, and Cultural Equity.
- Store framework content in a controlled configuration source so questions, dimensions, definitions, display order, and 1–4 rating labels are rendered verbatim rather than embedded throughout screens.
- Use locked placeholders in the package for missing approved wording; clearly mark them **Framework owner input required — do not publish**.
- Require every configured question to be answered and prohibit question rotation in the prototype because all approved questions are mandatory.
- Do not infer, rewrite, expand, or generate missing framework content from the meeting notes.

## SharePoint data

- Define lists: Campaigns, Participants, Assessments, Responses, Supporting Documents, HRUsers, Assessment Inputs, and 6C Framework Configuration.
- Retain the requested column names and specify SharePoint column types, required flags, indexes, relationships, choice values, and safe defaults.
- Use **AssessmentID** as the sole assessment identity and lookup key in all assessment operations.
- Use **Assessment Inputs** as a child list keyed by AssessmentID for up to three strengths, up to three development areas, and objectives/KPIs.
- Use **6C Framework Configuration** for approved factors, dimensions, definitions, questions, rating labels, ordering, and active framework version.
- Keep supporting documents metadata in Supporting Documents and files in a dedicated SharePoint document library linked by AssessmentID and FileURL.
- Add only operational fields genuinely required for workflow, audit, framework version, flow status, and secure processing; document every addition.

## Roles and access

- Initialize `varUserEmail = Lower(User().Email)` and resolve employee, manager, and HR experiences from Participants, assessment ownership, and active HRUsers records.
- Employee: view and create only assessments where normalized EmployeeEmail matches.
- Manager: review only assessments where normalized ManagerEmail matches.
- HR: access campaign and oversight experiences only with an active HRUsers record.
- Support users who hold more than one role through an explicit role switcher without changing authorization filters.
- Display the warning exactly: **“Power Apps filtering is not enforceable security.”**
- Document prototype filtering separately from future SharePoint item-level permissions and GDPR/geography controls.

## Screens

- **Home** — role-aware status summary and next actions.
- **My Assessments** — employee assessment history with immutable prior versions and latest-status indicators.
- **Start Assessment** — validate active campaign, participant eligibility, GCM 7+, and required manager before version creation.
- **Assessment Form** — six ordered sections generated from approved configuration; mandatory employee ratings and comments.
- **Strengths & Development Areas** — capture up to three strengths, three development areas, and role objectives/KPIs.
- **Supporting Documents Upload** — optional PDF and approved assessment supporting documents upload with type selection and file metadata.
- **Review & Submit** — completeness checks, declarations, submission, and post-submit lock.
- **Manager Dashboard** — assigned submissions and review status.
- **Manager Review** — read-only employee answers with separate mandatory manager ratings and comments.
- **Results** — initial or final AI report with supporting documents limitations, gaps, priorities, readiness guidance, and actions.
- **HR Campaigns** — campaign creation and lifecycle management.
- **HR Dashboard** — participation, workflow status, overdue reviews, and report access.
- Use one responsive top navigation pattern with role-aware destinations for this 12-screen app package, plus consistent back/next controls within the assessment journey.

## Assessment lifecycle and versioning

- Start New Assessment creates a GUID AssessmentID and a Draft record.
- Determine the next AssessmentVersion from records for the same ParticipantID and CampaignID without using employee ID or email as an update key.
- Set PreviousAssessmentID to the prior latest assessment, set that exact prior record’s IsLatestAssessment to false by AssessmentID, and set the new record to true.
- Preserve all previous assessments and related responses, inputs, supporting documents, and reports as immutable snapshots.
- Define statuses and allowed transitions from Draft through employee submission, Manager Review Pending, HR Review Pending, and completion.
- Lock employee content after submission and lock manager content after manager submission.
- Include concurrency/error handling so a failed version transaction does not leave two latest records.

## Power Fx package

- Provide formulas for App.OnStart, role resolution, navigation guards, responsive layout breakpoints, campaign/participant validation, draft creation, versioning, response initialization, autosave, completeness, submission, locking, manager review, supporting documents metadata, and results display.
- Use AssessmentID in every Patch, LookUp, UpdateIf, RemoveIf, and flow invocation that targets assessment-owned records.
- Normalize email comparisons with Lower and avoid updates by EmployeeID or email.
- Include delegation notes, indexed-column requirements, loading/error states, and user-facing recovery messages.
- Keep employee and manager controls separate so manager formulas cannot overwrite employee fields.

## Power Automate

- **PA_AssessmentSubmitted** — validate AssessmentID and status, compile approved employee inputs/supporting documents, generate the initial AI report, store it, set Manager Review Pending, and notify the manager.
- **PA_ManagerReviewSubmitted** — validate the manager review, merge employee and manager responses with permitted supporting documents, generate the final consolidated report, store it, set HR Review Pending, and notify HR.
- **PA_SecureAssessmentRecord** — placeholder design to break inheritance, preserve owners/admins, grant employee/manager/HR access, process child records/files, and write an auditable result log.
- Define triggers, inputs/outputs, idempotency keys, status checks, retry/failure paths, service-account ownership, connection references, and least-privilege expectations.
- Keep uploaded document extraction and AI processing within approved Microsoft 365 services; no internet retrieval or direct LinkedIn access.

## Copilot/AI design

- Constrain grounding to the approved 6C configuration, employee and manager responses, objectives/KPIs, role/GCM level, and uploaded supporting documents for the current AssessmentID.
- Generate only: potential summary, strengths with supporting documents, development priorities, self-versus-manager gaps, business outcome alignment, readiness guidance, and recommended actions.
- Require traceable supporting documents references, distinguish facts from interpretations, state when supporting documents is absent or insufficient, and never fabricate scores, role facts, achievements, or document content.
- Prohibit internet/external knowledge, demographic inference, protected-trait inference, personality diagnosis, automated employment decisions, and modification of approved framework definitions.
- Treat uploaded supporting documents as validation context, not a replacement for structured answers.
- Include separate initial and consolidated prompt templates, structured output schema, content-safety handling, human-review notice, prompt/version logging, and fallback behavior when AI is unavailable.

## Validation and security

- Enforce active campaign dates/status, valid participant, GCM eligibility, required ManagerEmail, all configured questions rated, and required manager ratings before their respective submissions.
- Ensure employee answers are immutable and read-only to managers; manager fields remain separate.
- Ensure prior assessment versions and their child records remain immutable.
- Validate upload type/size policy and prevent supporting documents from being associated without a valid AssessmentID.
- Document that Canvas App filters are UX controls only and cannot replace SharePoint permissions.
- Define the future item-permission flow, owner/admin preservation, audit logging, failure alerts, geography review, retention, and GDPR review checkpoints.

## Sample data and tests

- Provide fictional sample campaigns, GCM 7+ participants, employee/manager/HR role combinations, assessment versions, responses, inputs, and supporting documents metadata.
- Use locked placeholder framework records until the framework owner supplies verbatim approved content.
- Include RBAC tests for employee, manager, HR, multi-role, inactive HR, unauthorized user, and manager reassignment scenarios.
- Include lifecycle tests for inactive campaign, missing participant/manager, incomplete questions, duplicate start attempts, concurrent version creation, submission locks, immutable history, flow retries, AI failure, missing supporting documents, and permission-flow failure.
- Include acceptance criteria mapping every requested screen, rule, flow, output section, and security warning to a demonstrable test.

## What remains unchanged

- The six approved factor names, future verbatim dimensions/definitions/questions, and approved 1–4 scale.
- The requested employee-manager-HR operating model and assessment output sections.
- The rule that AssessmentID is the only unique key and previous assessments are preserved.
- The Microsoft-only, no-internet AI boundary.

## Required owner input before production

- Verbatim approved dimensions, definitions, question text, and 1–4 rating labels.
- Tenant SharePoint site/library locations, upload limits, retention policy, supported geographies, and data residency requirements.
- Approved Copilot/AI service, environment, licensing, DLP policy, and human-review/accountability owner.
- Final HR completion step and status after **HR Review Pending**.
