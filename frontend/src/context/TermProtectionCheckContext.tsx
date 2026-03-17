import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { uploadTermPolicy, ExtractedPolicy, ScoreResponse } from "@/services/termApi";
import { STORAGE_VERSION } from "@/constants/termScoringConstants";

interface TermProtectionState {
  // Stage 1
  age: number;
  customerName: string;
  annualIncome: number;
  dependents: number;
  existingSumAssured: number;

  // Estimate calculations
  idealCoverEstimated: number;
  shortfallEstimated: number;

  // Policy upload
  policyUploaded: boolean;
  policyVerified: boolean;
  policyAnalyzing: boolean;
  extractedPolicy: ExtractedPolicy | null;

  // Verified mode
  idealCoverVerified: number;
  shortfallVerified: number;

  // Scores
  exposureScore: number;
  engagementScore: number;
  policyScore: number;
  scoreReasons: string[];
  idealCoverBreakdown: ScoreResponse["ideal_cover_breakdown"] | null;

  mode: "estimate" | "verified";

  // Refinement data
  loanAmount: number;
  monthlyExpenses: number;
  retirementAge: number;
  familySecureYears: number;

  // Missing fields for scoring
  coverageStatus: string;
  insurerReliabilityScore: number;
}

interface TermProtectionActions {
  setBasicInfo: (age: number, annualIncome: number, dependents: number, existingSumAssured: number) => void;
  // ... (rest of actions)
  addExposure: (points: number) => void;
  addEngagement: (points: number) => void;
  adjustIdealCover: (amount: number) => void;
  setCustomerName: (name: string) => void;
  setDependents: (count: number) => void;
  setLoanAmount: (amount: number) => void;
  setMonthlyExpenses: (amount: number) => void;
  setRetirementAge: (age: number) => void;
  setFamilySecureYears: (years: number) => void;
  uploadPolicy: (file: File) => void;
  resetState: () => void;

  // New Setters as per Rulebook
  setIdealCoverEstimated: (amount: number) => void;
  setShortfallEstimated: (amount: number) => void;
  setIdealCoverVerified: (amount: number) => void;
  setShortfallVerified: (amount: number) => void;
  setPolicyScore: (score: number) => void;
  setScoreReasons: (reasons: string[]) => void;
  setExistingSumAssured: (amount: number) => void;
  setMode: (mode: "estimate" | "verified") => void;
  setCoverageStatus: (status: string) => void;
  setInsurerReliabilityScore: (score: number) => void;
}

type TermProtectionContextType = TermProtectionState & TermProtectionActions & {
  activeIdeal: number;
  activeShortfall: number;
};

/**
 * ⚠️  If you modify this state shape, you MUST bump STORAGE_VERSION
 *     in src/constants/termScoringConstants.ts or users will silently
 *     load stale data that produces wrong coverage calculations.
 *
 *     Fields that affect scoring (annualIncome, loanAmount, dependents,
 *     monthlyExpenses, retirementAge) are especially critical — stale
 *     values for these fields produce wrong idealCover outputs in Step 3.
 */
const defaultState: TermProtectionState = {
  age: 0,
  customerName: "",
  annualIncome: 0,
  dependents: 0,
  existingSumAssured: 0,
  idealCoverEstimated: 0,
  shortfallEstimated: 0,
  policyUploaded: false,
  policyVerified: false,
  policyAnalyzing: false,
  extractedPolicy: null,
  idealCoverVerified: 0,
  shortfallVerified: 0,
  exposureScore: 0,
  engagementScore: 0,
  policyScore: 0,
  scoreReasons: [],
  idealCoverBreakdown: null,
  mode: "estimate",
  loanAmount: 0,
  monthlyExpenses: 0,
  retirementAge: 60,
  familySecureYears: 0,
  coverageStatus: "",
  insurerReliabilityScore: 0,
};

const TermProtectionContext = createContext<TermProtectionContextType | null>(null);

export const TermProtectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const STORAGE_KEY = "termProtectionData";

  const [state, setState] = useState<TermProtectionState>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed._version === STORAGE_VERSION) {
          return parsed;
        }
        console.info(
          `[TermProtection] Storage version mismatch: stored="${parsed._version}", ` +
          `current="${STORAGE_VERSION}". Clearing stale data and resetting to defaults.`
        );
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {
        console.error("[TermProtection] Failed to parse saved state. Resetting.", e);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    return defaultState;
  });

  // Rule 6.1 — stateRef for Stale Closure Prevention
  const stateRef = useRef(state);
  React.useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Rule 7.1 — Persist State
  React.useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, _version: STORAGE_VERSION }));
  }, [state]);

  // Rule 4.1 — Define Active Values
  const activeIdeal = state.mode === "verified" ? state.idealCoverVerified : state.idealCoverEstimated;
  const activeShortfall = state.mode === "verified" ? state.shortfallVerified : state.shortfallEstimated;

  const setBasicInfo = useCallback((age: number, annualIncome: number, dependents: number, existingSumAssured: number) => {
    setState(prev => ({
      ...prev,
      age, annualIncome, dependents, existingSumAssured,
    }));
  }, []);

  const addExposure = useCallback((points: number) => {
    setState(prev => ({ ...prev, exposureScore: prev.exposureScore + points }));
  }, []);

  const addEngagement = useCallback((points: number) => {
    setState(prev => ({ ...prev, engagementScore: prev.engagementScore + points }));
  }, []);

  const adjustIdealCover = useCallback((amount: number) => {
    setState(prev => {
      const newIdeal = prev.idealCoverEstimated + amount;
      return {
        ...prev,
        idealCoverEstimated: newIdeal,
        shortfallEstimated: Math.max(0, newIdeal - prev.existingSumAssured),
      };
    });
  }, []);

  const setCustomerName = useCallback((name: string) => {
    setState(prev => ({ ...prev, customerName: name }));
  }, []);

  const setDependents = useCallback((count: number) => {
    setState(prev => ({ ...prev, dependents: count }));
  }, []);

  const setLoanAmount = useCallback((amount: number) => {
    setState(prev => ({ ...prev, loanAmount: amount }));
  }, []);

  const setMonthlyExpenses = useCallback((amount: number) => {
    setState(prev => ({ ...prev, monthlyExpenses: amount }));
  }, []);

  const setRetirementAge = useCallback((retAge: number) => {
    setState(prev => ({ ...prev, retirementAge: retAge }));
  }, []);

  const setFamilySecureYears = useCallback((years: number) => {
    setState(prev => ({ ...prev, familySecureYears: years }));
  }, []);

  // New Setters
  const setIdealCoverEstimated = useCallback((amount: number) =>
    setState(prev => ({ ...prev, idealCoverEstimated: amount })), []);

  const setShortfallEstimated = useCallback((amount: number) =>
    setState(prev => ({ ...prev, shortfallEstimated: amount })), []);

  const setIdealCoverVerified = useCallback((amount: number) =>
    setState(prev => ({ ...prev, idealCoverVerified: amount })), []);

  const setShortfallVerified = useCallback((amount: number) =>
    setState(prev => ({ ...prev, shortfallVerified: amount })), []);

  const setPolicyScore = useCallback((score: number) =>
    setState(prev => ({ ...prev, policyScore: score })), []);

  const setScoreReasons = useCallback((reasons: string[]) =>
    setState(prev => ({ ...prev, scoreReasons: reasons })), []);

  const setExistingSumAssured = useCallback((amount: number) =>
    setState(prev => ({ ...prev, existingSumAssured: amount })), []);

  const setMode = useCallback((mode: "verified" | "estimate") =>
    setState(prev => ({ ...prev, mode })), []);

  const setCoverageStatus = useCallback((status: string) =>
    setState(prev => ({ ...prev, coverageStatus: status })), []);

  const setInsurerReliabilityScore = useCallback((score: number) =>
    setState(prev => ({ ...prev, insurerReliabilityScore: score })), []);

  const uploadPolicy = useCallback(async (file: File) => {
    setState(prev => ({ ...prev, policyAnalyzing: true, policyUploaded: true }));

    try {
      const s = stateRef.current;
      const result = await uploadTermPolicy(file, {
        customer_name: s.customerName,
        age: s.age,
        income: s.annualIncome,
        child_count: s.dependents,
        extracted_sum_assured: s.existingSumAssured,
        loans: s.loanAmount,
        monthly_expenses: s.monthlyExpenses,
        retirement_age: s.retirementAge,
        family_secure_years: s.familySecureYears,
        savings: 0,
      });

      if (result.success && result.extracted && result.score_result) {
        setState(prev => ({
          ...prev,
          extractedPolicy: {
            extracted_sum_assured: result.extracted?.extracted_sum_assured || 0,
            insurer_name: result.extracted?.insurer_name || "Unknown",
            policy_term_end_age: result.extracted?.policy_term_end_age || 0,
            riders_present: result.extracted?.riders_present || [],
            premium_amount: result.extracted?.premium_amount,
            policy_term: result.extracted?.policy_term,
          },
          policyVerified: true,
          mode: "verified",
          idealCoverVerified: result.score_result?.ideal_cover || 0,
          shortfallVerified: Math.max(0, (result.score_result?.ideal_cover || 0) - (result.extracted?.extracted_sum_assured || 0)),
          policyScore: result.score_result?.score || 0,
          scoreReasons: result.score_result?.score_reasons || [],
          idealCoverBreakdown: result.score_result?.ideal_cover_breakdown || null,
          coverageStatus: result.score_result?.coverage_status || "",
          insurerReliabilityScore: result.score_result?.insurer_reliability_score || 0,
          existingSumAssured: result.extracted?.extracted_sum_assured || prev.existingSumAssured,
        }));
      } else {
        setState(prev => ({ ...prev, policyVerified: false, mode: "estimate" }));
      }
    } catch (err) {
      console.error("Upload failed:", err);
      setState(prev => ({ ...prev, policyVerified: false, mode: "estimate" }));
    } finally {
      setState(prev => ({ ...prev, policyAnalyzing: false }));
    }
  }, []); // Empty dependency array — stale closures prevented by stateRef

  const resetState = useCallback(() => setState(defaultState), []);

  return (
    <TermProtectionContext.Provider value={{
      ...state,
      activeIdeal,
      activeShortfall,
      setBasicInfo, addExposure, addEngagement, adjustIdealCover,
      setCustomerName, setDependents,
      setLoanAmount, setMonthlyExpenses, setRetirementAge, setFamilySecureYears,
      uploadPolicy, resetState,
      setIdealCoverEstimated, setShortfallEstimated, setIdealCoverVerified, setShortfallVerified,
      setPolicyScore, setScoreReasons, setExistingSumAssured,
      setMode, setCoverageStatus, setInsurerReliabilityScore,
    }}>
      {children}
    </TermProtectionContext.Provider>
  );
};

export const useTermProtection = () => {
  const ctx = useContext(TermProtectionContext);
  if (!ctx) throw new Error("useTermProtection must be used within TermProtectionProvider");
  return ctx;
};
