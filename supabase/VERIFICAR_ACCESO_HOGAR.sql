-- Verificar acceso hogar (2 dueños) — Supabase SQL Editor
-- Proyecto: mbjfyuswniyduwygvrhh

-- 1) ¿Existen los dos usuarios Auth con el UUID correcto?
SELECT id, email, email_confirmed_at IS NOT NULL AS confirmado, created_at
FROM auth.users
WHERE id IN (
  '71aa401e-ad23-4413-b72e-5e17c62bb507'::uuid,
  '6a09dedf-b6bb-45ed-9606-091a66286875'::uuid
)
ORDER BY id;

-- Debes ver EXACTAMENTE 2 filas. Si falta alguna → créala (ver SETUP_ACCESO_HOGAR.md).
-- Si ves otros usuarios con otro UUID → NO uses esos para la app; resetea estos dos.

-- 2) ¿Está el presupuesto del brain en el usuario principal?
SELECT user_id, updated_at,
       jsonb_array_length(payload->'moduleData'->'budgetConcepts') AS conceptos,
       jsonb_array_length(payload->'transactions') AS transacciones
FROM public.user_financial_payload
WHERE user_id = '71aa401e-ad23-4413-b72e-5e17c62bb507'::uuid;

-- conceptos > 0 y transacciones > 0 → brain ya subido.

-- 3) ¿Políticas del hogar activas? (debe decir household)
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('products', 'shopping_items', 'user_financial_payload')
ORDER BY tablename, policyname;

-- Si ves policies *_own en lugar de *_household → ejecuta:
-- supabase/migrations/20260601000001_shared_household_access.sql

-- 4) Compras ligadas al usuario principal (opcional)
SELECT count(*) AS productos FROM products
WHERE user_id = '71aa401e-ad23-4413-b72e-5e17c62bb507'::uuid;
