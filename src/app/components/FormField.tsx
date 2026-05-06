"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface FormFieldProps {
    label: string;
    id: string;
    type?: "text" | "email" | "number" | "date" | "tel" | "select";
    value: string;
    onChange: (value: string) => void;
    required?: boolean;
    placeholder?: string;
    options?: { value: string; label: string }[];
    disabled?: boolean;
}

export default function FormField({
    label,
    id,
    type = "text",
    value,
    onChange,
    required = false,
    placeholder,
    options,
    disabled = false,
}: FormFieldProps) {
    return (
        <div className="space-y-2">
            <Label htmlFor={id}>
                {label} {required && <span className="text-red-500">*</span>}
            </Label>
            {type === "select" && options ? (
                <Select value={value} onValueChange={(val) => onChange(val || "")} disabled={disabled}>
                    <SelectTrigger>
                        <SelectValue placeholder={placeholder || "Sélectionner"} />
                    </SelectTrigger>
                    <SelectContent>
                        {options.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            ) : (
                <Input
                    id={id}
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    required={required}
                    placeholder={placeholder}
                    disabled={disabled}
                />
            )}
        </div>
    );
}
