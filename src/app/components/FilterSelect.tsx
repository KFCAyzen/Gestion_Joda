"use client";

import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface FilterOption {
    value: string;
    label: string;
}

interface FilterSelectProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: FilterOption[];
    placeholder?: string;
}

export default function FilterSelect({ label, value, onChange, options, placeholder = "Tous" }: FilterSelectProps) {
    return (
        <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}</Label>
            <Select value={value} onValueChange={(val) => onChange(val ?? "all")}>
                <SelectTrigger className="w-full">
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent className="max-w-none" sideOffset={4}>
                    <SelectItem value="all">{placeholder}</SelectItem>
                    {options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
