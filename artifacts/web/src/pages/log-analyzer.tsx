import { useState } from "react";
import { TerminalSquare, AlertTriangle, ShieldCheck, Activity, Copy, CheckCheck, Loader2, Search } from "lucide-react";
import { useAnalyzeLogs } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { type LogAnalysisResultSeverity } from "@workspace/api-client-react";

export default function LogAnalyzerPage() {
  const [logText, setLogText] = useState("");
  const analyzeMutation = useAnalyzeLogs();
  const [copiedValue, setCopiedValue] = useState<string | null>(null);

  const handleAnalyze = () => {
    if (!logText.trim()) {
      toast.error("Please provide log data to analyze");
      return;
    }

    analyzeMutation.mutate(
      { data: { logText } },
      {
        onSuccess: () => {
          toast.success("Analysis complete");
        },
        onError: (error: any) => {
          // Check for the 503 or AI provider configuration error specifically
          const errorMsg = error?.data?.error || error?.message || "Unknown error";
          if (error?.status === 503 || errorMsg.toLowerCase().includes("temporarily unavailable") || errorMsg.toLowerCase().includes("provider")) {
            toast.error("AI analysis is temporarily unavailable. The backend AI provider is not fully configured yet.");
          } else {
            toast.error(`Analysis failed: ${errorMsg}`);
          }
        }
      }
    );
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedValue(text);
    setTimeout(() => setCopiedValue(null), 2000);
    toast.success("Copied to clipboard");
  };

  const result = analyzeMutation.data;
  const isError = analyzeMutation.isError;
  const isPending = analyzeMutation.isPending;

  const getSeverityColor = (severity: LogAnalysisResultSeverity) => {
    switch (severity) {
      case "critical": return "bg-destructive text-destructive-foreground border-destructive";
      case "high": return "bg-orange-500 text-white border-orange-500";
      case "medium": return "bg-yellow-500 text-black border-yellow-500";
      case "low": return "bg-blue-500 text-white border-blue-500";
      case "informational": return "bg-slate-500 text-white border-slate-500";
      default: return "bg-secondary text-secondary-foreground border-border";
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div>
        <h1 className="text-3xl font-bold font-mono uppercase tracking-tight mb-2 flex items-center gap-2">
          <TerminalSquare className="text-primary" /> AI Log Analyzer
        </h1>
        <p className="text-muted-foreground font-mono text-sm">
          Submit raw security logs (syslog, firewall, EDR) to our AI engine for structured assessment.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        <Card className="flex flex-col border-border rounded-none shadow-none bg-card/50">
          <CardHeader className="py-4 border-b border-border bg-secondary/30 shrink-0">
            <CardTitle className="font-mono text-sm uppercase">Raw Log Input</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 relative flex flex-col">
            <Textarea
              value={logText}
              onChange={(e) => setLogText(e.target.value)}
              placeholder="Paste syslog, nginx logs, firewall drops, or EDR alerts here..."
              className="flex-1 resize-none border-0 rounded-none focus-visible:ring-0 p-4 font-mono text-sm bg-transparent"
            />
            <div className="p-4 border-t border-border shrink-0 bg-card">
              <Button 
                onClick={handleAnalyze} 
                disabled={isPending || !logText.trim()}
                className="w-full font-mono font-bold uppercase tracking-widest rounded-none"
              >
                {isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing Analysis...</>
                ) : (
                  <><Activity className="mr-2 h-4 w-4" /> Analyze Logs</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col border-border rounded-none shadow-none bg-[#0a0a0c]">
          <CardHeader className="py-4 border-b border-border bg-secondary/30 shrink-0">
            <CardTitle className="font-mono text-sm uppercase text-primary">Analysis Result</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto">
            {isPending ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="font-mono text-sm text-muted-foreground animate-pulse">Running heuristic analysis and mapping to MITRE ATT&CK...</p>
              </div>
            ) : isError ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="bg-destructive/20 p-4 rounded-full">
                  <AlertTriangle className="h-8 w-8 text-destructive" />
                </div>
                <div>
                  <h3 className="font-mono font-bold text-lg mb-2">Analysis Failed</h3>
                  <p className="font-mono text-sm text-muted-foreground max-w-md">
                    AI analysis is temporarily unavailable. The backend AI provider is not fully configured yet. 
                    Please try again later.
                  </p>
                </div>
              </div>
            ) : result ? (
              <div className="p-6 space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="font-mono font-bold text-sm text-muted-foreground uppercase tracking-widest">Severity</h3>
                    <Badge variant="outline" className={`font-mono uppercase text-sm rounded-none border ${getSeverityColor(result.severity)}`}>
                      {result.severity}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-xs text-muted-foreground uppercase">Assessment ID</span>
                    <p className="font-mono text-xs">{result.id.split("-")[0]}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-mono font-bold text-sm text-primary uppercase tracking-widest">Executive Summary</h3>
                  <div className="bg-secondary/20 p-4 border border-border/50 text-sm leading-relaxed">
                    {result.summary}
                  </div>
                </div>

                {result.mitreMappings && result.mitreMappings.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-mono font-bold text-sm text-primary uppercase tracking-widest">MITRE ATT&CK Mappings</h3>
                    <div className="grid gap-2">
                      {result.mitreMappings.map((m, i) => (
                        <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-border bg-card gap-2">
                          <div>
                            <span className="font-mono text-xs text-muted-foreground">{m.tacticId}</span>
                            <span className="font-mono font-bold text-sm ml-2">{m.tacticName}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-sm mr-2">{m.techniqueName}</span>
                            <span className="font-mono text-xs text-muted-foreground">{m.techniqueId}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.indicators && result.indicators.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-mono font-bold text-sm text-primary uppercase tracking-widest">Extracted Indicators</h3>
                    <div className="flex flex-wrap gap-2">
                      {result.indicators.map((ioc, i) => (
                        <div key={i} className="group inline-flex items-center bg-card border border-border text-sm overflow-hidden rounded-none">
                          <span className="bg-secondary px-2 py-1 font-mono text-xs font-bold uppercase border-r border-border">
                            {ioc.type}
                          </span>
                          <span className="px-3 py-1 font-mono">{ioc.value}</span>
                          <button 
                            onClick={() => handleCopy(ioc.value)}
                            className="px-2 py-1 hover:bg-muted transition-colors border-l border-border"
                          >
                            {copiedValue === ioc.value ? <CheckCheck size={14} className="text-primary"/> : <Copy size={14}/>}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(result.investigationSteps?.length > 0 || result.containmentRecommendations?.length > 0) && (
                  <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-border">
                    {result.investigationSteps && result.investigationSteps.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="font-mono font-bold text-sm text-primary uppercase tracking-widest flex items-center gap-2">
                          <Search size={16} /> Next Steps
                        </h3>
                        <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                          {result.investigationSteps.map((step, i) => (
                            <li key={i}>{step}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {result.containmentRecommendations && result.containmentRecommendations.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="font-mono font-bold text-sm text-primary uppercase tracking-widest flex items-center gap-2">
                          <ShieldCheck size={16} /> Containment
                        </h3>
                        <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                          {result.containmentRecommendations.map((rec, i) => (
                            <li key={i}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground font-mono text-sm p-8 text-center">
                Paste logs and click Analyze to view AI assessment.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
