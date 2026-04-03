"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { formatPrice } from "../utils/formatPrice";
import LoadingSpinner from "./LoadingSpinner";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Bill {
  id: string;
  date: string;
  amount: number;
  motif: 'Repos' | 'Nuitée';
  created_by: string;
  received_from: string;
}

interface DailyStats {
  date: string;
  nuitee: { count: number; amount: number };
  repos: { count: number; amount: number };
  total: number;
}

export default function PerformanceHistory() {
  const { user } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [users, setUsers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setIsLoading(true);
    
    let query = supabase.from('bills').select('*');
    const { data: allBills, error } = await query;
    
    if (error) {
      console.error('Error loading bills:', error);
      setBills([]);
    } else {
      const billsData = (allBills || []) as Bill[];
      
      let filteredBills: Bill[] = billsData;
      
      if (user?.role === 'user') {
        filteredBills = billsData.filter(b => b.created_by === user.username);
      }
      
      setBills(filteredBills);
      
      if (user?.role === 'admin' || user?.role === 'super_admin') {
        const uniqueUsers = [...new Set(billsData.map(b => b.created_by).filter(Boolean))];
        setUsers(uniqueUsers);
      }
      
      calculateDailyStats(billsData);
    }
    
    setIsLoading(false);
  };

  const calculateDailyStats = (billsData: Bill[]) => {
    const filteredBills = selectedUser === 'all' ? billsData : billsData.filter(b => b.created_by === selectedUser);
    
    const dailyGroups: { [key: string]: Bill[] } = {};
    filteredBills.forEach(bill => {
      if (!dailyGroups[bill.date]) {
        dailyGroups[bill.date] = [];
      }
      dailyGroups[bill.date].push(bill);
    });

    const stats: DailyStats[] = Object.keys(dailyGroups)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .map(date => {
        const dayBills = dailyGroups[date];
        const nuitee = dayBills.filter(b => b.motif === 'Nuitée');
        const repos = dayBills.filter(b => b.motif === 'Repos');
        
        const nuiteeAmount = nuitee.reduce((sum, b) => sum + (b.amount || 0), 0);
        const reposAmount = repos.reduce((sum, b) => sum + (b.amount || 0), 0);
        
        return {
          date,
          nuitee: { count: nuitee.length, amount: nuiteeAmount },
          repos: { count: repos.length, amount: reposAmount },
          total: nuiteeAmount + reposAmount
        };
      });

    setDailyStats(stats);
  };

  useEffect(() => {
    calculateDailyStats(bills);
  }, [selectedUser, bills]);

  const handleDownloadWord = () => {
    const totalNuitee = dailyStats.reduce((sum, day) => sum + day.nuitee.count, 0);
    const totalRepos = dailyStats.reduce((sum, day) => sum + day.repos.count, 0);
    const totalAmount = dailyStats.reduce((sum, day) => sum + day.total, 0);

    const wordContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
            <meta charset='utf-8'>
            <title>Historique des Performances</title>
            <!--[if gte mso 9]>
            <xml>
                <w:WordDocument>
                    <w:View>Print</w:View>
                    <w:Zoom>90</w:Zoom>
                    <w:DoNotPromptForConvert/>
                    <w:DoNotShowInsertionsAndDeletions/>
                </w:WordDocument>
            </xml>
            <![endif]-->
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #dc2626; padding-bottom: 20px; }
                .hotel-name { font-size: 24px; font-weight: bold; color: #dc2626; margin: 0; }
                .hotel-info { font-size: 12px; color: #666; margin: 10px 0; }
                .document-title { font-size: 18px; margin: 15px 0; color: #dc2626; }
                .user-info { background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px; }
                .summary { background: #f3f4f6; padding: 20px; margin: 25px 0; border-radius: 8px; border: 3px solid #dc2626; }
                .summary-title { font-weight: bold; color: #dc2626; margin-bottom: 15px; font-size: 16px; }
                table { width: 100%; border-collapse: collapse; margin: 25px 0; }
                th, td { border: 2px solid #dc2626; padding: 12px; text-align: center; }
                th { background: #dc2626; color: white; font-weight: bold; }
                .total-row { background: #f0f0f0; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1 class="hotel-name">Joda Company</h1>
                <div class="hotel-info">
                    BP : 7352 Yaoundé, N° Cont : P116012206442N<br>
                    Tel : (+237) 674 94 44 17 / 699 01 56 81 - Email: paulinahotel@yahoo.com
                </div>
                <h2 class="document-title">HISTORIQUE DES PERFORMANCES</h2>
            </div>
            
            <div class="user-info">
                <p><strong>Utilisateur:</strong> ${selectedUser === 'all' ? 'Tous les utilisateurs' : selectedUser}</p>
                <p><strong>Période:</strong> ${dailyStats.length > 0 ? `Du ${dailyStats[dailyStats.length - 1].date} au ${dailyStats[0].date}` : 'Aucune donnée'}</p>
                <p><strong>Généré le:</strong> ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
            </div>
            
            <div class="summary">
                <div class="summary-title">RÉSUMÉ GÉNÉRAL</div>
                <p><strong>Total Nuitées:</strong> ${totalNuitee} chambres</p>
                <p><strong>Total Repos:</strong> ${totalRepos} chambres</p>
                <p><strong>Chiffre d'Affaires Total:</strong> ${formatPrice(totalAmount.toString())}</p>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Nuitées</th>
                        <th>Montant Nuitées</th>
                        <th>Repos</th>
                        <th>Montant Repos</th>
                        <th>Total Journalier</th>
                    </tr>
                </thead>
                <tbody>
                    ${dailyStats.map(day => `
                        <tr>
                            <td>${new Date(day.date).toLocaleDateString('fr-FR')}</td>
                            <td>${day.nuitee.count}</td>
                            <td>${formatPrice(day.nuitee.amount.toString())}</td>
                            <td>${day.repos.count}</td>
                            <td>${formatPrice(day.repos.amount.toString())}</td>
                            <td><strong>${formatPrice(day.total.toString())}</strong></td>
                        </tr>
                    `).join('')}
                    <tr class="total-row">
                        <td><strong>TOTAUX</strong></td>
                        <td><strong>${totalNuitee}</strong></td>
                        <td><strong>${formatPrice(dailyStats.reduce((sum, day) => sum + day.nuitee.amount, 0).toString())}</strong></td>
                        <td><strong>${totalRepos}</strong></td>
                        <td><strong>${formatPrice(dailyStats.reduce((sum, day) => sum + day.repos.amount, 0).toString())}</strong></td>
                        <td><strong>${formatPrice(totalAmount.toString())}</strong></td>
                    </tr>
                </tbody>
            </table>
        </body>
        </html>
    `;

    const blob = new Blob([wordContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Historique_Performances_${selectedUser === 'all' ? 'Global' : selectedUser}_${new Date().toISOString().split('T')[0]}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const totalNuitee = dailyStats.reduce((sum, day) => sum + day.nuitee.count, 0);
    const totalRepos = dailyStats.reduce((sum, day) => sum + day.repos.count, 0);
    const totalAmount = dailyStats.reduce((sum, day) => sum + day.total, 0);

    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Historique des Performances</title>
            <style>
                @page { margin: 15mm; size: A4; }
                body { font-family: Arial, sans-serif; margin: 0; color: #333; font-size: 12px; }
                .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #dc2626; padding-bottom: 15px; }
                .hotel-name { font-size: 20px; font-weight: bold; color: #dc2626; margin: 0; }
                .hotel-info { font-size: 10px; color: #666; margin: 5px 0; }
                .document-title { font-size: 16px; margin: 10px 0; color: #dc2626; }
                .user-info { background: #f5f5f5; padding: 10px; margin: 15px 0; border-radius: 5px; }
                .summary { background: #f3f4f6; padding: 15px; margin: 20px 0; border-radius: 8px; border: 2px solid #dc2626; }
                .summary-title { font-weight: bold; color: #dc2626; margin-bottom: 10px; }
                .summary-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; }
                .summary-item { text-align: center; }
                .summary-value { font-size: 18px; font-weight: bold; color: #dc2626; }
                .summary-label { font-size: 10px; color: #666; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
                th { background: #dc2626; color: white; font-size: 11px; }
                .date-col { width: 15%; }
                .count-col { width: 12%; }
                .amount-col { width: 20%; }
                .total-row { background: #f0f0f0; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1 class="hotel-name">Joda Company</h1>
                <div class="hotel-info">
                    BP : 7352 Yaoundé, N° Cont : P116012206442N<br>
                    Tel : (+237) 674 94 44 17 / 699 01 56 81 - Email: paulinahotel@yahoo.com
                </div>
                <h2 class="document-title">HISTORIQUE DES PERFORMANCES</h2>
            </div>
            
            <div class="user-info">
                <strong>Utilisateur:</strong> ${selectedUser === 'all' ? 'Tous les utilisateurs' : selectedUser}<br>
                <strong>Période:</strong> ${dailyStats.length > 0 ? `Du ${dailyStats[dailyStats.length - 1].date} au ${dailyStats[0].date}` : 'Aucune donnée'}<br>
                <strong>Généré le:</strong> ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}
            </div>
            
            <div class="summary">
                <div class="summary-title">RÉSUMÉ GÉNÉRAL</div>
                <div class="summary-grid">
                    <div class="summary-item">
                        <div class="summary-value">${totalNuitee}</div>
                        <div class="summary-label">Total Nuitées</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-value">${totalRepos}</div>
                        <div class="summary-label">Total Repos</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-value">${formatPrice(totalAmount.toString())}</div>
                        <div class="summary-label">Chiffre d'Affaires Total</div>
                    </div>
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th class="date-col">Date</th>
                        <th class="count-col">Nuitées</th>
                        <th class="amount-col">Montant Nuitées</th>
                        <th class="count-col">Repos</th>
                        <th class="amount-col">Montant Repos</th>
                        <th class="amount-col">Total Journalier</th>
                    </tr>
                </thead>
                <tbody>
                    ${dailyStats.map(day => `
                        <tr>
                            <td>${new Date(day.date).toLocaleDateString('fr-FR')}</td>
                            <td>${day.nuitee.count}</td>
                            <td>${formatPrice(day.nuitee.amount.toString())}</td>
                            <td>${day.repos.count}</td>
                            <td>${formatPrice(day.repos.amount.toString())}</td>
                            <td><strong>${formatPrice(day.total.toString())}</strong></td>
                        </tr>
                    `).join('')}
                    <tr class="total-row">
                        <td><strong>TOTAUX</strong></td>
                        <td><strong>${totalNuitee}</strong></td>
                        <td><strong>${formatPrice(dailyStats.reduce((sum, day) => sum + day.nuitee.amount, 0).toString())}</strong></td>
                        <td><strong>${totalRepos}</strong></td>
                        <td><strong>${formatPrice(dailyStats.reduce((sum, day) => sum + day.repos.amount, 0).toString())}</strong></td>
                        <td><strong>${formatPrice(totalAmount.toString())}</strong></td>
                    </tr>
                </tbody>
            </table>
        </body>
        </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  if (!user) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600">Vous devez être connecté pour accéder à cette page.</p>
      </div>
    );
  }

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold" style={{color: '#dc2626'}}>Historique des Performances</h1>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={handlePrint}
            style={{backgroundColor: '#dc2626'}}
          >
            Imprimer
          </Button>
          {isAdmin && (
            <Button
              onClick={handleDownloadWord}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Télécharger Word
            </Button>
          )}
        </div>
      </div>

      {isAdmin && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Filtrer par utilisateur</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedUser} onValueChange={(value) => setSelectedUser(value || 'all')}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Tous les utilisateurs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les utilisateurs</SelectItem>
                {users.map((u, index) => (
                  <SelectItem key={`user-${u}-${index}`} value={u}>{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            Performances {selectedUser === 'all' ? 'Globales' : `de ${selectedUser}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingSpinner size="lg" text="Chargement des performances..." />
          ) : dailyStats.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-500">Aucune donnée disponible</p>
            </div>
          ) : (
            <div className="space-y-4">
              {dailyStats.map((day, index) => (
                <Card key={`performance-${day.date}-${index}`} className="bg-slate-50">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <h3 className="font-semibold text-slate-800">
                        {new Date(day.date).toLocaleDateString('fr-FR')}
                      </h3>
                      <Badge variant="destructive" className="text-sm">
                        {formatPrice(day.total.toString())}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-blue-50 p-3 rounded">
                        <p className="text-sm font-medium text-blue-800">Nuitées</p>
                        <p className="text-xs text-blue-600">{day.nuitee.count} chambres</p>
                        <p className="font-bold text-blue-600">{formatPrice(day.nuitee.amount.toString())}</p>
                      </div>
                      <div className="bg-green-50 p-3 rounded">
                        <p className="text-sm font-medium text-green-800">Repos</p>
                        <p className="text-xs text-green-600">{day.repos.count} chambres</p>
                        <p className="font-bold text-green-600">{formatPrice(day.repos.amount.toString())}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
