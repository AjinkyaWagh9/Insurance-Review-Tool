import { useState } from "react";
import { TERM_SCORING_CONSTANTS } from "@/constants/termScoringConstants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { fetchTermScore } from "@/services/termApi";
import { useTermProtection } from "@/context/TermProtectionCheckContext";
import { Loader2 } from "lucide-react";
import { captureLead } from "@/services/leadApi";

interface Props {
  onSubmit: (age: number, annualIncome: number, dependents: number, existingSumAssured: number, retirementAge: number) => void;
}

const formatIncome = (val: number) => {
  if (val >= 10000000) return "₹1Cr+";
  if (val >= 100000) return `₹${(val / 100000).toFixed(val % 100000 === 0 ? 0 : 1)}L`;
  return `₹${val.toLocaleString("en-IN")}`;
};

const INCOME_MIN = 250000;
const INCOME_MAX = 10000000;
const INCOME_STEP = 100000;

const SA_MIN = 0;
const SA_MAX = 50000000;
const SA_STEP = 500000;

const formatSA = (val: number) => {
  if (val === 0) return "₹0";
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(val % 10000000 === 0 ? 0 : 1)}Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(val % 100000 === 0 ? 0 : 1)}L`;
  return `₹${val.toLocaleString("en-IN")}`;
};

const TermBasicInfoStep = ({ onSubmit }: Props) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [income, setIncome] = useState<number>(250000);
  const [dependents, setDependents] = useState("");
  const [existingSA, setExistingSA] = useState<number>(0);
  const [retireAge, setRetireAge] = useState<number>(60);
  const [loading, setLoading] = useState(false);

  const {
    setIdealCoverEstimated,
    setShortfallEstimated,
    setPolicyScore,
    setScoreReasons,
    setCustomerName,
    setPhone: setContextPhone,
    setDependents: setContextDependents,
    setBasicInfo,
    setExistingSumAssured,
    setRetirementAge,
    setMode,
    setIdealCoverBreakdown,
  } = useTermProtection();

  const isValid = name.trim().length > 0 && phone.length >= 10 && age && income > 0 && dependents !== "" && existingSA > 0 && !loading;

  const handleSubmit = async () => {
    setLoading(true);

    // Capture Lead
    captureLead({
      name: name.trim(),
      phone: phone.trim(),
      tool_type: "term"
    });

    // Store in context so StrengtheningStep and UploadStep can read them.
    // Reset mode to "estimate" so the gap reveal always reads idealCoverEstimated,
    // not a stale idealCoverVerified left over from a previous policy upload.
    setMode("estimate");
    setCustomerName(name.trim());
    setContextPhone(phone.trim());
    setContextDependents(parseInt(dependents));
    setBasicInfo(parseInt(age), income, parseInt(dependents), existingSA);
    setExistingSumAssured(existingSA);
    setRetirementAge(retireAge);

    try {
      const scoreData = await fetchTermScore({
        customer_name: name.trim(),
        age: parseInt(age),
        income,
        child_count: parseInt(dependents),
        extracted_sum_assured: existingSA,
        loans: 0,
        monthly_expenses: 0,
        retirement_age: retireAge,
        family_secure_years: 5,
        savings: 0,
        detected_riders: [],
        insurer_name: "unknown",
      });

      setIdealCoverEstimated(scoreData.ideal_cover);
      setShortfallEstimated(Math.max(0, scoreData.ideal_cover - existingSA));
      setPolicyScore(scoreData.score);
      setScoreReasons(scoreData.score_reasons);
      setIdealCoverBreakdown(scoreData.ideal_cover_breakdown ?? null);
    } catch (err) {
      console.error("Score API failed, using fallback:", err);
      const { INCOME_MULTIPLIER, DEPENDENT_BUFFER } = TERM_SCORING_CONSTANTS;
      const fallbackIdeal = Math.max(
        0,
        (income * INCOME_MULTIPLIER) + (parseInt(dependents) * DEPENDENT_BUFFER)
      );
      setIdealCoverEstimated(fallbackIdeal);
      setShortfallEstimated(Math.max(0, fallbackIdeal - existingSA));
      setPolicyScore(
        fallbackIdeal > 0
          ? Math.min(100, Math.round((existingSA / fallbackIdeal) * 100))
          : 0
      );
      setScoreReasons([
        "API Fallback: Estimate based on 10x income + ₹50L/dependent."
      ]);
    } finally {
      setLoading(false);
      onSubmit(
        parseInt(age),
        income,
        parseInt(dependents),
        existingSA,
        retireAge
      );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">Let's assess your family's protection</h2>
        <p className="text-sm text-muted-foreground">Takes 2 minutes.Just clarity.</p>
      </div>

      <div className="space-y-5">
        <div>
          <Label className="text-foreground/80 text-sm font-medium">Full Name</Label>
          <Input
            placeholder="e.g., Rahul Sharma"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1.5 h-12 bg-secondary/50 border-border/50 focus:border-primary"
          />
        </div>

        <div>
          <Label className="text-foreground/80 text-sm font-medium">Phone Number</Label>
          <Input
            type="tel"
            placeholder="e.g., 9876543210"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
            className="mt-1.5 h-12 bg-secondary/50 border-border/50 focus:border-primary"
          />
        </div>

        <div>
          <Label className="text-foreground/80 text-sm font-medium">Your Age</Label>
          <Input
            type="number"
            placeholder="e.g., 35"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="mt-1.5 h-12 bg-secondary/50 border-border/50 focus:border-primary"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-foreground/80 text-sm font-medium">Annual Income</Label>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-muted-foreground">₹</span>
              <Input
                type="text"
                inputMode="numeric"
                value={income === 0 ? "" : income}
                onChange={(e) => {
                  const val = parseInt(e.target.value.replace(/\D/g, "")) || 0;
                  setIncome(Math.min(val, INCOME_MAX));
                }}
                onBlur={() => {
                  const snapped = Math.round(income / INCOME_STEP) * INCOME_STEP;
                  setIncome(Math.max(snapped, INCOME_MIN));
                }}
                className="w-28 h-8 text-sm bg-secondary/50 border-border/50 text-right tabular-nums"
                placeholder="0"
              />
            </div>
          </div>
          <div className="bg-secondary/30 rounded-xl px-5 py-4 space-y-4">
            <div className="relative h-10">
              <span
                className="absolute -translate-x-1/2 top-0 bg-primary text-primary-foreground text-sm font-semibold px-3 py-1 rounded-lg shadow-md whitespace-nowrap transition-[left] duration-150 ease-out after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-[5px] after:border-transparent after:border-t-primary"
                style={{ left: `${((income - INCOME_MIN) / (INCOME_MAX - INCOME_MIN)) * 100}%` }}
              >
                {formatIncome(income)}
              </span>
            </div>
            <Slider
              min={INCOME_MIN}
              max={INCOME_MAX}
              step={INCOME_STEP}
              value={[income]}
              onValueChange={([v]) => setIncome(v)}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>₹2.5L</span>
              <span>₹1Cr+</span>
            </div>
          </div>
        </div>

        <div>
          <Label className="text-foreground/80 text-sm font-medium">Number of Dependents</Label>
          <Input
            type="number"
            placeholder="e.g., 2"
            value={dependents}
            onChange={(e) => setDependents(e.target.value)}
            className="mt-1.5 h-12 bg-secondary/50 border-border/50 focus:border-primary"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-foreground/80 text-sm font-medium">Existing Sum Assured</Label>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-muted-foreground">₹</span>
              <Input
                type="text"
                inputMode="numeric"
                value={existingSA === 0 ? "" : existingSA}
                onChange={(e) => {
                  const val = parseInt(e.target.value.replace(/\D/g, "")) || 0;
                  setExistingSA(Math.min(val, SA_MAX));
                }}
                onBlur={() => {
                  const snapped = Math.round(existingSA / SA_STEP) * SA_STEP;
                  setExistingSA(Math.max(snapped, 0));
                }}
                className="w-28 h-8 text-sm bg-secondary/50 border-border/50 text-right tabular-nums"
                placeholder="0"
              />
            </div>
          </div>
          <div className="bg-secondary/30 rounded-xl px-5 py-4 space-y-4">
            <div className="relative h-10">
              <span
                className="absolute -translate-x-1/2 top-0 bg-primary text-primary-foreground text-sm font-semibold px-3 py-1 rounded-lg shadow-md whitespace-nowrap transition-[left] duration-150 ease-out after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-[5px] after:border-transparent after:border-t-primary"
                style={{ left: `${((existingSA - SA_MIN) / (SA_MAX - SA_MIN)) * 100}%` }}
              >
                {formatSA(existingSA)}
              </span>
            </div>
            <Slider
              min={SA_MIN}
              max={SA_MAX}
              step={SA_STEP}
              value={[existingSA]}
              onValueChange={([v]) => setExistingSA(v)}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>₹0</span>
              <span>₹5Cr</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            You can find this on the first page of your term policy.
          </p>
          {existingSA > (income * 10) && income > 0 && (
            <p className="text-xs text-score-amber mt-1">
              ⚠️ This seems high relative to your income. Please confirm this value.
            </p>
          )}
        </div>
      </div>

      <button
        disabled={!isValid}
        onClick={handleSubmit}
        className={`w-full h-12 rounded-xl font-semibold text-base transition-all flex items-center justify-center gap-2 ${isValid
          ? "bg-primary text-primary-foreground hover:opacity-90"
          : "bg-muted text-muted-foreground cursor-not-allowed"
          }`}
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Calculating...
          </>
        ) : (
          "Reveal My Family Protection Gap →"
        )}
      </button>
    </div>
  );
};

export default TermBasicInfoStep;
