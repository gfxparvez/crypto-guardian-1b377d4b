import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Eye, EyeOff, Trash2, Shield, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import FloatingBackground from "@/components/FloatingBackground";
import GlassCard from "@/components/GlassCard";
import { useWallet } from "@/contexts/WalletContext";
import { useToast } from "@/hooks/use-toast";
import { get2FASecret, remove2FASecret, generate2FASecret, save2FASecret, verify2FAToken } from "@/lib/totp";
import { QRCodeSVG } from "qrcode.react";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const SettingsPage = () => {
  const navigate = useNavigate();
  const { wallet, logout } = useWallet();
  const { toast } = useToast();
  const [showSeed, setShowSeed] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [twoFASetup, setTwoFASetup] = useState<{ secret: string; uri: string } | null>(null);
  const [otpInput, setOtpInput] = useState("");

  if (!wallet) { navigate("/"); return null; }

  const has2FA = !!get2FASecret();

  const handleDeleteWallet = () => {
    logout();
    toast({ title: "Wallet Deleted", description: "Your wallet has been removed from this device" });
    navigate("/");
  };

  const handleEnable2FA = () => {
    const setup = generate2FASecret("StellarVault");
    setTwoFASetup(setup);
  };

  const handleVerify2FA = () => {
    if (!twoFASetup) return;
    if (verify2FAToken(twoFASetup.secret, otpInput)) {
      save2FASecret(twoFASetup.secret);
      setTwoFASetup(null);
      setOtpInput("");
      toast({ title: "2FA Enabled", description: "Two-factor authentication is now active" });
    } else {
      toast({ title: "Invalid Code", description: "Please try again", variant: "destructive" });
    }
  };

  const handleDisable2FA = () => {
    remove2FASecret();
    toast({ title: "2FA Disabled", description: "Two-factor authentication has been removed" });
  };

  return (
    <div className="relative min-h-screen bg-background">
      <FloatingBackground />
      <div className="relative z-10 mx-auto max-w-lg px-4 py-8">
        <Button variant="ghost" className="mb-6 text-muted-foreground" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <h1 className="text-2xl font-bold text-gradient">Settings</h1>

          {/* Seed Phrase */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Seed Phrase</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowSeed(!showSeed)}>
                {showSeed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {showSeed ? (
              <div className="grid grid-cols-3 gap-2">
                {wallet.mnemonic.split(" ").map((w, i) => (
                  <div key={i} className="rounded border border-border bg-muted/30 px-2 py-1 text-center text-xs">
                    <span className="text-muted-foreground">{i + 1}.</span> <span className="font-mono text-foreground">{w}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Click the eye icon to reveal your seed phrase</p>
            )}
          </GlassCard>

          {/* 2FA */}
          <GlassCard className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Two-Factor Authentication</h2>
            {has2FA ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-400">
                  <Shield className="h-4 w-4" /> 2FA is enabled
                </div>
                <Button variant="outline" className="border-destructive/30 text-destructive" onClick={handleDisable2FA}>
                  <ShieldOff className="mr-2 h-4 w-4" /> Disable 2FA
                </Button>
              </div>
            ) : twoFASetup ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Scan this QR code with your authenticator app:</p>
                <div className="flex justify-center">
                  <div className="rounded-xl bg-white p-4">
                    <QRCodeSVG value={twoFASetup.uri} size={180} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground break-all">Secret: {twoFASetup.secret}</p>
                <Input placeholder="Enter 6-digit code" value={otpInput} onChange={(e) => setOtpInput(e.target.value)} className="border-border bg-muted/30" maxLength={6} />
                <Button className="w-full bg-primary text-primary-foreground" onClick={handleVerify2FA}>Verify & Enable</Button>
              </div>
            ) : (
              <Button className="bg-primary text-primary-foreground" onClick={handleEnable2FA}>
                <Shield className="mr-2 h-4 w-4" /> Enable 2FA
              </Button>
            )}
          </GlassCard>

          {/* Delete Wallet */}
          <GlassCard className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Danger Zone</h2>
            <Button variant="outline" className="border-destructive/30 text-destructive" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete Wallet
            </Button>
          </GlassCard>
        </motion.div>

        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent className="glass-strong border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground">Delete Wallet?</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                This will remove all wallet data from this device. Make sure you have your seed phrase saved.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteWallet} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default SettingsPage;
