import { Link } from "wouter";
import { useListHistory } from "@workspace/api-client-react";
import { Activity, TerminalSquare, Search, FileText, ShieldAlert, ArrowRight, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { data: history, isLoading } = useListHistory();

  const recentHistory = history?.slice(0, 5) || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold font-mono uppercase tracking-tight mb-2">Command Center</h1>
        <p className="text-muted-foreground font-mono text-sm">System ready. Select a tool to begin analysis.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:border-primary/50 transition-colors bg-card/50">
          <CardHeader className="pb-2">
            <Search className="text-primary mb-2" size={24} />
            <CardTitle className="font-mono text-lg uppercase tracking-wide">IOC Extractor</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-4">Extract IP addresses, domains, hashes, and more from raw text.</p>
            <Link href="/ioc-extractor">
              <Button variant="outline" className="w-full font-mono text-xs rounded-none border-border hover:border-primary">
                LAUNCH TOOL <ArrowRight size={14} className="ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors bg-card/50">
          <CardHeader className="pb-2">
            <TerminalSquare className="text-primary mb-2" size={24} />
            <CardTitle className="font-mono text-lg uppercase tracking-wide">Log Analyzer</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-4">AI-powered security log analysis and threat assessment.</p>
            <Link href="/log-analyzer">
              <Button variant="outline" className="w-full font-mono text-xs rounded-none border-border hover:border-primary">
                LAUNCH TOOL <ArrowRight size={14} className="ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors bg-card/50">
          <CardHeader className="pb-2">
            <FileText className="text-primary mb-2" size={24} />
            <CardTitle className="font-mono text-lg uppercase tracking-wide">Incident Report</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-4">Generate structured incident reports from investigation notes.</p>
            <Link href="/incident-report">
              <Button variant="outline" className="w-full font-mono text-xs rounded-none border-border hover:border-primary">
                LAUNCH TOOL <ArrowRight size={14} className="ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors bg-card/50">
          <CardHeader className="pb-2">
            <ShieldAlert className="text-primary mb-2" size={24} />
            <CardTitle className="font-mono text-lg uppercase tracking-wide">Decoder</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-4">Encode and decode Base64, Hex, URL encoding, and inspect JWTs.</p>
            <Link href="/decoder">
              <Button variant="outline" className="w-full font-mono text-xs rounded-none border-border hover:border-primary">
                LAUNCH TOOL <ArrowRight size={14} className="ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="pt-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold font-mono uppercase tracking-tight flex items-center gap-2">
            <Clock size={20} className="text-primary" />
            Recent Activity
          </h2>
          <Link href="/history">
            <Button variant="ghost" className="font-mono text-xs hover:text-primary">
              VIEW ALL
            </Button>
          </Link>
        </div>

        <Card className="bg-card/50">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground font-mono text-sm animate-pulse">
                Fetching records...
              </div>
            ) : recentHistory.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground font-mono text-sm">
                No recent activity found. Run an analysis to see history here.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentHistory.map((entry) => (
                  <div key={entry.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="bg-secondary p-2 border border-border">
                        {entry.type === 'log_analysis' ? (
                          <TerminalSquare size={16} className="text-primary" />
                        ) : (
                          <FileText size={16} className="text-primary" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm font-mono truncate max-w-[300px] md:max-w-md">
                          {entry.title || "Untitled Analysis"}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] uppercase font-mono bg-secondary px-1.5 py-0.5 border border-border text-muted-foreground">
                            {entry.type === 'log_analysis' ? 'Log Analysis' : 'Incident Report'}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {new Date(entry.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Link href={`/history?id=${entry.id}`}>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowRight size={16} />
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
