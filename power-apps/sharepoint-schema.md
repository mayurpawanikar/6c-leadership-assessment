# SharePoint schema

Create indexed single-line text columns for every `...ID` and email used in filters. Disable attachments except where required. Keep internal names identical at creation.

## Campaigns
| Column | Type | Rules |
|---|---|---|
| CampaignID | Single line text | Required, indexed, unique |
| CampaignName | Single line text | Required |
| StartDate / EndDate | Date only | Required |
| Status | Choice | Draft, Active, Closed, Archived |
| HREmail | Single line text | Required, indexed |

## Employees
EmployeeID (text, required/unique/indexed), EmployeeEmail (text, required/unique/indexed), EmployeeName (text, required), JobTitle (text), ManagerEmail (text, indexed), IsActive (yes/no, required/indexed).

## Managers
ManagerEmail (text, required/unique/indexed), ManagerName (text, required), IsActive (yes/no, required/indexed).

## Admins
AdminEmail (text, required/unique/indexed), AdminName (text, required), IsActive (yes/no, required/indexed).

Role resolution independently matches the signed-in email against Employees.EmployeeEmail, Managers.ManagerEmail, HRUsers.UserEmail, and Admins.AdminEmail. Employee.ManagerEmail references the manager by unique email.

## Assessments
AssessmentID (text, required/unique/indexed), CampaignID and ParticipantID (text, required/indexed), EmployeeID (text), EmployeeEmail and ManagerEmail (text, required/indexed), AssessmentVersion (number, required), Status (choice: Draft, Submitting, Manager Review Pending, Manager Review Submitting, HR Review Pending, Completed, AI Failed, Security Failed), SubmittedDate (date/time), PreviousAssessmentID (text/indexed), IsLatestAssessment (yes/no, indexed), AIReport and FinalReport (multiple lines plain text), FrameworkVersion (text, required), Role (text), GCMLevel (number), ManagerSubmittedDate (date/time), FlowOperationID (text/indexed), CreatedByApp (yes/no).

## Responses
AssessmentID (text, required/indexed), FactorName, DimensionName, QuestionText (multiple lines), QuestionID (text, required/indexed), DisplayOrder (number), EmployeeRating (number), EmployeeComment (multiple lines), ManagerRating (number), ManagerComment (multiple lines), FrameworkVersion (text). Create a unique `ResponseKey` text value `${AssessmentID}|${QuestionID}`. Ratings must be 1–4.

## Assessment Inputs
AssessmentID (text, required/indexed), InputID (GUID text, required/unique), InputType (choice: Strength, DevelopmentArea, ObjectiveKPI), Sequence (number 1–3 for strengths/development areas), TextValue (multiple lines, required), OutcomeMeasure (multiple lines, optional), DueDate (date only, optional). Unique `InputKey`: `${AssessmentID}|${InputType}|${Sequence}`. Objectives may use additional rows.

## SupportingDocument and library
SupportingDocument: AssessmentID (text, required/indexed), SupportingDocumentID (GUID text, unique), FileName, FileType, FileURL (hyperlink), SupportingDocumentType (choice: ResumeLinkedInPDF, DISC, Gallup, ManagerFeedback, OtherAssessment), ExtractionStatus (choice: Pending, Extracted, Failed, NotSupported), ExtractedText (multiple lines), ContentHash (text). Store files in `6C Assessment SupportingDocument` with folders by AssessmentID; allow PDF and approved Office formats only, subject to tenant limit.

## HRUsers
UserEmail (text, required/unique/indexed), UserName (text, required), IsActive (yes/no, indexed).

## 6C Framework Configuration
FrameworkVersion (text/indexed), FactorName (choice using the six approved names), FactorOrder (number), DimensionID (text), DimensionName (text), Definition (multiple lines), QuestionID (text, unique/indexed), QuestionText (multiple lines), QuestionOrder (number), Rating1Label/Definition through Rating4Label/Definition (text/multiple lines), IsActive (yes/no/indexed). Populate verbatim only. Placeholder rows must say `Framework owner input required — do not publish` and remain inactive.

## Audit Log
Operational addition: EventID (GUID unique), AssessmentID (indexed), OperationID (indexed), EventType, ActorEmail, EventDateTime, Outcome, Details. Flows write append-only events.

## Referential and immutable rules
SharePoint lookups are intentionally avoided for delegation/portability; flows validate IDs. Only Draft employee records may change employee fields; only Manager Review Pending manager fields may change. Child records inherit the parent snapshot lifecycle. Index CampaignID, ParticipantID, AssessmentID, all role emails, Status, IsLatestAssessment, IsActive, and QuestionID.
