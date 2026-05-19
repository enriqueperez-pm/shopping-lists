# 🛒 Lista de compras

App de despensa + lista de compras con **Next.js**, **Supabase** y **Tailwind CSS**.

## Setup rápido

### 1. Instalar dependencias

```bash
cd shopping-lists
npm install
```

### 2. Configurar Supabase

Copia el archivo de ejemplo y agrega tu anon key:

```bash
cp .env.local.example .env.local
```

Edita `.env.local` con tu `NEXT_PUBLIC_SUPABASE_ANON_KEY` (lo encuentras en
[Supabase Dashboard → Settings → API](https://supabase.com/dashboard/project/mbjfyuswniyduwygvrhh/settings/api)).

### 3. Ejecutar el schema SQL

Abre el [SQL Editor](https://supabase.com/dashboard/project/mbjfyuswniyduwygvrhh/sql) de tu
proyecto Supabase y ejecuta el contenido de `supabase/schema.sql`.

Esto crea las tablas, triggers, RLS policies y datos iniciales.

### 4. Correr en dev

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

### 5. Deploy a Vercel

```bash
git init
git remote add origin https://github.com/enriqueperez-pm/shopping-lists.git
git add .
git commit -m "initial: shopping list app"
git push -u origin main
```

En Vercel, conecta el repo y agrega las variables de entorno:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Stack

- **Next.js 14** (App Router)
- **Supabase** (PostgreSQL + RLS)
- **Tailwind CSS 3**
- **Lucide React** (iconos)
- **TypeScript**
