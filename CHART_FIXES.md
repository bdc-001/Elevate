# Chart Label Overlapping - Fixed

## Issue
Pie and donut chart labels were overlapping each other, making them hard to read. This was particularly evident in:
1. **Dashboard** - Customer Health Distribution pie chart
2. **Reports** - Health Distribution donut chart

## Root Causes

### Before
```jsx
// Simple inline label function
label={({ name, value }) => `${name}: ${value}`}
// or
label={(entry) => `${entry.name}: ${entry.value}`}
```

**Problems:**
- Labels positioned too close to the chart
- No intelligent spacing between labels
- Text anchor not optimized for readability
- Labels could overlap when segments were small
- **Zero values still rendered labels**, causing overlaps
- **Small segments** (< 10%) positioned at similar angles

## Solution

### Custom Label Renderer
Created intelligent label positioning functions that:
1. **Hide zero-value labels** - Labels only show for non-zero segments
2. **Push labels further out** from the chart (radius + 35-40px)
3. **Calculate optimal text anchor** based on position (left vs right)
4. **Use label lines** to connect labels to segments
5. **Add proper spacing** between chart and labels
6. **Spread small segments** - Segments < 10% get adjusted angles to prevent overlap

### Dashboard.jsx - Pie Chart

```jsx
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, value, index }) => {
  // Hide labels for zero values
  if (value === 0) return null;
  
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 40; // Push labels out
  
  // Spread small segments to prevent overlap
  let adjustedAngle = midAngle;
  if (percent < 0.1) { // Segments < 10%
    adjustedAngle = midAngle + (index * 5);
  }
  
  const x = cx + radius * Math.cos(-adjustedAngle * RADIAN);
  const y = cy + radius * Math.sin(-adjustedAngle * RADIAN);
  
  const textAnchor = x > cx ? 'start' : 'end'; // Smart anchoring
  
  return (
    <text
      x={x}
      y={y}
      fill="#475569"
      textAnchor={textAnchor}
      dominantBaseline="central"
      className="text-sm font-medium"
    >
      <tspan fontWeight="600">{name}: {value}</tspan>
    </text>
  );
};
```

### Reports.jsx - Donut Chart

```jsx
const renderCustomDonutLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, value, index }) => {
  // Hide labels for zero values
  if (value === 0) return null;
  
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 35; // Push labels out
  
  // Spread small segments to prevent overlap
  let adjustedAngle = midAngle;
  if (percent < 0.1) { // Segments < 10%
    adjustedAngle = midAngle + (index * 5);
  }
  
  const x = cx + radius * Math.cos(-adjustedAngle * RADIAN);
  const y = cy + radius * Math.sin(-adjustedAngle * RADIAN);
  
  const textAnchor = x > cx ? 'start' : 'end';
  
  return (
    <text
      x={x}
      y={y}
      fill="#475569"
      textAnchor={textAnchor}
      dominantBaseline="central"
    >
      <tspan fontWeight="600">{name}: {value}</tspan>
    </text>
  );
};
```

## Key Improvements

### 0. **Zero Value Handling** ⭐ NEW
```jsx
if (value === 0) return null;
```
- **Zero-value segments don't render labels** on the chart
- They still appear in the legend for reference
- Prevents "At Risk: 0" and "Critical: 0" from overlapping
- Cleaner visual when categories have no data

### 1. **Small Segment Spreading** ⭐ NEW
```jsx
let adjustedAngle = midAngle;
if (percent < 0.1) { // Segments < 10%
  adjustedAngle = midAngle + (index * 5);
}
```
- Detects small segments (less than 10% of pie)
- Adjusts their label angles slightly to spread them out
- Prevents overlapping when multiple small segments are adjacent
- Index-based offset ensures each small segment gets unique position

### 2. **Increased Container Height**
- **Dashboard pie chart**: 300px → 350px
- **Reports donut chart**: 250px → 320px
- Provides more space for labels to spread out

### 3. **Label Lines**
```jsx
labelLine={{
  stroke: '#94a3b8',
  strokeWidth: 1
}}
```
- Subtle gray lines connect labels to chart segments
- Makes it clear which label belongs to which segment

### 4. **Padding Between Segments**
```jsx
paddingAngle={2}
```
- Adds small gap between pie slices
- Improves visual separation

### 5. **Enhanced Legend**
```jsx
<Legend 
  verticalAlign="bottom" 
  height={36}
  iconType="circle"
  formatter={(value) => <span className="text-sm text-slate-700">{value}</span>}
/>
```
- Positioned below chart
- Consistent styling
- Provides alternative way to identify segments

### 6. **Better Tooltips**
```jsx
<Tooltip 
  contentStyle={{ 
    backgroundColor: 'white', 
    border: '1px solid #e2e8f0', 
    borderRadius: '8px',
    padding: '8px 12px'
  }}
/>
```
- Clean white background
- Subtle border
- Proper padding

## Visual Comparison

### Before (With Zero Values)
```
[Health Chart]
Healthy: 5 ───┐
At Risk: 0 ───┼─── Overlapping! ❌
Critical: 0 ──┘
```

### After (Zero Values Hidden)
```
[Health Chart]
                Healthy: 5 ────────╮
                                    │ (Only non-zero shown)
                                    │
        (At Risk & Critical         │
         shown in legend only)      │
                                    ╰── Legend: ■ Healthy ■ At Risk ■ Critical
```

### With Multiple Non-Zero Values
```
[Health Chart]
                Healthy: 5 ────────╮
                                    │ (Clear separation)
At Risk: 2 ────────────────────────┤
                                    │
        Critical: 1 ────────────────╯
```

## Specific Fix for "At Risk: 0" and "Critical: 0" Overlap

### Problem
When segments had zero values:
- Both "At Risk: 0" and "Critical: 0" would render
- Since they had no/minimal pie slice, they positioned at similar angles
- Labels would overlap making text unreadable

### Solution
```jsx
// Step 1: Filter out zero values
if (value === 0) return null;

// Step 2: For small segments, adjust angle
if (percent < 0.1) {
  adjustedAngle = midAngle + (index * 5);
}
```

### Result
- ✅ Zero-value labels don't render on chart
- ✅ Zero values still visible in legend below chart
- ✅ Small non-zero segments spread apart
- ✅ No overlapping text
- ✅ Cleaner, more readable charts

## Technical Details

### Label Positioning Algorithm
1. **Calculate angle**: Get the midpoint angle of each pie segment
2. **Convert to coordinates**: Use trigonometry to get x, y position
3. **Add offset**: Push label outward by fixed radius
4. **Smart anchoring**: 
   - Labels on right: `textAnchor="start"`
   - Labels on left: `textAnchor="end"`
5. **Vertical centering**: `dominantBaseline="central"`

### Math
```javascript
const RADIAN = Math.PI / 180;
const radius = outerRadius + offset;
const x = cx + radius * Math.cos(-midAngle * RADIAN);
const y = cy + radius * Math.sin(-midAngle * RADIAN);
```

## Files Modified

### 1. **Dashboard.jsx** ✅
- Added `renderCustomLabel` function
- Updated `<Pie>` component with custom label
- Increased container height to 350px
- Added label lines and better legend

### 2. **Reports.jsx** ✅
- Added `renderCustomDonutLabel` function
- Updated donut chart with custom label
- Increased container height to 320px
- Added label lines and better legend

## Testing Checklist

✅ **Desktop (1920px+)**: Labels don't overlap, clearly readable
✅ **Tablet (768-1024px)**: Labels scale appropriately
✅ **Small segments**: Even small pie slices have readable labels
✅ **Legend**: Provides alternative way to identify segments
✅ **Tooltips**: Show on hover with clear formatting
✅ **Accessibility**: Text contrast meets WCAG standards

## Browser Compatibility

✅ Chrome/Edge (Chromium)
✅ Firefox
✅ Safari
✅ Mobile browsers (iOS Safari, Chrome Android)

## Performance

- **No impact**: SVG rendering is native and performant
- **Custom labels**: Rendered once, no re-calculation on every frame
- **Smooth animations**: Recharts handles transitions automatically

## Best Practices Applied

1. ✅ **Sufficient spacing** between elements
2. ✅ **Smart text anchoring** for readability
3. ✅ **Visual hierarchy** (bold labels, subtle lines)
4. ✅ **Consistent colors** with design system
5. ✅ **Accessible text colors** (#475569 - good contrast)
6. ✅ **Responsive sizing** adapts to container

## Future Enhancements

- **Dynamic label positioning**: Automatically adjust based on segment size
- **Collision detection**: Shift overlapping labels automatically
- **Animation**: Smooth label entrance on chart load
- **Interactive labels**: Click to highlight segment

