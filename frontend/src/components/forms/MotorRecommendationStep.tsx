import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Phone, Download, AlertTriangle, CheckCircle2,
  TrendingUp, Mail, MessageCircle, Car, Zap, Umbrella, RotateCcw,
  Wrench, LifeBuoy, CircleDot, ArrowLeft,
} from "lucide-react";
import { useMotorProtection } from "@/context/MotorProtectionCheckContext";
import { useProtectionCheck } from "@/context/ProtectionCheckContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { sendMotorReport, downloadMotorPdf, MotorReportPayload } from "@/services/motorApi";
import { Loader2, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

function formatCurrency(val: number): string {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)} Lakh`;
  return `₹${val.toLocaleString("en-IN")}`;
}

const addonDetails: Record<string, { icon: React.ReactNode; desc: string }> = {
  "Zero Dep": { icon: <Shield className="h-4 w-4" />, desc: "Full claim without depreciation deduction" },
  "Engine Protect": { icon: <Zap className="h-4 w-4" />, desc: "Covers engine damage from waterlogging" },
  "RTI": { icon: <RotateCcw className="h-4 w-4" />, desc: "Return to Invoice value in total loss" },
  "NCB Protect": { icon: <Umbrella className="h-4 w-4" />, desc: "Retain No Claim Bonus after a claim" },
  "Tyre Protect": { icon: <CircleDot className="h-4 w-4" />, desc: "Covers repair/replacement of tyres" },
  "Consumables": { icon: <Wrench className="h-4 w-4" />, desc: "Covers oil, nuts, bolts, and other consumables" },
  "Roadside Assist": { icon: <LifeBuoy className="h-4 w-4" />, desc: "Emergency breakdown assistance 24/7" },
};

const MotorRecommendationStep = () => {
  const {
    idealIdv, currentIdv, idvGap, exposureScore, engagementScore,
    policyScore, recommendedAddons, extractedPolicy: ctxExtracted, addEngagement,
  } = useMotorProtection();

  const { userName } = useProtectionCheck();

  const [shareEmail, setShareEmail] = useState("");
  const [showEmailTab, setShowEmailTab] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const extractedPolicy = ctxExtracted as any;

  const coveragePercent = idealIdv > 0 ? Math.min(100, Math.round((currentIdv / idealIdv) * 100)) : 0;
  const isSeriousTone = exposureScore >= 20;

  // Protection score: composite
  const protectionScore = Math.round(
    (coveragePercent * 0.4) + ((100 - Math.min(100, exposureScore * 3)) * 0.3) + (policyScore * 0.3)
  );

  const showReinforcement = engagementScore >= 30 && Math.abs(idvGap) > (idealIdv * 0.05);
  const isOverInsured = idvGap < -(idealIdv * 0.05);
  const isUnderInsured = idvGap > (idealIdv * 0.05);

  // CTA logic
  let ctaText = "Explore better options";
  if (exposureScore >= 20 && engagementScore >= 30) ctaText = "Explore Better Policy Options";
  else if (exposureScore >= 10 && engagementScore >= 15) ctaText = "Explore Better Policy Options";
  else if (exposureScore >= 10) ctaText = "Explore Better Policy Options";

  // All possible add-ons
  const allAddons = ["Zero Dep", "Engine Protect", "RTI", "NCB Protect", "Tyre Protect", "Consumables", "Roadside Assist"];
  const missingAddons = allAddons.filter(a => !extractedPolicy || !extractedPolicy[a.toLowerCase().replace(/ /g, "_")]);

  // Payload builder for reports
  const buildMotorPayload = (): MotorReportPayload => ({
    customer_name: userName || "Valued Customer",
    score: protectionScore,
    score_reasons: [
      ...(isUnderInsured ? [`Significant Under-insurance of ${formatCurrency(Math.abs(idvGap))} detected`] : []),
      ...(isOverInsured ? [`Vehicle Over-insured by ${formatCurrency(Math.abs(idvGap))}`] : []),
      ...(exposureScore >= 20 ? ["High financial exposure detected"] : []),
      ...missingAddons.map(a => `${a} add-on is currently missing`)
    ],
    insurer_name: extractedPolicy?.insurer_name || "Unknown",
    policy_type: extractedPolicy?.policy_type || "Comprehensive",
    vehicle_make: extractedPolicy?.vehicle_make || "Vehicle",
    vehicle_model: extractedPolicy?.vehicle_model || "",
    vehicle_variant: extractedPolicy?.vehicle_variant || "",
    vehicle_reg_year: extractedPolicy?.vehicle_reg_year || new Date().getFullYear(),
    vehicle_age_years: (extractedPolicy as any)?.vehicle_age_years || 0,
    vehicle_type: extractedPolicy?.vehicle_type || "Private Car",
    policy_idv: currentIdv,
    ideal_idv: idealIdv,
    ncb_percentage: extractedPolicy?.ncb_percentage || 0,
    deductible: extractedPolicy?.deductible || 0,
    add_ons: {
      zero_dep: !!extractedPolicy?.zero_dep,
      engine_protect: !!extractedPolicy?.engine_protect,
      rti: !!extractedPolicy?.rti,
      ncb_protect: !!extractedPolicy?.ncb_protect,
      consumables: !!extractedPolicy?.consumables,
      tyre_protect: !!extractedPolicy?.tyre_protect,
      roadside_assist: !!extractedPolicy?.roadside_assist,
    },
  });

  const handleSendEmail = async () => {
    if (!shareEmail) {
      toast.error("Please enter a valid email address");
      return;
    }
    setEmailLoading(true);
    try {
      const result = await sendMotorReport(shareEmail, buildMotorPayload());
      if (result.success) {
        toast.success(`Audit report sent to ${shareEmail}`);
        setShareEmail("");
        setShowEmailTab(false);
        addEngagement(10);
      } else {
        toast.error(result.error || "Failed to send email");
      }
    } catch (err) {
      console.error("Email send failed:", err);
      toast.error("An error occurred while sending the email");
    } finally {
      setEmailLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    try {
      await downloadMotorPdf(buildMotorPayload());
      toast.success("Audit report PDF downloaded");
      addEngagement(5);
    } catch (err) {
      console.error("PDF download failed:", err);
      toast.error("Failed to generate PDF report");
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <Car className="h-12 w-12 text-primary mx-auto mb-3" />
        <h2 className="text-3xl font-bold text-foreground">Your Motor Protection Summary</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {isSeriousTone
            ? "Your vehicle coverage has significant gaps that need immediate attention."
            : "Here's a complete view of your motor protection status."
          }
        </p>
      </motion.div>

      {/* Policy Score */}
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="text-center space-y-2">
        {(() => {
          const score = protectionScore;
          const color = score >= 70 ? "text-emerald-400" : score >= 40 ? "text-amber-400" : "text-red-400";
          const label = score >= 70 ? "Strong" : score >= 40 ? "Needs Attention" : "Critical Gaps";
          return (
            <>
              <div className="relative inline-flex items-center justify-center h-24 w-24 mx-auto">
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
                    className={color}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="flex items-baseline">
                    <span className={`text-3xl font-extrabold ${color}`}>{score}</span>
                    <span className="text-sm font-semibold opacity-60 ml-0.5 text-muted-foreground">/100</span>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Your Policy Score</p>
              <p className={`text-sm font-semibold ${color}`}>{label}</p>
            </>
          );
        })()}
      </motion.div>

      {/* Score cards */}
      <div className="grid grid-cols-2 gap-2">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
          className="rounded-xl border border-border/50 bg-card p-3 text-center"
        >
          <div className="flex items-center justify-center gap-1 mb-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Exposure</p>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[200px] text-xs text-center">
                Your Exposure Score reflects how protected you are against unexpected repair costs. Lower scores indicate higher out-of-pocket expenses in case of an accident.
              </TooltipContent>
            </Tooltip>
          </div>
          <p className={`text-2xl font-extrabold ${exposureScore >= 20 ? "text-score-red" : exposureScore >= 10 ? "text-score-amber" : "text-score-green"}`}>
            {exposureScore}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {exposureScore >= 20 ? "High" : exposureScore >= 10 ? "Moderate" : "Low"}
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}
          className="rounded-xl border border-border/50 bg-card p-3 text-center"
        >
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">IDV Match</p>
          <p className={`text-2xl font-extrabold ${coveragePercent >= 80 ? "text-score-green" : coveragePercent >= 50 ? "text-score-amber" : "text-score-red"}`}>
            {coveragePercent}%
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">of ideal</p>
        </motion.div>
      </div>

      {/* Financial Exposure */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="space-y-3">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Financial Exposure</h3>
        {exposureScore >= 20 && (
          <div className="rounded-xl bg-score-red/10 border border-score-red/20 p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-score-red shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">High exposure detected</p>
              <p className="text-xs text-muted-foreground mt-1">
                Daily usage, open parking, and financial strain make comprehensive coverage essential.
              </p>
            </div>
          </div>
        )}
        {exposureScore >= 10 && exposureScore < 20 && (
          <div className="rounded-xl bg-score-amber/10 border border-score-amber/20 p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-score-amber shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">Moderate exposure</p>
              <p className="text-xs text-muted-foreground mt-1">A few add-ons can significantly reduce your risk.</p>
            </div>
          </div>
        )}
        {exposureScore < 10 && (
          <div className="rounded-xl bg-score-green/10 border border-score-green/20 p-4 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-score-green shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">Low exposure</p>
              <p className="text-xs text-muted-foreground mt-1">Your usage pattern keeps risk manageable.</p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Policy Structure */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
        className="rounded-2xl border border-border/50 bg-card p-5 space-y-4"
      >
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Policy Structure</h3>
        <div className="flex justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Your IDV</p>
            <p className="text-lg font-bold text-score-amber">{currentIdv > 0 ? formatCurrency(currentIdv) : "—"}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Ideal IDV</p>
            <p className="text-lg font-bold text-foreground">{formatCurrency(idealIdv)}</p>
          </div>
        </div>
        <div className="h-3 w-full rounded-full bg-secondary overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${coveragePercent}%` }}
            transition={{ duration: 1, delay: 0.6 }}
            className={`h-full rounded-full ${coveragePercent >= 80 ? "bg-score-green" : coveragePercent >= 50 ? "bg-score-amber" : "bg-score-red"}`}
          />
        </div>
        {idvGap > 0 && (
          <div className="text-center pt-1">
            <p className="text-xs text-muted-foreground">IDV Gap</p>
            <p className="text-2xl font-extrabold text-score-red">{formatCurrency(idvGap)}</p>
          </div>
        )}
        <div className="pt-2 border-t border-border/30 flex justify-between items-center">
          <p className="text-xs text-muted-foreground">Voluntary Deductible</p>
          <p className="text-sm font-semibold text-foreground">
            {extractedPolicy?.deductible ? formatCurrency(extractedPolicy.deductible) : "₹0"}
          </p>
        </div>
      </motion.div>

      {/* Add-On Recommendations */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="space-y-3">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Recommended Add-Ons</h3>
        <div className="space-y-2">
          {allAddons.map(addon => {
            const isRecommended = recommendedAddons.includes(addon);
            const hasIt = extractedPolicy && (extractedPolicy as any)[addon.toLowerCase().replace(/ /g, "_")];
            const detail = addonDetails[addon];

            return (
              <div key={addon} className={`rounded-xl border p-4 flex items-center gap-3 transition-colors ${hasIt
                ? "border-score-green/30 bg-score-green/5"
                : "border-score-red/30 bg-score-red/5"
                }`}>
                <div className={hasIt ? "text-score-green" : "text-score-red"}>
                  {detail?.icon}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{addon}</p>
                  <p className="text-xs text-muted-foreground">{detail?.desc}</p>
                </div>
                {hasIt ? (
                  <span className="text-xs text-score-green font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Present
                  </span>
                ) : (
                  <span className="text-xs text-score-red font-semibold flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Missing
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Reinforcement */}
      {showReinforcement && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
          className="rounded-xl bg-primary/5 border border-primary/20 p-4 flex items-center gap-3"
        >
          <TrendingUp className="h-5 w-5 text-primary shrink-0" />
          <p className="text-sm text-foreground font-medium">
            You've identified a {formatCurrency(idvGap)} IDV gap. Correcting it protects your full investment.
          </p>
        </motion.div>
      )}

      {/* CTAs */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="space-y-3">
        <Button className="w-full h-12 text-base font-semibold gap-2" onClick={() => addEngagement(5)}>
          <Phone className="h-4 w-4" /> Talk to Advisor
        </Button>
        <Button className="w-full h-12 text-base font-semibold gap-2 border-primary" onClick={() => addEngagement(5)}>
          <Shield className="h-4 w-4" /> {ctaText}
        </Button>
      </motion.div>

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
            const message = encodeURIComponent(`Motor Protection Summary! IDV: ${coveragePercent}% of ideal. ${idvGap > 0 ? `Gap: ${formatCurrency(idvGap)}` : "Well covered!"} Exposure: ${exposureScore >= 20 ? "High" : exposureScore >= 10 ? "Moderate" : "Low"}`);
            window.open(`https://wa.me/?text=${message}`, "_blank");
          }}>
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </Button>
          <Button
            variant="outline"
            className="flex-1 h-11 gap-1.5 border-score-red text-score-red hover:bg-score-red hover:text-white"
            onClick={handleDownloadPdf}
            disabled={pdfLoading}
          >
            {pdfLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            PDF
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
                {emailLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                Send Report via Email
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default MotorRecommendationStep;
