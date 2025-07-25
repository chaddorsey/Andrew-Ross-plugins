# Systematic Rebuild Plan for MultiVariateExtras

## Overview

This document outlines the systematic approach to rebuild the MultiVariateExtras plugin to avoid MobX state tree reference resolution errors in CODAP v3.

## Problem Analysis

The MobX error occurs because:
1. **CODAP v3 creates shared model references** when components are created
2. **These references persist** even after components are deleted
3. **The formula manager's reaction** tries to access these stale references
4. **MobX state tree fails** to resolve them

Our plugin is **triggering this CODAP v3 bug** by creating components that later become stale references.

## Strategy: Systematic Feature Testing

### Phase 1: Minimal Core Functionality ✅

**Goal**: Create a plugin that does the absolute minimum to avoid triggering CODAP v3's shared model issues.

**Implementation**: `minimal-multiVariateExtras.js`

**Features**:
- ✅ Data computation in memory
- ✅ HTML display in plugin iframe
- ✅ No CODAP component creation
- ✅ No shared model references
- ✅ Error logging system

**Testing Protocol**:
1. Load minimal plugin
2. Test data computation
3. Test HTML display
4. Monitor for MobX errors
5. Document results

### Phase 2: Data Context Operations 🔄

**Goal**: Test creating and manipulating CODAP data contexts without components.

**Features to Test**:
- [ ] Create data context
- [ ] Read data context
- [ ] Update data context
- [ ] Delete data context

**Implementation Plan**:
```javascript
// Add to minimal plugin
testDataContextCreation: async function() {
    try {
        // Create a simple data context
        const result = await codapInterface.sendRequest({
            action: "create",
            resource: "dataContext",
            values: {
                name: "TestContext",
                collections: [{
                    name: "TestCollection",
                    attrs: [
                        { name: "X", type: "numeric" },
                        { name: "Y", type: "numeric" }
                    ]
                }]
            }
        });
        
        this.errorLog.documentSuccess('data-context-creation');
        return result;
    } catch (error) {
        this.errorLog.documentError('data-context-creation', error);
        throw error;
    }
}
```

### Phase 3: Basic Component Creation 🔄

**Goal**: Test creating minimal CODAP components one by one.

**Features to Test**:
- [ ] Basic table component
- [ ] Basic graph component
- [ ] Component deletion
- [ ] Component updates

**Implementation Plan**:
```javascript
// Add to minimal plugin
testBasicTable: async function() {
    try {
        // Create a minimal table component
        const result = await codapInterface.sendRequest({
            action: "create",
            resource: "component",
            values: {
                type: "DG.TableView",
                name: "TestTable",
                dataContext: "TestContext"
            }
        });
        
        this.errorLog.documentSuccess('basic-table');
        return result;
    } catch (error) {
        this.errorLog.documentError('basic-table', error);
        throw error;
    }
}
```

### Phase 4: Enhanced Component Features 🔄

**Goal**: Test more complex component features.

**Features to Test**:
- [ ] Enhanced table formatting
- [ ] Graph legends and styling
- [ ] Component interactions
- [ ] Multiple components

### Phase 5: Integration Testing 🔄

**Goal**: Test the full plugin functionality with safe features only.

**Features to Test**:
- [ ] Complete workflow
- [ ] Error recovery
- [ ] Performance testing
- [ ] User experience

## Error Documentation System

### Error Log Structure

```javascript
errorLog: {
    features: {
        'data-computation': { tested: false, errors: false, timestamp: null },
        'html-display': { tested: false, errors: false, timestamp: null },
        'data-context-creation': { tested: false, errors: false, timestamp: null },
        'basic-table': { tested: false, errors: false, timestamp: null },
        'enhanced-table': { tested: false, errors: false, timestamp: null },
        'basic-graph': { tested: false, errors: false, timestamp: null },
        'enhanced-graph': { tested: false, errors: false, timestamp: null }
    }
}
```

### Error Tracking Methods

1. **Automatic Testing**: Each feature is tested automatically
2. **Manual Testing**: Features can be tested individually
3. **Error Logging**: All errors are logged with context
4. **Status Reporting**: Current status is displayed in UI

## Implementation Instructions

### Step 1: Test Minimal Plugin

1. Load `minimal-index.html` in CODAP
2. Click "Compute Correlations" button
3. Verify data computation works
4. Verify HTML display works
5. Check for any MobX errors

### Step 2: Add Data Context Features

1. Implement `testDataContextCreation()` method
2. Add "Test Data Context" button to UI
3. Test data context creation
4. Document any errors

### Step 3: Add Basic Component Features

1. Implement `testBasicTable()` method
2. Add "Test Basic Table" button to UI
3. Test table component creation
4. Document any errors

### Step 4: Iterate and Refine

1. Based on error results, determine safe features
2. Implement workarounds for problematic features
3. Build final plugin using only safe features

## Expected Outcomes

### Best Case Scenario
- ✅ Data operations work (no shared model references)
- ✅ HTML display works (no CODAP components)
- ✅ Data context creation works (minimal shared model usage)
- ✅ Basic component creation works (with proper cleanup)

### Realistic Scenario
- ✅ Data operations work
- ✅ HTML display works
- ✅ Data context creation works
- ❌ Component creation fails (triggers MobX errors)

### Worst Case Scenario
- ✅ Data operations work
- ✅ HTML display works
- ❌ Even data context creation triggers MobX errors
- ❌ Only in-memory operations are safe

## Testing Commands

### Browser Console Commands

```javascript
// Get current error log status
minimalMultiVariateExtras.getErrorLogStatus()

// Test a specific feature
await minimalMultiVariateExtras.testFeature()

// Show debug information
minimalMultiVariateExtras.showDebugInfo()

// Compute correlations
await minimalMultiVariateExtras.computeAndDisplayCorrelations()
```

### Manual Testing Steps

1. **Load the minimal plugin**
2. **Test basic functionality**
   - Click "Compute Correlations"
   - Verify results display
3. **Test debug features**
   - Click "Debug Info"
   - Review error log status
4. **Test systematic features**
   - Click "Test Feature"
   - Review results for each feature
5. **Document findings**
   - Note which features work
   - Note which features fail
   - Document error messages

## Success Criteria

### Phase 1 Success
- [ ] Minimal plugin loads without errors
- [ ] Data computation works
- [ ] HTML display works
- [ ] No MobX errors occur

### Phase 2 Success
- [ ] Data context creation works
- [ ] Data context operations work
- [ ] No MobX errors occur

### Phase 3 Success
- [ ] Basic component creation works
- [ ] Component operations work
- [ ] Proper cleanup occurs
- [ ] No MobX errors occur

### Overall Success
- [ ] Functional plugin with safe features
- [ ] Clear documentation of limitations
- [ ] Workarounds for problematic features
- [ ] Stable operation in CODAP v3

## Next Steps

1. **Test Phase 1** (Minimal Plugin)
2. **Implement Phase 2** (Data Context Operations)
3. **Test Phase 2** and document results
4. **Implement Phase 3** (Basic Components)
5. **Test Phase 3** and document results
6. **Build final plugin** based on findings

## Version History

- **2025a-minimal**: Initial minimal plugin implementation
- **2025a-phase1**: Phase 1 testing complete
- **2025a-phase2**: Phase 2 implementation and testing
- **2025a-phase3**: Phase 3 implementation and testing
- **2025a-final**: Final plugin based on systematic testing 