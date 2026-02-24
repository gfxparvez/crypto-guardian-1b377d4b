import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Shield, Coins, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import FloatingBackground from "@/components/FloatingBackground";
import GlassCard from "@/components/GlassCard";
import { useWallet } from "@/contexts/WalletContext";
import { useEffect } from "react";

const features = [
  { icon: Shield, title: "Military-Grade Security", desc: "Client-side encryption with BIP39 mnemonic seed phrases. Your keys never leave your device." },
  { icon: Coins, title: "Litecoin Wallet", desc: "Secure Litecoin (LTC) wallet with real-time balance and transaction tracking." },
  { icon: TrendingUp, title: "Real-Time Tracking", desc: "Live price tracking with 24h change indicators powered by CoinGecko API." },
];

const Index = () => {
  const navigate = useNavigate();
  const { wallet } = useWallet();

  useEffect(() => {
    if (wallet) navigate("/dashboard");
  }, [wallet, navigate]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <FloatingBackground />
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-16">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="mb-12 text-center">
          <motion.div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm text-primary" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
            <Shield className="h-4 w-4" />
            Secure Litecoin Wallet
          </motion.div>
          <h1 className="mb-4 text-5xl font-bold tracking-tight md:text-7xl">
            <span className="text-gradient">Stellar Vault</span>
            <br />
            <span className="text-foreground">Guard</span>
          </h1>
          <p className="mx-auto max-w-xl text-lg text-muted-foreground">
            Your secure Litecoin wallet. Manage your LTC with military-grade security, real-time prices, and a beautiful interface.
          </p>
        </motion.div>

        <motion.div className="mb-16 flex flex-col gap-4 sm:flex-row" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Button size="lg" className="bg-primary text-primary-foreground px-8 py-6 text-lg glow-primary hover:bg-primary/90" onClick={() => navigate("/create")}>
            Create New Wallet
          </Button>
          <Button size="lg" variant="outline" className="border-primary/30 px-8 py-6 text-lg hover:bg-primary/10" onClick={() => navigate("/import")}>
            Import Existing Wallet
          </Button>
        </motion.div>

        <motion.div className="grid max-w-4xl gap-6 md:grid-cols-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
          {features.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 + i * 0.15 }}>
              <GlassCard className="p-6 text-center hover:glow-primary transition-shadow duration-300">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <f.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default Index;
