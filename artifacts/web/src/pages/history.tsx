import { useState } from "react";
import { History as HistoryIcon, Search, Trash2, TerminalSquare, FileText, X, ArrowLeft, Loader2 } from "lucide-react";
import {
  useListHistory,
  useGetHistoryEntry,
  useDeleteHistoryEntry,
  getGetHistoryEntryQueryKey,
} from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { queryClient } from "@/lib/queryClient";

export default function HistoryPage() {
  const [location, setLocation] = useLocation();
  // wouter doesn't have useSearchParams easily accessible, grab from window manually for a simple read
  const urlParams = new URLSearchParams(window.location.search);
  const selectedId = urlParams.get("id");

  const [searchTerm, setSearchTerm] = useState("");

  const listQuery = useListHistory();
  const getEntryQuery = useGetHistoryEntry(selectedId || "", {
    query: {
      enabled: !!selectedId,
      queryKey: getGetHistoryEntryQueryKey(selectedId || ""),
    },
  });
  const deleteMutation = useDeleteHistoryEntry();

  const handleSelect = (id: string) => {
    setLocation(`/history?id=${id}`);
  };

  const handleClose = () => {
    setLocation(`/history`);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this analysis record?")) return;
    
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success("Record deleted");
          queryClient.invalidateQueries({ queryKey: ["/api/history"] });
          if (selectedId === id) handleClose();
        },
        onError: () => toast.error("Failed to delete record")
      }
    );
  };

  const filteredHistory = listQuery.data?.filter(entry => 
    entry.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    entry.id.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div>
        <h1 className="text-3xl font-bold font-mono uppercase tracking-tight mb-2 flex items-center gap-2">
          <HistoryIcon className="text-primary" /> Analysis History
        </h1>
        <p className="text-muted-foreground font-mono text-sm">
          Archive of previous log assessments and generated incident reports.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        
        {/* List View */}
        <Card className={`flex flex-col border-border rounded-none h-[calc(100vh-200px)] ${selectedId ? 'hidden lg:flex lg:col-span-4' : 'lg:col-span-12'}`}>
          <CardHeader className="py-4 border-b border-border bg-secondary/30 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input 
                placeholder="Search history..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 font-mono rounded-none border-border h-10 bg-background"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto divide-y divide-border">
            {listQuery.isLoading ? (
              <div className="p-8 text-center flex flex-col items-center justify-center h-full">
                <Loader2 className="animate-spin text-primary mb-4" />
                <p className="text-muted-foreground font-mono text-sm">Loading archive...</p>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground font-mono text-sm">
                No records found.
              </div>
            ) : (
              filteredHistory.map((entry) => (
                <div 
                  key={entry.id} 
                  onClick={() => handleSelect(entry.id)}
                  className={`p-4 cursor-pointer transition-colors group relative ${selectedId === entry.id ? 'bg-primary/10 border-l-2 border-primary' : 'hover:bg-muted/50 border-l-2 border-transparent'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {entry.type === 'log_analysis' ? (
                        <TerminalSquare size={16} className={selectedId === entry.id ? 'text-primary' : 'text-muted-foreground group-hover:text-primary transition-colors'} />
                      ) : (
                        <FileText size={16} className={selectedId === entry.id ? 'text-primary' : 'text-muted-foreground group-hover:text-primary transition-colors'} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pr-8">
                      <h4 className="font-bold text-sm font-mono truncate text-foreground">
                        {entry.title || "Untitled"}
                      </h4>
                      <p className="text-xs text-muted-foreground font-mono mt-1">
                        {new Date(entry.createdAt).toLocaleDateString()} &middot; {new Date(entry.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleDelete(entry.id, e)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/20 transition-all"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Detail View */}
        {selectedId && (
          <Card className="lg:col-span-8 flex flex-col border-border rounded-none h-[calc(100vh-200px)] bg-[#0a0a0c]">
            <CardHeader className="py-4 border-b border-border bg-secondary/30 shrink-0 flex flex-row items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" onClick={handleClose}>
                  <ArrowLeft size={16} />
                </Button>
                <CardTitle className="font-mono text-sm uppercase text-primary">Record Details</CardTitle>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={handleClose}>
                <X size={16} />
              </Button>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-auto">
              {getEntryQuery.isLoading ? (
                <div className="p-8 text-center flex flex-col items-center justify-center h-full">
                  <Loader2 className="animate-spin text-primary mb-4" />
                  <p className="text-muted-foreground font-mono text-sm">Retrieving record...</p>
                </div>
              ) : getEntryQuery.isError ? (
                <div className="p-8 text-center text-destructive font-mono text-sm">
                  Failed to load record details.
                </div>
              ) : getEntryQuery.data ? (
                <div className="p-6 font-mono text-sm space-y-6 max-w-3xl mx-auto">
                  
                  <div className="flex items-center justify-between border-b border-border pb-4">
                    <div>
                      <Badge variant="outline" className="rounded-none border-primary/50 text-primary mb-2">
                        {getEntryQuery.data.type === 'log_analysis' ? 'LOG ANALYSIS' : 'INCIDENT REPORT'}
                      </Badge>
                      <h2 className="text-xl font-bold text-foreground tracking-tight">{getEntryQuery.data.title}</h2>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>ID: {getEntryQuery.data.id}</p>
                      <p>{new Date(getEntryQuery.data.createdAt).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-bold text-muted-foreground uppercase tracking-widest text-xs">Original Input</h3>
                    <div className="bg-background border border-border p-4 text-xs overflow-x-auto whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {getEntryQuery.data.input}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-bold text-muted-foreground uppercase tracking-widest text-xs">Structured Result</h3>
                    <div className="bg-card border border-border p-4 text-xs overflow-x-auto">
                      <pre className="text-primary">{JSON.stringify(getEntryQuery.data.result, null, 2)}</pre>
                    </div>
                  </div>

                </div>
              ) : null}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
