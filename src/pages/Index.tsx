import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Car, Shield, BarChart3, Users, ArrowRight, Loader2 } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const features = [
    {
      icon: Car,
      title: 'Gestion du parc',
      description: 'Gérez facilement votre inventaire de véhicules avec photos, prix et caractéristiques.'
    },
    {
      icon: Users,
      title: 'Base clients',
      description: 'Suivez vos clients et leur historique d\'achats en un seul endroit.'
    },
    {
      icon: BarChart3,
      title: 'Statistiques',
      description: 'Analysez vos performances avec des tableaux de bord détaillés.'
    },
    {
      icon: Shield,
      title: 'Sécurisé',
      description: 'Vos données sont protégées avec une authentification robuste.'
    }
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 lg:px-12 py-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl gradient-gold flex items-center justify-center shadow-glow">
            <Car className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-2xl">AutoPro</span>
        </div>
        <Button asChild variant="outline" className="border-primary/30 hover:bg-primary/10">
          <Link to="/auth">
            Connexion
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 px-6 lg:px-12 pt-12 pb-24">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <div className="animate-slide-up">
            <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              Système de gestion de garage
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-display font-bold leading-tight">
              Gérez votre garage
              <br />
              <span className="bg-warning text-primary-foreground font-bold px-2 rounded-full">comme un pro</span>
            </h1>
          </div>
          
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Une solution complète pour gérer votre parc automobile, vos ventes 
            et vos clients. Simple, rapide et efficace.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <Button asChild size="lg" className="gradient-gold text-primary-foreground font-semibold px-8 shadow-glow">
              <Link to="/auth">
                Commencer gratuitement
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-border/50">
              <Link to="/auth">
                Voir la démo
              </Link>
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="max-w-6xl mx-auto mt-24">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="group p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-card animate-fade-in"
                style={{ animationDelay: `${0.1 * (index + 1)}s` }}
              >
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="max-w-3xl mx-auto mt-24 text-center">
          <div className="p-8 sm:p-12 rounded-3xl gradient-card border border-border/30">
            <h2 className="text-2xl sm:text-3xl font-display font-bold mb-4">
              Prêt à optimiser votre garage ?
            </h2>
            <p className="text-muted-foreground mb-6">
              Rejoignez les professionnels qui font confiance à AutoPro pour gérer leur activité.
            </p>
            <Button asChild size="lg" className="gradient-gold text-primary-foreground font-semibold px-8">
              <Link to="/auth">
                Créer un compte
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/30 py-8 px-6 text-center text-muted-foreground text-sm">
        <p>© 2024 AutoPro. Système de gestion de garage automobile.</p>
      </footer>
    </div>
  );
};

export default Index;
