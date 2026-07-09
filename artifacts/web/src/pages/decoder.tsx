import { useState } from "react";
import { ShieldAlert, ArrowLeftRight, Trash2, Copy, FileJson } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function DecoderPage() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");

  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    toast.success("Output copied to clipboard");
  };

  const handleClear = () => {
    setInput("");
    setOutput("");
  };

  const executeTransform = (operation: string) => {
    if (!input.trim()) return;
    
    try {
      let result = "";
      switch (operation) {
        case 'b64-encode':
          result = btoa(input);
          break;
        case 'b64-decode':
          result = atob(input);
          break;
        case 'url-encode':
          result = encodeURIComponent(input);
          break;
        case 'url-decode':
          result = decodeURIComponent(input);
          break;
        case 'hex-encode':
          result = Array.from(input).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
          break;
        case 'hex-decode':
          // Remove spaces/0x if present
          const cleanHex = input.replace(/[\s0x]/g, '');
          if (cleanHex.length % 2 !== 0) throw new Error("Invalid hex length");
          result = cleanHex.match(/.{1,2}/g)?.map(byte => String.fromCharCode(parseInt(byte, 16))).join('') || "";
          break;
        case 'jwt-decode':
          const parts = input.split('.');
          if (parts.length !== 3) throw new Error("Invalid JWT format (must have 3 parts separated by dots)");
          
          const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
          const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
          
          result = `// HEADER\n${JSON.stringify(header, null, 2)}\n\n// PAYLOAD\n${JSON.stringify(payload, null, 2)}\n\n// SIGNATURE (VERIFICATION NOT SUPPORTED CLIENT-SIDE)\n${parts[2]}`;
          break;
        default:
          return;
      }
      setOutput(result);
    } catch (error: any) {
      toast.error(`Transformation failed: ${error.message}`);
      setOutput(`Error: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div>
        <h1 className="text-3xl font-bold font-mono uppercase tracking-tight mb-2 flex items-center gap-2">
          <ShieldAlert className="text-primary" /> Multi-Decoder
        </h1>
        <p className="text-muted-foreground font-mono text-sm">
          Client-side encode and decode utility. No data is sent to the server.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        
        {/* Input */}
        <Card className="lg:col-span-5 flex flex-col border-border rounded-none h-[calc(100vh-200px)]">
          <CardHeader className="py-4 border-b border-border bg-secondary/30 shrink-0 flex flex-row items-center justify-between">
            <CardTitle className="font-mono text-sm uppercase">Input String</CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleClear} 
              disabled={!input && !output}
              className="h-8 text-xs font-mono text-muted-foreground hover:text-foreground"
            >
              <Trash2 size={14} className="mr-2" /> CLEAR
            </Button>
          </CardHeader>
          <CardContent className="p-0 flex-1 relative">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste string to transform..."
              className="h-full resize-none border-0 rounded-none focus-visible:ring-0 p-4 font-mono text-sm bg-transparent"
            />
          </CardContent>
        </Card>

        {/* Controls */}
        <div className="lg:col-span-2 flex flex-col justify-center gap-2">
          <div className="bg-card border border-border p-4 space-y-6">
            <div className="space-y-2">
              <h4 className="font-mono text-[10px] font-bold text-muted-foreground tracking-widest uppercase">Base64</h4>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="font-mono text-xs rounded-none border-border" onClick={() => executeTransform('b64-encode')}>Enc</Button>
                <Button variant="secondary" size="sm" className="font-mono text-xs rounded-none" onClick={() => executeTransform('b64-decode')}>Dec</Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-mono text-[10px] font-bold text-muted-foreground tracking-widest uppercase">URL</h4>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="font-mono text-xs rounded-none border-border" onClick={() => executeTransform('url-encode')}>Enc</Button>
                <Button variant="secondary" size="sm" className="font-mono text-xs rounded-none" onClick={() => executeTransform('url-decode')}>Dec</Button>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-mono text-[10px] font-bold text-muted-foreground tracking-widest uppercase">Hex</h4>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="font-mono text-xs rounded-none border-border" onClick={() => executeTransform('hex-encode')}>Enc</Button>
                <Button variant="secondary" size="sm" className="font-mono text-xs rounded-none" onClick={() => executeTransform('hex-decode')}>Dec</Button>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
               <Button 
                variant="default" 
                className="w-full font-mono text-xs rounded-none font-bold uppercase" 
                onClick={() => executeTransform('jwt-decode')}
              >
                <FileJson size={14} className="mr-2" /> Decode JWT
              </Button>
            </div>
          </div>
        </div>

        {/* Output */}
        <Card className="lg:col-span-5 flex flex-col border-border rounded-none h-[calc(100vh-200px)] bg-[#0a0a0c]">
          <CardHeader className="py-4 border-b border-border bg-secondary/30 shrink-0 flex flex-row items-center justify-between">
            <CardTitle className="font-mono text-sm uppercase text-primary">Output</CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleCopy} 
              disabled={!output}
              className="h-8 text-xs font-mono text-primary hover:text-primary hover:bg-primary/10"
            >
              <Copy size={14} className="mr-2" /> COPY
            </Button>
          </CardHeader>
          <CardContent className="p-0 flex-1 relative">
            <Textarea
              value={output}
              readOnly
              placeholder="Transformation result will appear here..."
              className={`h-full resize-none border-0 rounded-none focus-visible:ring-0 p-4 font-mono text-sm bg-transparent ${output.startsWith('Error:') ? 'text-destructive' : 'text-foreground'}`}
            />
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
