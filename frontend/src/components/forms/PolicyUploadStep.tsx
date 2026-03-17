import { Upload, FileText, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef } from "react";

interface Props {
  file: File | null;
  onFileChange: (file: File | null) => void;
}

const PolicyUploadStep = ({ file, onFileChange }: Props) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.type === "application/pdf") {
      onFileChange(droppedFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) onFileChange(selected);
  };

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Upload your existing insurance policy PDF so we can analyze your current coverage.
      </p>

      {!file ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border/60 hover:border-primary/50 hover:bg-secondary/30"
          }`}
        >
          <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-foreground font-medium">Drop your policy PDF here</p>
          <p className="text-muted-foreground text-sm mt-1">or click to browse files</p>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      ) : (
        <div className="border border-border/60 rounded-xl p-5 bg-secondary/20">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-foreground font-medium truncate">{file.name}</p>
              <p className="text-muted-foreground text-xs flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="h-3 w-3 text-score-green" />
                Uploaded successfully
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onFileChange(null)}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <p className="text-muted-foreground text-xs">
        Your document is processed securely and is never stored or shared.
      </p>
    </div>
  );
};

export default PolicyUploadStep;
