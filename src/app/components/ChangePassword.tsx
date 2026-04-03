"use client";

import { useState } from "react";
import { supabase } from "../supabase";
import { useNotificationContext } from "../context/NotificationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ChangePasswordProps {
    onClose: () => void;
}

export default function ChangePassword({ onClose }: ChangePasswordProps) {
    const { showNotification } = useNotificationContext();
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (newPassword !== confirmPassword) {
            showNotification("Les nouveaux mots de passe ne correspondent pas", "error");
            return;
        }

        if (newPassword.length < 6) {
            showNotification("Le nouveau mot de passe doit contenir au moins 6 caractères", "error");
            return;
        }

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) {
                showNotification("Utilisateur non connecté", "error");
                return;
            }

            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });
            
            if (error) {
                if (error.message.includes("weak")) {
                    showNotification("Le mot de passe doit contenir au moins 6 caractères", "error");
                } else {
                    showNotification("Erreur lors de la modification du mot de passe: " + error.message, "error");
                }
                return;
            }
            
            showNotification("Mot de passe modifié avec succès", "success");
            onClose();
        } catch (error: any) {
            console.error("Erreur:", error);
            showNotification("Erreur lors de la modification du mot de passe", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle style={{color: '#dc2626'}}>
                        Modifier le mot de passe
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <div>
                            <Label htmlFor="currentPassword">Mot de passe actuel</Label>
                            <Input
                                id="currentPassword"
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                required
                                style={{borderColor: '#dc2626'}}
                            />
                        </div>
                        
                        <div>
                            <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                            <Input
                                id="newPassword"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                style={{borderColor: '#dc2626'}}
                            />
                        </div>
                        
                        <div>
                            <Label htmlFor="confirmPassword">Confirmer le nouveau mot de passe</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                style={{borderColor: '#dc2626'}}
                            />
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-2 pt-4">
                            <Button
                                type="submit"
                                disabled={loading}
                                style={{backgroundColor: '#dc2626'}}
                            >
                                {loading ? "Modification..." : "Modifier"}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                style={{borderColor: '#dc2626', color: '#dc2626'}}
                            >
                                Annuler
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
