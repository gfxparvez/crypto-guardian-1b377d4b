import { useState } from "react";
import { motion } from "framer-motion";
import { Download, Globe, CheckCircle2, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import FloatingBackground from "@/components/FloatingBackground";
import GlassCard from "@/components/GlassCard";
import { useToast } from "@/hooks/use-toast";

const GFXCPanelInstall = () => {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [domain, setDomain] = useState("");
  const [isInstalling, setIsInstalling] = useState(false);

  const handleDownload = () => {
    // In a real app, this would trigger a file download of runer.php
    // For this UI, we just progress the step
    toast({
      title: "File Downloaded",
      description: "runer.php has been downloaded. Please upload it to your cPanel public_html directory.",
    });
    setStep(2);
  };

  const handleInstall = () => {
    if (!domain) {
      toast({
        title: "Error",
        description: "Please enter your domain URL",
        variant: "destructive",
      });
      return;
    }

    if (!domain.includes("runer.php")) {
      toast({
        title: "Invalid URL",
        description: "The URL must point to your runer.php file (e.g., https://yourdomain.com/runer.php)",
        variant: "destructive",
      });
      return;
    }

    setIsInstalling(true);
    // Simulate automatic installation process
    setTimeout(() => {
      setIsInstalling(false);
      setStep(3);
      toast({
        title: "Installation Successful",
        description: "The app has been automatically configured in your cPanel.",
      });
    }, 3000);
  };

  return (
    <div className="relative min-h-screen bg-background">
      <FloatingBackground />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
        <GlassCard className="w-full max-w-md p-8 text-center" glow>
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-primary/20 p-4">
              <Server className="h-10 w-10 text-primary" />
            </div>
          </div>
          
          <h1 className="mb-2 text-2xl font-bold text-gradient">cPanel Auto Installer</h1>
          <p className="mb-8 text-sm text-muted-foreground">
            Follow the steps below to automatically install the application on your cPanel server.
          </p>

          <div className="space-y-6">
            {/* Step 1: Download */}
            <div className={`flex items-start gap-4 text-left transition-opacity ${step !== 1 ? "opacity-50" : ""}`}>
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${step > 1 ? "bg-primary border-primary text-white" : "border-muted-foreground"}`}>
                {step > 1 ? <CheckCircle2 className="h-5 w-5" /> : "1"}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Download module</h3>
                <p className="text-xs text-muted-foreground mb-3">Download the runer.php file for your server.</p>
                {step === 1 && (
                  <Button 
                    data-testid="button-download-php"
                    className="w-full bg-primary text-primary-foreground" 
                    onClick={handleDownload}
                  >
                    <Download className="mr-2 h-4 w-4" /> Download runer.php
                  </Button>
                )}
              </div>
            </div>

            {/* Step 2: Configure & Install */}
            <div className={`flex items-start gap-4 text-left transition-opacity ${step !== 2 ? "opacity-50" : ""}`}>
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${step > 2 ? "bg-primary border-primary text-white" : "border-muted-foreground"}`}>
                {step > 2 ? <CheckCircle2 className="h-5 w-5" /> : "2"}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Run Installer</h3>
                <p className="text-xs text-muted-foreground mb-3">Upload runer.php to public_html, then enter the full URL below.</p>
                {step === 2 && (
                  <div className="space-y-3">
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input 
                        data-testid="input-install-domain"
                        placeholder="https://kbvesport.site/runer.php" 
                        value={domain}
                        onChange={(e) => setDomain(e.target.value)}
                        className="pl-10 border-border bg-muted/30"
                      />
                    </div>
                    <Button 
                      data-testid="button-start-install"
                      className="w-full bg-primary text-primary-foreground" 
                      onClick={handleInstall}
                      disabled={isInstalling}
                    >
                      {isInstalling ? "Installing..." : "Install Now"}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Step 3: Success */}
            {step === 3 && (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="rounded-lg bg-green-500/10 p-4 text-green-500"
              >
                <div className="flex items-center justify-center gap-2 mb-1">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-bold">Setup Complete!</span>
                </div>
                <p className="text-xs">The application has been successfully installed and configured.</p>
                <Button 
                  data-testid="button-goto-dashboard"
                  variant="outline" 
                  className="mt-4 w-full border-green-500/50 hover:bg-green-500/20"
                  onClick={() => window.location.href = '/dashboard'}
                >
                  Go to Dashboard
                </Button>
              </motion.div>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default GFXCPanelInstall;
