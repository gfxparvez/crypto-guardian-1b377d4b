import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Send, Download, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import FloatingBackground from "@/components/FloatingBackground";
import GlassCard from "@/components/GlassCard";
import { useWallet } from "@/contexts/WalletContext";
import { getCoinById } from "@/lib/coins";

const CoinDetail = () => {
  const { coinId } = useParams<{ coinId: string }>();
  const navigate = useNavigate();
  const { wallet, prices, balances } = useWallet();

  if (!wallet) { navigate("/"); return null; }

  const coin = getCoinById(coinId || "");
  if (!coin) { navigate("/dashboard"); return null; }

  const price = prices[coin.id]?.usd || 0;
  const change = prices[coin.id]?.usd_24h_change || 0;
  const balance = parseFloat(balances[coin.id] || "0");
  const value = balance * price;

  return (
    <div className="relative min-h-screen bg-background">
      <FloatingBackground />
      <div className="relative z-10 mx-auto max-w-lg px-4 py-8">
        <Button variant="ghost" className="mb-6 text-muted-foreground" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Coin Header */}
          <GlassCard className="p-6 text-center" glow>
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full text-3xl font-bold" style={{ backgroundColor: coin.color + "20", color: coin.color }}>
              {coin.icon}
            </div>
            <h1 className="text-2xl font-bold text-foreground">{coin.name}</h1>
            <p className="text-muted-foreground">{coin.symbol}</p>
          </GlassCard>

          {/* Price Info */}
          <GlassCard className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Current Price</p>
                <p className="text-xl font-bold text-foreground">${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">24h Change</p>
                <div className={`flex items-center gap-1 text-xl font-bold ${change >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {change >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                  {Math.abs(change).toFixed(2)}%
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Balance</p>
                <p className="text-xl font-bold text-foreground">{balance.toFixed(6)} {coin.symbol}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Value</p>
                <p className="text-xl font-bold text-foreground">${value.toFixed(2)}</p>
              </div>
            </div>
          </GlassCard>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button className="bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20" onClick={() => navigate("/send")}>
              <Send className="mr-2 h-4 w-4" /> Send {coin.symbol}
            </Button>
            <Button className="bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20" onClick={() => navigate("/receive")}>
              <Download className="mr-2 h-4 w-4" /> Receive {coin.symbol}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CoinDetail;
