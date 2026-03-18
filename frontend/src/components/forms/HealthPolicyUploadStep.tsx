import { useState, useRef, useEffect } from "react";
import { captureLead, uploadInsuranceFile } from "@/services/leadApi";
import { motion } from "framer-motion";
import { Upload, FileText, Shield, User, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProtectionCheck } from "@/context/ProtectionCheckContext";

interface Props {
  onContinue: (name: string, phone: string) => void;
}

const HealthPolicyUploadStep = ({ onContinue }: Props) => {
  const { uploadPolicy } = useProtectionCheck();
  const [isDragging, setIsDragging] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isValid = name.trim().length > 0 && phone.length >= 10 && selectedFile !== null;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.type === "application/pdf") {
      setSelectedFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSubmit = async () => {
    if (!isValid || !selectedFile) return;

    // Capture Lead
    captureLead({
      name: name.trim(),
      phone: phone.trim(),
      tool_type: "health"
    });

    // Upload to local insurance API
    uploadInsuranceFile(phone.trim(), selectedFile);

    uploadPolicy(selectedFile, name.trim(), phone.trim());
    onContinue(name.trim(), phone.trim());
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Shield className="h-12 w-12 text-primary mx-auto mb-3" />
        <h2 className="text-xl font-bold text-foreground">Let's audit your health insurance.</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Upload your policy and tell us a bit about yourself to get started.
        </p>
      </div>

      {/* Name & Phone */}
      <div className="space-y-4">
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
          <Label className="text-foreground/80 text-sm font-medium">Phone Number</Label>
          <Input
            type="tel"
            placeholder="e.g., 9876543210"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
            className="mt-1.5 h-12 bg-secondary/50 border-border/50 focus:border-primary"
          />
        </div>
      </div>

      {/* Policy Upload */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${isDragging || selectedFile
          ? "border-primary bg-primary/5"
          : "border-border/50 hover:border-primary/40 hover:bg-secondary/20"
          }`}
      >
        {selectedFile ? (
          <>
            <FileText className="h-8 w-8 text-primary mx-auto mb-2" />
            <p className="text-foreground font-medium text-sm">{selectedFile.name}</p>
            <p className="text-muted-foreground text-xs mt-1">Click to change file</p>
          </>
        ) : (
          <>
            <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-foreground font-medium text-sm">Upload your policy PDF</p>
            <p className="text-muted-foreground text-xs mt-1">Drop here or click to browse</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>


      <div className="flex gap-3">
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
    </div>
  );
};

export default HealthPolicyUploadStep;
