-- Habilitar Realtime en tablas de sync financiero (app ↔ nube ↔ brain)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'user_financial_payload'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_financial_payload;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'brain_financial_snapshot'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.brain_financial_snapshot;
  END IF;
END $$;
