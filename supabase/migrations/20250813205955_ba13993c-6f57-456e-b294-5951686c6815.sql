-- Enable RLS on views and add security policies
ALTER TABLE public.v_credit_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v_user_metrics_summary ENABLE ROW LEVEL SECURITY;

-- Add RLS policy for credit balances view - users can only see their own balance
CREATE POLICY "Users can view own credit balance" 
ON public.v_credit_balances 
FOR SELECT 
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

-- Add RLS policy for user metrics summary view - users can only see their own metrics
CREATE POLICY "Users can view own metrics summary" 
ON public.v_user_metrics_summary 
FOR SELECT 
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));