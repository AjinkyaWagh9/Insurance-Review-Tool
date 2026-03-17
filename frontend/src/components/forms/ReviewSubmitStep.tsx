import { ReviewFormData } from "@/types/insurance";
import { FileText, User, Car, Wallet } from "lucide-react";

interface Props {
  data: ReviewFormData;
}

const ReviewSubmitStep = ({ data }: Props) => {
  const { personalInfo, reviewType, vehicleDetails, financialProfile, policyFile } = data;

  const typeLabels = { health: "Health Insurance", motor: "Motor Insurance", term: "Term Insurance" };

  return (
    <div className="space-y-5">
      <p className="text-muted-foreground text-sm">
        Please review your information before submitting.
      </p>

      <div className="rounded-xl border border-border/50 bg-secondary/20 p-5 space-y-4">
        <div className="flex items-center gap-2 text-foreground font-medium">
          <User className="h-4 w-4 text-primary" />
          Personal Information
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-muted-foreground">Name:</span> <span className="text-foreground ml-1">{personalInfo.name}</span></div>
          {personalInfo.age ? <div><span className="text-muted-foreground">Age:</span> <span className="text-foreground ml-1">{personalInfo.age}</span></div> : null}
          <div><span className="text-muted-foreground">Phone:</span> <span className="text-foreground ml-1">{personalInfo.phone}</span></div>
          <div><span className="text-muted-foreground">City:</span> <span className="text-foreground ml-1">{personalInfo.city}</span></div>
          <div><span className="text-muted-foreground">Email:</span> <span className="text-foreground ml-1">{personalInfo.email}</span></div>
        </div>
      </div>

      {reviewType === "motor" && vehicleDetails && (
        <div className="rounded-xl border border-border/50 bg-secondary/20 p-5 space-y-4">
          <div className="flex items-center gap-2 text-foreground font-medium">
            <Car className="h-4 w-4 text-primary" />
            Vehicle Details
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Type:</span> <span className="text-foreground ml-1 capitalize">{vehicleDetails.vehicleType.replace("-", " ")}</span></div>
            <div><span className="text-muted-foreground">Usage:</span> <span className="text-foreground ml-1 capitalize">{vehicleDetails.usagePattern}</span></div>
          </div>
        </div>
      )}

      {reviewType === "term" && financialProfile && (
        <div className="rounded-xl border border-border/50 bg-secondary/20 p-5 space-y-4">
          <div className="flex items-center gap-2 text-foreground font-medium">
            <Wallet className="h-4 w-4 text-primary" />
            Financial Profile
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Income:</span> <span className="text-foreground ml-1">₹{financialProfile.income?.toLocaleString()}</span></div>
            <div><span className="text-muted-foreground">Loan/Debt:</span> <span className="text-foreground ml-1">₹{financialProfile.loanDebt?.toLocaleString()}</span></div>
            <div><span className="text-muted-foreground">Assets:</span> <span className="text-foreground ml-1">₹{financialProfile.liquidAssets?.toLocaleString()}</span></div>
            <div><span className="text-muted-foreground">Children:</span> <span className="text-foreground ml-1">{financialProfile.children}</span></div>
            <div><span className="text-muted-foreground">Parents Dependent:</span> <span className="text-foreground ml-1">{financialProfile.parentsDependent ? "Yes" : "No"}</span></div>
            <div><span className="text-muted-foreground">Tobacco Use:</span> <span className="text-foreground ml-1">{financialProfile.smokingUse ? "Yes" : "No"}</span></div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border/50 bg-secondary/20 p-5">
        <div className="flex items-center gap-2 text-foreground font-medium mb-2">
          <FileText className="h-4 w-4 text-primary" />
          Policy Document
        </div>
        <p className="text-sm text-muted-foreground">
          {policyFile ? policyFile.name : "No file uploaded"}
        </p>
      </div>

      <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
        <p className="text-sm text-foreground">
          Reviewing: <span className="font-semibold text-primary">{typeLabels[reviewType]}</span>
        </p>
      </div>
    </div>
  );
};

export default ReviewSubmitStep;
