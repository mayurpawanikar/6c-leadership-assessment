# Fictional sample data

Do not activate framework placeholders in production.

## Campaigns
`CMP-2026-01 | GCM 7+ Leadership Pilot | 2026-10-01 | 2026-12-15 | Active | hr.lead@example.com`

## Participants
- `P-1001 | CMP-2026-01 | E-1001 | Maya Chen | maya.chen@example.com | jordan.lee@example.com | hr.lead@example.com | Transformation Director | 8 | Eligible`
- `P-1002 | CMP-2026-01 | E-1002 | Rafael Silva | rafael.silva@example.com | jordan.lee@example.com | hr.lead@example.com | Operations Leader | 7 | Eligible`
- `P-1003 | CMP-2026-01 | E-1003 | Noor Haddad | noor.haddad@example.com | priya.rao@example.com | hr.lead@example.com | Finance Partner | 6 | Ineligible`

## HRUsers
`hr.lead@example.com | Morgan Patel | true`; `former.hr@example.com | Taylor Kim | false`.

## Assessments
- `a1111111-1111-4111-8111-111111111111 | P-1001 | version 1 | Completed | latest=false`
- `a2222222-2222-4222-8222-222222222222 | P-1001 | version 2 | Manager Review Pending | previous=a111... | latest=true`

## Framework placeholders
Create six inactive records, one per approved factor, with all missing fields set to `Framework owner input required — do not publish`. Do not invent questions, definitions, dimensions, or rating labels.

## Example child records
Responses use `a222...|Q-OWNER-001` only after Q-OWNER-001 is replaced with an approved QuestionID/text. Inputs: Strength sequence 1 “Cross-country program delivery”; DevelopmentArea sequence 1 “Quantify commercial trade-offs”; ObjectiveKPI “Improve program margin while meeting agreed delivery milestones.” SupportingDocument: fictional `leadership-profile.pdf`, SupportingDocumentType ResumeLinkedInPDF, URL under the AssessmentID folder. Sample comments are test data, not approved framework content.
