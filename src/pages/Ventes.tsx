import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Loader2, Plus, ShoppingCart, Car, FileText, Download } from 'lucide-react';

interface Vente {
  id: string;
  prix_vente: number;
  date_vente: string;
  notes: string | null;
  voiture: { id: string; marque: string; modele: string } | null;
  client: { id: string; nom: string; prenom: string } | null;
  employe: { nom: string; prenom: string } | null;
}

interface Voiture {
  id: string;
  marque: string;
  modele: string;
  prix: number;
}

interface Client {
  id: string;
  nom: string;
  prenom: string;
}

const Ventes = () => {
  const { user, loading: authLoading, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [ventes, setVentes] = useState<Vente[]>([]);
  const [voituresDisponibles, setVoituresDisponibles] = useState<Voiture[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    voiture_id: '',
    client_id: '',
    prix_vente: 0,
    notes: ''
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const fetchData = async () => {
    try {
      // Fetch ventes
      const { data: ventesData, error: ventesError } = await supabase
        .from('ventes')
        .select(`
          id,
          prix_vente,
          date_vente,
          notes,
          voiture:voitures(id, marque, modele),
          client:clients(id, nom, prenom),
          employe:profiles(nom, prenom)
        `)
        .order('date_vente', { ascending: false });

      if (ventesError) throw ventesError;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setVentes((ventesData || []).map((v: any) => ({
        id: v.id,
        prix_vente: v.prix_vente,
        date_vente: v.date_vente,
        notes: v.notes,
        voiture: v.voiture,
        client: v.client,
        employe: v.employe
      })));

      // Fetch available voitures
      const { data: voituresData } = await supabase
        .from('voitures')
        .select('id, marque, modele, prix')
        .eq('disponible', true)
        .order('marque');

      setVoituresDisponibles(voituresData || []);

      // Fetch clients
      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, nom, prenom')
        .order('nom');

      setClients(clientsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const handleVoitureChange = (voitureId: string) => {
    const voiture = voituresDisponibles.find(v => v.id === voitureId);
    setFormData({
      ...formData,
      voiture_id: voitureId,
      prix_vente: voiture ? Number(voiture.prix) : 0
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (!profile?.id || !profile?.garage_id) {
        toast.error("Erreur: profil ou garage non trouvé");
        return;
      }

      // Create the sale
      const { error: venteError } = await supabase
        .from('ventes')
        .insert([{
          voiture_id: formData.voiture_id,
          client_id: formData.client_id,
          employe_id: profile.id,
          garage_id: profile.garage_id,
          prix_vente: formData.prix_vente,
          notes: formData.notes || null
        }]);

      if (venteError) throw venteError;

      // Update voiture availability
      const { error: updateError } = await supabase
        .from('voitures')
        .update({ disponible: false })
        .eq('id', formData.voiture_id);

      if (updateError) throw updateError;

      toast.success('Vente enregistrée avec succès !');
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'enregistrement de la vente');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      voiture_id: '',
      client_id: '',
      prix_vente: 0,
      notes: ''
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).format(new Date(dateString));
  };

  const generateFacture = (vente: Vente) => {
    const content = `
FACTURE
=======

Date: ${formatDate(vente.date_vente)}

Client: ${vente.client?.prenom} ${vente.client?.nom}

Véhicule: ${vente.voiture?.marque} ${vente.voiture?.modele}

Montant: ${formatCurrency(Number(vente.prix_vente))}

${vente.notes ? `Notes: ${vente.notes}` : ''}

Merci pour votre confiance !
    `;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `facture-${vente.id.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Facture téléchargée');
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
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Ventes</h1>
            <p className="text-muted-foreground">
              Gérez vos transactions
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gradient-gold text-primary-foreground" disabled={voituresDisponibles.length === 0}>
                <Plus className="h-4 w-4 mr-2" />
                Enregistrer une vente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouvelle vente</DialogTitle>
                <DialogDescription>
                  Enregistrez une nouvelle transaction
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Véhicule</Label>
                  <Select
                    value={formData.voiture_id}
                    onValueChange={handleVoitureChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez un véhicule" />
                    </SelectTrigger>
                    <SelectContent>
                      {voituresDisponibles.map((voiture) => (
                        <SelectItem key={voiture.id} value={voiture.id}>
                          {voiture.marque} {voiture.modele} - {formatCurrency(Number(voiture.prix))}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Client</Label>
                  <Select
                    value={formData.client_id}
                    onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez un client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.prenom} {client.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prix_vente">Prix de vente (€)</Label>
                  <Input
                    id="prix_vente"
                    type="number"
                    value={formData.prix_vente}
                    onChange={(e) => setFormData({ ...formData, prix_vente: parseFloat(e.target.value) })}
                    min="0"
                    step="100"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (optionnel)</Label>
                  <Input
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Notes additionnelles..."
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving || !formData.voiture_id || !formData.client_id}
                    className="gradient-gold text-primary-foreground"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Enregistrement...
                      </>
                    ) : (
                      'Enregistrer la vente'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Info Message */}
        {voituresDisponibles.length === 0 && (
          <Card className="bg-warning/10 border-warning/30">
            <CardContent className="p-4">
              <p className="text-warning flex items-center gap-2">
                <Car className="h-4 w-4" />
                Aucune voiture disponible. Ajoutez des voitures pour enregistrer des ventes.
              </p>
            </CardContent>
          </Card>
        )}

        {clients.length === 0 && (
          <Card className="bg-warning/10 border-warning/30">
            <CardContent className="p-4">
              <p className="text-warning flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Aucun client enregistré. Ajoutez des clients pour enregistrer des ventes.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Ventes Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              Historique des ventes ({ventes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ventes.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Véhicule</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Vendeur</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                      <TableHead className="text-right">Facture</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ventes.map((vente) => (
                      <TableRow key={vente.id}>
                        <TableCell className="font-medium">
                          {formatDate(vente.date_vente)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Car className="h-4 w-4 text-muted-foreground" />
                            {vente.voiture?.marque} {vente.voiture?.modele}
                          </div>
                        </TableCell>
                        <TableCell>
                          {vente.client?.prenom} {vente.client?.nom}
                        </TableCell>
                        <TableCell>
                          {vente.employe?.prenom} {vente.employe?.nom}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-primary">
                          {formatCurrency(Number(vente.prix_vente))}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => generateFacture(vente)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Facture
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="text-lg font-semibold mb-2">Aucune vente</h3>
                <p className="text-muted-foreground">
                  Enregistrez votre première vente
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Ventes;
