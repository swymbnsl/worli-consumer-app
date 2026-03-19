import { supabase } from './supabase';
// import { Database } from '../types/database.types';

// E.164 phone validation (simple regex, for production use libphonenumber-js)
export function validatePhoneNumber(phone: string): boolean {
  return /^\+[1-9]\d{1,14}$/.test(phone);
}

export type NotificationEventType =
  | 'abandoned_cart'
  | 'delivery_reminder'
  | 'subscription_renewal'
  | 'general';

export type NotificationStatus =
  | 'pending'
  | 'sent'
  | 'failed'
  | 'cancelled';

export interface ScheduleNotificationParams {
  user_id: string;
  phone_number: string;
  event_type: NotificationEventType;
  template_id: string;
  payload: Record<string, any>;
  scheduled_at: string; // ISO string in UTC
}

/**
 * Schedules a notification event, deduplicates pending notifications for same user/event.
 */
export async function scheduleNotification(params: ScheduleNotificationParams): Promise<void> {
  if (!validatePhoneNumber(params.phone_number)) {
    throw new Error('Phone number must be in E.164 format');
  }

  // Deduplication: check for existing pending notification
  // We cancel the old one instead of returning, so that we reset the clock on updates.
  const { data: existing, error: findError } = await supabase
    .from('notification_queue')
    .select('id')
    .eq('user_id', params.user_id)
    .eq('event_type', params.event_type)
    .eq('status', 'pending');

  if (findError) throw findError;
  
  if (existing && existing.length > 0) {
    // If the event exists, we cancel it to restart the timer.
    await cancelNotification(params.user_id, params.event_type);
  }

  // Insert new notification
  const { error: insertError } = await supabase
    .from('notification_queue')
    .insert([
      {
        user_id: params.user_id,
        phone_number: params.phone_number,
        event_type: params.event_type,
        template_id: params.template_id,
        payload: params.payload,
        status: 'pending',
        scheduled_at: params.scheduled_at,
      },
    ]);

  if (insertError) throw insertError;
}

/**
 * Convenience helper specifically for Abandoned Cart. 
 * Adds/Resets the 4-hour countdown.
 */
export async function queueAbandonedCartReminder(
  user_id: string,
  phone_number: string,
  cart_total_amount: number,
  cart_item_count: number
): Promise<void> {
  if (!phone_number) return;
  
  // Calculate exactly 4 hours from now
  const scheduledTime = new Date();
  scheduledTime.setHours(scheduledTime.getHours() + 4);

  await scheduleNotification({
    user_id,
    phone_number,
    event_type: 'abandoned_cart',
    template_id: 'abandoned_cart_reminder_v1', // standard template
    payload: {
      amount: cart_total_amount,
      itemCount: cart_item_count
    },
    scheduled_at: scheduledTime.toISOString(),
  });
}

/**
 * Convenience helper specifically for completely cancelling Abandoned Cart.
 */
export async function cancelAbandonedCartReminder(user_id: string): Promise<void> {
  await cancelNotification(user_id, 'abandoned_cart');
}

/**
 * Cancels all pending notifications for a user and event type.
 */
export async function cancelNotification(user_id: string, event_type: NotificationEventType): Promise<void> {
  const { error } = await supabase
    .from('notification_queue')
    .update({ status: 'cancelled' })
    .eq('user_id', user_id)
    .eq('event_type', event_type)
    .eq('status', 'pending');

  if (error) throw error;
}
