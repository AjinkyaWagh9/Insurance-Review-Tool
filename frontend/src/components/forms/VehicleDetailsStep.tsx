import { Bike, Car } from "lucide-react";
import { VehicleDetails } from "@/types/insurance";

interface Props {
  data: VehicleDetails;
  onChange: (data: VehicleDetails) => void;
}

const usageOptions = [
  { value: "personal" as const, label: "Personal" },
  { value: "commercial" as const, label: "Commercial" },
  { value: "mixed" as const, label: "Mixed" },
];

const VehicleDetailsStep = ({ data, onChange }: Props) => {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-foreground font-medium mb-4">Vehicle Type</p>
        <div className="grid grid-cols-2 gap-4">
          {[
            { value: "two-wheeler" as const, label: "Two Wheeler", icon: Bike },
            { value: "four-wheeler" as const, label: "Four Wheeler", icon: Car },
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => onChange({ ...data, vehicleType: value })}
              className={`p-6 rounded-xl border-2 transition-all text-center ${
                data.vehicleType === value
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border/50 hover:border-primary/30 bg-secondary/20"
              }`}
            >
              <Icon className={`mx-auto h-10 w-10 mb-3 ${
                data.vehicleType === value ? "text-primary" : "text-muted-foreground"
              }`} />
              <p className={`font-medium ${
                data.vehicleType === value ? "text-primary" : "text-foreground"
              }`}>{label}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-foreground font-medium mb-4">Usage Pattern</p>
        <div className="flex flex-wrap gap-3">
          {usageOptions.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => onChange({ ...data, usagePattern: value })}
              className={`px-6 py-3 rounded-full border-2 transition-all font-medium text-sm ${
                data.usagePattern === value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/50 text-foreground hover:border-primary/30 bg-secondary/20"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VehicleDetailsStep;
