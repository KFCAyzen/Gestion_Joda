"use client";

import { useState } from 'react';

interface StudentSignupProps {
    onBack: () => void;
    onSignupSuccess: (username: string, password: string) => void;
}

export default function StudentSignup({ onBack, onSignupSuccess }: StudentSignupProps) {
    const [formData, setFormData] = useState({
        name: '',
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (formData.password !== formData.confirmPassword) {
            setError('Les mots de passe ne correspondent pas');
            setLoading(false);
            return;
        }

        if (formData.password.length < 6) {
            setError('Le mot de passe doit contenir au moins 6 caractères');
            setLoading(false);
            return;
        }

        if (typeof window !== 'undefined') {
            const existingUsers = JSON.parse(localStorage.getItem('systemUsers') || '[]');
            const existingPasswords = JSON.parse(localStorage.getItem('systemPasswords') || '{}');

            if (existingUsers.find((u: { username: string }) => u.username === formData.username)) {
                setError('Ce nom d\'utilisateur existe déjà');
                setLoading(false);
                return;
            }

            const newUser = {
                id: Date.now().toString(),
                username: formData.username,
                role: 'student',
                name: formData.name,
                email: formData.email,
                mustChangePassword: false
            };

            existingUsers.push(newUser);
            existingPasswords[formData.username] = formData.password;

            localStorage.setItem('systemUsers', JSON.stringify(existingUsers));
            localStorage.setItem('systemPasswords', JSON.stringify(existingPasswords));

            onSignupSuccess(formData.username, formData.password);
        }

        setLoading(false);
    };

    return (
        <div className="max-w-sm mx-auto w-full">
            <div className="mb-4 lg:mb-8">
                <button onClick={onBack} className="text-red-600 hover:text-red-700 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Retour
                </button>
                <h2 className="text-xl lg:text-2xl font-light mb-1 lg:mb-2">Créer un compte étudiant</h2>
                <p className="text-gray-600 text-sm lg:text-base">Inscrivez-vous pour accéder au portail</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-3 md:space-y-4">
                <div>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all text-gray-900 placeholder-gray-500"
                        placeholder="Nom complet"
                        required
                    />
                </div>

                <div>
                    <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({...formData, username: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all text-gray-900 placeholder-gray-500"
                        placeholder="Nom d'utilisateur"
                        required
                    />
                </div>

                <div>
                    <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all text-gray-900 placeholder-gray-500"
                        placeholder="Email"
                        required
                    />
                </div>

                <div>
                    <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all text-gray-900 placeholder-gray-500"
                        placeholder="Mot de passe"
                        required
                    />
                </div>

                <div>
                    <input
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all text-gray-900 placeholder-gray-500"
                        placeholder="Confirmer le mot de passe"
                        required
                    />
                </div>

                {error && (
                    <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-xl border border-red-200">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 px-3 sm:py-3 sm:px-4 rounded-xl font-medium text-white transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                        background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)'
                    }}
                >
                    {loading ? 'Inscription...' : 'S\'inscrire'}
                </button>
            </form>
        </div>
    );
}
