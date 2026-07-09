import { useMemo, useRef, useState, type DragEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  Copy,
  CheckCheck,
  Trash2,
  Upload,
  FileJson,
  FileSpreadsheet,
  Globe,
  Link2,
  Mail,
  Fingerprint,
  ShieldAlert,
  Network,
  Radar,
  ExternalLink,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import {
  IOC_TYPES,
  IOC_META,
  extractIocs,
  countTotal,
  toCsv,
  downloadFile,
  ACCEPTED_FILE_EXTENSIONS,
  SAMPLE_LOG_DATA,
  type IocType,
  type IocResults,
} from "@/lib/ioc-extraction";

const ICONS: Record<IocType, typeof Globe> = {
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

interface SummaryCardDef {
  key: string;
  label: string;
  count: number;
  icon: typeof Globe;
}

export default function IocExtractorPage() {
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessPulse, setShowSuccessPulse] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const extracted: IocResults = useMemo(() => extractIocs(input), [input]);
  const totalIocs = countTotal(extracted);

  const hashCount =
    extracted.md5.length + extracted.sha1.length + extracted.sha256.length + extracted.sha512.length;

  const summaryCards: SummaryCardDef[] = [
    { key: "total", label: "Total IOCs", count: totalIocs, icon: Sparkles },
    { key: "ipv4", label: "IPv4", count: extracted.ipv4.length, icon: Network },
    { key: "ipv6", label: "IPv6", count: extracted.ipv6.length, icon: Network },
    { key: "url", label: "URLs", count: extracted.url.length, icon: Link2 },
    { key: "domain", label: "Domains", count: extracted.domain.length, icon: Globe },
    { key: "email", label: "Emails", count: extracted.email.length, icon: Mail },
    { key: "hash", label: "Hashes", count: hashCount, icon: Fingerprint },
    { key: "cve", label: "CVEs", count: extracted.cve.length, icon: ShieldAlert },
  ];

  const normalizedSearch = search.trim().toLowerCase();

  const visibleGroups = IOC_TYPES.map((type) => {
    const items = extracted[type];
    const filtered = normalizedSearch
      ? items.filter(
          (value) =>
            value.toLowerCase().includes(normalizedSearch) ||
            IOC_META[type].label.toLowerCase().includes(normalizedSearch),
        )
      : items;
    return { type, items: filtered, totalCount: items.length };
  }).filter((g) => g.items.length > 0);

  function triggerSuccessPulse() {
    setShowSuccessPulse(true);
    if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    successTimeoutRef.current = setTimeout(() => setShowSuccessPulse(false), 1400);
  }

  function runExtraction(next: string) {
    setIsProcessing(true);
    // Yield a frame so the loading state actually paints before the
    // (synchronous, near-instant) regex pass runs on large paste/file input.
    requestAnimationFrame(() => {
      setInput(next);
      setIsProcessing(false);
      const found = countTotal(extractIocs(next));
      if (found > 0) {
        triggerSuccessPulse();
        toast.success(`Extracted ${found} indicator${found === 1 ? "" : "s"}`);
      }
    });
  }

  function readFiles(files: FileList | File[]) {
    const list = Array.from(files);
    const valid = list.filter((f) =>
      ACCEPTED_FILE_EXTENSIONS.some((ext) => f.name.toLowerCase().endsWith(ext)),
    );

    if (valid.length === 0) {
      toast.error("Only .txt, .log, .csv and .json files are supported");
      return;
    }

    setIsProcessing(true);
    const contents: string[] = [];
    let remaining = valid.length;

    valid.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        contents.push(String(reader.result ?? ""));
        remaining -= 1;
        if (remaining === 0) {
          const combined = [input, ...contents].filter(Boolean).join("\n\n");
          setInput(combined);
          setIsProcessing(false);
          toast.success(`Loaded ${valid.length} file${valid.length === 1 ? "" : "s"}`);
          const found = countTotal(extractIocs(combined));
          if (found > 0) triggerSuccessPulse();
        }
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
    if (e.dataTransfer.files?.length) readFiles(e.dataTransfer.files);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleLoadSample() {
    runExtraction(SAMPLE_LOG_DATA);
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
    toast.success(`Copied all ${IOC_META[type].label}`);
  }

  function handleExportGroupJson(type: IocType) {
    const items = extracted[type];
    if (items.length === 0) return;
    downloadFile(
      `iocs-${type}.json`,
      JSON.stringify({ type, count: items.length, values: items }, null, 2),
      "application/json",
    );
    toast.success(`Exported ${IOC_META[type].label} as JSON`);
  }

  function handleExportGroupCsv(type: IocType) {
    const items = extracted[type];
    if (items.length === 0) return;
    downloadFile(`iocs-${type}.csv`, toCsv(items.map((value) => ({ type, value }))), "text/csv");
    toast.success(`Exported ${IOC_META[type].label} as CSV`);
  }

  function handleExportAllJson() {
    if (totalIocs === 0) return;
    const payload = IOC_TYPES.reduce(
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
    const rows = IOC_TYPES.flatMap((type) => extracted[type].map((value) => ({ type, value })));
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
            extracted and validated locally in your browser. Nothing leaves your machine.
          </p>
        </div>
        <Badge
          variant="outline"
          className="font-mono text-[10px] uppercase tracking-widest border-primary/40 text-primary shrink-0"
        >
          100% Client-Side
        </Badge>
      </div>

      {/* Drag & drop input area */}
      <Card
        className={`relative border-2 border-dashed rounded-none transition-colors ${
          isDragging ? "border-primary bg-primary/5" : "border-border"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <CardHeader className="py-4 border-b border-border bg-secondary/30 flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="font-mono text-sm uppercase flex items-center gap-2">
            <Upload size={14} className="text-primary" /> Raw Input Data
          </CardTitle>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED_FILE_EXTENSIONS.join(",")}
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
              onClick={handleLoadSample}
            >
              <Sparkles size={14} className="mr-2" /> LOAD SAMPLE
            </Button>
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
            onChange={(e) => runExtraction(e.target.value)}
            placeholder={
              "Paste raw text here, or drag & drop a .txt, .log, .csv or .json file...\n\nTip: click LOAD SAMPLE to see it in action."
            }
            className="min-h-[240px] max-h-[520px] resize-y border-0 rounded-none focus-visible:ring-0 p-4 font-mono text-sm bg-transparent field-sizing-content"
          />

          <AnimatePresence>
            {isDragging && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center bg-background/90 border-2 border-dashed border-primary pointer-events-none"
              >
                <p className="font-mono text-primary uppercase tracking-widest text-sm flex items-center gap-2">
                  <Upload size={16} /> Drop file to import
                </p>
              </motion.div>
            )}
            {isProcessing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center bg-background/80"
              >
                <p className="font-mono text-muted-foreground text-sm flex items-center gap-2">
                  <Spinner className="size-4" /> Analyzing input...
                </p>
              </motion.div>
            )}
            {showSuccessPulse && !isProcessing && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute top-3 right-3 flex items-center gap-1.5 bg-primary/10 border border-primary/40 px-3 py-1.5 text-primary font-mono text-xs uppercase tracking-wide pointer-events-none"
              >
                <ShieldCheck size={14} /> Extraction complete
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Summary dashboard */}
      <div>
        <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-3">
          Summary
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.key}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Card
                  className={`rounded-none border-border h-full ${
                    card.key === "total" ? "border-primary/50 bg-primary/5" : ""
                  }`}
                >
                  <CardContent className="p-3 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <Icon size={14} className={card.key === "total" ? "text-primary" : "text-muted-foreground"} />
                    </div>
                    <span
                      className={`font-mono text-2xl font-bold tabular-nums ${
                        card.key === "total" ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {card.count}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      {card.label}
                    </span>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

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

      {/* Results */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Extracted Indicators
          </h2>
          {totalIocs > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-mono"
                onClick={handleExportAllJson}
              >
                <FileJson size={14} className="mr-2" /> EXPORT ALL JSON
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-mono"
                onClick={handleExportAllCsv}
              >
                <FileSpreadsheet size={14} className="mr-2" /> EXPORT ALL CSV
              </Button>
            </div>
          )}
        </div>

        {totalIocs === 0 ? (
          <Card className="border-border rounded-none border-dashed">
            <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
              <Radar className="text-muted-foreground" size={32} />
              <p className="font-mono text-sm text-foreground">
                {input ? "No indicators matched the known patterns." : "No indicators yet"}
              </p>
              <p className="font-mono text-xs text-muted-foreground max-w-md">
                {input
                  ? "Try pasting logs that include IPs, domains, URLs, emails, hashes, or CVE IDs."
                  : "Paste text above, drop a log file, or click LOAD SAMPLE to see IPv4/IPv6 addresses, URLs, domains, emails, hashes, and CVE IDs extracted and categorized automatically."}
              </p>
            </CardContent>
          </Card>
        ) : visibleGroups.length === 0 ? (
          <Card className="border-border rounded-none border-dashed">
            <CardContent className="py-16 text-center text-muted-foreground font-mono text-sm">
              No indicators match "{search}".
            </CardContent>
          </Card>
        ) : (
          <Accordion type="multiple" defaultValue={visibleGroups.map((g) => g.type)} className="space-y-3">
            {visibleGroups.map(({ type, items, totalCount }) => {
              const Icon = ICONS[type];
              const meta = IOC_META[type];
              return (
                <AccordionItem
                  key={type}
                  value={type}
                  className="border border-border bg-card [&>h3]:border-0"
                >
                  <div className="flex items-center justify-between pr-3">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline flex-1">
                      <span className="font-mono text-xs uppercase tracking-widest text-primary flex items-center gap-2">
                        <Icon size={14} />
                        {meta.label}
                        <Badge
                          variant="outline"
                          className="text-[10px] h-4 px-1.5 rounded-sm border-primary/30"
                        >
                          {totalCount}
                        </Badge>
                      </span>
                    </AccordionTrigger>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Copy all"
                        aria-label={`Copy all ${meta.label}`}
                        onClick={() => handleCopyGroup(type)}
                      >
                        <Copy size={13} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Export JSON"
                        aria-label={`Export ${meta.label} as JSON`}
                        onClick={() => handleExportGroupJson(type)}
                      >
                        <FileJson size={13} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Export CSV"
                        aria-label={`Export ${meta.label} as CSV`}
                        onClick={() => handleExportGroupCsv(type)}
                      >
                        <FileSpreadsheet size={13} />
                      </Button>
                    </div>
                  </div>
                  <AccordionContent className="px-4">
                    <div className="space-y-1 max-h-72 overflow-auto">
                      {items.map((item, idx) => {
                        const id = `${type}-${idx}-${item}`;
                        const isCopied = copiedId === id;
                        const link = meta.linkable ? meta.buildLink?.(item) : undefined;
                        return (
                          <div
                            key={id}
                            className="group flex items-center justify-between gap-2 bg-background border border-border/50 px-2.5 py-1.5 hover:border-primary/50 transition-colors"
                          >
                            <span className="font-mono text-xs text-foreground break-all">{item}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              {link && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                                  title="Open externally"
                                  aria-label={`Open ${item} externally`}
                                  asChild
                                >
                                  <a href={link} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink size={12} />
                                  </a>
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                                title="Copy"
                                aria-label={`Copy ${item}`}
                                onClick={() => handleCopy(item, id)}
                              >
                                {isCopied ? (
                                  <CheckCheck size={12} className="text-primary" />
                                ) : (
                                  <Copy size={12} />
                                )}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>
    </div>
  );
}
