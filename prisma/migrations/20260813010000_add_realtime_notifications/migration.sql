-- Realtime events are wake-up hints only. PostgreSQL rows remain authoritative;
-- clients always reconcile through the existing authenticated HTTP endpoints.
CREATE OR REPLACE FUNCTION notify_sms_realtime_event()
RETURNS TRIGGER AS $$
DECLARE
  payload TEXT;
BEGIN
  IF TG_TABLE_NAME = 'Message' THEN
    payload := json_build_object(
      'type', 'message.changed',
      'messageId', NEW.id,
      'status', NEW.status
    )::text;
  ELSE
    payload := json_build_object(
      'type', 'device.changed',
      'deviceId', NEW.id
    )::text;
  END IF;

  PERFORM pg_notify('sms_events', payload);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER message_realtime_event
AFTER INSERT OR UPDATE ON "Message"
FOR EACH ROW EXECUTE FUNCTION notify_sms_realtime_event();

CREATE TRIGGER device_realtime_event
AFTER INSERT OR UPDATE ON "Device"
FOR EACH ROW EXECUTE FUNCTION notify_sms_realtime_event();
