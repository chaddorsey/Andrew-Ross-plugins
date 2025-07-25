# Systematic Rebuild - MultiVariateExtras

## Overview

This branch contains a systematic rebuild of the MultiVariateExtras plugin to avoid MobX state tree reference resolution errors in CODAP v3.

## Quick Start

### 1. Load the Minimal Plugin

Open `minimal-index.html` in CODAP to test the minimal version of the plugin.

### 2. Test Basic Functionality

1. Click **"Compute Correlations"** to test data computation
2. Click **"Debug Info"** to see plugin status
3. Click **"Show Error Log"** to see testing results

### 3. Test Individual Features

1. Click **"Test Data Context"** to test data context creation
2. Click **"Test Basic Table"** to test table component creation
3. Click **"Test All Features"** to run all tests systematically

## Files

- `src/minimal-multiVariateExtras.js` - Minimal plugin implementation
- `minimal-index.html` - HTML file for testing the minimal plugin
- `SYSTEMATIC_REBUILD_PLAN.md` - Detailed plan and strategy
- `README_SYSTEMATIC_REBUILD.md` - This file

## Testing Strategy

### Phase 1: Minimal Core ✅
- Data computation in memory
- HTML display in plugin iframe
- No CODAP component creation
- No shared model references

### Phase 2: Data Context Operations 🔄
- Create data context
- Read data context
- Update data context
- Delete data context

### Phase 3: Basic Component Creation 🔄
- Basic table component
- Basic graph component
- Component deletion
- Component updates

## Error Tracking

The plugin automatically tracks errors for each feature:

```javascript
// Check error status
minimalMultiVariateExtras.getErrorLogStatus()

// Show error log in UI
minimalMultiVariateExtras.showErrorLog()
```

## Browser Console Commands

```javascript
// Get debug information
minimalMultiVariateExtras.showDebugInfo()

// Test all features
await minimalMultiVariateExtras.testFeature()

// Test specific features
await minimalMultiVariateExtras.testDataContextCreation()
await minimalMultiVariateExtras.testBasicTable()

// Get error log status
console.log(minimalMultiVariateExtras.getErrorLogStatus())
```

## Expected Results

### Best Case
- All features work without MobX errors
- Full plugin functionality can be restored

### Realistic Case
- Data operations work
- HTML display works
- Data context creation works
- Component creation fails (triggers MobX errors)

### Worst Case
- Only in-memory operations are safe
- Complete avoidance of CODAP v3 shared model system needed

## Next Steps

1. Test the minimal plugin
2. Document which features work/fail
3. Implement workarounds for problematic features
4. Build final plugin using only safe features

## Reporting Issues

When testing, please:

1. Note which features work
2. Note which features fail
3. Document any error messages
4. Check the browser console for detailed logs
5. Use the "Show Error Log" button to see testing results

## Version

This is version **2025a-minimal** of the systematic rebuild. 