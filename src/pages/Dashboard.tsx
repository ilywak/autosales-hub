import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/dashboard/StatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Car, Users, ShoppingCart, TrendingUp, Plus, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface DashboardStats {
  totalVoitures: number;
  voituresDisponibles: number;
  totalClients: number;
  totalVentes: number;
  chiffreAffaires: number;
}

interface RecentVente {
  id: string;
  prix_vente: number;
  date_vente: string;
  voiture: { marque: string; modele: string } | null;
  client: { nom: string; prenom: string } | null;
}

const Dashboard = () => {
  const { user, loading: authLoading, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalVoitures: 0,
    voituresDisponibles: 0,
    totalClients: 0,
    totalVentes: 0,
    chiffreAffaires: 0
  });
  const [recentVentes, setRecentVentes] = useState<RecentVente[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      try {
        // Fetch voitures count
        const { count: voituresCount } = await supabase
          .from('voitures')
          .select('*', { count: 'exact', head: true });

        const { count: disponiblesCount } = await supabase
          .from('voitures')
          .select('*', { count: 'exact', head: true })
          .eq('disponible', true);

        // Fetch clients count
        const { count: clientsCount } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true });

        // Fetch ventes
        const { data: ventesData, count: ventesCount } = await supabase
          .from('ventes')
          .select('prix_vente', { count: 'exact' });

        const chiffreAffaires = ventesData?.reduce((sum, v) => sum + Number(v.prix_vente), 0) || 0;

        // Fetch recent ventes
        const { data: recentData } = await supabase
          .from('ventes')
          .select(`
            id,
            prix_vente,
            date_vente,
            voiture:voitures(marque, modele),
            client:clients(nom, prenom)
          `)
          .order('date_vente', { ascending: false })
          .limit(5);

        setStats({
          totalVoitures: voituresCount || 0,
          voituresDisponibles: disponiblesCount || 0,
          totalClients: clientsCount || 0,
          totalVentes: ventesCount || 0,
          chiffreAffaires
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setRecentVentes((recentData || []).map((v: any) => ({
          id: v.id,
          prix_vente: v.prix_vente,
          date_vente: v.date_vente,
          voiture: v.voiture,
          client: v.client
        })));
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(new Date(dateString));
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-display font-bold">
            Bonjour, {profile?.prenom || 'Utilisateur'} 👋
          </h1>
          <p className="text-muted-foreground">
            Voici un aperçu de votre activité
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Voitures en stock"
            value={stats.totalVoitures}
            icon={Car}
            variant="primary"
          />
          <StatCard
            title="Voitures disponibles"
            value={stats.voituresDisponibles}
            icon={Car}
            variant="success"
          />
          <StatCard
            title="Clients"
            value={stats.totalClients}
            icon={Users}
            variant="default"
          />
          <StatCard
            title="Chiffre d'affaires"
            value={formatCurrency(stats.chiffreAffaires)}
            icon={TrendingUp}
            variant="warning"
          />
        </div>

        {/* Quick Actions & Recent Sales */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Actions rapides</CardTitle>
              <CardDescription>Accédez rapidement aux fonctionnalités</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full justify-start" variant="secondary">
                <Link to="/voitures">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une voiture
                </Link>
              </Button>
              <Button asChild className="w-full justify-start" variant="secondary">
                <Link to="/clients">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un client
                </Link>
              </Button>
              <Button asChild className="w-full justify-start gradient-gold text-primary-foreground">
                <Link to="/ventes">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Enregistrer une vente
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Recent Sales */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Ventes récentes</CardTitle>
                <CardDescription>Les dernières transactions</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/ventes">
                  Voir tout
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recentVentes.length > 0 ? (
                <div className="space-y-4">
                  {recentVentes.map((vente) => (
                    <div
                      key={vente.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                          <Car className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {vente.voiture?.marque} {vente.voiture?.modele}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {vente.client?.prenom} {vente.client?.nom}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-primary">
                          {formatCurrency(Number(vente.prix_vente))}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(vente.date_vente)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Aucune vente enregistrée</p>
                  <Button asChild className="mt-4" variant="outline">
                    <Link to="/ventes">Enregistrer une vente</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
