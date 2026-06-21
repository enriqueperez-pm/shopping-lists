# klagi — PWA de administración de vida

App **Next.js** con finanzas, compras y hogar. Repo GitHub: [`shopping-lists`](https://github.com/enriqueperez-pm/shopping-lists).

**Producción:** https://project-klagi.vercel.app/  
**Diseño visual:** [`DESIGN.md`](DESIGN.md) (sistema FLUJO aplicado; nombre del producto sigue siendo klagi)

---

## Contexto del ecosistema

| Recurso | Ubicación |
|---------|-----------|
| Raíz del sistema | [`../../MAPA.md`](../../MAPA.md) |
| CSV finanzas (brain) | [`../../brain/finanzas/data/`](../../brain/finanzas/data/) |
| Código finanzas | `src/features/finance/` |
| Legacy redirect | [`../../../Finance tracker/README.md`](../../../Finance%20tracker/README.md) (solo aviso; no hay código ahí) |
| Supabase | `mbjfyuswniyduwygvrhh` → [dashboard](https://supabase.com/dashboard/project/mbjfyuswniyduwygvrhh) |

Antes vivía en `Finance tracker/Administracion-app/` (OneDrive). Hoy el código canónico es **esta carpeta** en Google Drive.

---

## Setup rápido

### 1. Instalar dependencias

```bash
cd app/klagi
npm install
```

### 2. Configurar Supabase

```bash
cp .env.local.example .env.local
```

Edita `.env.local` con tu `NEXT_PUBLIC_SUPABASE_ANON_KEY` ([Settings → API](https://supabase.com/dashboard/project/mbjfyuswniyduwygvrhh/settings/api)).

### 3. Schema SQL

Ejecuta `supabase/schema.sql` en el [SQL Editor](https://supabase.com/dashboard/project/mbjfyuswniyduwygvrhh/sql).

### 4. Dev local

```bash
npm run dev
```

Abre http://localhost:3000

> **Nota:** `node_modules` en Google Drive a veces rompe `npm run build` local. Vercel compila bien; alternativa: clonar fuera de Drive.

---

## Sync brain ↔ Supabase

Los CSV en `brain/finanzas/data/` son el espejo humano editable. La app usa Supabase en runtime.

```bash
npm run sync:brain          # push CSV → Supabase
npm run sync:brain:pull     # pull snapshot → CSV
npm run sync:brain:watch    # watch + sync
```

Procedimiento: [`../../brain/finanzas/procedimientos/sync-supabase.md`](../../brain/finanzas/procedimientos/sync-supabase.md)

---

## Deploy

**Proyecto Vercel canónico:** `project-klagi` → https://project-klagi.vercel.app/

| Método | Comando |
|--------|---------|
| Automático (recomendado) | `git push origin main` |
| Manual CLI | `vercel link --project project-klagi` luego `vercel deploy --prod` |

**No usar** el proyecto Vercel `klagi` (klagi.vercel.app) salvo prueba explícita — es un deploy accidental, no el canónico.

Variables de entorno en Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Stack

- **Next.js 14** (App Router)
- **Supabase** (PostgreSQL + RLS)
- **Tailwind CSS 3**
- **Lucide React**
- **TypeScript**

## Rutas principales

| Módulo | Rutas |
|--------|-------|
| Finanzas | `/inicio`, `/presupuesto`, `/gastos`, `/cuenta` |
| Compras | `/compras/lista`, `/compras/despensa`, `/compras/historial` |
| Auth | `/login` |
