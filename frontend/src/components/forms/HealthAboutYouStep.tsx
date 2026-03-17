import { useState } from "react";
import { motion } from "framer-motion";
import { User, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import CityCombobox from "./CityCombobox";

interface Props {
  onSubmit: (age: number, city: string) => void;
}

const HealthAboutYouStep = ({ onSubmit }: Props) => {
  const [age, setAge] = useState("");
  const [city, setCity] = useState("");

  const isValid = age && parseInt(age) > 0 && parseInt(age) < 120 && city;

  const handleSubmit = () => {
    if (!isValid) return;
    onSubmit(parseInt(age), city);
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <User className="h-10 w-10 text-primary mx-auto mb-3" />
        <h2 className="text-xl font-bold text-foreground">Tell us more about yourself</h2>
        <p className="text-sm text-muted-foreground mt-1">This helps us personalize your protection review.</p>
      </motion.div>

      <div className="space-y-5">
        <div>
          <Label className="text-foreground/80 text-sm font-medium">Age</Label>
          <Input
            type="number"
            placeholder="e.g., 32"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="mt-1.5 h-12 bg-secondary/50 border-border/50 focus:border-primary"
          />
        </div>

        <div>
          <Label className="text-foreground/80 text-sm font-medium">City</Label>
          {/* Quick-select buttons for popular cities */}
          <div className="flex flex-wrap gap-2 mt-2 mb-2">
            {["Delhi NCR", "Bangalore", "Hyderabad", "Ahmedabad", "Mumbai"].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCity(c)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${city === c
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary/60 text-muted-foreground border-border/50 hover:border-primary/40 hover:text-foreground"
                  }`}
              >
                {c}
              </button>
            ))}
          </div>
          <CityCombobox value={city} onChange={setCity} />
        </div>
      </div>

      <button
        disabled={!isValid}
        onClick={handleSubmit}
        className={`w-full h-12 rounded-xl font-semibold text-base transition-all ${isValid
          ? "bg-primary text-primary-foreground hover:opacity-90"
          : "bg-muted text-muted-foreground cursor-not-allowed"
          }`}
      >
        Continue →
      </button>
    </div>
  );
};

export default HealthAboutYouStep;
