import { Link } from "wouter"
import { ShieldAlert, ChevronRight, Activity, TerminalSquare, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <header className="border-b border-border py-4 px-6 md:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3 text-primary">
          <ShieldAlert size={28} />
          <span className="font-bold text-xl tracking-tight text-foreground">ThreatPilot AI</span>
          <Badge variant="outline" className="border-yellow-500/40 text-yellow-500 font-mono text-[10px] tracking-widest">
            🟡 BETA
          </Badge>
        </div>
        <div className="flex gap-4">
          <Link href="/sign-in" className="text-sm font-mono font-medium text-muted-foreground hover:text-foreground transition-colors py-2 px-4 border border-transparent">
            SIGN IN
          </Link>
          <Link href="/sign-up" className="text-sm font-mono font-bold bg-primary text-primary-foreground py-2 px-4 hover:bg-primary/90 transition-colors uppercase">
            REQUEST CLEARANCE
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center pt-24 pb-32">
        <div className="inline-flex items-center gap-2 border border-border px-3 py-1 mb-8 text-xs font-mono font-medium text-muted-foreground uppercase tracking-widest bg-secondary/50">
          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
          System Operational
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter max-w-4xl leading-[1.1] mb-6">
          ThreatPilot AI <span className="text-muted-foreground">(Beta)</span>
        </h1>

        <p className="text-2xl md:text-3xl font-bold text-primary font-mono tracking-tight mb-6">
          Analyze. Detect. Respond.
        </p>

        <p className="text-xl text-muted-foreground max-w-2xl mb-4 font-mono leading-relaxed">
          ThreatPilot AI is an AI-powered cybersecurity assistant designed for SOC Analysts, Security Engineers, Incident Responders, and Cybersecurity Students. It helps analyze logs, extract IOCs, generate incident reports, and simplify security investigations.
        </p>

        <p className="text-sm text-yellow-500/90 max-w-2xl mb-12 font-mono leading-relaxed border border-yellow-500/30 bg-yellow-500/5 px-4 py-3">
          ThreatPilot AI is currently in Beta. Core cybersecurity tools are available while advanced AI capabilities are being actively developed.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 mb-24">
          <Link href="/sign-up" className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground h-12 px-8 font-mono font-bold hover:bg-primary/90 transition-colors uppercase text-sm">
            INITIALIZE CONSOLE <ChevronRight size={16} />
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl w-full text-left">
          <div className="border border-border p-6 bg-card flex flex-col gap-4">
            <Search className="text-primary" size={24} />
            <h3 className="font-bold text-lg font-mono uppercase tracking-wide">IOC Extraction</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">Instantly parse vast amounts of text and pull out IPv4/IPv6, Domains, URLs, Hashes, and CVEs with 100% client-side precision.</p>
          </div>
          <div className="border border-border p-6 bg-card flex flex-col gap-4">
            <TerminalSquare className="text-primary" size={24} />
            <h3 className="font-bold text-lg font-mono uppercase tracking-wide">AI Log Analysis</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">Submit raw security logs to our AI engine. Receive structured assessments, MITRE ATT&CK mappings, and severity ratings.</p>
          </div>
          <div className="border border-border p-6 bg-card flex flex-col gap-4">
            <Activity className="text-primary" size={24} />
            <h3 className="font-bold text-lg font-mono uppercase tracking-wide">Incident Reporting</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">Generate structured executive summaries, timelines, and remediation steps from free-form investigation notes.</p>
          </div>
        </div>
      </main>
      
      <footer className="border-t border-border py-8 px-6 text-center text-sm font-mono text-muted-foreground space-y-1">
        <p className="font-bold text-foreground uppercase tracking-wide">ThreatPilot AI</p>
        <p>Version 0.9 Beta</p>
        <p>&copy; 2026 ThreatPilot AI</p>
        <p>All Rights Reserved</p>
      </footer>
    </div>
  )
}
