import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Copy, Check } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import FloatingBackground from "@/components/FloatingBackground";
import GlassCard from "@/components/GlassCard";
import { useWallet } from "@/contexts/WalletContext";
import { useToast } from "@/hooks/use-toast";

const ReceivePage = () => {
  const navigate = useNavigate();
  const { wallet } = useWallet();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  if (!wallet) { navigate("/"); return null; }

  const address = wallet.addresses["ltc"] || "N/A";

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied!", description: "LTC address copied" });
  };

  return (
    <div className="relative min-h-screen bg-background">
      <FloatingBackground />
      <div className="relative z-10 mx-auto max-w-lg px-4 py-8">
        <Button variant="ghost" className="mb-6 text-muted-foreground" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard className="p-6" glow>
            <h1 className="mb-6 text-2xl font-bold text-gradient">Receive LTC</h1>

            <div className="space-y-6">
              <div className="flex flex-col items-center">
                <div className="mb-4 rounded-xl bg-white p-4">
                  <QRCodeSVG value={address} size={200} />
                </div>
                <p className="mb-1 text-sm text-muted-foreground">Your LTC Address</p>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 w-full">
                  <code className="flex-1 truncate text-xs text-foreground">{address}</code>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={copyAddress}>
                    {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
};

export default ReceivePage;
