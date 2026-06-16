# 🎨 Guía de Uso - Sistema de Diseño Notion

## Ejemplos Prácticos de Implementación

---

## 🔘 Botones

### Primary CTA (Pill-shaped Marketing)
```jsx
import { Button } from './components/Button';

// Marketing CTA - Pill-shaped, Notion Blue
<Button variant="primary">
  Get started free
</Button>

// Con estado activo/pressed
<Button variant="primary" active={true}>
  Processing...
</Button>
```

### Secondary CTA (Pill-shaped with Shadow)
```jsx
// Secondary marketing CTA - White with soft shadow
<Button variant="secondary">
  Request demo
</Button>
```

### Utility Button (Tighter corners)
```jsx
// Para contextos de navegación o utilidad
<Button variant="utility">
  Select plan
</Button>
```

### Download Button
```jsx
// Botón de descarga - Ink background
<Button variant="download">
  Download report
</Button>
```

### Tertiary Link
```jsx
// Link inline con Notion Blue
<Button variant="tertiary">
  Learn more →
</Button>
```

---

## 🃏 Cards

### Card Simple (Hairline only)
```jsx
import { Card, CardHeader, CardTitle } from './components/Card';

<Card>
  <CardHeader>
    <CardTitle>Feature Title</CardTitle>
  </CardHeader>
  <p className="type-body-md text-ink-secondary">
    Feature description goes here with body text.
  </p>
</Card>
```

### Card Elevado (Soft Shadow)
```jsx
// Card flotante con sombra suave
<Card elevated={true}>
  <CardHeader>
    <CardTitle>Highlighted Feature</CardTitle>
  </CardHeader>
  <p className="type-body-md">
    This card floats above the canvas with subtle multi-layer shadow.
  </p>
</Card>
```

### Card con Clase CSS
```jsx
// Usando clases directamente
<div className="card">
  <h3 className="type-heading-3">Manual Card</h3>
  <p className="type-body-sm text-ink-muted">Content here</p>
</div>

<div className="card-elevated">
  <h3 className="type-heading-3">Elevated Card</h3>
  <p className="type-body-sm">Floats with shadow-soft</p>
</div>
```

---

## 📝 Inputs

### Input Básico
```jsx
import { Input } from './components/Input';

<Input
  type="email"
  placeholder="Enter your email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>
```

### Input con Label
```jsx
<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
  <label className="type-body-sm text-ink" htmlFor="name">
    Full Name
  </label>
  <Input
    id="name"
    type="text"
    placeholder="John Doe"
  />
</div>
```

### Input usando Clase CSS
```jsx
<input
  className="input"
  type="password"
  placeholder="Password"
/>
```

---

## 🪟 Modal

### Modal Simple
```jsx
import { Modal } from './components/Modal';

const [open, setOpen] = useState(false);

<Modal
  isOpen={open}
  onClose={() => setOpen(false)}
  title="Confirm Action"
  size="md"
>
  <p className="type-body-md">
    Are you sure you want to proceed?
  </p>
  <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-lg)' }}>
    <Button variant="secondary" onClick={() => setOpen(false)}>
      Cancel
    </Button>
    <Button variant="primary" onClick={handleConfirm}>
      Confirm
    </Button>
  </div>
</Modal>
```

### Modal Grande
```jsx
<Modal
  isOpen={showForm}
  onClose={() => setShowForm(false)}
  title="Complete Your Profile"
  size="lg"
  testId="profile-modal"
>
  <form onSubmit={handleSubmit}>
    {/* Form content */}
  </form>
</Modal>
```

---

## 🎨 Typography

### Display Headers (Hero Headlines)
```jsx
// Display-1 (64px, weight 700, -2.125px tracking)
<h1 className="type-display-1">
  Transform your workflow
</h1>

// Display-2 (54px)
<h1 className="type-display-2">
  Large Section Headline
</h1>

// Heading-1 (40px)
<h2 className="type-heading-1">
  Plans and features
</h2>

// Heading-2 (26px)
<h3 className="type-heading-2">
  Getting Started
</h3>

// Heading-3 (22px)
<h4 className="type-heading-3">
  Card Title
</h4>
```

### Body Text
```jsx
// Body Medium (16px, default)
<p className="type-body-md text-ink-secondary">
  This is standard body text with optimal readability at 1.5 line-height.
</p>

// Body Small (15px, dense)
<p className="type-body-sm text-ink-muted">
  Smaller text for dense layouts, tables, or supporting information.
</p>

// Caption (14px)
<span className="type-caption text-ink-faint">
  Last updated 2 hours ago
</span>
```

### Title & Labels
```jsx
// Title (20px, weight 600)
<h5 className="type-title">
  Feature Callout
</h5>

// Eyebrow (12px, uppercase, weight 600)
<span className="type-eyebrow text-ink-muted">
  New Feature
</span>
```

---

## 🌈 Colores

### Text Colors
```jsx
// Primary text (near-black)
<p className="text-ink">Primary heading text</p>

// Secondary body text
<p className="text-ink-secondary">Running body copy</p>

// Muted supporting text
<p className="text-ink-muted">Supporting information</p>

// Faint captions
<p className="text-ink-faint">Metadata and timestamps</p>

// Primary blue (links, CTAs)
<a className="text-primary">Learn more</a>

// Semantic colors
<span className="text-success">Success message</span>
<span className="text-error">Error message</span>
<span className="text-warning">Warning message</span>
```

### Background Colors
```jsx
// Warm paper canvas
<div className="bg-canvas" style={{ padding: 'var(--spacing-xl)' }}>
  Main page background
</div>

// White surface card
<div className="bg-card" style={{ padding: 'var(--spacing-lg)' }}>
  Card or panel content
</div>

// Primary blue
<div className="bg-primary text-on-primary" style={{ padding: 'var(--spacing-base)' }}>
  Primary CTA background
</div>

// Dark hero band
<div className="bg-secondary text-on-primary" style={{ padding: 'var(--spacing-xxl)' }}>
  Hero night band with inverted colors
</div>
```

---

## 🏛️ Layout

### Container
```jsx
// Centered content container with responsive padding
<div className="container">
  <h2 className="type-heading-1">Section Title</h2>
  <p className="type-body-md">Content goes here</p>
</div>
```

### Section Spacing
```jsx
// Section with vertical padding
<section className="section">
  <div className="container">
    <h2>Features</h2>
    {/* Content */}
  </div>
</section>
```

### Custom Spacing
```jsx
// Stack con gap semántico
<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
  <Card>Feature 1</Card>
  <Card>Feature 2</Card>
  <Card>Feature 3</Card>
</div>

// Grid responsive
<div style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: 'var(--spacing-lg)',
}}>
  <Card>Item 1</Card>
  <Card>Item 2</Card>
  <Card>Item 3</Card>
</div>
```

---

## 🌓 Hero Band (Dark Mode)

### Dark Hero Section
```jsx
<div className="hero-band">
  <div className="container">
    <h1 className="type-display-1">Meet the night shift</h1>
    <p className="hero-band__subhead">
      Work smarter with powerful AI tools that understand your workflow.
    </p>
    <div className="hero-band__ctas">
      <Button variant="primary">Get started free</Button>
      <Button variant="secondary">Request demo</Button>
    </div>
  </div>
</div>
```

### Hero con Contenido Personalizado
```jsx
<section className="hero-band" style={{ paddingBlock: 'var(--spacing-section)' }}>
  <div className="container" style={{ textAlign: 'center' }}>
    <span className="type-eyebrow text-on-primary" style={{ opacity: 0.8 }}>
      Introducing
    </span>
    <h1 style={{
      fontSize: 'var(--typography-display-1-size)',
      fontWeight: 'var(--typography-display-1-weight)',
      letterSpacing: 'var(--typography-display-1-ls)',
      color: 'var(--color-on-primary)',
      marginTop: 'var(--spacing-sm)',
    }}>
      Revolutionary Features
    </h1>
  </div>
</section>
```

---

## 🏷️ Badges & Pills

### Badge Simple
```jsx
<span className="badge">
  New
</span>

<span className="badge" style={{ background: 'var(--color-primary)', color: 'white' }}>
  Featured
</span>
```

### Timeline Pills (In-product)
```jsx
<span className="timeline-pill timeline-pill--thinking">
  Thinking
</span>

<span className="timeline-pill timeline-pill--grep">
  Searching
</span>

<span className="timeline-pill timeline-pill--read">
  Reading
</span>

<span className="timeline-pill timeline-pill--edit">
  Editing
</span>

<span className="timeline-pill timeline-pill--done">
  Done
</span>
```

---

## 🚨 Banners Semánticos

### Success Banner
```jsx
<div className="banner-success">
  <strong>Success!</strong> Your changes have been saved.
</div>
```

### Error Banner
```jsx
<div className="banner-error">
  <strong>Error:</strong> Unable to process your request. Please try again.
</div>
```

### Warning Banner
```jsx
<div className="banner-warning">
  <strong>Warning:</strong> This action cannot be undone.
</div>
```

---

## 📱 Responsive Patterns

### Mobile-First Grid
```jsx
// Stack on mobile, 2 columns on tablet, 3 on desktop
<div style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
  gap: 'var(--spacing-lg)',
}}>
  <Card>Item 1</Card>
  <Card>Item 2</Card>
  <Card>Item 3</Card>
</div>
```

### Hide/Show on Different Devices
```jsx
// Solo visible en mobile
<div className="hidden-on-desktop">
  <button>☰ Menu</button>
</div>

// Solo visible en desktop
<nav className="hidden-on-mobile">
  <a href="#features">Features</a>
  <a href="#pricing">Pricing</a>
</nav>
```

### Responsive Typography
```jsx
// Font size ajusta automáticamente
<h1 style={{
  fontSize: 'clamp(var(--typography-heading-2-size), 5vw, var(--typography-display-1-size))',
  fontWeight: 'var(--typography-display-1-weight)',
  letterSpacing: 'var(--typography-display-1-ls)',
}}>
  Responsive Headline
</h1>
```

---

## 🎭 Sombras

### Aplicar Sombras
```jsx
// Flat (solo hairline)
<div style={{
  background: 'var(--color-surface-card)',
  border: '1px solid var(--color-hairline-soft)',
  borderRadius: 'var(--rounded-lg)',
  padding: 'var(--spacing-lg)',
  boxShadow: 'var(--shadow-flat)',
}}>
  Default card
</div>

// Soft (gently lifted)
<div style={{
  background: 'var(--color-surface-card)',
  borderRadius: 'var(--rounded-lg)',
  padding: 'var(--spacing-lg)',
  boxShadow: 'var(--shadow-soft)',
}}>
  Floating card
</div>

// Elevated (modals, popovers)
<div style={{
  background: 'var(--color-surface-card)',
  borderRadius: 'var(--rounded-xl)',
  padding: 'var(--spacing-xl)',
  boxShadow: 'var(--shadow-elevated)',
}}>
  Modal content
</div>

// Strong (maximum depth)
<div style={{
  background: 'var(--color-surface-card)',
  borderRadius: 'var(--rounded-lg)',
  padding: 'var(--spacing-lg)',
  boxShadow: 'var(--shadow-strong)',
}}>
  Overlay with strong shadow
</div>
```

---

## 🎨 Paleta de Stickers (Decorativa)

### ⚠️ IMPORTANTE: Solo para decoración, NUNCA para CTAs

```jsx
// ✅ Uso correcto: Decorative dots
<div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
  <span style={{
    width: 'var(--spacing-xs)',
    height: 'var(--spacing-xs)',
    borderRadius: '50%',
    background: 'var(--color-accent-purple)',
  }} />
  <span style={{
    width: 'var(--spacing-xs)',
    height: 'var(--spacing-xs)',
    borderRadius: '50%',
    background: 'var(--color-accent-pink)',
  }} />
  <span style={{
    width: 'var(--spacing-xs)',
    height: 'var(--spacing-xs)',
    borderRadius: '50%',
    background: 'var(--color-accent-teal)',
  }} />
</div>

// ✅ Uso correcto: Color-blocked illustration header
<div style={{
  borderRadius: 'var(--rounded-lg)',
  overflow: 'hidden',
  background: 'var(--color-surface-card)',
}}>
  <div style={{
    height: '120px',
    background: 'var(--color-accent-orange)',
  }} />
  <div style={{ padding: 'var(--spacing-lg)' }}>
    <h4 className="type-heading-3">Card with orange header</h4>
    <p className="type-body-md">Content goes here</p>
  </div>
</div>

// ❌ Uso incorrecto: NUNCA para botones
// <button style={{ background: 'var(--color-accent-pink)' }}>
//   Submit
// </button>
```

---

## 🧩 Composición Completa: Feature Section

```jsx
function FeatureSection() {
  return (
    <section className="section bg-canvas">
      <div className="container">
        {/* Eyebrow */}
        <span className="type-eyebrow text-primary">
          Features
        </span>

        {/* Heading */}
        <h2 className="type-heading-1" style={{ marginTop: 'var(--spacing-sm)' }}>
          Everything you need
        </h2>

        {/* Subheading */}
        <p className="type-body-md text-ink-secondary" style={{
          marginTop: 'var(--spacing-base)',
          maxWidth: '40rem',
        }}>
          Powerful features to help you work smarter and faster.
        </p>

        {/* Feature Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 'var(--spacing-lg)',
          marginTop: 'var(--spacing-xl)',
        }}>
          <Card>
            <div style={{
              width: 'var(--button-height-lg)',
              height: 'var(--button-height-lg)',
              borderRadius: 'var(--rounded-md)',
              background: 'rgb(var(--color-primary-raw) / 0.1)',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 'var(--spacing-base)',
            }}>
              ⚡
            </div>
            <h4 className="type-heading-3">Lightning Fast</h4>
            <p className="type-body-md text-ink-secondary" style={{ marginTop: 'var(--spacing-xs)' }}>
              Built for speed with optimized performance.
            </p>
          </Card>

          <Card elevated>
            <div style={{
              width: 'var(--button-height-lg)',
              height: 'var(--button-height-lg)',
              borderRadius: 'var(--rounded-md)',
              background: 'rgb(var(--color-primary-raw) / 0.1)',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 'var(--spacing-base)',
            }}>
              🔒
            </div>
            <h4 className="type-heading-3">Secure by Default</h4>
            <p className="type-body-md text-ink-secondary" style={{ marginTop: 'var(--spacing-xs)' }}>
              Enterprise-grade security built into every layer.
            </p>
          </Card>

          <Card>
            <div style={{
              width: 'var(--button-height-lg)',
              height: 'var(--button-height-lg)',
              borderRadius: 'var(--rounded-md)',
              background: 'rgb(var(--color-primary-raw) / 0.1)',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 'var(--spacing-base)',
            }}>
              🎨
            </div>
            <h4 className="type-heading-3">Beautiful Design</h4>
            <p className="type-body-md text-ink-secondary" style={{ marginTop: 'var(--spacing-xs)' }}>
              Thoughtfully designed with attention to detail.
            </p>
          </Card>
        </div>
      </div>
    </section>
  );
}
```

---

## 🎯 Quick Reference: Variables Más Usadas

```css
/* Colors */
--color-primary             /* Notion Blue - CTAs, links */
--color-secondary           /* Deep Indigo - hero bands */
--color-canvas              /* Warm paper background */
--color-surface-card        /* White cards */
--color-ink                 /* Primary text */
--color-ink-secondary       /* Body text */
--color-ink-muted           /* Supporting text */

/* Spacing */
--spacing-xxs  /* 4px */
--spacing-xs   /* 8px */
--spacing-sm   /* 12px */
--spacing-base /* 16px */
--spacing-lg   /* 24px */
--spacing-xl   /* 28px */
--spacing-xxl  /* 32px */

/* Typography */
--typography-display-1-size      /* 64px */
--typography-heading-1-size      /* 40px */
--typography-body-md-size        /* 16px */
--typography-button-size         /* 16px */

/* Shadows */
--shadow-flat      /* None */
--shadow-soft      /* Subtle multi-layer */
--shadow-elevated  /* Modals */

/* Radius */
--rounded-xs   /* 4px - inputs */
--rounded-md   /* 8px - utility */
--rounded-lg   /* 12px - cards */
--rounded-pill /* 9999px - CTAs */

/* Heights */
--button-height-sm  /* 36px */
--button-height-md  /* 38px */
--button-height-lg  /* 44px */
--nav-height        /* 56px */
```

---

## 💡 Tips Finales

1. **Siempre usa variables CSS** en lugar de valores hardcoded
2. **Mobile-first**: diseña primero para mobile, luego escala a desktop
3. **Pill-shaped para marketing CTAs**, rounded-md para utility
4. **Inputs siempre rounded-xs (4px)** según Notion
5. **Colores sticker solo para decoración**, nunca para estructura
6. **Sombras sutiles**: prefiere shadow-soft sobre valores custom
7. **Spacing consistente**: usa la escala de spacing, no valores custom
8. **Typography weight 700** en headings, 400 en body
9. **Negative letter-spacing** en displays para look profesional
10. **Hero band oscuro**: úsalo solo una vez por página para impacto máximo
