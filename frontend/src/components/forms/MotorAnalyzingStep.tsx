import { motion } from "framer-motion";
import { Shield, FileSearch, Car, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  isAnalyzing: boolean;
  extractionFailed?: boolean;
  onComplete: () => void;
  onRetry?: () => void;
}

const stages = [
  { icon: FileSearch, label: "Reading your policy document…" },
  { icon: Car, label: "Extracting vehicle & IDV details…" },
  { icon: Shield, label: "Analyzing coverage gaps…" },
  { icon: CheckCircle2, label: "Preparing your report…" },
];

const MotorAnalyzingStep = ({ isAnalyzing, extractionFailed, onComplete, onRetry }: Props) => {
  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    // Stage transition timer
    const interval = setInterval(() => {
      setActiveStage((prev) => {
        if (prev < stages.length - 1) return prev + 1;
        return prev;
      });
    }, 50); // 50ms per stage

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Handle completion once isAnalyzing is false
    if (!isAnalyzing) {
      // If backend is done, we don't jump to end immediately.
      // We let the current transition finish, but speed up to the last stage.
      const finishTimer = setTimeout(() => {
        setActiveStage(stages.length - 1);
        // Final delay before closing to let user see "Preparing report"
        setTimeout(onComplete, 1500);
      }, activeStage * 500); // Dynamic delay based on where we are

      return () => clearTimeout(finishTimer);
    }
  }, [isAnalyzing, onComplete]);

  return (
    <div className="flex flex-col items-center justify-center py-8 space-y-10">
      {/* Animated car */}
      <div className="relative w-full h-40 overflow-hidden">
        {/* Road */}
        <div className="absolute bottom-6 left-0 right-0 h-1 bg-border/40 rounded-full" />
        <motion.div
          className="absolute bottom-5 left-0 right-0 h-[3px] rounded-full"
          style={{
            background:
              "repeating-linear-gradient(90deg, hsl(var(--primary)) 0px, hsl(var(--primary)) 12px, transparent 12px, transparent 24px)",
          }}
          animate={{ x: [0, -24] }}
          transition={{ duration: 0.6, repeat: Infinity, ease: "linear" }}
        />

        {/* Car body */}
        <motion.div
          className="absolute bottom-8 left-1/2"
          initial={{ x: "-200%", opacity: 0 }}
          animate={{ x: "-50%", opacity: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        >
          {/* Car SVG */}
          <motion.svg
            width="120"
            height="60"
            viewBox="0 0 120 60"
            fill="none"
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* Body */}
            <path
              d="M15 40 L25 40 L30 25 L50 15 L90 15 L105 25 L110 40 L115 40"
              stroke="hsl(var(--primary))"
              strokeWidth="2.5"
              fill="hsl(var(--primary) / 0.15)"
              strokeLinejoin="round"
            />
            {/* Roof */}
            <path
              d="M40 25 L45 10 L80 10 L90 25"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              fill="hsl(var(--primary) / 0.08)"
              strokeLinejoin="round"
            />
            {/* Windows */}
            <rect x="48" y="12" width="12" height="11" rx="2" fill="hsl(var(--primary) / 0.3)" />
            <rect x="63" y="12" width="14" height="11" rx="2" fill="hsl(var(--primary) / 0.3)" />
            {/* Headlights */}
            <circle cx="108" cy="32" r="3" fill="hsl(var(--primary))" opacity="0.9" />
            <circle cx="18" cy="35" r="2.5" fill="hsl(0 80% 55%)" opacity="0.7" />
            {/* Wheels */}
            <circle cx="35" cy="42" r="8" stroke="hsl(var(--foreground) / 0.6)" strokeWidth="2.5" fill="hsl(var(--background))" />
            <circle cx="35" cy="42" r="3" fill="hsl(var(--foreground) / 0.3)" />
            <circle cx="92" cy="42" r="8" stroke="hsl(var(--foreground) / 0.6)" strokeWidth="2.5" fill="hsl(var(--background))" />
            <circle cx="92" cy="42" r="3" fill="hsl(var(--foreground) / 0.3)" />
          </motion.svg>

          {/* Scan beam */}
          <motion.div
            className="absolute -top-4 left-1/2 w-0.5 h-16 bg-primary/60 rounded-full"
            animate={{ x: [-30, 30, -30], opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>

        {/* Glow beneath car */}
        <motion.div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 w-32 h-3 rounded-full bg-primary/20 blur-md"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </div>

      {/* Title */}
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-foreground">Analyzing Your Policy</h2>
        <p className="text-sm text-muted-foreground">
          Our AI is scanning your document for coverage details
        </p>
      </div>

      {/* Progress stages */}
      {!extractionFailed ? (
        <div className="w-full max-w-xs space-y-3">
          {stages.map((stage, i) => {
            const Icon = stage.icon;
            const isActive = i === activeStage;
            const isDone = i < activeStage;

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.15 }}
                className={`flex items-center gap-3 rounded-lg px-4 py-2.5 transition-all duration-500 ${isActive
                  ? "bg-primary/10 border border-primary/30"
                  : isDone
                    ? "bg-secondary/30 border border-transparent"
                    : "border border-transparent opacity-40"
                  }`}
              >
                <div
                  className={`shrink-0 transition-colors duration-500 ${isDone ? "text-score-green" : isActive ? "text-primary" : "text-muted-foreground"
                    }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <motion.div
                      animate={isActive ? { rotate: [0, 10, -10, 0] } : {}}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <Icon className="h-4 w-4" />
                    </motion.div>
                  )}
                </div>
                <span
                  className={`text-sm transition-colors duration-500 ${isActive ? "text-foreground font-medium" : isDone ? "text-muted-foreground" : "text-muted-foreground"
                    }`}
                >
                  {stage.label}
                </span>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-xs p-6 rounded-2xl bg-destructive/10 border border-destructive/20 text-center space-y-4"
        >
          <div className="text-destructive font-semibold">Analysis Failed</div>
          <p className="text-xs text-muted-foreground">
            We couldn't analyze your policy PDF. Please make sure the file is not password protected and contains readable text.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="w-full border-destructive/50 hover:bg-destructive/10 text-destructive"
            onClick={onRetry}
          >
            Try Again
          </Button>
        </motion.div>
      )}
    </div>
  );
};

export default MotorAnalyzingStep;
