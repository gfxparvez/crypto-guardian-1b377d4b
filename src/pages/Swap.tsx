import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import FloatingBackground from "@/components/FloatingBackground";
import GlassCard from "@/components/GlassCard";
import { useWallet } from "@/contexts/WalletContext";
import { SUPPORTED_COINS } from "@/lib/coins";
import { useToast } from "@/hooks/use-toast";

const SwapPage = () => {
  const navigate = useNavigate();
  const { wallet, prices, balances } = useWallet();
  const { toast } = useToast();
  const [fromCoin, setFromCoin] = useState("eth");
  const [toCoin, setToCoin] = useState("btc");
  const [amount, setAmount] = useState("");

  if (!wallet) { navigate("/"); return null; }

  const fromPrice = prices[fromCoin]?.usd || 0;
  const toPrice = prices[toCoin]?.usd || 0;
  const rate = toPrice > 0 ? fromPrice / toPrice : 0;
  const convertedAmount = parseFloat(amount || "0") * rate;
  const fromBalance = parseFloat(balances[fromCoin] || "0");
  const fromCoinData = SUPPORTED_COINS.find((c) => c.id === fromCoin)!;
  const toCoinData = SUPPORTED_COINS.find((c) => c.id === toCoin)!;

  const flip = () => {
    setFromCoin(toCoin);
    setToCoin(fromCoin);
    setAmount("");
  };

  const handleSwap = () => {
    toast({ title: "Swap", description: "Swap functionality requires a DEX integration. Coming soon!" });
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
            <h1 className="mb-6 text-2xl font-bold text-gradient">Swap</h1>

            <div className="space-y-4">
              {/* From */}
              <GlassCard variant="strong" className="p-4">
                <label className="mb-2 block text-xs text-muted-foreground">From</label>
                <div className="flex items-center gap-3">
                  <Select value={fromCoin} onValueChange={setFromCoin}>
                    <SelectTrigger className="w-[140px] border-border bg-muted/30"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_COINS.filter((c) => c.id !== toCoin).map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.icon} {c.symbol}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="border-border bg-transparent text-right text-lg"
                    min="0"
                    step="any"
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Balance: {fromBalance.toFixed(6)} {fromCoinData.symbol}</p>
              </GlassCard>

              {/* Flip */}
              <div className="flex justify-center">
                <Button variant="ghost" size="icon" className="rounded-full border border-primary/20 bg-primary/5" onClick={flip}>
                  <ArrowUpDown className="h-4 w-4 text-primary" />
                </Button>
              </div>

              {/* To */}
              <GlassCard variant="strong" className="p-4">
                <label className="mb-2 block text-xs text-muted-foreground">To</label>
                <div className="flex items-center gap-3">
                  <Select value={toCoin} onValueChange={setToCoin}>
                    <SelectTrigger className="w-[140px] border-border bg-muted/30"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_COINS.filter((c) => c.id !== fromCoin).map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.icon} {c.symbol}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex-1 text-right text-lg font-semibold text-foreground">
                    {convertedAmount > 0 ? convertedAmount.toFixed(6) : "0.00"}
                  </div>
                </div>
                {rate > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">1 {fromCoinData.symbol} = {rate.toFixed(6)} {toCoinData.symbol}</p>
                )}
              </GlassCard>

              <Button className="w-full bg-accent text-accent-foreground" onClick={handleSwap} disabled={!amount || parseFloat(amount) <= 0}>
                Swap {fromCoinData.symbol} → {toCoinData.symbol}
              </Button>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
};

export default SwapPage;
