import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Shield, TrendingUp } from "lucide-react";
import { useTermProtection } from "@/context/TermProtectionCheckContext";
import { getScoreMeta } from "@/utils/scoreMeta";

interface Props {
  onContinue: () => void;
}

function formatCurrency(val: number | undefined | null): string {
  if (val === undefined || val === null || isNaN(val)) return "₹0";
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)} Lakh`;
  return `₹${val.toLocaleString("en-IN")}`;
}

const TermGapRevealStep = ({ onContinue }: Props) => {
  const {
    activeIdeal, existingSumAssured, activeShortfall,
    engagementScore, addEngagement,
  } = useTermProtection();

  const [showReassurance, setShowReassurance] = useState(false);
  const timerFired = useRef(false);

  const coveragePercent = activeIdeal > 0
    ? Math.min(100, Math.round((existingSumAssured / activeIdeal) * 100))
    : 0;

  const { color: scoreColor } = getScoreMeta(coveragePercent);
  const hasShortfall = activeShortfall > 0;

  // Engagement timer: 45 seconds on screen
  useEffect(() => {
    if (timerFired.current) return;
    const timer = setTimeout(() => {
      addEngagement(10);
      timerFired.current = true;
    }, 45000);
    return () => clearTimeout(timer);
  }, [addEngagement]);

  useEffect(() => {
    if (engagementScore >= 10) setShowReassurance(true);
  }, [engagementScore]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {hasShortfall ? (
            <AlertTriangle className={`h-12 w-12 text-${scoreColor} mx-auto mb-3`} />
          ) : (
            <Shield className="h-12 w-12 text-score-green mx-auto mb-3" />
          )}
        </motion.div>
        <h2 className="text-xl font-bold text-foreground">
          {hasShortfall ? "Your family has a protection gap" : "Your coverage appears adequate"}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {hasShortfall
            ? "Based on your income and dependents, here's what we estimate."
            : "Your coverage appears adequate based on income alone."
          }
        </p>
      </div>

      {/* Gap visualization */}
      <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-5">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Your Cover</p>
            <p className={`text-2xl font-extrabold text-${scoreColor}`}>{formatCurrency(existingSumAssured)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Ideal Cover</p>
            <p className="text-2xl font-extrabold text-foreground">{formatCurrency(activeIdeal)}</p>
          </div>
        </div>

        <div className="relative">
          <div className="h-4 w-full rounded-full bg-secondary overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${coveragePercent}%` }}
              transition={{ duration: 1.2, delay: 0.3 }}
              className={`h-full rounded-full bg-${scoreColor}`}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1 text-right">{coveragePercent}% covered</p>
        </div>

        {hasShortfall && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className={`rounded-xl bg-${scoreColor}/10 border border-${scoreColor}/20 p-4 text-center`}
          >
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Coverage Shortfall</p>
            <p className={`text-3xl font-extrabold text-${scoreColor}`}>{formatCurrency(activeShortfall)}</p>
            <p className="text-xs text-muted-foreground mt-1">Your family may face this income gap</p>
          </motion.div>
        )}
      </div>

      {/* Reassurance banner */}
      {showReassurance && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="rounded-xl bg-primary/5 border border-primary/20 p-4 flex items-center gap-3"
        >
          <TrendingUp className="h-5 w-5 text-primary shrink-0" />
          <p className="text-sm text-foreground/80">
            {hasShortfall
              ? "Many families upgrade after seeing this gap. You're making a smart move."
              : "Great news — your coverage looks solid. Let's refine it further."
            }
          </p>
        </motion.div>
      )}

      <button
        onClick={onContinue}
        className="w-full h-12 rounded-xl font-semibold text-base bg-primary text-primary-foreground hover:opacity-90 transition-all"
      >
        {hasShortfall ? "Refine My Protection Analysis →" : "Let's Refine Further →"}
      </button>
    </div>
  );
};

export default TermGapRevealStep;
