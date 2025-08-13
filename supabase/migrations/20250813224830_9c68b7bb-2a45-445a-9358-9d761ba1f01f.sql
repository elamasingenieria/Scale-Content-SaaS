-- Fix database relationship: Add proper foreign key constraint from payments to profiles
ALTER TABLE public.payments 
DROP CONSTRAINT IF EXISTS payments_user_id_fkey;

-- Add correct constraint to reference profiles table instead of auth.users
ALTER TABLE public.payments 
ADD CONSTRAINT payments_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;