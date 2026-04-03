"use client";

import { useState, useEffect } from 'react';
import StudentSignup from './StudentSignup';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface LoginPageProps {
    onLoginSuccess: (user: any) => void;
}

const ACCOUNTS = {
    'user': { id: '3', username: 'user', role: 'user', name: 'Utilisateur', mustChangePassword: false, password: 'user123' },
    'admin': { id: '2', username: 'admin', role: 'admin', name: 'Administrateur', mustChangePassword: false, password: 'admin123' },
    'superadmin': { id: '1', username: 'superadmin', role: 'super_admin', name: 'Super Administrateur', mustChangePassword: false, password: 'super123' }
};

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
    const { login: authLogin } = useAuth();
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

        try {
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: username,
                password: password
            });

            if (authError) {
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
                return;
            }

            if (authData.user) {
                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', authData.user.id)
                    .single();

                let finalUser = userData;

                if (userError) {
                    const { data: newUser, error: insertError } = await supabase.from('users').insert({
                        id: authData.user.id,
                        username: authData.user.email?.split('@')[0] || 'user',
                        email: authData.user.email,
                        role: 'student',
                        name: authData.user.email?.split('@')[0] || 'User',
                        must_change_password: false
                    }).select().single();

                    finalUser = newUser;
                }

                if (finalUser) {
                    localStorage.setItem('currentUser', JSON.stringify(finalUser));
                    await authLogin(username, password);
                    onLoginSuccess(finalUser);
                }
            }
        } catch (err) {
            console.error('Login error:', err);
            setError('Une erreur est survenue lors de la connexion');
        } finally {
            setLoading(false);
        }
    };

    const handleStudentLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setStudentLoading(true);
        setStudentError('');

        if (typeof window !== 'undefined') {
            const systemUsers = JSON.parse(localStorage.getItem('systemUsers') || '[]');
            const systemPasswords = JSON.parse(localStorage.getItem('systemPasswords') || '{}');

            const user = systemUsers.find((u: any) => u.username === studentUsername && u.role === 'student');
            
            if (user && systemPasswords[studentUsername] === studentPassword) {
                localStorage.setItem('currentUser', JSON.stringify(user));
                onLoginSuccess(user);
            } else {
                setStudentError('Nom d\'utilisateur ou mot de passe incorrect');
            }
        }

        setStudentLoading(false);
    };

    const handleStudentSignupSuccess = (studentUser: string, studentPass: string) => {
        setStudentUsername(studentUser);
        setStudentPassword(studentPass);
        setShowStudentLogin(true);
        setShowSignup(false);
    };

    if (showSignup) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4" style={{
                backgroundImage: 'url(/23704.jpg)',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
            }}>
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6">
                        <StudentSignup 
                            onBack={() => setShowSignup(false)} 
                            onSignupSuccess={handleStudentSignupSuccess}
                        />
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex" style={{
            backgroundImage: 'url(/23704.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
        }}>
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

            <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 relative z-10">
                <Card className="w-full max-w-md backdrop-blur-2xl bg-white/95">
                    <CardHeader className="space-y-1">
                        <div className="flex justify-center mb-4">
                            <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z"/>
                                </svg>
                            </div>
                        </div>
                        <CardTitle className="text-2xl text-center">Connexion</CardTitle>
                        <CardDescription className="text-center">
                            {showStudentLogin ? 'Espace Étudiant' : 'Accédez à votre espace'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {showStudentLogin ? (
                            <div className="space-y-4">
                                <Button 
                                    variant="link" 
                                    onClick={() => {
                                        setShowStudentLogin(false);
                                        setStudentUsername('');
                                        setStudentPassword('');
                                        setStudentError('');
                                    }}
                                    className="text-red-600 p-0 mb-4"
                                >
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                    Retour
                                </Button>
                                
                                <form onSubmit={handleStudentLogin} className="space-y-4">
                                    <div>
                                        <Label htmlFor="studentUsername">Nom d'utilisateur</Label>
                                        <Input
                                            id="studentUsername"
                                            type="text"
                                            value={studentUsername}
                                            onChange={(e) => setStudentUsername(e.target.value)}
                                            placeholder="Nom d'utilisateur"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="studentPassword">Mot de passe</Label>
                                        <Input
                                            id="studentPassword"
                                            type={showPassword ? "text" : "password"}
                                            value={studentPassword}
                                            onChange={(e) => setStudentPassword(e.target.value)}
                                            placeholder="Mot de passe"
                                            required
                                        />
                                    </div>

                                    {studentError && (
                                        <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-xl border border-red-200">
                                            {studentError}
                                        </div>
                                    )}

                                    <Button
                                        type="submit"
                                        disabled={studentLoading}
                                        className="w-full"
                                        style={{
                                            background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)'
                                        }}
                                    >
                                        {studentLoading ? 'Connexion...' : 'Se connecter'}
                                    </Button>
                                </form>

                                <div className="mt-4 text-center">
                                    <p className="text-xs sm:text-sm text-gray-600">
                                        Vous n'avez pas encore de compte ?{' '}
                                        <Button
                                            variant="link"
                                            onClick={() => setShowSignup(true)}
                                            className="text-red-600 p-0 h-auto"
                                        >
                                            Inscrivez-vous
                                        </Button>
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="Email"
                                        required
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="password">Mot de passe</Label>
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Mot de passe"
                                        required
                                    />
                                </div>

                                <div className="text-right">
                                    <a href="#" className="text-xs text-red-400 hover:text-red-300">
                                        Mot de passe oublié ?
                                    </a>
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
                                    {loading ? 'Connexion...' : 'Se connecter'}
                                </Button>
                            </form>
                        )}

                        {!showStudentLogin && (
                            <div className="mt-6 text-center space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-px bg-gray-300"></div>
                                    <span className="text-xs text-gray-500">Espace Étudiant</span>
                                    <div className="flex-1 h-px bg-gray-300"></div>
                                </div>
                                <Button
                                    variant="outline"
                                    onClick={() => setShowStudentLogin(true)}
                                    className="w-full border-red-600 text-red-600 hover:bg-red-50"
                                >
                                    Se connecter en tant qu'étudiant
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
