# Supabase — pasos sencillos (App Administración)

Proyecto: **mbjfyuswniyduwygvrhh**  
App en producción: https://project-klagi.vercel.app/

Sigue estos pasos **en orden**. Cada bloque es un solo “Run” en el SQL Editor salvo donde diga otra cosa.

---

## Paso 0 — ¿Ya usabas la app de compras antes?

- **Sí, ya tenías productos en Supabase** → salta al Paso 2 (no borres nada).
- **Proyecto vacío / nuevo** → ejecuta también `supabase/schema.sql` y `supabase/migration-purchase-history.sql` antes del Paso 2.

---

## Paso 1 — Crear tu usuario (panel, no SQL)

1. Abre [Authentication → Users](https://supabase.com/dashboard/project/mbjfyuswniyduwygvrhh/auth/users)
2. **Add user** → email + contraseña (la usarás en `/login` de la app)
3. **Copia el User UID** (UUID) — lo necesitas en el Paso 4

---

## Paso 2 — Tabla de presupuesto

1. Abre [SQL Editor](https://supabase.com/dashboard/project/mbjfyuswniyduwygvrhh/sql/new)
2. Copia y pega **todo** el archivo:
   ```
   supabase/migrations/20260420120000_user_financial_payload.sql
   ```
3. Pulsa **Run**

---

## Paso 3 — Multi-usuario + seguridad (compras)

1. En SQL Editor, copia y pega **todo**:
   ```
   supabase/migrations/20260601000000_multi_user_and_budget_link.sql
   ```
2. Pulsa **Run**

---

## Paso 4 — Asignar tus datos existentes a tu usuario

Sustituye `PEGA-TU-UUID-AQUI` por el UID del **usuario principal** (el que ya tiene los datos de compras).

```sql
UPDATE products SET user_id = 'PEGA-TU-UUID-AQUI'::uuid WHERE user_id IS NULL;
UPDATE shopping_items SET user_id = 'PEGA-TU-UUID-AQUI'::uuid WHERE user_id IS NULL;
UPDATE purchase_trips SET user_id = 'PEGA-TU-UUID-AQUI'::uuid WHERE user_id IS NULL;
UPDATE purchase_trip_items SET user_id = 'PEGA-TU-UUID-AQUI'::uuid WHERE user_id IS NULL;
```

Run. Sin esto la app autenticada verá **0 productos**.

> **Hogar compartido:** tras el Paso 5, el segundo usuario no necesita estos UPDATEs.

---

## Paso 5 — Acceso compartido del hogar (2 usuarios)

Dos cuentas Auth ven y editan **todos** los datos (compras + presupuesto).

| Rol | UUID |
|-----|------|
| Principal | `71aa401e-ad23-4413-b72e-5e17c62bb507` |
| Segundo miembro | `6a09dedf-b6bb-45ed-9606-091a66286875` |

1. Crea el segundo usuario en Authentication si no existe.
2. En SQL Editor, pega `supabase/migrations/20260601000001_shared_household_access.sql`
3. **Run**

No repitas los UPDATE del Paso 4 con el UUID del segundo usuario.

---

## Paso 6 — (Opcional) Importar presupuesto de app-ppto

Solo si quieres traer conceptos/gastos del presupuesto viejo. Ver `MIGRATION_PAYLOAD.md`.

---

## Paso 7 — Vercel (variables de entorno)

| Variable | Valor |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://mbjfyuswniyduwygvrhh.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave **anon public** en Supabase → Settings → API |

---

## Paso 8 — Probar

1. https://project-klagi.vercel.app/login
2. Entra con **cualquiera** de los dos usuarios
3. Compras + Presupuesto compartidos (presupuesto requiere redeploy con `household.ts`)
