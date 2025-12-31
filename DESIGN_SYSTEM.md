# Convin Elevate Design System

## Overview
This document outlines the design system implementation for Convin Elevate, following a developer-first experience with professional technical aesthetics.

## Color Palette

### Primary Brand Colors
```css
Primary Blue:    #1A62F2 (hsl(218, 89%, 53%))
Secondary Purple: #6A4FF7 (hsl(251, 91%, 64%))
```

### Accent Colors
```css
Pink:    #F564A9
Red:     #F93739
Yellow:  #F8AA0D
Gray:    #999999
Green:   #1AC468
```

### UI Colors
```css
Hover:      #E8EFFE
Chart Icon: #1580EB
```

### Gradients
- **Primary Gradient**: `linear-gradient(135deg, #1A62F2 0%, #6A4FF7 100%)`
- **Accent Gradient**: `linear-gradient(135deg, #F564A9 0%, #7A53BE 50%, #305FE7 100%)`
- **Background**: `linear-gradient(135deg, hsl(240, 20%, 98%) 0%, hsl(260, 10%, 99%) 100%)`

## Typography

### Font Families
- **Sans-serif (UI/Body)**: Figtree (weights: 300, 400, 500, 600, 700)
- **Monospace (Code/API)**: JetBrains Mono (weights: 400, 500, 600)

### Type Scale (1.25 ratio)
```css
h1: 44px (font-weight: 700)
h2: 36px (font-weight: 700)
h3: 28px (font-weight: 600)
h4: 22px (font-weight: 600)
h5: 18px (font-weight: 600)
h6: 14px (font-weight: 600)
Body: 14px (font-weight: 400)
```

### Font Weights
- Headlines: 600-700
- Body: 400-500
- Code/API: 400-600

## Spacing System

Uses Tailwind CSS spacing units:
- **Micro spacing**: 1, 2 (buttons, form elements)
- **Component spacing**: 4, 6, 8 (cards, sections)
- **Layout spacing**: 12, 16, 24 (major sections, page margins)

## Component Styles

### Health Status
- **Healthy**: Green (#1AC468) on light green background
- **At Risk**: Yellow (#F8AA0D) on light yellow background
- **Critical**: Red (#F93739) on light red background

### Status Badges
- **Completed**: Green with medium font-weight (500)
- **In Progress**: Primary blue with brand hover background
- **Not Started**: Gray on neutral background

### Risk Severity
- **Critical**: Red with bold font-weight (600)
- **High**: Pink with bold font-weight (600)
- **Medium**: Yellow with medium font-weight (500)
- **Low**: Primary blue with medium font-weight (500)

## Dark Mode Support

### Color Adjustments
```css
Primary (Dark):   hsl(240, 80%, 70%)
Secondary (Dark): hsl(260, 50%, 65%)
Background (Dark): hsl(240, 10%, 5%)
```

## UI Elements

### Tables
- Header: Light background with subtle bottom border
- Row hover: Brand hover color (#E8EFFE)
- Font size: 14px for cells, slightly smaller for headers

### Inputs
- Focus state: Primary blue border with brand hover shadow
- Border radius: 0.5rem (8px)

### Scrollbars
- Track: Light neutral gray
- Thumb: Medium gray, changes to brand primary on hover

### Buttons
- Transitions on hover and active states
- Scale animation on click (0.98)

### Cards
- Subtle shadow on hover
- Slight upward translate on hover (-2px)

## Implementation Details

### Files Updated
1. **tailwind.config.js**: Added brand color palette and JetBrains Mono font
2. **src/index.css**: Updated CSS variables for light and dark modes
3. **src/App.css**: Updated component styles with brand colors
4. **public/index.html**: Added JetBrains Mono font import
5. **src/components/EnhancedLayout.jsx**: Updated UI with brand colors and gradients

### CSS Variables
```css
--primary: 218 89% 53%
--secondary: 251 91% 64%
--background: 240 20% 98%
--chart-1: 208 90% 51% (Chart Icon)
--chart-2: 151 60% 48% (Green)
--chart-3: 42 98% 51% (Yellow)
--chart-4: 331 89% 68% (Pink)
--chart-5: 251 91% 64% (Purple)
```

## Usage Examples

### Using Brand Colors in Components
```jsx
// Primary gradient logo/button
<div className="bg-gradient-to-br from-brand-primary to-brand-secondary" />

// Active navigation item
<Link className="bg-brand-hover text-brand-primary" />

// Hover state
<button className="hover:bg-slate-50" />
```

### Using Utility Classes
```jsx
// Gradient backgrounds
<div className="gradient-primary" />
<div className="gradient-accent" />

// Status indicators
<span className="health-healthy">Healthy</span>
<span className="risk-critical">Critical</span>
<span className="status-completed">Completed</span>
```

### Typography
```jsx
// Headlines
<h1 className="font-bold">Main Title</h1>
<h3 className="font-semibold">Section Title</h3>

// Code/API elements
<code className="font-mono">API_KEY</code>
<pre className="font-mono">code block</pre>
```

## Accessibility

- All colors meet WCAG AA contrast ratios
- Focus states clearly visible
- Hover states provide clear feedback
- Semantic HTML used throughout

## Future Enhancements

- Animation system for page transitions
- Component library with Storybook
- Interactive playground for API demonstration
- Voice/audio visual metaphors for API documentation

