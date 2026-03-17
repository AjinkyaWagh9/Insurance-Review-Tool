import React, { createContext, useContext, useState, useCallback } from "react";

// --- Comparison Row (from backend) ---
interface ComparisonRow {
  dimension: string;
  status: "green" | "amber" | "red";
  summary: string;
  your_need: string;
  your_policy: string;
  why_matters: string;
  recommended_action: string;
}

// --- Recommendation (from backend) ---
interface Recommendation {
  priority: "primary" | "secondary" | "tertiary";
  title: string;
  description: string;
}

// --- Extracted Policy Data (matches RULEBOOK Section 7.1) ---
interface ExtractedPolicyData {
  // Core
  insurer_name: string;
  plan_name: string;
  policy_number: string | null;
  sum_insured: number;
  premium: number | null;
  policy_tenure: string | null;

  // Room
  room_rent_limit: string;

  // Co-pay
  copay_percentage: number;
  deductible: number;

  // Sub-limits — dynamic from PDF
  sub_limits: string[];

  // Waiting periods — structured numeric fields
  waiting_periods: {
    initial_days: number;
    ped_months: number;
    specific_months: number;
  };

  // Benefits
  restoration_present: boolean;
  restoration_type: string;
  ncb_percentage: number;
  ncb_max_percentage: number;
  zone_of_cover: string;
  has_zonal_copay: boolean;

  // Score — backend-calculated, never computed in frontend
  policy_score: number;
  score_label: string;
  icr_value: number | null;
  icr_rating: string;

  // LLM-generated report content
  comparison_rows: ComparisonRow[];
  recommendations: Recommendation[];
  verdict: string;
  verdict_reason: string;
  ideal_cover: number;

  // New Rulebook v3 extraction fields
  is_family_floater: boolean | null;
  members_covered: number | null;
  global_health_coverage: boolean;

  // Instant Cover fields (Waiting Period fix)
  instant_cover: boolean | null;
  instant_cover_conditions: string[] | null;
  ped_effective_months: number | null;
}

// --- User Preferences (RULEBOOK Section 7.2) ---
interface UserPreferences {
  city: string;
  age: number;
  familyType: "individual" | "family_floater" | "";
  members: number;
  roomPreference: "private" | "shared" | "";
  childPlanning: boolean | null;
  familyHistory: boolean | null;
  parents: boolean | null;
  // NO emergencyFundMonths — REMOVED per RULEBOOK
}

// --- State ---
interface ProtectionCheckState {
  // Stage tracking
  policyUploaded: boolean;
  policyProcessed: boolean;
  preferencesCompleted: boolean;
  mode: "processing" | "report_ready";

  // Raw file (stored until preferences are collected, then sent to backend)
  policyFile: File | null;

  // Extracted policy data (from backend)
  extractedPolicy: ExtractedPolicyData | null;
  extractionFailed: boolean;

  // User preferences
  preferences: UserPreferences;

  // User info
  userName: string;
  userPhone: string;

  // Legacy compat
  engagementScore: number;
  isVerified: boolean;
}

interface ProtectionCheckActions {
  uploadPolicy: (file: File, name: string, phone: string) => void;
  setPreferences: (prefs: UserPreferences) => void;
  computeReport: () => Promise<void>;
  updateExtractedData: (data: Partial<ExtractedPolicyData>) => void;
  setVerified: (verified: boolean) => void;
  resetState: () => void;
  addEngagement: (points: number) => void;

  // Legacy compat
  setBasicInfo: (age: number, city: string, currentCover: number, policyType: string, members?: number) => void;
  addExposure: (points: number) => void;
  adjustIdealCover: (amount: number) => void;
}

type ProtectionCheckContextType = ProtectionCheckState & ProtectionCheckActions;

const defaultPreferences: UserPreferences = {
  city: "",
  age: 0,
  familyType: "",
  members: 1,
  roomPreference: "",
  childPlanning: null,
  familyHistory: null,
  parents: null,
};

const defaultState: ProtectionCheckState = {
  policyUploaded: false,
  policyProcessed: false,
  preferencesCompleted: false,
  mode: "processing",
  policyFile: null,
  extractedPolicy: null,
  extractionFailed: false,
  preferences: { ...defaultPreferences },
  userName: "",
  userPhone: "",
  engagementScore: 0,
  isVerified: false,
};

const ProtectionCheckContext = createContext<ProtectionCheckContextType | null>(null);

export const ProtectionCheckProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ProtectionCheckState>({ ...defaultState });

  // Step 1: User uploads a PDF file — store it in state (no API call yet)
  const uploadPolicy = useCallback((file: File, name: string, phone: string) => {
    setState(prev => ({
      ...prev,
      policyUploaded: true,
      policyFile: file,
      userName: name,
      userPhone: phone,
    }));
  }, []);

  // Step 2: User completes preference questions
  const setPreferences = useCallback((prefs: UserPreferences) => {
    setState(prev => ({
      ...prev,
      preferences: prefs,
      preferencesCompleted: true,
    }));
  }, []);

  // Step 3: Fire the real API call with PDF + all preferences
  const computeReport = useCallback(async () => {
    const currentState = state;
    const { policyFile, preferences } = currentState;

    if (!policyFile) {
      setState(prev => ({
        ...prev,
        policyProcessed: true,
        extractionFailed: true,
        mode: "report_ready" as const,
      }));
      return;
    }

    try {
      const formData = new FormData();
      formData.append('policy_pdf', policyFile);
      formData.append('policy_type', 'health');
      formData.append('user_age', String(preferences.age));
      formData.append('user_city', preferences.city);
      formData.append('family_type', preferences.familyType || 'individual');
      formData.append('members', String(preferences.members));
      formData.append('room_preference', preferences.roomPreference || 'shared');
      formData.append('child_planning', String(preferences.childPlanning === true));
      formData.append('family_history', String(preferences.familyHistory === true));
      formData.append('parents', String(preferences.parents === true));

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(
        `${apiUrl}/api/v1/analyze`,
        { method: 'POST', body: formData }
      );

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      const extracted = await response.json();

      setState(prev => ({
        ...prev,
        policyProcessed: true,
        extractedPolicy: extracted,
        extractionFailed: false,
        mode: "report_ready" as const,
      }));
    } catch (err) {
      console.error('Policy analysis failed:', err);
      setState(prev => ({
        ...prev,
        policyProcessed: true,
        extractionFailed: true,
        mode: "report_ready" as const,
      }));
    }
  }, [state]);

  const updateExtractedData = useCallback((data: Partial<ExtractedPolicyData>) => {
    setState(prev => ({
      ...prev,
      extractedPolicy: prev.extractedPolicy ? { ...prev.extractedPolicy, ...data } : null,
    }));
  }, []);

  const setVerified = useCallback((verified: boolean) => {
    setState(prev => ({ ...prev, isVerified: verified }));
  }, []);

  const addEngagement = useCallback((points: number) => {
    setState(prev => ({ ...prev, engagementScore: prev.engagementScore + points }));
  }, []);

  const resetState = useCallback(() => setState({ ...defaultState }), []);

  // Legacy compat stubs
  const setBasicInfo = useCallback(() => { }, []);
  const addExposure = useCallback(() => { }, []);
  const adjustIdealCover = useCallback(() => { }, []);

  return (
    <ProtectionCheckContext.Provider value={{
      ...state,
      uploadPolicy, setPreferences, computeReport, updateExtractedData, setVerified, resetState, addEngagement,
      setBasicInfo, addExposure, adjustIdealCover,
    }}>
      {children}
    </ProtectionCheckContext.Provider>
  );
};

export const useProtectionCheck = () => {
  const ctx = useContext(ProtectionCheckContext);
  if (!ctx) throw new Error("useProtectionCheck must be used within ProtectionCheckProvider");
  return ctx;
};
