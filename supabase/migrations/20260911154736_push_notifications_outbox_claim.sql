alter table public.notification_outbox add column if not exists processing_at timestamptz;
create index if not exists notification_outbox_processing_idx on public.notification_outbox(processing_at) where sent_at is null;
