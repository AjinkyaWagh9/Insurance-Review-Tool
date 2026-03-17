import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, CheckCircle2, Loader2 } from "lucide-react";
import { useProtectionCheck } from "@/context/ProtectionCheckContext";

interface Props {
  onComplete: () => void;
}

const processingStages = [
  "Reading your policy document...",
  "Extracting sum insured details...",
  "Identifying hospital coverage benefits...",
  "Checking room rent eligibility...",
  "Detecting waiting periods...",
  "Analyzing missing add-ons...",
  "Evaluating restoration benefits...",
  "Calculating your protection score..."
];

const HealthProcessingStep = ({ onComplete }: Props) => {
  const { policyProcessed } = useProtectionCheck();
  const [progressIndex, setProgressIndex] = useState(0);

  // Rule 3B - Sequential Reveal
  useEffect(() => {
    const interval = setInterval(() => {
      setProgressIndex(prev => {
        // If we reached the end, stay there
        if (prev >= processingStages.length - 1) {
          clearInterval(interval);
          return prev;
        }

        // If backend is done, and we've shown at least a few stages, or if we are at the end
        if (policyProcessed && prev >= 3) {
          clearInterval(interval);
          setTimeout(onComplete, 800);
          return processingStages.length - 1;
        }

        return prev + 1;
      });
    }, 50); // Faster but readable

    return () => clearInterval(interval);
  }, [policyProcessed, onComplete]);

  // Handle immediate completion if backend was already done and we finished animation
  useEffect(() => {
    if (policyProcessed && progressIndex === processingStages.length - 1) {
      const timer = setTimeout(onComplete, 800);
      return () => clearTimeout(timer);
    }
  }, [policyProcessed, progressIndex, onComplete]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <FileText className="h-10 w-10 text-primary mx-auto mb-3" />
        <h2 className="text-xl font-bold text-foreground">
          {policyProcessed ? "Analysis Complete" : "Analyzing Your Policy"}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {policyProcessed ? "Preparing your personalized report…" : "Please wait while we extract policy details."}
        </p>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-4">
        <AnimatePresence>
          {processingStages.slice(0, progressIndex + 1).map((stage, i) => (
            <motion.div
              key={stage}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-3"
            >
              {i < progressIndex || policyProcessed ? (
                <CheckCircle2 className="h-4 w-4 text-score-green shrink-0" />
              ) : (
                <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
              )}
              <p className={`text-sm transition-colors ${i < progressIndex || policyProcessed ? "text-foreground/50" : "text-foreground font-medium"}`}>
                {stage}
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default HealthProcessingStep;
