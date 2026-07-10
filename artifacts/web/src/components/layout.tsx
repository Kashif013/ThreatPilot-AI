import { Link, useLocation } from "wouter"
import { useClerk, useUser } from "@clerk/react"
import { ShieldAlert, LogOut, TerminalSquare, FileText, Search, Activity, History } from "lucide-react"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"

const navItems = [
  { name: "Dashboard", path: "/dashboard", icon: Activity },
  { name: "IOC Extractor", path: "/ioc-extractor", icon: Search },
  { name: "Log Analyzer", path: "/log-analyzer", icon: TerminalSquare },
  { name: "Incident Report", path: "/incident-report", icon: FileText },
  { name: "Decoder", path: "/decoder", icon: ShieldAlert },
  { name: "History", path: "/history", icon: History },
]

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation()
  const { signOut } = useClerk()
  const { user } = useUser()

  return (
    <div className="flex h-screen w-full bg-background text-foreground font-mono">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border flex items-center gap-3">
          <div className="bg-primary/20 text-primary p-2 flex items-center justify-center">
            <ShieldAlert size={24} />
          </div>
          <div className="font-sans">
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg tracking-tight leading-none text-foreground uppercase">ThreatPilot AI</h1>
              <Badge variant="outline" className="border-yellow-500/40 text-yellow-500 font-mono text-[9px] px-1.5 py-0 leading-4 tracking-widest">
                🟡 BETA
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest">AI Console</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.path
            return (
              <Link key={item.path} href={item.path}>
                <div
                  className={`flex items-center gap-3 px-3 py-2 text-sm cursor-pointer transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary border-l-2 border-primary font-bold"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground border-l-2 border-transparent"
                  }`}
                >
                  <item.icon size={16} />
                  <span>{item.name}</span>
                </div>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-border mt-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-8 h-8 bg-secondary border border-border flex items-center justify-center flex-shrink-0">
                <span className="text-xs uppercase font-bold text-muted-foreground">
                  {user?.firstName?.[0] || user?.emailAddresses[0]?.emailAddress?.[0] || "?"}
                </span>
              </div>
              <div className="text-xs truncate text-muted-foreground">
                <div className="font-bold text-foreground truncate">{user?.firstName || "Analyst"}</div>
                <div className="truncate">{user?.emailAddresses[0]?.emailAddress}</div>
              </div>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="w-full justify-start text-muted-foreground text-xs h-8"
            onClick={() => signOut({ redirectUrl: "/" })}
          >
            <LogOut size={14} className="mr-2" />
            END SESSION
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Topbar */}
        <header className="h-14 border-b border-border flex items-center px-6 bg-card shrink-0">
          <div className="text-sm font-sans font-medium text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            System Active
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
