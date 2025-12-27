import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/dashboard/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TrendingUp, Car, Users, Euro, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Stats {
  totalVentes: number;
  chiffreAffaires: number;
  voituresVendues: number;
  prixMoyen: number;
  ventesParMois: { mois: string; ventes: number; montant: number }[];
  ventesParCarburant: { name: string; value: number }[];
}

const COLORS = ['hsl(43, 96%, 56%)', 'hsl(142, 72%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(220, 15%, 40%)', 'hsl(0, 72%, 51%)'];

const Statistiques = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalVentes: 0,
    chiffreAffaires: 0,
    voituresVendues: 0,
    prixMoyen: 0,
    ventesParMois: [],
    ventesParCarburant: []
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;

      try {
        // Fetch all ventes with voiture info
        const { data: ventes } = await supabase
          .from('ventes')
          .select(`
            prix_vente,
            date_vente,
            voiture:voitures(carburant)
          `);

        if (!ventes || ventes.length === 0) {
          setLoading(false);
          return;
        }

        const totalVentes = ventes.length;
        const chiffreAffaires = ventes.reduce((sum, v) => sum + Number(v.prix_vente), 0);
        const prixMoyen = chiffreAffaires / totalVentes;

        // Group by month
        const ventesParMois: Record<string, { ventes: number; montant: number }> = {};
        const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
        
        ventes.forEach((v) => {
          const date = new Date(v.date_vente);
          const key = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
          if (!ventesParMois[key]) {
            ventesParMois[key] = { ventes: 0, montant: 0 };
          }
          ventesParMois[key].ventes++;
          ventesParMois[key].montant += Number(v.prix_vente);
        });

        const ventesParMoisArray = Object.entries(ventesParMois)
          .map(([mois, data]) => ({ mois, ...data }))
          .slice(-6);

        // Group by carburant
        const carburantCount: Record<string, number> = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ventes.forEach((v: any) => {
          const carburant = v.voiture?.carburant || 'Inconnu';
          carburantCount[carburant] = (carburantCount[carburant] || 0) + 1;
        });

        const ventesParCarburant = Object.entries(carburantCount).map(([name, value]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          value
        }));

        setStats({
          totalVentes,
          chiffreAffaires,
          voituresVendues: totalVentes,
          prixMoyen,
          ventesParMois: ventesParMoisArray,
          ventesParCarburant
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchStats();
    }
  }, [user]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-display font-bold">Statistiques</h1>
          <p className="text-muted-foreground">
            Analysez vos performances de vente
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total des ventes"
            value={stats.totalVentes}
            icon={BarChart3}
            variant="primary"
          />
          <StatCard
            title="Chiffre d'affaires"
            value={formatCurrency(stats.chiffreAffaires)}
            icon={Euro}
            variant="success"
          />
          <StatCard
            title="Voitures vendues"
            value={stats.voituresVendues}
            icon={Car}
            variant="warning"
          />
          <StatCard
            title="Prix moyen"
            value={formatCurrency(stats.prixMoyen)}
            icon={TrendingUp}
            variant="default"
          />
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Ventes par mois
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.ventesParMois.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.ventesParMois}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 20%)" />
                    <XAxis 
                      dataKey="mois" 
                      stroke="hsl(220, 10%, 55%)"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="hsl(220, 10%, 55%)"
                      fontSize={12}
                      tickFormatter={(value) => formatCurrency(value)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(220, 18%, 12%)',
                        border: '1px solid hsl(220, 15%, 20%)',
                        borderRadius: '8px',
                        color: 'hsl(40, 20%, 95%)'
                      }}
                      formatter={(value: number) => [formatCurrency(value), 'Montant']}
                    />
                    <Bar 
                      dataKey="montant" 
                      fill="hsl(43, 96%, 56%)" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Aucune donnée disponible
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5 text-primary" />
                Répartition par carburant
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.ventesParCarburant.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stats.ventesParCarburant}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {stats.ventesParCarburant.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(220, 18%, 12%)',
                        border: '1px solid hsl(220, 15%, 20%)',
                        borderRadius: '8px',
                        color: 'hsl(40, 20%, 95%)'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Aucune donnée disponible
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Statistiques;
