import { useState, useEffect, useRef } from "react";
import { TERM_SCORING_CONSTANTS } from "@/constants/termScoringConstants";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, ChevronRight, Shield, Heart, Loader2, ArrowLeft } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { useTermProtection } from "@/context/TermProtectionCheckContext";
import { fetchTermScore, generateAndUploadTermPdf } from "@/services/termApi";
import { getScoreMeta } from "@/utils/scoreMeta";

interface Question {
  id: string;
  question: string;
  options: { label: string; exposureAdd: number; loanAdd?: number }[];
  vulnerabilityThreshold?: number;
  vulnerabilityMessage?: string;
  specialCard?: string;
}

const questions: Question[] = [
  {
    id: "loans",
    question: "Do you have any outstanding loans?",
    options: [
      { label: "None", exposureAdd: 0, loanAdd: 0 },
      { label: "Less than ₹25 Lakh", exposureAdd: 5, loanAdd: 2000000 },
      { label: "₹25L – ₹75L", exposureAdd: 10, loanAdd: 5000000 },
      { label: "More than ₹75 Lakh", exposureAdd: 10, loanAdd: 7500000 },
    ],
  },
  {
    id: "expenses",
    question: "What are your monthly household expenses?",
    options: [
      { label: "Less than ₹30,000", exposureAdd: 0 },
      { label: "₹30,000 – ₹60,000", exposureAdd: 3 },
      { label: "₹60,000 – ₹1 Lakh", exposureAdd: 5 },
      { label: "More than ₹1 Lakh", exposureAdd: 8 },
    ],
  },
  {
    id: "retirement",
    question: "At what age do you plan to retire?",
    options: [
      { label: "55", exposureAdd: 0 },
      { label: "60", exposureAdd: 0 },
      { label: "65", exposureAdd: 3 },
      { label: "Never / 70+", exposureAdd: 5 },
    ],
  },
  {
    id: "emotional",
    question: "If your income stops tomorrow, how many years would your family be secure?",
    options: [
      { label: "Less than 2 years", exposureAdd: 10 },
      { label: "2 – 5 years", exposureAdd: 10 },
      { label: "5 – 10 years", exposureAdd: 5 },
      { label: "More than 10 years", exposureAdd: 0 },
    ],
    vulnerabilityThreshold: 15,
    vulnerabilityMessage: "Your family's financial runway is critically short. Adequate term cover is essential to protect them.",
    specialCard: "This is the most important question. Your family's future depends on how prepared you are today.",
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

const TermStrengtheningStep = ({ onComplete, onRegisterBack }: Props) => {
  const {
    age, annualIncome, dependents, customerName, phone,
    activeIdeal, existingSumAssured, activeShortfall,
    exposureScore, addExposure, addEngagement,
    setLoanAmount, setRetirementAge, setFamilySecureYears, setMonthlyExpenses,
    loanAmount, monthlyExpenses, retirementAge, familySecureYears,
    setPolicyScore, setIdealCoverEstimated, setShortfallEstimated, setScoreReasons,
    setCoverageStatus, setInsurerReliabilityScore, setReportUrl
  } = useTermProtection();
  
  const isMounted = useRef(true);
  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  const [currentQ, setCurrentQ] = useState(0);
  const [answered, setAnswered] = useState<Record<string, string>>({});
  const [showVulnerability, setShowVulnerability] = useState(false);
  const [showSpecialCard, setShowSpecialCard] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sliderRetireAge, setSliderRetireAge] = useState(60);
  const [microCopy, setMicroCopy] = useState<string | null>(null);

  const question = questions[currentQ];
  const isLast = currentQ === questions.length - 1;
  const coveragePercent = activeIdeal > 0
    ? Math.min(100, Math.round((existingSumAssured / activeIdeal) * 100))
    : 0;

  const { color: scoreColor } = getScoreMeta(coveragePercent);

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

  // Reset internal states when question changes
  useEffect(() => {
    setShowVulnerability(false);
  }, [currentQ]);

  const handleFinalScore = async () => {
    setLoading(true);
    let pdfPayload: Parameters<typeof downloadTermPdf>[0] | null = null;
    try {
      const updatedScore = await fetchTermScore({
        customer_name: customerName,
        age,
        income: annualIncome,
        child_count: dependents,
        extracted_sum_assured: existingSumAssured,
        loans: loanAmount,
        monthly_expenses: monthlyExpenses,
        retirement_age: retirementAge,
        family_secure_years: familySecureYears,
        savings: 0,
        detected_riders: [],
        insurer_name: "unknown",
      });
      if (isMounted.current) {
        setPolicyScore(updatedScore.score);
        setIdealCoverEstimated(updatedScore.ideal_cover);
        setShortfallEstimated(Math.max(0, updatedScore.ideal_cover - existingSumAssured));
        setScoreReasons(updatedScore.score_reasons);
        setCoverageStatus(updatedScore.coverage_status || "");
        setInsurerReliabilityScore(updatedScore.insurer_reliability_score || 0);
      }
      pdfPayload = {
        customer_name: customerName,
        phone: phone || "",
        score: updatedScore.score,
        ideal_cover: updatedScore.ideal_cover,
        your_cover: existingSumAssured,
        shortfall: Math.max(0, updatedScore.ideal_cover - existingSumAssured),
        coverage_status: updatedScore.coverage_status || "",
        mode: "estimate",
        insurer_reliability_score: updatedScore.insurer_reliability_score || 0,
        score_reasons: updatedScore.score_reasons,
        riders_present: [],
        missing_riders: [],
      };
    } catch (err) {
      console.error("Final re-score failed, using fallback:", err);
      const { INCOME_MULTIPLIER, DEPENDENT_BUFFER, EXPENSE_YEARS_BUFFER } = TERM_SCORING_CONSTANTS;
      const annualExpenses = monthlyExpenses * 12;
      const fallbackIdeal = Math.max(
        0,
        (annualIncome * INCOME_MULTIPLIER) +
        (loanAmount || 0) +
        (dependents * DEPENDENT_BUFFER) +
        (annualExpenses * EXPENSE_YEARS_BUFFER) -
        0 // savings
      );
      const fallbackScore = fallbackIdeal > 0
        ? Math.min(100, Math.round((existingSumAssured / fallbackIdeal) * 100))
        : 0;
      const fallbackReasons = [
        "API Fallback: Estimate based on 10x income + ₹50L/dependent + 2yr expense buffer."
      ];
      if (isMounted.current) {
        setIdealCoverEstimated(fallbackIdeal);
        setShortfallEstimated(Math.max(0, fallbackIdeal - existingSumAssured));
        setPolicyScore(fallbackScore);
        setScoreReasons(fallbackReasons);
      }
      pdfPayload = {
        customer_name: customerName,
        phone: phone || "",
        score: fallbackScore,
        ideal_cover: fallbackIdeal,
        your_cover: existingSumAssured,
        shortfall: Math.max(0, fallbackIdeal - existingSumAssured),
        coverage_status: "",
        mode: "estimate",
        insurer_reliability_score: 0,
        score_reasons: fallbackReasons,
        riders_present: [],
        missing_riders: [],
      };
    } finally {
      if (isMounted.current) {
        if (pdfPayload) {
          generateAndUploadTermPdf(pdfPayload)
            .then(result => {
              if (result.success && result.url) {
                sessionStorage.setItem("report_url", result.url);
                setReportUrl(result.url, `${pdfPayload!.customer_name}_report.pdf`);
              }
            })
            .catch(err => console.error("Background S3 PDF generation failed:", err));
        }
        setLoading(false);
        onComplete();
      }
    }
  };

  const handleAnswer = (option: { label: string; exposureAdd: number; loanAdd?: number }) => {
    const isNew = !answered[question.id];
    setAnswered(prev => ({ ...prev, [question.id]: option.label }));

    if (isNew) {
      if (option.exposureAdd > 0) addExposure(option.exposureAdd);
      addEngagement(5);

      // Apply specific adjustments
      if (question.id === "loans" && option.loanAdd !== undefined) {
        setLoanAmount(option.loanAdd);
        if (option.loanAdd > 0) {
          setMicroCopy(`Loan liability of ${formatCurrency(option.loanAdd)} added to your ideal cover.`);
          setTimeout(() => setMicroCopy(null), 1000);
        }
      }

      if (question.id === "retirement") {
        const parsed = parseInt(option.label);
        const retAge = isNaN(parsed) ? (option.label === "Never / 70+" ? 70 : 60) : parsed;
        setRetirementAge(retAge);
      }

      if (question.id === "emotional") {
        const yearsMap: Record<string, number> = {
          "Less than 2 years": 1, "2 – 5 years": 3, "5 – 10 years": 7, "More than 10 years": 15,
        };
        setFamilySecureYears(yearsMap[option.label] || 5);
      }

      if (question.id === "expenses") {
        const expenseMap: Record<string, number> = {
          "Less than ₹30,000": 25000,
          "₹30,000 – ₹60,000": 45000,
          "₹60,000 – ₹1 Lakh": 80000,
          "More than ₹1 Lakh": 120000,
        };
        const monthlyExp = expenseMap[option.label] || 0;
        setMonthlyExpenses(monthlyExp);
      }
    }

    const newExposure = exposureScore + (isNew ? option.exposureAdd : 0);
    const hasVulnerability = question.vulnerabilityThreshold && newExposure >= question.vulnerabilityThreshold;

    const advance = () => {
      if (isLast) handleFinalScore();
      else setCurrentQ(prev => prev + 1);
    };

    if (hasVulnerability && isNew) {
      setShowVulnerability(true);
      setTimeout(() => {
        setShowVulnerability(false);
        if (question.specialCard && option.exposureAdd > 0) {
          setShowSpecialCard(question.specialCard);
          setTimeout(() => {
            setShowSpecialCard(null);
            advance();
          }, 400);
        } else {
          advance();
        }
      }, 500);
    } else if (!hasVulnerability && isNew) {
      if (question.specialCard && option.exposureAdd > 0) {
        setShowSpecialCard(question.specialCard);
        setTimeout(() => {
          setShowSpecialCard(null);
          advance();
        }, 400);
      } else {
        setTimeout(advance, 50);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Live gap bar */}
      <div className="rounded-xl border border-border/50 bg-card p-4">
        <div className="flex justify-between text-xs text-muted-foreground mb-2">
          <span>Your Cover: {formatCurrency(existingSumAssured)}</span>
          <span>Ideal Cover: {formatCurrency(activeIdeal)}</span>
        </div>
        <div className="h-3 w-full rounded-full bg-secondary overflow-hidden">
          <motion.div
            animate={{ width: `${coveragePercent}%` }}
            transition={{ duration: 0.5 }}
            className={`h-full rounded-full bg-${scoreColor}`}
          />
        </div>
        {activeShortfall > 0 && (
          <p className={`text-xs text-${scoreColor} font-semibold mt-2 text-right`}>
            Gap: {formatCurrency(activeShortfall)}
          </p>
        )}
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-8 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Refining your protection score...</p>
        </div>
      )}

      {/* Microcopy reinforcement */}
      <AnimatePresence>
        {!loading && microCopy && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-2 text-xs text-primary font-medium text-center"
          >
            {microCopy}
          </motion.div>
        )}
      </AnimatePresence>

      {!loading && (
        <>
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
                <Heart className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-foreground font-medium">{showSpecialCard}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Question card */}
          {!showSpecialCard && (
            <AnimatePresence mode="wait">
              {question.id === "retirement" ? (
                <motion.div
                  key={question.id}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-5"
                >
                  <h3 className="text-lg font-bold text-foreground">{question.question}</h3>
                  <div className="bg-secondary/30 rounded-xl px-5 py-4 space-y-4">
                    <div className="relative h-10">
                      <span
                        className="absolute -translate-x-1/2 top-0 bg-primary text-primary-foreground text-sm font-semibold px-3 py-1 rounded-lg shadow-md whitespace-nowrap transition-[left] duration-150 ease-out after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-[5px] after:border-transparent after:border-t-primary"
                        style={{ left: `${((sliderRetireAge - 30) / (75 - 30)) * 100}%` }}
                      >
                        {sliderRetireAge} yrs
                      </span>
                    </div>
                    <Slider
                      min={30}
                      max={75}
                      step={1}
                      value={[sliderRetireAge]}
                      onValueChange={([v]) => setSliderRetireAge(v)}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>30 yrs</span>
                      <span>75 yrs</span>
                    </div>
                  </div>
                  <Button
                    className="w-full h-12 text-base font-semibold"
                    disabled={loading}
                    onClick={() => {
                      const exposureAdd = sliderRetireAge > 65 ? 5 : sliderRetireAge > 60 ? 3 : 0;
                      handleAnswer({ label: `${sliderRetireAge}`, exposureAdd });
                    }}
                  >
                    {loading && isLast ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" />Refining score...</>
                    ) : (
                      "Continue →"
                    )}
                  </Button>
                </motion.div>
              ) : (
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

                  <AnimatePresence>
                    {answered[question.id] && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <Button
                          className="w-full h-12 text-base font-semibold"
                          disabled={loading}
                          onClick={() => {
                            if (isLast) handleFinalScore();
                            else setCurrentQ(prev => prev + 1);
                          }}
                        >
                          {loading && isLast ? (
                            <><Loader2 className="w-4 h-4 animate-spin mr-2" />Refining score...</>
                          ) : (
                            "Continue →"
                          )}
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          )}

          <div className="flex justify-center items-center w-full px-2 pt-2">
            <p className="text-xs text-muted-foreground text-center">
              Question {currentQ + 1} of {questions.length}
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default TermStrengtheningStep;
