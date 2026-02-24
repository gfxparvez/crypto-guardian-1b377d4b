import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import FloatingBackground from "@/components/FloatingBackground";
import GlassCard from "@/components/GlassCard";

interface TxProgressState {
  amount: string;
  fee: string;
  feeUsd: string;
  toAddress: string;
  txHash: string;
  orderId: string;
  submittedAt: number;
}

const steps = [
  { label: "Send Order Submitted", key: "submitted" },
  { label: "Pending", key: "pending" },
  { label: "Blockchain Processing", key: "processing", desc: "Trading on the chain usually takes some time." },
  { label: "Transaction Completed", key: "completed" },
];

const TransactionProgress = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as TxProgressState | null;
  const [currentStep, setCurrentStep] = useState(0);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!state) return;
    // Animate steps
    const t1 = setTimeout(() => setCurrentStep(1), 1000);
    const t2 = setTimeout(() => setCurrentStep(2), 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [state]);

  // Poll for confirmation (real tx hash)
  useEffect(() => {
    if (!state?.txHash || confirmed || state.txHash.startsWith("pending_")) return;
    
    // Move to step 2 quickly since tx is already broadcast
    const t3 = setTimeout(() => setCurrentStep(2), 1500);

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`https://api.blockcypher.com/v1/ltc/main/txs/${state.txHash}`);
        if (res.ok) {
          const data = await res.json();
          if (data.confirmations && data.confirmations > 0) {
            setConfirmed(true);
            setCurrentStep(3);
            clearInterval(interval);
          }
        }
      } catch { /* ignore */ }
    }, 10000);
    return () => { clearTimeout(t3); clearInterval(interval); };
  }, [state?.txHash, confirmed]);

  if (!state) {
    return (
      <div className="relative min-h-screen bg-background flex items-center justify-center">
        <FloatingBackground />
        <div className="relative z-10 text-center">
          <p className="text-muted-foreground mb-4">No transaction data</p>
          <Button onClick={() => navigate("/dashboard")}>Back to Wallet</Button>
        </div>
      </div>
    );
  }

  const truncateAddr = (addr: string) =>
    addr.length > 20 ? `${addr.slice(0, 16)}...${addr.slice(-6)}` : addr;

  return (
    <div className="relative min-h-screen bg-background">
      <FloatingBackground />
      <div className="relative z-10 mx-auto max-w-lg px-4 py-8">
        <Button variant="ghost" className="mb-6 text-muted-foreground" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Wallet
        </Button>

        {/* Amount Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard className="p-6 text-center mb-4" glow>
            <p className="text-4xl font-bold text-foreground">
              Ł <span className="text-red-400">-{state.amount}</span> LTC
            </p>
            <div className="mt-2 flex items-center justify-center gap-2">
              <span className="text-sm text-muted-foreground">Status</span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                confirmed
                  ? "bg-green-500/20 text-green-400"
                  : "bg-yellow-500/20 text-yellow-400"
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${confirmed ? "bg-green-400" : "bg-yellow-400 animate-pulse"}`} />
                {confirmed ? "Completed" : "Processing"}
              </span>
            </div>
          </GlassCard>
        </motion.div>

        {/* Transaction Details */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <GlassCard className="p-4 mb-4">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order ID</span>
                <span className="font-mono text-xs text-foreground">{state.orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Network</span>
                <span className="text-foreground">LTC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fee</span>
                <span className="text-foreground">{state.fee} LTC <span className="text-muted-foreground">(${state.feeUsd})</span></span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">To Address</span>
                <span className="font-mono text-xs text-foreground">{truncateAddr(state.toAddress)}</span>
              </div>
              {state.txHash && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tx Hash</span>
                  <a
                    href={`https://live.blockcypher.com/ltc/tx/${state.txHash}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-primary hover:underline"
                  >
                    {state.txHash.slice(0, 12)}...
                  </a>
                </div>
              )}
            </div>
          </GlassCard>
        </motion.div>

        {/* Status Timeline */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <GlassCard className="p-6">
            <h3 className="mb-4 text-sm font-semibold text-muted-foreground">Status</h3>
            <div className="space-y-0">
              {steps.map((step, i) => {
                const isCompleted = i < currentStep || (i === currentStep && confirmed && i === 3);
                const isActive = i === currentStep && !confirmed;
                const isPending = i > currentStep;

                return (
                  <motion.div
                    key={step.key}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.3 }}
                    className="relative"
                  >
                    {/* Connector line */}
                    {i < steps.length - 1 && (
                      <div className={`absolute left-[11px] top-[28px] h-full w-0.5 ${
                        isCompleted ? "bg-green-500" : isActive ? "bg-primary/30" : "bg-muted"
                      }`} />
                    )}

                    <div className="flex items-start gap-3 pb-6">
                      {/* Icon */}
                      <div className="relative z-10 mt-0.5">
                        {isCompleted ? (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", delay: 0.1 }}
                          >
                            <CheckCircle2 className="h-6 w-6 text-green-500" />
                          </motion.div>
                        ) : isActive ? (
                          <div className="relative">
                            <Loader2 className="h-6 w-6 text-primary animate-spin" />
                            <div className="absolute inset-0 h-6 w-6 rounded-full bg-primary/20 animate-ping" />
                          </div>
                        ) : (
                          <Circle className="h-6 w-6 text-muted-foreground/30" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${
                          isPending ? "text-muted-foreground/40" : "text-foreground"
                        }`}>
                          {step.label}
                        </p>
                        {step.key === "submitted" && isCompleted && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Submitted at {new Date(state.submittedAt).toLocaleString()}
                          </p>
                        )}
                        {step.desc && isActive && (
                          <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                        )}
                        {step.key === "completed" && confirmed && (
                          <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-xs text-green-400 mt-0.5"
                          >
                            Transaction confirmed on blockchain ✓
                          </motion.p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </GlassCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="mt-6"
        >
          <Button className="w-full" variant="outline" onClick={() => navigate("/dashboard")}>
            Back to Wallet
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default TransactionProgress;
