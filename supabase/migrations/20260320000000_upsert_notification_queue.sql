-- Create an atomic upsert function for notification_queue
-- This prevents race conditions when scheduling/updating notifications with the unique constraint
CREATE OR REPLACE FUNCTION public.upsert_notification_queue(
  p_user_id UUID,
  p_phone_number VARCHAR,
  p_event_type public.notification_event_type,
  p_template_id VARCHAR,
  p_payload JSONB,
  p_scheduled_at TIMESTAMPTZ
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  -- Try to update existing pending notification for this user/event combo
  UPDATE public.notification_queue
  SET 
    phone_number = p_phone_number,
    template_id = p_template_id,
    payload = p_payload,
    scheduled_at = p_scheduled_at,
    retry_count = 0,
    error_message = NULL,
    updated_at = NOW()
  WHERE 
    user_id = p_user_id 
    AND event_type = p_event_type 
    AND status = 'pending'
  RETURNING id INTO v_notification_id;

  -- If no row was updated, insert a new one
  IF v_notification_id IS NULL THEN
    INSERT INTO public.notification_queue (
      user_id,
      phone_number,
      event_type,
      template_id,
      payload,
      status,
      scheduled_at,
      created_at,
      updated_at
    ) VALUES (
      p_user_id,
      p_phone_number,
      p_event_type,
      p_template_id,
      p_payload,
      'pending'::public.notification_status,
      p_scheduled_at,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_notification_id;
  END IF;

  RETURN v_notification_id;
END;
$$;

COMMENT ON FUNCTION public.upsert_notification_queue IS
  'Atomically upserts a notification: updates if pending exists, inserts if not. Prevents race conditions with unique constraint.';
