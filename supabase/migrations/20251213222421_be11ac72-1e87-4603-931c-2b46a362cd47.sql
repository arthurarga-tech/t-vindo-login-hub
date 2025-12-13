-- Create enum for user roles within an establishment
CREATE TYPE public.establishment_role AS ENUM ('owner', 'manager', 'employee');

-- Create establishments table
CREATE TABLE public.establishments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on establishments
ALTER TABLE public.establishments ENABLE ROW LEVEL SECURITY;

-- Create establishment_members table to link users to establishments
CREATE TABLE public.establishment_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role establishment_role NOT NULL DEFAULT 'employee',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(establishment_id, user_id)
);

-- Enable RLS on establishment_members
ALTER TABLE public.establishment_members ENABLE ROW LEVEL SECURITY;

-- Security definer function to check if user is owner of an establishment
CREATE OR REPLACE FUNCTION public.is_establishment_owner(_user_id UUID, _establishment_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.establishments
    WHERE id = _establishment_id
      AND owner_id = _user_id
  )
$$;

-- Security definer function to check if user is member of an establishment
CREATE OR REPLACE FUNCTION public.is_establishment_member(_user_id UUID, _establishment_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.establishment_members
    WHERE establishment_id = _establishment_id
      AND user_id = _user_id
  )
$$;

-- Security definer function to get user's establishment id
CREATE OR REPLACE FUNCTION public.get_user_establishment_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT establishment_id
  FROM public.establishment_members
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS policies for establishments
CREATE POLICY "Users can view their own establishments"
ON public.establishments
FOR SELECT
USING (
  owner_id = auth.uid() OR 
  public.is_establishment_member(auth.uid(), id)
);

CREATE POLICY "Owners can update their establishments"
ON public.establishments
FOR UPDATE
USING (owner_id = auth.uid());

CREATE POLICY "Authenticated users can create establishments"
ON public.establishments
FOR INSERT
WITH CHECK (auth.uid() = owner_id);

-- RLS policies for establishment_members
CREATE POLICY "Owners can view all members"
ON public.establishment_members
FOR SELECT
USING (public.is_establishment_owner(auth.uid(), establishment_id));

CREATE POLICY "Owners can add members"
ON public.establishment_members
FOR INSERT
WITH CHECK (public.is_establishment_owner(auth.uid(), establishment_id));

CREATE POLICY "Owners can update members"
ON public.establishment_members
FOR UPDATE
USING (public.is_establishment_owner(auth.uid(), establishment_id));

CREATE POLICY "Owners can delete members"
ON public.establishment_members
FOR DELETE
USING (public.is_establishment_owner(auth.uid(), establishment_id));

-- Members can view themselves
CREATE POLICY "Members can view their own membership"
ON public.establishment_members
FOR SELECT
USING (user_id = auth.uid());

-- Update profiles table to link to establishment
ALTER TABLE public.profiles ADD COLUMN establishment_id UUID REFERENCES public.establishments(id);

-- Create trigger for updated_at
CREATE TRIGGER update_establishments_updated_at
BEFORE UPDATE ON public.establishments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_establishment_members_updated_at
BEFORE UPDATE ON public.establishment_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();