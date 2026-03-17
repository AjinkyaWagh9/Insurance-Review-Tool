import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Shield, TrendingUp, SlidersHorizontal, ArrowLeft } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";

import { useMotorProtection } from "@/context/MotorProtectionCheckContext";

interface Props {
  onContinue: () => void;
}

function formatCurrency(val: number): string {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)} Lakh`;
  return `₹${val.toLocaleString("en-IN")}`;
}

const MotorGapRevealStep = ({ onContinue }: Props) => {
  const {
    idealIdv, currentIdv, idvGap, marketValue, engagementScore, addEngagement, adjustIdv,
  } = useMotorProtection();

  const [showReassurance, setShowReassurance] = useState(false);
  const [showIdvSlider, setShowIdvSlider] = useState(false);
  const [sliderValue, setSliderValue] = useState(currentIdv || idealIdv);
  const timerFired = useRef(false);
  const sliderMin = 100000;
  const sliderMax = 5000000;

  const coveragePercent = idealIdv > 0 ? Math.min(100, Math.round((currentIdv / idealIdv) * 100)) : 0;
  const hasGap = idvGap > 0;

  // Risk level
  const riskLevel = coveragePercent >= 80 ? "Low" : coveragePercent >= 50 ? "Moderate" : "High";
  const riskColor = coveragePercent >= 80 ? "text-score-green" : coveragePercent >= 50 ? "text-score-amber" : "text-score-red";

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
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}>
          {hasGap ? (
            <AlertTriangle className="h-12 w-12 text-score-amber mx-auto mb-3" />
          ) : (
            <Shield className="h-12 w-12 text-score-green mx-auto mb-3" />
          )}
        </motion.div>
        <h2 className="text-xl font-bold text-foreground">
          {hasGap ? "Your vehicle is under-insured" : "Your IDV looks solid!"}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Based on market value and depreciation
        </p>
      </div>

      {/* IDV Gap visualization */}
      <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-5">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Your IDV</p>
            <p className="text-2xl font-extrabold text-score-amber">{currentIdv > 0 ? formatCurrency(currentIdv) : "Not set"}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Ideal IDV</p>
            <p className="text-2xl font-extrabold text-foreground">{formatCurrency(idealIdv)}</p>
          </div>
        </div>

        <div className="relative">
          <div className="h-4 w-full rounded-full bg-secondary overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${coveragePercent}%` }}
              transition={{ duration: 1.2, delay: 0.3 }}
              className={`h-full rounded-full ${coveragePercent >= 80 ? "bg-score-green" : coveragePercent >= 50 ? "bg-score-amber" : "bg-score-red"
                }`}
            />
          </div>
          <div className="flex justify-between mt-1">
            <p className="text-xs text-muted-foreground">{coveragePercent}% covered</p>
            <p className={`text-xs font-semibold ${riskColor}`}>{riskLevel} Risk</p>
          </div>
        </div>

        {hasGap && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="rounded-xl bg-score-red/10 border border-score-red/20 p-4 text-center"
          >
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">IDV Gap</p>
            <p className="text-3xl font-extrabold text-score-red">{formatCurrency(idvGap)}</p>
            <p className="text-xs text-muted-foreground mt-1">You'll receive less than market value in a total loss</p>
          </motion.div>
        )}

        <div className="text-center pt-1">
          <p className="text-xs text-muted-foreground">On Road Price: <span className="font-semibold text-foreground">{formatCurrency(marketValue)}</span></p>
        </div>
      </div>

      {/* Manual IDV Slider */}
      <div className="rounded-xl border border-border/30 bg-card/50 p-4 space-y-3">
        <button
          onClick={() => { setShowIdvSlider(!showIdvSlider); addEngagement(5); }}
          className="flex items-center gap-2 text-sm font-medium text-primary hover:opacity-80 transition-opacity w-full"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {showIdvSlider ? "Hide IDV Adjuster" : "Set your current IDV manually"}
        </button>
        {showIdvSlider && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="space-y-3"
          >
            <div className="flex items-center justify-end gap-1.5 mb-1">
              <span className="text-sm font-medium text-muted-foreground">₹</span>
              <Input
                type="text"
                inputMode="numeric"
                value={sliderValue === 0 ? "" : String(sliderValue)}
                onChange={(e) => {
                  const val = parseInt(e.target.value.replace(/\D/g, "")) || 0;
                  const clamped = Math.max(sliderMin, Math.min(val, sliderMax));
                  setSliderValue(clamped);
                }}
                onBlur={() => {
                  const snapped = Math.round(sliderValue / 10000) * 10000;
                  const clamped = Math.max(sliderMin, Math.min(snapped, sliderMax));
                  setSliderValue(clamped);
                  adjustIdv(clamped);
                  addEngagement(5);
                }}
                className="w-28 h-8 text-sm bg-secondary/50 border-border/50 text-right tabular-nums"
                placeholder="0"
              />
            </div>
            <Slider
              value={[sliderValue]}
              onValueChange={([val]) => {
                setSliderValue(val);
              }}
              onValueCommit={([val]) => {
                adjustIdv(val);
                addEngagement(5);
              }}
              min={sliderMin}
              max={sliderMax}
              step={10000}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>₹1 Lakh</span>
              <span className="font-semibold text-foreground">{formatCurrency(sliderValue)}</span>
              <span>₹50 Lakh</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Reassurance */}
      {showReassurance && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="rounded-xl bg-primary/5 border border-primary/20 p-4 flex items-center gap-3"
        >
          <TrendingUp className="h-5 w-5 text-primary shrink-0" />
          <p className="text-sm text-foreground/80">
            {hasGap
              ? "Under-insuring your vehicle can lead to major out-of-pocket expenses in an accident."
              : "Your IDV is well-aligned with your vehicle's market value. Great job!"}
          </p>
        </motion.div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onContinue}
          className="w-full h-12 rounded-xl font-semibold text-base bg-primary text-primary-foreground hover:opacity-90 transition-all"
        >
          See How to Strengthen Protection →
        </button>
      </div>
    </div>
  );
};

export default MotorGapRevealStep;
