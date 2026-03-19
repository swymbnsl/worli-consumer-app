-- Create ENUMs for event types and status
CREATE TYPE public.notification_event_type AS ENUM ('abandoned_cart', 'delivery_reminder', 'subscription_renewal', 'general');
CREATE TYPE public.notification_status AS ENUM ('pending', 'sent', 'failed', 'cancelled');

-- Create the notification_queue table
CREATE TABLE IF NOT EXISTS public.notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) NOT NULL,
    event_type public.notification_event_type NOT NULL,
    template_id VARCHAR(100) NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    status public.notification_status NOT NULL DEFAULT 'pending',
    scheduled_at TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    retry_count SMALLINT NOT NULL DEFAULT 0,
    error_message TEXT,
    whatsapp_message_id VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Essential indexes for querying and unique operations
CREATE INDEX IF NOT EXISTS idx_notify_queue_status_sched ON public.notification_queue (status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_notify_queue_user_id ON public.notification_queue (user_id);
CREATE INDEX IF NOT EXISTS idx_notify_queue_event_type ON public.notification_queue (event_type);

-- Create a common updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to auto-update the updated_at timestamp
CREATE TRIGGER update_notification_queue_updated_at
BEFORE UPDATE ON public.notification_queue
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add Row Level Security (RLS) policies
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own notifications (useful if you ever want to show a "notifications" tab in-app)
CREATE POLICY "Users can view their own notifications" 
ON public.notification_queue FOR SELECT 
USING (auth.uid() = user_id);

-- Allow service role to perform all actions operations (this is how your worker/app backend will interact with it)
CREATE POLICY "Service role has full access" 
ON public.notification_queue FOR ALL 
USING (current_setting('role') = 'service_role');
