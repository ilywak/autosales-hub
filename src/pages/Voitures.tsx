import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Plus, Search, Car, Fuel, Calendar, Gauge, Edit, Trash2 } from 'lucide-react';

interface Voiture {
  id: string;
  marque: string;
  modele: string;
  annee: number;
  prix: number;
  kilometrage: number;
  carburant: string;
  etat: string;
  disponible: boolean;
  couleur: string | null;
  description: string | null;
  image_url: string | null;
  garage_id?: string;
}

const Voitures = () => {
  const { user, loading: authLoading, role, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [voitures, setVoitures] = useState<Voiture[]>([]);
  const [filteredVoitures, setFilteredVoitures] = useState<Voiture[]>([]);
  const [garages, setGarages] = useState<{id: string, nom: string}[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCarburant, setFilterCarburant] = useState('all');
  const [filterDisponible, setFilterDisponible] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVoiture, setEditingVoiture] = useState<Voiture | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    marque: '',
    modele: '',
    annee: new Date().getFullYear(),
    prix: 0,
    kilometrage: 0,
    carburant: 'essence',
    etat: 'occasion',
    couleur: '',
    description: '',
    image_url: '',
    garage_id: ''
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const fetchVoitures = async () => {
    try {
      const { data, error } = await supabase
        .from('voitures')
        // .select('*')
        .select()
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVoitures(data || []);
      setFilteredVoitures(data || []);
    } catch (error) {
      console.error('Error fetching voitures:', error);
      toast.error('Erreur lors du chargement des voitures');
    } finally {
      setLoading(false);
    }
  };

  const fetchGarages = async () => {
    try {
      const { data, error } = await supabase
        .from('garages')
        .select('id, nom')
        .order('nom');

      if (error) throw error;
      setGarages(data || []);
    } catch (error) {
      console.error('Error fetching garages:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchVoitures();
      if (role === 'admin') {
        fetchGarages();
      }
    }
  }, [user, role]);

  useEffect(() => {
    let filtered = voitures;

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(v =>
        v.marque.toLowerCase().includes(search) ||
        v.modele.toLowerCase().includes(search)
      );
    }

    if (filterCarburant !== 'all') {
      filtered = filtered.filter(v => v.carburant === filterCarburant);
    }

    if (filterDisponible !== 'all') {
      filtered = filtered.filter(v => v.disponible === (filterDisponible === 'true'));
    }

    setFilteredVoitures(filtered);
  }, [searchTerm, filterCarburant, filterDisponible, voitures]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (!profile?.garage_id && role !== 'admin' && !formData.garage_id) {
        toast.error("Vous devez être assigné à un garage pour ajouter des voitures");
        return;
      }

      const targetGarageId = role === 'admin' ? formData.garage_id : profile?.garage_id;

      if (!targetGarageId) {
        toast.error("Veuillez sélectionner un garage");
        return;
      }

      const voitureData = {
        ...formData,
        garage_id: targetGarageId,
        disponible: true
      };

      if (editingVoiture) {
        const { error } = await supabase
          .from('voitures')
          .update(voitureData)
          .eq('id', editingVoiture.id);

        if (error) throw error;
        toast.success('Voiture modifiée avec succès');
      } else {
        const { error } = await supabase
          .from('voitures')
          .insert([voitureData]);

        if (error) throw error;
        toast.success('Voiture ajoutée avec succès');
      }

      setDialogOpen(false);
      resetForm();
      fetchVoitures();
    } catch (error) {
      console.error('Error saving voiture:', error);
      const message = error instanceof Error ? error.message : "Erreur lors de l'enregistrement";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (voiture: Voiture & { garage_id?: string }) => {
    setEditingVoiture(voiture);
    setFormData({
      marque: voiture.marque,
      modele: voiture.modele,
      annee: voiture.annee,
      prix: voiture.prix,
      kilometrage: voiture.kilometrage,
      carburant: voiture.carburant,
      etat: voiture.etat,
      couleur: voiture.couleur || '',
      description: voiture.description || '',
      image_url: voiture.image_url || '',
      garage_id: voiture.garage_id || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette voiture ?')) return;

    try {
      const { error } = await supabase
        .from('voitures')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Voiture supprimée');
      fetchVoitures();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression');
    }
  };

  const resetForm = () => {
    setEditingVoiture(null);
    setFormData({
      marque: '',
      modele: '',
      annee: new Date().getFullYear(),
      prix: 0,
      kilometrage: 0,
      carburant: 'essence',
      etat: 'occasion',
      couleur: '',
      description: '',
      image_url: '',
      garage_id: ''
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatKm = (km: number) => {
    return new Intl.NumberFormat('fr-FR').format(km) + ' km';
  };

  const canManage = role === 'admin' || role === 'responsable';

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
            <h1 className="text-3xl font-display font-bold">Voitures</h1>
            <p className="text-muted-foreground">
              Gérez votre parc automobile
            </p>
          </div>
          {canManage && (
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="gradient-gold text-primary-foreground">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une voiture
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingVoiture ? 'Modifier la voiture' : 'Nouvelle voiture'}
                  </DialogTitle>
                  <DialogDescription>
                    Remplissez les informations du véhicule
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {role === 'admin' && (
                    <div className="space-y-2">
                      <Label htmlFor="garage">Garage</Label>
                      <Select
                        value={formData.garage_id}
                        onValueChange={(value) => setFormData({ ...formData, garage_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un garage" />
                        </SelectTrigger>
                        <SelectContent>
                          {garages.map((garage) => (
                            <SelectItem key={garage.id} value={garage.id}>
                              {garage.nom}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="marque">Marque</Label>
                      <Input
                        id="marque"
                        value={formData.marque}
                        onChange={(e) => setFormData({ ...formData, marque: e.target.value })}
                        placeholder="BMW"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="modele">Modèle</Label>
                      <Input
                        id="modele"
                        value={formData.modele}
                        onChange={(e) => setFormData({ ...formData, modele: e.target.value })}
                        placeholder="Série 3"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="annee">Année</Label>
                      <Input
                        id="annee"
                        type="number"
                        value={formData.annee}
                        onChange={(e) => setFormData({ ...formData, annee: parseInt(e.target.value) })}
                        min="1900"
                        max={new Date().getFullYear() + 1}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="prix">Prix (€)</Label>
                      <Input
                        id="prix"
                        type="number"
                        value={formData.prix}
                        onChange={(e) => setFormData({ ...formData, prix: parseFloat(e.target.value) })}
                        min="0"
                        step="100"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="kilometrage">Kilométrage</Label>
                      <Input
                        id="kilometrage"
                        type="number"
                        value={formData.kilometrage}
                        onChange={(e) => setFormData({ ...formData, kilometrage: parseInt(e.target.value) })}
                        min="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="couleur">Couleur</Label>
                      <Input
                        id="couleur"
                        value={formData.couleur}
                        onChange={(e) => setFormData({ ...formData, couleur: e.target.value })}
                        placeholder="Noir"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Carburant</Label>
                      <Select
                        value={formData.carburant}
                        onValueChange={(value) => setFormData({ ...formData, carburant: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="essence">Essence</SelectItem>
                          <SelectItem value="diesel">Diesel</SelectItem>
                          <SelectItem value="electrique">Électrique</SelectItem>
                          <SelectItem value="hybride">Hybride</SelectItem>
                          <SelectItem value="gpl">GPL</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>État</Label>
                      <Select
                        value={formData.etat}
                        onValueChange={(value) => setFormData({ ...formData, etat: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="neuf">Neuf</SelectItem>
                          <SelectItem value="occasion">Occasion</SelectItem>
                          <SelectItem value="reconditionne">Reconditionné</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="image_url">URL de l'image</Label>
                    <Input
                      id="image_url"
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Description du véhicule..."
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
                        editingVoiture ? 'Modifier' : 'Ajouter'
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par marque ou modèle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterCarburant} onValueChange={setFilterCarburant}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Carburant" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="essence">Essence</SelectItem>
              <SelectItem value="diesel">Diesel</SelectItem>
              <SelectItem value="electrique">Électrique</SelectItem>
              <SelectItem value="hybride">Hybride</SelectItem>
              <SelectItem value="gpl">GPL</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterDisponible} onValueChange={setFilterDisponible}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Disponibilité" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem value="true">Disponibles</SelectItem>
              <SelectItem value="false">Vendues</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Voitures Grid */}
        {filteredVoitures.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVoitures.map((voiture) => (
              <Card key={voiture.id} className="overflow-hidden group hover:shadow-card transition-all duration-300">
                <div className="aspect-video relative bg-secondary overflow-hidden">
                  {voiture.image_url ? (
                    <img
                      src={voiture.image_url}
                      alt={`${voiture.marque} ${voiture.modele}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Car className="h-16 w-16 text-muted-foreground/30" />
                    </div>
                  )}
                  <Badge
                    className={`absolute top-3 right-3 ${
                      voiture.disponible
                        ? 'bg-success text-success-foreground'
                        : 'bg-destructive text-destructive-foreground'
                    }`}
                  >
                    {voiture.disponible ? 'Disponible' : 'Vendue'}
                  </Badge>
                </div>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-display font-semibold text-lg">
                        {voiture.marque} {voiture.modele}
                      </h3>
                      <p className="text-2xl font-bold text-primary">
                        {formatCurrency(Number(voiture.prix))}
                      </p>
                    </div>
                    {canManage && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(voiture)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(voiture.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{voiture.annee}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Gauge className="h-4 w-4" />
                      <span>{formatKm(voiture.kilometrage)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Fuel className="h-4 w-4" />
                      <span className="capitalize">{voiture.carburant}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {voiture.etat}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Car className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-lg font-semibold mb-2">Aucune voiture</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || filterCarburant !== 'all' || filterDisponible !== 'all'
                ? 'Aucune voiture ne correspond à vos critères'
                : 'Commencez par ajouter une voiture à votre parc'}
            </p>
            {canManage && !searchTerm && filterCarburant === 'all' && filterDisponible === 'all' && (
              <Button onClick={() => setDialogOpen(true)} className="gradient-gold text-primary-foreground">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter une voiture
              </Button>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Voitures;
