import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Upload, FileText, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import CityCombobox from "./CityCombobox";
import { captureLead, uploadInsuranceFile } from "@/services/leadApi";

interface Props {
  onSubmit: (name: string, phone: string, city: string, marketValue: number, policyFile: File | null) => void;
}

const MotorBasicInfoStep = ({ onSubmit }: Props) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [marketValue, setMarketValue] = useState("");
  const [policyFile, setPolicyFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isValid = name.trim().length > 0 && phone.length >= 10 && city && marketValue && policyFile;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.type === "application/pdf") setPolicyFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPolicyFile(file);
  };

  const handleSubmit = () => {
    if (!isValid) return;

    captureLead({
      name: name.trim(),
      phone: phone.trim(),
      tool_type: "motor"
    });

    if (policyFile) {
      uploadInsuranceFile(phone.trim(), policyFile);
    }

    onSubmit(name.trim(), phone.trim(), city, parseInt(marketValue), policyFile);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">Check your motor protection</h2>
        <p className="text-sm text-muted-foreground">Quick check. No calls. Just clarity on your vehicle cover.</p>
      </div>

      <div className="space-y-5">
        <div>
          <Label className="text-foreground/80 text-sm font-medium">Full Name</Label>
          <Input
            placeholder="e.g., Rahul Sharma"
            value={name}
            onChange={(e) => setName(e.target.value)}
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

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-foreground/80 text-sm font-medium">On Road Price</Label>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-muted-foreground">₹</span>
              <Input
                type="text"
                inputMode="numeric"
                value={(parseInt(marketValue) || 0) === 0 ? "" : marketValue}
                onChange={(e) => {
                  const val = parseInt(e.target.value.replace(/\D/g, "")) || 0;
                  setMarketValue(String(Math.min(val, 10000000)));
                }}
                onBlur={() => {
                  const val = parseInt(marketValue) || 0;
                  const snapped = Math.round(val / 50000) * 50000;
                  setMarketValue(String(Math.max(snapped, 0)));
                }}
                className="w-28 h-8 text-sm bg-secondary/50 border-border/50 text-right tabular-nums"
                placeholder="0"
              />
            </div>
          </div>
          <div className="space-y-3">
            <Slider
              value={[parseInt(marketValue) || 0]}
              onValueChange={([val]) => setMarketValue(String(val))}
              min={0}
              max={10000000}
              step={50000}
              className="w-full"
            />
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">₹0</span>
              <span className="font-semibold text-primary text-base">
                ₹{(parseInt(marketValue) || 0).toLocaleString("en-IN")}
              </span>
              <span className="text-muted-foreground">₹1Cr</span>
            </div>
          </div>
        </div>

        {/* Policy Upload */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Label className="text-foreground/80 text-sm font-medium">Policy PDF</Label>
          </div>

          {policyFile ? (
            <div className="flex items-center gap-3 rounded-xl border border-score-green/30 bg-score-green/5 p-4">
              <FileText className="h-5 w-5 text-score-green shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">{policyFile.name}</p>
              </div>
              <button onClick={() => setPolicyFile(null)} className="text-xs text-muted-foreground hover:text-foreground">Remove</button>
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`border border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${isDragging ? "border-primary bg-primary/5" : "border-border/40 hover:border-primary/40 hover:bg-secondary/20"
                }`}
            >
              <Upload className="mx-auto h-6 w-6 text-muted-foreground mb-2" />
              <p className="text-sm text-foreground/70">Drop your policy PDF here or click to browse</p>
              <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileSelect} />
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button
          disabled={!isValid}
          onClick={handleSubmit}
          className={`w-full h-12 rounded-xl font-semibold text-base transition-all ${isValid ? "bg-primary text-primary-foreground hover:opacity-90" : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
        >
          Reveal My IDV Gap →
        </button>
      </div>
    </div>
  );
};

export default MotorBasicInfoStep;
