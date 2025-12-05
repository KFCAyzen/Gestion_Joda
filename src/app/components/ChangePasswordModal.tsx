"use client";

import { useState, useEffect } from 'react';


interface ChangePasswordModalProps {
    onPasswordChanged: () => void;
}

export default function ChangePasswordModal({ onPasswordChanged }: ChangePasswordModalProps) {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);
    

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (newPassword.length < 6) {
            setError('Le mot de passe doit contenir au moins 6 caractères');
            setLoading(false);
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Les mots de passe ne correspondent pas');
            setLoading(false);
            return;
        }

        if (newPassword === 'temp123') {
            setError('Vous ne pouvez pas utiliser le mot de passe temporaire');
            setLoading(false);
            return;
        }

        const success = await changePassword(newPassword);
        if (success) {
            onPasswordChanged();
        } else {
            setError('Erreur lors du changement de mot de passe');
        }
        setLoading(false);
    };

    return (
        <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center overflow-hidden" style={{zIndex: 9999, backdropFilter: 'blur(10px)', background: 'rgba(255, 255, 255, 0.1)'}}>
            <div className="bg-white/90 backdrop-blur-md rounded-xl p-8 w-full max-w-md shadow-2xl transform transition-all duration-300 scale-100 border border-white/20">
                <div className="text-center mb-6">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold mb-2" style={{color: '#dc2626'}}>
                        Changement de Mot de Passe Requis
                    </h2>
                    <p className="text-gray-600">
                        Bonjour {user?.name}, vous devez changer votre mot de passe temporaire avant de continuer.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-3 md:space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2" style={{color: '#dc2626'}}>
                            Nouveau mot de passe
                        </label>
                        {mounted ? (
                            <div className="relative">
                                <input
                                    type={showNewPassword ? "text" : "password"}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full p-3 pr-12 border rounded-lg focus:outline-none focus:ring-2"
                                    style={{borderColor: '#dc2626'}}
                                    placeholder="Minimum 6 caractères"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 hover:opacity-70 transition-opacity"
                                    style={{color: '#dc2626'}}
                                >
                                    {showNewPassword ? (
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
                        ) : (
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2"
                                style={{borderColor: '#dc2626'}}
                                placeholder="Minimum 6 caractères"
                                required
                            />
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2" style={{color: '#dc2626'}}>
                            Confirmer le mot de passe
                        </label>
                        {mounted ? (
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full p-3 pr-12 border rounded-lg focus:outline-none focus:ring-2"
                                    style={{borderColor: '#dc2626'}}
                                    placeholder="Retapez le mot de passe"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 hover:opacity-70 transition-opacity"
                                    style={{color: '#dc2626'}}
                                >
                                    {showConfirmPassword ? (
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
                        ) : (
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2"
                                style={{borderColor: '#dc2626'}}
                                placeholder="Retapez le mot de passe"
                                required
                            />
                        )}
                    </div>

                    {error && (
                        <div className="text-red-600 text-sm bg-red-50 p-3 rounded">
                            {error}
                        </div>
                    )}

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800">
                            <strong>Mot de passe temporaire actuel :</strong> temp123
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2 px-3 sm:py-3 sm:px-4 rounded-lg text-white font-medium hover:opacity-90 disabled:opacity-50"
                        style={{backgroundColor: '#dc2626'}}
                    >
                        {loading ? 'Changement...' : 'Changer le mot de passe'}
                    </button>
                </form>
            </div>
        </div>
    );
}