---
name: Visualization Cinema
description: DSA Cinema visualization design system — layout hierarchy, theme-aware styling, glass-panel components, and VizLayout integration. Use when creating or refactoring any visualization page.
---

# Visualization Cinema Skill

## Purpose
Design and build consistent, theme-aware visualizations for the DSA Cinema WebApp. Every visualization page **must** look and feel unified — same borders, corners, colors, and layout hierarchy — regardless of which chapter it belongs to.

---

## 🔴 Critical Rule: NEVER Hardcode Colors

All visualizations **MUST** use the CSS custom properties defined in `globals.css`. These properties adapt automatically between **Neo-Pop** (light) and **Cyberpunk** (dark) themes.

### Design Token Reference

| Token | Neo-Pop (Light) | Cyberpunk (Dark) | Usage |
|-------|-----------------|------------------|-------|
| `--bg-primary` | `#fff0f5` | `#050510` | Page background (set on `body`) |
| `--bg-secondary` | `#ffffff` | `#0f1020` | Secondary containers |
| `--bg-card` | `#ffffff` | `rgba(15,20,35,0.7)` | Card backgrounds |
| `--bg-glass` | `#ffffff` | `rgba(5,5,10,0.7)` | Glass panel background |
| `--text-primary` | `#000000` | `#ffffff` | Primary text |
| `--text-secondary` | `#333333` | `#a0a0c0` | Secondary text |
| `--text-muted` | `#666666` | `#606080` | Muted labels |
| `--accent-primary` | `#0891b2` (cyan-600) | `#00f0ff` (neon cyan) | Active/primary accent |
| `--accent-secondary` | `#c026d3` (fuchsia-600) | `#ff0099` (neon magenta) | Secondary accent |
| `--border-color` | `#000000` | `rgba(0,240,255,0.3)` | All borders |
| `--border-width` | `2px` | `1px` | Border thickness |
| `--radius-lg` | `0.75rem` | `0.75rem` | Standard panel rounding |
| `--shadow-md` | `4px 4px 0 0 #000` | `0 0 20px cyan/0.15` | Card shadows |

### ❌ Anti-Pattern (FORBIDDEN)
```tsx
// NEVER do this — hardcoded dark colors bypass theming
<div className="bg-[#050510] text-white border-gray-800">
```

### ✅ Correct Pattern
```tsx
// Use CSS variables — adapts to both themes automatically
<div className="bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-color)]">
```

---

## Layout Hierarchy

Every visualization page follows this strict hierarchy, managed by `VizLayout`:

```
VizLayout (min-h-screen)
├── Sticky Nav Bar (chapter back-link + title)
├── Floating Buttons (Home + Theme Toggle, bottom-left)
└── Content Container (max-w-7xl, mx-auto, px-4 md:px-8, py-6)
    └── Page Content (glass-panels, grids, viz stages)
```

### VizLayout Usage (MANDATORY)
```tsx
import { VizLayout } from "@/components/viz";

export default function MyVizPage() {
    return (
        <VizLayout chapterNumber={3} vizTitle="Hầm Lượng Tử">
            {/* Page content — NO redundant headers */}
            <div className="glass-panel p-6 mb-6">
                {/* Controls */}
            </div>
            <div className="glass-panel p-6">
                {/* Visualization stage */}
            </div>
        </VizLayout>
    );
}
```

### Rules
1. **Always pass `chapterNumber` and `vizTitle`** — this renders the sticky nav bar
2. **NEVER create internal HUD headers** — the nav bar IS the title; do NOT duplicate with `<h1>MAGNETIC RAIL</h1>` inside content
3. **NEVER use `h-screen` on the root container** — `VizLayout` manages the viewport; content flows naturally
4. **NEVER add floating Home/Theme buttons** — `VizLayout` provides them

---

## The Glass Panel System

The `glass-panel` CSS class is the **universal container** for all UI sections. It provides consistent borders, background, rounded corners, and shadows that adapt to the active theme.

### Definition (from `globals.css`)
```css
.glass-panel {
    background: var(--bg-glass);
    border: var(--border-width) solid var(--border-color);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
}
```

### Standard Usage Patterns
```tsx
{/* Control panel */}
<div className="glass-panel p-6 mb-6 border-2 border-[var(--border-color)]">

{/* Info card with accent border */}
<div className="glass-panel p-6 border-l-4 border-[var(--accent-primary)]">

{/* Visualization stage (dark background for canvas areas) */}
{/* ⚠️ MUST use inline style — see warning below */}
<div className="glass-panel p-8 relative overflow-hidden" style={{ background: '#020617' }}>

{/* Grid layout */}
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div className="glass-panel p-6">Sidebar</div>
    <div className="lg:col-span-2 glass-panel p-8">Main Stage</div>
</div>
```

### When Dark Backgrounds Are OK
For **visualization stages** (canvas areas, SVG canvases), a dark background **inside** a glass-panel is acceptable.

> [!CAUTION]
> **CSS Specificity Trap**: `glass-panel` sets `background: var(--bg-glass)` which is `#ffffff` in Neo-Pop. This **overrides** Tailwind classes like `bg-slate-950` because the CSS `background` shorthand has higher specificity than utility classes. You **MUST** use inline `style` to override it.

#### ❌ Anti-Pattern: Tailwind bg class on glass-panel
```tsx
{/* WRONG — bg-slate-950 is overridden by glass-panel's background: var(--bg-glass) */}
<div className="glass-panel p-8 bg-slate-950 min-h-[500px]">
    <svg>{/* Canvas renders on WHITE background in Neo-Pop! */}</svg>
</div>
```

#### ✅ Correct: Inline style override
```tsx
{/* CORRECT — inline style always wins over class-based background */}
<div className="glass-panel p-8 min-h-[500px]" style={{ background: '#020617' }}>
    <svg>{/* Dark canvas for visualization */}</svg>
</div>
```
The key difference: the dark is **contained** within a properly bordered panel, not bleeding full-screen.

### 🔴 Color Contrast for Interactive States

When elements change appearance on selection/hover/active states, **always verify text remains readable against its background in BOTH themes**.

#### ❌ Anti-Pattern: Invisible Text on Selection
```tsx
// WRONG — white text on a light glass-panel background = invisible in Neo-Pop
isSelected ? "text-white bg-white/10 border-white" : "text-cyan-400"
```

#### ✅ Correct: Dark Text on Light BG, Light Text on Dark BG
```tsx
// Selected state on a LIGHT glass-panel: use dark text + colored border
isSelected ? "text-slate-800 bg-cyan-100 border-cyan-500" : "text-cyan-400 border-cyan-500/30"

// Selected state on a DARK canvas (bg-slate-950): use light text
isSelected ? "text-white bg-cyan-500/30 border-cyan-400" : "text-cyan-400 border-cyan-500/30"
```

**Rule**: Before using `text-white` or `text-black` in interactive states, check the parent container's background. If the parent uses `glass-panel` (light in Neo-Pop), use dark text. If the parent uses `bg-slate-950` (dark canvas), use light text.

### 🔴 Per-Item Pointer Labels (FRONT/REAR/HEAD/TAIL)

When visualizing data structures with index pointers (e.g., FRONT/REAR for queues, HEAD/TAIL for linked lists), **render labels as part of each item's layout** — NOT as separate absolutely-positioned overlays tracked via `getBoundingClientRect`.

#### ❌ Anti-Pattern: Absolute DOM Tracking
```tsx
// WRONG — fragile, races with animations, magic offsets
const [frontX, setFrontX] = useState(0);
useEffect(() => {
    const rect = itemRef.getBoundingClientRect();
    setFrontX(rect.left + rect.width / 2 - containerRect.left);
}, [queue]);

<motion.div className="absolute" animate={{ x: frontX - 10 }}>
    FRONT
</motion.div>
```

#### ✅ Correct: Per-Item Flex Column Layout
```tsx
// CORRECT — label is part of the item, always aligned, zero math
{queue.map((item, index) => {
    const isFront = index === 0;
    const isRear = index === queue.length - 1;
    return (
        <motion.div className="flex flex-col items-center">
            {/* Label above */}
            <div className="h-10 flex flex-col items-center justify-end mb-1">
                {isFront && <span className="text-emerald-400 text-[10px]">FRONT</span>}
                {(isFront || isRear) && <div className="w-px h-3 bg-emerald-400/60" />}
            </div>
            {/* Node */}
            <div className="min-w-[90px] h-[90px] ...">...</div>
            {/* Index below */}
            <div className="mt-2 text-[10px] text-gray-500">[{index}]</div>
        </motion.div>
    );
})}
```

**Why**: DOM measurements via `getBoundingClientRect` race with Framer Motion spring animations, producing incorrect positions. Per-item layout is zero-math, animation-safe, and self-aligning.

---

## Page Layout Templates

### Template A: Side Panel + Main Stage (e.g., Knight's Tour, Recursion Tree)
```tsx
<VizLayout chapterNumber={2} vizTitle="Hành Trình Quân Mã">
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Controls */}
        <div className="space-y-6">
            <div className="glass-panel p-6">Config</div>
            <div className="glass-panel p-6">Actions</div>
            <div className="glass-panel p-6 border-l-4 border-purple-500">Info</div>
        </div>
        {/* Right: Viz Stage */}
        <div className="lg:col-span-2 glass-panel p-8 min-h-[600px] bg-slate-950">
            {/* Visualization canvas */}
        </div>
    </div>
</VizLayout>
```

### Template B: Full-Width Stacked (e.g., Complexity Race)
```tsx
<VizLayout chapterNumber={1} vizTitle="Cuộc Đua Độ Phức Tạp">
    {/* Control bar */}
    <div className="glass-panel p-8 mb-8 border-2 border-[var(--border-color)]">
        {/* Controls */}
    </div>

    {/* Race lanes */}
    <div className="space-y-4">
        {items.map(item => (
            <div key={item.id} className="glass-panel p-4">
                {/* Lane content */}
            </div>
        ))}
    </div>
</VizLayout>
```

### Template C: Centered Stage + Bottom Controls (e.g., Stack, Queue)
```tsx
<VizLayout chapterNumber={3} vizTitle="Hầm Lượng Tử">
    <div className="flex flex-col items-center gap-8">
        {/* Status bar */}
        <div className="glass-panel p-4 w-full text-center">
            <span className="text-[var(--accent-primary)] font-bold">{message}</span>
        </div>

        {/* Main visualization */}
        <div className="glass-panel p-8 min-h-[500px] w-full max-w-md bg-slate-950 relative">
            {/* Stack/Queue visualization */}
        </div>

        {/* Controls */}
        <div className="glass-panel p-4 flex gap-4">
            <button className="px-6 py-3 bg-[var(--accent-primary)] text-white font-bold rounded-xl">
                PUSH
            </button>
        </div>
    </div>
</VizLayout>
```

---

## Button Styling

### Primary Action
```tsx
<button className="px-6 py-3 bg-[var(--accent-primary)] text-white font-black rounded-xl 
    hover:opacity-90 transition-all active:scale-95 flex items-center gap-2">
    <Play className="w-5 h-5" /> BẮT ĐẦU
</button>
```

### Secondary / Danger
```tsx
{/* Secondary */}
<button className="px-6 py-3 bg-[var(--bg-secondary)] border-2 border-[var(--border-color)] 
    rounded-xl font-bold hover:bg-[var(--bg-card)]">

{/* Danger */}
<button className="px-6 py-3 bg-red-500 text-white rounded-xl font-bold active:scale-95">
```

### Icon-Only
```tsx
<button className="p-3 glass-panel hover:bg-[var(--bg-card)] transition-colors">
    <RotateCcw className="w-5 h-5 text-[var(--text-secondary)]" />
</button>
```

---

## Animation Patterns

| Pattern | When | Implementation |
|---------|------|----------------|
| **Spring Pop-in** | Elements appearing | `transition={{ type: "spring", stiffness: 300, damping: 20 }}` |
| **Layout Animation** | Reordering items | `<motion.div layout>` with `<LayoutGroup>` |
| **Exit Animation** | Removing items | `<AnimatePresence mode="popLayout">` |
| **Pulse** | Active/highlighted | `className="animate-pulse"` or `animate={{ scale: [1, 1.05, 1] }}` |

---

## Vietnamese Labels

All user-facing text should be in Vietnamese:

| English | Vietnamese |
|---------|------------|
| PLAY | BẮT ĐẦU |
| PAUSE | TẠM DỪNG |
| RESET | ĐẶT LẠI |
| STEP | BƯỚC |
| INSERT | CHÈN |
| DELETE | XÓA |
| PUSH | ĐẨY VÀO |
| POP | LẤY RA |
| ENQUEUE | VÀO HÀNG |
| DEQUEUE | RA HÀNG |
| OVERFLOW | TRÀN |
| SIZE | KÍCH THƯỚC |

---

## Visualization Types

| Type | Best For | Technology |
|------|----------|-----------|
| Animated 2D | Algorithms, State changes | Framer Motion |
| Interactive | Data structures, User input | React State + Motion |
| Simulation | Racing, Particles | requestAnimationFrame |
| 3D Scene | Spatial concepts, Memory | Three.js / R3F |

---

## Checklist: Before Shipping a Viz

- [ ] Uses `VizLayout` with `chapterNumber` and `vizTitle`
- [ ] No hardcoded colors — all use CSS variables
- [ ] All containers use `glass-panel` or theme-aware classes
- [ ] No redundant internal headers (VizLayout provides the title)
- [ ] No `h-screen` on root container
- [ ] No custom floating nav/home/theme buttons
- [ ] Controls are touch-friendly (min 44px targets)
- [ ] Responsive layout (stacks on mobile: `grid-cols-1 lg:grid-cols-3`)
- [ ] Vietnamese labels for user-facing text
- [ ] Builds without TypeScript errors
