import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Send as SendIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import FloatingBackground from "@/components/FloatingBackground";
import GlassCard from "@/components/GlassCard";
import { useWallet } from "@/contexts/WalletContext";
import { getLtcFeeEstimate, sendLtcTransaction } from "@/lib/wallet";
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
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [sending, setSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fee, setFee] = useState(0);
  const [estimating, setEstimating] = useState(false);

  useEffect(() => {
    if (!wallet) { navigate("/"); return; }
  }, [wallet, navigate]);

  useEffect(() => {
    const loadFee = async () => {
      setEstimating(true);
      const est = await getLtcFeeEstimate();
      setFee(est);
      setEstimating(false);
    };
    loadFee();
  }, []);

  if (!wallet) return null;

  const balance = parseFloat(balances["ltc"] || "0");
  const price = prices["ltc"]?.usd || 0;
  const amountNum = parseFloat(amount || "0");
  const usdValue = amountNum * price;
  const feeUsd = fee * price;
  const totalDeducted = amountNum + fee;


  const handleMax = async () => {
    setEstimating(true);
    const est = await getLtcFeeEstimate();
    setFee(est);
    const maxAmount = Math.max(0, balance - est);
    setAmount(maxAmount > 0 ? maxAmount.toFixed(8) : "0");
    setEstimating(false);
  };

  const handleSend = async () => {
    setShowConfirm(false);
    if (!recipient.trim() || !amount.trim() || amountNum <= 0) {
      toast({ title: "Error", description: "Please fill in all fields correctly", variant: "destructive" });
      return;
    }
    if (totalDeducted > balance) {
      toast({ title: "Insufficient balance", description: "Amount + fee exceeds your balance", variant: "destructive" });
      return;
    }

    setSending(true);

    const orderId = Date.now().toString() + Math.random().toString(36).slice(2, 10);
    const submittedAt = Date.now();

    // Real blockchain send
    const fromAddress = wallet.addresses["ltc"];
    const result = await sendLtcTransaction(wallet.mnemonic, fromAddress, recipient.trim(), amountNum);

    if (!result.success) {
      setSending(false);
      toast({ title: "Send Failed", description: result.error || "Transaction failed", variant: "destructive" });
      return;
    }

    // Navigate to progress page with real tx hash
    navigate("/tx-progress", {
      state: {
        amount: amountNum.toFixed(8),
        fee: fee.toFixed(8),
        feeUsd: feeUsd.toFixed(2),
        toAddress: recipient.trim(),
        txHash: result.txHash || "",
        orderId,
        submittedAt,
      },
    });
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
            <h1 className="mb-6 text-2xl font-bold text-gradient">Send LTC</h1>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-muted-foreground">Recipient Address</label>
                <Input
                  placeholder="ltc1q..."
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="border-border bg-muted/30 font-mono text-sm"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm text-muted-foreground">Amount (LTC)</label>
                  <button onClick={handleMax} className="text-xs font-medium text-primary hover:underline">
                    Max: {balance.toFixed(8)}
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
                    LTC
                  </div>
                </div>
                {usdValue > 0 && (
                  <p className="mt-1 text-sm text-muted-foreground">≈ ${usdValue.toFixed(2)} USD</p>
                )}
              </div>

              {amountNum > 0 && (
                <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Send Amount:</span>
                    <span>{amountNum.toFixed(8)} LTC</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Network Fee:</span>
                    <span className={estimating ? "animate-pulse" : ""}>
                      {fee.toFixed(8)} LTC <span className="text-muted-foreground">(${feeUsd.toFixed(2)})</span>
                    </span>
                  </div>
                  <div className="border-t border-border pt-2">
                    <div className="flex justify-between text-sm font-medium text-foreground">
                      <span>Total Deducted:</span>
                      <span className={estimating ? "animate-pulse" : ""}>{totalDeducted.toFixed(8)} LTC</span>
                    </div>
                  </div>
                  {totalDeducted > balance && (
                    <p className="text-xs text-red-400">Exceeds your balance!</p>
                  )}
                </div>
              )}

              <Button
                className="w-full bg-primary text-primary-foreground"
                onClick={() => setShowConfirm(true)}
                disabled={sending || !recipient || !amount || amountNum <= 0 || totalDeducted > balance}
              >
                <SendIcon className="mr-2 h-4 w-4" />
                {totalDeducted > balance ? "Insufficient Balance" : (sending ? "Sending..." : "Send LTC")}
              </Button>
            </div>
          </GlassCard>
        </motion.div>

        <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
          <AlertDialogContent className="glass-strong border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground">Confirm Transaction</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2 text-muted-foreground">
                <p>Send <strong className="text-foreground">{amount} LTC</strong> (≈${usdValue.toFixed(2)})</p>
                <p>Fee: <strong className="text-foreground">{fee.toFixed(8)} LTC</strong></p>
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
