import { useState, type ChangeEvent } from 'react';
import { FileText, ShieldCheck, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export type DocumentUploaderRole = 'Employee' | 'Manager' | 'HR';

export type EmployeeDocumentRecord = {
  id: string;
  employeeId: string;
  employeeName: string;
  campaignName: string;
  filename: string;
  note: string;
  uploaderRole: DocumentUploaderRole;
  uploaderName: string;
  uploadedAt: string;
};

export function EmployeeDocumentPanel({ employeeId, employeeName, campaignName, uploaderRole, uploaderName, records, canUpload, onAdd }: { employeeId: string; employeeName: string; campaignName: string; uploaderRole: DocumentUploaderRole; uploaderName: string; records: EmployeeDocumentRecord[]; canUpload: boolean; onAdd: (record: EmployeeDocumentRecord) => void }) {
  const [note, setNote] = useState('');
  const [selectedFile, setSelectedFile] = useState<File>();

  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setSelectedFile(file);
  };

  const addDocument = () => {
    if (!selectedFile) {
      toast.error('Choose a supporting document first');
      return;
    }
    onAdd({
      id: crypto.randomUUID(),
      employeeId,
      employeeName,
      campaignName,
      filename: selectedFile.name,
      note: note.trim(),
      uploaderRole,
      uploaderName,
      uploadedAt: new Date().toISOString(),
    });
    setSelectedFile(undefined);
    setNote('');
    toast.success(`Document added for ${employeeName}`);
  };

  return <Card className="border-l-4 border-l-primary">
    <CardHeader>
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div><CardTitle>Supporting document</CardTitle><CardDescription>Append-only documents for {employeeName}. Every addition is immediately visible to the employee and retained in the audit history.</CardDescription></div>
        <Badge variant="secondary"><ShieldCheck />Audited</Badge>
      </div>
    </CardHeader>
    <CardContent className="space-y-5">
      {canUpload && <div className="grid gap-4 rounded-xl bg-muted p-4 text-muted-foreground lg:grid-cols-[1fr_1fr_auto] lg:items-end">
        <div className="space-y-2"><Label className="text-foreground">Supporting Document</Label><label className="flex cursor-pointer items-center gap-3 rounded-lg border bg-background p-3 text-foreground hover:bg-card"><Upload className="size-4" /><span className="min-w-0 truncate text-sm">{selectedFile?.name ?? 'Choose A Common Document Or Image'}</span><Input className="sr-only" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf,.odt,.png,.jpg,.jpeg" onChange={chooseFile} /></label></div>
        <div className="space-y-2"><Label htmlFor={`document-note-${employeeId}`} className="text-foreground">Context Note</Label><Textarea id={`document-note-${employeeId}`} value={note} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setNote(event.target.value)} placeholder="Explain what this document demonstrates" rows={2} /></div>
        <Button onClick={addDocument}><Upload />Add Document</Button>
      </div>}
      <div className="space-y-2">
        {records.length === 0 ? <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">No shared supporting document has been added yet.</p> : records.map((record: EmployeeDocumentRecord) => <div key={record.id} className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-start">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground"><FileText className="size-4" /></span>
          <div className="min-w-0 flex-1"><p className="truncate font-medium">{record.filename}</p><p className="mt-1 text-sm text-muted-foreground">{record.note || 'No context note provided.'}</p><p className="mt-2 text-xs text-muted-foreground">Added by {record.uploaderName} · {record.uploaderRole} · {new Date(record.uploadedAt).toLocaleString()}</p></div>
          <div className="flex flex-wrap gap-2"><Badge variant="outline">{record.campaignName}</Badge><Badge variant="secondary">Employee visible</Badge></div>
        </div>)}
      </div>
    </CardContent>
  </Card>;
}
