import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import {
  ArrowRight, BarChart3, BriefcaseBusiness, CalendarIcon, Check, ChevronLeft, ChevronRight,
  CircleAlert, ClipboardCheck, FileText, Home, Info, LayoutDashboard, Pencil, Plus, RefreshCw, Search, ShieldAlert,
  Sparkles, Target, Trash2, Upload, Users, X,
} from 'lucide-react';
import { EmployeeCoach } from '@/components/employee-coach';
import { EmployeeDocumentPanel, type EmployeeDocumentRecord } from '@/components/employee-supporting-documents-panel';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Textarea } from '@/components/ui/textarea';
import { useUser } from '@/hooks/use-user';
import { useM365HrUsers, useManageM365HrUser, type HrUserInput } from '@/hooks/use-m365-hr-users';
import { useSharePointEmployeeCount } from '@/hooks/use-sharepoint-employee-count';
import { useSharePointHrCount } from '@/hooks/use-sharepoint-hr-count';
import { useSharePointManagerCount } from '@/hooks/use-sharepoint-manager-count';
import { useSharePointRoleRecords, type SharePointAdmin, type SharePointEmployee, type SharePointHRUser, type SharePointManager } from '@/hooks/use-sharepoint-role-records';
import { useSendAssessmentInvitations } from '@/hooks/use-m365-assessment-invitations';
import { useManagerReviewAnalysis, type ManagerReviewAnalysis } from '@/hooks/use-m365-manager-review-analysis';
import { useEmployeeDevelopmentRecommendations, type EmployeeDevelopmentRecommendations } from '@/hooks/use-m365-employee-development-recommendations';
import { parseEmployeeWorkbook, type ImportedEmployee } from '@/lib/excel-employee-parser';
import { extractSupportingDocumentFile, type UploadedSupportingDocumentFile } from '@/lib/supporting-document-file-parser';
import { upsertSharePointListItem } from '@/lib/sharepoint-lists-mcp';
import { downloadLeadershipReportPdf } from '@/lib/pdf-report';

type Role = 'Employee' | 'Manager' | 'HR' | 'Admin';
type View = 'home' | 'assessments' | 'form' | 'manager' | 'manager-details' | 'manager-review' | 'results' | 'campaigns' | 'dashboard' | 'admin-access';
type Factor = { name: string; dimension: string; definition: string };
type OverallRating = { value: string; label: string; description: string; maturity: string };
type CopilotReport = EmployeeDevelopmentRecommendations & { readiness: string; strengths: string[]; priorities: string[]; gaps: string[]; outcomes: string; actions: string[] };
type ManagerEmployee = { id: string; employeeEmail: string; managerEmail: string; name: string; title: string; level: string; status: string; ratings: Record<string, string>; report: CopilotReport };

const factors: Factor[] = [
  { name: 'Capability', dimension: 'Core Skills', definition: 'Has an expertise in multiple areas due to experience and is able to apply knowledge to solve business problems' },
  { name: 'Capability', dimension: 'Business Accumen', definition: 'Has an in-depth understanding of the business model' },
  { name: 'Capability', dimension: 'Exposure', definition: "Has exposure to variety of areas concering one's own business; is confident, decisive and maitains poise under pressure" },
  { name: 'Capability', dimension: 'Critical Thinking', definition: 'Presents out of the box thinking, raising new ideas that provide a breakthrough for existing contexts' },
  { name: 'Capability', dimension: 'Presentation Skills', definition: 'Is able to bring executive presence by articulating thoughts and emotions fluently and coherently' },
  { name: 'Capacity', dimension: 'Visualization', definition: 'Has a good understanding of current state vis-à-vis the future state, can establish a change agenda based on it' },
  { name: 'Capacity', dimension: 'Complexity', definition: 'Maintains a view of the wider picture, even in very complex situations, evaluating interim results and their effect on achieving the overall goal' },
  { name: 'Capacity', dimension: 'Change Agenda', definition: 'Adapts quickly to changes and modifies the action plan accordingly' },
  { name: 'Capacity', dimension: 'Adaptability', definition: 'Is able to understand current trends in technology and leverage it to stay ahead of the curve' },
  { name: 'Capacity', dimension: 'Application', definition: 'Is able to structure work and resources for sustainable growth; is able to build efficient processes to foster an enabling culture' },
  { name: 'Character', dimension: 'Beliefs and Values', definition: 'Demonstrates integrity and authenticity at work' },
  { name: 'Character', dimension: 'End goal clarity', definition: 'Demonstrates courage in pursuing goals and objectives' },
  { name: 'Character', dimension: 'Self-awareness', definition: 'Understand selfworth; is seen as a well respected and has a sphere of influence' },
  { name: 'Character', dimension: 'Competitiveness', definition: 'Is competitive and strives for constant improvement' },
  { name: 'Character', dimension: 'Motivation', definition: 'Is highly motivated by intrinsic factors rather than extrinsic factors' },
  { name: 'Customer Centricity', dimension: 'Knowledge', definition: 'Is aware of the market and customer landscape and emerging trends' },
  { name: 'Customer Centricity', dimension: 'Competition', definition: 'Actively seeks opportunities to strengthen position within competition; helps customer derive value from relationship' },
  { name: 'Customer Centricity', dimension: 'Strategy', definition: 'Is able to balance between existing and new solutions and its best-fit customer growth' },
  { name: 'Customer Centricity', dimension: 'Scenario Building', definition: 'Is able to build scenarios of a possible future after assuming the intervention of several key factors' },
  { name: 'Customer Centricity', dimension: 'Operations', definition: 'Is able to give measurable results, quality standards, determine the drivers of the results and control the drivers to get desired outcome' },
  { name: 'Commercial Acumen', dimension: 'Modeling', definition: 'Displays entrepreneurial behaviors in budgeting and long-term thoughtful planning' },
  { name: 'Commercial Acumen', dimension: 'Risk', definition: 'Demonstrates willingness to take calculated risks to achieve business advantage and is able to mitigate the risk' },
  { name: 'Commercial Acumen', dimension: 'Evolution', definition: 'Is able to change the course of the financial model in order to accelerate results' },
  { name: 'Commercial Acumen', dimension: 'Scalability', definition: 'Is able to effectively use financial accumen for new ways to grow business' },
  { name: 'Commercial Acumen', dimension: 'Quality', definition: 'Provides high level of quality while ensuring profitability and efficiency' },
  { name: 'Cultural Equity', dimension: 'Relationship', definition: 'Builds relationships with others based on mutual trust and respect, as well as by building consensus' },
  { name: 'Cultural Equity', dimension: 'Leadership', definition: 'Inspires others by presenting clear direction, encourages team to add value so they have a sense of belonging.' },
  { name: 'Cultural Equity', dimension: 'Collaboration', definition: 'Contributes to effective collaboration between teams under large and complex conditions' },
  { name: 'Cultural Equity', dimension: 'Global Player', definition: 'Is able to foster an inclusive environment that promotes divergent views and diversity at workplace that is universally applicable' },
  { name: 'Cultural Equity', dimension: 'Team Player', definition: 'Supports others to learn and develop (including peer group)' },
];
const factorNames = ['Capability', 'Capacity', 'Character', 'Customer Centricity', 'Commercial Acumen', 'Cultural Equity'];
const factorStyles: Record<string, { surface: string; tab: string; progress: string }> = {
  Capability: { surface: 'border-l-factor-capability', tab: 'data-[state=active]:bg-factor-capability data-[state=active]:text-factor-capability-foreground', progress: 'bg-factor-capability text-factor-capability-foreground' },
  Capacity: { surface: 'border-l-factor-capacity', tab: 'data-[state=active]:bg-factor-capacity data-[state=active]:text-factor-capacity-foreground', progress: 'bg-factor-capacity text-factor-capacity-foreground' },
  Character: { surface: 'border-l-factor-character', tab: 'data-[state=active]:bg-factor-character data-[state=active]:text-factor-character-foreground', progress: 'bg-factor-character text-factor-character-foreground' },
  'Customer Centricity': { surface: 'border-l-factor-customer', tab: 'data-[state=active]:bg-factor-customer data-[state=active]:text-factor-customer-foreground', progress: 'bg-factor-customer text-factor-customer-foreground' },
  'Commercial Acumen': { surface: 'border-l-factor-commercial', tab: 'data-[state=active]:bg-factor-commercial data-[state=active]:text-factor-commercial-foreground', progress: 'bg-factor-commercial text-factor-commercial-foreground' },
  'Cultural Equity': { surface: 'border-l-factor-culture', tab: 'data-[state=active]:bg-factor-culture data-[state=active]:text-factor-culture-foreground', progress: 'bg-factor-culture text-factor-culture-foreground' },
};
const leadershipDimensions = [
  { label: 'Capability', icon: '💡', description: 'The skills, business knowledge, exposure, critical thinking, and communication needed to solve complex problems.' },
  { label: 'Capacity', icon: '📈', description: 'The ability to visualize the future, navigate complexity, lead change, adapt, and scale effective ways of working.' },
  { label: 'Character', icon: '🧭', description: 'The values, courage, self-awareness, competitiveness, and intrinsic motivation that shape trusted leadership.' },
  { label: 'Customer Centricity', icon: '🤝', description: 'The ability to understand customers and markets, anticipate scenarios, shape strategy, and deliver measurable value.' },
  { label: 'Commercial Acumen', icon: '💰', description: 'The judgment to model opportunities, manage risk, evolve financial approaches, scale growth, and balance quality with profitability.' },
  { label: 'Cultural Equity', icon: '🌍', description: 'The ability to build trusted relationships, inspire belonging, collaborate inclusively, and develop people across boundaries.' },
];

const roles: Role[] = ['Employee', 'Manager', 'HR', 'Admin'];
const navByRole: Record<Role, { view: View; label: string; icon: typeof Home }[]> = {
  Employee: [{ view: 'home', label: 'Home', icon: Home }, { view: 'assessments', label: 'My Assessments', icon: ClipboardCheck }, { view: 'results', label: 'Results', icon: Sparkles }],
  Manager: [{ view: 'home', label: 'Home', icon: Home }, { view: 'manager', label: 'Manager Dashboard', icon: Users }, { view: 'results', label: 'Team Results', icon: Sparkles }],
  HR: [{ view: 'campaigns', label: 'Campaigns', icon: BriefcaseBusiness }, { view: 'dashboard', label: 'HR Dashboard', icon: LayoutDashboard }],
  Admin: [{ view: 'admin-access', label: 'Access Administration', icon: ShieldAlert }],
};

const overallRatings: OverallRating[] = [
  { value: '4', label: 'Exceeds expectations', maturity: 'Distinctive', description: 'Excellent Leadership & Strong Potential: Demonstrates exceptional strategic thinking and influence. Consistently exceeds goals and drives innovation. Inspires teams and influences stakeholders effectively. Creates measurable business impact beyond role scope. Demonstrates learning agility and proactive development of others.' },
  { value: '3', label: 'Meets expectations', maturity: 'Consistent', description: 'Solid Leadership & Emerging Potential: Delivers sustained performance aligned with organizational priorities. Leads teams effectively and supports talent development. Potential for growth into broader roles with targeted development. Displays adaptability and openness to feedback.' },
  { value: '2', label: 'Partially Meets Expectations', maturity: 'Emerging', description: 'Developing Leadership & Limited Potential: Meets most leadership expectations but with gaps in strategic thinking or people development. Requires coaching and structured development to progress. Potential exists but needs significant support and time.' },
  { value: '1', label: 'Does Not Meet Expectations', maturity: 'Not yet', description: 'Leadership at Risk & Low Potential: Struggles to fulfill leadership role requirements. Immediate intervention and performance improvement plan needed. Potential for future leadership roles is very low at present.' },
];

const buildSubmittedSampleRatings = (overrides: Record<string, string>): Record<string, string> => Object.fromEntries(
  factors.map((factor: Factor, index: number) => {
    const key = `${factor.name}::${factor.dimension}`;
    return [key, overrides[key] ?? String(2 + (index % 3 === 0 ? 1 : index % 5 === 0 ? 2 : 1))];
  }),
);

const managerEmployees: ManagerEmployee[] = [
  {
    id: 'employee-aisha', employeeEmail: 'aisha.thompson@example.com', managerEmail: 'manager@example.com', name: 'Aisha Thompson', title: 'Customer Experience Director', level: 'GCM 8', status: 'Due in 2 days',
    ratings: buildSubmittedSampleRatings({ 'Capability::Core Skills': '3', 'Capability::Business Accumen': '3', 'Capability::Exposure': '2', 'Capacity::Visualization': '3', 'Character::Beliefs and Values': '4', 'Customer Centricity::Knowledge': '3', 'Commercial Acumen::Risk': '2', 'Cultural Equity::Collaboration': '4' }),
    report: {
      summary: 'Aisha demonstrates strong customer advocacy, inclusive leadership, and disciplined delivery across complex service environments. Her document indicates emerging potential for broader enterprise scope, with readiness dependent on demonstrating greater commercial ownership and influence beyond her current region.',
      readiness: 'Ready for broader scope with targeted commercial development',
      strengths: ['Translates customer insight into practical operating priorities and measurable retention outcomes.', 'Builds trust across functions and creates an inclusive environment where teams contribute openly.', 'Maintains composure through change and provides clear direction during service-critical decisions.'],
      priorities: ['Quantify the commercial value and trade-offs behind customer transformation decisions.', 'Broaden influence through a cross-country initiative with shared executive stakeholders.', 'Build successor readiness by delegating a visible transformation workstream.'],
      gaps: ['Self-rating on Exposure is below the expected level for broader enterprise scope.', 'Strong collaboration document is not yet matched by examples of external or cross-border influence.', 'Risk decisions need clearer links to margin, investment, and measurable business advantage.'],
      outcomes: 'Current strengths support the objective to improve regional customer retention by three points. Stronger commercial scenarios and enterprise stakeholder document would connect leadership impact more directly to profitable growth.',
      actions: ['Present two quantified customer investment scenarios to the regional executive team.', 'Lead a cross-country customer experience workstream with a shared outcome scorecard.', 'Nominate and coach a successor to own one transformation milestone by Q4.'],
      topRepeatableStrengths: '1. Customer advocacy: Converts customer insight into operating priorities and measurable retention outcomes.\n2. Inclusive leadership: Builds trust across functions and creates space for teams to contribute openly.\n3. Change delivery: Maintains composure and clear direction during service-critical transformation decisions.',
      strengthsKpiAlignment: '- Customer advocacy directly supports the goal to improve regional retention by three points.\n- Cross-functional trust accelerates adoption of the transformation scorecard.\n- Disciplined delivery protects service quality while changes are implemented.',
      developmentPrioritiesAndSuccess: '1. Strengthen commercial ownership by quantifying margin, investment, and return for customer initiatives.\n2. Broaden enterprise influence through a cross-country workstream with shared executive stakeholders.\n3. Build succession depth by delegating a visible transformation milestone and measuring successor outcomes.',
      leveragingStrengthsForGrowth: '- Use customer insight skills to frame commercial scenarios around value, cost, and retention.\n- Apply inclusive facilitation to align cross-country stakeholders behind common measures.\n- Use delivery discipline to create clear decision rights for a developing successor.',
      developmentRecommendations: '- Present two quantified customer investment scenarios to the regional executive team.\n- Lead a cross-country customer experience workstream with a shared outcome scorecard.\n- Nominate and coach a successor to own one transformation milestone by Q4.',
      readinessForNextLevel: '- Demonstrate repeatable impact beyond the current region.\n- Make commercial trade-offs explicit in executive recommendations.\n- Show that team performance remains strong through delegated leadership.',
      creatingOrganizationalValue: '- Standardize the strongest customer-retention practices across regions.\n- Connect experience improvements to profitable growth and investment choices.\n- Build reusable succession practices for transformation teams.',
      supportingDocumentSummary: 'The sample assessment record supports customer advocacy, collaborative leadership, and calm delivery through change. Document is strongest for current-role customer and culture outcomes; enterprise commercial impact is represented by development objectives rather than completed results.',
      supportingDocumentAlignedStrengths: '- Customer insight is supported by the retention objective and customer experience examples.\n- Collaboration is supported by cross-functional delivery examples.\n- Change leadership is supported by service-critical decision examples.',
      answerSupportingDocumentGaps: '- Exposure: broader cross-border influence is claimed as a goal but not yet demonstrated by a completed enterprise initiative.\n- Commercial Acumen: risk decisions are not yet linked to quantified margin or return.\n- Succession: coaching intent is clear, but successor performance measures are not yet available.',
      supportingDocumentLimitations: 'This is a demonstration report based on seeded assessment examples, not uploaded source documents. No resume, 360 feedback, KPI pack, or stakeholder records were available; claims should be validated with observed performance and supporting files.',
    }
  },
  {
    id: 'employee-gabriel', employeeEmail: 'gabriel.chen@example.com', managerEmail: 'manager@example.com', name: 'Gabriel Chen', title: 'Commercial Strategy Director', level: 'GCM 8', status: 'New',
    ratings: { 'Capability::Core Skills': '4', 'Capability::Business Accumen': '4', 'Capability::Critical Thinking': '4', 'Capacity::Complexity': '3', 'Character::Self-awareness': '3', 'Customer Centricity::Strategy': '3', 'Commercial Acumen::Modeling': '4', 'Cultural Equity::Team Player': '2' },
    report: {
      summary: 'Gabriel shows strong commercial modelling, strategic problem solving, and confidence in complex decisions. The submitted document supports high impact in his current scope, while people development and inclusive team leadership require more consistent demonstration before promotion readiness can be confirmed.',
      readiness: 'Strong in role; broaden people leadership document before promotion',
      strengths: ['Builds commercially rigorous scenarios that clarify investment choices and growth paths.', 'Challenges established assumptions with structured critical thinking and practical alternatives.', 'Connects strategy to measurable financial outcomes and maintains focus in complex conditions.'],
      priorities: ['Demonstrate repeatable coaching and development outcomes across the leadership team.', 'Invite divergent perspectives earlier when shaping commercial recommendations.', 'Translate strategic models into customer-level adoption and value document.'],
      gaps: ['Team Player is materially below Gabriel’s commercial dimensions and may constrain broader leadership impact.', 'Self-awareness document describes intent more often than observed stakeholder feedback.', 'Customer strategy is sound, but submitted document does not consistently show realized customer value.'],
      outcomes: 'Gabriel’s commercial strengths align well to growth and margin objectives. Stronger talent outcomes and customer adoption measures would show that results are sustainable beyond his direct expertise.',
      actions: ['Create quarterly development plans for two successors and track delegated decisions.', 'Add customer adoption and value-realization measures to the commercial strategy scorecard.', 'Use structured dissent in the next investment review and document how it changed the recommendation.'],
      topRepeatableStrengths: '1. Commercial modelling: Builds rigorous scenarios that clarify investment choices and growth paths.\n2. Critical thinking: Challenges assumptions with structured analysis and practical alternatives.\n3. Strategic execution: Connects recommendations to measurable financial outcomes in complex conditions.',
      strengthsKpiAlignment: '- Commercial modelling supports growth and margin decisions with explicit trade-offs.\n- Critical thinking improves investment quality and risk visibility.\n- Strategic focus helps teams prioritize the initiatives with the greatest financial impact.',
      developmentPrioritiesAndSuccess: '1. Build repeatable coaching outcomes across the leadership team.\n2. Invite divergent perspectives earlier in commercial recommendation design.\n3. Translate strategic models into realized customer adoption and value measures.',
      leveragingStrengthsForGrowth: '- Apply modelling discipline to define measurable successor-development outcomes.\n- Use structured scenario analysis to incorporate dissenting stakeholder views.\n- Extend financial scorecards with customer adoption and value-realization indicators.',
      developmentRecommendations: '- Create quarterly development plans for two successors and track delegated decisions.\n- Add customer adoption and value-realization measures to the commercial strategy scorecard.\n- Use structured dissent in the next investment review and record how it changed the recommendation.',
      readinessForNextLevel: '- Demonstrate that strong results persist when decisions are delegated.\n- Build an inclusive leadership pattern supported by stakeholder feedback.\n- Show customer value realization alongside financial model quality.',
      creatingOrganizationalValue: '- Share a reusable investment-scenario method with adjacent business units.\n- Develop successors who can independently lead complex commercial decisions.\n- Connect portfolio strategy to customer adoption, margin, and sustainable growth.',
      supportingDocumentSummary: 'The sample assessment record supports strong commercial modelling, critical thinking, and strategic decision quality. Document for people development, inclusive leadership, and realized customer value remains less complete than document for analytical capability.',
      supportingDocumentAlignedStrengths: '- Commercial modelling is supported by investment-choice and growth-path examples.\n- Critical thinking is supported by structured challenge and alternative-scenario examples.\n- Strategic execution is supported by explicit links to financial outcomes.',
      answerSupportingDocumentGaps: '- Cultural Equity: the Team Player rating is lower than commercial dimensions and lacks repeatable coaching outcomes.\n- Character: self-awareness is described through intent rather than observed stakeholder feedback.\n- Customer Centricity: strategy examples do not yet show consistent adoption or realized customer value.',
      supportingDocumentLimitations: 'This is a demonstration report based on seeded assessment examples, not uploaded source documents. No stakeholder feedback, customer adoption data, coaching records, or portfolio document files were available; findings require manager validation.',
    }
  },
  {
    id: 'employee-priya', employeeEmail: 'priya.nair@example.com', managerEmail: 'manager@example.com', name: 'Priya Nair', title: 'Transformation Delivery Director', level: 'GCM 7', status: 'Review ready',
    ratings: { 'Capability::Core Skills': '3', 'Capability::Presentation Skills': '3', 'Capacity::Visualization': '4', 'Capacity::Change Agenda': '4', 'Character::End goal clarity': '3', 'Customer Centricity::Operations': '3', 'Commercial Acumen::Quality': '3', 'Cultural Equity::Leadership': '4', 'Cultural Equity::Collaboration': '4' },
    report: {
      summary: 'Priya combines clear transformation vision, disciplined change delivery, and inclusive leadership to move complex programs forward. Her document indicates strong readiness for broader delivery scope, with further growth available through sharper commercial outcome ownership and enterprise-level influence.',
      readiness: 'Ready for expanded transformation scope with measurable commercial ownership',
      strengths: ['Creates a compelling future-state vision and translates it into an actionable change agenda.', 'Builds alignment across diverse teams and sustains momentum through complex delivery periods.', 'Protects quality and customer outcomes while coordinating multiple transformation dependencies.'],
      priorities: ['Quantify margin, productivity, and return outcomes for major transformation decisions.', 'Extend influence from program governance into enterprise portfolio prioritization.', 'Create repeatable successor pathways for critical transformation leadership roles.'],
      gaps: ['Commercial Quality is solid but needs stronger document of realized margin and productivity improvement.', 'Current examples show program influence more consistently than enterprise portfolio influence.', 'Succession activity is visible, but independently delivered successor outcomes are not yet fully measured.'],
      outcomes: 'Priya’s change leadership and collaboration support faster transformation adoption and more reliable delivery. Stronger financial benefit tracking and enterprise portfolio document would connect these strengths more directly to sustainable organizational value.',
      actions: ['Publish a benefit-realization scorecard linking transformation milestones to margin, productivity, and customer outcomes.', 'Lead one enterprise portfolio trade-off discussion with cross-business executive stakeholders.', 'Delegate a critical workstream to a successor and measure independent delivery, stakeholder confidence, and lessons learned.'],
      topRepeatableStrengths: '1. Transformation vision: Defines a practical future state and creates clarity around the change journey.\n2. Inclusive execution: Aligns diverse teams and maintains shared accountability across complex programs.\n3. Delivery discipline: Protects quality, customer outcomes, and milestone reliability during transformation.',
      strengthsKpiAlignment: '1. Transformation vision creates a clear line from strategic priorities to program milestones.\n2. Inclusive execution improves adoption and reduces cross-functional delivery friction.\n3. Delivery discipline supports quality, customer continuity, and predictable transformation outcomes.',
      developmentPrioritiesAndSuccess: '1. Strengthen commercial ownership by tracking margin, productivity, and return against transformation choices.\n2. Broaden enterprise influence by shaping portfolio priorities beyond the current program.\n3. Build succession depth by measuring independently delivered outcomes from delegated leaders.',
      leveragingStrengthsForGrowth: '1. Use future-state visualization to frame commercial benefit scenarios and investment trade-offs.\n2. Apply inclusive facilitation to align enterprise stakeholders around portfolio priorities.\n3. Extend delivery discipline into clear successor scorecards and decision rights.',
      developmentRecommendations: '1. Publish a monthly benefit-realization scorecard for the active transformation portfolio.\n2. Facilitate an enterprise investment review that compares value, risk, and capacity across initiatives.\n3. Assign a successor end-to-end ownership of one visible workstream with quarterly outcome reviews.',
      readinessForNextLevel: '1. Demonstrate repeatable business impact across multiple programs or business units.\n2. Make financial and capacity trade-offs explicit in executive recommendations.\n3. Show sustained delivery quality when key decisions and milestones are delegated.',
      creatingOrganizationalValue: '1. Standardize transformation governance practices that improve delivery predictability across teams.\n2. Connect change milestones to measurable customer, productivity, and financial value.\n3. Build a reusable pipeline of leaders capable of owning complex transformation work.',
      supportingDocumentSummary: '1. The sample assessment supports strong visualization, change leadership, collaboration, and disciplined delivery.\n2. Document is strongest for complex program execution.\n3. Quantified financial benefits, enterprise portfolio decisions, and successor outcomes require additional validation.',
      supportingDocumentAlignedStrengths: '1. Visualization is supported by future-state planning and change-roadmap examples.\n2. Cultural Equity is supported by cross-functional alignment and inclusive program governance.\n3. Customer operations are supported by quality and continuity measures during delivery.',
      answerSupportingDocumentGaps: '1. Commercial Acumen: quality is demonstrated, but realized margin and return measures are incomplete.\n2. Enterprise influence: current examples center on program governance rather than portfolio-level decisions.\n3. Succession: delegation activity is described, but independent successor outcomes are not yet fully demonstrated.',
      supportingDocumentLimitations: '1. This demonstration profile is based on seeded assessment examples rather than uploaded source documents.\n2. No verified benefit-realization pack, stakeholder feedback, or portfolio decision record was available.\n3. Succession conclusions require validation against observed delegated-delivery outcomes.',
    }
  },
];
const employeeRatings = [
  { value: '1', label: 'Not Yet', description: 'The behavior is not demonstrated consistently and requires focused development.' },
  { value: '2', label: 'Emerging', description: 'The behavior is demonstrated sometimes, with guidance or in familiar situations.' },
  { value: '3', label: 'Consistent', description: 'The behavior is demonstrated reliably and independently in the current role.' },
  { value: '4', label: 'Distinctive', description: 'The behavior is exceptional, sustained, and positively influences others beyond the current role.' },
];

const ratings = ['Not yet', 'Emerging', 'Consistent', 'Distinctive'];
const MIN_REFLECTION_ENTRIES = 3;
const MAX_REFLECTION_ENTRIES = 10;
const EMPLOYEE_MAX_FILE_SIZE_BYTES = 1024 * 1024;

const completedEntryCount = (items: string[]) => items.filter((item: string) => item.trim().length > 0).length;
const hasValidReflectionEntries = (items: string[]) => completedEntryCount(items) >= MIN_REFLECTION_ENTRIES && completedEntryCount(items) <= MAX_REFLECTION_ENTRIES && completedEntryCount(items) === items.length;

const normalizeEmail = (value: string | null | undefined) => {
  if (!value) return '';
  const trimmedValue = value.trim().toLowerCase();
  const claimsEmail = trimmedValue.includes('|') ? trimmedValue.split('|').at(-1) ?? trimmedValue : trimmedValue;
  return claimsEmail.replace(/^mailto:/, '');
};

const toNumberedBullets = (text: string) => {
  const explicitItems = text
    .split('\n')
    .map((line: string) => line.trim().replace(/^(?:\d+[.)]|[-•*])\s*/, ''))
    .filter((line: string) => line.length > 0);
  const items = explicitItems.length > 1
    ? explicitItems
    : (explicitItems[0] ?? '')
      .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
      .map((sentence: string) => sentence.trim())
      .filter((sentence: string) => sentence.length > 0);
  return items.map((item: string, index: number) => `${index + 1}. ${item}`).join('\n');
};

const calculateOverallScore = (ratingValues: string[]): number => {
  const completedRatings = ratingValues
    .map((rating: string) => Number(rating))
    .filter((rating: number) => Number.isFinite(rating) && rating > 0);
  if (completedRatings.length === 0) return 0;
  const average = completedRatings.reduce((total: number, rating: number) => total + rating, 0) / completedRatings.length;
  return Math.round(average * 10) / 10;
};

const calculateDevelopmentInsightsScore = (sections: { score: number }[]): number => {
  const completedScores = sections
    .map((section: { score: number }) => section.score)
    .filter((score: number) => Number.isFinite(score) && score > 0);
  if (completedScores.length === 0) return 0;
  const average = completedScores.reduce((total: number, score: number) => total + score, 0) / completedScores.length;
  return Math.round(average * 10) / 10;
};

const buildScoredReportSections = (report: EmployeeDevelopmentRecommendations, factorScores: { factor: string; score: number }[]) => {
  const availableScores = factorScores.filter((item: { factor: string; score: number }) => item.score > 0);
  const overallScore = availableScores.length > 0
    ? availableScores.reduce((total: number, item: { factor: string; score: number }) => total + item.score, 0) / availableScores.length
    : 0;
  const scoreFor = (names: string[]) => {
    const matchingScores = names
      .map((name: string) => factorScores.find((item: { factor: string; score: number }) => item.factor === name)?.score ?? 0)
      .filter((score: number) => score > 0);
    const score = matchingScores.length > 0
      ? matchingScores.reduce((total: number, value: number) => total + value, 0) / matchingScores.length
      : overallScore;
    return Math.round(score * 10) / 10;
  };
  const strongestScore = availableScores.length > 0 ? Math.max(...availableScores.map((item: { factor: string; score: number }) => item.score)) : 0;

  return [
    { title: 'Top Repeatable Strengths', body: toNumberedBullets(report.topRepeatableStrengths), score: Math.round(strongestScore * 10) / 10 },
    { title: 'Strengths and KPI Alignment', body: toNumberedBullets(report.strengthsKpiAlignment), score: scoreFor(['Capability', 'Customer Centricity', 'Commercial Acumen']) },
    { title: 'Development Priorities & Success', body: toNumberedBullets(report.developmentPrioritiesAndSuccess), score: scoreFor(['Capacity', 'Character']) },
    { title: 'Leveraging Strengths for Growth', body: toNumberedBullets(report.leveragingStrengthsForGrowth), score: scoreFor(['Capability', 'Capacity']) },
    { title: 'Development Recommendations', body: toNumberedBullets(report.developmentRecommendations), score: scoreFor(['Capacity', 'Character']) },
    { title: 'Readiness for the Next Level', body: toNumberedBullets(report.readinessForNextLevel), score: overallScore },
    { title: 'Creating Organizational Value', body: toNumberedBullets(report.creatingOrganizationalValue), score: scoreFor(['Customer Centricity', 'Commercial Acumen', 'Cultural Equity']) },
    { title: 'Supporting Documents summary', body: toNumberedBullets(report.supportingDocumentSummary), score: overallScore },
    { title: 'Supporting Documents-backed strengths', body: toNumberedBullets(report.supportingDocumentAlignedStrengths), score: Math.round(strongestScore * 10) / 10 },
    { title: 'Answer-to-Supporting Documents gaps', body: toNumberedBullets(report.answerSupportingDocumentGaps), score: scoreFor(['Capacity', 'Commercial Acumen']) },
    { title: 'Supporting Documents limitations', body: toNumberedBullets(report.supportingDocumentLimitations), score: overallScore },
  ];
};

const downloadManagerEmployeeReport = (employee: ManagerEmployee) => {
  const factorScores = factorNames.map((factorName: string) => {
    const scores = factors
      .filter((factor: Factor) => factor.name === factorName)
      .map((factor: Factor) => Number(employee.ratings[`${factor.name}::${factor.dimension}`]))
      .filter((score: number) => Number.isFinite(score) && score > 0);
    const score = scores.length > 0
      ? scores.reduce((total: number, value: number) => total + value, 0) / scores.length
      : 0;
    return { factor: factorName, score };
  });
  const sixCScore = calculateOverallScore(Object.values(employee.ratings));
  const scoredSections = buildScoredReportSections(employee.report, factorScores);
  const developmentInsightsScore = calculateDevelopmentInsightsScore(scoredSections);

  downloadLeadershipReportPdf(
    `${employee.name} leadership assessment`,
    employee.report.summary,
    scoredSections,
    {
      leaderName: employee.name,
      employeeId: employee.id,
      gcmLevel: employee.level,
      assessmentDate: format(new Date(), 'yyyy-MM-dd'),
      assessmentId: `manager-${employee.id}-${format(new Date(), 'yyyyMMdd')}`,
      reviewedBy: 'Manager View',
    },
    factorScores,
    sixCScore,
    developmentInsightsScore,
  );
  toast.success(`PDF downloaded for ${employee.name}`);
};



export default function HomePage() {
  return <LeadershipAssessmentApp />;
}

function LeadershipAssessmentApp() {
  const { data: user, isLoading: userLoading, isError: userError, refetch: refetchUser } = useUser();
  const normalizedEmail = normalizeEmail(user?.userPrincipalName);
  const { data: roleRecords } = useSharePointRoleRecords({ email: normalizedEmail, objectId: user?.objectId });
  const userDisplayName = user?.fullName?.trim() || user?.userPrincipalName?.split('@')[0] || 'Signed-in user';
  const userDisplayDetail = user?.userPrincipalName?.trim() || 'Microsoft 365 user';
  const employees = roleRecords?.employees ?? [];
  const directReports = roleRecords?.directReports ?? [];
  const hrUsers = roleRecords?.hrUsers ?? [];
  const managers = roleRecords?.managers ?? [];
  const admins = roleRecords?.admins ?? [];
  const signedInEmployee = employees.find((employee: SharePointEmployee) => employee.isActive === true);
  const employeeJobTitle = signedInEmployee?.jobTitle?.trim();
  const [selectedRole, setSelectedRole] = useState<Role>('HR');
  const defaultView: View = selectedRole === 'Admin' ? 'admin-access' : selectedRole === 'HR' ? 'dashboard' : 'home';
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [view, setView] = useState<View>('campaigns');
  const [managerRatings, setManagerRatings] = useState<Record<string, string>>({});
  const [managerComments, setManagerComments] = useState<Record<string, string>>({});
  const [overallManagerRating, setOverallManagerRating] = useState('');
  const [managerReviewAnalysis, setManagerReviewAnalysis] = useState<ManagerReviewAnalysis>();
  const [employeeRecommendations, setEmployeeRecommendations] = useState<EmployeeDevelopmentRecommendations>();
  const generateEmployeeRecommendations = useEmployeeDevelopmentRecommendations();
  const analyzeManagerReview = useManagerReviewAnalysis();
  const [overallManagerComment, setOverallManagerComment] = useState('');
  const [section, setSection] = useState(0);
  const [ratingsByFactor, setRatingsByFactor] = useState<Record<string, string>>({ 'Capability::Core Skills': '3', 'Capability::Business Accumen': '3', 'Capability::Exposure': '2' });
  const [comments, setComments] = useState<Record<string, string>>({ 'Capability::Core Skills': 'I apply cross-functional experience to solve complex regional operating challenges.' });
  const [strengths, setStrengths] = useState<string[]>(['Change leadership', 'Customer advocacy', 'People-centred execution']);
  const [development, setDevelopment] = useState<string[]>(['Quantify transformation outcomes', 'Broaden cross-border influence', 'Build enterprise succession depth']);

  const [objectives, setObjectives] = useState<string[]>(['Improve regional customer retention by 3 points', 'Deliver the transformation scorecard by Q4', 'Increase customer experience adoption across the region']);
  const [sharedDocument, setSharedDocument] = useState<EmployeeDocumentRecord[]>([
    { id: 'audit-manager-1', employeeId: 'employee-aisha', employeeName: 'Aisha Thompson', campaignName: '2026 Global Leadership Assessment', filename: 'customer-feedback-summary.docx', note: 'Observed customer leadership outcomes from the regional service review.', uploaderRole: 'Manager', uploaderName: 'Thomas Whitaker', uploadedAt: '2026-02-22T10:15:00.000Z' },
    { id: 'audit-hr-aisha-1', employeeId: 'employee-aisha', employeeName: 'Aisha Thompson', campaignName: '2026 Global Leadership Assessment', filename: 'hr-calibration-summary.pdf', note: 'Calibration panel notes confirming customer leadership impact and the agreed commercial development actions.', uploaderRole: 'HR', uploaderName: 'Priya Nair', uploadedAt: '2026-02-24T14:30:00.000Z' },
    { id: 'audit-hr-1', employeeId: signedInEmployee?.employeeId || user?.objectId || 'current-employee', employeeName: userDisplayName, campaignName: '2026 Global Leadership Assessment', filename: 'calibration-outcomes.pdf', note: 'HR Calibration document added after finalization and visible to the employee.', uploaderRole: 'HR', uploaderName: 'Priya Nair', uploadedAt: '2026-02-24T14:30:00.000Z' }
  ]);
  const addSharedDocument = (record: EmployeeDocumentRecord) => setSharedDocument((current: EmployeeDocumentRecord[]) => [record, ...current]);
  const [files, setFiles] = useState<UploadedSupportingDocumentFile[]>([]);
  const [isExtractingDocument, setIsExtractingDocument] = useState(false);
  const completion = useMemo(() => Math.round((Object.keys(ratingsByFactor).length / factors.length) * 100), [ratingsByFactor]);
  const activeView = view;
  const navigate = (next: View) => {
    setView(next);
    window.history.replaceState(null, '', '/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const goToEmployeeHome = () => {
    setSelectedRole('Employee');
    setView('home');
    window.history.replaceState(null, '', window.location.pathname);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const navigateWithCoach = (next: 'home' | 'assessments' | 'form' | 'results', nextSection?: number) => {
    if (next === 'form' && nextSection !== undefined) {
      if (section === 1 && nextSection > section && (!hasValidReflectionEntries(strengths) || !hasValidReflectionEntries(development) || !hasValidReflectionEntries(objectives))) {
        toast.error('Add 3 to 10 non-empty strengths, development areas, and objectives or KPIs before continuing');
        return;
      }
      setSection(nextSection);
    }
    navigate(next);
  };
  const selectRole = (nextRole: Role) => {
    setSelectedRole(nextRole);
    const nextView = nextRole === 'Admin' ? 'admin-access' : nextRole === 'HR' ? 'dashboard' : 'home';
    navigate(nextView);
  };
  const addInput = (kind: 'strength' | 'development' | 'objective') => {
    if (kind === 'strength' && strengths.length < MAX_REFLECTION_ENTRIES) setStrengths([...strengths, '']);
    if (kind === 'development' && development.length < MAX_REFLECTION_ENTRIES) setDevelopment([...development, '']);
    if (kind === 'objective' && objectives.length < MAX_REFLECTION_ENTRIES) setObjectives([...objectives, '']);
  };
  const managerVisibleEmployees = useMemo<ManagerEmployee[]>(() => {
    const dummyDirectReports: SharePointEmployee[] = managerEmployees.map((employee: ManagerEmployee) => ({
      employeeId: employee.id, employeeEmail: employee.employeeEmail, employeeName: employee.name, jobTitle: employee.title,
      managerEmail: normalizedEmail, isActive: true,
    }));
    const visibleDirectReports = [
      ...directReports,
      ...dummyDirectReports.filter((dummy: SharePointEmployee) => !directReports.some((employee: SharePointEmployee) => normalizeEmail(employee.employeeEmail) === normalizeEmail(dummy.employeeEmail))),
    ];
    return visibleDirectReports.map((employee: SharePointEmployee) => {
      const reportRecord = managerEmployees.find((candidate: ManagerEmployee) => normalizeEmail(candidate.employeeEmail) === normalizeEmail(employee.employeeEmail));
      return {
        id: employee.employeeId || employee.employeeEmail, employeeEmail: employee.employeeEmail, managerEmail: employee.managerEmail,
        name: employee.employeeName || employee.employeeEmail, title: employee.jobTitle || 'Employee', level: reportRecord?.level ?? 'GCM level not available',
        status: reportRecord?.status ?? 'Assessment details pending', ratings: reportRecord?.ratings ?? {},
        report: reportRecord?.report ?? {
          summary: 'Assessment details will appear after this employee submits their 6C Self-Assessment.', readiness: 'Assessment pending', strengths: [], priorities: [], gaps: [], outcomes: 'No assessment outcome is available yet.', actions: [],
          topRepeatableStrengths: 'Awaiting completed assessment document.', strengthsKpiAlignment: 'Awaiting completed assessment document.', developmentPrioritiesAndSuccess: 'Awaiting completed assessment document.', leveragingStrengthsForGrowth: 'Awaiting completed assessment document.', developmentRecommendations: 'Complete the assessment to generate recommendations.', readinessForNextLevel: 'Complete the employee assessment to generate next-level guidance; optional manager input can enrich it.', creatingOrganizationalValue: 'Complete the assessment to generate organizational value guidance.', supportingDocumentSummary: 'No document is available yet.', supportingDocumentAlignedStrengths: 'No document-supported strengths are available yet.', answerSupportingDocumentGaps: 'No answer-to-document comparison is available yet.', supportingDocumentLimitations: 'No document files were submitted for analysis.',
        },
      };
    });
  }, [directReports, normalizedEmail]);
  const authorizedChatData = useMemo(() => {
    if (selectedRole === 'Employee') {
      const employeeId = signedInEmployee?.employeeId || user?.objectId || 'current-employee';
      return JSON.stringify({
        scope: 'Signed-in employee only',
        employee: { id: employeeId, name: userDisplayName, jobTitle: employeeJobTitle || 'Role not provided' },
        assessment: { ratingsByDimension: ratingsByFactor, reflectionsByDimension: comments, strengths, developmentAreas: development, objectivesAndKpis: objectives, completionPercent: completion },
        supportingDocuments: [
          ...files.map((file: UploadedSupportingDocumentFile) => ({ filename: file.name, extractionStatus: file.extractionStatus, extractedText: file.extractedText })),
          ...sharedDocument.filter((record: EmployeeDocumentRecord) => record.employeeId === employeeId).map((record: EmployeeDocumentRecord) => ({ filename: record.filename, note: record.note, uploadedBy: record.uploaderRole, uploadedAt: record.uploadedAt })),
        ],
        generatedAnalysis: employeeRecommendations ?? null,
      });
    }
    const scopedEmployees = selectedRole === 'Manager'
      ? managerVisibleEmployees
      : managerEmployees.filter((employee: ManagerEmployee) => globalCampaignParticipants.some((participant: CampaignParticipant) => participant.employeeId === employee.id));
    const hrCampaignSnapshot = selectedRole === 'HR' ? {
      campaign: {
        id: 'campaign-global-2026',
        name: '2026 Global Key Talent Assessment',
        type: 'Key Talent',
        status: 'Open',
        period: '12 Jan–31 Mar 2026',
      },
      cohortSummary: {
        totalParticipants: globalCampaignParticipants.length,
        completed: globalCampaignParticipants.filter((participant: CampaignParticipant) => participant.status === 'Completed').length,
        employeeSubmitted: globalCampaignParticipants.filter((participant: CampaignParticipant) => participant.status === 'Employee submitted').length,
        inManagerOrHrReview: globalCampaignParticipants.filter((participant: CampaignParticipant) => participant.status === 'Manager Review' || participant.status === 'HR Calibration').length,
        inProgress: globalCampaignParticipants.filter((participant: CampaignParticipant) => participant.status === 'In progress').length,
        notStarted: globalCampaignParticipants.filter((participant: CampaignParticipant) => participant.status === 'Not started').length,
        assessmentProfilesAvailable: scopedEmployees.length,
      },
      participantStatus: globalCampaignParticipants.map((participant: CampaignParticipant) => ({
        employeeId: participant.employeeId,
        name: participant.name,
        title: participant.title,
        level: participant.level,
        manager: participant.manager,
        status: participant.status,
        updated: participant.updated,
      })),
    } : undefined;
    return JSON.stringify({
      scope: selectedRole === 'Manager' ? 'Direct reports only' : 'Employees in managed campaign cohort only',
      campaignSnapshot: hrCampaignSnapshot,
      employees: scopedEmployees.map((employee: ManagerEmployee) => ({
        id: employee.id,
        name: employee.name,
        title: employee.title,
        level: employee.level,
        status: globalCampaignParticipants.find((participant: CampaignParticipant) => participant.employeeId === employee.id)?.status ?? employee.status,
        ratingsByDimension: employee.ratings,
        summary: employee.report.summary,
        readiness: employee.report.readiness,
        strengths: employee.report.strengths,
        developmentPriorities: employee.report.priorities,
        gaps: employee.report.gaps,
        recommendedActions: employee.report.actions,
        supportingDocuments: sharedDocument
          .filter((record: EmployeeDocumentRecord) => record.employeeId === employee.id)
          .map((record: EmployeeDocumentRecord) => ({ filename: record.filename, note: record.note, uploadedBy: record.uploaderRole, uploadedAt: record.uploadedAt })),
      })),
    });
  }, [comments, completion, development, employeeJobTitle, employeeRecommendations, files, managerVisibleEmployees, objectives, ratingsByFactor, selectedRole, sharedDocument, signedInEmployee?.employeeId, strengths, user?.objectId, userDisplayName]);
  const selectedEmployee = managerVisibleEmployees.find((employee: ManagerEmployee) => employee.id === selectedEmployeeId);
  const openManagerDetails = (employeeId: string) => {
    if (!managerVisibleEmployees.some((employee: ManagerEmployee) => employee.id === employeeId)) return;
    setSelectedEmployeeId(employeeId);
    navigate('manager-details');
  };
  const openManagerReview = (employeeId: string) => {
    if (!managerVisibleEmployees.some((employee: ManagerEmployee) => employee.id === employeeId)) return;
    setSelectedEmployeeId(employeeId);
    setManagerRatings({});
    setManagerReviewAnalysis(undefined);
    setManagerComments({});
    setOverallManagerRating('');
    setOverallManagerComment('');
    navigate('manager-review');
  };

  const submitManagerReview = async () => {
    if (Object.keys(managerRatings).length < factors.length || !overallManagerRating) {
      toast.error('Complete all 30 manager ratings and the overall rating before submitting');
      return;
    }
    if (!selectedEmployee) return;
    const ratingComparison = factors.map((factor: Factor) => {
      const key = `${factor.name}::${factor.dimension}`;
      const employeeRating = Number(selectedEmployee.ratings[key] ?? '3');
      const managerRating = Number(managerRatings[key]);
      const gap = managerRating - employeeRating;
      return `${factor.name} / ${factor.dimension}: employee ${employeeRating}, manager ${managerRating}, gap ${gap > 0 ? '+' : ''}${gap}`;
    }).join('\n');
    const managerSupportingDocument = factors.map((factor: Factor) => {
      const key = `${factor.name}::${factor.dimension}`;
      return managerComments[key]?.trim() ? `${factor.name} / ${factor.dimension}: ${managerComments[key].trim()}` : '';
    }).filter((comment: string) => comment.length > 0).join('\n');
    try {
      const analysis = await analyzeManagerReview.mutateAsync({
        employeeName: selectedEmployee.name,
        jobTitle: selectedEmployee.title,
        overallManagerRating: `${overallManagerRating} · ${overallRatings.find((rating: OverallRating) => rating.value === overallManagerRating)?.label ?? 'Rated'}`,
        overallManagerComment,
        ratingComparison,
        managerSupportingDocument,
      });
      setManagerReviewAnalysis(analysis);
      toast.success('Manager Review submitted; employee strengths and gaps identified');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'The AI review analysis could not be generated');
    }
  };
  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (selectedFiles.length === 0) return;
    const oversizedFiles = selectedFiles.filter((file: File) => file.size > EMPLOYEE_MAX_FILE_SIZE_BYTES);
    if (oversizedFiles.length > 0) {
      toast.error(`${oversizedFiles.map((file: File) => file.name).join(', ')} exceed${oversizedFiles.length === 1 ? 's' : ''} the 1 MB per-file limit`);
      return;
    }
    setIsExtractingDocument(true);
    try {
      const parsedFiles = await Promise.all(selectedFiles.map((file: File) => extractSupportingDocumentFile(file)));
      setFiles((current: UploadedSupportingDocumentFile[]) => [...current, ...parsedFiles]);
      const limitedCount = parsedFiles.filter((file: UploadedSupportingDocumentFile) => file.extractionStatus === 'limited').length;
      if (limitedCount > 0) toast.warning(`${limitedCount} file${limitedCount === 1 ? '' : 's'} had limited extractable text`);
      else toast.success('Document extracted and ready for analysis');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Document files could not be processed');
    } finally {
      setIsExtractingDocument(false);
    }
  };
  if (userLoading) {
    return <div className="min-h-screen bg-background text-foreground"><main className="mx-auto grid min-h-screen max-w-xl place-items-center px-4"><Card className="w-full"><CardHeader><CardTitle>Loading Your Workspace</CardTitle><CardDescription>We’re retrieving your Microsoft 365 identity.</CardDescription></CardHeader><CardContent><Progress value={65} aria-label="Loading workspace" /></CardContent></Card></main></div>;
  }
  if (userError) {
    return <div className="min-h-screen bg-background text-foreground"><main className="mx-auto grid min-h-screen max-w-xl place-items-center px-4"><Card className="w-full border-l-4 border-l-destructive"><CardHeader><CardTitle>Your Identity Could Not Be Verified</CardTitle><CardDescription>Microsoft 365 did not return the signed-in account.</CardDescription></CardHeader><CardContent><Button onClick={() => void refetchUser()}><RefreshCw />Try Again</Button></CardContent></Card></main></div>;
  }

  const submit = async () => {
    const uploadedSupportingDocument = files.map((file: UploadedSupportingDocumentFile, index: number) => {
      const content = file.extractedText || '[No meaningful text could be extracted from this file.]';
      return `File ${index + 1}: ${file.name}\nExtraction status: ${file.extractionStatus}\nContent: ${content}`;
    }).join('\n\n');
    if (completion < 100) { toast.error('Rate all 30 questions before submitting'); return; }
    if (!hasValidReflectionEntries(strengths) || !hasValidReflectionEntries(development) || !hasValidReflectionEntries(objectives)) {
      toast.error('Add 3 to 10 non-empty strengths, development areas, and objectives or KPIs');
      return;
    }

    const ratingSummary = factors.map((factor: Factor) => {
      const key = `${factor.name}::${factor.dimension}`;
      return `${factor.name} / ${factor.dimension}: ${ratingsByFactor[key]} of 4`;
    }).join('\n');
    const reflectionSummary = factors.map((factor: Factor) => {
      const key = `${factor.name}::${factor.dimension}`;
      return comments[key]?.trim() ? `${factor.name} / ${factor.dimension}: ${comments[key].trim()}` : '';
    }).filter((reflection: string) => reflection.length > 0).join('\n');
    try {
      const recommendations = await generateEmployeeRecommendations.mutateAsync({
        employeeName: userDisplayName,
        jobTitle: employeeJobTitle || 'Role not provided',
        ratings: ratingSummary,
        reflections: reflectionSummary,
        strengths: strengths.map((strength: string, index: number) => `${index + 1}. ${strength.trim()}`).join('\n'),
        developmentAreas: development.map((area: string, index: number) => `${index + 1}. ${area.trim()}`).join('\n'),
        uploadedSupportingDocument,
        objective: objectives.map((item: string, index: number) => `${index + 1}. ${item.trim()}`).join('\n'),
      });
      setEmployeeRecommendations(recommendations);
      toast.success('Assessment submitted and development recommendations generated');
      navigate('results');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Development recommendations could not be generated');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="atos-protobar">
        <span className="font-bold uppercase tracking-wider">Prototype</span>
        <span>Atos 6C Leadership Assessment</span>
        <span className="ml-auto hidden text-muted-foreground md:inline">Role-aware assessment workspace</span>
      </div>
      <header className="atos-topbar">
        <div className="mx-auto flex max-w-[1440px] flex-col px-4 lg:px-6">
          <div className="flex min-h-16 items-center gap-5">
            <button className="flex shrink-0 items-center gap-3 bg-transparent text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => navigate(defaultView)} aria-label="Open 6C Leadership Assessment home">
              <span className="text-2xl font-extrabold tracking-[-0.08em] text-foreground">atos</span>
              <span className="h-6 w-px bg-border" aria-hidden="true" />
              <span className="hidden text-sm font-semibold sm:inline">6C Leadership Assessment</span>
            </button>
            <nav className="hidden min-w-0 flex-1 items-stretch overflow-x-auto lg:flex" aria-label={`${selectedRole} navigation`}>
              {navByRole[selectedRole].map(({ view: itemView, label, icon: Icon }: { view: View; label: string; icon: typeof Home }) => (
                <button key={itemView} type="button" className="atos-nav-button inline-flex items-center gap-2 hover:text-accent-foreground" aria-current={activeView === itemView ? 'page' : undefined} onClick={() => navigate(itemView)}><Icon className="size-4" />{label}</button>
              ))}
            </nav>
            <div className="ml-auto flex shrink-0 items-center gap-3">
              <div className="hidden text-right xl:block">
                <p className="text-sm font-semibold">{userDisplayName}</p>
                <p className="text-xs text-muted-foreground">{userDisplayDetail}</p>
              </div>
              <span className="grid size-10 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground" aria-label={userDisplayName}>{userDisplayName.split(' ').map((part: string) => part[0]).join('').slice(0, 2).toUpperCase()}</span>
              <Select value={selectedRole} onValueChange={(value: Role) => selectRole(value)}>
                <SelectTrigger className="w-32 border-2 border-primary bg-background text-foreground sm:w-40" aria-label="Select application role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {roles.filter((roleOption: Role) => roleOption.length > 0).map((roleOption: Role) => (
                    <SelectItem key={roleOption} value={roleOption}>{roleOption}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto border-t lg:hidden" aria-label={`${selectedRole} mobile navigation`}>
            {navByRole[selectedRole].map(({ view: itemView, label, icon: Icon }: { view: View; label: string; icon: typeof Home }) => (
              <button key={itemView} type="button" className="atos-nav-button inline-flex items-center gap-2" aria-current={activeView === itemView ? 'page' : undefined} onClick={() => navigate(itemView)}><Icon className="size-4" />{label}</button>
            ))}
          </nav>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-[1180px] px-5 pb-20 pt-7">
        {selectedRole !== 'Admin' && <EmployeeCoach role={selectedRole} view={activeView} section={section} authorizedEmployeeData={authorizedChatData} onNavigate={selectedRole === 'Employee' ? navigateWithCoach : undefined} />}
        {activeView === 'home' && <HomeView role={selectedRole} navigate={navigate} completion={completion} directReportCount={managerVisibleEmployees.length} />}
        {activeView === 'assessments' && <AssessmentsView navigate={navigate} completion={completion} />}
        {activeView === 'form' && <AssessmentForm section={section} setSection={setSection} ratingsByFactor={ratingsByFactor} setRatingsByFactor={setRatingsByFactor} comments={comments} setComments={setComments} strengths={strengths} setStrengths={setStrengths} development={development} setDevelopment={setDevelopment} objectives={objectives} setObjectives={setObjectives} files={files} setFiles={setFiles} addInput={addInput} upload={upload} completion={completion} isExtractingDocument={isExtractingDocument} isSubmitting={generateEmployeeRecommendations.isPending} submit={() => { void submit(); }} />}
        {activeView === 'manager' && <ManagerView employees={managerVisibleEmployees} onDetails={openManagerDetails} />}
        {activeView === 'manager-details' && selectedEmployee && <ManagerDetails employee={selectedEmployee} document={sharedDocument.filter((record: EmployeeDocumentRecord) => record.employeeId === selectedEmployee.id)} uploaderName={userDisplayName} onAddDocument={addSharedDocument} onReview={openManagerReview} navigate={navigate} />}
        {activeView === 'manager-details' && !selectedEmployee && <ManagerEmptyState navigate={navigate} />}
        {activeView === 'manager-review' && selectedEmployee && <ManagerReview employee={selectedEmployee} managerRatings={managerRatings} setManagerRatings={setManagerRatings} managerComments={managerComments} setManagerComments={setManagerComments} overallRating={overallManagerRating} setOverallRating={setOverallManagerRating} overallComment={overallManagerComment} setOverallComment={setOverallManagerComment} analysis={managerReviewAnalysis} isAnalyzing={analyzeManagerReview.isPending} submit={() => { void submitManagerReview(); }} navigate={navigate} />}
        {activeView === 'manager-review' && !selectedEmployee && <ManagerEmptyState navigate={navigate} />}
        {activeView === 'results' && <ResultsView role={selectedRole} employees={selectedRole === 'Manager' ? managerVisibleEmployees : managerEmployees} onOpenReport={openManagerReview} employeeRecommendations={employeeRecommendations} navigate={navigate} onHome={goToEmployeeHome} leaderName={userDisplayName} employeeId={signedInEmployee?.employeeId || user?.objectId || 'current-employee'} gcmLevel={signedInEmployee?.jobTitle?.match(/GCM\s*\d+/i)?.[0]?.toUpperCase() || 'GCM level not provided'} ratingsByFactor={ratingsByFactor} document={sharedDocument.filter((record: EmployeeDocumentRecord) => record.employeeId === (signedInEmployee?.employeeId || user?.objectId || 'current-employee'))} onAddDocument={addSharedDocument} />}
        {activeView === 'campaigns' && <CampaignsView document={sharedDocument} uploaderName={userDisplayName} onAddDocument={addSharedDocument} />}
        {activeView === 'dashboard' && <HrDashboard />}
        {activeView === 'admin-access' && <AdminAccessView employees={employees} managers={managers} hrUsers={hrUsers} admins={admins} />}
      </main>
    </div>
  );
}

function HomeView({ role, navigate, completion, directReportCount }: { role: Role; navigate: (view: View) => void; completion: number; directReportCount: number }) {
  const portfolio = role === 'Employee'
    ? { eyebrow: 'Atos · Leadership Potential Assessment Program', title: '6C Leadership Potential Assessment Framework', description: 'A single, standardized language for leadership readiness — built for people leaders at GCM 7 and above — combining structured self-reflection with document drawn directly from your own professional record.', action: 'Continue assessment', actionView: 'form' as View, metrics: [{ label: 'Assessment Progress', value: `${completion}%`, note: `${Math.round((completion / 100) * factors.length)} of ${factors.length} dimensions rated`, icon: Target }, { label: 'Current version', value: '03', note: 'Latest draft', icon: ClipboardCheck }, { label: 'Campaign closes', value: '31 Mar', note: '20 days remaining', icon: BriefcaseBusiness }] }
    : role === 'Manager'
      ? { eyebrow: 'Your reporting team · Manager view', title: 'Direct report reviews', description: 'View assessment details only for employees who report to you in the SharePoint Employees list.', action: 'View direct reports', actionView: 'manager' as View, metrics: [{ label: 'Direct reports', value: String(directReportCount), note: 'Matched by ManagerEmail', icon: Users }, { label: 'Assessment details', value: String(directReportCount), note: 'Scoped to your team', icon: ClipboardCheck }] }
      : { eyebrow: '2026 Global Leadership Assessment', title: 'Executive portfolio', description: 'A consolidated view of employee submissions, optional manager contributions, and leadership readiness across the active campaign.', action: 'Open portfolio', actionView: 'dashboard' as View, metrics: [{ label: 'Campaign participation', value: '71%', note: '34 of 48 submitted', icon: Users }, { label: 'Manager Enhancements', value: '68%', note: '23 optional contributions', icon: Check }, { label: 'Employee follow-up', value: '6', note: 'Assessments still in progress', icon: CircleAlert }] };
  const stages = [{ label: 'Invited', value: 48, percent: 100 }, { label: 'Self-assessment submitted', value: 34, percent: 71 }, { label: 'Available to HR', value: 34, percent: 71 }, { label: 'Optional Manager Input added', value: 23, percent: 48 }];
  const [flippedDimension, setFlippedDimension] = useState<string>();
  return <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: 'easeOut' as const }} className="space-y-5">
    <section className="animated-top-panel overflow-hidden rounded-3xl border border-sidebar-border text-sidebar-foreground shadow-lg">
      <div className="relative z-10 grid lg:grid-cols-[1.45fr_0.55fr]">
        <div className="p-5 sm:p-6 lg:p-8">{role !== 'Employee' && <Badge variant="secondary">{portfolio.eyebrow}</Badge>}<h1 className={role === 'Employee' ? 'max-w-3xl text-3xl font-semibold text-foreground sm:text-4xl' : 'mt-3 max-w-3xl text-3xl font-semibold text-foreground sm:text-4xl'}>{portfolio.title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">{portfolio.description}</p><div className="mt-5 flex flex-wrap gap-3"><Button size="lg" onClick={() => navigate(portfolio.actionView)}>{portfolio.action}<ArrowRight /></Button><Button size="lg" variant="outline" className="border-sidebar-border bg-sidebar text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" onClick={() => navigate('results')}>View Latest Insights</Button></div></div>
        {role === 'HR' && <div className="border-t border-sidebar-border p-5 text-sidebar-foreground lg:border-l lg:border-t-0 lg:p-6"><p className="text-sm font-medium">Campaign Health</p><div className="mt-3 flex items-end gap-3"><span className="text-5xl font-semibold">71%</span><Badge variant="secondary">On Track</Badge></div><p className="mt-2 text-sm text-sidebar-foreground">Participation is 6 points ahead of the prior campaign at this stage.</p><Separator className="my-4 bg-sidebar-border" /><div className="flex items-center justify-between text-sm"><span>Next Governance Review</span><span className="font-semibold">18 Mar</span></div></div>}
      </div>
    </section>
    <section className={`grid gap-4 ${role === 'Manager' ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>{portfolio.metrics.map(({ label, value, note, icon: Icon }: { label: string; value: string; note: string; icon: typeof Home }) => <Card key={label} className="border-0 shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"><CardHeader className="pb-3"><div className="flex items-center justify-between"><CardDescription>{label}</CardDescription><span className="grid size-10 place-items-center rounded-xl bg-secondary text-secondary-foreground"><Icon className="size-4" /></span></div><CardTitle className="pt-3 text-3xl">{value}</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">{note}</p></CardContent></Card>)}</section>
    {role === 'Employee' && <section className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <Badge variant="secondary">The Six Dimensions</Badge>
          <h2 className="mt-2 text-2xl font-semibold">Explore Your Leadership Potential</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">Hover over a card or select it to reveal the definition. Select it again to return to the dimension name.</p>
        </div>
        <Button variant="outline" onClick={() => navigate('form')}>Open Assessment<ArrowRight /></Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Six leadership dimensions">
        {leadershipDimensions.map((dimension: { label: string; icon: string; description: string }, index: number) => {
          const isFlipped = flippedDimension === dimension.label;
          return (
            <motion.button
              key={dimension.label}
              type="button"
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2, ease: 'easeOut' as const }}
              className={`group h-40 w-full [perspective:1000px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${isFlipped ? '[&_.flip-card-inner]:[transform:rotateY(180deg)]' : ''}`}
              onClick={() => setFlippedDimension((current: string | undefined) => current === dimension.label ? undefined : dimension.label)}
              aria-pressed={isFlipped}
              aria-label={`${dimension.label}. ${isFlipped ? 'Showing definition; select to show name' : 'Select to show definition'}`}
            >
              <span className="flip-card-inner relative block size-full transition-transform duration-500 [transform-style:preserve-3d] motion-reduce:transition-none group-hover:[transform:rotateY(180deg)] group-focus-visible:[transform:rotateY(180deg)]">
                <span className={`absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-l-4 bg-card p-5 text-center text-card-foreground shadow-sm [backface-visibility:hidden] ${factorStyles[dimension.label].surface}`}>
                  <span className={`grid size-12 place-items-center rounded-xl text-xl shadow-sm ${factorStyles[dimension.label].progress}`} aria-hidden="true">{dimension.icon}</span>
                  <span className="mt-4 text-lg font-semibold">{dimension.label}</span>
                  <span className="absolute right-4 top-4 text-xs font-semibold text-muted-foreground">0{index + 1} / 06</span>
                </span>
                <span className={`absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-l-4 bg-card p-5 text-center text-card-foreground shadow-md [backface-visibility:hidden] [transform:rotateY(180deg)] ${factorStyles[dimension.label].surface}`}>
                  <span className="font-semibold">{dimension.label}</span>
                  <span className="mt-2 text-sm leading-5 text-muted-foreground">{dimension.description}</span>
                </span>
              </span>
            </motion.button>
          );
        })}
      </div>
      <div className="pt-2">
        <h2 className="text-2xl font-semibold">How It Works</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">Complete all 30 questions across the six dimensions, rated 1–4 against the official Atos performance scale.</p>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {[
          { number: '1', icon: '📎', title: 'Upload Your Document', description: 'Provide your Profile/Resume (required) and up to 3 supporting documents — e.g., a prior 360°, DISC/Gallup report, or certification — parsed entirely in your browser.' },
          { number: '2', icon: '✅', title: 'Complete Each Factor', description: 'Work through Capability, Capacity, Character, Customer Centricity, Commercial Acumen, and Cultural Equity in order, then your Top 3 Adjectives.' },
          { number: '3', icon: '📊', title: 'Receive Your Snapshot', description: 'Get an instant readiness band, document-backed strengths/development areas, and an executive-style PDF ready to share with your manager or HR.' },
        ].map((step: { number: string; icon: string; title: string; description: string }) => (
          <Card key={step.number} className="border-t-4 border-t-primary shadow-sm">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-full bg-primary text-lg font-bold text-primary-foreground">{step.number}</span>
                <span className="text-3xl" aria-hidden="true">{step.icon}</span>
              </div>
              <CardTitle className="pt-2">{step.title}</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5"><p className="text-sm leading-6 text-muted-foreground">{step.description}</p></CardContent>
          </Card>
        ))}
      </div>
      <Card className="border-l-4 border-l-accent-foreground">
        <CardHeader className="p-5 pb-3"><CardTitle>About This Framework</CardTitle></CardHeader>
        <CardContent className="space-y-3 px-5 pb-5 text-sm leading-6">
          <p>The 6C Framework gives a common, standardized language for leadership readiness across six factors — Capability, Capacity, Character, Customer Centricity, Commercial Acumen, and Cultural Equity — each broken into 5 dimensions (30 total), rated 1–4 against the official Atos performance scale.</p>
          <p>Click <strong>My 6C Assessment</strong> to review the Six Factors, upload your details, and work through each of the 6 C&apos;s in order, followed by your Top 3 Adjectives. Each factor unlocks only after the previous one is fully answered. You&apos;ll get an instant personal snapshot, plus the option to download an executive-style, paginated PDF summary, an XLS file, log a tracking row for HR, or prepare an email directly to your next-level manager with your HR SPOC copied.</p>
          <Alert className="border-l-4 border-l-primary">
            <ShieldAlert />
            <AlertTitle>Private, Document-Based Self-Reflection</AlertTitle>
            <AlertDescription>This tool does not use any external AI service, LinkedIn, social media, or internet search data about you. All document used to explain your results comes exclusively from documents that you personally upload, read and matched against factor-related keywords entirely in your own browser — nothing is uploaded to a server. This is an individual self-reflection tool only — it does not rank or compare you against any other named colleague.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </section>}
    <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
      {role === 'HR' && <Card><CardHeader className="flex-row items-start justify-between gap-4"><div><CardTitle>Assessment Portfolio</CardTitle><CardDescription>Employee submissions proceed directly to HR; manager input is an optional enhancement.</CardDescription></div><Button variant="ghost" size="sm" onClick={() => navigate('dashboard')}>View Detail<ArrowRight /></Button></CardHeader><CardContent className="space-y-5">{stages.map((stage: { label: string; value: number; percent: number }) => <div key={stage.label}><div className="mb-2 flex items-center justify-between text-sm"><span className="font-medium">{stage.label}</span><span className="text-muted-foreground">{stage.value} leaders · {stage.percent}%</span></div><Progress value={stage.percent} /></div>)}</CardContent></Card>}
      {role !== 'Manager' && <Card className="border-l-4 border-l-primary"><CardHeader><div className="flex items-center justify-between"><CardTitle>Leadership Signal</CardTitle><Sparkles className="size-5" /></div><CardDescription>Latest governed Copilot synthesis</CardDescription></CardHeader><CardContent className="space-y-5"><p className="text-sm leading-6">Customer advocacy and people-centred execution are consistent strengths. Commercial trade-off document remains the clearest portfolio development priority.</p><div className="rounded-lg bg-muted p-4 text-muted-foreground"><p className="text-xs font-medium">READINESS OUTLOOK</p><p className="mt-1 text-lg font-semibold text-foreground">Broader scope with targeted development</p></div><Button variant="outline" className="w-full" onClick={() => navigate('results')}>Open Consolidated Results<ArrowRight /></Button></CardContent></Card>}
    </section>
    {role === 'HR' && <Card><CardHeader><CardTitle>Priority Attention</CardTitle><CardDescription>Items requiring action before the next campaign checkpoint.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-3"><Priority number="01" title="Optional Manager Input" text="Invite manager context where it would strengthen development guidance." /><Priority number="02" title="Incomplete Assessments" text="Six leaders have started but not submitted." /><Priority number="03" title="HR Calibration" text="Eleven consolidated reports await final review." /></CardContent></Card>}
  </motion.div>;
}

function AssessmentsView({ navigate, completion }: { navigate: (view: View) => void; completion: number }) {
  return <div className="space-y-4"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 className="text-2xl font-semibold">My Assessments</h1><p className="text-muted-foreground">Previous versions are immutable and retained for history.</p></div><Button onClick={() => navigate('form')}><Plus />Start New Assessment</Button></div><Card><CardContent className="p-0"><div className="divide-y"><AssessmentRow version="3" status="Draft" date="Updated today" latest completion={completion} action={() => navigate('form')} /><AssessmentRow version="2" status="HR Review Pending" date="Submitted 16 Feb 2026" latest={false} completion={100} action={() => navigate('results')} /><AssessmentRow version="1" status="Superseded" date="Submitted 5 Feb 2026" latest={false} completion={100} action={() => navigate('results')} /></div></CardContent></Card></div>;
}
function AssessmentRow({ version, status, date, latest, completion, action }: { version: string; status: string; date: string; latest: boolean; completion: number; action: () => void }) { return <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"><div className="grid size-11 place-items-center rounded-xl bg-secondary text-secondary-foreground"><FileText /></div><div className="flex-1"><div className="flex items-center gap-2"><p className="font-medium">2026 Global Leadership Assessment · v{version}</p>{latest && <Badge>Latest</Badge>}</div><p className="text-sm text-muted-foreground">{date} · {status}</p></div><div className="flex items-center gap-3"><span className="text-sm">{completion}%</span><Button variant="outline" onClick={action}>{status === 'Draft' ? 'Continue' : 'View'}</Button></div></div>; }

function AssessmentForm(props: { section: number; setSection: (value: number) => void; ratingsByFactor: Record<string, string>; setRatingsByFactor: (value: Record<string, string>) => void; comments: Record<string, string>; setComments: (value: Record<string, string>) => void; strengths: string[]; setStrengths: (value: string[]) => void; development: string[]; setDevelopment: (value: string[]) => void; objectives: string[]; setObjectives: (value: string[]) => void; files: UploadedSupportingDocumentFile[]; setFiles: (value: UploadedSupportingDocumentFile[]) => void; addInput: (kind: 'strength' | 'development' | 'objective') => void; upload: (event: ChangeEvent<HTMLInputElement>) => void; completion: number; isExtractingDocument: boolean; isSubmitting: boolean; submit: () => void }) {
  const steps = ['6C questions', 'Strengths & Development Areas', 'Document', 'Review & Submit'];
  const [activeFactor, setActiveFactor] = useState(factorNames[0]);
  const strengthsCount = completedEntryCount(props.strengths);
  const developmentCount = completedEntryCount(props.development);
  const reflectionsComplete = hasValidReflectionEntries(props.strengths) && hasValidReflectionEntries(props.development) && hasValidReflectionEntries(props.objectives);
  const changeSection = (nextSection: number) => {
    if (props.section === 1 && nextSection > props.section && !reflectionsComplete) {
      toast.error('Add 3 to 10 non-empty strengths, development areas, and objectives or KPIs before continuing');
      return;
    }
    props.setSection(nextSection);
  };
  const saveDraft = () => {
    toast.success('Assessment draft saved');
  };
  const continueFromFactor = (factorIndex: number) => {
    const nextFactor = factorNames[factorIndex + 1];
    if (nextFactor) {
      setActiveFactor(nextFactor);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    changeSection(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  return <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]"><aside className="self-start rounded-xl border bg-card p-4 text-card-foreground shadow-sm lg:sticky lg:top-6"><p className="mb-3 text-sm font-medium">Assessment Progress</p><Progress value={props.section === 0 ? props.completion * 0.7 : 70 + props.section * 10} /><div className="mt-4 space-y-2">{steps.map((step: string, index: number) => <button key={step} onClick={() => changeSection(index)} className={`flex w-full items-center gap-3 rounded-lg p-3 text-left text-sm ${props.section === index ? 'bg-primary text-primary-foreground' : 'text-card-foreground hover:bg-muted hover:text-muted-foreground'}`}><span className="grid size-7 place-items-center rounded-full border">{index + 1}</span>{step}</button>)}</div></aside><section className="pb-24">
    {props.section === 0 && <Card className="mb-7 gap-0 overflow-hidden border-primary py-0 shadow-sm"><CardContent className="p-4 sm:p-5"><div className="w-full"><div className="mb-3 flex items-end justify-between gap-4"><div><p className="text-sm font-semibold">30-Question Progress</p><p className="mt-1 text-sm text-muted-foreground">Each color tracks one of the six leadership factors.</p></div><div className="shrink-0 text-right"><span className="text-3xl font-semibold">{Object.keys(props.ratingsByFactor).length}</span><span className="text-lg text-muted-foreground"> / {factors.length}</span></div></div><div className="grid grid-cols-6 gap-1.5" role="progressbar" aria-label="6C assessment progress" aria-valuemin={0} aria-valuemax={factors.length} aria-valuenow={Object.keys(props.ratingsByFactor).length}>{factorNames.map((factorName: string) => { const sectionFactors = factors.filter((factor: Factor) => factor.name === factorName); const completed = sectionFactors.filter((factor: Factor) => Boolean(props.ratingsByFactor[`${factor.name}::${factor.dimension}`])).length; return <div key={factorName} className="space-y-2"><div className="grid grid-cols-5 gap-1">{sectionFactors.map((factor: Factor, index: number) => { const isComplete = Boolean(props.ratingsByFactor[`${factor.name}::${factor.dimension}`]); return <span key={factor.dimension} title={`${factor.dimension}: ${isComplete ? 'Complete' : 'Not rated'}`} className={`h-4 rounded-sm transition-colors ${isComplete ? factorStyles[factorName].progress : 'bg-muted'}`} aria-label={`${factor.dimension}: ${isComplete ? 'complete' : 'not rated'}`}><span className="sr-only">Question {index + 1}</span></span>; })}</div><div className="text-center"><p className="truncate text-[10px] font-semibold sm:text-xs">{factorName}</p><p className="text-[10px] text-muted-foreground">{completed}/5</p></div></div>; })}</div><div className="mt-3 flex items-center justify-between border-t pt-2 text-xs text-muted-foreground"><span>{props.completion}% complete</span><span>{factors.length - Object.keys(props.ratingsByFactor).length} questions remaining</span></div></div></CardContent></Card>}
    {props.section === 0 && <div className="space-y-7"><div className="rounded-2xl border bg-card p-6 text-card-foreground shadow-sm sm:p-7"><Badge variant="secondary">Section 1 of 4</Badge><h1 className="mt-3 text-3xl font-semibold">6C Self-Assessment</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Rate every dimension under each factor. All 30 ratings are mandatory.</p></div><Tabs value={activeFactor} onValueChange={setActiveFactor}><TooltipProvider delayDuration={200}><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Six leadership dimensions">{leadershipDimensions.map((dimension: { label: string; icon: string; description: string }) => { const sectionFactors = factors.filter((factor: Factor) => factor.name === dimension.label); const completed = sectionFactors.filter((factor: Factor) => Boolean(props.ratingsByFactor[`${factor.name}::${factor.dimension}`])).length; const isActive = activeFactor === dimension.label; return <div key={dimension.label} className={`relative rounded-xl border border-l-4 bg-card text-card-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${factorStyles[dimension.label].surface} ${isActive ? 'ring-2 ring-ring' : ''}`}><button type="button" className="flex min-h-28 w-full items-start gap-3 p-4 pr-12 text-left" onClick={() => setActiveFactor(dimension.label)} aria-pressed={isActive}><span className={`grid size-10 shrink-0 place-items-center rounded-lg text-lg ${factorStyles[dimension.label].progress}`} aria-hidden="true">{dimension.icon}</span><span className="min-w-0"><span className="block font-semibold leading-5">{dimension.label}</span><span className="mt-2 block text-sm text-muted-foreground">{completed} of {sectionFactors.length} complete</span></span></button><Tooltip><TooltipTrigger asChild><button type="button" className="absolute right-3 top-3 grid size-8 place-items-center rounded-full border bg-background text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`About ${dimension.label}`}><Info className="size-4" /></button></TooltipTrigger><TooltipContent side="top" className="max-w-72 text-sm leading-5"><p className="font-semibold">{dimension.label}</p><p>{dimension.description}</p></TooltipContent></Tooltip></div>; })}</div></TooltipProvider><TabsList className="sr-only">{factorNames.filter((factorName: string) => factorName.length > 0).map((factorName: string) => <TabsTrigger key={factorName} value={factorName}>{factorName}</TabsTrigger>)}</TabsList>{factorNames.filter((factorName: string) => factorName.length > 0).map((factorName: string) => { const sectionFactors = factors.filter((factor: Factor) => factor.name === factorName); const completed = sectionFactors.filter((factor: Factor) => Boolean(props.ratingsByFactor[`${factor.name}::${factor.dimension}`])).length; return <TabsContent key={factorName} value={factorName} className="space-y-5"><div className="flex items-center justify-between"><div><h2 className="text-xl font-semibold">{factorName}</h2><p className="text-sm text-muted-foreground">Rate each approved dimension based on your current-role document.</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${factorStyles[factorName].progress}`}>{completed} of {sectionFactors.length}</span></div>{sectionFactors.map((factor: Factor, index: number) => { const responseKey = `${factor.name}::${factor.dimension}`; const nextResponseKey = index < sectionFactors.length - 1 ? `${sectionFactors[index + 1].name}::${sectionFactors[index + 1].dimension}` : undefined; const selectRating = (value: string) => { props.setRatingsByFactor({ ...props.ratingsByFactor, [responseKey]: value }); if (nextResponseKey) window.requestAnimationFrame(() => document.getElementById(`employee-question-${nextResponseKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })); }; return <Card id={`employee-question-${responseKey}`} key={responseKey} className={`scroll-mt-6 gap-0 border-l-4 py-0 shadow-none transition-shadow hover:shadow-sm ${factorStyles[factorName].surface}`}><CardHeader className="p-5 pb-3"><div className="flex items-start gap-3"><span className={`grid size-9 shrink-0 place-items-center rounded-lg text-sm font-semibold ${factorStyles[factorName].progress}`}>{index + 1}</span><div><CardTitle className="text-lg">{factor.dimension}</CardTitle><CardDescription className="mt-1 text-sm leading-5">{factor.definition}</CardDescription></div></div></CardHeader><CardContent className="space-y-5 px-5 pb-5"><div><div className="mb-2 flex items-center gap-2"><p className="font-medium">Your Rating *</p><TooltipProvider delayDuration={150}><Tooltip><TooltipTrigger asChild><button type="button" className="grid size-7 place-items-center rounded-full border bg-background text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="View rating definitions"><Info className="size-4" /></button></TooltipTrigger><TooltipContent side="right" className="max-w-sm space-y-3 p-4"><p className="font-semibold">Rating Definitions</p>{employeeRatings.map((rating: { value: string; label: string; description: string }) => <div key={rating.value} className="text-sm"><p className="font-semibold">{rating.value} · {rating.label}</p><p className="leading-5">{rating.description}</p></div>)}</TooltipContent></Tooltip></TooltipProvider></div><RadioGroup value={props.ratingsByFactor[responseKey]} onValueChange={selectRating} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{employeeRatings.map((rating: { value: string; label: string; description: string }) => <label key={rating.value} title={rating.description} className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition-colors ${props.ratingsByFactor[responseKey] === rating.value ? factorStyles[factorName].progress : 'bg-card text-card-foreground hover:bg-muted'}`}><RadioGroupItem value={rating.value} /><span className="whitespace-nowrap font-medium">{rating.value} - {rating.label}</span></label>)}</RadioGroup></div><div><label className="mb-2 block font-medium">Document or Reflection</label><Textarea className="min-h-9 resize-y py-2" value={props.comments[responseKey] ?? ''} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => props.setComments({ ...props.comments, [responseKey]: event.target.value })} placeholder="Add document and context for this rating" rows={1} /></div></CardContent></Card>; })}<div className="flex flex-wrap justify-end gap-3 border-t pt-4"><Button variant="outline" size="lg" onClick={saveDraft}>Save</Button><Button size="lg" onClick={() => continueFromFactor(factorNames.indexOf(factorName))}>{factorName === factorNames.at(-1) ? 'Save and Continue' : `Save and Continue to ${factorNames[factorNames.indexOf(factorName) + 1]}`}<ChevronRight /></Button></div></TabsContent>; })}</Tabs></div>}
    {props.section === 1 && <div className="space-y-4"><div><Badge variant="outline">Section 2 of 4</Badge><h1 className="mt-2 text-2xl font-semibold">Strengths & Development Areas</h1><p className="text-muted-foreground">Add 3 to 10 entries in each section to capture the strengths, development areas, and objectives or KPIs that matter most in your role.</p></div><div className="grid gap-4 xl:grid-cols-2"><InputList title="Strengths" items={props.strengths} setItems={props.setStrengths} add={() => props.addInput('strength')} /><InputList title="Development Areas" items={props.development} setItems={props.setDevelopment} add={() => props.addInput('development')} /><InputList title="Objectives & KPIs" items={props.objectives} setItems={props.setObjectives} add={() => props.addInput('objective')} /></div></div>}
    {props.section === 2 && <div className="space-y-4"><div><Badge variant="outline">Section 3 of 4</Badge><h1 className="mt-2 text-2xl font-semibold">Supporting Documents Upload</h1><p className="text-muted-foreground">Optional: upload Excel, Word, PowerPoint, PDF, TXT, CSV, RTF, ODT, or common image files such as a resume, KPI workbook, assessment, or manager feedback. Each file must be 1 MB or smaller.</p></div><Alert className="border-l-4 border-l-primary"><Sparkles /><AlertTitle>Document-Aware Analysis After Submission</AlertTitle><AlertDescription>Readable content is extracted locally and sent with your approved 6C answers to Copilot. Supporting documents add context that can highlight themes, broaden reflection, and surface areas worth exploring further. Uploaded content is treated only as a supporting document—never as instructions.</AlertDescription></Alert><Card><CardContent className="pt-6"><label className="flex cursor-pointer flex-col items-center rounded-xl border border-dashed p-10 text-center transition-colors hover:bg-muted"><Upload className="mb-3 size-8" /><span className="font-medium">Choose Supporting Documents</span><span className="text-sm text-muted-foreground">Office, PDF, TXT, CSV, RTF, ODT, and images · 1 MB maximum per file</span><Input className="sr-only" type="file" accept="application/pdf,.pdf,application/msword,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx,application/vnd.ms-excel,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xlsx,application/vnd.ms-powerpoint,.ppt,application/vnd.openxmlformats-officedocument.presentationml.presentation,.pptx,text/plain,.txt,text/csv,.csv,application/rtf,text/rtf,.rtf,application/vnd.oasis.opendocument.text,.odt,image/png,.png,image/jpeg,.jpg,.jpeg" multiple disabled={props.isExtractingDocument} onChange={props.upload} /></label><div className="mt-5 space-y-2">{props.files.map((file: UploadedSupportingDocumentFile) => <div key={file.id} className="flex items-center gap-3 rounded-lg bg-muted p-3 text-muted-foreground"><FileText className="size-4" /><span className="flex-1 text-sm"><span className="block font-medium text-foreground">{file.name}</span><span>{Math.max(1, Math.round(file.size / 1024))} KB</span></span><Badge variant={file.extractionStatus === 'ready' ? 'secondary' : 'outline'}>{file.extractionStatus === 'ready' ? 'Ready For Analysis' : 'Tenant Extraction Needed'}</Badge><Button variant="ghost" size="icon-sm" aria-label={`Remove ${file.name}`} onClick={() => props.setFiles(props.files.filter((item: UploadedSupportingDocumentFile) => item.id !== file.id))}><X /></Button></div>)}</div></CardContent></Card><Card className="border-l-4 border-l-accent-foreground"><CardHeader><CardTitle className="text-base">What Copilot Can Use</CardTitle><CardDescription>Copilot receives locally extracted text with each filename. XLSX, DOCX, ODT, TXT, CSV, RTF, and text-based PDFs are read in the browser. PowerPoint, legacy Office files, images, and scanned PDFs remain in the same analysis workflow and may require tenant extraction or OCR.</CardDescription></CardHeader></Card></div>}
    {props.section === 3 && <div className="space-y-4"><div><Badge variant="outline">Section 4 of 4</Badge><h1 className="mt-2 text-2xl font-semibold">Review & Submit</h1><p className="text-muted-foreground">Employee responses lock after submission. Copilot considers your answers alongside uploaded documents to generate personalized development insights and recommendations.</p></div><Card><CardHeader><CardTitle>Completeness</CardTitle></CardHeader><CardContent className="space-y-4"><div className="flex items-center justify-between"><span>6C Dimension Ratings</span><Badge variant={props.completion === 100 ? 'default' : 'destructive'}>{Object.keys(props.ratingsByFactor).length} of {factors.length}</Badge></div><Separator /><div className="flex items-center justify-between gap-4"><span>Strengths & Development Areas</span><Badge variant={reflectionsComplete ? 'secondary' : 'destructive'}>{reflectionsComplete ? 'Complete' : `${strengthsCount} strengths · ${developmentCount} development`}</Badge></div><Separator /><div className="flex items-center justify-between"><span>Document</span><div className="flex items-center gap-2"><Badge variant="outline">{props.files.length} files</Badge>{props.files.length > 0 && <Badge variant="secondary">Add Context To Insights</Badge>}</div></div></CardContent></Card><Alert className="border-l-4 border-l-primary"><Sparkles /><AlertTitle>Document-Informed Development Insights</AlertTitle><AlertDescription>Submission considers your ratings, reflections, strengths, development areas, role, objectives, and extracted documents together to offer supporting context, reflection themes, and focused development actions.</AlertDescription></Alert><Button size="lg" disabled={props.isSubmitting || props.isExtractingDocument} onClick={props.submit}>{props.isExtractingDocument ? 'Preparing document…' : props.isSubmitting ? 'Creating development insights…' : 'Submit & Create Insights'}<ArrowRight /></Button></div>}
    <div className="mt-6 flex flex-col justify-between gap-3 sm:flex-row"><Button variant="outline" disabled={props.section === 0} onClick={() => props.setSection(Math.max(0, props.section - 1))}><ChevronLeft />Back</Button>{props.section > 0 && props.section < 3 && <div className="flex flex-wrap justify-end gap-3"><Button variant="outline" onClick={saveDraft}>Save</Button><Button onClick={() => changeSection(Math.min(3, props.section + 1))}>Save and Continue<ChevronRight /></Button></div>}</div>
  </section></div>;
}

function InputList({ title, items, setItems, add }: { title: string; items: string[]; setItems: (value: string[]) => void; add: () => void }) {
  const completed = completedEntryCount(items);
  const prompt = title === 'Strengths'
    ? 'What are the top three adjectives that best describe your strengths?'
    : title === 'Development Areas'
      ? 'From your current role standpoint, what three areas do you feel need to be further developed or strengthened?'
      : 'What are the top three objectives or KPIs that matter most in your current role?';
  const borderStyle = title === 'Strengths' ? 'border-t-factor-culture' : title === 'Development Areas' ? 'border-t-factor-customer' : 'border-t-factor-commercial';
  return <Card className={`overflow-hidden border-t-8 ${borderStyle}`}><CardHeader className="flex-row items-start justify-between gap-4"><div className="min-w-0 flex-1"><CardTitle>{prompt}</CardTitle><CardDescription className="mt-6">Minimum 3 · Maximum 10 · {completed} complete</CardDescription></div><Button className="shrink-0" variant="outline" size="sm" disabled={items.length >= MAX_REFLECTION_ENTRIES} onClick={add}><Plus />Add</Button></CardHeader><CardContent className="space-y-3">{items.map((item: string, index: number) => <div key={`${title}-${index}`} className="flex gap-2"><Input value={item} placeholder={`${title} ${index + 1}`} onChange={(event: ChangeEvent<HTMLInputElement>) => setItems(items.map((value: string, itemIndex: number) => itemIndex === index ? event.target.value : value))} /><Button variant="ghost" size="icon" disabled={items.length <= MIN_REFLECTION_ENTRIES} aria-label={`Remove ${title.toLowerCase()} entry ${index + 1}`} onClick={() => setItems(items.filter((_: string, itemIndex: number) => itemIndex !== index))}><X /></Button></div>)}</CardContent></Card>;
}

function ManagerView({ employees, onDetails }: { employees: ManagerEmployee[]; onDetails: (employeeId: string) => void }) {
  return <div className="space-y-6"><div><h1 className="text-2xl font-semibold">Your Direct Reports</h1><p className="text-muted-foreground">Open an employee details page to review their profile, add supporting document, or add an optional manager perspective.</p></div><Card><CardContent className="p-0">{employees.length > 0 ? <div className="divide-y">{employees.map((employee: ManagerEmployee) => <div key={employee.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"><div className="grid size-11 place-items-center rounded-full bg-secondary text-secondary-foreground font-semibold">{employee.name.split(' ').map((part: string) => part[0]).join('')}</div><div className="flex-1"><p className="font-medium">{employee.name}</p><p className="text-sm text-muted-foreground">{employee.title} · {employee.level}</p><p className="mt-1 text-sm">{employee.employeeEmail}</p></div><Badge variant={employee.status.includes('Due') ? 'destructive' : 'secondary'}>{employee.status}</Badge><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => downloadManagerEmployeeReport(employee)}><FileText />Download PDF</Button><Button onClick={() => onDetails(employee.id)}>View Details</Button></div></div>)}</div> : <div className="p-8 text-center"><Users className="mx-auto mb-3 size-8" /><p className="font-medium">No Direct Reports Found</p><p className="mt-1 text-sm text-muted-foreground">No active Employees list records have your email in ManagerEmail.</p></div>}</CardContent></Card></div>;
}

function ManagerEmptyState({ navigate }: { navigate: (view: View) => void }) {
  return <Card className="mx-auto max-w-xl"><CardHeader><CardTitle>No Direct Report Selected</CardTitle><CardDescription>Open an employee from your manager dashboard. Only employees whose ManagerEmail matches your signed-in email are available.</CardDescription></CardHeader><CardContent><Button onClick={() => navigate('manager')}><ChevronLeft />Back to Direct Reports</Button></CardContent></Card>;
}

function CopilotManagerSummary({ employee }: { employee: ManagerEmployee }) {
  const report = employee.report;
  return <Card className="overflow-hidden border-l-4 border-l-primary"><CardHeader className="bg-muted text-muted-foreground"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><div className="flex items-center gap-2"><Sparkles className="size-5" /><CardTitle className="text-foreground">Copilot Leadership Summary</CardTitle></div><CardDescription>Initial analysis generated from approved 6C responses, objectives, role context, and uploaded document only.</CardDescription></div><Badge variant="secondary">Manager Confidential</Badge></div></CardHeader><CardContent className="space-y-6 pt-6"><div><p className="text-sm font-semibold">Potential Summary</p><p className="mt-2 text-sm leading-6">{report.summary}</p></div><div className="rounded-xl bg-primary p-5 text-primary-foreground"><p className="text-xs font-medium">READINESS GUIDANCE</p><p className="mt-1 text-lg font-semibold">{report.readiness}</p></div><div className="grid gap-6 lg:grid-cols-2"><SummaryList title="Strengths With Document" items={report.strengths} /><SummaryList title="Development Priorities" items={report.priorities} /><SummaryList title="Self-Assessment Signals and Gaps" items={report.gaps} /><SummaryList title="Recommended Manager Actions" items={report.actions} /></div><div className="rounded-xl bg-muted p-4 text-muted-foreground"><p className="text-sm font-semibold text-foreground">Business Outcome Alignment</p><p className="mt-2 text-sm leading-6">{report.outcomes}</p></div><Alert><ShieldAlert /><AlertTitle>Human Decision Required</AlertTitle><AlertDescription>This Copilot output is decision support, not a final promotion decision. Validate every conclusion against observed performance and add independent manager document on the employee details page.</AlertDescription></Alert></CardContent></Card>;
}

function ManagerDetails({ employee, document, uploaderName, onAddDocument, onReview, navigate }: { employee: ManagerEmployee; document: EmployeeDocumentRecord[]; uploaderName: string; onAddDocument: (record: EmployeeDocumentRecord) => void; onReview: (employeeId: string) => void; navigate: (view: View) => void }) {
  const sixCScore = calculateOverallScore(Object.values(employee.ratings));
  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><Badge variant="secondary">Employee Details · {employee.level}</Badge><h1 className="mt-2 text-2xl font-semibold">{employee.name}</h1><p className="text-muted-foreground">{employee.title} · {employee.employeeEmail}</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => downloadManagerEmployeeReport(employee)}><FileText />Download Employee PDF</Button><Button onClick={() => onReview(employee.id)}>Add Optional Manager Input<ArrowRight /></Button></div></div>
    <section className="grid gap-4 sm:grid-cols-3"><Metric label="Assessment status" value={employee.status} /><Metric label="6C Score" value={`${sixCScore.toFixed(1)} / 4`} /><Metric label="Ratings completed" value={`${Object.keys(employee.ratings).length} / 30`} /></section>
    <CopilotManagerSummary employee={employee} />
    <EmployeeDocumentPanel
      employeeId={employee.id}
      employeeName={employee.name}
      campaignName="2026 Global Leadership Assessment"
      uploaderRole="Manager"
      uploaderName={uploaderName}
      records={document}
      canUpload
      onAdd={onAddDocument}
    />

    <Button variant="outline" onClick={() => navigate('manager')}><ChevronLeft />Back to Direct Reports</Button>
  </div>;
}

function SummaryList({ title, items }: { title: string; items: string[] }) {
  return <div><p className="mb-3 text-sm font-semibold">{title}</p><div className="space-y-3">{items.map((item: string, index: number) => <div key={`${title}-${index}`} className="flex gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground text-xs font-semibold">{index + 1}</span><p className="text-sm leading-6 text-muted-foreground">{item}</p></div>)}</div></div>;
}

function ManagerReview({ employee, managerRatings, setManagerRatings, managerComments, setManagerComments, overallRating, setOverallRating, overallComment, setOverallComment, analysis, isAnalyzing, submit, navigate }: { employee: ManagerEmployee; managerRatings: Record<string, string>; setManagerRatings: (value: Record<string, string>) => void; managerComments: Record<string, string>; setManagerComments: (value: Record<string, string>) => void; overallRating: string; setOverallRating: (value: string) => void; overallComment: string; setOverallComment: (value: string) => void; analysis?: ManagerReviewAnalysis; isAnalyzing: boolean; submit: () => void; navigate: (view: View) => void }) {
  const managerCompletion = Math.round((Object.keys(managerRatings).length / factors.length) * 100);
  const gapRows = factors.map((factor: Factor) => { const key = `${factor.name}::${factor.dimension}`; const employeeRating = Number(employee.ratings[key] ?? '3'); const managerRating = managerRatings[key] ? Number(managerRatings[key]) : undefined; return { key, factor: factor.name, dimension: factor.dimension, employeeRating, managerRating, gap: managerRating === undefined ? undefined : managerRating - employeeRating }; });
  const sixCScore = calculateOverallScore(Object.values(employee.ratings));
  const developmentInsightsScore = calculateDevelopmentInsightsScore(buildScoredReportSections(employee.report, factorNames.map((factorName: string) => {
    const factorRatings = factors
      .filter((factor: Factor) => factor.name === factorName)
      .map((factor: Factor) => Number(employee.ratings[`${factor.name}::${factor.dimension}`]))
      .filter((rating: number) => Number.isFinite(rating) && rating > 0);
    return { factor: factorName, score: factorRatings.length > 0 ? factorRatings.reduce((total: number, rating: number) => total + rating, 0) / factorRatings.length : 0 };
  })));
  const completedGaps = gapRows.filter((row: { gap?: number }) => row.gap !== undefined);
  const alignedCount = completedGaps.filter((row: { gap?: number }) => row.gap === 0).length;
  const materialGapCount = completedGaps.filter((row: { gap?: number }) => Math.abs(row.gap ?? 0) >= 1).length;
  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><Badge variant="secondary">Manager Review · {employee.level}</Badge><h1 className="mt-2 text-2xl font-semibold">{employee.name}</h1><p className="text-muted-foreground">Optionally add an independent manager perspective to enrich the employee assessment. This does not block employee submission, results, or HR access.</p></div><div className="flex flex-col items-stretch gap-3 sm:items-end"><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-primary p-4 text-primary-foreground"><p className="text-xs font-semibold">6C SCORE</p><p className="mt-1 text-2xl font-semibold">{sixCScore.toFixed(1)} / 4</p><p className="mt-1 text-xs">Average of {Object.keys(employee.ratings).length} completed ratings</p></div><div className="rounded-xl bg-accent p-4 text-accent-foreground"><p className="text-xs font-semibold">11 DEVELOPMENT INSIGHTS</p><p className="mt-1 text-2xl font-semibold">{developmentInsightsScore.toFixed(1)} / 4</p><p className="mt-1 text-xs">Average of 11 insight ratings</p></div></div><Button variant="outline" onClick={() => downloadManagerEmployeeReport(employee)}><FileText />Download Employee PDF</Button><div className="min-w-48"><div className="mb-2 flex justify-between text-sm"><span>Review Progress</span><span>{managerCompletion}%</span></div><Progress value={managerCompletion} /></div></div></div>
    <Alert className="border-l-4 border-l-primary"><ClipboardCheck /><AlertTitle>Optional Manager Enhancement</AlertTitle><AlertDescription>Employee ratings and reflections are read-only and already proceed independently. If you choose to contribute, your completed ratings and comments add separate context to the analysis.</AlertDescription></Alert>
    <CopilotManagerSummary employee={employee} />
    {factorNames.map((factorName: string) => <Card key={factorName} className={`border-l-4 ${factorStyles[factorName].surface}`}><CardHeader><CardTitle>{factorName}</CardTitle><CardDescription>{factors.filter((factor: Factor) => factor.name === factorName).filter((factor: Factor) => Boolean(managerRatings[`${factor.name}::${factor.dimension}`])).length} of 5 manager ratings complete</CardDescription></CardHeader><CardContent className="space-y-5">{factors.filter((factor: Factor) => factor.name === factorName).map((factor: Factor) => { const key = `${factor.name}::${factor.dimension}`; const employeeRating = employee.ratings[key] ?? '3'; return <div key={key} className="rounded-xl border p-4"><div className="grid gap-5 xl:grid-cols-[1fr_1.25fr]"><div><p className="font-semibold">{factor.dimension}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{factor.definition}</p><div className="mt-3 rounded-lg bg-muted p-3 text-muted-foreground"><p className="text-xs font-medium">EMPLOYEE RESPONSE · READ ONLY</p><p className="mt-1 text-sm"><span className="font-semibold text-foreground">{employeeRating} · {ratings[Number(employeeRating) - 1]}</span><br />Document provided in the submitted self-assessment.</p></div></div><div><p className="mb-3 font-medium">Manager Rating *</p><RadioGroup value={managerRatings[key]} onValueChange={(value: string) => setManagerRatings({ ...managerRatings, [key]: value })} className="grid gap-2 sm:grid-cols-2">{overallRatings.map((rating: OverallRating) => <label key={rating.value} className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors ${managerRatings[key] === rating.value ? factorStyles[factorName].progress : 'bg-card text-card-foreground hover:bg-muted'}`}><RadioGroupItem value={rating.value} /><span><span className="block text-sm font-medium">{rating.value} · {rating.label}</span><span className="text-xs text-muted-foreground">{rating.maturity}</span></span></label>)}</RadioGroup><Textarea className="mt-3" value={managerComments[key] ?? ''} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setManagerComments({ ...managerComments, [key]: event.target.value })} placeholder="Manager document or observation" rows={2} /></div></div></div>; })}</CardContent></Card>)}
    <Card className="border-l-4 border-l-accent"><CardHeader><CardTitle>Employee–Manager Gap Analysis</CardTitle><CardDescription>Live comparison across all 30 dimensions. Positive gaps mean the manager rated higher.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 sm:grid-cols-3"><Metric label="Dimensions Compared" value={`${completedGaps.length} / 30`} /><Metric label="Exact Alignment" value={String(alignedCount)} /><Metric label="Rating Gaps" value={String(materialGapCount)} /></div><div className="max-h-96 overflow-auto rounded-xl border"><div className="min-w-[680px] divide-y">{gapRows.map((row: { key: string; factor: string; dimension: string; employeeRating: number; managerRating?: number; gap?: number }) => <div key={row.key} className="grid grid-cols-[1fr_90px_90px_100px] items-center gap-3 p-3 text-sm"><div><p className="font-medium">{row.dimension}</p><p className="text-xs text-muted-foreground">{row.factor}</p></div><span>Self {row.employeeRating}</span><span>Manager {row.managerRating ?? '—'}</span><Badge variant={row.gap === undefined || row.gap === 0 ? 'secondary' : Math.abs(row.gap) >= 2 ? 'destructive' : 'outline'}>{row.gap === undefined ? 'Pending' : row.gap === 0 ? 'Aligned' : `${row.gap > 0 ? '+' : ''}${row.gap} point${Math.abs(row.gap) === 1 ? '' : 's'}`}</Badge></div>)}</div></div></CardContent></Card>

    <Card className="border-l-4 border-l-primary"><CardHeader><CardTitle>Overall Leadership Rating</CardTitle><CardDescription>Select the rating that best represents the employee's demonstrated leadership and promotion maturity. This rating is required only when submitting the optional manager enhancement.</CardDescription></CardHeader><CardContent><RadioGroup value={overallRating} onValueChange={setOverallRating} className="grid gap-3 lg:grid-cols-2">{overallRatings.map((rating: OverallRating) => <label key={rating.value} className="cursor-pointer rounded-xl border p-5 transition-colors hover:bg-muted"><div className="flex items-start gap-3"><RadioGroupItem value={rating.value} /><div><div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{rating.value} · {rating.label}</span><Badge variant="secondary">{rating.maturity}</Badge></div><p className="mt-2 text-sm leading-6 text-muted-foreground">{rating.description}</p></div></div></label>)}</RadioGroup><div className="mt-5"><label className="mb-2 block font-medium">Overall Manager Rationale</label><Textarea value={overallComment} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setOverallComment(event.target.value)} placeholder="Summarize the document supporting the overall rating and promotion maturity" rows={4} /></div></CardContent></Card>
    {analysis && <Card className="border-l-4 border-l-primary"><CardHeader><div className="flex items-center gap-2"><Sparkles className="size-5" /><CardTitle>AI Analysis After Manager Review</CardTitle></div><CardDescription>Generated on submission from the completed employee and manager ratings and manager document.</CardDescription></CardHeader><CardContent className="grid gap-5 lg:grid-cols-2"><AnalysisSection title="Executive Summary" text={analysis.executiveSummary} /><AnalysisSection title="Employee Strengths" text={analysis.strengths} emphasis="strength" /><AnalysisSection title="Employee Gaps" text={analysis.employeeGaps} emphasis="gap" /><AnalysisSection title="Rating Gap Interpretation" text={analysis.alignmentAnalysis} /><AnalysisSection title="Development Focus" text={analysis.developmentFocus} /><AnalysisSection title="Coaching Actions" text={analysis.coachingActions} /><Alert className="lg:col-span-2"><ShieldAlert /><AlertTitle>Human Validation Required</AlertTitle><AlertDescription>Strengths, gaps, and development guidance support the review conversation and do not make an employment or promotion decision.</AlertDescription></Alert></CardContent></Card>}
    <div className="flex flex-col-reverse justify-between gap-3 sm:flex-row"><Button variant="outline" onClick={() => navigate('manager-details')}><ChevronLeft />Back to Employee Details</Button><Button size="lg" disabled={isAnalyzing} onClick={submit}>{isAnalyzing ? 'Identifying strengths and gaps…' : analysis ? 'Regenerate AI Analysis' : 'Submit Review & Analyze'}<ArrowRight /></Button></div>

  </div>;
}

type AnalysisTone = 'capability' | 'capacity' | 'character' | 'customer' | 'commercial' | 'culture' | 'accent';

const analysisToneStyles: Record<AnalysisTone, string> = {
  capability: 'border-l-primary bg-report-blue text-report-blue-foreground',
  capacity: 'border-l-accent-foreground bg-report-teal text-report-teal-foreground',
  character: 'border-l-factor-character-foreground bg-report-violet text-report-violet-foreground',
  customer: 'border-l-factor-customer-foreground bg-report-amber text-report-amber-foreground',
  commercial: 'border-l-factor-commercial-foreground bg-report-blue text-report-blue-foreground',
  culture: 'border-l-factor-culture-foreground bg-report-teal text-report-teal-foreground',
  accent: 'border-l-primary bg-report-violet text-report-violet-foreground',
};

const renderReportBody = (text: string) => text.split('\n').map((line: string, lineIndex: number) => {
  const topicMatch = line.match(/^(\d+[.)]\s+)([^:]+:)(.*)$/);
  return <span key={`${lineIndex}-${line}`} className="block">{topicMatch ? <>{topicMatch[1]}<strong>{topicMatch[2]}</strong>{topicMatch[3]}</> : line}</span>;
});

function AnalysisSection({ title, text, emphasis, tone, index, score }: { title: string; text: string; emphasis?: 'strength' | 'gap'; tone?: AnalysisTone; index?: number; score?: number }) {
  const style = tone ? analysisToneStyles[tone] : emphasis === 'strength' ? 'border-l-accent-foreground bg-card text-card-foreground' : emphasis === 'gap' ? 'border-l-destructive bg-card text-card-foreground' : 'border-l-primary bg-muted text-muted-foreground';
  return <article className={`report-print-section relative overflow-hidden rounded-2xl border border-l-4 p-5 shadow-sm ${style}`}><div className="flex items-start gap-3">{index !== undefined && <span className="grid size-8 shrink-0 place-items-center rounded-full bg-card text-sm font-bold text-card-foreground shadow-sm">{String(index).padStart(2, '0')}</span>}<div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className={tone ? 'text-base font-semibold' : 'text-base font-semibold text-foreground'}>{title}</h2>{score !== undefined && <Badge className="shrink-0" variant="default">{score.toFixed(1)} / 4</Badge>}</div><p className="mt-2 text-sm leading-7">{renderReportBody(text)}</p></div></div></article>;
}

function ResultsView({ role, employees, onOpenReport, employeeRecommendations, navigate, onHome, leaderName, employeeId, gcmLevel, ratingsByFactor, document, onAddDocument }: { role: Role; employees: ManagerEmployee[]; onOpenReport: (employeeId: string) => void; employeeRecommendations?: EmployeeDevelopmentRecommendations; navigate: (view: View) => void; onHome: () => void; leaderName: string; employeeId: string; gcmLevel: string; ratingsByFactor: Record<string, string>; document: EmployeeDocumentRecord[]; onAddDocument: (record: EmployeeDocumentRecord) => void }) {


  if (role === 'Manager') {
    const portfolioRows = employees.map((employee: ManagerEmployee, index: number) => ({
      employee,
      workflowStatus: index === 0 ? 'Manager input optional' : 'Manager input added',
      readiness: employee.report.readiness,
      ratingGap: index === 0 ? 0.7 : 0.3,
      overallRating: index === 0 ? '3 · Strong' : '3 · Strong',
    }));
    const averageGap = portfolioRows.reduce((total: number, row: { ratingGap: number }) => total + row.ratingGap, 0) / portfolioRows.length;
    return <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: 'easeOut' as const }} className="space-y-7">
      <section className="relative overflow-hidden rounded-2xl bg-sidebar p-6 text-sidebar-foreground shadow-xl sm:p-8">
        <div className="absolute right-0 top-0 h-full w-1/3 border-l border-sidebar-border bg-sidebar-accent" aria-hidden="true" />
        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl"><Badge variant="secondary">Manager Confidential</Badge><h1 className="mt-4 text-3xl font-semibold sm:text-4xl">Team Results portfolio</h1><p className="mt-3 max-w-xl text-sm leading-6 text-sidebar-foreground sm:text-base">A decision-ready view of leadership readiness, assessment alignment, and the talent signals requiring your attention.</p></div>
          <Button variant="outline" className="border-sidebar-border bg-sidebar text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" onClick={() => toast.success('Team Results portfolio prepared for export')}><FileText />Export Portfolio</Button>

        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-3"><Metric label="Direct reports" value={String(employees.length)} /><Metric label="Reports available" value={String(portfolioRows.filter((row: { workflowStatus: string }) => row.workflowStatus === 'Manager input added').length)} /><Metric label="Average rating gap" value={averageGap.toFixed(1)} /></section>
      <section><div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end"><div><h2 className="text-xl font-semibold">Leadership Profiles</h2><p className="text-sm text-muted-foreground">Open a profile for the complete governed Copilot analysis.</p></div><Badge variant="outline">{employees.length} leaders</Badge></div>
        <div className="grid gap-5 xl:grid-cols-2">{portfolioRows.map((row: { employee: ManagerEmployee; workflowStatus: string; readiness: string; ratingGap: number; overallRating: string }, index: number) => <motion.article key={row.employee.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.08, ease: 'easeOut' as const }} className="group overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
          <div className={`h-2 ${index === 0 ? 'bg-accent text-accent-foreground' : 'bg-primary text-primary-foreground'}`} />
          <div className="p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div className="flex min-w-0 items-center gap-4"><span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-sidebar text-sidebar-foreground text-lg font-semibold shadow-md">{row.employee.name.split(' ').map((part: string) => part[0]).join('')}</span><div className="min-w-0"><h3 className="truncate text-lg font-semibold">{row.employee.name}</h3><p className="text-sm text-muted-foreground">{row.employee.title}</p><Badge className="mt-2" variant="outline">{row.employee.level}</Badge></div></div><Badge variant={row.workflowStatus === 'Manager input added' ? 'default' : 'secondary'}>{row.workflowStatus}</Badge></div>

          <div className="my-5 rounded-xl bg-sidebar p-4 text-sidebar-foreground"><p className="text-xs font-semibold">READINESS GUIDANCE</p><p className="mt-2 leading-6">{row.readiness}</p></div>
          <div className="grid grid-cols-2 gap-3"><div className="rounded-xl bg-secondary p-4 text-secondary-foreground"><p className="text-xs font-medium">OVERALL RATING</p><p className="mt-1 text-lg font-semibold">{row.overallRating}</p></div><div className="rounded-xl bg-accent p-4 text-accent-foreground"><p className="text-xs font-medium">SELF–MANAGER GAP</p><div className="mt-1 flex items-baseline gap-2"><span className="text-2xl font-semibold">{row.ratingGap.toFixed(1)}</span><span className="text-xs font-medium">points</span></div></div></div>

          <div className="mt-5 flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="max-w-xs text-xs leading-5 text-muted-foreground">Approved 6C inputs, role context, objectives, and submitted document only.</p><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => downloadManagerEmployeeReport(row.employee)}><FileText />Download PDF</Button><Button onClick={() => onOpenReport(row.employee.id)}>View Report<ArrowRight /></Button></div></div></div>
        </motion.article>)}</div>
      </section>
      <Alert className="border-l-4 border-l-primary"><ShieldAlert /><AlertTitle>Decision Support Only</AlertTitle><AlertDescription>Readiness guidance and rating gaps support manager judgment; they do not make promotion decisions. Validate the detailed report against observed performance.</AlertDescription></Alert>
    </motion.div>;
  }
  if (role === 'Employee' && employeeRecommendations) {
    const sixCScore = calculateOverallScore(Object.values(ratingsByFactor));
    const factorScores = factorNames.map((factorName: string) => {
      const factorRatings = factors
        .filter((factor: Factor) => factor.name === factorName)
        .map((factor: Factor) => Number(ratingsByFactor[`${factor.name}::${factor.dimension}`]))
        .filter((rating: number) => Number.isFinite(rating) && rating > 0);
      const score = factorRatings.length > 0
        ? factorRatings.reduce((total: number, rating: number) => total + rating, 0) / factorRatings.length
        : 0;
      return { factor: factorName, score };
    });
    const scoredSections = buildScoredReportSections(employeeRecommendations, factorScores);
    const developmentInsightsScore = calculateDevelopmentInsightsScore(scoredSections);
    const downloadReport = () => {
      downloadLeadershipReportPdf(
        'Your Document-Aware Development Analysis',
        employeeRecommendations.summary,
        scoredSections,
        {
          leaderName,
          employeeId,
          gcmLevel,
          assessmentDate: format(new Date(), 'yyyy-MM-dd'),
          assessmentId: `employee-${Date.now()}-${crypto.randomUUID().slice(0, 4)}`,
          reviewedBy: 'Employee Results',
        },
        factorScores,
        sixCScore,
        developmentInsightsScore,
      );
      toast.success('Results PDF downloaded');
    };
    return <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: 'easeOut' as const }} className="space-y-6">
      <div className="report-print-hidden flex justify-end"><Button type="button" onClick={downloadReport}><FileText />Save Results as PDF</Button></div>
      <div className="report-print-area space-y-6 rounded-3xl border bg-card p-4 text-card-foreground shadow-xl sm:p-7">
        <section className="report-print-section grid gap-3 rounded-2xl border bg-card p-5 text-card-foreground shadow-sm sm:grid-cols-3"><div><p className="text-xs font-semibold">LEADER PROFILE</p><p className="mt-1 font-semibold">{leaderName}</p></div><div><p className="text-xs font-semibold">EMPLOYEE ID</p><p className="mt-1 font-semibold">{employeeId}</p></div><div><p className="text-xs font-semibold">GCM LEVEL</p><p className="mt-1 font-semibold">{gcmLevel}</p></div></section>
        <section className="relative overflow-hidden rounded-2xl bg-sidebar p-6 text-sidebar-foreground shadow-lg sm:p-8"><div className="absolute right-0 top-0 size-48 rounded-full border-[28px] border-sidebar-accent" aria-hidden="true" /><div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><div><Badge variant="secondary">Personal Development Report</Badge><div className="mt-4 flex items-start gap-3"><Sparkles className="mt-1 size-6 shrink-0" /><div><h1 className="text-3xl font-semibold">Your Document-Aware Development Analysis</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-sidebar-foreground">A focused 6C leadership report grounded in your assessment answers and uploaded document.</p></div></div></div><div className="rounded-xl border border-sidebar-border bg-sidebar-accent p-4 text-sidebar-accent-foreground"><p className="text-xs font-semibold">REPORT SCOPE</p><p className="mt-1 text-sm">7 development lenses · Document Reviewed</p></div></div></section>
        <section className="grid gap-4 lg:grid-cols-[0.55fr_0.55fr_1.3fr]"><Card className="report-print-section bg-primary text-primary-foreground shadow-sm"><CardHeader><CardTitle className="text-primary-foreground">6C Score</CardTitle><CardDescription className="text-primary-foreground">Average of completed dimension ratings</CardDescription></CardHeader><CardContent><p className="text-4xl font-semibold">{sixCScore.toFixed(1)} <span className="text-xl">/ 4</span></p></CardContent></Card><Card className="report-print-section bg-accent text-accent-foreground shadow-sm"><CardHeader><CardTitle className="text-accent-foreground">11 Insights Score</CardTitle><CardDescription className="text-accent-foreground">Average of all development insights</CardDescription></CardHeader><CardContent><p className="text-4xl font-semibold">{developmentInsightsScore.toFixed(1)} <span className="text-xl">/ 4</span></p></CardContent></Card><Card className="report-print-section border-l-4 border-l-primary shadow-sm"><CardHeader><CardTitle>Development Summary</CardTitle><CardDescription>Your overall development pattern</CardDescription></CardHeader><CardContent><p className="text-base leading-7">{employeeRecommendations.summary}</p></CardContent></Card></section>
        <section><div className="mb-4"><h2 className="text-xl font-semibold">Leadership Development Profile</h2><p className="text-sm text-muted-foreground">Strengths, growth priorities, and practical next-level actions.</p></div><div className="grid gap-5 lg:grid-cols-2">
          {scoredSections.slice(0, 7).map((sectionItem: { title: string; body: string; score: number }, index: number) => <AnalysisSection key={sectionItem.title} index={index + 1} title={sectionItem.title} text={sectionItem.body} score={sectionItem.score} tone={(['capability', 'capacity', 'character', 'customer', 'commercial', 'culture', 'accent'] as AnalysisTone[])[index]} />)}
        </div></section>
        <Card className="report-print-section shadow-sm"><CardHeader><CardTitle>Document Review</CardTitle><CardDescription>How uploaded files add context, perspective, and useful boundaries to the insights</CardDescription></CardHeader><CardContent className="grid gap-5 lg:grid-cols-2">{scoredSections.slice(7).map((sectionItem: { title: string; body: string; score: number }, index: number) => <AnalysisSection key={sectionItem.title} index={index + 8} title={sectionItem.title} text={sectionItem.body} score={sectionItem.score} emphasis={index === 1 ? 'strength' : index === 2 ? 'gap' : undefined} />)}</CardContent></Card>
        <Card className="report-print-section border-l-4 border-l-accent shadow-sm"><CardHeader><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground"><ClipboardCheck className="size-5" /></span><div><CardTitle>Next Step: Turn Insights Into Your IDP</CardTitle><CardDescription>Your report is the starting point for the next development cycle.</CardDescription></div></div></CardHeader><CardContent><div className="grid gap-3 md:grid-cols-3"><div className="rounded-xl bg-secondary p-4 text-secondary-foreground"><p className="text-sm font-semibold">1. Review</p><p className="mt-2 text-sm leading-6">Discuss the report, development priorities, and supporting context with your manager.</p></div><div className="rounded-xl bg-secondary p-4 text-secondary-foreground"><p className="text-sm font-semibold">2. Agree</p><p className="mt-2 text-sm leading-6">Select the actions, outcomes, and support that matter most for your role.</p></div><div className="rounded-xl bg-accent p-4 text-accent-foreground"><p className="text-sm font-semibold">3. Carry Forward</p><p className="mt-2 text-sm leading-6">Use the agreed actions to inform your IDP or subsequent development process.</p></div></div></CardContent></Card>
        <Alert className="report-print-section border-l-4 border-l-primary"><ShieldAlert /><AlertTitle>Development Guidance Only</AlertTitle><AlertDescription>Uploaded documents provide supporting context rather than proof of capability. Review the themes, different perspectives, and extraction limitations with your manager; the guidance is intended for development and does not make an employment or promotion decision.</AlertDescription></Alert>
      </div>
    </motion.div>;
  }
  const gapData = [{ factor: 'Capability', self: 3, manager: 4 }, { factor: 'Capacity', self: 2, manager: 2 }, { factor: 'Character', self: 4, manager: 4 }, { factor: 'Customer', self: 3, manager: 3 }, { factor: 'Commercial', self: 2, manager: 3 }, { factor: 'Cultural Equity', self: 4, manager: 3 }];
  const finalSixCScore = calculateOverallScore(gapData.map((row: { manager: number }) => String(row.manager)));
  const finalDevelopmentInsightsScore = calculateOverallScore(['3', '3', '2', '3', '2', '3', '3', '3', '3', '2', '3']);
  const employeeReport = {
    summary: 'Jordan demonstrates disciplined execution, customer advocacy, and people-centred leadership. The consolidated document supports readiness for broader enterprise scope when paired with stronger commercial trade-off narratives and more visible cross-border influence.',
    readiness: 'Ready for broader scope with targeted commercial development',
    strengths: ['Builds trust quickly and creates clarity for teams through complex change.', 'Translates customer priorities into disciplined delivery and measurable service outcomes.', 'Develops an inclusive environment where colleagues contribute and take ownership.'],
    priorities: ['Strengthen commercial narratives with quantified investment choices and margin impact.', 'Build visible influence across countries and functions beyond the current regional remit.', 'Create repeatable succession document through delegated enterprise-critical work.'],
    gaps: ['Manager rating is one point higher on Capability, reflecting stronger observed impact than the self-assessment captured.', 'Self and manager ratings align on Capacity, Character, and Customer Centricity.', 'The Cultural Equity self-rating is one point higher; gather broader stakeholder document to calibrate impact.'],

    outcomes: 'Leadership strengths directly support the current objective to improve regional customer retention by three points and deliver the transformation scorecard by Q4. Stronger commercial scenarios will make the connection between people leadership, investment choices, and profitable growth more explicit.',
    actions: ['Present two quantified transformation options, including margin and customer trade-offs, at the next executive review.', 'Lead a cross-country workstream with shared outcomes and stakeholder feedback checkpoints.', 'Delegate one transformation milestone to a successor and review progress monthly through Q4.'],
  };
  const downloadFinalReport = () => {
    const finalSections = [
      { title: 'Strengths With Document', body: toNumberedBullets(employeeReport.strengths.join('\n')), score: 3.7 },
      { title: 'Development Priorities', body: toNumberedBullets(employeeReport.priorities.join('\n')), score: 2.7 },
      { title: 'Rating Gap Interpretation', body: toNumberedBullets(employeeReport.gaps.join('\n')), score: finalSixCScore },
      { title: 'Business Outcome Alignment', body: employeeReport.outcomes, score: 3 },
      { title: 'Recommended Actions', body: toNumberedBullets(employeeReport.actions.join('\n')), score: finalDevelopmentInsightsScore },
    ];
    downloadLeadershipReportPdf(
      'Your Leadership Potential Results',
      employeeReport.summary,
      finalSections,
      {
        leaderName,
        employeeId,
        gcmLevel,
        assessmentDate: format(new Date(), 'yyyy-MM-dd'),
        assessmentId: `final-${Date.now()}-${crypto.randomUUID().slice(0, 4)}`,
        reviewedBy: 'Final Consolidated Report',
      },
      gapData.map((row: { factor: string; manager: number }) => ({ factor: row.factor, score: row.manager })),
      finalSixCScore,
      finalDevelopmentInsightsScore,
    );
    toast.success('Final report downloaded');
  };
  return <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: 'easeOut' as const }} className="space-y-7">
    <section className="overflow-hidden rounded-2xl bg-sidebar text-sidebar-foreground shadow-xl">
      <div className="grid lg:grid-cols-[1.35fr_0.65fr]">
        <div className="p-6 sm:p-8 lg:p-10"><div className="flex flex-wrap items-center gap-2"><Badge variant="secondary">Final Consolidated Report</Badge><Badge variant="outline" className="border-sidebar-border text-sidebar-foreground">Employee Assessment Complete</Badge></div><h1 className="mt-5 text-3xl font-semibold sm:text-4xl">Your Leadership Potential Results</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-sidebar-foreground sm:text-base">Your governed Copilot report is available from your completed employee assessment without waiting for manager action. Optional Manager Input may enrich the report later.</p><div className="mt-7 flex flex-wrap gap-3"><Button type="button" variant="secondary" onClick={onHome}><Home />Back to 6C Home</Button><Button variant="outline" className="border-sidebar-border bg-sidebar text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" onClick={downloadFinalReport}><FileText />Export Final Report</Button></div></div>
        <div className="border-t border-sidebar-border bg-sidebar-accent p-6 text-sidebar-accent-foreground lg:border-l lg:border-t-0 lg:p-8"><p className="text-xs font-semibold">READINESS GUIDANCE</p><p className="mt-3 text-xl font-semibold leading-7">{employeeReport.readiness}</p><Separator className="my-6 bg-sidebar-border" /><div className="flex items-center justify-between text-sm"><span>Manager Enhancement</span><span className="font-semibold">Optional · Added</span></div><div className="mt-3 flex items-center justify-between text-sm"><span>Report Status</span><Badge variant="secondary">Final</Badge></div></div>
      </div>
    </section>
    <section className="grid gap-4 md:grid-cols-4"><Metric label="6C Score" value={`${finalSixCScore.toFixed(1)} / 4`} /><Metric label="11 Insights Score" value={`${finalDevelopmentInsightsScore.toFixed(1)} / 4`} /><Metric label="Aligned factor ratings" value="4 / 6" /><Metric label="Priority actions" value="03" /></section>
    <Card className="border-l-4 border-l-primary"><CardHeader><div className="flex items-center justify-between gap-4"><div><CardTitle>Potential Summary</CardTitle><CardDescription>Consolidated Copilot synthesis</CardDescription></div><Sparkles className="size-5" /></div></CardHeader><CardContent><p className="leading-7">{employeeReport.summary}</p></CardContent></Card>
    <section className="grid gap-6 xl:grid-cols-2">
      <Card className="overflow-hidden border-t-4 border-t-factor-culture"><CardHeader><CardTitle>Strengths With Document</CardTitle><CardDescription>Repeatable leadership signals supported by submitted inputs.</CardDescription></CardHeader><CardContent className="space-y-4">{employeeReport.strengths.map((strength: string, index: number) => <Priority key={strength} number={`0${index + 1}`} title={['Change leadership', 'Customer advocacy', 'Inclusive execution'][index]} text={strength} />)}</CardContent></Card>
      <Card className="overflow-hidden border-t-4 border-t-factor-customer"><CardHeader><CardTitle>Development Priorities</CardTitle><CardDescription>Focused areas that will strengthen readiness for broader scope.</CardDescription></CardHeader><CardContent className="space-y-4">{employeeReport.priorities.map((priority: string, index: number) => <Priority key={priority} number={`0${index + 1}`} title={['Commercial trade-offs', 'Enterprise influence', 'Succession depth'][index]} text={priority} />)}</CardContent></Card>
    <EmployeeDocumentPanel employeeId={employeeId} employeeName={leaderName} campaignName="2026 Global Leadership Assessment" uploaderRole="Employee" uploaderName={leaderName} records={document} canUpload onAdd={onAddDocument} />
    </section>
    <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Card><CardHeader><CardTitle>Self vs Manager</CardTitle><CardDescription>Rating comparison across the six factors.</CardDescription></CardHeader><CardContent className="space-y-5">{gapData.map((row: { factor: string; self: number; manager: number }) => <div key={row.factor}><div className="mb-2 flex flex-wrap justify-between gap-2 text-sm"><span className="font-medium">{row.factor}</span><span className="text-muted-foreground">Self {row.self} · Manager {row.manager}</span></div><div className="grid grid-cols-4 gap-2">{[1, 2, 3, 4].map((value: number) => <span key={value} className={`h-2 rounded ${value <= row.manager ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`} />)}</div></div>)}</CardContent></Card>
      <Card className="border-l-4 border-l-accent"><CardHeader><CardTitle>Rating Gap Interpretation</CardTitle><CardDescription>Where perspectives align and where reflection can deepen.</CardDescription></CardHeader><CardContent className="space-y-4">{employeeReport.gaps.map((gap: string, index: number) => <div key={gap} className="flex gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground text-sm font-semibold">{index + 1}</span><p className="text-sm leading-6">{gap}</p></div>)}</CardContent></Card>
    </section>
    <Card className="border-l-4 border-l-factor-capability"><CardHeader><CardTitle>Business Outcome Alignment</CardTitle><CardDescription>How the 6C pattern connects to current objectives and KPIs.</CardDescription></CardHeader><CardContent><p className="leading-7">{employeeReport.outcomes}</p></CardContent></Card>
    <Card><CardHeader><div className="flex items-center justify-between gap-4"><div><CardTitle>Recommended Actions</CardTitle><CardDescription>Practical next steps to discuss with your manager.</CardDescription></div><Target className="size-5" /></div></CardHeader><CardContent className="grid gap-4 lg:grid-cols-3">{employeeReport.actions.map((action: string, index: number) => <div key={action} className={`rounded-xl p-5 ${index === 0 ? 'bg-primary text-primary-foreground' : index === 1 ? 'bg-secondary text-secondary-foreground' : 'bg-accent text-accent-foreground'}`}><span className="text-xs font-semibold">ACTION 0{index + 1}</span><p className="mt-3 text-sm leading-6">{action}</p></div>)}</CardContent></Card>
    <Card className="border-l-4 border-l-accent shadow-sm"><CardHeader><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground"><ClipboardCheck className="size-5" /></span><div><CardTitle>Next Step: Turn Your Report Into Development</CardTitle><CardDescription>The final report and development plan can feed directly into your IDP or subsequent development process.</CardDescription></div></div></CardHeader><CardContent><div className="grid gap-3 md:grid-cols-3"><div className="rounded-xl bg-secondary p-4 text-secondary-foreground"><p className="text-sm font-semibold">1. Review Together</p><p className="mt-2 text-sm leading-6">Discuss the final report and priority actions with your manager.</p></div><div className="rounded-xl bg-secondary p-4 text-secondary-foreground"><p className="text-sm font-semibold">2. Agree the Plan</p><p className="mt-2 text-sm leading-6">Confirm development goals, measures, support, and target dates.</p></div><div className="rounded-xl bg-accent p-4 text-accent-foreground"><p className="text-sm font-semibold">3. Update Your IDP</p><p className="mt-2 text-sm leading-6">Carry the agreed goals and actions into your IDP and ongoing development check-ins.</p></div></div></CardContent></Card>
    <Alert className="border-l-4 border-l-primary"><ShieldAlert /><AlertTitle>Development Guidance, Not a Promotion Decision</AlertTitle><AlertDescription>This report supports a development conversation with your manager. Use the agreed priorities and actions to inform your IDP or subsequent development process. Copilot uses only approved assessment content and does not make employment or promotion decisions.</AlertDescription></Alert>
  </motion.div>;
}
function Priority({ number, title, text }: { number: string; title: string; text: string }) { return <div className="flex gap-4"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground text-sm font-semibold">{number}</span><div><p className="font-medium">{title}</p><p className="text-sm text-muted-foreground">{text}</p></div></div>; }

type CampaignSummary = { id: string; name: string; type: 'Key Talent' | 'Emerging Leaders' | 'Promotion' | 'Succession' | 'General'; status: 'Draft' | 'Open' | 'Closed' | 'Archived'; startDate?: Date; endDate?: Date; participants: number };
type CampaignParticipant = { id: string; employeeId: string; name: string; title: string; level: string; manager: string; status: 'Not started' | 'In progress' | 'Employee submitted' | 'Manager Review' | 'HR Calibration' | 'Completed'; updated: string };

const initialCampaigns: CampaignSummary[] = [
  { id: 'campaign-global-2026', name: '2026 Global Key Talent Assessment', type: 'Key Talent', status: 'Open', startDate: new Date(2026, 0, 12), endDate: new Date(2026, 2, 31), participants: 5 },
  { id: 'campaign-emea-2026', name: '2026 EMEA Emerging Leaders Assessment', type: 'Emerging Leaders', status: 'Draft', startDate: new Date(2026, 3, 6), endDate: new Date(2026, 5, 30), participants: 0 },
  { id: 'campaign-promotion-2026', name: '2026 Commercial Promotion Review', type: 'Promotion', status: 'Closed', startDate: new Date(2026, 0, 5), endDate: new Date(2026, 1, 27), participants: 0 },
  { id: 'campaign-customer-2025', name: '2025 Customer Leadership Review', type: 'General', status: 'Archived', startDate: new Date(2025, 2, 3), endDate: new Date(2025, 4, 30), participants: 0 },
];

const globalCampaignParticipants: CampaignParticipant[] = [
  { id: 'EMP-10427', employeeId: 'employee-jordan', name: 'Jordan Mitchell', title: 'Regional Operations Director', level: 'GCM 7', manager: 'Thomas Whitaker', status: 'Completed', updated: '20 Feb 2026' },
  { id: 'EMP-10518', employeeId: 'employee-aisha', name: 'Aisha Thompson', title: 'Customer Experience Director', level: 'GCM 8', manager: 'Thomas Whitaker', status: 'Employee submitted', updated: 'Submitted 18 Feb 2026' },
  { id: 'EMP-10604', employeeId: 'employee-gabriel', name: 'Gabriel Chen', title: 'Commercial Strategy Director', level: 'GCM 8', manager: 'Nadia Petrov', status: 'HR Calibration', updated: '21 Feb 2026' },
  { id: 'EMP-10711', employeeId: 'employee-priya', name: 'Priya Nair', title: 'Transformation Delivery Director', level: 'GCM 7', manager: 'Thomas Whitaker', status: 'In progress', updated: '24 Feb 2026' },
  { id: 'EMP-10832', employeeId: 'employee-marcus', name: 'Marcus Bennett', title: 'Cloud Services Director', level: 'GCM 9', manager: 'Nadia Petrov', status: 'Not started', updated: 'Invited 12 Jan 2026' },
];

function CampaignsView({ document, uploaderName, onAddDocument }: { document: EmployeeDocumentRecord[]; uploaderName: string; onAddDocument: (record: EmployeeDocumentRecord) => void }) {
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>(initialCampaigns);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [managedCampaign, setManagedCampaign] = useState<CampaignSummary | undefined>(initialCampaigns[0]);
  const [inviteMode, setInviteMode] = useState<'excel' | 'single' | 'notify'>();
  const [campaignDialogMode, setCampaignDialogMode] = useState<'create' | 'edit' | 'add'>('create');
  const [documentEmployee, setDocumentEmployee] = useState<CampaignParticipant>();
  const [reviewEmployee, setReviewEmployee] = useState<CampaignParticipant>();
  const [campaignName, setCampaignName] = useState('');
  const [campaignType, setCampaignType] = useState<CampaignSummary['type']>('General');
  const [status, setStatus] = useState<CampaignSummary['status']>('Draft');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [importFileName, setImportFileName] = useState('');
  const [importedEmployees, setImportedEmployees] = useState<ImportedEmployee[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [inviteCampaign, setInviteCampaign] = useState(initialCampaigns.find((campaign: CampaignSummary) => campaign.status === 'Open')?.name ?? '');
  const [singleEmployee, setSingleEmployee] = useState<ImportedEmployee>({ employeeId: '', employeeEmail: '', employeeName: '', jobTitle: '', managerEmail: '' });
  const [campaignRecipients, setCampaignRecipients] = useState<Record<string, ImportedEmployee[]>>({});
  const sendInvitations = useSendAssessmentInvitations();
  const assessmentUrl = `${window.location.origin}${window.location.pathname}`;

  const resetForm = () => {
    setCampaignName(''); setCampaignType('General'); setStatus('Draft'); setStartDate(undefined); setEndDate(undefined);
    setImportFileName(''); setImportedEmployees([]); setImportErrors([]);
  };
  const resetInvite = () => {
    setInviteMode(undefined); setCampaignDialogMode('create'); setImportFileName(''); setImportedEmployees([]); setImportErrors([]);
    setSingleEmployee({ employeeId: '', employeeEmail: '', employeeName: '', jobTitle: '', managerEmail: '' });
  };
  const selectWorkbook = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    setIsParsing(true); setImportFileName(file.name);
    try {
      const result = await parseEmployeeWorkbook(file); setImportedEmployees(result.employees); setImportErrors(result.errors);
      if (result.errors.length === 0) toast.success(`${result.employees.length} employees validated`);
      else toast.warning('Review the workbook validation issues');
    } catch (error: unknown) {
      setImportedEmployees([]); setImportErrors([error instanceof Error ? error.message : 'The Excel workbook could not be read.']);
    } finally { setIsParsing(false); }
  };
  const createCampaign = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const name = campaignName.trim();
    if (!name || !startDate || !endDate) { toast.error('Enter a campaign name, start date, and end date'); return; }
    if (endDate < startDate) { toast.error('End date must be on or after the start date'); return; }
    if (campaignDialogMode === 'create' && campaigns.some((campaign: CampaignSummary) => campaign.name.toLowerCase() === name.toLowerCase())) { toast.error('A campaign with this name already exists'); return; }

    setIsSaving(true);
    try {
      if (campaignDialogMode === 'edit' && managedCampaign) {
        const updated = { ...managedCampaign, name, type: campaignType, status, startDate, endDate };
        setCampaigns((current: CampaignSummary[]) => current.map((campaign: CampaignSummary) => campaign.id === updated.id ? updated : campaign));
        setManagedCampaign(updated);
        toast.success(`${name} updated`);
        setDialogOpen(false);
      } else {
        const created = { id: crypto.randomUUID(), name, type: campaignType, status, startDate, endDate, participants: 0 };
        setCampaigns((current: CampaignSummary[]) => [created, ...current]);
        setManagedCampaign(created); setInviteCampaign(name);
        toast.success(`${name} created. Add participants when ready.`);
      }
    } catch (error: unknown) { toast.error(error instanceof Error ? error.message : 'The campaign could not be saved'); }
    finally { setIsSaving(false); }
  };
  const editCampaign = (campaign: CampaignSummary) => {
    setCampaignName(campaign.name); setCampaignType(campaign.type); setStatus(campaign.status); setStartDate(campaign.startDate); setEndDate(campaign.endDate);
    setCampaignDialogMode('edit'); setDialogOpen(true);
  };
  const archiveCampaign = (campaign: CampaignSummary) => {
    const archived = { ...campaign, status: 'Archived' as const };
    setCampaigns((current: CampaignSummary[]) => current.map((item: CampaignSummary) => item.id === campaign.id ? archived : item));
    setManagedCampaign(undefined); toast.success(`${campaign.name} archived with all campaign data retained`);
  };
  const validSingleEmployee = Object.values(singleEmployee).every((value: string) => value.trim().length > 0) && singleEmployee.employeeEmail.includes('@') && singleEmployee.managerEmail.includes('@');
  const addCampaignEmployees = async () => {
    const employeesToAdd = inviteMode === 'single' ? [singleEmployee] : importedEmployees;
    if (!inviteCampaign || employeesToAdd.length === 0 || importErrors.length > 0 || (inviteMode === 'single' && !validSingleEmployee)) { toast.error('Complete and validate all employee details'); return; }
    setIsSaving(true);
    try {
      await Promise.all(employeesToAdd.map((employee: ImportedEmployee) => upsertSharePointListItem('https://atos365nam.sharepoint.com/sites/100076814', 'Employees', { employeeid: employee.employeeId, employeeemail: employee.employeeEmail.toLowerCase(), employeename: employee.employeeName, jobtitle: employee.jobTitle, manageremail: employee.managerEmail.toLowerCase() })));
      setCampaignRecipients((current: Record<string, ImportedEmployee[]>) => {
        const existing = current[inviteCampaign] ?? [];
        const merged = [...existing.filter((employee: ImportedEmployee) => !employeesToAdd.some((added: ImportedEmployee) => added.employeeId === employee.employeeId)), ...employeesToAdd];
        return { ...current, [inviteCampaign]: merged };
      });
      setCampaigns((current: CampaignSummary[]) => current.map((campaign: CampaignSummary) => campaign.name === inviteCampaign ? { ...campaign, participants: (campaignRecipients[inviteCampaign] ?? []).filter((employee: ImportedEmployee) => !employeesToAdd.some((added: ImportedEmployee) => added.employeeId === employee.employeeId)).length + employeesToAdd.length } : campaign));
      toast.success(`${employeesToAdd.length} employee${employeesToAdd.length === 1 ? '' : 's'} added to ${inviteCampaign}`);
      setImportFileName(''); setImportedEmployees([]); setImportErrors([]);
      setSingleEmployee({ employeeId: '', employeeEmail: '', employeeName: '', jobTitle: '', managerEmail: '' });
    } catch (error: unknown) { toast.error(error instanceof Error ? error.message : 'Employees could not be added to the campaign'); }
    finally { setIsSaving(false); }
  };
  const sendCampaignNotifications = async () => {
    const recipients = campaignRecipients[inviteCampaign] ?? [];
    if (!inviteCampaign || recipients.length === 0) { toast.error('Add employees to this campaign before sending notifications'); return; }
    try {
      await sendInvitations.mutateAsync({ campaignName: inviteCampaign, assessmentUrl, employees: recipients });
      toast.success(`${recipients.length} assessment notification${recipients.length === 1 ? '' : 's'} sent`);
    } catch (error: unknown) { toast.error(error instanceof Error ? error.message : 'Assessment notifications could not be sent'); }
  };

  const visibleParticipants = managedCampaign?.id === 'campaign-global-2026' ? globalCampaignParticipants : [];
  const activeCampaigns = campaigns.filter((campaign: CampaignSummary) => campaign.status !== 'Archived');
  const archivedCampaigns = campaigns.filter((campaign: CampaignSummary) => campaign.status === 'Archived');
  return <div className="space-y-6">
    <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-end">
      <div><h1 className="text-2xl font-semibold">HR Campaigns</h1><p className="text-muted-foreground">Run key talent, emerging leader, promotion, and succession assessments in parallel with fully isolated records.</p></div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => { resetForm(); resetInvite(); setCampaignName(inviteCampaign); setCampaignDialogMode('add'); setInviteMode('excel'); setDialogOpen(true); }}><Upload />Add Employees</Button>
        <Button onClick={() => { resetForm(); resetInvite(); setCampaignDialogMode('create'); setInviteMode('single'); setDialogOpen(true); }}><Plus />Create Campaign</Button>
      </div>
    </div>
    <div className="grid gap-4 sm:grid-cols-3"><Metric label="Parallel campaigns" value={String(activeCampaigns.length)} /><Metric label="Open campaigns" value={String(activeCampaigns.filter((campaign: CampaignSummary) => campaign.status === 'Open').length)} /><Metric label="Archived campaigns" value={String(archivedCampaigns.length)} /></div>
    <Tabs defaultValue="active"><TabsList><TabsTrigger value="active">Active campaigns</TabsTrigger><TabsTrigger value="archived">Archive</TabsTrigger></TabsList><TabsContent value="active" className="grid gap-4 lg:grid-cols-2">{activeCampaigns.map((campaign: CampaignSummary) => <CampaignCard key={campaign.id} campaign={campaign} onManage={setManagedCampaign} />)}</TabsContent><TabsContent value="archived" className="grid gap-4 lg:grid-cols-2">{archivedCampaigns.map((campaign: CampaignSummary) => <CampaignCard key={campaign.id} campaign={campaign} onManage={setManagedCampaign} />)}</TabsContent></Tabs>
    <Dialog open={Boolean(managedCampaign)} onOpenChange={(open: boolean) => { if (!open) setManagedCampaign(undefined); }}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="shrink-0 border-b px-6 pb-4 pt-6 pr-12"><DialogTitle>{managedCampaign?.name}</DialogTitle><DialogDescription>{managedCampaign?.type} campaign · Every participant, response, document, review, result, and report is scoped to this campaign.</DialogDescription></DialogHeader>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Participants" value={String(managedCampaign?.participants ?? 0)} /><Metric label="Submitted" value={String(visibleParticipants.filter((participant: CampaignParticipant) => participant.status === 'Employee submitted').length)} /><Metric label="In review" value={String(visibleParticipants.filter((participant: CampaignParticipant) => participant.status === 'Manager Review' || participant.status === 'HR Calibration').length)} /><Metric label="Completed" value={String(visibleParticipants.filter((participant: CampaignParticipant) => participant.status === 'Completed').length)} /></div>
          {visibleParticipants.length > 0 ? <Card><CardHeader><CardTitle>Campaign activity</CardTitle><CardDescription>Only records belonging to this selected campaign are shown.</CardDescription></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[920px] text-left text-sm"><thead className="bg-muted text-muted-foreground"><tr><th className="p-3">Leader</th><th className="p-3">Level</th><th className="p-3">Manager</th><th className="p-3">Status</th><th className="p-3">Last Update</th><th className="p-3 text-right">Actions</th></tr></thead><tbody className="divide-y">{visibleParticipants.map((participant: CampaignParticipant) => { const reviewAvailable = participant.status !== 'Not started' && participant.status !== 'In progress'; return <tr key={participant.id}><td className="p-3"><p className="font-medium">{participant.name}</p><p className="text-xs text-muted-foreground">{participant.id} · {participant.title}</p></td><td className="p-3">{participant.level}</td><td className="p-3">{participant.manager}</td><td className="p-3"><Badge variant={participant.status === 'Completed' ? 'default' : participant.status === 'Not started' ? 'destructive' : 'secondary'}>{participant.status}</Badge></td><td className="p-3 text-muted-foreground">{participant.updated}</td><td className="p-3"><div className="flex justify-end gap-2"><Button size="sm" disabled={!reviewAvailable} onClick={() => setReviewEmployee(participant)}><FileText />Review</Button><Button size="sm" variant="outline" onClick={() => setDocumentEmployee(participant)}><Upload />Documents</Button></div></td></tr>; })}</tbody></table></div></CardContent></Card> : <Alert><CircleAlert /><AlertTitle>No participants in this campaign</AlertTitle><AlertDescription>Add employees to begin this campaign. Data from other campaigns is intentionally excluded.</AlertDescription></Alert>}
        </div>
        <DialogFooter className="shrink-0 border-t px-6 py-4"><Button variant="outline" onClick={() => setManagedCampaign(undefined)}>Close</Button>{managedCampaign?.status !== 'Archived' && <><Button variant="outline" onClick={() => managedCampaign && editCampaign(managedCampaign)}><Pencil />Edit</Button><Button variant="destructive" onClick={() => managedCampaign && archiveCampaign(managedCampaign)}>Archive</Button><Button onClick={() => { setInviteCampaign(managedCampaign?.name ?? ''); setCampaignName(managedCampaign?.name ?? ''); setCampaignDialogMode('add'); setManagedCampaign(undefined); setInviteMode('single'); setDialogOpen(true); }}>Add Employees</Button></>}</DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog open={Boolean(reviewEmployee)} onOpenChange={(open: boolean) => { if (!open) setReviewEmployee(undefined); }}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-5xl">
        <DialogHeader><DialogTitle>{reviewEmployee ? `Employee review · ${reviewEmployee.name}` : 'Employee review'}</DialogTitle><DialogDescription>HR access begins when the employee submits. A pending manager review does not hide the employee assessment.</DialogDescription></DialogHeader>
        {reviewEmployee && (() => {
          const reportEmployee = managerEmployees.find((employee: ManagerEmployee) => employee.id === reviewEmployee.employeeId);
          if (!reportEmployee) {
            return <Alert><CircleAlert /><AlertTitle>Submitted review details unavailable</AlertTitle><AlertDescription>This sample participant does not yet have seeded assessment responses.</AlertDescription></Alert>;
          }
          const submittedRatings = factors.map((factor: Factor, index: number) => {
            const key = `${factor.name}::${factor.dimension}`;
            const ratingValue = reportEmployee.ratings[key] ?? '3';
            return { factor, index, key, ratingValue, ratingLabel: ratings[Number(ratingValue) - 1] ?? 'Consistent' };
          });
          return <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3"><Metric label="Workflow Status" value={reviewEmployee.status} /><Metric label="6C Score" value={`${calculateOverallScore(submittedRatings.map((item: { ratingValue: string }) => item.ratingValue)).toFixed(1)} / 4`} /><Metric label="Ratings submitted" value={`${submittedRatings.length} / 30`} /></div>
            <Alert className="border-l-4 border-l-primary"><ClipboardCheck /><AlertTitle>Complete employee submission visible to HR</AlertTitle><AlertDescription>All 30 employee ratings are available now. Manager ratings and comments will appear when their separate review is completed.</AlertDescription></Alert>
            <Card><CardHeader><CardTitle>Submitted 6C responses</CardTitle><CardDescription>Read-only employee ratings across all six factors and 30 leadership dimensions.</CardDescription></CardHeader><CardContent className="space-y-6">{factorNames.map((factorName: string) => {
              const factorResponses = submittedRatings.filter((item: { factor: Factor }) => item.factor.name === factorName);
              return <section key={factorName} className={`overflow-hidden rounded-xl border border-l-4 ${factorStyles[factorName].surface}`}><div className="flex items-center justify-between bg-muted px-4 py-3 text-muted-foreground"><h3 className="font-semibold text-foreground">{factorName}</h3><Badge variant="secondary">5 of 5 answered</Badge></div><div className="divide-y">{factorResponses.map((item: { factor: Factor; index: number; key: string; ratingValue: string; ratingLabel: string }) => <div key={item.key} className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-start"><div><p className="font-medium">{item.index + 1}. {item.factor.dimension}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{item.factor.definition}</p><p className="mt-2 text-sm"><span className="font-medium">Employee reflection:</span> Demonstrated through current-role outcomes and examples submitted for {item.factor.dimension.toLowerCase()}.</p></div><Badge variant="outline">{item.ratingValue} · {item.ratingLabel}</Badge></div>)}</div></section>;
            })}</CardContent></Card>
            <CopilotManagerSummary employee={reportEmployee} />
          </div>;
        })()}
        <DialogFooter><Button variant="outline" onClick={() => setReviewEmployee(undefined)}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog open={Boolean(documentEmployee)} onOpenChange={(open: boolean) => { if (!open) setDocumentEmployee(undefined); }}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-4xl">
        <DialogHeader><DialogTitle>{documentEmployee ? `Supporting document · ${documentEmployee.name}` : 'Supporting document'}</DialogTitle><DialogDescription>Upload document for this individual employee. The document is immediately employee-visible and added to the audit history.</DialogDescription></DialogHeader>
        {documentEmployee && <EmployeeDocumentPanel employeeId={documentEmployee.employeeId} employeeName={documentEmployee.name} campaignName={managedCampaign?.name ?? '2026 Global Leadership Assessment'} uploaderRole="HR" uploaderName={uploaderName} records={document.filter((record: EmployeeDocumentRecord) => record.employeeId === documentEmployee.employeeId)} canUpload onAdd={onAddDocument} />}
        <DialogFooter><Button variant="outline" onClick={() => setDocumentEmployee(undefined)}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog open={dialogOpen} onOpenChange={(open: boolean) => { setDialogOpen(open); if (!open) { resetForm(); resetInvite(); } }}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="shrink-0 border-b px-6 pb-4 pt-6 pr-12"><DialogTitle>{campaignDialogMode === 'create' ? 'Create Campaign' : campaignDialogMode === 'edit' ? 'Edit Campaign' : inviteMode === 'excel' ? 'Add Employees' : 'Add Single Employee'}</DialogTitle><DialogDescription>{campaignDialogMode === 'create' ? 'Set up an independent campaign, then add its participants.' : campaignDialogMode === 'edit' ? 'Update this campaign without affecting any other campaign.' : `Add employees to ${inviteCampaign}.`}</DialogDescription></DialogHeader>
        <form id="create-campaign-form" onSubmit={(event: FormEvent<HTMLFormElement>) => { void createCampaign(event); }} className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {(campaignDialogMode === 'create' || campaignDialogMode === 'edit') && <section className="space-y-4">
            <div><h3 className="font-semibold">Campaign details</h3><p className="text-sm text-muted-foreground">Campaign settings and all linked assessment data remain independent.</p></div>
            <div className="space-y-2"><Label htmlFor="campaign-name">Campaign name</Label><Input id="campaign-name" value={campaignName} onChange={(event: ChangeEvent<HTMLInputElement>) => setCampaignName(event.target.value)} placeholder="e.g. 2027 Global Leadership Assessment" autoFocus /></div>
            <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Campaign type</Label><Select value={campaignType} onValueChange={(value: CampaignSummary['type']) => setCampaignType(value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['Key Talent', 'Emerging Leaders', 'Promotion', 'Succession', 'General'].map((type: string) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Status</Label><Select value={status} onValueChange={(value: CampaignSummary['status']) => setStatus(value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['Draft', 'Open', 'Closed', 'Archived'].map((value: string) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div></div>
            <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Start date</Label><Popover><PopoverTrigger asChild><Button type="button" variant="outline" className="w-full justify-start font-normal"><CalendarIcon />{startDate ? format(startDate, 'PPP') : 'Select'}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus /></PopoverContent></Popover></div><div className="space-y-2"><Label>End date</Label><Popover><PopoverTrigger asChild><Button type="button" variant="outline" className="w-full justify-start font-normal"><CalendarIcon />{endDate ? format(endDate, 'PPP') : 'Select'}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={endDate} onSelect={setEndDate} disabled={(date: Date) => Boolean(startDate && date < startDate)} initialFocus /></PopoverContent></Popover></div></div>

          </section>}
          {campaignDialogMode !== 'edit' && <><Separator /><section className="space-y-4">
            <div><h3 className="font-semibold">Employees</h3><p className="text-sm text-muted-foreground">Participants added here belong only to the selected campaign.</p></div>
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1"><Button type="button" variant={inviteMode === 'single' ? 'default' : 'ghost'} onClick={() => setInviteMode('single')}><Plus />Single employee</Button><Button type="button" variant={inviteMode === 'excel' ? 'default' : 'ghost'} onClick={() => setInviteMode('excel')}><Upload />Upload Excel</Button></div>
            {inviteMode === 'excel' ? <><WorkbookPicker onChange={selectWorkbook} /><ParticipantPreview isParsing={isParsing} fileName={importFileName} employees={importedEmployees} errors={importErrors} /></> : <div className="grid gap-4 sm:grid-cols-2">{([{ key: 'employeeId', label: 'Employee ID' }, { key: 'employeeEmail', label: 'Employee email' }, { key: 'employeeName', label: 'Employee name' }, { key: 'jobTitle', label: 'Job Title' }, { key: 'managerEmail', label: 'Manager email' }] as const).map((field: { key: keyof ImportedEmployee; label: string }) => <div key={field.key} className="space-y-2"><Label htmlFor={`campaign-${field.key}`}>{field.label}</Label><Input id={`campaign-${field.key}`} value={singleEmployee[field.key]} onChange={(event: ChangeEvent<HTMLInputElement>) => setSingleEmployee((current: ImportedEmployee) => ({ ...current, [field.key]: event.target.value }))} /></div>)}</div>}
            {inviteCampaign === campaignName.trim() && <Alert className="border-l-4 border-l-primary"><Check /><AlertTitle>Campaign created</AlertTitle><AlertDescription>{(campaignRecipients[inviteCampaign] ?? []).length} employees added to this campaign.</AlertDescription></Alert>}
          </section></>}
        </form>
        <DialogFooter className="shrink-0 flex-col gap-2 border-t px-6 py-4 sm:flex-row sm:justify-between">
          {campaignDialogMode !== 'edit' && <Button type="button" variant="outline" disabled={!inviteCampaign || inviteCampaign !== campaignName.trim() || isSaving || isParsing || (inviteMode === 'excel' ? importedEmployees.length === 0 || importErrors.length > 0 : !validSingleEmployee)} onClick={() => { void addCampaignEmployees(); }}><Users />{isSaving ? 'Adding…' : inviteMode === 'single' ? 'Add Employee' : 'Add Employees'}</Button>}
          <div className="flex flex-col gap-2 sm:flex-row">{(campaignDialogMode === 'create' || campaignDialogMode === 'edit') && <Button type="submit" form="create-campaign-form" disabled={isSaving}>{campaignDialogMode === 'edit' ? 'Save Changes' : inviteCampaign === campaignName.trim() && inviteCampaign ? 'Campaign Created' : isSaving ? 'Creating…' : 'Create Campaign'}</Button>}{campaignDialogMode !== 'edit' && <Button type="button" variant="secondary" disabled={sendInvitations.isPending || !inviteCampaign || inviteCampaign !== campaignName.trim() || (campaignRecipients[inviteCampaign] ?? []).length === 0} onClick={() => { void sendCampaignNotifications(); }}><ArrowRight />{sendInvitations.isPending ? 'Sending…' : 'Send Notification'}</Button>}</div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}

function WorkbookPicker({ onChange }: { onChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void> }) {
  return <div className="space-y-3"><label className="flex cursor-pointer flex-col items-center rounded-xl border border-dashed p-5 text-center hover:bg-muted"><Upload className="mb-2 size-7" /><span className="font-medium">Add employees</span><span className="mt-1 text-xs text-muted-foreground">Excel .xlsx · first worksheet</span><Input className="sr-only" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event: ChangeEvent<HTMLInputElement>) => { void onChange(event); }} /></label><div className="rounded-xl bg-muted p-4 text-muted-foreground"><p className="text-sm font-semibold text-foreground">Required columns</p><p className="mt-2 text-xs leading-5">EmployeeId, EmployeeEmail, EmployeeName, JobTitle, ManagerEmail</p></div></div>;
}

function ParticipantPreview({ isParsing, fileName, employees, errors }: { isParsing: boolean; fileName: string; employees: ImportedEmployee[]; errors: string[] }) {
  return <div className="min-w-0 space-y-3"><div className="flex items-center justify-between"><div><p className="font-medium">Participants</p><p className="text-sm text-muted-foreground">{isParsing ? 'Reading workbook…' : fileName || 'No employee list selected'}</p></div>{employees.length > 0 && <Badge>{employees.length} employees</Badge>}</div>{errors.length > 0 ? <Alert className="border-l-4 border-l-destructive"><CircleAlert /><AlertTitle>Workbook needs attention</AlertTitle><AlertDescription><ul className="mt-2 space-y-1">{errors.slice(0, 8).map((error: string) => <li key={error}>{error}</li>)}</ul></AlertDescription></Alert> : employees.length > 0 ? <div className="max-h-64 overflow-auto rounded-xl border"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-muted text-muted-foreground"><tr><th className="p-3">Employee</th><th className="p-3">Job Title</th><th className="p-3">Manager</th></tr></thead><tbody className="divide-y">{employees.slice(0, 50).map((employee: ImportedEmployee) => <tr key={employee.employeeId}><td className="p-3"><p className="font-medium">{employee.employeeName}</p><p className="text-xs text-muted-foreground">{employee.employeeId} · {employee.employeeEmail}</p></td><td className="p-3">{employee.jobTitle}</td><td className="p-3 text-muted-foreground">{employee.managerEmail}</td></tr>)}</tbody></table></div> : <div className="grid min-h-36 place-items-center rounded-xl border border-dashed p-6 text-center"><div><Users className="mx-auto mb-2 size-7" /><p className="font-medium">Add employees to continue</p></div></div>}</div>;
}

function AccessDenied({ role, email, onRetry }: { role: Role; email?: string; onRetry: () => void }) {
  return <Card className="mx-auto max-w-lg border-l-4 border-l-destructive"><CardHeader><div className="mb-2 grid size-11 place-items-center rounded-xl bg-destructive text-destructive-foreground"><ShieldAlert /></div><CardTitle>Access denied for {role}</CardTitle><CardDescription>{email ?? 'This account'} was not matched to an active {role} record. Select another assigned role or retry after a SharePoint change.</CardDescription></CardHeader><CardContent><Button variant="outline" onClick={onRetry}><RefreshCw />Retry access check</Button></CardContent></Card>;
}

function AdminAccessView({ employees, managers, hrUsers, admins }: { employees: SharePointEmployee[]; managers: SharePointManager[]; hrUsers: SharePointHRUser[]; admins: SharePointAdmin[] }) {
  const { data: managedHrUsers = [], isFetching, isError, refetch } = useM365HrUsers(true);
  const { data: managerCount, isFetching: isManagerCountFetching, isError: isManagerCountError, refetch: refetchManagerCount } = useSharePointManagerCount(true);
  const { data: employeeCount, isFetching: isEmployeeCountFetching, isError: isEmployeeCountError, refetch: refetchEmployeeCount } = useSharePointEmployeeCount(true);
  const { data: hrCount, isFetching: isHrCountFetching, isError: isHrCountError, refetch: refetchHrCount } = useSharePointHrCount(true);
  const manageHrUser = useManageM365HrUser();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmail, setEditingEmail] = useState<string>();
  const [form, setForm] = useState<HrUserInput>({ userName: '', userEmail: '', isActive: true });
  const [deleteTarget, setDeleteTarget] = useState<SharePointHRUser>();

  const activeManagers = managers.filter((manager: SharePointManager) => manager.isActive);
  const activeAdmins = admins.filter((admin: SharePointAdmin) => admin.isActive);
  const sourceHrUsers = managedHrUsers.length > 0 || !isError ? managedHrUsers : hrUsers;
  const visibleHrUsers = sourceHrUsers.filter((hrUser: SharePointHRUser) => `${hrUser.userName} ${hrUser.userEmail}`.toLowerCase().includes(search.trim().toLowerCase()));
  const openCreate = () => { setEditingEmail(undefined); setForm({ userName: '', userEmail: '', isActive: true }); setDialogOpen(true); };
  const openEdit = (hrUser: SharePointHRUser) => { setEditingEmail(hrUser.userEmail); setForm({ userName: hrUser.userName, userEmail: hrUser.userEmail, isActive: hrUser.isActive }); setDialogOpen(true); };
  const saveHrUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const user = { ...form, userName: form.userName.trim(), userEmail: form.userEmail.trim().toLowerCase() };
    if (!user.userName || !user.userEmail || !user.userEmail.includes('@')) { toast.error('Enter a valid name and email address'); return; }
    try {
      await manageHrUser.mutateAsync(editingEmail ? { action: 'update', originalEmail: editingEmail, user } : { action: 'create', user });
      toast.success(editingEmail ? 'HR user updated in SharePoint' : 'HR user added to SharePoint');
      setDialogOpen(false);
    } catch (error: unknown) { toast.error(error instanceof Error ? error.message : 'Unable to save the HR user'); }
  };
  const toggleActive = async (hrUser: SharePointHRUser) => {
    try {
      await manageHrUser.mutateAsync({ action: 'update', originalEmail: hrUser.userEmail, user: { ...hrUser, isActive: !hrUser.isActive } });
      toast.success(hrUser.isActive ? 'HR user deactivated' : 'HR user activated');
    } catch (error: unknown) { toast.error(error instanceof Error ? error.message : 'Unable to update the HR user'); }
  };
  const deleteHrUser = async () => {
    if (!deleteTarget) return;
    try {
      await manageHrUser.mutateAsync({ action: 'delete', originalEmail: deleteTarget.userEmail });
      toast.success('HR user deleted from SharePoint');
      setDeleteTarget(undefined);
    } catch (error: unknown) { toast.error(error instanceof Error ? error.message : 'Unable to delete the HR user'); }
  };
  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 className="text-2xl font-semibold">Access Administration</h1><p className="text-muted-foreground">Manage HR access directly in the SharePoint HRUsers list.</p></div><Button onClick={openCreate}><Plus />Add HR user</Button></div>
    <div className="grid gap-4 md:grid-cols-4"><Metric label="Employees" value={isEmployeeCountFetching ? '…' : isEmployeeCountError ? 'Unavailable' : String(employeeCount ?? 0)} /><Metric label="Managers" value={isManagerCountFetching ? '…' : isManagerCountError ? 'Unavailable' : String(managerCount ?? 0)} /><Metric label="HR Users" value={isHrCountFetching ? '…' : isHrCountError ? 'Unavailable' : String(hrCount ?? 0)} /><Metric label="Admins" value={`${activeAdmins.length}`} /></div>
    {isEmployeeCountError && <Alert className="border-l-4 border-l-destructive"><CircleAlert /><AlertTitle>Employee Count Could Not Be Loaded</AlertTitle><AlertDescription>The Employees list at the configured SharePoint site could not be read.<Button className="ml-3" variant="outline" size="sm" onClick={() => { void refetchEmployeeCount(); }}><RefreshCw />Retry count</Button></AlertDescription></Alert>}
    {isManagerCountError && <Alert className="border-l-4 border-l-destructive"><CircleAlert /><AlertTitle>Manager Count Could Not Be Loaded</AlertTitle><AlertDescription>The Managers list at the configured SharePoint site could not be read.<Button className="ml-3" variant="outline" size="sm" onClick={() => { void refetchManagerCount(); }}><RefreshCw />Retry count</Button></AlertDescription></Alert>}
    {isHrCountError && <Alert className="border-l-4 border-l-destructive"><CircleAlert /><AlertTitle>HR User Count Could Not Be Loaded</AlertTitle><AlertDescription>The HRUsers list at the configured SharePoint site could not be read.<Button className="ml-3" variant="outline" size="sm" onClick={() => { void refetchHrCount(); }}><RefreshCw />Retry count</Button></AlertDescription></Alert>}
    <Card><CardHeader><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><CardTitle>HR Users</CardTitle><CardDescription>Search, add, edit, activate, deactivate, or permanently delete HR access.</CardDescription></div><Button variant="outline" size="sm" disabled={isFetching} onClick={() => { void refetch(); }}><RefreshCw className={isFetching ? 'animate-spin' : ''} />Refresh</Button></div></CardHeader><CardContent className="space-y-4"><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2" /><Input className="pl-9" value={search} onChange={(event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)} placeholder="Search HR Users by name or email" /></div>
    {isFetching ? <div className="space-y-3" aria-hidden="true">{[1, 2, 3].map((item: number) => <div key={item} className="h-16 animate-pulse rounded-xl bg-skeleton" />)}</div> : isError ? <Alert className="border-l-4 border-l-destructive"><CircleAlert /><AlertTitle>HRUsers could not be loaded</AlertTitle><AlertDescription><Button className="mt-3" variant="outline" size="sm" onClick={() => { void refetch(); }}>Retry</Button></AlertDescription></Alert> : visibleHrUsers.length === 0 ? <div className="rounded-xl border border-dashed p-8 text-center"><p className="font-medium">No HR Users found</p><p className="mt-1 text-sm text-muted-foreground">Add an HR user or adjust your search.</p></div> : <div className="divide-y rounded-xl border">{visibleHrUsers.map((hrUser: SharePointHRUser) => <div key={hrUser.userEmail} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"><div className="flex-1"><p className="font-medium">{hrUser.userName || 'Unnamed user'}</p><p className="text-sm text-muted-foreground">{hrUser.userEmail}</p></div><Badge variant={hrUser.isActive ? 'default' : 'secondary'}>{hrUser.isActive ? 'Active' : 'Inactive'}</Badge><div className="flex gap-2"><Button variant="outline" size="sm" disabled={manageHrUser.isPending} onClick={() => { void toggleActive(hrUser); }}>{hrUser.isActive ? 'Deactivate' : 'Activate'}</Button><Button variant="ghost" size="icon" aria-label={`Edit ${hrUser.userName}`} onClick={() => openEdit(hrUser)}><Pencil /></Button><Button variant="ghost" size="icon" aria-label={`Delete ${hrUser.userName}`} onClick={() => setDeleteTarget(hrUser)}><Trash2 /></Button></div></div>)}</div>}
    </CardContent></Card>
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="sm:max-w-lg"><form className="space-y-5" onSubmit={saveHrUser}><DialogHeader><DialogTitle>{editingEmail ? 'Edit HR user' : 'Add HR user'}</DialogTitle><DialogDescription>Changes are written directly to the configured SharePoint HRUsers list.</DialogDescription></DialogHeader><div className="space-y-2"><Label htmlFor="hr-user-name">Name</Label><Input id="hr-user-name" value={form.userName} onChange={(event: ChangeEvent<HTMLInputElement>) => setForm({ ...form, userName: event.target.value })} /></div><div className="space-y-2"><Label htmlFor="hr-user-email">Email</Label><Input id="hr-user-email" type="email" value={form.userEmail} onChange={(event: ChangeEvent<HTMLInputElement>) => setForm({ ...form, userEmail: event.target.value })} /></div><div className="flex items-center justify-between rounded-xl border p-4"><div><p className="font-medium">Active access</p><p className="text-sm text-muted-foreground">Inactive users cannot use the HR role.</p></div><Button type="button" variant={form.isActive ? 'default' : 'outline'} onClick={() => setForm({ ...form, isActive: !form.isActive })}>{form.isActive ? 'Active' : 'Inactive'}</Button></div><DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button type="submit" disabled={manageHrUser.isPending}>{manageHrUser.isPending ? 'Saving…' : 'Save HR user'}</Button></DialogFooter></form></DialogContent></Dialog>
    <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open: boolean) => { if (!open) setDeleteTarget(undefined); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete HR user permanently?</AlertDialogTitle><AlertDialogDescription>This removes {deleteTarget?.userName} from the SharePoint HRUsers list. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { void deleteHrUser(); }}>Delete HR user</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}

function CampaignCard({ campaign, onManage }: { campaign: CampaignSummary; onManage: (campaign: CampaignSummary) => void }) {
  const dates = campaign.startDate && campaign.endDate ? `${format(campaign.startDate, 'd MMM')} – ${format(campaign.endDate, 'd MMM yyyy')}` : 'Schedule not set';
  return <Card className="border-l-4 border-l-primary"><CardHeader><div className="flex justify-between gap-4"><div><Badge variant="outline" className="mb-2">{campaign.type}</Badge><CardTitle>{campaign.name}</CardTitle></div><Badge variant={campaign.status === 'Open' ? 'default' : 'secondary'}>{campaign.status}</Badge></div><CardDescription>{dates}</CardDescription></CardHeader><CardContent className="flex items-center justify-between"><span className="text-sm text-muted-foreground">{campaign.participants} campaign participants</span><Button variant="outline" size="sm" onClick={() => onManage(campaign)}>{campaign.status === 'Archived' ? 'View archive' : 'Manage'}</Button></CardContent></Card>;
}
function HrDashboard() { return <div className="space-y-6"><div><h1 className="text-2xl font-semibold">HR Dashboard</h1><p className="text-muted-foreground">Participation and workflow oversight for the active campaign.</p></div><div className="grid gap-4 md:grid-cols-4"><Metric label="Invited" value="48" /><Metric label="Employee submitted" value="34" /><Metric label="Manager input added" value="23" /><Metric label="HR review pending" value="11" /></div><Card><CardHeader><CardTitle>Workflow Status</CardTitle></CardHeader><CardContent className="space-y-5"><StatusRow label="Not started" count={8} value={17} /><StatusRow label="Employee in progress" count={6} value={13} /><StatusRow label="Manager input not added (optional)" count={11} value={23} /><StatusRow label="HR review pending" count={11} value={23} /><StatusRow label="Completed" count={12} value={25} /></CardContent></Card></div>; }
function Metric({ label, value }: { label: string; value: string }) { return <Card><CardHeader><CardDescription>{label}</CardDescription><CardTitle className="text-3xl">{value}</CardTitle></CardHeader></Card>; }
function StatusRow({ label, count, value }: { label: string; count: number; value: number }) { return <div><div className="mb-2 flex justify-between text-sm"><span>{label}</span><span className="font-medium">{count}</span></div><Progress value={value} /></div>; }
