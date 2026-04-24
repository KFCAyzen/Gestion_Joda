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
    const [showStudentLogin, setShowStudentLogin] = useState(false);
    const [studentUsername, setStudentUsername] = useState('');
    const [studentPassword, setStudentPassword] = useState('');
    const [studentError, setStudentError] = useState('');
    const [studentLoading, setStudentLoading] = useState(false);

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
                        if (user.role === 'student') {
                            setError('Les étudiants doivent utiliser l\'espace étudiant');
                            setLoading(false);
                            return;
                        }
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

    const handleStudentLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setStudentLoading(true);
        setStudentError('');

        if (typeof window !== 'undefined') {
            const systemUsers = localStorage.getItem('systemUsers');
            const systemPasswords = localStorage.getItem('systemPasswords');
            
            if (systemUsers && systemPasswords) {
                try {
                    const users = JSON.parse(systemUsers);
                    const passwords = JSON.parse(systemPasswords);
                    
                    const user = users.find((u: any) => u.username === studentUsername && u.role === 'student');
                    if (user && passwords[studentUsername] === studentPassword) {
                        localStorage.setItem('currentUser', JSON.stringify(user));
                        onLoginSuccess(user);
                        setStudentLoading(false);
                        return;
                    }
                } catch (e) {
                    console.error('Error parsing auth data:', e);
                }
            }
            setStudentError('Nom d\'utilisateur ou mot de passe incorrect');
        }
        setStudentLoading(false);
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-black" style={{
            touchAction: 'none'
        }}>
            <img 
                src="/3353.jpg" 
                alt="Background" 
                className="absolute inset-0 w-full h-full object-cover"
                loading="eager"
                style={{ imageRendering: 'auto' }}
            />
            <div className="absolute inset-0 bg-black/70"></div>

            <div className="relative w-full h-full sm:w-[90vw] sm:h-[85vh] lg:w-[80vw] lg:h-[75vh] max-w-5xl">
                <div className="relative w-full h-full sm:rounded-2xl overflow-hidden" style={{
                    background: 'rgba(0, 0, 0, 0.8)',
                    backdropFilter: 'blur(40px) saturate(180%)',
                    border: '1px solid rgba(220, 38, 38, 0.3)',
                    boxShadow: '0 50px 100px rgba(0, 0, 0, 0.8), 0 0 50px rgba(220, 38, 38, 0.2), inset 0 1px 0 rgba(220, 38, 38, 0.1)'
                }}>
                    <div className="flex flex-col lg:grid lg:grid-cols-[1.2fr_1fr] h-full">
                        <div className={`relative h-[35vh] sm:h-2/5 lg:h-full overflow-hidden ${showSignup || showStudentLogin ? 'hidden lg:block' : ''}`}>
                            <img 
                                src="/23704.jpg" 
                                alt="Login visual" 
                                className="absolute inset-0 w-full h-full object-cover"
                                loading="lazy"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center px-4">
                                    <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 sm:w-20 sm:h-20 lg:w-28 lg:h-28 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 lg:mb-6" style={{
                                        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5), 0 0 20px rgba(220, 38, 38, 0.3)'
                                    }}>
                                        <img src="/0.png" alt="Joda Company Logo" className="w-10 h-10 sm:w-12 sm:h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 object-contain" />
                                    </div>
                                    <h1 className="text-xl sm:text-xl lg:text-3xl font-bold tracking-wider text-black">Joda Company</h1>
                                    <p className="text-sm sm:text-sm lg:text-lg font-semibold text-black">Gestion des bourses</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col justify-center p-6 sm:p-4 lg:p-4 sm:p-6 md:p-8 text-gray-900 flex-1 overflow-y-auto" style={{
                            background: 'rgba(255, 255, 255, 0.95)',
                            backdropFilter: 'blur(20px)'
                        }}>
                            {showSignup ? (
                                <StudentSignup 
                                    onBack={() => {
                                        setShowSignup(false);
                                        setShowStudentLogin(true);
                                    }}
                                    onSignupSuccess={(user, pass) => {
                                        setStudentUsername(user);
                                        setStudentPassword(pass);
                                        setShowSignup(false);
                                        setShowStudentLogin(true);
                                    }}
                                />
                            ) : showStudentLogin ? (
                            <div className="max-w-sm mx-auto w-full">
                                <div className="mb-6 sm:mb-4 lg:mb-8">
                                    <button 
                                        onClick={() => {
                                            setShowStudentLogin(false);
                                            setStudentUsername('');
                                            setStudentPassword('');
                                            setStudentError('');
                                        }}
                                        className="text-red-600 hover:text-red-700 mb-4 flex items-center gap-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                        Retour
                                    </button>
                                    <h2 className="text-2xl sm:text-xl lg:text-2xl font-light mb-2 lg:mb-2">Espace Étudiant</h2>
                                    <p className="text-gray-600 text-sm sm:text-sm lg:text-base">Connectez-vous à votre compte</p>
                                </div>

                                <form onSubmit={handleStudentLogin} className="space-y-2 sm:space-y-3 md:space-y-4 sm:space-y-2 sm:space-y-3 md:space-y-4 lg:space-y-3 sm:space-y-2 sm:space-y-3 md:space-y-4 md:space-y-6">
                                    <div>
                                        <input
                                            type="text"
                                            value={studentUsername}
                                            onChange={(e) => setStudentUsername(e.target.value)}
                                            className="w-full px-4 py-3 text-base bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all text-gray-900 placeholder-gray-500"
                                            placeholder="Nom d'utilisateur"
                                            required
                                        />
                                    </div>

                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={studentPassword}
                                            onChange={(e) => setStudentPassword(e.target.value)}
                                            className="w-full px-4 py-3 pr-12 text-base bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all text-gray-900 placeholder-gray-500"
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

                                    {studentError && (
                                        <div className="text-red-400 text-sm text-center bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                                            {studentError}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={studentLoading}
                                        className="w-full py-2 px-3 sm:py-3 sm:px-4 text-base rounded-xl font-medium text-white transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                        style={{
                                            background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)'
                                        }}
                                    >
                                        {studentLoading ? 'Connexion...' : 'Se connecter'}
                                    </button>
                                </form>

                                <div className="mt-6 text-center">
                                    <p className="text-xs sm:text-sm text-gray-600">
                                        Vous n'avez pas encore de compte ?{' '}
                                        <button
                                            onClick={() => setShowSignup(true)}
                                            className="text-red-600 font-medium hover:text-red-700 transition-colors"
                                        >
                                            Inscrivez-vous
                                        </button>
                                    </p>
                                </div>
                            </div>
                            ) : (
                            <div className="max-w-sm mx-auto w-full">
                                <div className="mb-3 sm:mb-6 lg:mb-8">
                                    <h2 className="text-lg sm:text-2xl lg:text-3xl font-light mb-1 sm:mb-2">Connexion</h2>
                                    <p className="text-gray-600 text-xs sm:text-sm lg:text-base">Accédez à votre espace</p>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-2.5 sm:space-y-4 lg:space-y-5">
                                    <div>
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            className="w-full px-3 py-1.5 sm:px-4 sm:py-3 lg:py-3.5 text-sm sm:text-base lg:text-base bg-gray-50 border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all text-gray-900 placeholder-gray-500"
                                            placeholder="Nom d'utilisateur"
                                            required
                                        />
                                    </div>

                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full px-3 py-1.5 sm:px-4 sm:py-3 lg:py-3.5 pr-10 sm:pr-12 text-sm sm:text-base lg:text-base bg-gray-50 border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all text-gray-900 placeholder-gray-500"
                                            placeholder="Mot de passe"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-2.5 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-red-500 transition-colors"
                                        >
                                            {showPassword ? (
                                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                                </svg>
                                            ) : (
                                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>

                                    <div className="text-right">
                                        <a href="#" className="text-xs sm:text-sm text-red-400 hover:text-red-300">
                                            Mot de passe oublié ?
                                        </a>
                                    </div>
                                    


                                    {error && (
                                        <div className="text-red-400 text-xs sm:text-sm text-center bg-red-500/10 p-1.5 sm:p-3 rounded-lg sm:rounded-xl border border-red-500/20">
                                            {error}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full py-1.5 sm:py-3 lg:py-3.5 px-4 text-sm sm:text-base lg:text-base rounded-lg sm:rounded-xl font-medium text-white transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                        style={{
                                            background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)'
                                        }}
                                    >
                                        {loading ? 'Connexion...' : 'Se connecter'}
                                    </button>
                                </form>

                                <div className="mt-3 sm:mt-6 lg:mt-8 text-center space-y-2 sm:space-y-3">
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-px bg-gray-300"></div>
                                        <span className="text-xs sm:text-sm text-gray-500">Espace Étudiant</span>
                                        <div className="flex-1 h-px bg-gray-300"></div>
                                    </div>
                                    <button
                                        onClick={() => setShowStudentLogin(true)}
                                        className="w-full py-1.5 sm:py-2.5 lg:py-3 px-3 sm:px-4 text-xs sm:text-sm lg:text-base rounded-lg sm:rounded-xl font-medium text-red-600 border-2 border-red-600 hover:bg-red-50 transition-all duration-300 whitespace-nowrap"
                                    >
                                        Se connecter en tant qu'étudiant
                                    </button>
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