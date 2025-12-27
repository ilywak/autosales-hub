import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Loader2, Plus, Building2, Edit, Trash2, Mail, Phone, MapPin } from 'lucide-react';

interface Garage {
  id: string;
  nom: string;
  adresse: string | null;
  telephone: string | null;
  email: string | null;
  created_at: string;
}

const Garages = () => {
  const { user, loading: authLoading, role } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [garages, setGarages] = useState<Garage[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGarage, setEditingGarage] = useState<Garage | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    nom: '',
    adresse: '',
    telephone: '',
    email: ''
  });

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/auth');
      } else if (role !== 'admin') {
        navigate('/dashboard');
        toast.error("Accès réservé aux administrateurs");
      }
    }
  }, [user, authLoading, role, navigate]);

  const fetchGarages = async () => {
    try {
      const { data, error } = await supabase
        .from('garages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGarages(data || []);
    } catch (error) {
      console.error('Error fetching garages:', error);
      toast.error('Erreur lors du chargement des garages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && role === 'admin') {
      fetchGarages();
    }
  }, [user, role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingGarage) {
        const { error } = await supabase
          .from('garages')
          .update(formData)
          .eq('id', editingGarage.id);

        if (error) throw error;
        toast.success('Garage modifié avec succès');
      } else {
        const { error } = await supabase
          .from('garages')
          .insert([formData]);

        if (error) throw error;
        toast.success('Garage créé avec succès');
      }

      setDialogOpen(false);
      resetForm();
      fetchGarages();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (garage: Garage) => {
    setEditingGarage(garage);
    setFormData({
      nom: garage.nom,
      adresse: garage.adresse || '',
      telephone: garage.telephone || '',
      email: garage.email || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce garage ? Cette action est irréversible.')) return;

    try {
      const { error } = await supabase
        .from('garages')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Garage supprimé');
      fetchGarages();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression');
    }
  };

  const resetForm = () => {
    setEditingGarage(null);
    setFormData({
      nom: '',
      adresse: '',
      telephone: '',
      email: ''
    });
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

  if (role !== 'admin') {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Garages</h1>
            <p className="text-muted-foreground">
              Gérez les garages du réseau
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gradient-gold text-primary-foreground">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un garage
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingGarage ? 'Modifier le garage' : 'Nouveau garage'}
                </DialogTitle>
                <DialogDescription>
                  Remplissez les informations du garage
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom du garage</Label>
                  <Input
                    id="nom"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    placeholder="AutoPro Paris"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adresse">Adresse</Label>
                  <Input
                    id="adresse"
                    value={formData.adresse}
                    onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                    placeholder="123 rue de la Paix, 75001 Paris"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telephone">Téléphone</Label>
                  <Input
                    id="telephone"
                    value={formData.telephone}
                    onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                    placeholder="01 23 45 67 89"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contact@garage.fr"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={saving} className="gradient-gold text-primary-foreground">
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Enregistrement...
                      </>
                    ) : (
                      editingGarage ? 'Modifier' : 'Créer'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Garages Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Liste des garages ({garages.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {garages.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Garage</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Adresse</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {garages.map((garage) => (
                      <TableRow key={garage.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                              <Building2 className="h-5 w-5 text-primary" />
                            </div>
                            <p className="font-medium">{garage.nom}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {garage.email && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                {garage.email}
                              </div>
                            )}
                            {garage.telephone && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {garage.telephone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {garage.adresse && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {garage.adresse}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(garage)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(garage.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="text-lg font-semibold mb-2">Aucun garage</h3>
                <p className="text-muted-foreground mb-4">
                  Créez votre premier garage pour commencer
                </p>
                <Button onClick={() => setDialogOpen(true)} className="gradient-gold text-primary-foreground">
                  <Plus className="h-4 w-4 mr-2" />
                  Créer un garage
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Garages;
