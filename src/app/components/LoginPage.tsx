"use client";

import { useState, useEffect } from 'react';
import StudentSignup from './StudentSignup';

interface LoginPageProps {
    onLoginSuccess: (user: any) => void;
}

const ACCOUNTS = {
    'user': { id: '3', username: 'user', role: 'user', name: 'Utilisateur', mustChangePassword: false, password: 'user123' },
    'admin': { id: '2', username: 'admin', role: 'admin', name: 'Administrateur', mustChangePassword: false, password: 'admin123' },
    'superadmin': { id: '1', username: 'superadmin', role: 'super_admin', name: 'Super Administrateur', mustChangePassword: false, password: 'super123' }
};

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showSignup, setShowSignup] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (typeof window !== 'undefined') {
            const systemUsers = localStorage.getItem('systemUsers');
            const systemPasswords = localStorage.getItem('systemPasswords');
            
            if (systemUsers && systemPasswords) {
                try {
                    const users = JSON.parse(systemUsers);
                    const passwords = JSON.parse(systemPasswords);
                    
                    const user = users.find((u: any) => u.username === username);
                    if (user && passwords[username] === password) {
                        localStorage.setItem('currentUser', JSON.stringify(user));
                        onLoginSuccess(user);
                        setLoading(false);
                        return;
                    }
                } catch (e) {
                    console.error('Error parsing auth data:', e);
                }
            }
            
            // Fallback aux comptes par défaut
            const account = ACCOUNTS[username as keyof typeof ACCOUNTS];
            if (account && account.password === password) {
                const { password: _, ...userWithoutPassword } = account;
                localStorage.setItem('currentUser', JSON.stringify(userWithoutPassword));
                onLoginSuccess(userWithoutPassword);
            } else {
                setError('Nom d\'utilisateur ou mot de passe incorrect');
            }
        }
        setLoading(false);
    };

    useEffect(() => {
        if (typeof window !== 'undefined') {
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.width = '100%';
            document.body.style.height = '100%';
            
            return () => {
                document.body.style.overflow = '';
                document.body.style.position = '';
                document.body.style.width = '';
                document.body.style.height = '';
            };
        }
    }, []);

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden" style={{
            backgroundImage: 'url(/3353.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            touchAction: 'none'
        }}>
            <div className="absolute inset-0 bg-black/70"></div>

            <div className="relative w-[95vw] h-[90vh] sm:w-[90vw] sm:h-[85vh] lg:w-[80vw] lg:h-[75vh] max-w-5xl">
                <div className="relative w-full h-full rounded-2xl overflow-hidden" style={{
                    background: 'rgba(0, 0, 0, 0.8)',
                    backdropFilter: 'blur(40px) saturate(180%)',
                    border: '1px solid rgba(220, 38, 38, 0.3)',
                    boxShadow: '0 50px 100px rgba(0, 0, 0, 0.8), 0 0 50px rgba(220, 38, 38, 0.2), inset 0 1px 0 rgba(220, 38, 38, 0.1)'
                }}>
                    <div className="flex flex-col lg:grid lg:grid-cols-2 h-full">
                        <div className="relative h-2/5 lg:h-full" style={{
                            backgroundImage: 'url(/23704.jpg)',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                        }}>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center px-4">
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-28 lg:h-28 bg-white rounded-2xl flex items-center justify-center mx-auto mb-2 sm:mb-4 lg:mb-6" style={{
                                        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5), 0 0 20px rgba(220, 38, 38, 0.3)'
                                    }}>
                                        <img src="/0.png" alt="Joda Company Logo" className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 object-contain" />
                                    </div>
                                    <h1 className="text-lg sm:text-xl lg:text-3xl font-bold tracking-wider text-black">Joda Company</h1>
                                    <p className="text-xs sm:text-sm lg:text-lg font-semibold text-black">Gestion des bourses</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col justify-center p-4 lg:p-8 text-gray-900 flex-1" style={{
                            background: 'rgba(255, 255, 255, 0.95)',
                            backdropFilter: 'blur(20px)'
                        }}>
                            {showSignup ? (
                                <StudentSignup 
                                    onBack={() => setShowSignup(false)}
                                    onSignupSuccess={(user, pass) => {
                                        setUsername(user);
                                        setPassword(pass);
                                        setShowSignup(false);
                                    }}
                                />
                            ) : (
                            <div className="max-w-sm mx-auto w-full">
                                <div className="mb-4 lg:mb-8">
                                    <h2 className="text-xl lg:text-2xl font-light mb-1 lg:mb-2">Connexion</h2>
                                    <p className="text-gray-600 text-sm lg:text-base">Accédez à votre espace</p>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-6">
                                    <div>
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all text-gray-900 placeholder-gray-500"
                                            placeholder="Nom d'utilisateur"
                                            required
                                        />
                                    </div>

                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all text-gray-900 placeholder-gray-500"
                                            placeholder="Mot de passe"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-red-500 transition-colors"
                                        >
                                            {showPassword ? (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                                </svg>
                                            ) : (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>

                                    <div className="text-right">
                                        <a href="#" className="text-sm text-red-400 hover:text-red-300">
                                            Mot de passe oublié ?
                                        </a>
                                    </div>
                                    


                                    {error && (
                                        <div className="text-red-400 text-sm text-center bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                                            {error}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full py-3 px-4 rounded-xl font-medium text-white transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                        style={{
                                            background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)'
                                        }}
                                    >
                                        {loading ? 'Connexion...' : 'Se connecter'}
                                    </button>
                                </form>

                                <div className="mt-6 text-center space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 h-px bg-gray-300"></div>
                                        <span className="text-xs text-gray-500">Espace Étudiant</span>
                                        <div className="flex-1 h-px bg-gray-300"></div>
                                    </div>
                                    <button
                                        onClick={() => setShowSignup(true)}
                                        className="w-full py-2.5 px-4 rounded-xl font-medium text-red-600 border-2 border-red-600 hover:bg-red-50 transition-all duration-300"
                                    >
                                        Se connecter en tant qu'étudiant
                                    </button>
                                    <p className="text-xs text-gray-500">Pas encore de compte ? Créez-en un gratuitement</p>
                                </div>
                            </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}