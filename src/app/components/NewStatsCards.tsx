import { formatPrice } from "../utils/formatPrice";

interface NewStatsCardsProps {
    dashboardData: any;
}

export default function NewStatsCards({ dashboardData }: NewStatsCardsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
            {/* Nombre d'étudiants */}
            <div className="glass-card p-6 hover:scale-105 transition-all duration-300 group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-full -mr-10 -mt-10"></div>
                <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                            </svg>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-bold text-gray-900">{dashboardData.totalStudents}</div>
                            <div className="text-xs text-blue-600 font-medium">+12%</div>
                        </div>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-1">Étudiants</h3>
                    <p className="text-xs text-gray-500">Total inscrits</p>
                </div>
            </div>

            {/* Étudiants en retard de paiement */}
            <div className="glass-card p-6 hover:scale-105 transition-all duration-300 group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-full -mr-10 -mt-10"></div>
                <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-bold text-gray-900">8</div>
                            <div className="text-xs text-red-600 font-medium">-3%</div>
                        </div>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-1">Retards</h3>
                    <p className="text-xs text-gray-500">Paiements en retard</p>
                </div>
            </div>

            {/* Documents manquants */}
            <div className="glass-card p-6 hover:scale-105 transition-all duration-300 group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-full -mr-10 -mt-10"></div>
                <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-bold text-gray-900">5</div>
                            <div className="text-xs text-orange-600 font-medium">-2</div>
                        </div>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-1">Documents</h3>
                    <p className="text-xs text-gray-500">Manquants</p>
                </div>
            </div>

            {/* Paiements reçus */}
            <div className="glass-card p-6 hover:scale-105 transition-all duration-300 group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-full -mr-10 -mt-10"></div>
                <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-bold text-gray-900">{formatPrice(dashboardData.todayRevenue.toString())}</div>
                            <div className="text-xs text-green-600 font-medium">+18%</div>
                        </div>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-1">Paiements</h3>
                    <p className="text-xs text-gray-500">Reçus aujourd'hui</p>
                </div>
            </div>

            {/* Suivi cours de langues */}
            <div className="glass-card p-6 hover:scale-105 transition-all duration-300 group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-full -mr-10 -mt-10"></div>
                <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-bold text-gray-900">24</div>
                            <div className="text-xs text-purple-600 font-medium">85%</div>
                        </div>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-1">Cours HSK</h3>
                    <p className="text-xs text-gray-500">Étudiants actifs</p>
                </div>
            </div>

            {/* Comptabilité */}
            <div className="glass-card p-6 hover:scale-105 transition-all duration-300 group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-indigo-500/20 to-indigo-600/20 rounded-full -mr-10 -mt-10"></div>
                <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-bold text-gray-900">92%</div>
                            <div className="text-xs text-indigo-600 font-medium">+5%</div>
                        </div>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-1">Comptabilité</h3>
                    <p className="text-xs text-gray-500">Santé financière</p>
                </div>
            </div>
        </div>
    );
}