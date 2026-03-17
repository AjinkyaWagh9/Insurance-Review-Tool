import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useProtectionCheck } from "@/context/ProtectionCheckContext";
import { useMotorProtection } from "@/context/MotorProtectionCheckContext";
import { useTermProtection } from "@/context/TermProtectionCheckContext";
import HealthPolicyUploadStep from "@/components/forms/HealthPolicyUploadStep";
import HealthAboutYouStep from "@/components/forms/HealthAboutYouStep";
import HealthPreferenceStep from "@/components/forms/HealthPreferenceStep";
import HealthProcessingStep from "@/components/forms/HealthProcessingStep";
import HealthReportStep from "@/components/forms/HealthReportStep";
import MotorBasicInfoStep from "@/components/forms/MotorBasicInfoStep";
import MotorGapRevealStep from "@/components/forms/MotorGapRevealStep";
import MotorStrengtheningStep from "@/components/forms/MotorStrengtheningStep";
import MotorRecommendationStep from "@/components/forms/MotorRecommendationStep";
import TermBasicInfoStep from "@/components/forms/TermBasicInfoStep";
import TermGapRevealStep from "@/components/forms/TermGapRevealStep";
import TermStrengtheningStep from "@/components/forms/TermStrengtheningStep";
import TermPolicyUploadStep from "@/components/forms/TermPolicyUploadStep";
import TermRecommendationStep from "@/components/forms/TermRecommendationStep";
import MotorAnalyzingStep from "@/components/forms/MotorAnalyzingStep";
import AnalysisCheckStep from "@/components/forms/AnalysisCheckStep";
import { ReviewType } from "@/types/insurance";

const typeLabels: Record<ReviewType, string> = {
  health: "Health Insurance",
  motor: "Motor Insurance",
  term: "Term Insurance",
};

const ReviewForm = () => {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const reviewType = type as ReviewType;
  const protectionCheck = useProtectionCheck();
  const motorCheck = useMotorProtection();
  const termCheck = useTermProtection();

  const [step, setStep] = useState(0);
  const [healthBasicInfo, setHealthBasicInfo] = useState<{ name: string; age: number; phone: string; city: string } | null>(null);
  const [healthNamePhone, setHealthNamePhone] = useState<{ name: string; phone: string } | null>(null);
  const [showMotorAnalyzing, setShowMotorAnalyzing] = useState(false);
  const internalBackRef = useRef<(() => boolean) | null>(null);

  const registerBack = useCallback((fn: (() => boolean) | null) => {
    internalBackRef.current = fn;
  }, []);

  // Reset step when type changes
  useEffect(() => {
    setStep(0);
    setShowMotorAnalyzing(false);
  }, [reviewType]);

  if (!["health", "motor", "term"].includes(reviewType)) {
    navigate("/");
    return null;
  }

  const isHealthFlow = reviewType === "health";
  const isMotorFlow = reviewType === "motor";
  const isTermFlow = reviewType === "term";

  const healthSteps = ["Get Started", "About You", "Preferences", "Report"];
  const motorSteps = ["Vehicle Info", "IDV Gap Reveal", "Risk Questions", "Recommendation"];
  const termSteps = ["Basic Info", "Gap Reveal", "Refinement", "Policy Audit", "Recommendation"];

  const steps = isHealthFlow ? healthSteps : isMotorFlow ? motorSteps : termSteps;
  const totalSteps = steps.length;

  // Health handlers
  const handlePolicyAndNameSubmit = (name: string, phone: string) => {
    setHealthNamePhone({ name, phone });
    setStep(1); // About You
  };

  const handleAboutYouSubmit = (age: number, city: string) => {
    setHealthBasicInfo({ name: healthNamePhone?.name || "", age, phone: healthNamePhone?.phone || "", city });
    setStep(2); // Preferences
  };
  const handlePreferencesComplete = () => setStep(3); // Report

  // Motor handlers
  const handleMotorBasicSubmit = (name: string, phone: string, city: string, marketValue: number, file: File | null) => {
    motorCheck.setBasicInfo(phone, city);
    motorCheck.setPolicyData(marketValue, 0);
    // Note: We don't have a direct setUserName in context, but we can update it if we added a setter.
    // For now, let's keep it simple as the lead is already captured.

    if (file) {
      motorCheck.uploadPolicy(file, city, marketValue);
      setShowMotorAnalyzing(true);
      setStep(1);
    } else {
      setStep(1);
    }
  };

  // Term handlers
  const handleTermBasicSubmit = (age: number, annualIncome: number, dependents: number, existingSA: number) => {
    termCheck.setBasicInfo(age, annualIncome, dependents, existingSA);
    setStep(1);
  };

  const renderHealthStep = () => {
    if (step === 0) return <HealthPolicyUploadStep onContinue={handlePolicyAndNameSubmit} />;
    if (step === 1) return <HealthAboutYouStep onSubmit={handleAboutYouSubmit} />;
    if (step === 2) return <HealthPreferenceStep city={healthBasicInfo?.city || ""} age={healthBasicInfo?.age || 0} onComplete={handlePreferencesComplete} onRegisterBack={registerBack} />;
    // Step 3: Report (the API call is fired inside HealthReportStep via computeReport)
    return <HealthReportStep onRetry={() => setStep(0)} />;
  };

  const renderMotorStep = () => {
    if (step === 0) return <MotorBasicInfoStep onSubmit={handleMotorBasicSubmit} />;
    if (step === 1 && showMotorAnalyzing) {
      return (
        <MotorAnalyzingStep
          isAnalyzing={motorCheck.policyAnalyzing}
          extractionFailed={motorCheck.extractionFailed}
          onComplete={() => setShowMotorAnalyzing(false)}
          onRetry={() => {
            setShowMotorAnalyzing(false);
            setStep(0);
          }}
        />
      );
    }

    // Insert Analysis Check for Motor
    if (step === 1 && motorCheck.isPolicyLoaded && !motorCheck.isVerified) {
      return (
        <AnalysisCheckStep
          title="Motor Analysis Check"
          description="Please verify your vehicle and IDV details extracted from the policy."
          fields={[
            { label: "Insurer", name: "insurer_name", value: motorCheck.extractedPolicy?.insurer_name, type: "text" },
            { label: "Vehicle", name: "vehicle_model", value: motorCheck.extractedPolicy?.vehicle_model, type: "text" },
            { label: "Policy IDV", name: "idv", value: motorCheck.extractedPolicy?.idv, type: "number" },
          ]}
          onConfirm={(data) => {
            motorCheck.updateExtractedData(data);
            motorCheck.setVerified(true);
          }}
          onBack={() => {
            motorCheck.resetState();
            setStep(0);
          }}
        />
      );
    }

    if (step === 1) return <MotorGapRevealStep onContinue={() => setStep(2)} />;
    if (step === 2) return <MotorStrengtheningStep onComplete={() => setStep(3)} onRegisterBack={registerBack} />;
    return <MotorRecommendationStep />;
  };

  const renderTermStep = () => {
    if (step === 0) return <TermBasicInfoStep onSubmit={handleTermBasicSubmit} />;
    if (step === 1) return <TermGapRevealStep onContinue={() => setStep(2)} />;
    if (step === 2) return <TermStrengtheningStep onComplete={() => setStep(3)} onRegisterBack={registerBack} />;
    if (step === 3) return <TermPolicyUploadStep onContinue={() => setStep(4)} onRetry={() => setStep(0)} />;
    return <TermRecommendationStep />;
  };

  const handleBack = () => {
    if (internalBackRef.current && internalBackRef.current()) return;
    if (step > 0) setStep(step - 1);
    else navigate("/");
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleBack} className="h-9 w-9">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <p className="text-sm text-muted-foreground">{typeLabels[reviewType]} Review</p>
              <p className="text-foreground font-semibold">{steps[step]}</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="container mx-auto px-6 pt-6">
        <div className="flex gap-2">
          {steps.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= step ? "bg-primary" : "bg-border"
              }`} />
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">Step {step + 1} of {totalSteps}</p>
      </div>

      <div className={`container mx-auto px-6 py-8 ${isHealthFlow && step === 3 ? "max-w-6xl" : "max-w-lg"}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {isHealthFlow ? renderHealthStep() : isMotorFlow ? renderMotorStep() : renderTermStep()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ReviewForm;
