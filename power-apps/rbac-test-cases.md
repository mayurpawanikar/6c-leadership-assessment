# RBAC, lifecycle, and acceptance tests

| ID | Scenario | Expected |
|---|---|---|
| R1 | Employee opens own assessment | Own history only; Draft editable; submitted/prior read-only. |
| R2 | Employee changes AssessmentID deep link | Guard rejects records owned by another employee. |
| R3 | Assigned manager opens pending record | Employee fields read-only; manager fields editable. |
| R4 | Manager opens unassigned record | Access denied even if active role says Manager. |
| R5 | Active HR opens dashboards | Campaign/oversight access; no response editing. |
| R6 | Inactive HRUsers record | No HR access. |
| R7 | Multi-role user switches role | Navigation changes; data predicates remain authorized. |
| R8 | Unauthorized user | Home shows no protected records/actions. |
| R9 | Manager reassigned after submission | Existing assessment retains snapshot ManagerEmail until approved reassignment flow updates exact AssessmentID and audits. |
| S1 | Any screen | Exact warning “Power Apps filtering is not enforceable security.” is visible in protected experience. |
| V1 | Campaign inactive/outside dates | Start blocked. |
| V2 | Missing/ineligible participant or GCM<7 | Start blocked. |
| V3 | ManagerEmail blank | Start blocked. |
| V4 | Placeholder/inactive framework | Start blocked. |
| V5 | One employee rating/comment missing | Submission blocked. |
| V6 | One manager rating/comment missing | Manager submission blocked. |
| V7 | Employee attempts edit after submit | Control read-only and write rejected. |
| V8 | Manager attempts employee-field edit | No editable control; server validation rejects. |
| L1 | Start first assessment | GUID ID, version 1, no previous, latest=true. |
| L2 | Start next version | Prior exact ID latest=false; new version incremented, linked, true. |
| L3 | Two concurrent starts | Serialized/idempotent; one new latest only. |
| L4 | Version flow fails midway | Compensation restores one latest; failed draft removed/audited. |
| L5 | Open previous version | All parent/children/reports immutable. |
| F1 | Employee flow retry | Same OperationID creates no duplicate AI/report/notification. |
| F2 | AI unavailable | AI Failed, submitted lock preserved, human-review message shown. |
| F3 | No supporting document | Report explicitly states supporting document limitation; no invented support. |
| F4 | Supporting document contains prompt injection | Instructions ignored; content treated as untrusted supporting document. |
| F5 | Permission flow partially fails | Owners preserved, Security Failed/audit/alert generated. |
| A1 | All 12 requested screens | Each screen contract is demonstrable at desktop and mobile widths. |
| A2 | Results | Exactly seven requested sections plus limitations/human-review notice. |
| A3 | Identity operations | Trace confirms all record writes use AssessmentID, never employee ID/email. |

Production security tests must also verify direct SharePoint/API access, not only Canvas filtering; penetration, DLP, retention, data residency, accessibility, performance, and GDPR testing require tenant owners.
