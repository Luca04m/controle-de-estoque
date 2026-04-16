# Mr Lion Stock — Design System

> Fundação estabelecida em EST-2.1 (2026-04-16). Consumir tokens aqui definidos em vez de cores HSL hardcoded.

## Princípios

1. **Dark-first, Gold accent.** Sempre modo escuro. Gold sinaliza ação/marca.
2. **Tokens > constantes.** Qualquer cor vive em `src/index.css` sob `:root` ou `@theme inline`.
3. **shadcn primitivo > componente custom.** Só crie primitivo novo se não houver equivalente shadcn.
4. **Tailwind inline > CSS-in-JS.** Classes utilitárias direto no JSX. `style={}` apenas para valores dinâmicos.

## Tokens de cor

### Semânticos (use estes sempre que possível)

| Token | Tailwind class | Quando usar |
|---|---|---|
| `--background` | `bg-background` | Fundo da app |
| `--foreground` | `text-foreground` | Texto padrão |
| `--card` | `bg-card` | Containers elevados |
| `--muted-foreground` | `text-muted-foreground` | Textos secundários / labels |
| `--border` | `border-border` | Divisores |
| `--primary` | `bg-primary text-primary-foreground` | CTAs principais |
| `--destructive` | `bg-destructive text-destructive-foreground` | Ações perigosas, erros |
| `--success` | `bg-success text-success-foreground` | Confirmações positivas |
| `--warning` | `bg-warning text-warning-foreground` | Avisos |
| `--info` | `bg-info text-info-foreground` | Informacionais |

### Brand (ouro)

| Token | Classe | Uso |
|---|---|---|
| `--gold` | `text-gold / bg-gold / border-gold` | Elemento de marca, ação primária destacada |
| `--gold-dim` | inline via `hsl(var(--gold-dim))` | Gradientes e variação |
| `--gold-light` | `text-gold-light` | Hover de estado gold |

### Utilitárias especiais

- `.grid-pattern` — fundo pontilhado ouro sutil
- `.gold-glow` — sombra dourada (use em hover de cards hero)
- `.gradient-gold` — background gradient gold
- `.gradient-card` — background gradient card

## Primitivos disponíveis (shadcn)

| Componente | Import | Uso |
|---|---|---|
| Button | `@/components/ui/button` | Ações |
| Badge | `@/components/ui/badge` | Etiquetas de status |
| Card | `@/components/ui/card` | Containers |
| Dialog | `@/components/ui/dialog` | Modais |
| Select | `@/components/ui/select` | Dropdowns |
| Tabs | `@/components/ui/tabs` | Navegação por abas |
| Table | `@/components/ui/table` | Listagens tabulares |
| Skeleton | `@/components/ui/skeleton` | Loading states |
| Toaster/Sonner | `@/components/ui/sonner` | Notifications |

## Do / Don't

### ✅ Faça
```tsx
<div className="bg-card border border-border text-foreground">
<span className="text-success">Entrada confirmada</span>
<button style={{ color: 'hsl(var(--gold))' }}>Dinâmico OK</button>
```

### ❌ Não faça
```tsx
<div style={{ background: 'hsl(240 20% 7%)' }}>      // use bg-card
<span className="text-[#D4A843]">                     // use text-gold
const GOLD = 'hsl(42, 60%, 55%)'                      // use hsl(var(--gold))
```

## Tipografia

- Sans: **Space Grotesk** (padrão)
- Mono: **JetBrains Mono** (classe `font-mono`)
- Sem outras fontes. Hierarquia via `text-xs/sm/base/lg/xl/2xl/3xl` + `font-medium/bold/black`.

## Radius

Escala exposta via `--radius`: `rounded-sm/md/lg/xl/2xl/3xl/4xl`. Preferir `rounded-xl` para cards e `rounded-full` para chips.

## Extensão

Para adicionar token novo:
1. Definir em `:root` e `.dark` em `src/index.css` (HSL numérico, sem `hsl()`)
2. Expor em `@theme inline` como `--color-X: hsl(var(--X))`
3. Documentar aqui
4. Mencionar em Change Log da story

---

**Change log**
- 2026-04-16 — Criado (EST-2.1). Tokens semânticos success/warning/info adicionados.
