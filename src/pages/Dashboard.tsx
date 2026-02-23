import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Send, Download, ArrowLeftRight, RefreshCw, LogOut, Settings, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import FloatingBackground from "@/components/FloatingBackground";
import GlassCard from "@/components/GlassCard";
import { useWallet } from "@/contexts/WalletContext";
import { SUPPORTED_COINS } from "@/lib/coins";
import { getTransactions, type TransactionRecord } from "@/lib/firebase";

const Dashboard = () => {
  const navigate = useNavigate();
  const { wallet, prices, balances, refreshPrices, refreshBalances, getTotalBalance, logout } = useWallet();
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);

  useEffect(() => {
    if (!wallet) navigate("/");
  }, [wallet, navigate]);

  useEffect(() => {
    if (wallet?.addresses?.eth) {
      getTransactions(wallet.addresses.eth).then(setTransactions);
    }
  }, [wallet]);

  if (!wallet) return null;

  const totalUsd = getTotalBalance();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleRefresh = () => {
    refreshPrices();
    refreshBalances();
    if (wallet?.addresses?.eth) {
      getTransactions(wallet.addresses.eth).then(setTransactions);
    }
  };

  return (
    <div className="relative min-h-screen bg-background">
      <FloatingBackground />
      <div className="relative z-10 mx-auto max-w-2xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gradient">Stellar Vault</h1>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={handleRefresh}><RefreshCw className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}><Settings className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={handleLogout}><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>

        {/* Portfolio Balance */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard className="mb-6 p-6 text-center" glow>
            <p className="text-sm text-muted-foreground">Total Portfolio Value</p>
            <p className="text-4xl font-bold text-foreground">${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </GlassCard>
        </motion.div>

        {/* Quick Actions */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          <Button className="bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20" onClick={() => navigate("/send")}>
            <Send className="mr-2 h-4 w-4" /> Send
          </Button>
          <Button className="bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20" onClick={() => navigate("/receive")}>
            <Download className="mr-2 h-4 w-4" /> Receive
          </Button>
          <Button className="bg-accent/10 text-accent hover:bg-accent/20 border border-accent/20" onClick={() => navigate("/swap")}>
            <ArrowLeftRight className="mr-2 h-4 w-4" /> Swap
          </Button>
        </div>

        {/* Coin List */}
        <div className="space-y-3">
          {SUPPORTED_COINS.map((coin, i) => {
            const price = prices[coin.id]?.usd || 0;
            const change = prices[coin.id]?.usd_24h_change || 0;
            const balance = parseFloat(balances[coin.id] || "0");
            const value = balance * price;

            return (
              <motion.div
                key={coin.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <GlassCard
                  className="flex cursor-pointer items-center justify-between p-4 transition-all hover:glow-primary"
                  onClick={() => navigate(`/coin/${coin.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold" style={{ backgroundColor: coin.color + "20", color: coin.color }}>
                      {coin.icon}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{coin.name}</p>
                      <p className="text-sm text-muted-foreground">{balance.toFixed(6)} {coin.symbol}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">${value > 0 ? value.toFixed(2) : price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <div className={`flex items-center justify-end gap-1 text-sm ${change >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {Math.abs(change).toFixed(2)}%
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>

        {/* Transaction History */}
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Recent Transactions</h2>
          {transactions.length === 0 ? (
            <GlassCard className="p-6 text-center">
              <p className="text-muted-foreground">No transactions yet</p>
            </GlassCard>
          ) : (
            <div className="space-y-2">
              {transactions.slice(0, 20).map((tx, i) => (
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
                        <p className="text-sm font-medium text-foreground">{tx.type === "send" ? "Sent" : "Received"} {tx.coin}</p>
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
      </div>
    </div>
  );
};

export default Dashboard;
