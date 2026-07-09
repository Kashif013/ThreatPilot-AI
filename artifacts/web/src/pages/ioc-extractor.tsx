import { useState, useMemo } from "react";
import { Search, Copy, CheckCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// Basic regex patterns for IOCs
const IOC_PATTERNS = {
  ipv4: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
  ipv6: /\b(?:[A-F0-9]{1,4}:){7}[A-F0-9]{1,4}\b/gi,
  domain: /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]\b/gi,
  url: /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,
  md5: /\b[a-fA-F0-9]{32}\b/gi,
  sha1: /\b[a-fA-F0-9]{40}\b/gi,
  sha256: /\b[a-fA-F0-9]{64}\b/gi,
  cve: /\bCVE-\d{4}-\d{4,7}\b/gi,
};

type IocType = keyof typeof IOC_PATTERNS;

interface ExtractedIoc {
  type: IocType;
  value: string;
}

export default function IocExtractorPage() {
  const [input, setInput] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  const extractedIocs = useMemo(() => {
    if (!input.trim()) return {};
    
    const results: Record<string, string[]> = {};
    const processedInput = input; // Optional defanging removal could go here
    
    (Object.keys(IOC_PATTERNS) as IocType[]).forEach((type) => {
      const regex = IOC_PATTERNS[type];
      const matches = processedInput.match(regex);
      if (matches) {
        // Deduplicate and filter out false positives if needed
        results[type] = Array.from(new Set(matches));
      }
    });
    
    return results;
  }, [input]);

  const totalIocs = Object.values(extractedIocs).reduce((acc, curr) => acc + curr.length, 0);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
    toast.success("Copied to clipboard");
  };

  const handleCopyGroup = (type: string, items: string[]) => {
    navigator.clipboard.writeText(items.join("\n"));
    toast.success(`Copied all ${type}s`);
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div>
        <h1 className="text-3xl font-bold font-mono uppercase tracking-tight mb-2 flex items-center gap-2">
          <Search className="text-primary" /> IOC Extractor
        </h1>
        <p className="text-muted-foreground font-mono text-sm">
          Paste raw logs, emails, or threat intel reports. IOCs are extracted locally on your machine.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        <Card className="flex flex-col border-border rounded-none h-[calc(100vh-200px)]">
          <CardHeader className="py-4 border-b border-border bg-secondary/30 shrink-0 flex flex-row items-center justify-between">
            <CardTitle className="font-mono text-sm uppercase">Raw Input Data</CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setInput("")} 
              disabled={!input}
              className="h-8 text-xs font-mono"
            >
              <Trash2 size={14} className="mr-2" /> CLEAR
            </Button>
          </CardHeader>
          <CardContent className="p-0 flex-1 relative">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste raw text here..."
              className="h-full resize-none border-0 rounded-none focus-visible:ring-0 p-4 font-mono text-sm bg-transparent"
            />
          </CardContent>
        </Card>

        <Card className="flex flex-col border-border rounded-none h-[calc(100vh-200px)]">
          <CardHeader className="py-4 border-b border-border bg-secondary/30 shrink-0 flex flex-row items-center justify-between">
            <CardTitle className="font-mono text-sm uppercase">
              Extracted Indicators
              {totalIocs > 0 && <Badge variant="secondary" className="ml-2 font-mono">{totalIocs}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto bg-[#0a0a0c]">
            {totalIocs === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground font-mono text-sm p-8 text-center">
                {input ? "No indicators found in input text." : "Waiting for input data..."}
              </div>
            ) : (
              <div className="p-4 space-y-6">
                {(Object.entries(extractedIocs) as [string, string[]][]).map(([type, items]) => {
                  if (items.length === 0) return null;
                  
                  return (
                    <div key={type} className="space-y-2">
                      <div className="flex items-center justify-between border-b border-border/50 pb-1">
                        <h3 className="font-mono font-bold text-xs uppercase text-primary tracking-widest flex items-center gap-2">
                          {type} <Badge variant="outline" className="text-[10px] h-4 px-1 rounded-sm border-primary/30">{items.length}</Badge>
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[10px] font-mono hover:text-primary uppercase"
                          onClick={() => handleCopyGroup(type, items)}
                        >
                          Copy All
                        </Button>
                      </div>
                      <div className="space-y-1">
                        {items.map((item, idx) => {
                          const id = `${type}-${idx}`;
                          const isCopied = copiedIndex === id;
                          return (
                            <div 
                              key={id} 
                              className="group flex items-center justify-between bg-card border border-border/50 px-3 py-1.5 hover:border-primary/50 transition-colors"
                            >
                              <span className="font-mono text-sm text-foreground break-all">{item}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleCopy(item, id)}
                              >
                                {isCopied ? <CheckCheck size={14} className="text-primary" /> : <Copy size={14} />}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
