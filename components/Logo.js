import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Line } from 'react-native-svg';
import { LogoConfig } from './LogoConfig';

/**
 * Logo Component
 * 
 * Displays the Inventory Management logo with isometric cubes.
 * 
 * Props:
 * - size: Number (default: LogoConfig.size.default) - Size of the logo box
 * - showText: Boolean (default: true) - Whether to show "INVENTORY" text
 * - textColor: String (default: LogoConfig.text.defaultColor) - Color of the text
 * 
 * To customize the logo appearance, edit LogoConfig.js
 */
export default function Logo({ 
  size = LogoConfig.size.default, 
  showText = true, 
  textColor = LogoConfig.text.defaultColor 
}) {
  const logoBoxSize = size;
  const svgSize = size * LogoConfig.size.svgRatio;
  
  const config = LogoConfig;
  
  return (
    <View style={styles.container}>
      <View 
        style={[
          styles.logoBox, 
          { 
            width: logoBoxSize, 
            height: logoBoxSize,
            backgroundColor: config.box.backgroundColor,
            borderRadius: config.box.borderRadius,
            shadowColor: config.box.shadowColor,
            shadowOpacity: config.box.shadowOpacity,
            shadowRadius: config.box.shadowRadius,
            shadowOffset: config.box.shadowOffset,
          }
        ]}
      >
        <Svg width={svgSize} height={svgSize} viewBox="0 0 180 140" style={styles.svg}>
          {/* Base layer - 3 cubes */}
          
          {/* Left base cube */}
          <Path
            d="M 20 90 L 40 80 L 40 100 L 20 110 Z"
            fill="none"
            stroke={config.cubes.strokeColor}
            strokeWidth={config.cubes.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M 40 80 L 60 70 L 60 90 L 40 100 Z"
            fill="none"
            stroke={config.cubes.strokeColor}
            strokeWidth={config.cubes.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M 20 110 L 40 100 L 60 90 L 40 110 Z"
            fill="none"
            stroke={config.cubes.strokeColor}
            strokeWidth={config.cubes.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Center base cube (with grid) */}
          <Path
            d="M 60 70 L 80 60 L 80 80 L 60 90 Z"
            fill="none"
            stroke={config.cubes.strokeColor}
            strokeWidth={config.cubes.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M 80 60 L 100 50 L 100 70 L 80 80 Z"
            fill="none"
            stroke={config.cubes.strokeColor}
            strokeWidth={config.cubes.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M 60 90 L 80 80 L 100 70 L 80 90 Z"
            fill="none"
            stroke={config.cubes.strokeColor}
            strokeWidth={config.cubes.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Grid pattern on center cube front face (3x3 grid) */}
          {/* Vertical lines - parallel to left edge */}
          <Line 
            x1="66.67" 
            y1="73.33" 
            x2="66.67" 
            y2="86.67" 
            stroke={config.cubes.gridColor} 
            strokeWidth={config.cubes.gridStrokeWidth} 
            strokeLinecap="round" 
          />
          <Line 
            x1="73.33" 
            y1="66.67" 
            x2="73.33" 
            y2="80" 
            stroke={config.cubes.gridColor} 
            strokeWidth={config.cubes.gridStrokeWidth} 
            strokeLinecap="round" 
          />
          {/* Horizontal lines - parallel to top/bottom edges */}
          <Line 
            x1="60" 
            y1="73.33" 
            x2="80" 
            y2="63.33" 
            stroke={config.cubes.gridColor} 
            strokeWidth={config.cubes.gridStrokeWidth} 
            strokeLinecap="round" 
          />
          <Line 
            x1="60" 
            y1="80" 
            x2="80" 
            y2="70" 
            stroke={config.cubes.gridColor} 
            strokeWidth={config.cubes.gridStrokeWidth} 
            strokeLinecap="round" 
          />
          
          {/* Right base cube */}
          <Path
            d="M 100 50 L 120 40 L 120 60 L 100 70 Z"
            fill="none"
            stroke={config.cubes.strokeColor}
            strokeWidth={config.cubes.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M 120 40 L 140 30 L 140 50 L 120 60 Z"
            fill="none"
            stroke={config.cubes.strokeColor}
            strokeWidth={config.cubes.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M 100 70 L 120 60 L 140 50 L 120 70 Z"
            fill="none"
            stroke={config.cubes.strokeColor}
            strokeWidth={config.cubes.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Middle layer - 2 cubes */}
          
          {/* Left middle cube */}
          <Path
            d="M 40 60 L 60 50 L 60 70 L 40 80 Z"
            fill="none"
            stroke={config.cubes.strokeColor}
            strokeWidth={config.cubes.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M 60 50 L 80 40 L 80 60 L 60 70 Z"
            fill="none"
            stroke={config.cubes.strokeColor}
            strokeWidth={config.cubes.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M 40 80 L 60 70 L 80 60 L 60 80 Z"
            fill="none"
            stroke={config.cubes.strokeColor}
            strokeWidth={config.cubes.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Right middle cube */}
          <Path
            d="M 80 40 L 100 30 L 100 50 L 80 60 Z"
            fill="none"
            stroke={config.cubes.strokeColor}
            strokeWidth={config.cubes.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M 100 30 L 120 20 L 120 40 L 100 50 Z"
            fill="none"
            stroke={config.cubes.strokeColor}
            strokeWidth={config.cubes.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M 80 60 L 100 50 L 120 40 L 100 60 Z"
            fill="none"
            stroke={config.cubes.strokeColor}
            strokeWidth={config.cubes.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Top cube */}
          <Path
            d="M 60 30 L 80 20 L 80 40 L 60 50 Z"
            fill="none"
            stroke={config.cubes.strokeColor}
            strokeWidth={config.cubes.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M 80 20 L 100 10 L 100 30 L 80 40 Z"
            fill="none"
            stroke={config.cubes.strokeColor}
            strokeWidth={config.cubes.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M 60 50 L 80 40 L 100 30 L 80 50 Z"
            fill="none"
            stroke={config.cubes.strokeColor}
            strokeWidth={config.cubes.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
      {showText && (
        <Text 
          style={[
            styles.logoText, 
            { 
              color: textColor,
              fontSize: config.text.fontSize,
              fontWeight: config.text.fontWeight,
              letterSpacing: config.text.letterSpacing,
            }
          ]}
        >
          INVENTORY
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBox: {
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3, // Android shadow
  },
  svg: {
    margin: 0,
  },
  logoText: {
    fontFamily: 'System',
    marginTop: 12,
  },
});
