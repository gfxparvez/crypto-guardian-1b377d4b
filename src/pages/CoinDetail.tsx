import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowLeft, Send, Download, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import FloatingBackground from "@/components/FloatingBackground";
import GlassCard from "@/components/GlassCard";
import { useWallet } from "@/contexts/WalletContext";
import { getCoinById } from "@/lib/coins";
import { getTransactions, type TransactionRecord } from "@/lib/firebase";

const CoinDetail = () => {
  const { coinId } = useParams<{ coinId: string }>();
  const navigate = useNavigate();
  const { wallet, prices, balances } = useWallet();
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (wallet?.addresses?.eth && coinId) {
      const coin = getCoinById(coinId);
      if (coin) {
        getTransactions(wallet.addresses.eth).then((txs) => {
          setTransactions(txs.filter(t => t.coin === coin.symbol));
        });
      }
    }
  }, [wallet, coinId]);

  if (!wallet) { navigate("/"); return null; }

  const coin = getCoinById(coinId || "");
  if (!coin) { navigate("/dashboard"); return null; }

  const price = prices[coin.id]?.usd || 0;
  const change = prices[coin.id]?.usd_24h_change || 0;
  const balance = parseFloat(balances[coin.id] || "0");
  const value = balance * price;
  const address = wallet.addresses[coin.id] || "";

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
            {address && (
              <button
                onClick={copyAddress}
                className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/80"
              >
                {address.slice(0, 8)}...{address.slice(-6)}
                {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
              </button>
            )}
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

          {/* Transaction History for this coin */}
          <div className="mt-8">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Recent {coin.symbol} Transactions</h2>
            {transactions.length === 0 ? (
              <GlassCard className="p-6 text-center">
                <p className="text-muted-foreground">No transactions for {coin.symbol} yet</p>
              </GlassCard>
            ) : (
              <div className="space-y-2">
                {transactions.map((tx, i) => (
                  <motion.div
                    key={`${tx.hash}-${i}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <GlassCard className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${tx.type === "send" ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}`}>
                          {tx.type === "send" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{tx.type === "send" ? "Sent" : "Received"}</p>
                          <p className="text-xs text-muted-foreground">
                            {tx.to ? `To: ${tx.to.slice(0, 8)}...${tx.to.slice(-6)}` : tx.from ? `From: ${tx.from.slice(0, 8)}...${tx.from.slice(-6)}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${tx.type === "send" ? "text-red-400" : "text-green-400"}`}>
                          {tx.type === "send" ? "-" : "+"}{tx.amount} {tx.coin}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CoinDetail;
