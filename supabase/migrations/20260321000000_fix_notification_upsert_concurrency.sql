-- Ensure notification queue upsert is truly concurrency-safe.
-- 1) Deduplicate any existing pending rows by keeping the latest per (user_id, event_type)
-- 2) Enforce one pending row per (user_id, event_type)
-- 3) Replace function with INSERT ... ON CONFLICT ... DO UPDATE

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, event_type
      ORDER BY updated_at DESC, created_at DESC, id DESC
    ) AS rn
  FROM public.notification_queue
  WHERE status = 'pending'
)
UPDATE public.notification_queue nq
SET
  status = 'cancelled',
  error_message = COALESCE(
    nq.error_message,
    'Auto-cancelled duplicate pending notification during upsert hardening migration.'
  ),
  updated_at = NOW()
FROM ranked r
WHERE nq.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_queue_unique_pending_user_event
ON public.notification_queue (user_id, event_type)
WHERE status = 'pending';

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
  INSERT INTO public.notification_queue (
    user_id,
    phone_number,
    event_type,
    template_id,
    payload,
    status,
    scheduled_at,
    retry_count,
    error_message,
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
    0,
    NULL,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id, event_type)
  WHERE status = 'pending'
  DO UPDATE
  SET
    phone_number = EXCLUDED.phone_number,
    template_id = EXCLUDED.template_id,
    payload = EXCLUDED.payload,
    scheduled_at = EXCLUDED.scheduled_at,
    retry_count = 0,
    error_message = NULL,
    updated_at = NOW()
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

COMMENT ON FUNCTION public.upsert_notification_queue IS
  'Concurrency-safe atomic upsert: one pending notification per (user_id, event_type) via unique partial index and ON CONFLICT DO UPDATE.';
