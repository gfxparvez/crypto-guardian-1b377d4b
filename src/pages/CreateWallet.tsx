import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Copy, Check, ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import FloatingBackground from "@/components/FloatingBackground";
import GlassCard from "@/components/GlassCard";
import { useWallet } from "@/contexts/WalletContext";
import { useToast } from "@/hooks/use-toast";

const CreateWallet = () => {
  const navigate = useNavigate();
  const { createNewWallet } = useWallet();
  const { toast } = useToast();
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleCreate = () => {
    const phrase = createNewWallet();
    setMnemonic(phrase);
  };

  const copyToClipboard = () => {
    if (mnemonic) {
      navigator.clipboard.writeText(mnemonic);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Copied!", description: "Seed phrase copied to clipboard" });
    }
  };

  const handleContinue = () => {
    if (!confirmed) {
      toast({ title: "Please confirm", description: "You must confirm you've saved your seed phrase", variant: "destructive" });
      return;
    }
    navigate("/dashboard");
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
            <h1 className="mb-2 text-2xl font-bold text-gradient">Create New Wallet</h1>

            {!mnemonic ? (
              <div className="space-y-6">
                <p className="text-muted-foreground">
                  Generate a new 12-word seed phrase. This phrase is the only way to recover your wallet.
                </p>
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
                    <div>
                      <p className="font-semibold text-destructive">Important Security Notice</p>
                      <p className="text-sm text-muted-foreground">
                        Never share your seed phrase. Anyone with access to it can control your funds.
                        Store it in a secure, offline location.
                      </p>
                    </div>
                  </div>
                </div>
                <Button className="w-full bg-primary text-primary-foreground" onClick={handleCreate}>
                  Generate Seed Phrase
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <p className="text-sm text-muted-foreground">Write down these 12 words in order and store them safely:</p>
                <div className="grid grid-cols-3 gap-2">
                  {mnemonic.split(" ").map((word, i) => (
                    <div key={i} className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-center text-sm">
                      <span className="text-muted-foreground">{i + 1}.</span>{" "}
                      <span className="font-mono font-semibold text-foreground">{word}</span>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full border-primary/30" onClick={copyToClipboard}>
                  {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                  {copied ? "Copied!" : "Copy Seed Phrase"}
                </Button>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  <span className="text-sm text-muted-foreground">
                    I have saved my seed phrase in a secure location
                  </span>
                </label>

                <Button className="w-full bg-primary text-primary-foreground" onClick={handleContinue}>
                  Continue to Dashboard
                </Button>
              </div>
            )}
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
};

export default CreateWallet;
