-- Diagnóstico post-restauración Supabase (klagi)
-- Proyecto: mbjfyuswniyduwygvrhh
-- Ejecutar en SQL Editor tras despausar el proyecto.

-- 1) Usuarios Auth del hogar
SELECT id, email, email_confirmed_at IS NOT NULL AS confirmado, created_at
FROM auth.users
WHERE id IN (
  '71aa401e-ad23-4413-b72e-5e17c62bb507'::uuid,
  '6a09dedf-b6bb-45ed-9606-091a66286875'::uuid
)
ORDER BY id;

-- 2) Tablas críticas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'user_financial_payload', 'brain_financial_snapshot',
    'products', 'shopping_items', 'categories', 'purchase_trips'
  )
ORDER BY 1;

-- 3) Payload financiero principal
SELECT user_id, updated_at,
       jsonb_array_length(payload->'moduleData'->'budgetConcepts') AS conceptos,
       jsonb_array_length(payload->'transactions') AS transacciones
FROM public.user_financial_payload
WHERE user_id = '71aa401e-ad23-4413-b72e-5e17c62bb507'::uuid;

-- 4) Snapshot brain (CLI sync)
SELECT id, source, updated_at,
       jsonb_array_length(payload->'transactions') AS txs
FROM public.brain_financial_snapshot
WHERE id = 'household';

-- 5) Políticas RLS household
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('products', 'shopping_items', 'user_financial_payload', 'brain_financial_snapshot')
ORDER BY tablename, policyname;

-- 6) Compras
SELECT count(*) AS productos_total,
       count(*) FILTER (WHERE user_id = '71aa401e-ad23-4413-b72e-5e17c62bb507'::uuid) AS productos_usuario_principal,
       count(*) FILTER (WHERE user_id IS NULL) AS productos_sin_user_id
FROM products;

-- 7) Realtime publication (finanzas)
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('user_financial_payload', 'brain_financial_snapshot');
