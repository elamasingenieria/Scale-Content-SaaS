-- Add missing foreign key constraint between user_intake and profiles tables
-- This fixes the "Could not find a relationship" error in admin queries

ALTER TABLE public.user_intake 
ADD CONSTRAINT user_intake_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;