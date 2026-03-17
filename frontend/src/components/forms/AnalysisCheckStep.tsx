import React, { useState } from "react";
import { motion } from "framer-motion";
import { Shield, CheckCircle2, AlertCircle, Edit2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DataField {
    label: string;
    name: string;
    value: any;
    type: "text" | "number";
}

interface Props {
    title: string;
    description: string;
    fields: DataField[];
    onConfirm: (data: Record<string, any>) => void;
    onBack: () => void;
}

const AnalysisCheckStep = ({ title, description, fields: initialFields, onConfirm, onBack }: Props) => {
    const [formData, setFormData] = useState<Record<string, any>>(() => {
        const data: Record<string, any> = {};
        initialFields.forEach(f => data[f.name] = f.value);
        return data;
    });

    const [editingField, setEditingField] = useState<string | null>(null);

    const handleUpdate = (name: string, value: any) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="space-y-6">
            <div className="text-center">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Shield className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-foreground">{title}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    {description}
                </p>
            </div>

            <div className="rounded-2xl border border-border/50 bg-card overflow-hidden divide-y divide-border/30">
                {initialFields.map((field) => (
                    <div key={field.name} className="p-4 flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                                {field.label}
                            </Label>
                            {editingField === field.name ? (
                                <div className="flex items-center gap-2 mt-1">
                                    <Input
                                        type={field.type}
                                        value={formData[field.name] || ""}
                                        onChange={(e) => handleUpdate(field.name, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                                        className="h-9 focus:ring-1"
                                        autoFocus
                                    />
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-9 w-9 text-score-green"
                                        onClick={() => setEditingField(null)}
                                    >
                                        <Check className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <p className="text-base font-medium text-foreground truncate mt-0.5">
                                    {field.type === 'number' && typeof formData[field.name] === 'number'
                                        ? `₹${formData[field.name].toLocaleString('en-IN')}`
                                        : (formData[field.name] || "—")
                                    }
                                </p>
                            )}
                        </div>

                        {editingField !== field.name && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
                                onClick={() => setEditingField(field.name)}
                            >
                                <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                        )}
                    </div>
                ))}
            </div>

            <div className="flex items-center gap-2 px-1 text-xs text-amber-500 bg-amber-500/5 p-3 rounded-lg border border-amber-500/10">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <p>Please ensure these values match your policy document for an accurate audit.</p>
            </div>

            <div className="flex flex-col gap-3">
                <Button
                    className="w-full h-12 text-base font-semibold"
                    onClick={() => onConfirm(formData)}
                >
                    Confirm & Generate Report
                </Button>
                <Button
                    variant="ghost"
                    className="w-full h-10 text-muted-foreground font-medium"
                    onClick={onBack}
                >
                    Go Back
                </Button>
            </div>
        </div>
    );
};

export default AnalysisCheckStep;
