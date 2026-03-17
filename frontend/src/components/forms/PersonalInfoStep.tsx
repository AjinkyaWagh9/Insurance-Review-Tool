import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PersonalInfo } from "@/types/insurance";

interface Props {
  data: PersonalInfo;
  onChange: (data: PersonalInfo) => void;
  showAge?: boolean;
}

const PersonalInfoStep = ({ data, onChange, showAge = true }: Props) => {
  const update = (field: keyof PersonalInfo, value: string | number) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-5">
      <div>
        <Label htmlFor="name" className="text-foreground/80 text-sm font-medium">Full Name</Label>
        <Input
          id="name"
          placeholder="Enter your full name"
          value={data.name}
          onChange={(e) => update("name", e.target.value)}
          className="mt-1.5 h-12 bg-secondary/50 border-border/50 focus:border-primary"
        />
      </div>

      {showAge && (
        <div>
          <Label htmlFor="age" className="text-foreground/80 text-sm font-medium">Age</Label>
          <Input
            id="age"
            type="number"
            placeholder="Enter your age"
            value={data.age || ""}
            onChange={(e) => update("age", parseInt(e.target.value) || 0)}
            className="mt-1.5 h-12 bg-secondary/50 border-border/50 focus:border-primary"
          />
        </div>
      )}

      <div>
        <Label htmlFor="phone" className="text-foreground/80 text-sm font-medium">Phone Number</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="Enter 10-digit phone number"
          value={data.phone}
          onChange={(e) => update("phone", e.target.value)}
          className="mt-1.5 h-12 bg-secondary/50 border-border/50 focus:border-primary"
        />
      </div>

      <div>
        <Label htmlFor="city" className="text-foreground/80 text-sm font-medium">City</Label>
        <Input
          id="city"
          placeholder="Enter your city"
          value={data.city}
          onChange={(e) => update("city", e.target.value)}
          className="mt-1.5 h-12 bg-secondary/50 border-border/50 focus:border-primary"
        />
      </div>

      <div>
        <Label htmlFor="email" className="text-foreground/80 text-sm font-medium">Email Address</Label>
        <Input
          id="email"
          type="email"
          placeholder="Enter your email"
          value={data.email}
          onChange={(e) => update("email", e.target.value)}
          className="mt-1.5 h-12 bg-secondary/50 border-border/50 focus:border-primary"
        />
      </div>
    </div>
  );
};

export default PersonalInfoStep;
