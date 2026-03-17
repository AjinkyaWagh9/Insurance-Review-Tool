import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Phone, Download, AlertTriangle, CheckCircle2,
  TrendingUp, Mail, MessageCircle, Heart, Clock, Users, Loader2
} from "lucide-react";
import { computeMissingRiders } from "@/constants/termRiders";
import { useTermProtection } from "@/context/TermProtectionCheckContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { sendTermReport, downloadTermPdf } from "@/services/termApi";
import { getScoreMeta } from "@/utils/scoreMeta";

function formatCurrency(val: number | undefined | null): string {
  if (val === undefined || val === null || isNaN(val)) return "₹0";
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)} Lakh`;
  return `₹${val.toLocaleString("en-IN")}`;
}

const ScoreRing = ({ score }: { score: number }) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  const { color: scoreColorHex, label } = getScoreMeta(score);
  const color = `hsl(var(--${scoreColorHex}))`;
  const textColor = `text-${scoreColorHex}`;

  return (
    <div className="relative inline-flex items-center justify-center mx-auto" style={{ width: 96, height: 96 }}>
      <svg width="96" height="96" viewBox="0 0 100 100" className="-rotate-90 absolute">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={radius} fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.2s ease-out" }}
        />
      </svg>
      <div className={`flex flex-col items-center justify-center relative ${textColor}`}>
        <span className="text-3xl font-extrabold">{score}</span>
        <span className="text-[10px] opacity-70 font-bold -mt-1">/ 100</span>
      </div>
    </div>
  );
};

const TermRecommendationStep = () => {
  const {
    activeIdeal, existingSumAssured, activeShortfall,
    exposureScore, engagementScore, policyScore, mode,
    policyVerified, extractedPolicy, retirementAge, addEngagement,
    idealCoverBreakdown,
    customerName, scoreReasons, coverageStatus, insurerReliabilityScore,
  } = useTermProtection();

  const [shareEmail, setShareEmail] = useState("");
  const [showEmailTab, setShowEmailTab] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const handleSendEmail = async () => {
    if (!shareEmail) {
      toast.error("Please enter an email address");
      return;
    }

    setEmailLoading(true);
    try {
      const result = await sendTermReport({
        to_email: shareEmail,
        customer_name: customerName || "",
        score: policyScore,
        ideal_cover: activeIdeal,
        your_cover: existingSumAssured,
        shortfall: activeShortfall,
        coverage_status: coverageStatus || "",
        mode,
        insurer_name: extractedPolicy?.insurer_name,
        insurer_reliability_score: insurerReliabilityScore,
        policy_term_end_age: extractedPolicy?.policy_term_end_age,
        riders_present: extractedPolicy?.riders_present || [],
        missing_riders: missingRiders,
        score_reasons: scoreReasons || [],
      });

      if (result.success) {
        toast.success(`Report sent to ${shareEmail}`);
        setShareEmail("");
        setShowEmailTab(false);
      } else {
        toast.error(result.error || "Failed to send email. Please try again.");
      }
    } catch (err) {
      toast.error("Network error. Please check your connection.");
    } finally {
      setEmailLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    try {
      await downloadTermPdf({
        customer_name: customerName || "",
        score: policyScore,
        ideal_cover: activeIdeal,
        your_cover: existingSumAssured,
        shortfall: activeShortfall,
        coverage_status: coverageStatus || "",
        mode,
        insurer_name: extractedPolicy?.insurer_name,
        insurer_reliability_score: insurerReliabilityScore,
        policy_term_end_age: extractedPolicy?.policy_term_end_age,
        riders_present: presentRiders,
        missing_riders: missingRiders,
        score_reasons: scoreReasons || [],
      });
      toast.success("PDF downloaded successfully");
    } catch (err) {
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      setPdfLoading(false);
    }
  };

  const coveragePercent = activeIdeal > 0
    ? Math.min(100, Math.round((existingSumAssured / activeIdeal) * 100))
    : 0;

  const { color: scoreColor, label: scoreLabel } = getScoreMeta(policyScore);
  const { color: coverageColor } = getScoreMeta(coveragePercent);

  const isSeriousTone = exposureScore >= 20;

  // CTA logic
  let ctaText = "Optimize Protection";
  if (exposureScore >= 20 && engagementScore >= 25) {
    ctaText = `Bridge ${formatCurrency(activeShortfall)} Gap Now`;
  } else if (exposureScore >= 10 && engagementScore >= 15) {
    ctaText = "Explore Better Policy Options";
  } else if (exposureScore >= 10) {
    ctaText = "See Protection Options";
  }

  if (activeShortfall <= 0) ctaText = "Review My Plan";

  const showReinforcement = engagementScore >= 25 && activeShortfall > 0;

  // Term duration check
  const termEndsTooEarly = policyVerified && extractedPolicy?.policy_term_end_age
    && extractedPolicy.policy_term_end_age < retirementAge;

  // Missing riders
  const missingRiders = computeMissingRiders(extractedPolicy?.riders_present ?? []);
  const presentRiders = extractedPolicy?.riders_present || [];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <Heart className="h-12 w-12 text-primary mx-auto mb-3" />
        <h2 className="text-xl font-bold text-foreground">Your Income Protection Summary</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {isSeriousTone
            ? "Your family's financial safety net has critical gaps."
            : "Here's a complete view of your family's protection status."
          }
        </p>
        {mode === "verified" && (
          <span className="inline-block mt-2 text-[10px] px-2 py-1 rounded-full bg-score-green/10 text-score-green font-semibold uppercase tracking-wide">
            Verified Mode
          </span>
        )}
      </motion.div>

      {/* Policy Score */}
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="text-center space-y-2">
        <>
          <ScoreRing score={policyScore} />
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Your Policy Score</p>
          <p className={`text-sm font-semibold text-${scoreColor}`}>{scoreLabel}</p>
        </>
      </motion.div>

      {/* Panel 1 – Income Protection Gap */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl border border-border/50 bg-card p-5 space-y-4"
      >
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wide flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Income Protection Gap
        </h3>
        <div className="flex justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Your Cover</p>
            <p className={`text-lg font-bold text-${coverageColor}`}>
              {formatCurrency(existingSumAssured)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Ideal Cover</p>
            <p className="text-lg font-bold text-foreground">{formatCurrency(activeIdeal)}</p>
          </div>
        </div>
        <div className="h-3 w-full rounded-full bg-secondary overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${coveragePercent}%` }}
            transition={{ duration: 1, delay: 0.3 }}
            className={`h-full rounded-full bg-${coverageColor}`}
          />
        </div>
        {activeShortfall > 0 ? (
          <div className={`text-center pt-1 rounded-xl bg-${coverageColor}/10 border border-${coverageColor}/20 p-3`}>
            <p className="text-xs text-muted-foreground">Coverage Shortfall</p>
            <p className={`text-2xl font-extrabold text-${coverageColor}`}>{formatCurrency(activeShortfall)}</p>
          </div>
        ) : (
          <div className="text-center pt-1">
            <p className="text-sm text-score-green font-semibold flex items-center justify-center gap-1">
              <CheckCircle2 className="h-4 w-4" /> No shortfall detected
            </p>
          </div>
        )}

        {/* Ideal Cover Breakdown */}
        {mode === "verified" && idealCoverBreakdown && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3 text-center">Breakdown of your {formatCurrency(activeIdeal)} requirement</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-secondary/20 p-2.5">
                <p className="text-[10px] text-muted-foreground truncate">Income Protection</p>
                <p className="text-sm font-bold">{formatCurrency(idealCoverBreakdown.income_protection)}</p>
                <p className="text-[9px] text-muted-foreground italic">({idealCoverBreakdown.multiplier_used}x income)</p>
              </div>
              <div className="rounded-lg bg-secondary/20 p-2.5">
                <p className="text-[10px] text-muted-foreground">Liabilities</p>
                <p className="text-sm font-bold">{formatCurrency(idealCoverBreakdown.loans)}</p>
              </div>
              <div className="rounded-lg bg-secondary/20 p-2.5">
                <p className="text-[10px] text-muted-foreground truncate">Dependent Buffer</p>
                <p className="text-sm font-bold">{formatCurrency(idealCoverBreakdown.dependent_buffer)}</p>
                <p className="text-[9px] text-muted-foreground italic">
                  (₹50L × {Math.round(idealCoverBreakdown.dependent_buffer / 5_000_000)} dependents)
                </p>
              </div>
              <div className="rounded-lg bg-secondary/20 p-2.5">
                <p className="text-[10px] text-muted-foreground">Expense Buffer</p>
                <p className="text-sm font-bold">{formatCurrency(idealCoverBreakdown.expense_buffer)}</p>
              </div>
            </div>
            {idealCoverBreakdown.savings_deducted > 0 && (
              <p className="text-[10px] text-muted-foreground mt-3 text-center">
                Minused {formatCurrency(idealCoverBreakdown.savings_deducted)} existing savings
              </p>
            )}
          </div>
        )}
      </motion.div>

      {/* Panel 2 – Structural Policy Health (verified only) */}
      {mode === "verified" && policyVerified && extractedPolicy && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl border border-border/50 bg-card p-5 space-y-4"
        >
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wide flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Structural Policy Health
          </h3>

          <div className="space-y-3">
            {/* SA Adequacy */}
            <div className="flex items-center justify-between rounded-xl border border-border/30 bg-secondary/20 p-3">
              <span className="text-sm text-foreground">Sum Assured Adequacy</span>
              <span className={`text-sm font-semibold ${coveragePercent >= 80 ? "text-score-green" : "text-score-red"}`}>
                {coveragePercent}%
              </span>
            </div>

            {/* Term Duration */}
            <div className="flex items-center justify-between rounded-xl border border-border/30 bg-secondary/20 p-3">
              <span className="text-sm text-foreground">Term Ends At</span>
              <span className={`text-sm font-semibold ${termEndsTooEarly ? "text-score-red" : "text-score-green"}`}>
                Age {extractedPolicy.policy_term_end_age}
                {termEndsTooEarly && " ⚠️"}
              </span>
            </div>

            {/* Riders */}
            <div className="rounded-xl border border-border/30 bg-secondary/20 p-3 space-y-2">
              <span className="text-sm text-foreground">Riders Present</span>
              <div className="flex flex-wrap gap-1.5">
                {presentRiders.map(r => (
                  <span key={r} className="text-[10px] px-2 py-1 rounded-full bg-score-green/10 text-score-green font-medium">{r}</span>
                ))}
                {presentRiders.length === 0 && (
                  <span className="text-xs text-score-red">No riders found</span>
                )}
              </div>
              {missingRiders.length > 0 && (
                <div className="pt-1">
                  <p className="text-[10px] text-muted-foreground uppercase mb-1">Suggested</p>
                  <div className="flex flex-wrap gap-1.5">
                    {missingRiders.map(r => (
                      <span key={r} className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">{r}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Insurer */}
            {extractedPolicy.insurer_name && (
              <div className="flex items-center justify-between rounded-xl border border-border/30 bg-secondary/20 p-3">
                <span className="text-sm text-foreground">Insurer</span>
                <span className="text-sm font-semibold text-foreground">{extractedPolicy.insurer_name}</span>
              </div>
            )}

            {/* Term duration warning */}
            {termEndsTooEarly && (
              <div className="rounded-xl bg-score-red/10 border border-score-red/20 p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-score-red shrink-0 mt-0.5" />
                <p className="text-xs text-foreground/80">
                  Your coverage ends before retirement at age {retirementAge}. Consider extending your term.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Panel 3 – Recommended Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="space-y-3"
      >
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wide flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Recommended Actions
        </h3>

        {exposureScore >= 20 && (
          <div className="rounded-xl bg-score-red/10 border border-score-red/20 p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-score-red shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">High exposure detected</p>
              <p className="text-xs text-muted-foreground mt-1">
                Significant financial responsibilities and thin safety net. Immediate coverage upgrade recommended.
              </p>
            </div>
          </div>
        )}
        {exposureScore >= 10 && exposureScore < 20 && (
          <div className="rounded-xl bg-score-amber/10 border border-score-amber/20 p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-score-amber shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">Moderate exposure</p>
              <p className="text-xs text-muted-foreground mt-1">
                A few adjustments can significantly strengthen your family's protection.
              </p>
            </div>
          </div>
        )}
        {exposureScore < 10 && (
          <div className="rounded-xl bg-score-green/10 border border-score-green/20 p-4 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-score-green shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">Low exposure</p>
              <p className="text-xs text-muted-foreground mt-1">
                Your financial profile is well-structured. Consider minor enhancements for complete peace of mind.
              </p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Reinforcement text */}
      {showReinforcement && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="rounded-xl bg-primary/5 border border-primary/20 p-4 flex items-center gap-3"
        >
          <TrendingUp className="h-5 w-5 text-primary shrink-0" />
          <p className="text-sm text-foreground font-medium">
            You've identified a {formatCurrency(activeShortfall)} income protection gap. Secure it before it's too late.
          </p>
        </motion.div>
      )}


      {/* CTAs */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="flex flex-col gap-3">
        <Button className="w-full h-12 text-base font-semibold gap-2" onClick={() => addEngagement(5)}>
          <Phone className="h-4 w-4" /> Talk to Advisor
        </Button>
        <Button className="w-full h-12 text-base font-semibold gap-2">
          <Shield className="h-4 w-4" /> Explore Better Policy Options
        </Button>
      </motion.div>

      {/* Share section */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}
        className="rounded-2xl border border-border/50 bg-card p-5 space-y-4"
      >
        <p className="text-sm font-semibold text-foreground">Your Report</p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className={`flex-1 h-11 gap-1.5 transition-colors ${showEmailTab ? "bg-primary/10 border-primary" : ""}`}
            onClick={() => setShowEmailTab(!showEmailTab)}
          >
            <Mail className="h-4 w-4" /> Email
          </Button>
          <Button variant="outline" className="flex-1 h-11 gap-1.5 border-score-green text-score-green hover:bg-score-green/10" onClick={() => {
            const message = encodeURIComponent(`Income Protection Summary! Coverage: ${coveragePercent}% of ideal. ${activeShortfall > 0 ? `Shortfall: ${formatCurrency(activeShortfall)}` : "Fully covered!"}`);
            window.open(`https://wa.me/?text=${message}`, "_blank");
          }}>
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </Button>
          <Button
            variant="outline"
            className="flex-1 h-11 gap-1.5 border-score-red text-score-red hover:bg-score-red/10"
            onClick={handleDownloadPdf}
            disabled={pdfLoading}
          >
            {pdfLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {pdfLoading ? "Generating..." : "PDF"}
          </Button>
        </div>

        <AnimatePresence>
          {showEmailTab && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden space-y-3"
            >
              <Input
                type="email"
                placeholder="Enter email address"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                className="h-11"
              />
              <Button
                className="w-full h-10 gap-2"
                onClick={handleSendEmail}
                disabled={emailLoading}
              >
                {emailLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {emailLoading ? "Sending Report..." : "Send Report via Email"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default TermRecommendationStep;
