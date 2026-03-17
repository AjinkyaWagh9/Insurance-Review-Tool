import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Heart, AlertTriangle, Shield, ArrowLeft } from "lucide-react";
import { useProtectionCheck } from "@/context/ProtectionCheckContext";

interface Question {
  id: string;
  question: string;
  options: { label: string; value: string; exposureAdd?: number }[];
  vulnerabilityThreshold?: number;
  vulnerabilityMessage?: string;
  specialCard?: string;
}

const questions: Question[] = [
  {
    id: "members",
    question: "How many members are you insuring?",
    options: [
      { label: "Just me", value: "1" },
      { label: "Me + Spouse", value: "2", exposureAdd: 2 },
      { label: "Me + Spouse + 1 Child", value: "3", exposureAdd: 3 },
      { label: "Me + Spouse + 2 Children", value: "4", exposureAdd: 5 },
      { label: "Me + Parents", value: "5", exposureAdd: 6 },
      { label: "Parents", value: "6", exposureAdd: 7 },

    ],
    specialCard: "Larger families have higher cumulative hospitalization probability. Ensure your floater limit accounts for all members.",
  },
  {
    id: "roomPreference",
    question: "What's your preferred hospital room type?",
    options: [
      { label: "Private Room", value: "private", exposureAdd: 3 },
      { label: "Shared / General", value: "shared" },
    ],
    specialCard: "Private rooms cost 2–4x more. If your policy has room rent caps, out-of-pocket costs could be significant.",
  },
  {
    id: "childPlanning",
    question: "Are you planning to have children?",
    options: [
      { label: "Yes", value: "yes", exposureAdd: 5 },
      { label: "No", value: "no" },
    ],
  },
  {
    id: "familyHistory",
    question: "Any family medical history (diabetes, heart disease, etc.)?",
    options: [
      { label: "Yes", value: "yes", exposureAdd: 8 },
      { label: "No", value: "no" },
    ],
    vulnerabilityThreshold: 15,
    vulnerabilityMessage: "Family medical history significantly increases long-term risk. Adequate coverage with minimal waiting periods is essential.",
    specialCard: "Hereditary conditions like diabetes and heart disease can lead to expensive, recurring treatments. Early protection is key.",
  },
];

interface Props {
  city: string;
  age: number;
  onComplete: () => void;
  onRegisterBack: (fn: (() => boolean) | null) => void;
}

const HealthPreferenceStep = ({ city, age, onComplete, onRegisterBack }: Props) => {
  const { setPreferences, addEngagement } = useProtectionCheck();

  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [totalExposure, setTotalExposure] = useState(0);
  const [showVulnerability, setShowVulnerability] = useState(false);

  // Filter questions based on age
  const visibleQuestions = questions.filter(q => {
    if (q.id === "childPlanning" && age >= 50) return false;
    return true;
  });

  const currentQuestion = visibleQuestions[currentQ];
  const isFirst = currentQ === 0;
  const isLast = currentQ === visibleQuestions.length - 1;

  const finishFlow = (finalAnswers: Record<string, string>) => {
    const rawMembers = finalAnswers["members"] || "1";
    let membersCount = parseInt(rawMembers);
    let hasParents = false;

    // Map consolidated options to logic
    if (rawMembers === "5") {
      // Me + Parents
      membersCount = 3;
      hasParents = true;
    } else if (rawMembers === "6") {
      // Parents (usually 2)
      membersCount = 2;
      hasParents = true;
    }

    const familyType: "individual" | "family_floater" = membersCount > 1 ? "family_floater" : "individual";

    setPreferences({
      city,
      age,
      familyType,
      members: membersCount,
      roomPreference: (finalAnswers["roomPreference"] || "") as "private" | "shared" | "",
      childPlanning: age >= 50 ? false : finalAnswers["childPlanning"] === "yes",
      familyHistory: finalAnswers["familyHistory"] === "yes",
      parents: hasParents,
    });
    onComplete();
  };

  const advance = (finalAnswers: Record<string, string>) => {
    if (isLast) finishFlow(finalAnswers);
    else setCurrentQ(prev => prev + 1);
  };

  const handleAnswer = (option: { label: string; value: string; exposureAdd?: number }) => {
    const isChanging = answers[currentQuestion.id] && answers[currentQuestion.id] !== option.value;
    const newAnswers = { ...answers, [currentQuestion.id]: option.value };
    setAnswers(newAnswers);

    if (isChanging) {
      // If changing, we might need to recalculate total exposure more carefully, 
      // but for now let's just update the state
    } else {
      const exposure = option.exposureAdd || 0;
      const newTotal = totalExposure + exposure;
      setTotalExposure(newTotal);
    }

    addEngagement(5);

    const hasVulnerability = !!(currentQuestion.vulnerabilityThreshold && totalExposure + (option.exposureAdd || 0) >= currentQuestion.vulnerabilityThreshold && (option.exposureAdd || 0) > 0);

    if (hasVulnerability) {
      setShowVulnerability(true);
      // Auto-advance after 4s, but user can also click 'Continue'
      const timer = setTimeout(() => {
        setShowVulnerability(false);
        advance(newAnswers);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      // Quick auto-advance for non-vulnerable options
      setTimeout(() => advance(newAnswers), 50);
    }
  };

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

  if (!currentQuestion) return null;

  return (
    <div className="space-y-6">
      {/* Progress dots */}
      <div className="flex gap-2 justify-center">
        {visibleQuestions.map((_, i) => (
          <div key={i} className={`h-2 w-2 rounded-full transition-all ${i < currentQ ? "bg-primary" : i === currentQ ? "bg-primary w-6" : "bg-border"
            }`} />
        ))}
      </div>

      {/* Question card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          <div className="text-center">
            <Heart className="h-8 w-8 text-primary mx-auto mb-3" />
            <h3 className="text-lg font-bold text-foreground">{currentQuestion.question}</h3>
          </div>

          {/* Fact Card - Always show with question if it exists */}
          {currentQuestion.specialCard && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl bg-primary/10 border border-primary/20 p-4 flex items-start gap-3"
            >
              <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-foreground font-medium leading-relaxed">{currentQuestion.specialCard}</p>
            </motion.div>
          )}

          <div className="space-y-3">
            {currentQuestion.options.map((option) => (
              <button
                key={option.value}
                onClick={() => handleAnswer(option)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between group ${answers[currentQuestion.id] === option.value
                  ? "border-primary bg-primary/5"
                  : "border-border/50 hover:border-primary/30 bg-card"
                  }`}
              >
                <span className="font-medium text-foreground">{option.label}</span>
                <ChevronRight className={`h-4 w-4 transition-colors ${answers[currentQuestion.id] === option.value ? "text-primary" : "text-muted-foreground group-hover:text-primary"}`} />
              </button>
            ))}
          </div>

          {/* Inline Feedback Messages */}
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {showVulnerability && currentQuestion.vulnerabilityMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="rounded-xl bg-score-red/10 border border-score-red/20 p-4 flex items-start gap-3"
                >
                  <AlertTriangle className="h-5 w-5 text-score-red shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground/80">{currentQuestion.vulnerabilityMessage}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="space-y-4 px-2">
        <AnimatePresence>
          {answers[currentQuestion.id] && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <button
                onClick={() => advance(answers)}
                className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                Continue →
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-xs text-muted-foreground text-center">
          Question {currentQ + 1} of {visibleQuestions.length}
        </p>
      </div>
    </div>
  );
};

export default HealthPreferenceStep;
