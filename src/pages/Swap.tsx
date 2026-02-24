import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import FloatingBackground from "@/components/FloatingBackground";
import GlassCard from "@/components/GlassCard";

const SwapPage = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen bg-background">
      <FloatingBackground />
      <div className="relative z-10 mx-auto max-w-lg px-4 py-8">
        <Button variant="ghost" className="mb-6 text-muted-foreground" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard className="p-6 text-center" glow>
            <ArrowLeftRight className="mx-auto mb-4 h-12 w-12 text-primary/40" />
            <h1 className="mb-2 text-2xl font-bold text-gradient">Swap</h1>
            <p className="text-muted-foreground">Coming soon! Swap functionality will be available in a future update.</p>
            <Button className="mt-6" variant="outline" onClick={() => navigate("/dashboard")}>
              Back to Wallet
            </Button>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
};

export default SwapPage;
