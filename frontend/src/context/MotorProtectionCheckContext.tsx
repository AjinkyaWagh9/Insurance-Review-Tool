import React, { createContext, useContext, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ExtractedMotorPolicyData {
  idv: number | null;
  zero_dep: boolean;
  engine_protect: boolean;
  rti: boolean;
  ncb_protect: boolean;
  tyre_protect: boolean;
  consumables: boolean;
  roadside_assist: boolean;
  deductible: number | null;
  insurer_name: string | null;
  vehicle_age_years: number | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_variant: string | null;
  vehicle_reg_year: number | null;
  vehicle_type: string | null;
  ncb_percentage: number | null;
  policy_type: string | null;
}

interface BackendPolicyData {
  vehicle_year: number;
  policy_idv: number;
  expected_market_value: number;
  ideal_idv: number;
  idv_gap: number;
  policy_score: number;
  add_ons: {
    zero_dep: boolean;
    engine_protect: boolean;
    rti: boolean;
    ncb_protect: boolean;
    tyre_protect: boolean;
    consumables: boolean;
    roadside_assist: boolean;
  };
  deductible: number;
  insurer_name: string;
  vehicle_age_years: number;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_variant?: string;
  vehicle_reg_year: number;
  vehicle_type: string;
  ncb_percentage: number;
  policy_type: string;
}

interface MotorProtectionState {
  phone: string;
  city: string;
  marketValue: number;
  currentIdv: number;
  idealIdv: number;
  idvGap: number;
  exposureScore: number;
  engagementScore: number;
  policyScore: number;
  policyUploaded: boolean;
  policyAnalyzing: boolean;
  extractedPolicy: ExtractedMotorPolicyData | null;
  recommendedAddons: string[];
  isPolicyLoaded: boolean;
  backendPolicy: BackendPolicyData | null;
  extractionFailed: boolean;
  isVerified: boolean;
}

interface MotorProtectionActions {
  setBasicInfo: (phone: string, city: string) => void;
  setPolicyData: (marketValue: number, currentIdv: number) => void;
  addExposure: (points: number) => void;
  addEngagement: (points: number) => void;
  adjustIdv: (amount: number) => void;
  uploadPolicy: (file: File, city: string, marketValue?: number) => void;
  updateExtractedData: (data: Partial<ExtractedMotorPolicyData>) => void;
  setVerified: (verified: boolean) => void;
  addRecommendedAddon: (addon: string) => void;
  resetState: () => void;
}

type MotorProtectionContextType = MotorProtectionState & MotorProtectionActions;

const defaultState: MotorProtectionState = {
  phone: "",
  city: "",
  marketValue: 0,
  currentIdv: 0,
  idealIdv: 0,
  idvGap: 0,
  exposureScore: 0,
  engagementScore: 0,
  policyScore: 0,
  policyUploaded: false,
  policyAnalyzing: false,
  extractedPolicy: null,
  recommendedAddons: [],
  isPolicyLoaded: false,
  backendPolicy: null,
  extractionFailed: false,
  isVerified: false,
};

const MotorProtectionContext = createContext<MotorProtectionContextType | null>(null);


export const MotorProtectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<MotorProtectionState>(defaultState);

  const setBasicInfo = useCallback((phone: string, city: string) => {
    setState(prev => ({ ...prev, phone, city }));
  }, []);

  const setPolicyData = useCallback((marketValue: number, currentIdv: number) => {
    setState(prev => ({ ...prev, marketValue, currentIdv }));
  }, []);

  const addExposure = useCallback((points: number) => {
    setState(prev => ({ ...prev, exposureScore: prev.exposureScore + points }));
  }, []);

  const addEngagement = useCallback((points: number) => {
    setState(prev => ({ ...prev, engagementScore: prev.engagementScore + points }));
  }, []);

  const adjustIdv = useCallback((newCurrentIdv: number) => {
    setState(prev => ({
      ...prev,
      currentIdv: newCurrentIdv,
      idvGap: Math.max(0, prev.idealIdv - newCurrentIdv),
    }));
  }, []);

  const uploadPolicy = useCallback(async (file: File, city: string, marketValue?: number) => {
    setState(prev => ({ ...prev, policyAnalyzing: true, extractionFailed: false }));

    try {
      const formData = new FormData();
      formData.append("policy_pdf", file);
      formData.append("policy_type", "motor");
      formData.append("user_city", city);
      if (marketValue !== undefined) {
        formData.append("market_value", marketValue.toString());
      }

      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/api/v1/analyze`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Backend error");

      const backend = await response.json() as BackendPolicyData;

      const extractedPolicy: ExtractedMotorPolicyData = {
        idv: backend.policy_idv,
        zero_dep: backend.add_ons.zero_dep,
        engine_protect: backend.add_ons.engine_protect,
        rti: backend.add_ons.rti,
        ncb_protect: backend.add_ons.ncb_protect,
        tyre_protect: backend.add_ons.tyre_protect,
        consumables: backend.add_ons.consumables,
        roadside_assist: backend.add_ons.roadside_assist,
        deductible: backend.deductible,
        insurer_name: backend.insurer_name,
        vehicle_age_years: backend.vehicle_age_years,
        vehicle_make: backend.vehicle_make,
        vehicle_model: backend.vehicle_model,
        vehicle_variant: backend.vehicle_variant,
        vehicle_reg_year: backend.vehicle_reg_year,
        vehicle_type: backend.vehicle_type,
        ncb_percentage: backend.ncb_percentage,
        policy_type: backend.policy_type,
      };

      setState(prev => ({
        ...prev,
        policyUploaded: true,
        policyAnalyzing: false,
        extractedPolicy,
        policyScore: backend.policy_score,
        isPolicyLoaded: true,
        backendPolicy: backend,
        // Override frontend-calculated values with backend values
        currentIdv: backend.policy_idv,
        idealIdv: backend.ideal_idv,
        idvGap: backend.idv_gap,
        marketValue: backend.expected_market_value,
      }));
    } catch (err) {
      console.error("Policy analysis failed:", err);
      setState(prev => ({
        ...prev,
        policyUploaded: false,
        policyAnalyzing: false,
        extractionFailed: true,
      }));
    }
  }, []);

  const updateExtractedData = useCallback((data: Partial<ExtractedMotorPolicyData>) => {
    setState(prev => ({
      ...prev,
      extractedPolicy: prev.extractedPolicy ? { ...prev.extractedPolicy, ...data } : null,
      // If IDV was updated, re-calculate gap
      currentIdv: data.idv !== undefined ? data.idv : prev.currentIdv,
      idvGap: data.idv !== undefined ? Math.max(0, prev.idealIdv - data.idv) : prev.idvGap,
    }));
  }, []);

  const setVerified = useCallback((verified: boolean) => {
    setState(prev => ({ ...prev, isVerified: verified }));
  }, []);

  const addRecommendedAddon = useCallback((addon: string) => {
    setState(prev => ({
      ...prev,
      recommendedAddons: prev.recommendedAddons.includes(addon)
        ? prev.recommendedAddons
        : [...prev.recommendedAddons, addon],
    }));
  }, []);

  const resetState = useCallback(() => setState(defaultState), []);

  return (
    <MotorProtectionContext.Provider value={{
      ...state, setBasicInfo, setPolicyData, addExposure, addEngagement,
      adjustIdv, uploadPolicy, updateExtractedData, setVerified, addRecommendedAddon, resetState,
    }}>
      {children}
    </MotorProtectionContext.Provider>
  );
};

export const useMotorProtection = () => {
  const ctx = useContext(MotorProtectionContext);
  if (!ctx) throw new Error("useMotorProtection must be used within MotorProtectionProvider");
  return ctx;
};
