-- Make abandoned-cart event scheduling race-safe. Only one pending reminder per user allowed.
CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_pending_abandoned_cart
ON public.notification_queue (user_id, event_type)
WHERE status = 'pending' AND event_type = 'abandoned_cart';

-- Allow users to insert and update their own notifications (so the app client can queue and cancel events safely)
CREATE POLICY "Users can insert their own notifications"
ON public.notification_queue FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notification_queue FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);