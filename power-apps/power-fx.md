# Power Fx package

Replace list and flow names only after connections are added. Formulas use SharePoint column names from the schema.

## App.OnStart
```powerfx
Set(varUserEmail, Lower(User().Email));
Concurrent(
  ClearCollect(colHRAccess, Filter(HRUsers, Lower(UserEmail)=varUserEmail && IsActive=true)),
  ClearCollect(colMyParticipation, Filter(Participants, Lower(EmployeeEmail)=varUserEmail && Status.Value="Eligible")),
  ClearCollect(colManagedParticipation, Filter(Participants, Lower(ManagerEmail)=varUserEmail && Status.Value="Eligible")),
  ClearCollect(colActiveFramework, SortByColumns(Filter('6C Framework Configuration', IsActive=true), "FactorOrder", SortOrder.Ascending, "QuestionOrder", SortOrder.Ascending))
);
Set(varIsHR, CountRows(colHRAccess)>0);
Set(varIsEmployee, CountRows(colMyParticipation)>0);
Set(varIsManager, CountRows(colManagedParticipation)>0);
Set(varActiveRole, If(varIsEmployee,"Employee",If(varIsManager,"Manager",If(varIsHR,"HR","None"))));
Set(varSecurityWarning,"Power Apps filtering is not enforceable security.");
```

## Authorization predicates
```powerfx
// Employee gallery
Filter(Assessments, Lower(EmployeeEmail)=varUserEmail)
// Manager gallery
Filter(Assessments, Lower(ManagerEmail)=varUserEmail)
// HR guard
varIsHR
// Results guard
Lower(varAssessment.EmployeeEmail)=varUserEmail || Lower(varAssessment.ManagerEmail)=varUserEmail || varIsHR
```
Never authorize solely from `varActiveRole`.

## Active campaign and participant
```powerfx
Set(varCampaign, LookUp(Campaigns, CampaignID=ddCampaign.Selected.CampaignID));
Set(varParticipant, LookUp(Participants, CampaignID=varCampaign.CampaignID && Lower(EmployeeEmail)=varUserEmail && Status.Value="Eligible"));
Set(varCanStart,
 varCampaign.Status.Value="Active" && Today()>=varCampaign.StartDate && Today()<=varCampaign.EndDate &&
 !IsBlank(varParticipant.ParticipantID) && varParticipant.GCMLevel>=7 && !IsBlank(varParticipant.ManagerEmail) &&
 CountRows(colActiveFramework)>0 && CountIf(colActiveFramework, StartsWith(QuestionText,"Framework owner input required"))=0
);
```

## Start new assessment
Use a child flow `PA_CreateAssessmentVersion` for atomicity. It accepts CampaignID and ParticipantID, validates the caller, serializes per participant/campaign, finds prior latest, creates GUID, calculates version, creates response snapshots, flips the prior latest by exact AssessmentID, and returns the new record. Canvas:
```powerfx
If(!varCanStart,
 Notify("Eligibility, campaign, manager, or approved framework validation failed.",NotificationType.Error),
 Set(varBusy,true);
 Set(varCreateResult, PA_CreateAssessmentVersion.Run(varCampaign.CampaignID,varParticipant.ParticipantID));
 If(varCreateResult.success,
   Set(varAssessmentID,varCreateResult.assessmentID);
   Set(varAssessment,LookUp(Assessments,AssessmentID=varAssessmentID));
   Navigate(scrAssessmentForm,ScreenTransition.Fade),
   Notify(varCreateResult.message,NotificationType.Error)
 );
 Set(varBusy,false)
)
```
The flow must create the new item first as `IsLatestAssessment=false`, snapshot Responses, flip the exact prior AssessmentID false, then flip the exact new AssessmentID true. On failure, compensate by restoring prior latest and deleting only the unsubmitted failed draft. An idempotency key prevents duplicate clicks.

## Autosave employee response
```powerfx
If(varAssessment.Status.Value="Draft" && varAssessment.IsLatestAssessment && Lower(varAssessment.EmployeeEmail)=varUserEmail,
 Patch(Responses,
   LookUp(Responses,AssessmentID=varAssessmentID && QuestionID=ThisItem.QuestionID),
   {EmployeeRating:Value(radEmployeeRating.Selected.Value),EmployeeComment:Trim(txtEmployeeComment.Value)}
 ),
 Notify("This assessment is read-only.",NotificationType.Error)
)
```
Patch inputs using `InputKey`, always including AssessmentID. Cap Strength and DevelopmentArea rows at three.

## Completeness
```powerfx
Refresh(Responses);
ClearCollect(colAssessmentResponses,Filter(Responses,AssessmentID=varAssessmentID));
Set(varEmployeeComplete,
 CountRows(colAssessmentResponses)=CountRows(colActiveFramework) &&
 CountIf(colAssessmentResponses,IsBlank(EmployeeRating) || EmployeeRating<1 || EmployeeRating>4 || IsBlank(Trim(EmployeeComment)))=0
);
Set(varManagerComplete,
 CountRows(colAssessmentResponses)=CountRows(colActiveFramework) &&
 CountIf(colAssessmentResponses,IsBlank(ManagerRating) || ManagerRating<1 || ManagerRating>4 || IsBlank(Trim(ManagerComment)))=0
)
```

## Employee submit
```powerfx
If(!varEmployeeComplete,
 Notify("Rate and comment on every approved question before submitting.",NotificationType.Error),
 Set(varOperationID,Text(GUID()));
 Patch(Assessments,LookUp(Assessments,AssessmentID=varAssessmentID && Status.Value="Draft"),
   {Status:{Value:"Submitting"},SubmittedDate:Now(),FlowOperationID:varOperationID});
 Set(varFlowResult,PA_AssessmentSubmitted.Run(varAssessmentID,varOperationID));
 If(varFlowResult.success,Refresh(Assessments);Navigate(scrResults),
   Notify("Submission could not be completed. Your saved draft is retained.",NotificationType.Error))
)
```
The flow revalidates completeness/status and owns the transition to Manager Review Pending. Disable all employee controls when status is not Draft.

## Manager submit
```powerfx
If(Lower(varAssessment.ManagerEmail)<>varUserEmail || varAssessment.Status.Value<>"Manager Review Pending",
 Notify("You cannot review this assessment.",NotificationType.Error),
 If(!varManagerComplete,Notify("Complete every manager rating and comment.",NotificationType.Error),
   Set(varOperationID,Text(GUID()));
   Patch(Assessments,LookUp(Assessments,AssessmentID=varAssessmentID && Status.Value="Manager Review Pending"),{Status:{Value:"Manager Review Submitting"},FlowOperationID:varOperationID});
   Set(varFlowResult,PA_ManagerReviewSubmitted.Run(varAssessmentID,varOperationID));
   If(varFlowResult.success,Refresh(Assessments);Navigate(scrResults),Notify("Manager submission failed; contact support with the operation ID.",NotificationType.Error))
 ))
```
Manager employee controls: `DisplayMode.View`; manager controls: `If(status="Manager Review Pending",Edit,View)`.

## Delegation and errors
Use indexed text/choice/date predicates and avoid `in`, `Search`, and nondelegable transformations over large lists. Lower-case emails on write via flows; use Lower only against a single indexed equality where tenant testing confirms delegation. Wrap Patch/flow calls with `IfError`; show operation ID, never raw AI/document text. All loading states set/reset `varBusy`.
