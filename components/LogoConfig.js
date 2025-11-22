/**
 * Logo Configuration File
 *
 * This file contains all the customizable settings for the logo.
 * Modify the values below to change the logo appearance.
 */

export const LogoConfig = {
  // Logo Box Settings
  box: {
    backgroundColor: "#ffffff", // Background color of the logo box
    borderRadius: 16, // Rounded corners (in pixels)
    shadowColor: "#000", // Shadow color
    shadowOpacity: 0.1, // Shadow opacity (0-1)
    shadowRadius: 4, // Shadow blur radius
    shadowOffset: { width: 0, height: 2 }, // Shadow position
  },

  // SVG/Cube Settings
  cubes: {
    strokeColor: "#000000", // Color of cube outlines
    strokeWidth: 2.5, // Thickness of cube lines
    gridColor: "#000000", // Color of grid lines on center cube
    gridStrokeWidth: 1.8, // Thickness of grid lines
  },

  // Text Settings
  text: {
    fontSize: 20, // Size of "INVENTORY" text
    fontWeight: "bold", // Text weight: 'normal', 'bold', '100'-'900'
    letterSpacing: 3, // Space between letters
    defaultColor: "#fff", // Default text color (white)
  },

  // Size Settings
  size: {
    default: 120, // Default logo size
    svgRatio: 0.7, // SVG takes 70% of box size
  },

  // Cube Positions (Advanced - modify if you want to change cube layout)
  // Coordinates are in SVG viewBox units (0-180 width, 0-140 height)
  positions: {
    // Base layer cubes
    baseLeft: {
      front: { x: 20, y: 90, width: 20, height: 20 },
      top: { x: 40, y: 80, width: 20, height: 20 },
      right: { x: 40, y: 100, width: 20, height: 20 },
    },
    baseCenter: {
      front: { x: 60, y: 70, width: 20, height: 20 },
      top: { x: 80, y: 60, width: 20, height: 20 },
      right: { x: 80, y: 80, width: 20, height: 20 },
      hasGrid: true, // This cube has the grid pattern
    },
    baseRight: {
      front: { x: 100, y: 50, width: 20, height: 20 },
      top: { x: 120, y: 40, width: 20, height: 20 },
      right: { x: 120, y: 60, width: 20, height: 20 },
    },
    // Middle layer cubes
    middleLeft: {
      front: { x: 40, y: 60, width: 20, height: 20 },
      top: { x: 60, y: 50, width: 20, height: 20 },
      right: { x: 60, y: 70, width: 20, height: 20 },
    },
    middleRight: {
      front: { x: 80, y: 40, width: 20, height: 20 },
      top: { x: 100, y: 30, width: 20, height: 20 },
      right: { x: 100, y: 50, width: 20, height: 20 },
    },
    // Top cube
    top: {
      front: { x: 60, y: 30, width: 20, height: 20 },
      top: { x: 80, y: 20, width: 20, height: 20 },
      right: { x: 80, y: 40, width: 20, height: 20 },
    },
  },
};
