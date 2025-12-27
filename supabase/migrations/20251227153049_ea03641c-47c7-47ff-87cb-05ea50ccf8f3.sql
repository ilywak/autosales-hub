-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'responsable', 'employe');

-- Create garages table
CREATE TABLE public.garages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    nom TEXT NOT NULL,
    adresse TEXT,
    telephone TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table for user data
CREATE TABLE public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    email TEXT,
    telephone TEXT,
    garage_id UUID REFERENCES public.garages(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id)
);

-- Create user_roles table for role management
CREATE TABLE public.user_roles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL DEFAULT 'employe',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, role)
);

-- Create voitures table
CREATE TABLE public.voitures (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    garage_id UUID NOT NULL REFERENCES public.garages(id) ON DELETE CASCADE,
    marque TEXT NOT NULL,
    modele TEXT NOT NULL,
    annee INTEGER NOT NULL,
    prix DECIMAL(10,2) NOT NULL,
    kilometrage INTEGER DEFAULT 0,
    carburant TEXT NOT NULL CHECK (carburant IN ('essence', 'diesel', 'electrique', 'hybride', 'gpl')),
    etat TEXT NOT NULL CHECK (etat IN ('neuf', 'occasion', 'reconditionne')),
    disponible BOOLEAN NOT NULL DEFAULT true,
    couleur TEXT,
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create clients table
CREATE TABLE public.clients (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    garage_id UUID NOT NULL REFERENCES public.garages(id) ON DELETE CASCADE,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    email TEXT,
    telephone TEXT,
    adresse TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ventes table
CREATE TABLE public.ventes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    voiture_id UUID NOT NULL REFERENCES public.voitures(id) ON DELETE RESTRICT,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    employe_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    garage_id UUID NOT NULL REFERENCES public.garages(id) ON DELETE CASCADE,
    prix_vente DECIMAL(10,2) NOT NULL,
    date_vente TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.garages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voitures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventes ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id AND role = _role
    )
$$;

-- Create function to get user's garage
CREATE OR REPLACE FUNCTION public.get_user_garage(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT garage_id FROM public.profiles WHERE user_id = _user_id
$$;

-- RLS Policies for garages
CREATE POLICY "Admins can manage all garages"
ON public.garages FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their garage"
ON public.garages FOR SELECT
TO authenticated
USING (id = public.get_user_garage(auth.uid()));

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all profiles"
ON public.profiles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for voitures
CREATE POLICY "Authenticated users can view cars from their garage"
ON public.voitures FOR SELECT
TO authenticated
USING (garage_id = public.get_user_garage(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Responsables and admins can manage cars"
ON public.voitures FOR ALL
TO authenticated
USING (
    (garage_id = public.get_user_garage(auth.uid()) AND public.has_role(auth.uid(), 'responsable'))
    OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
    (garage_id = public.get_user_garage(auth.uid()) AND public.has_role(auth.uid(), 'responsable'))
    OR public.has_role(auth.uid(), 'admin')
);

-- RLS Policies for clients
CREATE POLICY "Users can view clients from their garage"
ON public.clients FOR SELECT
TO authenticated
USING (garage_id = public.get_user_garage(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Responsables and admins can manage clients"
ON public.clients FOR ALL
TO authenticated
USING (
    (garage_id = public.get_user_garage(auth.uid()) AND public.has_role(auth.uid(), 'responsable'))
    OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
    (garage_id = public.get_user_garage(auth.uid()) AND public.has_role(auth.uid(), 'responsable'))
    OR public.has_role(auth.uid(), 'admin')
);

-- RLS Policies for ventes
CREATE POLICY "Users can view sales from their garage"
ON public.ventes FOR SELECT
TO authenticated
USING (garage_id = public.get_user_garage(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can create sales"
ON public.ventes FOR INSERT
TO authenticated
WITH CHECK (garage_id = public.get_user_garage(auth.uid()));

CREATE POLICY "Responsables and admins can manage sales"
ON public.ventes FOR UPDATE
TO authenticated
USING (
    (garage_id = public.get_user_garage(auth.uid()) AND public.has_role(auth.uid(), 'responsable'))
    OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
    (garage_id = public.get_user_garage(auth.uid()) AND public.has_role(auth.uid(), 'responsable'))
    OR public.has_role(auth.uid(), 'admin')
);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_garages_updated_at
BEFORE UPDATE ON public.garages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_voitures_updated_at
BEFORE UPDATE ON public.voitures
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, nom, prenom, email)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data ->> 'nom', 'Nouveau'),
        COALESCE(new.raw_user_meta_data ->> 'prenom', 'Utilisateur'),
        new.email
    );
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'employe');
    
    RETURN new;
END;
$$;

-- Create trigger for new user
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for performance
CREATE INDEX idx_voitures_garage ON public.voitures(garage_id);
CREATE INDEX idx_voitures_disponible ON public.voitures(disponible);
CREATE INDEX idx_clients_garage ON public.clients(garage_id);
CREATE INDEX idx_ventes_garage ON public.ventes(garage_id);
CREATE INDEX idx_ventes_date ON public.ventes(date_vente);
CREATE INDEX idx_profiles_garage ON public.profiles(garage_id);
CREATE INDEX idx_profiles_user ON public.profiles(user_id);