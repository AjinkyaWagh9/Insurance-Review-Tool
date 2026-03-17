import { useState, useRef, useEffect } from "react";
import { computeMissingRiders } from "@/constants/termRiders";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Lock, CheckCircle2, Loader2, AlertTriangle, Shield, FileSearch, Cpu, Lightbulb, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTermProtection } from "@/context/TermProtectionCheckContext";
import { getScoreMeta } from "@/utils/scoreMeta";

function formatCurrency(val: number | undefined | null): string {
  if (val === undefined || val === null || isNaN(val)) return "₹0";
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)} Lakh`;
  return `₹${val.toLocaleString("en-IN")}`;
}

interface Props {
  onContinue: () => void;
  onRetry?: () => void;
}

const TermPolicyUploadStep = ({ onContinue, onRetry }: Props) => {
  const {
    activeIdeal, existingSumAssured, activeShortfall,
    policyUploaded, policyVerified, policyAnalyzing, extractedPolicy,
    mode, uploadPolicy, retirementAge,
    annualIncome, loanAmount, monthlyExpenses
  } = useTermProtection();

  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const coveragePercent = activeIdeal > 0
    ? Math.min(100, Math.round((existingSumAssured / activeIdeal) * 100))
    : 0;

  const { color: scoreColor } = getScoreMeta(coveragePercent);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.type === "application/pdf") uploadPolicy(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadPolicy(file);
  };

  // Detected SA mismatch
  const saMismatch = policyVerified && !!extractedPolicy?.extracted_sum_assured
    && extractedPolicy.extracted_sum_assured !== existingSumAssured;

  // Term duration check
  const termEndsTooEarly = policyVerified && !!extractedPolicy?.policy_term_end_age
    && (extractedPolicy.policy_term_end_age || 0) < retirementAge;

  const missingRiders = policyVerified
    ? computeMissingRiders(extractedPolicy?.riders_present ?? [])
    : [];

  const isProcessing = policyUploaded && policyAnalyzing;

  const processingSteps = [
    { icon: FileSearch, label: "Extracting Sum Assured…" },
    { icon: Shield, label: "Finding riders & coverage gaps…" },
    { icon: Cpu, label: "Analyzing policy structure…" },
    { icon: Lightbulb, label: "Suggesting recommendations…" },
  ];

  const [activeProcessingStep, setActiveProcessingStep] = useState(0);

  const ESTIMATED_ANALYSIS_MS = 6000; // 6 second estimate
  const stepDuration = Math.floor(ESTIMATED_ANALYSIS_MS / (processingSteps.length + 1));

  useEffect(() => {
    if (!policyAnalyzing) {
      setActiveProcessingStep(0);
      return;
    }

    setActiveProcessingStep(0);
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Advance through steps 0 → (length - 2), holding on last step for API
    for (let i = 1; i < processingSteps.length - 1; i++) {
      timers.push(
        setTimeout(() => {
          setActiveProcessingStep(i);
        }, i * stepDuration)
      );
    }

    return () => timers.forEach(clearTimeout);
  }, [policyAnalyzing]);

  // When policyAnalyzing becomes false (API done), snap to last step briefly
  useEffect(() => {
    if (!policyAnalyzing && policyUploaded) {
      setActiveProcessingStep(processingSteps.length - 1);
    }
  }, [policyAnalyzing, policyUploaded]);

  return (
    <div className="space-y-6">
      {/* Estimate summary */}
      <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-4">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Your Estimate Summary</h3>
        <div className="flex justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Your Cover</p>
            <p className={`text-lg font-bold text-${scoreColor}`}>{formatCurrency(existingSumAssured)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Ideal Cover</p>
            <p className="text-lg font-bold text-foreground">{formatCurrency(activeIdeal)}</p>
          </div>
        </div>
        {(() => {
          const baseMultiplier = 5;
          const baseCover = annualIncome * baseMultiplier;
          const loanCover = loanAmount || 0;
          const expensesCover = monthlyExpenses > 0 ? monthlyExpenses * 12 * 2 : 0;
          const totalCover = activeIdeal || (baseCover + loanCover + expensesCover);

          const baseWidth = totalCover > 0 ? Math.round((baseCover / totalCover) * 100) : 100;
          const loanWidth = totalCover > 0 ? Math.round((loanCover / totalCover) * 100) : 0;
          const expWidth = totalCover > 0 ? Math.round((expensesCover / totalCover) * 100) : 0;

          return (
            <div className="space-y-2 mt-1">
              <div className="h-4 w-full rounded-full overflow-hidden flex">
                <motion.div initial={{ width: 0 }} animate={{ width: `${baseWidth}%` }} className="h-full bg-primary" />
                {loanWidth > 0 && <motion.div initial={{ width: 0 }} animate={{ width: `${loanWidth}%` }} className="h-full bg-score-amber" />}
                {expWidth > 0 && <motion.div initial={{ width: 0 }} animate={{ width: `${expWidth}%` }} className="h-full bg-score-red/70" />}
              </div>
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                  <span>Base Cover</span>
                </div>
                {loanWidth > 0 && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-score-amber" />
                    <span>Loan</span>
                  </div>
                )}
                {expWidth > 0 && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-score-red/70" />
                    <span>Dependencies</span>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
        {activeShortfall > 0 && (
          <p className={`text-center text-sm font-bold text-${scoreColor}`}>
            Shortfall: {formatCurrency(activeShortfall)}
          </p>
        )}
      </div>

      {/* Policy Upload Section */}
      <div className="rounded-2xl border border-border/30 bg-card/50 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Upload Your Term Policy for Full Audit</h3>
          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Required</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          We'll analyze your plan for term duration mismatch, rider gaps, premium efficiency, and insurer profile.
        </p>

        {policyAnalyzing ? (
          <div className="flex items-center gap-3 rounded-xl border border-border/40 bg-secondary/30 p-4 relative overflow-hidden">
            <AnimatePresence mode="wait">
              {processingSteps.map((step, idx) => idx === activeProcessingStep && (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-3 w-full"
                >
                  <step.icon className={`h-5 w-5 ${idx === 0 ? "text-blue-400" : idx === 1 ? "text-purple-400" : idx === 2 ? "text-emerald-400" : "text-amber-400"} animate-pulse shrink-0`} />
                  <p className="text-sm text-foreground/80 font-medium">{step.label}</p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : policyUploaded ? (
          <div className="space-y-3">
            <div className="flex flex-col gap-3 rounded-xl border border-score-green/30 bg-score-green/5 p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-score-green shrink-0" />
                <p className="text-sm text-foreground/80">
                  {policyVerified
                    ? "Policy analyzed successfully. Structural audit included below."
                    : "We couldn't fully analyze your policy. Please verify details manually."
                  }
                </p>
              </div>
              {!policyVerified && onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  className="w-full border-score-green/50 hover:bg-score-green/10 text-score-green h-8"
                >
                  <RefreshCw className="h-3 w-3 mr-2" />
                  Try Again
                </Button>
              )}
            </div>

            {/* Verified insights */}
            {policyVerified && extractedPolicy && (
              <div className="space-y-3">
                {/* SA mismatch */}
                {saMismatch && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl bg-score-amber/10 border border-score-amber/20 p-4 flex items-start gap-3"
                  >
                    <AlertTriangle className="h-5 w-5 text-score-amber shrink-0 mt-0.5" />
                    <p className="text-sm text-foreground/80">
                      We detected {formatCurrency(extractedPolicy.extracted_sum_assured!)} cover in your policy. Updated analysis accordingly.
                    </p>
                  </motion.div>
                )}

                {/* Term ends too early */}
                {termEndsTooEarly && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl bg-score-red/10 border border-score-red/20 p-4 flex items-start gap-3"
                  >
                    <AlertTriangle className="h-5 w-5 text-score-red shrink-0 mt-0.5" />
                    <p className="text-sm text-foreground/80">
                      Your coverage ends at age {extractedPolicy.policy_term_end_age} but you plan to retire at {retirementAge}. Income gap risk exists.
                    </p>
                  </motion.div>
                )}

                {/* Missing riders */}
                {missingRiders.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl bg-primary/5 border border-primary/20 p-4 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      <p className="text-sm font-semibold text-foreground">Consider Adding These Riders</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {missingRiders.slice(0, 3).map(r => (
                        <span key={r} className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium">
                          {r}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Insurer info */}
                {extractedPolicy.insurer_name && (
                  <p className="text-xs text-muted-foreground text-center">
                    Insurer: <span className="text-foreground font-medium">{extractedPolicy.insurer_name}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`border border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${isDragging
              ? "border-primary bg-primary/5"
              : "border-border/40 hover:border-primary/40 hover:bg-secondary/20"
              }`}
          >
            <Upload className="mx-auto h-7 w-7 text-muted-foreground mb-2" />
            <p className="text-sm text-foreground/70">Drop your term policy PDF here or click to browse</p>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        )}
      </div>


      {!policyUploaded && (
        <p className="text-xs text-center text-destructive font-medium -mb-2">
          ⚠️ Please upload your term policy PDF to continue.
        </p>
      )}

      <button
        onClick={onContinue}
        disabled={isProcessing || !policyUploaded}
        className={`w-full h-12 rounded-xl font-semibold text-base transition-all flex items-center justify-center gap-2 ${isProcessing || !policyUploaded
          ? "bg-muted text-muted-foreground cursor-not-allowed"
          : "bg-primary text-primary-foreground hover:opacity-90"
          }`}
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Analyzing your policy…
          </>
        ) : (
          "See My Protection Summary →"
        )}
      </button>
    </div>
  );
};

export default TermPolicyUploadStep;
