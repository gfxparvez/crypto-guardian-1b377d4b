import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Send, Download, ArrowLeftRight, RefreshCw, LogOut, Settings, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import FloatingBackground from "@/components/FloatingBackground";
import GlassCard from "@/components/GlassCard";
import { useWallet } from "@/contexts/WalletContext";
import { SUPPORTED_COINS } from "@/lib/coins";

const Dashboard = () => {
  const navigate = useNavigate();
  const { wallet, prices, balances, refreshPrices, refreshBalances, getTotalBalance, logout } = useWallet();

  useEffect(() => {
    if (!wallet) navigate("/");
  }, [wallet, navigate]);

  if (!wallet) return null;

  const totalUsd = getTotalBalance();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleRefresh = () => {
    refreshPrices();
    refreshBalances();
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
                      <p className="text-sm text-muted-foreground">{coin.symbol}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
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
      </div>
    </div>
  );
};

export default Dashboard;
