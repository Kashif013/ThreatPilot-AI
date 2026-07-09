import { useMemo, useRef, useState, type DragEvent } from "react";
import {
  Search,
  Copy,
  CheckCheck,
  Trash2,
  Upload,
  Download,
  FileJson,
  FileSpreadsheet,
  Globe,
  Link2,
  Mail,
  Fingerprint,
  ShieldAlert,
  Network,
  Radar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Regex patterns -- everything runs 100% client-side, no network calls.
// ---------------------------------------------------------------------------
const IOC_PATTERNS = {
  ipv4: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
  ipv6: /\b(?:[A-F0-9]{1,4}:){2,7}(?::[A-F0-9]{1,4}){1,6}\b|\b(?:[A-F0-9]{1,4}:){7}[A-F0-9]{1,4}\b/gi,
  url: /\b(?:https?|ftp):\/\/[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,10}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)/gi,
  domain: /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:com|net|org|edu|gov|mil|io|co|biz|info|ru|cn|uk|de|fr|jp|xyz|top|club|online|site|app|dev|ai|me|tv|cc|us|ca|au|info|link|click|shop|live)\b/gi,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/gi,
  md5: /\b[a-fA-F0-9]{32}\b/g,
  sha1: /\b[a-fA-F0-9]{40}\b/g,
  sha256: /\b[a-fA-F0-9]{64}\b/g,
  sha512: /\b[a-fA-F0-9]{128}\b/g,
  cve: /\bCVE-\d{4}-\d{4,7}\b/gi,
} as const;

type IocType = keyof typeof IOC_PATTERNS;

const IOC_LABELS: Record<IocType, string> = {
  ipv4: "IPv4 Addresses",
  ipv6: "IPv6 Addresses",
  url: "URLs",
  domain: "Domains",
  email: "Email Addresses",
  md5: "MD5 Hashes",
  sha1: "SHA1 Hashes",
  sha256: "SHA256 Hashes",
  sha512: "SHA512 Hashes",
  cve: "CVE IDs",
};

const IOC_ICONS: Record<IocType, typeof Globe> = {
  ipv4: Network,
  ipv6: Network,
  url: Link2,
  domain: Globe,
  email: Mail,
  md5: Fingerprint,
  sha1: Fingerprint,
  sha256: Fingerprint,
  sha512: Fingerprint,
  cve: ShieldAlert,
};

const IOC_ORDER: IocType[] = [
  "ipv4",
  "ipv6",
  "url",
  "domain",
  "email",
  "md5",
  "sha1",
  "sha256",
  "sha512",
  "cve",
];

const ACCEPTED_EXTENSIONS = [".txt", ".log", ".csv", ".json"];

function extractIocs(text: string): Record<IocType, string[]> {
  const results = {} as Record<IocType, string[]>;
  if (!text.trim()) {
    IOC_ORDER.forEach((type) => (results[type] = []));
    return results;
  }

  // Extract in a fixed priority order so higher-specificity types (urls,
  // emails, hashes, CVEs) claim their substrings before the looser "domain"
  // pattern has a chance to re-match the same text (e.g. a URL's hostname).
  const consumed = new Set<string>();

  const priority: IocType[] = [
    "url",
    "email",
    "cve",
    "sha512",
    "sha256",
    "sha1",
    "md5",
    "ipv6",
    "ipv4",
    "domain",
  ];

  for (const type of priority) {
    const regex = IOC_PATTERNS[type];
    const matches = text.match(regex) ?? [];
    const unique = Array.from(new Set(matches.map((m) => m.trim())));

    if (type === "domain") {
      // Drop domains that are just the hostname portion of an already-found
      // URL or email, so the same value doesn't appear twice in two cards.
      results[type] = unique.filter((d) => !consumed.has(d.toLowerCase()));
    } else {
      results[type] = unique;
      if (type === "url") {
        unique.forEach((u) => {
          try {
            const host = new URL(u).hostname.toLowerCase();
            consumed.add(host);
          } catch {
            // ignore malformed URL
          }
        });
      }
      if (type === "email") {
        unique.forEach((e) => {
          const host = e.split("@")[1]?.toLowerCase();
          if (host) consumed.add(host);
        });
      }
    }
  }

  return results;
}

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function toCsv(rows: { type: string; value: string }[]): string {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const header = "type,value";
  const body = rows.map((r) => `${escape(r.type)},${escape(r.value)}`).join("\n");
  return `${header}\n${body}`;
}

export default function IocExtractorPage() {
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extracted = useMemo(() => extractIocs(input), [input]);

  const totalIocs = IOC_ORDER.reduce((acc, type) => acc + extracted[type].length, 0);

  const countsByType = IOC_ORDER.map((type) => ({
    type,
    label: IOC_LABELS[type],
    count: extracted[type].length,
  })).filter((c) => c.count > 0);

  const normalizedSearch = search.trim().toLowerCase();

  const visibleGroups = IOC_ORDER.map((type) => {
    const items = extracted[type];
    const filtered = normalizedSearch
      ? items.filter(
          (value) =>
            value.toLowerCase().includes(normalizedSearch) ||
            IOC_LABELS[type].toLowerCase().includes(normalizedSearch),
        )
      : items;
    return { type, items: filtered, totalCount: items.length };
  }).filter((g) => g.items.length > 0);

  function processFileContent(name: string, content: string) {
    setInput((prev) => (prev ? `${prev}\n\n${content}` : content));
    toast.success(`Loaded ${name}`);
  }

  function readFiles(files: FileList | File[]) {
    const list = Array.from(files);
    const valid = list.filter((f) =>
      ACCEPTED_EXTENSIONS.some((ext) => f.name.toLowerCase().endsWith(ext)),
    );

    if (valid.length === 0) {
      toast.error("Only .txt, .log, .csv and .json files are supported");
      return;
    }

    setIsProcessing(true);
    let remaining = valid.length;

    valid.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        processFileContent(file.name, String(reader.result ?? ""));
        remaining -= 1;
        if (remaining === 0) setIsProcessing(false);
      };
      reader.onerror = () => {
        toast.error(`Failed to read ${file.name}`);
        remaining -= 1;
        if (remaining === 0) setIsProcessing(false);
      };
      reader.readAsText(file);
    });
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) {
      readFiles(e.dataTransfer.files);
    }
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1500);
    toast.success("Copied to clipboard");
  }

  function handleCopyGroup(type: IocType) {
    const items = extracted[type];
    if (items.length === 0) return;
    navigator.clipboard.writeText(items.join("\n"));
    toast.success(`Copied all ${IOC_LABELS[type]}`);
  }

  function handleExportGroupJson(type: IocType) {
    const items = extracted[type];
    if (items.length === 0) return;
    downloadFile(
      `iocs-${type}.json`,
      JSON.stringify({ type, count: items.length, values: items }, null, 2),
      "application/json",
    );
    toast.success(`Exported ${IOC_LABELS[type]} as JSON`);
  }

  function handleExportGroupCsv(type: IocType) {
    const items = extracted[type];
    if (items.length === 0) return;
    downloadFile(
      `iocs-${type}.csv`,
      toCsv(items.map((value) => ({ type, value }))),
      "text/csv",
    );
    toast.success(`Exported ${IOC_LABELS[type]} as CSV`);
  }

  function handleExportAllJson() {
    if (totalIocs === 0) return;
    const payload = IOC_ORDER.reduce(
      (acc, type) => {
        if (extracted[type].length > 0) acc[type] = extracted[type];
        return acc;
      },
      {} as Record<string, string[]>,
    );
    downloadFile(
      "socpilot-iocs.json",
      JSON.stringify({ totalCount: totalIocs, results: payload }, null, 2),
      "application/json",
    );
    toast.success("Exported all indicators as JSON");
  }

  function handleExportAllCsv() {
    if (totalIocs === 0) return;
    const rows = IOC_ORDER.flatMap((type) =>
      extracted[type].map((value) => ({ type, value })),
    );
    downloadFile("socpilot-iocs.csv", toCsv(rows), "text/csv");
    toast.success("Exported all indicators as CSV");
  }

  function handleClear() {
    setInput("");
    setSearch("");
    toast.success("Cleared");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-mono uppercase tracking-tight mb-2 flex items-center gap-2">
            <Radar className="text-primary" /> IOC Extractor
          </h1>
          <p className="text-muted-foreground font-mono text-sm">
            Paste raw logs, emails, or threat intel reports -- or drop a file below. Every indicator is
            extracted locally in your browser. Nothing leaves your machine.
          </p>
        </div>
        <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-widest border-primary/40 text-primary shrink-0">
          100% Client-Side
        </Badge>
      </div>

      {/* Input area */}
      <Card
        className={`border-border rounded-none transition-colors ${
          isDragging ? "border-primary bg-primary/5" : ""
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <CardHeader className="py-4 border-b border-border bg-secondary/30 flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="font-mono text-sm uppercase">Raw Input Data</CardTitle>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED_EXTENSIONS.join(",")}
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) readFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs font-mono"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={14} className="mr-2" /> UPLOAD FILE
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={!input}
              className="h-8 text-xs font-mono"
            >
              <Trash2 size={14} className="mr-2" /> CLEAR
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste raw text here, or drag & drop a .txt, .log, .csv or .json file..."
            className="min-h-[220px] resize-y border-0 rounded-none focus-visible:ring-0 p-4 font-mono text-sm bg-transparent"
          />
          {isDragging && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/90 border-2 border-dashed border-primary pointer-events-none">
              <p className="font-mono text-primary uppercase tracking-widest text-sm flex items-center gap-2">
                <Upload size={16} /> Drop file to import
              </p>
            </div>
          )}
          {isProcessing && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <p className="font-mono text-muted-foreground text-sm flex items-center gap-2">
                <Spinner className="size-4" /> Reading file...
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="border-border rounded-none">
        <CardHeader className="py-4 border-b border-border bg-secondary/30 flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="font-mono text-sm uppercase flex items-center gap-2">
            Summary
            <Badge variant="secondary" className="font-mono">{totalIocs} total</Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs font-mono"
              disabled={totalIocs === 0}
              onClick={handleExportAllJson}
            >
              <FileJson size={14} className="mr-2" /> EXPORT ALL JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs font-mono"
              disabled={totalIocs === 0}
              onClick={handleExportAllCsv}
            >
              <FileSpreadsheet size={14} className="mr-2" /> EXPORT ALL CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {totalIocs === 0 ? (
            <p className="font-mono text-sm text-muted-foreground">
              {input ? "No indicators found in input text." : "Waiting for input data..."}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {countsByType.map(({ type, label, count }) => (
                <Badge
                  key={type}
                  variant="outline"
                  className="font-mono text-xs border-border gap-2 px-3 py-1"
                >
                  <span className="text-muted-foreground uppercase tracking-wide">{label}</span>
                  <span className="text-primary font-bold">{count}</span>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search / filter */}
      {totalIocs > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter results by value or type..."
            className="pl-9 rounded-none font-mono text-sm h-10"
          />
        </div>
      )}

      {/* Results grid */}
      {totalIocs === 0 ? (
        <Card className="border-border rounded-none border-dashed">
          <CardContent className="py-16 text-center text-muted-foreground font-mono text-sm">
            {input ? "No indicators matched the known patterns." : "Extracted indicators will appear here as cards, grouped by type."}
          </CardContent>
        </Card>
      ) : visibleGroups.length === 0 ? (
        <Card className="border-border rounded-none border-dashed">
          <CardContent className="py-16 text-center text-muted-foreground font-mono text-sm">
            No indicators match "{search}".
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visibleGroups.map(({ type, items, totalCount }) => {
            const Icon = IOC_ICONS[type];
            return (
              <Card key={type} className="border-border rounded-none flex flex-col">
                <CardHeader className="py-3 border-b border-border bg-secondary/30 flex flex-row items-center justify-between gap-2">
                  <CardTitle className="font-mono text-xs uppercase tracking-widest text-primary flex items-center gap-2">
                    <Icon size={14} />
                    {IOC_LABELS[type]}
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 rounded-sm border-primary/30">
                      {totalCount}
                    </Badge>
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      title="Copy all"
                      onClick={() => handleCopyGroup(type)}
                    >
                      <Copy size={12} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      title="Export JSON"
                      onClick={() => handleExportGroupJson(type)}
                    >
                      <FileJson size={12} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      title="Export CSV"
                      onClick={() => handleExportGroupCsv(type)}
                    >
                      <FileSpreadsheet size={12} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-2 flex-1 overflow-auto max-h-72 space-y-1">
                  {items.map((item, idx) => {
                    const id = `${type}-${idx}-${item}`;
                    const isCopied = copiedId === id;
                    return (
                      <div
                        key={id}
                        className="group flex items-center justify-between gap-2 bg-card border border-border/50 px-2.5 py-1.5 hover:border-primary/50 transition-colors"
                      >
                        <span className="font-mono text-xs text-foreground break-all">{item}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleCopy(item, id)}
                        >
                          {isCopied ? <CheckCheck size={12} className="text-primary" /> : <Copy size={12} />}
                        </Button>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
