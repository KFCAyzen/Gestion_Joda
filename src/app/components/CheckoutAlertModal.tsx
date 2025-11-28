"use client";

import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";


interface Reservation {
    id: string;
    clientName: string;
    roomNumber: string;
    checkOut: string;
}

interface CheckoutAlertModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function CheckoutAlertModal({ isOpen, onClose }: CheckoutAlertModalProps) {
    const [expiringReservations, setExpiringReservations] = useState<Reservation[]>([]);
    

    useEffect(() => {
        if (isOpen) {
            checkExpiringReservations();
        }
    }, [isOpen, user]);

    const checkExpiringReservations = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, "reservations"));
            let reservations = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Reservation[];
            
            // Filtrer pour les utilisateurs de base
            if (user?.role === 'user') {
                reservations = reservations.filter((r: any) => r.createdBy === user.username);
            }
            
            const now = new Date();
            
            const expiring = reservations.filter(reservation => {
                if (!reservation.checkOut) return false;
                const checkoutDate = new Date(reservation.checkOut);
                checkoutDate.setHours(12, 0, 0, 0); // Fixer à midi pile
                
                // Alerter si c'est le jour même et qu'il reste moins de 24h avant midi
                const timeDiff = checkoutDate.getTime() - now.getTime();
                return timeDiff > 0 && timeDiff <= 24 * 60 * 60 * 1000; // Moins de 24h
            });
            
            setExpiringReservations(expiring);
        } catch (error) {
            // Fallback vers localStorage
            let reservations = JSON.parse(localStorage.getItem('reservations') || '[]');
            
            if (user?.role === 'user') {
                reservations = reservations.filter((r: any) => r.createdBy === user.username);
            }
            
            const now = new Date();
            
            const expiring = reservations.filter((reservation: Reservation) => {
                if (!reservation.checkOut) return false;
                const checkoutDate = new Date(reservation.checkOut);
                checkoutDate.setHours(12, 0, 0, 0); // Fixer à midi pile
                
                // Alerter si c'est le jour même et qu'il reste moins de 24h avant midi
                const timeDiff = checkoutDate.getTime() - now.getTime();
                return timeDiff > 0 && timeDiff <= 24 * 60 * 60 * 1000; // Moins de 24h
            });
            
            setExpiringReservations(expiring);
        }
    };

    if (!isOpen || expiringReservations.length === 0) return null;

    return (
        <div className="fixed top-0 left-0 w-full h-full flex items-start justify-center overflow-hidden pt-20" style={{zIndex: 9999, backdropFilter: 'blur(10px)', background: 'rgba(255, 255, 255, 0.1)'}}>
            <div className="bg-white/90 backdrop-blur-md rounded-xl p-6 max-w-md w-full shadow-2xl transform transition-all duration-300 scale-100 border border-white/20">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-800">Fins de séjour</h3>
                        <p className="text-sm text-slate-600">Réservations arrivant à terme</p>
                    </div>
                </div>
                
                <div className="space-y-3 mb-6">
                    {expiringReservations.map(reservation => (
                        <div key={reservation.id} className="bg-red-50 p-4 rounded-lg border border-red-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-slate-800">{reservation.clientName}</p>
                                    <p className="text-sm text-slate-600">Chambre {reservation.roomNumber}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium text-red-600">
                                        Départ: {new Date(reservation.checkOut).toLocaleDateString('fr-FR')} à 12h00
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {(() => {
                                            const checkoutDate = new Date(reservation.checkOut);
                                            checkoutDate.setHours(12, 0, 0, 0);
                                            const now = new Date();
                                            const hoursLeft = Math.ceil((checkoutDate.getTime() - now.getTime()) / (1000 * 60 * 60));
                                            return hoursLeft <= 0 ? 'Expiré' : `${hoursLeft}h restantes`;
                                        })()
                                    }
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                
                <button
                    onClick={onClose}
                    className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                    Compris
                </button>
            </div>
        </div>
    );
}