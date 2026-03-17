import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FinancialProfile } from "@/types/insurance";

interface Props {
  data: FinancialProfile;
  onChange: (data: FinancialProfile) => void;
}

const FinancialProfileStep = ({ data, onChange }: Props) => {
  const updateNum = (field: "income" | "loanDebt" | "liquidAssets" | "children", value: string) => {
    onChange({ ...data, [field]: value === "" ? "" : parseInt(value) || 0 });
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <Label className="text-foreground/80 text-sm font-medium">Annual Income (₹)</Label>
          <Input
            type="number"
            placeholder="e.g., 1200000"
            value={data.income}
            onChange={(e) => updateNum("income", e.target.value)}
            className="mt-1.5 h-12 bg-secondary/50 border-border/50"
          />
        </div>
        <div>
          <Label className="text-foreground/80 text-sm font-medium">Total Loan / Debt (₹)</Label>
          <Input
            type="number"
            placeholder="e.g., 500000"
            value={data.loanDebt}
            onChange={(e) => updateNum("loanDebt", e.target.value)}
            className="mt-1.5 h-12 bg-secondary/50 border-border/50"
          />
        </div>
        <div>
          <Label className="text-foreground/80 text-sm font-medium">Liquid Assets / Surplus (₹)</Label>
          <Input
            type="number"
            placeholder="e.g., 300000"
            value={data.liquidAssets}
            onChange={(e) => updateNum("liquidAssets", e.target.value)}
            className="mt-1.5 h-12 bg-secondary/50 border-border/50"
          />
        </div>
        <div>
          <Label className="text-foreground/80 text-sm font-medium">Number of Children</Label>
          <Input
            type="number"
            placeholder="e.g., 2"
            value={data.children}
            onChange={(e) => updateNum("children", e.target.value)}
            className="mt-1.5 h-12 bg-secondary/50 border-border/50"
          />
        </div>
      </div>

      <div className="space-y-4 pt-2">
        <div>
          <p className="text-foreground/80 text-sm font-medium mb-3">Are your parents financially dependent on you?</p>
          <div className="flex gap-3">
            {[true, false].map((val) => (
              <button
                key={String(val)}
                type="button"
                onClick={() => onChange({ ...data, parentsDependent: val })}
                className={`px-8 py-3 rounded-lg border-2 font-medium text-sm transition-all ${
                  data.parentsDependent === val
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/50 text-foreground bg-secondary/20 hover:border-primary/30"
                }`}
              >
                {val ? "Yes" : "No"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-foreground/80 text-sm font-medium mb-3">Do you use tobacco or smoke?</p>
          <div className="flex gap-3">
            {[true, false].map((val) => (
              <button
                key={String(val)}
                type="button"
                onClick={() => onChange({ ...data, smokingUse: val })}
                className={`px-8 py-3 rounded-lg border-2 font-medium text-sm transition-all ${
                  data.smokingUse === val
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/50 text-foreground bg-secondary/20 hover:border-primary/30"
                }`}
              >
                {val ? "Yes" : "No"}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialProfileStep;
