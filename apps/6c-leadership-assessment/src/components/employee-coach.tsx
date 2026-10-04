import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { Bot, ChevronRight, LoaderCircle, MessageCircle, Send, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useRoleScopedLeadershipChat, type LeadershipChatRole } from '@/hooks/use-role-scoped-leadership-chat';

type CoachView = 'home' | 'assessments' | 'form' | 'results';
type CoachMessage = { id: string; sender: 'coach' | 'user'; text: string };
type CoachPrompt = { label: string; destination?: { view: CoachView; section?: number } };

const sectionNames = ['6C Questions', 'Strengths & Development Areas', 'Supporting Documents Upload', 'Review & Submit'];

const promptsByRole = (role: LeadershipChatRole, view: string, section: number): CoachPrompt[] => {
  if (role === 'Manager') return [
    { label: 'Summarize My Direct Reports' },
    { label: 'Compare Team Strengths And Gaps' },
    { label: 'Suggest Coaching Actions' },
  ];
  if (role === 'HR') return [
    { label: 'Summarize The Campaign Cohort' },
    { label: 'Identify Cohort Trends And Risks' },
    { label: 'Recommend Development Priorities' },
  ];
  if (view === 'form' && section === 0) return [
    { label: 'Summarize My Current Ratings' },
    { label: 'Help Me Reflect On A Dimension' },
    { label: 'Go To Strengths', destination: { view: 'form', section: 1 } },
  ];
  if (view === 'form' && section === 1) return [
    { label: 'Suggest Development Objectives' },
    { label: 'Turn My Strengths Into Actions' },
    { label: 'Go To Supporting Documents', destination: { view: 'form', section: 2 } },
  ];
  if (view === 'results') return [
    { label: 'Summarize My Results' },
    { label: 'Explore My Development Opportunities' },
    { label: 'Prepare Manager Discussion Prompts' },
  ];
  return [
    { label: 'Summarize My Assessment' },
    { label: 'Suggest Coaching Actions' },
    { label: 'What Should I Focus On Next?' },
  ];
};

export function EmployeeCoach({ role, view, section, authorizedEmployeeData, onNavigate }: { role: LeadershipChatRole; view: string; section: number; authorizedEmployeeData: string; onNavigate?: (view: CoachView, section?: number) => void }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<CoachMessage[]>([
    { id: 'welcome', sender: 'coach', text: 'Ask me to summarize your reflections, explore supporting context, or suggest development actions using the employee records available to your role.' },
  ]);
  const chat = useRoleScopedLeadershipChat();
  const prompts = useMemo(() => promptsByRole(role, view, section), [role, view, section]);
  const contextLabel = view === 'form' ? sectionNames[section] ?? 'Assessment' : view.replaceAll('-', ' ');
  const coachTitle = role === 'Employee' ? '6C Employee Coach' : role === 'Manager' ? '6C Manager Coach' : '6C HR Coach';
  const launcherLabel = open ? 'Close Coach' : role === 'HR' ? 'Ask The 6C HR Coach' : 'Ask The 6C Coach';
  const launcherAriaLabel = open ? `Close ${coachTitle}` : `Open ${coachTitle}`;

  const askQuestion = async (question: string) => {
    const userMessage: CoachMessage = { id: crypto.randomUUID(), sender: 'user', text: question };
    setMessages((current: CoachMessage[]) => [...current, userMessage]);
    setInput('');
    try {
      const conversation = [...messages, userMessage].slice(-8).map((message: CoachMessage) => `${message.sender}: ${message.text}`).join('\n');
      const answer = await chat.mutateAsync({ question, role, pageContext: contextLabel, authorizedEmployeeData, conversation });
      setMessages((current: CoachMessage[]) => [...current, { id: crypto.randomUUID(), sender: 'coach', text: answer }]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'The 6C assistant could not answer right now.';
      toast.error(message);
      setMessages((current: CoachMessage[]) => [...current, { id: crypto.randomUUID(), sender: 'coach', text: 'I could not complete that analysis. Please try again.' }]);
    }
  };

  const answerPrompt = (prompt: CoachPrompt) => {
    if (prompt.destination && onNavigate) onNavigate(prompt.destination.view, prompt.destination.section);
    void askQuestion(prompt.label);
  };

  const submitQuestion = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const question = input.trim();
    if (!question || chat.isPending) return;
    void askQuestion(question);
  };

  return <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
    <AnimatePresence>
      {open && <motion.div initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }} transition={{ duration: 0.2, ease: 'easeOut' as const }}>
        <Card className="w-[min(27rem,calc(100vw-2rem))] overflow-hidden border-primary shadow-2xl">
          <CardHeader className="flex-row items-center gap-3 bg-sidebar p-4 text-sidebar-foreground">
            <span className="grid size-10 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground"><Bot className="size-5" /></span>
            <div className="min-w-0 flex-1"><CardTitle className="text-base">{coachTitle}</CardTitle><p className="truncate text-xs text-sidebar-foreground">{role} · {contextLabel}</p></div>
            <Button variant="ghost" size="icon-sm" className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" aria-label="Close 6C coach" onClick={() => setOpen(false)}><X /></Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-80 space-y-3 overflow-y-auto bg-background p-4" aria-live="polite">
              {messages.map((message: CoachMessage) => <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}><p className={`max-w-[90%] whitespace-pre-line rounded-xl px-3 py-2 text-sm leading-5 ${message.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{message.text}</p></div>)}
              {chat.isPending && <div className="flex justify-start"><p className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />Developing Contextual Insights…</p></div>}
            </div>
            <div className="space-y-2 border-t bg-card p-3 text-card-foreground">
              <div className="grid gap-2">{prompts.map((prompt: CoachPrompt) => <Button key={prompt.label} variant="outline" size="sm" className="h-auto w-full justify-between py-2 text-left whitespace-normal" disabled={chat.isPending} onClick={() => answerPrompt(prompt)}><span>{prompt.label}</span><ChevronRight className="size-4 shrink-0" /></Button>)}</div>
              <form className="flex gap-2 pt-1" onSubmit={submitQuestion}><Input value={input} disabled={chat.isPending} onChange={(event: ChangeEvent<HTMLInputElement>) => setInput(event.target.value)} placeholder="Ask About Authorized Employee Data…" aria-label="Ask the 6C coach" /><Button type="submit" size="icon" disabled={chat.isPending || !input.trim()} aria-label="Send Question">{chat.isPending ? <LoaderCircle className="animate-spin" /> : <Send />}</Button></form>
            </div>
          </CardContent>
        </Card>
      </motion.div>}
    </AnimatePresence>
    <Button size="lg" className="rounded-full shadow-xl" aria-expanded={open} aria-label={launcherAriaLabel} onClick={() => setOpen((current: boolean) => !current)}><MessageCircle />{launcherLabel}</Button>
  </div>;
}
