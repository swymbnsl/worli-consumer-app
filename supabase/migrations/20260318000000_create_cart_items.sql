-- Create cart_items table for persistent cart storage
CREATE TABLE IF NOT EXISTS public.cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    frequency VARCHAR(20),
    start_date DATE,
    interval_days INTEGER,
    custom_quantities JSONB,
    preferred_delivery_time VARCHAR(20),
    address_id UUID REFERENCES public.addresses(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON public.cart_items (user_id);

-- Auto-update updated_at on change
CREATE TRIGGER update_cart_items_updated_at
BEFORE UPDATE ON public.cart_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Policy: users can view/edit their own cart items
CREATE POLICY "Users can manage their own cart items"
ON public.cart_items FOR ALL
USING (auth.uid() = user_id);

-- Policy: service role has full access
CREATE POLICY "Service role has full access"
ON public.cart_items FOR ALL
USING (current_setting('role') = 'service_role');
