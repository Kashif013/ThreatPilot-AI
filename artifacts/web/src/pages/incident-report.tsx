import { useState } from "react";
import { FileText, AlertTriangle, Loader2, CheckCircle2, ArrowRight } from "lucide-react";
import { useGenerateIncidentReport, useListHistory } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Link } from "wouter";

export default function IncidentReportPage() {
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [priorAnalysisId, setPriorAnalysisId] = useState<string>("");
  
  const generateMutation = useGenerateIncidentReport();
  const { data: history } = useListHistory();

  const logAnalyses = history?.filter(h => h.type === 'log_analysis') || [];

  const handleGenerate = () => {
    if (!title.trim() || !details.trim()) {
      toast.error("Title and details are required.");
      return;
    }

    generateMutation.mutate(
      { 
        data: { 
          incidentTitle: title, 
          details,
          priorAnalysisId: priorAnalysisId || null
        } 
      },
      {
        onSuccess: () => {
          toast.success("Incident report generated successfully");
        },
        onError: (error: any) => {
          const errorMsg = error?.data?.error || error?.message || "Unknown error";
          if (error?.status === 503 || errorMsg.toLowerCase().includes("temporarily unavailable") || errorMsg.toLowerCase().includes("provider")) {
            toast.error("AI report generation is temporarily unavailable. The backend AI provider is not fully configured yet.");
          } else {
            toast.error(`Generation failed: ${errorMsg}`);
          }
        }
      }
    );
  };

  const result = generateMutation.data;
  const isError = generateMutation.isError;
  const isPending = generateMutation.isPending;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-mono uppercase tracking-tight mb-2 flex items-center gap-2">
          <FileText className="text-primary" /> Incident Report
        </h1>
        <p className="text-muted-foreground font-mono text-sm">
          Generate structured, executive-ready incident reports from raw investigation notes using AI.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Form */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="rounded-none border-border bg-card/50">
            <CardHeader className="border-b border-border bg-secondary/30 pb-4">
              <CardTitle className="font-mono text-sm uppercase">Report Parameters</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Incident Title</Label>
                <Input 
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Unauthorized Access to DB Server via Compromised Credentials"
                  className="font-mono rounded-none border-border focus-visible:ring-1 focus-visible:ring-primary bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="details" className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Investigation Notes & Context</Label>
                <Textarea 
                  id="details"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Paste timelines, affected systems, root cause findings, and steps taken so far..."
                  className="font-mono min-h-[200px] resize-y rounded-none border-border focus-visible:ring-1 focus-visible:ring-primary bg-background"
                />
              </div>

              {logAnalyses.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="priorAnalysis" className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Attach Prior Log Analysis (Optional)</Label>
                  <select
                    id="priorAnalysis"
                    value={priorAnalysisId}
                    onChange={(e) => setPriorAnalysisId(e.target.value)}
                    className="flex h-10 w-full rounded-none border border-input bg-background px-3 py-2 text-sm ring-offset-background font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">-- None --</option>
                    {logAnalyses.map(a => (
                      <option key={a.id} value={a.id}>{a.title || `Analysis ${a.id.substring(0,8)}`}</option>
                    ))}
                  </select>
                </div>
              )}

              <Button 
                onClick={handleGenerate} 
                disabled={isPending || !title.trim() || !details.trim()}
                className="w-full font-mono font-bold uppercase tracking-widest rounded-none mt-4"
              >
                {isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Compiling Report...</>
                ) : (
                  <>Generate Report</>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Output Preview */}
        <div className="lg:col-span-7">
          <Card className="rounded-none border-border bg-[#0a0a0c] h-full min-h-[600px] flex flex-col shadow-none">
            <CardHeader className="border-b border-border bg-secondary/30 pb-4 shrink-0 flex flex-row items-center justify-between">
              <CardTitle className="font-mono text-sm uppercase text-primary">Generated Report</CardTitle>
              {result && (
                <Link href={`/history?id=${result.id}`}>
                  <Button variant="ghost" size="sm" className="h-8 font-mono text-xs hover:text-primary">
                    View in History <ArrowRight size={14} className="ml-1" />
                  </Button>
                </Link>
              )}
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-auto">
              {isPending ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="font-mono text-sm text-muted-foreground animate-pulse">Structuring data and writing executive summary...</p>
                </div>
              ) : isError ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
                  <div className="bg-destructive/20 p-4 rounded-full">
                    <AlertTriangle className="h-8 w-8 text-destructive" />
                  </div>
                  <div>
                    <h3 className="font-mono font-bold text-lg mb-2">Generation Failed</h3>
                    <p className="font-mono text-sm text-muted-foreground max-w-md">
                      AI generation is temporarily unavailable. Please try again later when the provider is configured.
                    </p>
                  </div>
                </div>
              ) : result ? (
                <div className="p-8 max-w-3xl mx-auto space-y-8 bg-card border-x border-border min-h-full">
                  
                  {/* Report Header */}
                  <div className="border-b border-border pb-6 space-y-4">
                    <div className="flex items-center justify-between text-muted-foreground text-sm font-mono">
                      <span>INCIDENT REPORT</span>
                      <span>ID: {result.id}</span>
                    </div>
                    <h2 className="text-2xl font-bold font-serif tracking-tight leading-tight">
                      {result.incidentTitle}
                    </h2>
                    <div className="flex gap-4 font-mono text-xs text-muted-foreground bg-secondary/30 p-3 border border-border inline-flex">
                      <span>Date: {new Date(result.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Exec Summary */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold font-mono uppercase tracking-widest text-primary border-l-2 border-primary pl-2">Executive Summary</h3>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap font-sans">
                      {result.executiveSummary}
                    </p>
                  </div>

                  {/* Timeline */}
                  {result.timeline && result.timeline.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold font-mono uppercase tracking-widest text-primary border-l-2 border-primary pl-2">Timeline</h3>
                      <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                        {result.timeline.map((event, i) => (
                          <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full border border-border bg-card shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow shadow-primary/10 z-10">
                              <CheckCircle2 size={16} className="text-primary" />
                            </div>
                            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-secondary/20 p-3 border border-border">
                              <div className="font-mono text-xs text-primary mb-1">{event.timestamp}</div>
                              <div className="text-sm">{event.description}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Affected Assets */}
                  {result.affectedAssets && result.affectedAssets.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold font-mono uppercase tracking-widest text-primary border-l-2 border-primary pl-2">Affected Assets</h3>
                      <ul className="list-disc pl-5 text-sm space-y-1 font-mono">
                        {result.affectedAssets.map((asset, i) => <li key={i}>{asset}</li>)}
                      </ul>
                    </div>
                  )}

                  {/* Impact & Root Cause */}
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold font-mono uppercase tracking-widest text-primary border-l-2 border-primary pl-2">Root Cause</h3>
                      <p className="text-sm leading-relaxed">{result.rootCause}</p>
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold font-mono uppercase tracking-widest text-primary border-l-2 border-primary pl-2">Impact</h3>
                      <p className="text-sm leading-relaxed">{result.impact}</p>
                    </div>
                  </div>

                  {/* Remediation */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold font-mono uppercase tracking-widest text-primary border-l-2 border-primary pl-2">Containment & Eradication</h3>
                    <div className="bg-secondary/10 p-4 border border-border text-sm space-y-4">
                      <div>
                        <strong className="font-mono text-xs uppercase block mb-1">Containment:</strong>
                        {result.containment}
                      </div>
                      <div>
                        <strong className="font-mono text-xs uppercase block mb-1">Eradication:</strong>
                        {result.eradication}
                      </div>
                      <div>
                        <strong className="font-mono text-xs uppercase block mb-1">Recovery:</strong>
                        {result.recovery}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pb-8">
                    <h3 className="text-sm font-bold font-mono uppercase tracking-widest text-primary border-l-2 border-primary pl-2">Lessons Learned</h3>
                    <p className="text-sm leading-relaxed">{result.lessonsLearned}</p>
                  </div>

                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground font-mono text-sm p-8 text-center bg-card/10">
                  <div className="max-w-sm">
                    <FileText size={48} className="mx-auto mb-4 opacity-20" />
                    Fill out the parameters and generate to view the formatted incident report.
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
