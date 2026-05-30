# Migración del payload financiero (app-ppto → Administración)

Pasos manuales para importar datos desde la app de presupuesto local (`app-ppto`) a Supabase.

## Prerrequisitos

1. Ejecutar en Supabase SQL Editor:
   - `supabase/migrations/20260420120000_user_financial_payload.sql`
   - `supabase/migrations/20260601000000_multi_user_and_budget_link.sql`
2. Crear usuario en **Authentication** (email/contraseña).
3. Asignar `user_id` a filas existentes de compras (ver comentarios en la migración multi-user).

## Exportar desde app-ppto (navegador)

1. Abrir la app de presupuesto en el mismo navegador donde usabas localStorage.
2. En DevTools → Application → Local Storage, copiar el valor de la clave `financialEstadoResultados`.
3. Guardar como `payload.json` (JSON válido).

## Subir a Supabase

En SQL Editor, reemplazar `YOUR_USER_UUID` y pegar el JSON exportado:

```sql
INSERT INTO public.user_financial_payload (user_id, payload, updated_at)
VALUES (
  'YOUR_USER_UUID'::uuid,
  '<PEGAR_JSON_AQUI>'::jsonb,
  now()
)
ON CONFLICT (user_id) DO UPDATE
SET payload = EXCLUDED.payload,
    updated_at = now();
```

## Verificación

1. Iniciar sesión en la app Administración con el mismo usuario.
2. Abrir **Inicio** y **Presupuesto**: deben aparecer conceptos y transacciones del export.
3. La sincronización en segundo plano sobrescribirá según `updated_at` (local vs remoto).

## Notas

- Solo MXN en la UI nueva; conceptos USD/EUR del export se conservan en JSON pero no se muestran en KPIs principales.
- No se migran bancos, deudas ni OCR (fuera de alcance).
- Phase 3 (backlog): importador automático desde CSV/localStorage.
