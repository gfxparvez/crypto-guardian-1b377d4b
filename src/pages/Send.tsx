import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Send as SendIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import FloatingBackground from "@/components/FloatingBackground";
import GlassCard from "@/components/GlassCard";
import { useWallet } from "@/contexts/WalletContext";
import { SUPPORTED_COINS } from "@/lib/coins";
import { sendEvmTransaction } from "@/lib/wallet";
import { saveTransaction } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const SendPage = () => {
  const navigate = useNavigate();
  const { wallet, prices } = useWallet();
  const { toast } = useToast();
  const [coinId, setCoinId] = useState("eth");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [sending, setSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!wallet) { navigate("/"); return null; }

  const coin = SUPPORTED_COINS.find((c) => c.id === coinId)!;
  const price = prices[coinId]?.usd || 0;
  const usdValue = parseFloat(amount || "0") * price;

  const handleSend = async () => {
    setShowConfirm(false);
    if (!recipient.trim() || !amount.trim() || parseFloat(amount) <= 0) {
      toast({ title: "Error", description: "Please fill in all fields correctly", variant: "destructive" });
      return;
    }
    if (coin.network !== "evm" || !coin.rpcUrl) {
      toast({ title: "Not supported", description: `Sending ${coin.symbol} is not supported yet. Only EVM chains (ETH, POL) are supported.`, variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      const hash = await sendEvmTransaction(wallet.mnemonic, coin, recipient.trim(), amount);
      await saveTransaction(wallet.addresses["eth"], {
        coin: coin.symbol,
        to: recipient.trim(),
        amount,
        hash,
        timestamp: Date.now(),
      });
      toast({ title: "Transaction Sent!", description: `TX Hash: ${hash.slice(0, 16)}...` });
      navigate("/dashboard");
    } catch (err: any) {
      toast({ title: "Transaction Failed", description: err?.message || "Unknown error", variant: "destructive" });
    } finally {
      setSending(false);
    }
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
            <h1 className="mb-6 text-2xl font-bold text-gradient">Send Crypto</h1>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-muted-foreground">Select Coin</label>
                <Select value={coinId} onValueChange={setCoinId}>
                  <SelectTrigger className="border-border bg-muted/30"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_COINS.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.icon} {c.name} ({c.symbol})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-muted-foreground">Recipient Address</label>
                <Input
                  placeholder="0x..."
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="border-border bg-muted/30 font-mono text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-muted-foreground">Amount ({coin.symbol})</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="border-border bg-muted/30"
                  min="0"
                  step="any"
                />
                {usdValue > 0 && (
                  <p className="mt-1 text-sm text-muted-foreground">≈ ${usdValue.toFixed(2)} USD</p>
                )}
              </div>

              <Button
                className="w-full bg-primary text-primary-foreground"
                onClick={() => setShowConfirm(true)}
                disabled={sending || !recipient || !amount}
              >
                <SendIcon className="mr-2 h-4 w-4" />
                {sending ? "Sending..." : "Send"}
              </Button>
            </div>
          </GlassCard>
        </motion.div>

        <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
          <AlertDialogContent className="glass-strong border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground">Confirm Transaction</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2 text-muted-foreground">
                <p>Send <strong className="text-foreground">{amount} {coin.symbol}</strong> (≈${usdValue.toFixed(2)})</p>
                <p>To: <code className="text-xs">{recipient}</code></p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleSend} className="bg-primary text-primary-foreground">Confirm & Send</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default SendPage;
