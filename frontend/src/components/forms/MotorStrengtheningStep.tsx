import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, ChevronRight, Shield, ArrowLeft } from "lucide-react";
import { useMotorProtection } from "@/context/MotorProtectionCheckContext";

interface Question {
  id: string;
  question: string;
  options: { label: string; exposureAdd: number; addon?: string }[];
  vulnerabilityThreshold?: number;
  vulnerabilityMessage?: string;
  specialCard?: string;
}

const questions: Question[] = [
  {
    id: "usage",
    question: "How often do you use your car?",
    options: [
      { label: "Daily", exposureAdd: 5 },
      { label: "Weekends only", exposureAdd: 2 },
      { label: "Rarely", exposureAdd: 0 },
    ],
  },
  {
    id: "parking",
    question: "Do you park in open areas overnight?",
    options: [
      { label: "Yes", exposureAdd: 5 },
      { label: "No, covered parking", exposureAdd: 0 },
    ],
    specialCard: "Open parking increases theft and weather damage risk. Consider adding Zero Dep and RTI cover.",
  },
  {
    id: "financed",
    question: "Is your car financed?",
    options: [
      { label: "Yes", exposureAdd: 5, addon: "RTI" },
      { label: "No", exposureAdd: 0 },
    ],
  },
  {
    id: "repair_strain",
    question: "Would a ₹1L repair bill strain your savings?",
    options: [
      { label: "Yes, significantly", exposureAdd: 10, addon: "Zero Dep" },
      { label: "It would be tight", exposureAdd: 5 },
      { label: "No, I can manage", exposureAdd: 0 },
    ],
    vulnerabilityThreshold: 15,
    vulnerabilityMessage: "A single accident could set you back significantly. Comprehensive add-ons are critical for your situation.",
  },
];

function formatCurrency(val: number): string {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)} Lakh`;
  return `₹${val.toLocaleString("en-IN")}`;
}

interface Props {
  onComplete: () => void;
  onRegisterBack: (fn: (() => boolean) | null) => void;
}

const MotorStrengtheningStep = ({ onComplete, onRegisterBack }: Props) => {
  const {
    idealIdv, currentIdv, idvGap, exposureScore, addExposure,
    addEngagement, addRecommendedAddon, recommendedAddons,
  } = useMotorProtection();

  const [currentQ, setCurrentQ] = useState(0);
  const [answered, setAnswered] = useState<Record<string, string>>({});
  const [showVulnerability, setShowVulnerability] = useState(false);
  const [showSpecialCard, setShowSpecialCard] = useState<string | null>(null);

  useEffect(() => {
    const handler = () => {
      if (currentQ > 0) {
        setCurrentQ(prev => prev - 1);
        return true;
      }
      return false;
    };
    onRegisterBack(handler);
    return () => onRegisterBack(null);
  }, [currentQ, onRegisterBack]);

  // Reset internal selection state when question changes
  useEffect(() => {
    setShowVulnerability(false);
    setShowSpecialCard(null);
  }, [currentQ]);

  const question = questions[currentQ];
  const isLast = currentQ === questions.length - 1;
  const coveragePercent = idealIdv > 0 ? Math.min(100, Math.round((currentIdv / idealIdv) * 100)) : 0;

  const handleAnswer = (option: { label: string; exposureAdd: number; addon?: string }) => {
    const isNew = !answered[question.id];
    setAnswered(prev => ({ ...prev, [question.id]: option.label }));

    if (isNew) {
      if (option.exposureAdd > 0) addExposure(option.exposureAdd);
      if (option.addon) addRecommendedAddon(option.addon);
      addEngagement(5);
    }

    const newExposure = exposureScore + (isNew ? option.exposureAdd : 0);
    const hasVulnerability = question.vulnerabilityThreshold && newExposure >= question.vulnerabilityThreshold;

    if (hasVulnerability && isNew) {
      setShowVulnerability(true);
      setTimeout(() => {
        setShowVulnerability(false);
        if (question.specialCard && option.exposureAdd > 0) {
          setShowSpecialCard(question.specialCard);
          setTimeout(() => {
            setShowSpecialCard(null);
            if (isLast) onComplete();
            else setCurrentQ(prev => prev + 1);
          }, 400);
        } else {
          if (isLast) onComplete();
          else setCurrentQ(prev => prev + 1);
        }
      }, 500);
    } else if (!hasVulnerability && isNew) {
      if (question.specialCard && option.exposureAdd > 0) {
        setShowSpecialCard(question.specialCard);
        setTimeout(() => {
          setShowSpecialCard(null);
          if (isLast) onComplete();
          else setCurrentQ(prev => prev + 1);
        }, 400);
      } else {
        setTimeout(() => {
          if (isLast) onComplete();
          else setCurrentQ(prev => prev + 1);
        }, 50);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Live IDV gap bar */}
      <div className="rounded-xl border border-border/50 bg-card p-4">
        <div className="flex justify-between text-xs text-muted-foreground mb-2">
          <span>Your IDV: {currentIdv > 0 ? formatCurrency(currentIdv) : "—"}</span>
          <span>Ideal: {formatCurrency(idealIdv)}</span>
        </div>
        <div className="h-3 w-full rounded-full bg-secondary overflow-hidden">
          <motion.div
            animate={{ width: `${coveragePercent}%` }}
            transition={{ duration: 0.5 }}
            className={`h-full rounded-full ${coveragePercent >= 80 ? "bg-score-green" : coveragePercent >= 50 ? "bg-score-amber" : "bg-score-red"
              }`}
          />
        </div>
        {idvGap > 0 && (
          <p className="text-xs text-score-red font-semibold mt-2 text-right">Gap: {formatCurrency(idvGap)}</p>
        )}

        {recommendedAddons.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {recommendedAddons.map(a => (
              <span key={a} className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">{a}</span>
            ))}
          </div>
        )}
      </div>

      {/* Progress dots */}
      <div className="flex gap-2 justify-center">
        {questions.map((_, i) => (
          <div key={i} className={`h-2 w-2 rounded-full transition-all ${i < currentQ ? "bg-primary" : i === currentQ ? "bg-primary w-6" : "bg-border"
            }`} />
        ))}
      </div>

      {/* Vulnerability banner */}
      <AnimatePresence>
        {showVulnerability && question.vulnerabilityMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-xl bg-score-red/10 border border-score-red/20 p-4 flex items-start gap-3"
          >
            <AlertTriangle className="h-5 w-5 text-score-red shrink-0 mt-0.5" />
            <p className="text-sm text-foreground/80">{question.vulnerabilityMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Special card */}
      <AnimatePresence>
        {showSpecialCard && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="rounded-xl bg-primary/5 border border-primary/20 p-5 flex items-start gap-3"
          >
            <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-foreground font-medium">{showSpecialCard}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Question card */}
      {!showSpecialCard && (
        <AnimatePresence mode="wait">
          <motion.div
            key={question.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <h3 className="text-lg font-bold text-foreground">{question.question}</h3>
            <div className="space-y-3">
              {question.options.map((option) => (
                <button
                  key={option.label}
                  onClick={() => handleAnswer(option)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between group ${answered[question.id] === option.label
                    ? "border-primary bg-primary/5"
                    : "border-border/50 hover:border-primary/30 bg-card"
                    }`}
                >
                  <span className="font-medium text-foreground">{option.label}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {!showSpecialCard && (
        <div className="space-y-4">
          <AnimatePresence>
            {answered[question.id] && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
              >
                <button
                  onClick={() => {
                    if (isLast) onComplete();
                    else setCurrentQ(prev => prev + 1);
                  }}
                  className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2"
                >
                  Continue →
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-xs text-muted-foreground text-center">
            Question {currentQ + 1} of {questions.length}
          </p>
        </div>
      )}
    </div>
  );
};

export default MotorStrengtheningStep;
