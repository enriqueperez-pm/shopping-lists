# klagi — Sistema visual FLUJO

klagi mantiene su nombre y funcionalidad. La capa visual sigue la paleta y reglas del documento **FLUJO** (fidelidad alta, sin rebrand).

## Paleta

| Token FLUJO | CSS / Tailwind | Uso |
|-------------|----------------|-----|
| Azul profundo `#1A2238` | `--flujo-deep`, `--ink`, `flujo.deep` | Texto principal, nav band, anclas |
| Verde menta `#00E676` | `--flujo-mint`, `--pantry`, `--income-color` | CTA primario, ingresos, tab activo |
| Lavanda `#7C4DFF` | `--flujo-lavender` | Tecnología (gráficos/chips) |
| Oro `#D4AF37` | `--flujo-gold`, `--cart` | Carrito, badges “por pagar” |
| Zafiro `#20B2AA` | `--flujo-sapphire`, `--saved` | Alimentación, ahorro, hero gradient |
| Gris claro `#F8F9FA` | `--flujo-bg`, `--bg-cream` | Fondo de app |

Sombras y bordes usan `rgb(var(--ink-rgb) / α)` con `--ink-rgb: 26 34 56`.

## Tipografía

| Fuente | Clase / token | Uso |
|--------|---------------|-----|
| **Inter** | `font-sans` (default) | UI, montos (`tabular-nums`) |
| **Roboto** | `.font-body`, `.text-body`, `.text-caption` | Párrafos y notas |
| **Playfair Display Italic** | `.text-editorial` | Acento editorial mínimo (login, titulares decorativos) |

No usar Playfair en botones ni montos.

## Radios y superficies

- `rounded-xl` → 16px, `rounded-2xl` → 20px, `rounded-3xl` → 24px
- `.surface-soft`: card blanca, borde hairline, sombra suave
- `.hero-gradient`: mint → zafiro sobre cards de resumen

## Componentes globales (`globals.css`)

| Clase | Comportamiento FLUJO |
|-------|----------------------|
| `.btn-primary` | Fondo mint, texto azul profundo |
| `.btn-soft`, `.chip` | Radios ≥16px, bordes sobre gris claro |
| `.chip-active` | Borde/fondo azul profundo tenue |
| `.app-tab-active` | Subrayado mint |
| `.page-header-band` | Franja superior azul profundo + título blanco |
| `.nav-tab-active-bg` | Fondo mint tenue en icono de tab activo |

## Semántica de categorías (`categoryColors.ts`)

Mapa central para gráficos: tecnología → lavanda, alimentación → zafiro, ingresos → mint, vivienda/servicios financieros → azul profundo, transporte → variante zafiro.

Gasto sobre presupuesto mantiene `--danger` (rojo accesible; FLUJO no define color de gasto negativo).

## Contraste

- **CTA mint:** texto siempre `#1A2238`, nunca blanco sobre mint.
- **PageHeader band:** texto blanco sobre azul profundo.

## Alcance explícito

- Sin renombrar la app a “FLUJO”
- Sin dark mode completo
- Sin nuevas pantallas del doc (Metas Pro, tarjeta física, etc.)

## Archivos clave

- Tokens: `src/app/globals.css`, `tailwind.config.ts`
- Fuentes: `src/app/layout.tsx`
- Nav: `FinanceBottomNav.tsx`, `ComprasBottomNav.tsx`, `PageHeader.tsx`
- Gráficos: `categoryColors.ts`, `DisponibleHero.tsx`, `CategorySpendChart.tsx`, `FlowCompareChart.tsx`, `UsageProgressBar.tsx`
- Login: `src/app/login/LoginForm.tsx`

## Deploy

Producción canónica: **https://project-klagi.vercel.app/** (proyecto Vercel `project-klagi`).
