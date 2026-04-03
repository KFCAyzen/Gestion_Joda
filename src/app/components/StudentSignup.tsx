"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

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
                <Button variant="link" onClick={onBack} className="text-red-600 mb-4 p-0">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Retour
                </Button>
                <h2 className="text-xl lg:text-2xl font-light mb-1 lg:mb-2">Créer un compte étudiant</h2>
                <p className="text-gray-600 text-sm lg:text-base">Inscrivez-vous pour accéder au portail</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <Label htmlFor="name">Nom complet</Label>
                    <Input
                        id="name"
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="Nom complet"
                        required
                    />
                </div>

                <div>
                    <Label htmlFor="username">Nom d'utilisateur</Label>
                    <Input
                        id="username"
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({...formData, username: e.target.value})}
                        placeholder="Nom d'utilisateur"
                        required
                    />
                </div>

                <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        placeholder="Email"
                        required
                    />
                </div>

                <div>
                    <Label htmlFor="password">Mot de passe</Label>
                    <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        placeholder="Mot de passe"
                        required
                    />
                </div>

                <div>
                    <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                    <Input
                        id="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                        placeholder="Confirmer le mot de passe"
                        required
                    />
                </div>

                {error && (
                    <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-xl border border-red-200">
                        {error}
                    </div>
                )}

                <Button
                    type="submit"
                    disabled={loading}
                    className="w-full"
                    style={{
                        background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)'
                    }}
                >
                    {loading ? 'Inscription...' : 'S\'inscrire'}
                </Button>
            </form>
        </div>
    );
}
