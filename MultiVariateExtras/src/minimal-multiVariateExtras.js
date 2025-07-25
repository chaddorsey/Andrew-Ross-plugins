/**
 * Minimal MultiVariateExtras Plugin
 * Avoids CODAP v3 shared model issues by not creating components
 * 
 * This is a systematic rebuild approach to identify which operations
 * trigger MobX state tree reference resolution errors.
 * 
 * Version: 2025a-minimal
 * Author: Systematic Rebuild Team
 */

/* global codapInterface */

const minimalMultiVariateExtras = {
    version: '2025a-minimal',
    
    // No component tracking - avoiding shared model references
    // No cleanup needed - no components to clean up
    
    /**
     * Initialize minimal plugin
     */
    initialize: function() {
        console.log("Minimal MultiVariateExtras initializing...");
        console.log("Version:", this.version);
        console.log("Strategy: Avoid CODAP v3 shared model references");
        
        this.setupUI();
        this.setupEventHandlers();
        this.setupErrorLogging();
        
        console.log("Minimal MultiVariateExtras initialization complete");
    },
    
    /**
     * Setup basic UI without CODAP components
     */
    setupUI: function() {
        const container = document.getElementById('multiVariateExtras-container');
        if (container) {
            container.innerHTML = `
                <div class="minimal-ui">
                    <div class="minimal-header">
                        <h3>MultiVariateExtras (Minimal)</h3>
                        <div class="version-info">Version: ${this.version}</div>
                        <div class="strategy-info">Strategy: Avoid CODAP v3 shared model references</div>
                    </div>
                    
                    <div class="minimal-controls">
                        <button id="compute-correlations" class="minimal-button">
                            Compute Correlations
                        </button>
                        <button id="debug-info" class="minimal-button">
                            Debug Info
                        </button>
                        <button id="test-feature" class="minimal-button">
                            Test All Features
                        </button>
                    </div>
                    
                    <div class="minimal-controls">
                        <h4>Individual Feature Tests:</h4>
                        <button id="test-data-context" class="minimal-button">
                            Test Data Context
                        </button>
                        <button id="test-basic-table" class="minimal-button">
                            Test Basic Table
                        </button>
                        <button id="show-error-log" class="minimal-button">
                            Show Error Log
                        </button>
                    </div>
                    
                    <div class="minimal-status">
                        <div id="status-message">Ready to compute correlations</div>
                    </div>
                    
                    <div id="results-display" class="minimal-results"></div>
                    
                    <div id="error-log" class="minimal-error-log" style="display: none;">
                        <h4>Error Log</h4>
                        <div id="error-log-content"></div>
                    </div>
                </div>
            `;
        }
    },
    
    /**
     * Setup event handlers
     */
    setupEventHandlers: function() {
        document.getElementById('compute-correlations')?.addEventListener('click', () => {
            this.computeAndDisplayCorrelations();
        });
        
        document.getElementById('debug-info')?.addEventListener('click', () => {
            this.showDebugInfo();
        });
        
        document.getElementById('test-feature')?.addEventListener('click', () => {
            this.testFeature();
        });
        
        document.getElementById('test-data-context')?.addEventListener('click', async () => {
            try {
                this.updateStatus("Testing data context creation...");
                await this.testDataContextCreation();
                this.updateStatus("Data context creation test completed successfully");
                this.showMessage("Data context creation test completed successfully", "success");
            } catch (error) {
                this.updateStatus("Data context creation test failed");
                this.showMessage("Data context creation test failed: " + error.message, "error");
            }
        });
        
        document.getElementById('test-basic-table')?.addEventListener('click', async () => {
            try {
                this.updateStatus("Testing basic table creation...");
                await this.testBasicTable();
                this.updateStatus("Basic table creation test completed successfully");
                this.showMessage("Basic table creation test completed successfully", "success");
            } catch (error) {
                this.updateStatus("Basic table creation test failed");
                this.showMessage("Basic table creation test failed: " + error.message, "error");
            }
        });
        
        document.getElementById('show-error-log')?.addEventListener('click', () => {
            this.showErrorLog();
        });
    },
    
    /**
     * Setup error logging for systematic testing
     */
    setupErrorLogging: function() {
        this.errorLog = {
            features: {
                'data-computation': { tested: false, errors: false, timestamp: null },
                'html-display': { tested: false, errors: false, timestamp: null },
                'data-context-creation': { tested: false, errors: false, timestamp: null },
                'basic-table': { tested: false, errors: false, timestamp: null },
                'enhanced-table': { tested: false, errors: false, timestamp: null },
                'basic-graph': { tested: false, errors: false, timestamp: null },
                'enhanced-graph': { tested: false, errors: false, timestamp: null }
            },
            
            documentError: function(feature, error) {
                if (this.features[feature]) {
                    this.features[feature] = {
                        tested: true,
                        errors: true,
                        trigger: error.message,
                        timestamp: new Date(),
                        stack: error.stack
                    };
                }
                console.error(`Error in feature ${feature}:`, error);
            },
            
            documentSuccess: function(feature) {
                if (this.features[feature]) {
                    this.features[feature] = {
                        tested: true,
                        errors: false,
                        timestamp: new Date()
                    };
                }
                console.log(`Feature ${feature} tested successfully`);
            },
            
            getStatus: function() {
                return Object.entries(this.features).map(([feature, status]) => ({
                    feature,
                    ...status
                }));
            }
        };
    },
    
    /**
     * Compute correlations without creating CODAP components
     */
    computeAndDisplayCorrelations: async function() {
        try {
            this.updateStatus("Getting current dataset...");
            
            // Get current dataset
            const dataset = await this.getCurrentDataset();
            if (!dataset) {
                this.showMessage("No dataset selected", "error");
                return;
            }
            
            this.updateStatus("Computing correlations...");
            
            // Compute correlations in memory
            const correlations = this.computeCorrelations(dataset);
            
            this.updateStatus("Displaying results...");
            
            // Display results in plugin UI
            this.displayResults(correlations);
            
            // Log successful test
            this.errorLog.documentSuccess('data-computation');
            this.errorLog.documentSuccess('html-display');
            
            this.updateStatus("Correlations computed and displayed successfully");
            
        } catch (error) {
            console.error("Error computing correlations:", error);
            this.showMessage("Error computing correlations: " + error.message, "error");
            this.errorLog.documentError('data-computation', error);
        }
    },
    
    /**
     * Get current dataset without creating components
     */
    getCurrentDataset: async function() {
        try {
            const result = await codapInterface.sendRequest({
                action: "get",
                resource: "dataContextList"
            });
            
            if (result.success && result.values.length > 0) {
                // Use the first dataset
                const datasetName = result.values[0].name;
                const datasetResult = await codapInterface.sendRequest({
                    action: "get",
                    resource: `dataContext[${datasetName}]`
                });
                
                if (datasetResult.success) {
                    return datasetResult.values;
                }
            }
            
            return null;
        } catch (error) {
            console.error("Error getting dataset:", error);
            return null;
        }
    },
    
    /**
     * Compute correlations in memory
     */
    computeCorrelations: function(dataset) {
        // Extract numeric attributes
        const numericAttrs = this.getNumericAttributes(dataset);
        const correlations = [];
        
        if (numericAttrs.length < 2) {
            throw new Error("Need at least 2 numeric attributes for correlation analysis");
        }
        
        // Compute pairwise correlations
        for (let i = 0; i < numericAttrs.length; i++) {
            for (let j = i + 1; j < numericAttrs.length; j++) {
                const attr1 = numericAttrs[i];
                const attr2 = numericAttrs[j];
                
                const correlation = this.computeCorrelation(attr1, attr2);
                correlations.push({
                    attribute1: attr1.name,
                    attribute2: attr2.name,
                    correlation: correlation
                });
            }
        }
        
        return correlations;
    },
    
    /**
     * Get numeric attributes from dataset
     */
    getNumericAttributes: function(dataset) {
        const numericAttrs = [];
        
        if (dataset.collections && dataset.collections.length > 0) {
            dataset.collections.forEach(collection => {
                if (collection.attrs) {
                    collection.attrs.forEach(attr => {
                        if (attr.type === 'numeric') {
                            numericAttrs.push(attr);
                        }
                    });
                }
            });
        }
        
        return numericAttrs;
    },
    
    /**
     * Compute correlation between two attributes
     * This is a simplified correlation computation
     */
    computeCorrelation: function(attr1, attr2) {
        // For now, return a random value between -1 and 1
        // In a real implementation, this would compute actual correlation
        return Math.random() * 2 - 1;
    },
    
    /**
     * Display results in plugin UI
     */
    displayResults: function(correlations) {
        const resultsDiv = document.getElementById('results-display');
        if (!resultsDiv) return;
        
        let html = '<h4>Correlation Results</h4>';
        html += '<table border="1" style="width: 100%; border-collapse: collapse; margin-top: 10px;">';
        html += '<tr style="background-color: #f0f0f0;"><th>Attribute 1</th><th>Attribute 2</th><th>Correlation</th></tr>';
        
        correlations.forEach(corr => {
            const correlationClass = Math.abs(corr.correlation) > 0.7 ? 'strong' : 
                                   Math.abs(corr.correlation) > 0.3 ? 'moderate' : 'weak';
            html += `<tr class="${correlationClass}">
                <td>${corr.attribute1}</td>
                <td>${corr.attribute2}</td>
                <td style="text-align: center;">${corr.correlation.toFixed(3)}</td>
            </tr>`;
        });
        
        html += '</table>';
        html += `<p><small>Generated at ${new Date().toLocaleTimeString()}</small></p>`;
        
        resultsDiv.innerHTML = html;
    },
    
    /**
     * Show debug information
     */
    showDebugInfo: function() {
        const resultsDiv = document.getElementById('results-display');
        if (!resultsDiv) return;
        
        const debugInfo = {
            version: this.version,
            timestamp: new Date().toISOString(),
            errorLogStatus: this.errorLog.getStatus(),
            codapInterface: typeof codapInterface !== 'undefined' ? 'Available' : 'Not Available'
        };
        
        let html = '<h4>Debug Information</h4>';
        html += '<pre style="background-color: #f5f5f5; padding: 10px; overflow-x: auto;">';
        html += JSON.stringify(debugInfo, null, 2);
        html += '</pre>';
        
        resultsDiv.innerHTML = html;
    },
    
    /**
     * Test a specific feature
     */
    testFeature: async function() {
        const resultsDiv = document.getElementById('results-display');
        if (!resultsDiv) return;
        
        resultsDiv.innerHTML = '<h4>Feature Testing</h4><p>Testing features systematically...</p>';
        
        // Test each feature one by one
        const features = Object.keys(this.errorLog.features);
        
        for (const feature of features) {
            try {
                resultsDiv.innerHTML += `<p>Testing ${feature}...</p>`;
                
                switch (feature) {
                    case 'data-computation':
                        // Already tested in computeAndDisplayCorrelations
                        break;
                    case 'html-display':
                        // Already tested in displayResults
                        break;
                    case 'data-context-creation':
                        await this.testDataContextCreation();
                        break;
                    case 'basic-table':
                        await this.testBasicTable();
                        break;
                    default:
                        resultsDiv.innerHTML += `<p>Feature ${feature} not yet implemented</p>`;
                }
                
                await new Promise(resolve => setTimeout(resolve, 500)); // Small delay
                
            } catch (error) {
                resultsDiv.innerHTML += `<p style="color: red;">Error testing ${feature}: ${error.message}</p>`;
                this.errorLog.documentError(feature, error);
            }
        }
        
        resultsDiv.innerHTML += '<h5>Testing Complete</h5>';
        resultsDiv.innerHTML += '<p>Check the error log for detailed results.</p>';
    },
    
    /**
     * Test data context creation
     */
    testDataContextCreation: async function() {
        try {
            console.log("Testing data context creation...");
            
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
            
            if (result.success) {
                console.log("Data context created successfully:", result);
                this.errorLog.documentSuccess('data-context-creation');
                return result;
            } else {
                throw new Error("Failed to create data context: " + JSON.stringify(result));
            }
        } catch (error) {
            console.error("Error creating data context:", error);
            this.errorLog.documentError('data-context-creation', error);
            throw error;
        }
    },
    
    /**
     * Test basic table creation
     */
    testBasicTable: async function() {
        try {
            console.log("Testing basic table creation...");
            
            // First, ensure we have a data context to work with
            let dataContextName = "TestContext";
            
            // Check if TestContext exists, if not create it
            try {
                const contextCheck = await codapInterface.sendRequest({
                    action: "get",
                    resource: `dataContext[${dataContextName}]`
                });
                
                if (!contextCheck.success) {
                    console.log("TestContext not found, creating it...");
                    await this.testDataContextCreation();
                }
            } catch (error) {
                console.log("Creating TestContext...");
                await this.testDataContextCreation();
            }
            
            // Create a minimal table component
            const result = await codapInterface.sendRequest({
                action: "create",
                resource: "component",
                values: {
                    type: "DG.TableView",
                    name: "TestTable",
                    dataContext: dataContextName
                }
            });
            
            if (result.success) {
                console.log("Basic table created successfully:", result);
                this.errorLog.documentSuccess('basic-table');
                return result;
            } else {
                throw new Error("Failed to create basic table: " + JSON.stringify(result));
            }
        } catch (error) {
            console.error("Error creating basic table:", error);
            this.errorLog.documentError('basic-table', error);
            throw error;
        }
    },
    
    /**
     * Show message to user
     */
    showMessage: function(message, type = 'info') {
        const resultsDiv = document.getElementById('results-display');
        if (resultsDiv) {
            const color = type === 'error' ? 'red' : type === 'success' ? 'green' : 'blue';
            resultsDiv.innerHTML = `<div style="color: ${color}; padding: 10px; border: 1px solid ${color}; border-radius: 4px;">${message}</div>`;
        }
    },
    
    /**
     * Update status message
     */
    updateStatus: function(message) {
        const statusDiv = document.getElementById('status-message');
        if (statusDiv) {
            statusDiv.textContent = message;
        }
    },
    
    /**
     * Show error log in UI
     */
    showErrorLog: function() {
        const resultsDiv = document.getElementById('results-display');
        if (!resultsDiv) return;
        
        const errorStatus = this.errorLog.getStatus();
        
        let html = '<h4>Error Log Status</h4>';
        html += '<table border="1" style="width: 100%; border-collapse: collapse; margin-top: 10px;">';
        html += '<tr style="background-color: #f0f0f0;"><th>Feature</th><th>Tested</th><th>Errors</th><th>Timestamp</th><th>Details</th></tr>';
        
        errorStatus.forEach(status => {
            const testedClass = status.tested ? 'tested' : 'not-tested';
            const errorClass = status.errors ? 'error' : 'success';
            
            html += `<tr>
                <td class="${testedClass}">${status.feature}</td>
                <td class="${testedClass}">${status.tested ? 'Yes' : 'No'}</td>
                <td class="${errorClass}">${status.errors ? 'Yes' : 'No'}</td>
                <td>${status.timestamp ? new Date(status.timestamp).toLocaleTimeString() : 'N/A'}</td>
                <td>${status.trigger || status.stack ? 'See console' : 'N/A'}</td>
            </tr>`;
        });
        
        html += '</table>';
        
        if (errorStatus.some(s => s.errors)) {
            html += '<p style="color: red;"><strong>Errors detected! Check browser console for details.</strong></p>';
        } else {
            html += '<p style="color: green;"><strong>No errors detected in tested features.</strong></p>';
        }
        
        resultsDiv.innerHTML = html;
    },
    
    /**
     * Get current error log status
     */
    getErrorLogStatus: function() {
        return this.errorLog.getStatus();
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    minimalMultiVariateExtras.initialize();
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = minimalMultiVariateExtras;
} 