import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Shield, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import FloatingBackground from "@/components/FloatingBackground";
import GlassCard from "@/components/GlassCard";
import { useWallet } from "@/contexts/WalletContext";
import { SUPPORTED_COINS } from "@/lib/coins";
import { generate2FASecret, save2FASecret, get2FASecret, verify2FAToken, set2FASession, is2FASessionValid } from "@/lib/totp";
import { QRCodeSVG } from "qrcode.react";
import { useToast } from "@/hooks/use-toast";

const AdminPanel = () => {
  const { wallet, prices, balances, getTotalBalance } = useWallet();
  const { toast } = useToast();
  const [authenticated, setAuthenticated] = useState(is2FASessionValid(true));
  const [showBalances, setShowBalances] = useState(true);
  const [otpInput, setOtpInput] = useState("");
  const [setupMode, setSetupMode] = useState(false);
  const [setup, setSetup] = useState<{ secret: string; uri: string } | null>(null);

  const adminSecret = get2FASecret(true);

  const handleSetup2FA = () => {
    const s = generate2FASecret("StellarVault-Admin");
    setSetup(s);
    setSetupMode(true);
  };

  const handleVerifySetup = () => {
    if (!setup) return;
    if (verify2FAToken(setup.secret, otpInput)) {
      save2FASecret(setup.secret, true);
      set2FASession(true);
      setAuthenticated(true);
      setSetupMode(false);
      setOtpInput("");
      toast({ title: "Admin 2FA Enabled" });
    } else {
      toast({ title: "Invalid Code", variant: "destructive" });
    }
  };

  const handleLogin = () => {
    if (!adminSecret) return;
    if (verify2FAToken(adminSecret, otpInput)) {
      set2FASession(true);
      setAuthenticated(true);
      setOtpInput("");
    } else {
      toast({ title: "Invalid Code", variant: "destructive" });
    }
  };

  // Not authenticated
  if (!authenticated) {
    return (
      <div className="relative min-h-screen bg-background">
        <FloatingBackground />
        <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
          <GlassCard className="w-full max-w-sm p-8 text-center" glow>
            <Shield className="mx-auto mb-4 h-12 w-12 text-primary" />
            <h1 className="mb-2 text-xl font-bold text-gradient">Admin Access</h1>

            {!adminSecret && !setupMode ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Set up admin 2FA to access this panel.</p>
                <Button className="bg-primary text-primary-foreground" onClick={handleSetup2FA}>Setup Admin 2FA</Button>
              </div>
            ) : setupMode && setup ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Scan with your authenticator:</p>
                <div className="flex justify-center"><div className="rounded-xl bg-white p-3"><QRCodeSVG value={setup.uri} size={160} /></div></div>
                <p className="text-xs text-muted-foreground break-all">Secret: {setup.secret}</p>
                <Input placeholder="6-digit code" value={otpInput} onChange={(e) => setOtpInput(e.target.value)} className="border-border bg-muted/30 text-center" maxLength={6} />
                <Button className="w-full bg-primary text-primary-foreground" onClick={handleVerifySetup}>Verify</Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Enter your admin 2FA code:</p>
                <Input placeholder="6-digit code" value={otpInput} onChange={(e) => setOtpInput(e.target.value)} className="border-border bg-muted/30 text-center" maxLength={6} />
                <Button className="w-full bg-primary text-primary-foreground" onClick={handleLogin}>Authenticate</Button>
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    );
  }

  const totalUsd = wallet ? getTotalBalance() : 0;

  return (
    <div className="relative min-h-screen bg-background">
      <FloatingBackground />
      <div className="relative z-10 mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gradient">Admin Panel</h1>
          <Button variant="ghost" size="icon" onClick={() => setShowBalances(!showBalances)}>
            {showBalances ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Total */}
          <GlassCard className="p-6 text-center" glow>
            <p className="text-sm text-muted-foreground">Portfolio Value</p>
            <p className="text-3xl font-bold text-foreground">
              {showBalances ? `$${totalUsd.toFixed(2)}` : "••••••"}
            </p>
          </GlassCard>

          {/* Coins */}
          {SUPPORTED_COINS.map((coin) => {
            const price = prices[coin.id]?.usd || 0;
            const change = prices[coin.id]?.usd_24h_change || 0;
            const balance = parseFloat(balances[coin.id] || "0");

            return (
              <GlassCard key={coin.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold" style={{ backgroundColor: coin.color + "20", color: coin.color }}>
                    {coin.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{coin.symbol}</p>
                    <p className="text-xs text-muted-foreground">{showBalances ? `${balance.toFixed(6)}` : "••••"}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">${price.toFixed(2)}</p>
                  <div className={`flex items-center justify-end gap-1 text-xs ${change >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {Math.abs(change).toFixed(2)}%
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
};

export default AdminPanel;
