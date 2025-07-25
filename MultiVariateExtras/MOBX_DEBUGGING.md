# MobX State Tree Debugging Guide for MultiVariateExtras Plugin

## Overview

This document explains the debugging features added to the MultiVariateExtras plugin to help troubleshoot MobX state tree reference resolution errors in CODAP v3.

## Understanding the Problem

MobX state tree reference resolution errors occur when CODAP tries to resolve references to components or tiles that no longer exist. This typically happens when:

1. **Components are deleted externally** (e.g., user deletes a graph component)
2. **Document state becomes inconsistent** (e.g., after a crash or improper shutdown)
3. **Plugin state gets out of sync** with CODAP's internal state
4. **Shared model references become stale** when components are removed

## Error Pattern

The typical error message looks like:
```
[mobx-state-tree] Failed to resolve reference 'TABL627197301076006' to type 'TileModel' 
(from node: /content/sharedModelMap/SHARuefJezLIyt6c/tiles/1)
```

## Debugging Features Added

### 1. Component Tracking

The plugin now tracks all components it creates to prevent stale references:

```javascript
// Track a component when it's created
multiVariateExtras.trackComponent(componentId, {
    type: 'correlation_graph',
    dataset: 'MyDataset',
    xAxis: 'Predictor',
    yAxis: 'Response'
});

// Remove tracking when component is deleted
multiVariateExtras.untrackComponent(componentId);
```

### 2. Reference Validation

Automatically validates and cleans up stale references:

```javascript
// Validate all tracked components
await multiVariateExtras.validateReferences();

// This checks if each tracked component still exists in CODAP
// and removes tracking for components that no longer exist
```

### 3. Error Handling

Comprehensive error handling for reference resolution issues:

```javascript
// Dedicated error handler for MobX reference errors
await multiVariateExtras.handleReferenceResolutionError(error);
```

### 4. Debug Mode

A debug button in the UI provides detailed information:

```javascript
// Trigger debug mode from UI or console
multiVariateExtras.debugMode();
```

## How to Use the Debugging Features

### 1. Using the Debug Button

1. Look for the "Debug" button in the top-right corner of the plugin
2. Click it to see detailed information about:
   - Tracked components
   - Component references
   - Dataset information
   - Plugin state
3. The system will automatically validate references
4. Check the browser console for detailed logs

### 2. Using Browser Console

You can access debugging features directly from the browser console:

```javascript
// Get debug information
console.log(multiVariateExtras.getDebugInfo());

// Validate references
await multiVariateExtras.validateReferences();

// Trigger debug mode
await multiVariateExtras.debugMode();

// Handle a specific error
await multiVariateExtras.handleReferenceResolutionError(error);
```

### 3. Automatic Cleanup

The plugin automatically:
- Tracks components when they're created
- Removes tracking when components are deleted
- Validates references on document save
- Cleans up on page unload

## Troubleshooting Steps

### Step 1: Use Debug Mode

1. Click the "Debug" button in the plugin UI
2. Review the information displayed
3. Check the browser console for detailed logs

### Step 2: Validate References

If you see stale references:

```javascript
await multiVariateExtras.validateReferences();
```

### Step 3: Manual Cleanup

If automatic cleanup doesn't work:

```javascript
// Force cleanup of all tracked components
await multiVariateExtras.cleanup();
```

### Step 4: Reset Plugin State

If the plugin state is corrupted:

1. Refresh the CODAP document
2. Restart the plugin
3. Recreate any missing components

## Error Recovery

### Immediate Actions

1. **Don't panic** - The error is usually recoverable
2. **Use debug mode** to understand the current state
3. **Validate references** to clean up stale data
4. **Try the operation again** - it often works after cleanup

### If Problems Persist

1. **Refresh the CODAP document** - This resets the MobX state tree
2. **Restart the plugin** - This clears plugin state
3. **Recreate components** - If graphs or tables are missing
4. **Check for external deletions** - Ensure no components were deleted manually

## Prevention Strategies

### For Developers

1. **Always track components** when creating them
2. **Remove tracking** when components are deleted
3. **Validate references** periodically
4. **Handle errors gracefully** with proper error messages

### For Users

1. **Use the plugin's delete functions** rather than manually deleting components
2. **Save documents regularly** to maintain state consistency
3. **Report issues** with debug information when problems occur

## Technical Details

### Component Tracking Structure

```javascript
createdComponents: Set<string> // Component IDs
componentReferences: Map<string, {
    created: Date,
    type: string,
    data: Object
}>
```

### Reference Validation Process

1. Check each tracked component ID against CODAP
2. Remove tracking for non-existent components
3. Log cleanup actions for debugging
4. Update internal state

### Error Detection

The plugin detects MobX reference errors by checking for:
- Error messages containing "Failed to resolve reference"
- Error messages containing "mobx-state-tree"
- Reference-related error patterns

## Browser Console Commands

Here are useful commands for debugging:

```javascript
// Get current plugin state
multiVariateExtras.getDebugInfo()

// Validate all references
await multiVariateExtras.validateReferences()

// Show debug information
await multiVariateExtras.debugMode()

// Force cleanup
await multiVariateExtras.cleanup()

// Check tracked components
console.log(Array.from(multiVariateExtras.createdComponents))

// Check component references
console.log(Object.fromEntries(multiVariateExtras.componentReferences))
```

## Reporting Issues

When reporting MobX reference resolution errors, please include:

1. **Error message** - The exact error text
2. **Debug information** - Output from `multiVariateExtras.getDebugInfo()`
3. **Steps to reproduce** - What you were doing when the error occurred
4. **CODAP version** - The version of CODAP you're using
5. **Plugin version** - The version of MultiVariateExtras

## Version History

- **2025a**: Initial implementation of MobX debugging features
- Added component tracking
- Added reference validation
- Added debug mode
- Added error handling

## Support

If you continue to experience issues after using these debugging features, please:

1. Collect debug information using the debug button
2. Note the exact steps that led to the error
3. Report the issue with all relevant information
4. Include browser console logs if available 
