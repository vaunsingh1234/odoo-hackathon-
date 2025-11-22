# Logo Customization Guide

This guide explains how to customize the logo for your Inventory Management app.

## Quick Start

All logo settings are in **`components/LogoConfig.js`**. Open that file to make changes.

## What You Can Customize

### 1. Logo Box Appearance

Edit the `box` section in `LogoConfig.js`:

```javascript
box: {
  backgroundColor: '#ffffff',      // Change box background color
  borderRadius: 16,                // Change corner roundness
  shadowColor: '#000',             // Change shadow color
  shadowOpacity: 0.1,              // Change shadow intensity (0-1)
  shadowRadius: 4,                  // Change shadow blur
  shadowOffset: { width: 0, height: 2 }, // Change shadow position
}
```

**Examples:**
- Blue box: `backgroundColor: '#4A90E2'`
- No shadow: `shadowOpacity: 0`
- Larger shadow: `shadowRadius: 8`

### 2. Cube Colors and Thickness

Edit the `cubes` section:

```javascript
cubes: {
  strokeColor: '#000000',          // Color of cube outlines
  strokeWidth: 2.5,                 // Thickness of cube lines
  gridColor: '#000000',             // Color of grid lines
  gridStrokeWidth: 1.8,              // Thickness of grid lines
}
```

**Examples:**
- Blue cubes: `strokeColor: '#2196F3'`
- Thicker lines: `strokeWidth: 3.5`
- Red grid: `gridColor: '#F44336'`

### 3. Text Appearance

Edit the `text` section:

```javascript
text: {
  fontSize: 20,                      // Text size
  fontWeight: 'bold',                 // 'normal', 'bold', or '100'-'900'
  letterSpacing: 3,                  // Space between letters
  defaultColor: '#fff',              // Default text color
}
```

**Examples:**
- Larger text: `fontSize: 24`
- Normal weight: `fontWeight: 'normal'`
- Tighter spacing: `letterSpacing: 1`

### 4. Logo Size

Edit the `size` section:

```javascript
size: {
  default: 120,                      // Default logo size in pixels
  svgRatio: 0.7,                     // SVG takes 70% of box (0-1)
}
```

**Examples:**
- Larger logo: `default: 150`
- SVG fills more space: `svgRatio: 0.85`

## Using the Logo Component

In your screens, you can also customize the logo when using it:

```javascript
import Logo from '../components/Logo';

// Default logo
<Logo />

// Custom size
<Logo size={150} />

// Hide text
<Logo showText={false} />

// Custom text color
<Logo textColor="#FF5722" />

// All options
<Logo size={140} showText={true} textColor="#fff" />
```

## Advanced: Changing Cube Positions

If you want to rearrange the cubes, edit the `positions` section in `LogoConfig.js`. This requires understanding SVG coordinates.

The viewBox is `0 0 180 140`, so:
- X: 0 (left) to 180 (right)
- Y: 0 (top) to 140 (bottom)

Each cube has three faces:
- `front`: The front-facing parallelogram
- `top`: The top-facing parallelogram  
- `right`: The right-facing parallelogram

## Tips

1. **Color Codes**: Use hex colors like `#FF5733` or named colors like `'red'`
2. **Testing**: After making changes, save the file and the app will reload automatically
3. **Consistency**: Keep colors consistent across your app theme
4. **Accessibility**: Ensure good contrast between text and background

## Common Customizations

### Dark Theme Logo
```javascript
box: {
  backgroundColor: '#1a1a1a',
  // ...
},
cubes: {
  strokeColor: '#ffffff',
  gridColor: '#ffffff',
  // ...
},
text: {
  defaultColor: '#ffffff',
  // ...
}
```

### Minimalist Logo
```javascript
box: {
  shadowOpacity: 0,  // No shadow
  // ...
},
cubes: {
  strokeWidth: 2,    // Thinner lines
  // ...
}
```

### Colorful Logo
```javascript
cubes: {
  strokeColor: '#4CAF50',  // Green cubes
  gridColor: '#2196F3',     // Blue grid
  // ...
}
```

## Need Help?

- Check `components/Logo.js` to see how the config is used
- All settings are documented with comments
- SVG coordinates follow isometric projection rules

