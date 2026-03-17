import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, CheckCircle2, AlertTriangle, ChevronDown, Loader2,
  Phone, Download, Mail, MessageCircle, Info, XCircle, RefreshCw,
  TrendingUp, ArrowLeft,
} from "lucide-react";
import { useProtectionCheck } from "@/context/ProtectionCheckContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { sendHealthReport, downloadHealthPdf } from "@/services/healthApi";
import HealthProcessingStep from "./HealthProcessingStep";
import AnalysisCheckStep from "./AnalysisCheckStep";

function formatCurrency(val: number): string {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)} Lakh`;
  return `₹${val.toLocaleString("en-IN")}`;
}

// --- Types for comparison data (snake_case from backend) ---
export interface ComparisonRow {
  dimension: string;
  status: "green" | "amber" | "red";
  summary: string;
  your_need: string;
  your_policy: string;
  why_matters: string;
  recommended_action: string;
}

// --- Status badge colors ---
const statusColors = {
  green: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  amber: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  red: "bg-red-500/15 text-red-400 border-red-500/30",
};

const statusIcons = {
  green: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
  amber: <AlertTriangle className="h-4 w-4 text-amber-400" />,
  red: <AlertTriangle className="h-4 w-4 text-red-400" />,
};

// --- Summary Badge ---
const SummaryBadge = ({ label, status }: { label: string; status: "green" | "amber" | "red" }) => (
  <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${statusColors[status]}`}>
    {statusIcons[status]}
    <span>{label}</span>
  </div>
);

// --- Comparison Row ---
const ComparisonRowItem = ({ row, isExpanded, onToggle }: {
  row: ComparisonRow;
  isExpanded: boolean;
  onToggle: () => void;
}) => {
  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-secondary/20 transition-colors"
      >
        {statusIcons[row.status]}
        <span className="flex-1 text-base font-semibold text-foreground">{row.dimension}</span>
        <span className="text-sm text-foreground/70 hidden sm:block max-w-[50%] truncate">{row.summary}</span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: "hidden" }}
          >
            <div className="px-4 pb-4 space-y-3 border-t border-border/30 pt-3">
              <p className="text-base text-foreground/80">{row.summary}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg bg-secondary/30 p-3">
                  <p className="text-xs uppercase tracking-wider text-foreground/60 font-semibold mb-1">Your Need</p>
                  <p className="text-base text-foreground">{row.your_need}</p>
                </div>
                <div className="rounded-lg bg-secondary/30 p-3">
                  <p className="text-xs uppercase tracking-wider text-foreground/60 font-semibold mb-1">Your Policy</p>
                  <p className="text-base text-foreground">{row.your_policy}</p>
                </div>
              </div>
              <div className="rounded-lg bg-primary/5 border border-primary/10 p-3">
                <p className="text-xs uppercase tracking-wider text-foreground/60 font-semibold mb-1">Why This Matters</p>
                <p className="text-base text-foreground/90">{row.why_matters}</p>
              </div>
              <div className={`rounded-lg p-3 border ${statusColors[row.status]}`}>
                <p className="text-xs uppercase tracking-wider font-semibold mb-1">Recommended Action</p>
                <p className="text-base">{row.recommended_action}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Main Report ---
const HealthReportStep = ({ onRetry }: { onRetry: () => void }) => {
  const {
    policyProcessed, preferencesCompleted, extractedPolicy, extractionFailed,
    preferences, mode, computeReport, updateExtractedData, setVerified, isVerified, userName,
  } = useProtectionCheck();

  const [computed, setComputed] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [autoExpandDone, setAutoExpandDone] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [showEmailTab, setShowEmailTab] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  // Fire the backend API call when both policy and preferences are ready
  useEffect(() => {
    if (preferencesCompleted && !computed) {
      computeReport();
      setComputed(true);
    }
  }, [preferencesCompleted, computed, computeReport]);

  // Loading state
  if (mode !== "report_ready") {
    return (
      <div className="max-w-lg mx-auto">
        <HealthProcessingStep onComplete={() => { }} />
      </div>
    );
  }

  // Error state — no mock fallback (RULEBOOK Rule #15)
  if (extractionFailed || !extractedPolicy) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-6">
        <XCircle className="h-12 w-12 text-red-400" />
        <div className="text-center space-y-2">
          <h2 className="text-lg font-bold text-foreground">Analysis Failed</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            We couldn't analyze your policy document. This can happen with image-only PDFs or low-quality scans.
          </p>
        </div>
        <Button
          onClick={onRetry}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  // Verification Step (Analysis Check)
  if (!isVerified) {
    return (
      <div className="max-w-lg mx-auto">
        <AnalysisCheckStep
          title="Analysis Check"
          description="We've extracted these details from your policy. Please verify they are correct."
          fields={[
            { label: "Insurer Name", name: "insurer_name", value: extractedPolicy.insurer_name, type: "text" },
            { label: "Plan Name", name: "plan_name", value: extractedPolicy.plan_name, type: "text" },
            { label: "Sum Insured", name: "sum_insured", value: extractedPolicy.sum_insured, type: "number" },
          ]}
          onConfirm={(data) => {
            updateExtractedData(data);
            setVerified(true);
          }}
          onBack={onRetry}
        />
      </div>
    );
  }

  // --- Build comparison rows from backend + child planning ---
  const comparisonRows: ComparisonRow[] = (extractedPolicy.comparison_rows || [])
    .filter(row => row.dimension !== "Insurer Financial Health (ICR)");

  // Only hardcoded row: Child Planning (RULEBOOK Section 6.2)
  if (preferences.childPlanning === true) {
    comparisonRows.push({
      dimension: "Child Planning",
      status: "amber",
      summary: "Planning a family increases near-term hospitalization probability.",
      your_need: "Maternity coverage and higher floater limits recommended.",
      your_policy: preferences.familyType === "family_floater"
        ? `Family floater covering ${preferences.members} member(s).`
        : "Individual policy.",
      why_matters: "Maternity and newborn care can cost ₹1–5 lakh depending on complications.",
      recommended_action: "Ensure your plan includes maternity benefits or add a maternity rider.",
    });
  }

  // Auto-expand highest severity row on first render
  if (!autoExpandDone && comparisonRows.length > 0) {
    const redIdx = comparisonRows.findIndex(c => c.status === "red");
    const amberIdx = comparisonRows.findIndex(c => c.status === "amber");
    const autoIdx = redIdx >= 0 ? redIdx : amberIdx >= 0 ? amberIdx : -1;
    if (autoIdx >= 0) {
      expandedRows.add(autoIdx);
    }
    setAutoExpandDone(true);
  }

  // Score display
  const score = extractedPolicy.policy_score;
  const scoreLabel = extractedPolicy.score_label;
  const scoreColor = score >= 75 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-red-400";
  const ringColor = score >= 75 ? "border-emerald-400" : score >= 50 ? "border-amber-400" : "border-red-400";

  const handleDownloadPdf = async () => {
    if (!extractedPolicy) return;
    setPdfLoading(true);
    try {
      await downloadHealthPdf({
        customer_name: userName || "",
        insurer_name: extractedPolicy.insurer_name || "",
        plan_name: extractedPolicy.plan_name || "",
        policy_number: extractedPolicy.policy_number || "",
        sum_insured: extractedPolicy.sum_insured || 0,
        premium: extractedPolicy.premium || 0,
        policy_tenure: extractedPolicy.policy_tenure || "",
        is_family_floater: extractedPolicy.is_family_floater || false,
        members_covered: extractedPolicy.members_covered || 1,
        room_rent_limit: extractedPolicy.room_rent_limit || "",
        copay_percentage: extractedPolicy.copay_percentage || 0,
        deductible: extractedPolicy.deductible || 0,
        sub_limits: extractedPolicy.sub_limits || [],
        waiting_periods: (extractedPolicy.waiting_periods as any) || { initial_days: 0, ped_months: 0, specific_months: 0 },
        restoration_present: extractedPolicy.restoration_present || false,
        restoration_type: extractedPolicy.restoration_type || "",
        ncb_percentage: extractedPolicy.ncb_percentage || 0,
        ncb_max_percentage: extractedPolicy.ncb_max_percentage || 0,
        zone_of_cover: extractedPolicy.zone_of_cover || "",
        has_zonal_copay: extractedPolicy.has_zonal_copay || false,
        global_health_coverage: extractedPolicy.global_health_coverage || false,
        score: score || 0,
        ideal_cover: extractedPolicy.ideal_cover || 0,
        comparison_rows: comparisonRows || [],
        recommendations: extractedPolicy.recommendations || [],
      });
      toast.success("PDF downloaded successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF");
    } finally {
      setPdfLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!extractedPolicy) return;
    if (!shareEmail) { toast.error("Please enter an email address"); return; }

    setEmailLoading(true);
    try {
      await sendHealthReport({
        to_email: shareEmail,
        customer_name: userName || "",
        insurer_name: extractedPolicy.insurer_name || "",
        plan_name: extractedPolicy.plan_name || "",
        policy_number: extractedPolicy.policy_number || "",
        sum_insured: extractedPolicy.sum_insured || 0,
        premium: extractedPolicy.premium || 0,
        policy_tenure: extractedPolicy.policy_tenure || "",
        is_family_floater: extractedPolicy.is_family_floater || false,
        members_covered: extractedPolicy.members_covered || 1,
        room_rent_limit: extractedPolicy.room_rent_limit || "",
        copay_percentage: extractedPolicy.copay_percentage || 0,
        deductible: extractedPolicy.deductible || 0,
        sub_limits: extractedPolicy.sub_limits || [],
        waiting_periods: (extractedPolicy.waiting_periods as any) || { initial_days: 0, ped_months: 0, specific_months: 0 },
        restoration_present: extractedPolicy.restoration_present || false,
        restoration_type: extractedPolicy.restoration_type || "",
        ncb_percentage: extractedPolicy.ncb_percentage || 0,
        ncb_max_percentage: extractedPolicy.ncb_max_percentage || 0,
        zone_of_cover: extractedPolicy.zone_of_cover || "",
        has_zonal_copay: extractedPolicy.has_zonal_copay || false,
        global_health_coverage: extractedPolicy.global_health_coverage || false,
        score: score || 0,
        ideal_cover: extractedPolicy.ideal_cover || 0,
        comparison_rows: comparisonRows || [],
        recommendations: extractedPolicy.recommendations || [],
      });
      toast.success("Report sent to " + shareEmail);
      setShowEmailTab(false);
      setShareEmail("");
    } catch (err) {
      console.error(err);
      toast.error("Failed to send email");
    } finally {
      setEmailLoading(false);
    }
  };


  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <Shield className="h-12 w-12 text-primary mx-auto mb-3" />
        <h2 className="text-3xl font-bold text-foreground">Your Protection Report</h2>
        <p className="text-sm text-muted-foreground mt-1">
          A clear comparison between your needs and your current policy.
        </p>
      </motion.div>

      {/* Policy Score Ring — dynamic SVG ring */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.05 }}
        className="text-center space-y-2"
      >
        <div className="relative inline-flex items-center justify-center h-24 w-24 mx-auto">
          {/* SVG Progress Ring */}
          <svg className="h-24 w-24 -rotate-90 transform">
            <circle
              cx="48"
              cy="48"
              r="44"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-border/30"
            />
            <motion.circle
              cx="48"
              cy="48"
              r="44"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={2 * Math.PI * 44}
              initial={{ strokeDashoffset: 2 * Math.PI * 44 }}
              animate={{ strokeDashoffset: (2 * Math.PI * 44) * (1 - score / 100) }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
              className={scoreColor}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="flex items-baseline">
              <span className={`text-3xl font-extrabold ${scoreColor}`}>{score}</span>
              <span className="text-sm font-semibold opacity-60 ml-0.5 text-muted-foreground">/100</span>
            </div>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Your Policy Score</p>
        <p className={`text-sm font-semibold ${scoreColor}`}>{scoreLabel}</p>
      </motion.div>

      {/* Policy Snapshot Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-border/50 bg-card p-6 space-y-4 text-center"
      >
        <p className="text-base text-muted-foreground uppercase tracking-wider font-semibold">Policy Snapshot</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-4">
          <div className="flex justify-between items-baseline border-b border-border/30 pb-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider shrink-0">Insurer</p>
            <p className="text-base font-semibold text-foreground text-right ml-2">{extractedPolicy.insurer_name || "—"}</p>
          </div>
          <div className="flex justify-between items-baseline border-b border-border/30 pb-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider shrink-0">Plan</p>
            <p className="text-base font-semibold text-foreground text-right ml-2">{extractedPolicy.plan_name || "—"}</p>
          </div>
          <div className="flex justify-between items-baseline border-b border-border/30 pb-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider shrink-0">Sum Insured</p>
            <p className="text-base font-semibold text-foreground text-right ml-2">
              {extractedPolicy.sum_insured ? formatCurrency(extractedPolicy.sum_insured) : "—"}
            </p>
          </div>
          <div className="flex justify-between items-baseline border-b border-border/30 pb-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider shrink-0">Ideal Cover</p>
            <p className="text-base font-semibold text-primary text-right ml-2">
              {extractedPolicy.ideal_cover ? formatCurrency(extractedPolicy.ideal_cover) : "—"}
            </p>
          </div>
          <div className="flex justify-between items-baseline border-b border-border/30 pb-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider shrink-0">Premium</p>
            <p className="text-base font-semibold text-foreground text-right ml-2">
              {extractedPolicy.premium ? formatCurrency(extractedPolicy.premium) : "—"}
            </p>
          </div>
          {extractedPolicy.policy_number && (
            <div className="flex justify-between items-baseline border-b border-border/30 pb-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider shrink-0">Policy #</p>
              <p className="text-base font-semibold text-foreground text-right ml-2">{extractedPolicy.policy_number}</p>
            </div>
          )}
          {extractedPolicy.policy_tenure && (
            <div className="flex justify-between items-baseline border-b border-border/30 pb-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider shrink-0">Tenure</p>
              <p className="text-base font-semibold text-foreground text-right ml-2">{extractedPolicy.policy_tenure}</p>
            </div>
          )}
        </div>
      </motion.div>


      {/* All-green message */}
      {comparisonRows.length > 0 && comparisonRows.every(c => c.status === "green") && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 flex items-start gap-3"
        >
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-sm text-foreground/80">Your policy structure appears strong for your profile.</p>
        </motion.div>
      )}

      {/* Comparison Matrix */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="space-y-2"
      >
        <h3 className="text-lg font-semibold text-foreground uppercase tracking-wide mb-3">Protection Comparison</h3>
        {comparisonRows.map((row, i) => (
          <ComparisonRowItem
            key={row.dimension}
            row={row}
            isExpanded={expandedRows.has(i)}
            onToggle={() => setExpandedRows(prev => {
              const next = new Set(prev);
              if (next.has(i)) next.delete(i);
              else next.add(i);
              return next;
            })}
          />
        ))}
      </motion.div>

      {/* Recommendations */}
      {extractedPolicy.recommendations && extractedPolicy.recommendations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="space-y-3"
        >
          <h3 className="text-lg font-semibold text-foreground uppercase tracking-wide">Recommended Next Steps</h3>
          {extractedPolicy.recommendations.map((rec, i) => (
            <div
              key={i}
              className="rounded-xl border border-border/50 bg-card p-4 flex items-start gap-3"
            >
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">{rec.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{rec.description}</p>
              </div>
            </div>
          ))}
        </motion.div>
      )}


      {/* Primary CTA */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="flex gap-3"
      >
        <Button className="flex-1 h-12 text-base font-semibold gap-2">
          <Phone className="h-4 w-4" />
          Talk to Advisor
        </Button>
        <Button className="flex-1 h-12 text-base font-semibold gap-2">
          <Shield className="h-4 w-4" />
          Explore Better Policy Options
        </Button>
      </motion.div>

      {/* Share */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
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
          <Button
            variant="outline"
            className="flex-1 h-11 gap-1.5"
            onClick={() => {
              const msg = encodeURIComponent("Check out my Health Insurance Protection Report!");
              window.open(`https://wa.me/?text=${msg}`, "_blank");
            }}
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </Button>
          <Button
            variant="outline"
            className="flex-1 h-11 gap-1.5 border-sky-500 text-sky-600 hover:bg-sky-500 hover:text-white"
            onClick={handleDownloadPdf}
            disabled={pdfLoading}
          >
            {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} PDF
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
                {emailLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                {emailLoading ? "Sending…" : "Send Report via Email"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default HealthReportStep;
