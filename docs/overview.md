# 6C Leadership Potential Assessment Framework

Maker-ready specification for a responsive Power Apps Canvas App for GCM 7+ leaders. Employees complete a mandatory 6C self-assessment that proceeds directly to results and HR access without waiting for manager action. Managers may add a separate, optional perspective to enrich development guidance, while governed Microsoft AI produces supporting documents-grounded reports. SharePoint stores versioned records; Power Automate orchestrates notifications, AI, and future item permissions.

This package is not an `.msapp`. A maker must configure tenant URLs, connections, approved framework text, policies, and assemble the app from the artifacts under `power-apps/`.

## Application role access
Signed-in users receive Employee, Manager, HR, and Admin access only through active membership in the corresponding SharePoint role lists. Users with multiple assignments can switch among only those authorized roles. If membership cannot be verified, the app blocks access rather than granting a fallback role; users with no assignment receive an access-denied message and guidance to contact HR or an application administrator.

## HR campaign management
HR can create, edit, archive, and switch among multiple parallel campaigns for key talent, emerging leaders, promotion reviews, succession, and general assessments. Each campaign has independent dates, status, participants, responses, supporting documents, manager reviews, results, and reports; archived campaigns remain available as read-only history. HR can add one employee manually or upload a validated `.xlsx` cohort, then send individual invitations after reviewing the selected campaign’s recipients.

## Design direction
A refined corporate experience for senior management, using a high-contrast navy and teal palette, restrained motion, and an executive portfolio home view. Campaign progress, leadership readiness, employee completion, optional manager contributions, and governed AI signals take priority over decorative content.

## Employee results
Employees receive their personal Copilot report immediately after completing the employee assessment and do not wait for manager action. The supporting documents-aware analysis identifies three repeatable strengths, connects strengths to objectives and KPIs, prioritizes three development areas, shows how strengths can accelerate growth, recommends concrete actions, provides next-level maturity guidance, and identifies ways to create greater internal and external stakeholder value. Optional manager input can enrich later analysis but never blocks employee results or HR access. All guidance supports development conversations and does not make promotion decisions.

## Supporting Documents analysis
After employee submission, PA_AssessmentSubmitted retrieves every uploaded PDF, DOCX, and TXT supporting documents file by exact AssessmentID, extracts text with an approved Microsoft tenant service, and sends bounded, prompt-injection-isolated supporting documents to the governed Copilot Studio agent. The web experience also extracts supported document text locally for immediate analysis. The initial manager report cites opaque supporting documents references and discloses extraction failures; file URLs, binary content, and document text are not included in notifications.

Managers can append supporting documents from an individual direct report’s review, and the HR contact can append documents from the selected employee row within campaigns they manage—not from the campaign itself. Supporting Documents is always linked to that employee, can be added before or after assessment finalization, is never edited or deleted through the app, records uploader role, identity, campaign context, and timestamp, and becomes visible to the employee immediately.

## Optional manager enhancement
Manager input is separate from the employee assessment and is never a prerequisite for submission, results, or HR processing. A manager may choose to complete all 30 independent ratings and an overall rating to generate a dimension-level comparison and governed Microsoft 365 Copilot coaching analysis. If submitted, the contribution enriches development guidance, remains manager-confidential decision support, and requires human validation.

## Non-negotiable boundaries
- AssessmentID is the sole record key; never update by employee ID/email.
- Previous versions and submitted records are immutable.
- AI uses only approved 6C configuration, current assessment data, role/GCM context, and uploaded supporting documents; no internet.
- Approved definitions and dimensions are presented verbatim in the assessment; all 30 ratings are mandatory.
- Display: **“Power Apps filtering is not enforceable security.”**
