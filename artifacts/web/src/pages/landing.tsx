import { Link } from "wouter"
import { ShieldAlert, ChevronRight, Activity, TerminalSquare, Search } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <header className="border-b border-border py-4 px-6 md:px-12 flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary">
          <ShieldAlert size={28} />
          <span className="font-bold text-xl tracking-tight text-foreground">SOCPilot AI</span>
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
          The <span className="text-primary">Command Center</span> for Active Investigations.
        </h1>
        
        <p className="text-xl text-muted-foreground max-w-2xl mb-12 font-mono leading-relaxed">
          Precise, fast, and technical. Analyze logs, extract IOCs, and generate incident reports with AI assistance tailored for SOC analysts.
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
      
      <footer className="border-t border-border py-8 px-6 text-center text-sm font-mono text-muted-foreground">
        &copy; {new Date().getFullYear()} SOCPilot AI. Secure connection established.
      </footer>
    </div>
  )
}
