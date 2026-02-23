import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import FloatingBackground from "@/components/FloatingBackground";
import GlassCard from "@/components/GlassCard";
import { useWallet } from "@/contexts/WalletContext";
import { useToast } from "@/hooks/use-toast";

const ImportWallet = () => {
  const navigate = useNavigate();
  const { importWallet } = useWallet();
  const { toast } = useToast();
  const [mnemonic, setMnemonic] = useState("");
  const [loading, setLoading] = useState(false);

  const handleImport = () => {
    const trimmed = mnemonic.trim();
    if (!trimmed) {
      toast({ title: "Error", description: "Please enter a seed phrase", variant: "destructive" });
      return;
    }
    const words = trimmed.split(/\s+/);
    if (words.length !== 12 && words.length !== 24) {
      toast({ title: "Error", description: "Seed phrase must be 12 or 24 words", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const success = importWallet(trimmed);
      if (success) {
        toast({ title: "Success!", description: "Wallet imported successfully" });
        navigate("/dashboard");
      } else {
        toast({ title: "Invalid", description: "Invalid seed phrase. Please check and try again.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to import wallet", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-background">
      <FloatingBackground />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
          <Button variant="ghost" className="mb-6 text-muted-foreground" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>

          <GlassCard className="p-8" glow>
            <h1 className="mb-2 text-2xl font-bold text-gradient">Import Wallet</h1>
            <p className="mb-6 text-muted-foreground">Enter your 12 or 24 word seed phrase to restore your wallet.</p>

            <div className="space-y-6">
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
                  <p className="text-sm text-muted-foreground">
                    Only import seed phrases on a trusted device. Never share your phrase with anyone.
                  </p>
                </div>
              </div>

              <Textarea
                placeholder="Enter your seed phrase (12 or 24 words separated by spaces)"
                value={mnemonic}
                onChange={(e) => setMnemonic(e.target.value)}
                className="min-h-[120px] border-border bg-muted/30 font-mono text-foreground placeholder:text-muted-foreground"
              />

              <Button
                className="w-full bg-primary text-primary-foreground"
                onClick={handleImport}
                disabled={loading}
              >
                {loading ? "Importing..." : "Import Wallet"}
              </Button>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
};

export default ImportWallet;
