import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Send as SendIcon, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import FloatingBackground from "@/components/FloatingBackground";
import GlassCard from "@/components/GlassCard";
import { useWallet } from "@/contexts/WalletContext";
import { SUPPORTED_COINS } from "@/lib/coins";
import { sendEvmTransaction, getEvmFeeEstimate } from "@/lib/wallet";
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
  const { wallet, prices, balances } = useWallet();
  const { toast } = useToast();
  const [coinId, setCoinId] = useState("eth");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [sending, setSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [feeInfo, setFeeInfo] = useState({ fee: "0", total: "0" });
  const [estimating, setEstimating] = useState(false);

  if (!wallet) { navigate("/"); return null; }

  const coin = SUPPORTED_COINS.find((c) => c.id === coinId)!;
  const balance = parseFloat(balances[coinId] || "0");
  const price = prices[coinId]?.usd || 0;
  const usdValue = parseFloat(amount || "0") * price;

  useEffect(() => {
    const estimate = async () => {
      if (amount && parseFloat(amount) > 0 && recipient.length > 30) {
        setEstimating(true);
        const res = await getEvmFeeEstimate(coin, recipient, amount);
        setFeeInfo(res);
        setEstimating(false);
      }
    };
    estimate();
  }, [amount, recipient, coinId]);

  const handleMax = () => {
    setAmount(balance.toString());
  };

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
        type: "send",
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
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm text-muted-foreground">Amount ({coin.symbol})</label>
                  <button 
                    onClick={handleMax}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Max: {balance.toFixed(6)}
                  </button>
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="border-border bg-muted/30 pr-12"
                    min="0"
                    step="any"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                    {coin.symbol}
                  </div>
                </div>
                {usdValue > 0 && (
                  <p className="mt-1 text-sm text-muted-foreground">≈ ${usdValue.toFixed(2)} USD</p>
                )}
              </div>

              {parseFloat(amount) > 0 && (
                <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Estimated Fee:</span>
                    <span className={estimating ? "animate-pulse" : ""}>{feeInfo.fee} {coin.symbol}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium text-foreground">
                    <span>Total Cost:</span>
                    <span className={estimating ? "animate-pulse" : ""}>{feeInfo.total} {coin.symbol}</span>
                  </div>
                </div>
              )}

              <Button
                className="w-full bg-primary text-primary-foreground"
                onClick={() => setShowConfirm(true)}
                disabled={sending || !recipient || !amount || parseFloat(amount) > balance}
              >
                <SendIcon className="mr-2 h-4 w-4" />
                {parseFloat(amount) > balance ? "Insufficient Balance" : (sending ? "Sending..." : "Send")}
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
