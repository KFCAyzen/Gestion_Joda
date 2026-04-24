"use client";

import { useState, useEffect } from "react";

interface LoginProps {
    onLogin: () => void;
    showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function Login({ onLogin, showNotification }: LoginProps) {
    const [formData, setFormData] = useState({
        username: '',
        password: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.username || !formData.password) {
            showNotification("Veuillez remplir tous les champs", "error");
            return;
        }

        // Identifiants par défaut (à remplacer par une vraie authentification)
        if (formData.username === "admin" && formData.password === "admin123") {
            showNotification("Connexion réussie!", "success");
            onLogin();
        } else {
            showNotification("Identifiants incorrects", "error");
        }
    };

    return (
        <div className="min-h-screen flex" style={{
            backgroundImage: 'url(/23704.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
        }}>
            {/* Left Side - Content */}
            <div className="hidden lg:flex lg:w-1/2 relative z-10">
                <div className="flex flex-col justify-center items-center p-12 text-center">
                    <div className="mb-8">
                        <img 
                            src="/3353.jpg" 
                            alt="Étudiant souriant" 
                            className="w-80 h-80 object-cover rounded-full shadow-2xl border-8 border-white/20"
                        />
                    </div>
                    <h2 className="text-4xl font-bold text-white mb-4 drop-shadow-2xl">
                        Réalisez vos rêves d'études en Chine
                    </h2>
                    <p className="text-xl text-white/90 max-w-md leading-relaxed drop-shadow-lg">
                        Joda Company vous accompagne dans votre parcours vers l'excellence académique
                    </p>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative z-10">
                <div className="w-full max-w-md backdrop-blur-2xl rounded-2xl p-8 border border-white/20 shadow-2xl">
                    {/* Logo and Header */}
                    <div className="text-center mb-10">
                        <div className="flex justify-center mb-6">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-red-500/80 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg border border-white/20">
                                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z"/>
                                    <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 8c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" fill="white"/>
                                </svg>
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">
                            Connexion
                        </h1>
                        <p className="text-white/80 drop-shadow-md">
                            Accédez à votre espace Joda Company
                        </p>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-2 sm:space-y-3 md:space-y-4 md:space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-white/90 mb-2 drop-shadow-md">
                                Nom d'utilisateur
                            </label>
                            <input
                                type="text"
                                value={formData.username}
                                onChange={(e) => setFormData({...formData, username: e.target.value})}
                                className="w-full px-4 py-3 border border-white/30 rounded-lg focus:ring-2 focus:ring-red-400 focus:border-red-400 transition-colors bg-white/20 backdrop-blur-sm focus:bg-white/30 text-white placeholder-white/60"
                                placeholder="admin"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white/90 mb-2 drop-shadow-md">
                                Mot de passe
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={formData.password}
                                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                                    className="w-full px-4 py-3 pr-12 border border-white/30 rounded-lg focus:ring-2 focus:ring-red-400 focus:border-red-400 transition-colors bg-white/20 backdrop-blur-sm focus:bg-white/30 text-white placeholder-white/60"
                                    placeholder="admin123"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-red-300 transition-colors"
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
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <input
                                    id="remember-me"
                                    name="remember-me"
                                    type="checkbox"
                                    className="h-4 w-4 text-red-400 focus:ring-red-400 border-white/30 rounded bg-white/20"
                                />
                                <label htmlFor="remember-me" className="ml-2 block text-sm text-white/80">
                                    Se souvenir de moi
                                </label>
                            </div>
                            <div className="text-sm">
                                <a href="#" className="font-medium text-white/80 hover:text-red-300">
                                    Mot de passe oublié ?
                                </a>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full flex justify-center py-2 px-3 sm:py-3 sm:px-4 border border-white/20 rounded-lg shadow-lg text-sm font-medium text-white bg-red-500/80 backdrop-blur-sm hover:bg-red-600/80 focus:outline-none focus:ring-2 focus:ring-red-400 transition-all duration-200"
                        >
                            Se connecter
                        </button>
                    </form>

                    {/* Test Credentials */}
                    <div className="mt-8 p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                        <p className="text-sm font-medium text-white/90 mb-2">Identifiants de test :</p>
                        <div className="space-y-1">
                            <p className="text-xs text-white/70">Utilisateur: <span className="font-mono bg-white/20 px-2 py-1 rounded text-white">admin</span></p>
                            <p className="text-xs text-white/70">Mot de passe: <span className="font-mono bg-white/20 px-2 py-1 rounded text-white">admin123</span></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}