"use client";

interface StudentStatsCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    bgColor: string;
}

export default function StudentStatsCard({ title, value, icon, bgColor }: StudentStatsCardProps) {
    return (
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 md:p-6 border border-gray-200">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs sm:text-sm text-gray-600">{title}</p>
                    <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{value}</p>
                </div>
                <div className={`w-6 h-6 sm:w-8 sm:h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 ${bgColor} rounded-lg flex items-center justify-center`}>
                    {icon}
                </div>
            </div>
        </div>
    );
}
