export type ReviewType = "health" | "motor" | "term";

export interface PersonalInfo {
  name: string;
  age?: number;
  phone: string;
  city: string;
  email: string;
}

export interface VehicleDetails {
  vehicleType: "two-wheeler" | "four-wheeler" | "";
  usagePattern: "personal" | "commercial" | "mixed" | "";
}

export interface FinancialProfile {
  income: number | "";
  loanDebt: number | "";
  liquidAssets: number | "";
  children: number | "";
  parentsDependent: boolean;
  smokingUse: boolean;
}

export interface ReviewFormData {
  reviewType: ReviewType;
  personalInfo: PersonalInfo;
  vehicleDetails?: VehicleDetails;
  financialProfile?: FinancialProfile;
  policyFile: File | null;
}

export interface ReviewScore {
  overall: number;
  gapSummary: string;
  risks: string[];
  improvements: string[];
}

export interface ReviewResult {
  reviewType: ReviewType;
  score: ReviewScore;
  personalInfo: PersonalInfo;
}
