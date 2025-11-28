"use client";

import { useState } from "react";
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { auth } from "../firebase";

interface ChangePasswordProps {
    onClose: () => void;
}

export default function ChangePassword({ onClose }: ChangePasswordProps) {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (newPassword !== confirmPassword) {
            alert("Les nouveaux mots de passe ne correspondent pas");
            return;
        }

        if (newPassword.length < 6) {
            alert("Le nouveau mot de passe doit contenir au moins 6 caractères");
            return;
        }

        setLoading(true);
        try {
            const user = auth.currentUser;
            if (!user || !user.email) {
                alert("Utilisateur non connecté");
                return;
            }

            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, newPassword);
            
            alert("Mot de passe modifié avec succès");
            onClose();
        } catch (error: any) {
            console.error("Erreur:", error);
            if (error.code === "auth/wrong-password") {
                alert("Mot de passe actuel incorrect");
            } else {
                alert("Erreur lors de la modification du mot de passe");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md">
                <h2 className="text-lg sm:text-xl font-bold mb-4" style={{color: '#dc2626'}}>
                    Modifier le mot de passe
                </h2>
                
                <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Mot de passe actuel</label>
                        <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            required
                            className="w-full p-2 sm:p-3 border rounded text-sm sm:text-base"
                            style={{borderColor: '#dc2626'}}
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium mb-1">Nouveau mot de passe</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            className="w-full p-2 sm:p-3 border rounded text-sm sm:text-base"
                            style={{borderColor: '#dc2626'}}
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium mb-1">Confirmer le nouveau mot de passe</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            className="w-full p-2 sm:p-3 border rounded text-sm sm:text-base"
                            style={{borderColor: '#dc2626'}}
                        />
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2 pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 text-white rounded text-sm sm:text-base font-medium"
                            style={{backgroundColor: '#dc2626'}}
                        >
                            {loading ? "Modification..." : "Modifier"}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border rounded text-sm sm:text-base"
                            style={{borderColor: '#dc2626', color: '#dc2626'}}
                        >
                            Annuler
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}