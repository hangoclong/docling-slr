---
name: Web Development
description: Overall web app development, routing, layouts, components, and project management for the DSA Cinema Next.js application.
---

# Web Development Skill

## Purpose
Manage the overall Next.js web application: routing, layouts, components, theming, and build configuration.

---

## Tech Stack Reference

| Technology       | Version | Purpose                    |
|------------------|---------|----------------------------|
| Next.js          | 16.1    | App Router, SSR            |
| React            | 19      | UI Components              |
| TypeScript       | 5.x     | Type safety                |
| Tailwind CSS     | 4.x     | Utility-first styling      |
| Framer Motion    | 11.x    | Animations                 |
| pnpm             | 10.x    | Package manager            |

---

## Project Structure

```
dsa-cinema-webapp/
├── src/
│   ├── app/                      # App Router pages
│   │   ├── layout.tsx            # Root layout
│   │   ├── page.tsx              # Landing page
│   │   ├── globals.css           # Theme definitions
│   │   ├── chapter/[id]/         # Dynamic chapter routes
│   │   └── viz/                  # Visualization pages
│   ├── components/               # Reusable UI components
│   ├── context/                  # React contexts (Theme)
│   ├── data/                     # Static data (chapters.ts)
│   └── lib/                      # Utilities (cn, etc.)
├── public/                       # Static assets
└── package.json
```

---

## Common Tasks

### 1. Create a New Page
```bash
# Create route at /chapter/[id]/page.tsx for dynamic routes
# Or /viz/[name]/page.tsx for visualizations
```

Always include:
- `"use client"` directive for interactive pages
- `ThemeToggle` component
- Navigation back link
- Responsive layout with `max-w-7xl mx-auto`

### 2. Add a New Component
```tsx
// src/components/MyComponent.tsx
"use client";
import { cn } from "@/lib/utils";

interface MyComponentProps {
  title: string;
  className?: string;
}

export function MyComponent({ title, className }: MyComponentProps) {
  return (
    <div className={cn("glass-panel p-6", className)}>
      {title}
    </div>
  );
}
```

### 3. Add a New Chapter
Update `src/data/chapters.ts`:
```ts
{
  id: 7,
  number: "07",
  title: "Tên Chương",
  subtitle: "Mô tả ngắn",
  visualizations: [
    { id: "viz-name", title: "Tên Viz", description: "...", route: "/viz/..." }
  ],
  status: "available"
}
```

### 4. Theme System
Two themes defined in `globals.css`:
- `.theme-neopop` - Light mode (default)
- `.theme-cyberpunk` - Dark mode

Use CSS variables:
```css
var(--bg-primary)
var(--text-primary)
var(--accent-primary)
var(--accent-secondary)
var(--border-color)
```

---

## Commands

```bash
# Development
pnpm dev

# Type check
pnpm type-check

# Build
pnpm build

# Lint
pnpm lint
```

---

## Neo-Pop Design System

| Element         | Style                                      |
|-----------------|-------------------------------------------|
| Borders         | `border-2 border-[var(--border-color)]`   |
| Shadows         | `shadow-[4px_4px_0_0_rgba(0,0,0,1)]`       |
| Cards           | `glass-panel` utility class               |
| Buttons         | Bold, hard shadows, hover translate       |
| Typography      | `font-black`, `uppercase`, `tracking-wider`|
