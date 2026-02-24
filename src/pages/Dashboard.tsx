import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Send, Download, RefreshCw, LogOut, Settings, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import FloatingBackground from "@/components/FloatingBackground";
import GlassCard from "@/components/GlassCard";
import { useWallet } from "@/contexts/WalletContext";

const Dashboard = () => {
  const navigate = useNavigate();
  const { wallet, prices, balances, transactions, txLoading, refreshAll, getTotalBalance, logout, syncMeta } = useWallet();
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);


  useEffect(() => {
    if (!wallet) navigate("/");
  }, [wallet, navigate]);

  if (!wallet) return null;

  const totalUsd = getTotalBalance();
  const ltcAddress = wallet.addresses["ltc"] || "";
  const ltcBalance = parseFloat(balances["ltc"] || "0");
  const ltcPrice = prices["ltc"]?.usd || 0;
  const ltcChange = prices["ltc"]?.usd_24h_change || 0;
  const ltcValue = ltcBalance * ltcPrice;

  const handleLogout = () => { logout(); navigate("/"); };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(ltcAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative min-h-screen bg-background">
      <FloatingBackground />
      <div className="relative z-10 mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gradient">Stellar Vault</h1>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}><Settings className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={handleLogout}><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>

        {/* Balance */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard className="mb-6 p-6 text-center" glow>
            <p className="text-sm text-muted-foreground">Total Balance</p>
            <p className="text-4xl font-bold text-foreground">
              {txLoading && ltcBalance === 0 ? (
                <span className="animate-pulse">Loading...</span>
              ) : (
                `$${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              )}
            </p>
            <p className="mt-1 text-lg text-muted-foreground">
              {ltcBalance.toFixed(8)} LTC
            </p>
            {syncMeta.syncError && (
              <p className="mt-1 text-xs text-yellow-400">
                {syncMeta.lastUpdated
                  ? `⚠ Showing cached data • Last synced ${new Date(syncMeta.lastUpdated).toLocaleTimeString()}`
                  : "⚠ Couldn't reach blockchain API"}
              </p>
            )}
            <button
              onClick={copyAddress}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/80"
            >
              {ltcAddress.slice(0, 8)}...{ltcAddress.slice(-6)}
              {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
            </button>
          </GlassCard>
        </motion.div>

        {/* Actions */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          <Button className="bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20" onClick={() => navigate("/send")}>
            <Send className="mr-2 h-4 w-4" /> Send
          </Button>
          <Button className="bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20" onClick={() => navigate("/receive")}>
            <Download className="mr-2 h-4 w-4" /> Receive
          </Button>
        </div>

        {/* LTC Card */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <GlassCard
            className="flex cursor-pointer items-center justify-between p-4 transition-all hover:glow-primary mb-6"
            onClick={() => navigate("/coin/ltc")}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold" style={{ backgroundColor: "#345D9D20", color: "#345D9D" }}>
                Ł
              </div>
              <div>
                <p className="font-semibold text-foreground">Litecoin</p>
                <p className="text-sm text-muted-foreground">
                  {txLoading && ltcBalance === 0 ? <span className="animate-pulse">Loading...</span> : `${ltcBalance.toFixed(8)} LTC`}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold text-foreground">
                {ltcPrice > 0 ? `$${ltcValue > 0 ? ltcValue.toFixed(2) : ltcPrice.toFixed(2)}` : <span className="animate-pulse">...</span>}
              </p>
              <div className={`flex items-center justify-end gap-1 text-sm ${ltcChange >= 0 ? "text-green-400" : "text-red-400"}`}>
                {ltcChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(ltcChange).toFixed(2)}%
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Transactions */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Recent Transactions</h2>
          </div>
          {txLoading ? (
            <GlassCard className="p-6 text-center">
              <p className="text-muted-foreground animate-pulse">Loading transactions...</p>
            </GlassCard>
          ) : transactions.length === 0 ? (
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
                  <GlassCard className="flex items-center justify-between p-4 transition-all hover:bg-muted/10">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${tx.type === "send" ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}`}>
                        {tx.type === "send" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{tx.type === "send" ? "Sent" : "Received"} LTC</p>
                        <p className="text-xs text-muted-foreground">
                          {tx.type === "send"
                            ? tx.to ? `To: ${tx.to.slice(0, 8)}...${tx.to.slice(-6)}` : ""
                            : tx.from ? `From: ${tx.from.slice(0, 8)}...${tx.from.slice(-6)}` : ""
                          }
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${tx.type === "send" ? "text-red-400" : "text-green-400"}`}>
                        {tx.type === "send" ? "-" : "+"}{tx.amount} LTC
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
