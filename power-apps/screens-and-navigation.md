# Screens and navigation

Use a responsive canvas (`Scale to fit=false`, `Lock aspect ratio=false`) with reusable header, warning banner, status badge, footer actions, and loading overlay. Top navigation is role-aware; assessment steps use Previous/Save & next. Breakpoint: `App.Width < 768` stacks controls; otherwise use two columns. Minimum touch target 44px.

## Navigation
Home; employee: My Assessments, Start Assessment; manager: Manager Dashboard; HR: HR Campaigns, HR Dashboard. Results opens contextually. Multi-role users select an active role; role selection changes destinations, never authorization predicates.

## Screen contract
| Screen | Main behavior |
|---|---|
| Home | Role-specific counts, next action, exact filtering-security warning. |
| My Assessments | Employee history filtered by normalized email; latest marker; prior versions read-only. |
| Start Assessment | Select active campaign; validate participant, GCM 7+, manager, active framework; create version transaction. |
| Assessment Form | Six configured factor sections; factor definition and dimensions; every question has mandatory 1–4 radio and required comment; autosave Draft only. |
| Strengths & Development Areas | Up to 3 strengths, up to 3 development areas, objectives/KPIs; show counters. |
| Supporting Documents Upload | Optional upload to AssessmentID folder; supporting document type required; direct LinkedIn access prohibited. |
| Review & Submit | Completeness summary, supporting document list, declaration, submit; lock after successful handoff. |
| Manager Dashboard | ManagerEmail filter; pending/complete tabs and due-state indicators. |
| Manager Review | Employee fields read-only; separate mandatory manager rating/comment controls; submit consolidated review. |
| Results | Render seven fixed report sections, supporting document limitations, report version/time, human-review notice. |
| HR Campaigns | Create/edit lifecycle before assessments; prevent invalid date range and unsafe closure. |
| HR Dashboard | Campaign participation and workflow counts; assessment drill-through; no editing responses. |

## Guards
`Assessment Form` through `Review & Submit` require current user employee match, Draft status, latest record, and selected AssessmentID. `Manager Review` requires manager match and Manager Review Pending. HR screens require active HRUsers. Results requires employee, assigned manager, or HR. Back navigation never bypasses these guards.

## Accessibility
Use text plus icon for status, visible focus, labels/help text, logical tab order, live error summary, and no color-only meaning. Confirm destructive/campaign lifecycle actions.
