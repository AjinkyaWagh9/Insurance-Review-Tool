import { useState } from "react";
import { motion } from "framer-motion";
import { User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import CityCombobox from "./CityCombobox";

interface Props {
  onSubmit: (name: string, age: number, phone: string, city: string) => void;
}

const HealthBasicInfoStep = ({ onSubmit }: Props) => {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");

  const isValid = name.trim() && age && parseInt(age) > 0 && parseInt(age) < 120 && phone.length >= 10 && city;

  const handleSubmit = () => {
    if (!isValid) return;
    onSubmit(name.trim(), parseInt(age), phone.trim(), city);
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <User className="h-10 w-10 text-primary mx-auto mb-3" />
        <h2 className="text-xl font-bold text-foreground">Tell us about yourself</h2>
        <p className="text-sm text-muted-foreground mt-1">We'll use this to personalize your protection review.</p>
      </motion.div>

      <div className="space-y-5">
        <div>
          <Label className="text-foreground/80 text-sm font-medium">Full Name</Label>
          <Input
            type="text"
            placeholder="e.g., Rahul Sharma"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1.5 h-12 bg-secondary/50 border-border/50 focus:border-primary"
          />
        </div>

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
          <Label className="text-foreground/80 text-sm font-medium">City</Label>
          <CityCombobox value={city} onChange={setCity} />
        </div>
      </div>

      <button
        disabled={!isValid}
        onClick={handleSubmit}
        className={`w-full h-12 rounded-xl font-semibold text-base transition-all ${
          isValid
            ? "bg-primary text-primary-foreground hover:opacity-90"
            : "bg-muted text-muted-foreground cursor-not-allowed"
        }`}
      >
        Continue →
      </button>
    </div>
  );
};

export default HealthBasicInfoStep;
