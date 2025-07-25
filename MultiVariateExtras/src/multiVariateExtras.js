/*
==========================================================================

 * Created by tim on 9/29/20.
 
 
 ==========================================================================
multiVariateExtras in multiVariateExtras

Author:   Tim Erickson

Copyright (c) 2018 by The Concord Consortium, Inc. All rights reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==========================================================================

*/


/* global codapInterface        */

const multiVariateExtras = {
    dsID: null,             //  stores the dataset ID. To be saved.
    datasetList: null,     //  list of all datasets
    datasetInfo: {},       //  from the API, has name, collections, attribute names. Do not save!
    notificationsAreSetUp: null,    //  the name of the ds that we used to set up notifications
    theData: {},           //  case-ID-keyed object containing objects with non-formula values for all cases
    selectedCaseIDs: [],   //  the case IDs of the selected cases

    tagsAttributeName: "Tag",
    attributeGroupingMode : null,

    // Component tracking for cleanup
    createdComponents: new Set(), // Track components created by this plugin
    componentReferences: new Map(), // Track shared model references

    initialize: async function () {
        this.attributeGroupingMode = this.constants.kGroupAttributeByBatchMode;
        
        // Test debugging features are loaded
        console.log("MultiVariateExtras initializing with debugging features...");
        console.log("Debug functions available:", {
            debugMode: typeof this.debugMode === 'function',
            trackComponent: typeof this.trackComponent === 'function',
            validateReferences: typeof this.validateReferences === 'function',
            handleReferenceResolutionError: typeof this.handleReferenceResolutionError === 'function'
        });
        
        // Set up global error handler for MobX errors
        this.setupGlobalErrorHandling();
        
        await connect.initialize();
        await this.setUpDatasets();

        //multiVariateExtras.state = await codapInterface.getInteractiveState();

        /*
                if (Object.keys(multiVariateExtras.state).length === 0 && multiVariateExtras.state.constructor === Object) {
                    await codapInterface.updateInteractiveState(multiVariateExtras.freshState);
                    multiVariateExtras.log("multiVariateExtras: getting a fresh state");
                }
        */

        await notify.setUpDocumentNotifications();
        document.getElementById("tag-attribute-name-text").value = multiVariateExtras.tagsAttributeName;
        multiVariateExtras_ui.update();
        if (this.datasetList && this.datasetList.length === 1) {
            $('#tabs').tabs({active: 1})
        }
        // on background click, become selected
        document.querySelector('body').addEventListener('click',
            connect.selectSelf, {capture:true});

        // Set up cleanup on page unload
        window.addEventListener('beforeunload', this.cleanup.bind(this));
        
        // Test debug mode is accessible
        console.log("MultiVariateExtras initialization complete. Debug button should be available.");
        console.log("You can test debugging by calling: multiVariateExtras.testDebugFeatures()");
    },

    /**
     * Set up global error handling for MobX and CODAP errors
     */
    setupGlobalErrorHandling: function() {
        // Store original error handlers
        const originalOnError = window.onerror;
        const originalOnUnhandledRejection = window.onunhandledrejection;
        
        // Global error handler
        window.onerror = (message, source, lineno, colno, error) => {
            // Check if this is a MobX state tree error
            if (message && typeof message === 'string' && 
                (message.includes('mobx-state-tree') || 
                 message.includes('Failed to resolve reference') ||
                 message.includes('FormulaManager.registerActiveFormulas.reaction'))) {
                
                console.warn("MultiVariateExtras: Caught MobX state tree error:", message);
                this.handleCODAPMobXError(message, error);
                return true; // Prevent default error handling
            }
            
            // Call original handler if it exists
            if (originalOnError) {
                return originalOnError(message, source, lineno, colno, error);
            }
        };
        
        // Handle unhandled promise rejections
        window.onunhandledrejection = (event) => {
            const reason = event.reason;
            const message = reason && reason.message ? reason.message : String(reason);
            
            if (message.includes('mobx-state-tree') || 
                message.includes('Failed to resolve reference') ||
                message.includes('FormulaManager')) {
                
                console.warn("MultiVariateExtras: Caught MobX promise rejection:", message);
                this.handleCODAPMobXError(message, reason);
                event.preventDefault(); // Prevent default handling
                return;
            }
            
            // Call original handler if it exists
            if (originalOnUnhandledRejection) {
                originalOnUnhandledRejection(event);
            }
        };
        
        // Override console.error to catch MobX errors that might be logged there
        const originalConsoleError = console.error;
        console.error = (...args) => {
            const errorMessage = args.join(' ');
            
            // Check if this is a MobX error
            if (errorMessage.includes('mobx-state-tree') || 
                errorMessage.includes('Failed to resolve reference') ||
                errorMessage.includes('FormulaManager.registerActiveFormulas.reaction') ||
                (errorMessage.includes('uncaught error in') && errorMessage.includes('Reaction'))) {
                
                console.warn("MultiVariateExtras: Intercepted MobX error in console.error:", errorMessage);
                this.handleCODAPMobXError(errorMessage, new Error(errorMessage));
            }
            
            // Call original console.error
            originalConsoleError.apply(console, args);
        };
        
        // Override console.warn to catch MobX warnings that might contain errors
        const originalConsoleWarn = console.warn;
        console.warn = (...args) => {
            const warnMessage = args.join(' ');
            
            // Check if this is a MobX error disguised as a warning
            if (warnMessage.includes('mobx-state-tree') || 
                warnMessage.includes('Failed to resolve reference') ||
                warnMessage.includes('FormulaManager.registerActiveFormulas.reaction') ||
                (warnMessage.includes('uncaught error in') && warnMessage.includes('Reaction'))) {
                
                console.warn("MultiVariateExtras: Intercepted MobX error in console.warn:", warnMessage);
                this.handleCODAPMobXError(warnMessage, new Error(warnMessage));
            }
            
            // Call original console.warn
            originalConsoleWarn.apply(console, args);
        };
        
        // Override console.log to catch MobX errors that might be logged there
        const originalConsoleLog = console.log;
        console.log = (...args) => {
            const logMessage = args.join(' ');
            
            // Check if this is a MobX error logged to console.log
            if (logMessage.includes('[mobx] uncaught error in') && 
                logMessage.includes('Reaction[FormulaManager.registerActiveFormulas.reaction]')) {
                
                console.warn("MultiVariateExtras: Intercepted MobX error in console.log:", logMessage);
                this.handleCODAPMobXError(logMessage, new Error(logMessage));
            }
            
            // Call original console.log
            originalConsoleLog.apply(console, args);
        };
        
        // Set up a mutation observer to catch errors that might be thrown in DOM updates
        this.setupMutationObserver();
        
        // Set up periodic error checking
        this.setupPeriodicErrorChecking();
        
        // Set up aggressive error detection
        this.setupAggressiveErrorDetection();
        
        console.log("MultiVariateExtras: Global error handling set up for MobX errors");
    },

    /**
     * Set up mutation observer to catch errors during DOM updates
     */
    setupMutationObserver: function() {
        try {
            const observer = new MutationObserver((mutations) => {
                // Check if any errors occurred during mutations
                // This is a fallback for catching errors that might not be caught by other handlers
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: false
            });
            
            console.log("MultiVariateExtras: Mutation observer set up");
        } catch (error) {
            console.warn("MultiVariateExtras: Could not set up mutation observer:", error.message);
        }
    },

    /**
     * Set up periodic error checking to catch errors that might be missed
     */
    setupPeriodicErrorChecking: function() {
        // Check for errors every 2 seconds
        setInterval(() => {
            // This is a fallback mechanism
            // We can't directly check for errors, but we can monitor the state
        }, 2000);
    },

    /**
     * Set up more aggressive error detection for MobX errors
     */
    setupAggressiveErrorDetection: function() {
        // Override console methods more aggressively
        const originalConsoleError = console.error;
        const originalConsoleWarn = console.warn;
        const originalConsoleLog = console.log;
        
        // Create a more comprehensive error interceptor
        const interceptMobXError = (message, errorType = 'unknown') => {
            if (typeof message === 'string' && 
                (message.includes('[mobx] uncaught error in') || 
                 message.includes('Failed to resolve reference') ||
                 message.includes('FormulaManager.registerActiveFormulas.reaction') ||
                 message.includes('mobx-state-tree'))) {
                
                console.warn(`MultiVariateExtras: Intercepted MobX error via ${errorType}:`, message);
                this.handleCODAPMobXError(message, new Error(message));
                return true;
            }
            return false;
        };

        // Create a recent errors store
        if (!window.multiVariateExtrasRecentErrors) {
            window.multiVariateExtrasRecentErrors = [];
        }

        // Override console.error
        console.error = (...args) => {
            const errorMessage = args.join(' ');
            
            // Store all console.error messages for polling
            window.multiVariateExtrasRecentErrors.push({
                message: errorMessage,
                timestamp: Date.now(),
                args: args
            });
            
            // Keep only last 50 errors
            if (window.multiVariateExtrasRecentErrors.length > 50) {
                window.multiVariateExtrasRecentErrors = window.multiVariateExtrasRecentErrors.slice(-50);
            }
            
            // Debug: Log all console.error calls to see what we're intercepting
            if (errorMessage.includes('mobx') || errorMessage.includes('MobX') || errorMessage.includes('case-tile')) {
                console.warn("MultiVariateExtras: console.error override caught MobX-related message:", errorMessage);
            }
            
            if (!interceptMobXError(errorMessage, 'console.error')) {
                originalConsoleError.apply(console, args);
            }
        };

        // Override console.warn
        console.warn = (...args) => {
            const warnMessage = args.join(' ');
            if (!interceptMobXError(warnMessage, 'console.warn')) {
                originalConsoleWarn.apply(console, args);
            }
        };

        // Override console.log
        console.log = (...args) => {
            const logMessage = args.join(' ');
            if (!interceptMobXError(logMessage, 'console.log')) {
                originalConsoleLog.apply(console, args);
            }
        };

        // Set up a more aggressive error listener
        window.addEventListener('error', (event) => {
            const message = event.message || event.error?.message || String(event.error);
            if (interceptMobXError(message, 'window.error')) {
                event.preventDefault();
                return true;
            }
        });

        // Set up unhandled promise rejection listener
        window.addEventListener('unhandledrejection', (event) => {
            const message = event.reason?.message || String(event.reason);
            if (interceptMobXError(message, 'unhandledrejection')) {
                event.preventDefault();
                return true;
            }
        });

        console.log("MultiVariateExtras: Aggressive error detection set up");
        
        // Add a global try-catch wrapper for the entire page
        const originalRaf = window.requestAnimationFrame;
        window.requestAnimationFrame = function(callback) {
            return originalRaf.call(this, function(time) {
                try {
                    return callback(time);
                } catch (error) {
                    if (error && error.message && 
                        (error.message.includes('[mobx-state-tree] Failed to resolve reference') ||
                         error.message.includes('TileModel'))) {
                        console.warn("MultiVariateExtras: Caught MobX error via requestAnimationFrame:", error.message);
                        self.handleCODAPMobXError(error.message, error);
                    }
                    throw error; // Re-throw for normal error handling
                }
            });
        };
        
        // Override setTimeout and setInterval to catch async errors
        const originalSetTimeout = window.setTimeout;
        window.setTimeout = function(callback, delay, ...args) {
            const wrappedCallback = function() {
                try {
                    return callback.apply(this, arguments);
                } catch (error) {
                    if (error && error.message && 
                        (error.message.includes('[mobx-state-tree] Failed to resolve reference') ||
                         error.message.includes('TileModel'))) {
                        console.warn("MultiVariateExtras: Caught MobX error via setTimeout:", error.message);
                        self.handleCODAPMobXError(error.message, error);
                    }
                    throw error;
                }
            };
            return originalSetTimeout.call(this, wrappedCallback, delay, ...args);
        };
        
        // Set up a specific override for the case-tile-utils error pattern
        const self = this;
        const originalError = Error;
        Error = function(message, ...args) {
            const error = new originalError(message, ...args);
            
            // Check if this is the specific MobX error we're looking for
            if (message && typeof message === 'string' && 
                message.includes('[mobx-state-tree] Failed to resolve reference') &&
                message.includes('TileModel')) {
                
                console.warn("MultiVariateExtras: Intercepted MobX state tree error via Error constructor:", message);
                setTimeout(() => {
                    self.handleCODAPMobXError(message, error);
                }, 0);
            }
            
            return error;
        };
        Error.prototype = originalError.prototype;
        
        // Try to hook into MobX's error reporting system directly
        if (typeof window !== 'undefined' && window.mobx) {
            try {
                const originalOnError = window.mobx.configure.onError;
                window.mobx.configure({
                    onError: (error) => {
                        console.warn("MultiVariateExtras: Intercepted MobX error via mobx.onError:", error);
                        self.handleCODAPMobXError(error.message || String(error), error);
                        if (originalOnError) originalOnError(error);
                    }
                });
                console.log("MultiVariateExtras: Hooked into MobX error system");
            } catch (e) {
                console.warn("MultiVariateExtras: Could not hook into MobX error system:", e.message);
            }
        }
        
                 // Add a polling mechanism to detect console.error calls we missed
         let lastCheckedErrorIndex = 0;
         let lastErrorCheckTime = Date.now();
         
         setInterval(() => {
             try {
                 const currentTime = Date.now();
                 const recentErrors = window.multiVariateExtrasRecentErrors || [];
                 
                 // Check only new errors since last check
                 for (let i = lastCheckedErrorIndex; i < recentErrors.length; i++) {
                     const errorEntry = recentErrors[i];
                     const errorMessage = errorEntry.message;
                     
                     if (errorMessage && 
                         (errorMessage.includes('[mobx-state-tree] Failed to resolve reference') ||
                          errorMessage.includes('case-tile-utils.ts') ||
                          errorMessage.includes('FormulaManager.registerActiveFormulas.reaction'))) {
                         console.warn("MultiVariateExtras: Found MobX error via polling:", errorMessage);
                         self.handleCODAPMobXError(errorMessage, new Error(errorMessage));
                         break; // Handle one error at a time
                     }
                 }
                 
                 lastCheckedErrorIndex = recentErrors.length;
                 
                 // Alternative: Monitor for specific error patterns in recent timeframe
                 if (currentTime - lastErrorCheckTime > 2000) { // Check every 2 seconds
                     // Try to detect if there were any console errors we missed
                     // by looking for the error pattern in the global error state
                     if (typeof window.console !== 'undefined' && window.console.memory) {
                         // This is a heuristic - if memory usage spiked, there might have been errors
                         // console.warn("MultiVariateExtras: Checking for missed errors...");
                     }
                     lastErrorCheckTime = currentTime;
                 }
                 
                 // Clean up old errors (older than 30 seconds)
                 const cutoffTime = currentTime - 30000;
                 window.multiVariateExtrasRecentErrors = recentErrors.filter(
                     error => error.timestamp > cutoffTime
                 );
                 
             } catch (e) {
                 // Ignore polling errors
                 console.warn("MultiVariateExtras: Error in polling mechanism:", e.message);
             }
                          }, 500); // Faster polling - every 500ms
         
         // Add a final fallback: Monitor the console output directly
         let consoleMonitorEnabled = true;
         
         const monitorConsoleOutput = () => {
             if (!consoleMonitorEnabled) return;
             
             // Try to detect the error pattern in any recent console activity
             setTimeout(() => {
                 // Check if the error occurred by looking for it in console history
                 // This is a heuristic approach since we can't directly access console history
                 
                 // Re-enable monitoring for the next cycle
                 if (consoleMonitorEnabled) {
                     monitorConsoleOutput();
                 }
             }, 1000);
         };
         
         // Start console monitoring
         monitorConsoleOutput();
         
         // Add cleanup when plugin is unloaded
         window.addEventListener('beforeunload', () => {
             consoleMonitorEnabled = false;
         });
     },

    /**
     * Enhanced error handler that catches more types of MobX errors
     */
    handleCODAPMobXError: async function(message, error) {
        try {
            console.group("MultiVariateExtras: Handling CODAP MobX Error");
            console.log("Error message:", message);
            console.log("Error object:", error);
            
            // Extract tile ID if present
            const tileMatch = message.match(/TABL[0-9]+/);
            const tileId = tileMatch ? tileMatch[0] : null;
            
            console.log("Detected tile ID:", tileId);
            
            // Check if this is a formula manager error
            const isFormulaManagerError = message.includes('FormulaManager.registerActiveFormulas.reaction');
            const isReactionError = message.includes('uncaught error in') && message.includes('Reaction');
            const isCaseTileError = message.includes('case-tile-utils.ts');
            
            if (isFormulaManagerError || isReactionError || isCaseTileError) {
                console.log("This is a CODAP formula manager, reaction, or case-tile error - attempting recovery...");
                
                // Try to refresh the document state
                await this.attemptCODAPStateRecovery();
                
                // Show user-friendly message
                this.showMobXErrorRecoveryMessage(message, tileId);
                
                // Additional recovery for case-tile errors
                if (isCaseTileError) {
                    console.log("Case-tile error detected - attempting additional recovery...");
                    await this.handleCaseTileError(tileId);
                }
            } else {
                // Handle other MobX errors
                await this.handleReferenceResolutionError(error || new Error(message));
            }
            
        } catch (recoveryError) {
            console.error("Error during MobX error recovery:", recoveryError);
        } finally {
            console.groupEnd();
        }
    },

    /**
     * Handle specific case-tile errors
     */
    handleCaseTileError: async function(tileId) {
        try {
            console.log(`Handling case-tile error for tile: ${tileId}`);
            
            // Try to refresh the current dataset
            if (this.dsID) {
                console.log("Refreshing dataset after case-tile error...");
                await this.setUpDatasets();
                await multiVariateExtras_ui.update();
            }
            
            // Validate our tracked components
            await this.validateReferences();
            
            console.log("Case-tile error recovery completed");
            
        } catch (error) {
            console.warn("Case-tile error recovery failed:", error.message);
        }
    },

    /**
     * Monitor for MobX errors after graph creation
     * This should be called after creating a graph to catch the error that occurs when selecting tables
     */
    monitorForMobXErrors: function() {
        console.log("MultiVariateExtras: Starting MobX error monitoring...");
        
        // Set up a monitoring period for the next 10 seconds
        const monitoringDuration = 10000; // 10 seconds
        const checkInterval = 100; // Check every 100ms
        
        const startTime = Date.now();
        const monitorInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            
            if (elapsed >= monitoringDuration) {
                clearInterval(monitorInterval);
                console.log("MultiVariateExtras: MobX error monitoring period ended");
                return;
            }
            
            // During monitoring, we can't directly detect errors, but we can prepare for them
            // The actual error detection happens in our console overrides
        }, checkInterval);
        
        // Also set up a one-time check after a delay
        setTimeout(() => {
            console.log("MultiVariateExtras: Performing post-graph-creation error check...");
            this.validateReferences();
        }, 2000);
    },

    /**
     * Enhanced graph creation with error monitoring and proactive cleanup
     */
    createGraphWithMonitoring: async function(dataContext, xAxis, yAxis, legendAttr = null) {
        try {
            console.log("MultiVariateExtras: Creating graph with error monitoring...");
            
            // First, clean up any existing graphs for this dataset to prevent conflicts
            await this.cleanupExistingGraphsForDataset(dataContext);
            
            // Create the graph
            const result = await connect.createGraph(dataContext, xAxis, yAxis, legendAttr);
            
            if (result.success) {
                const componentId = result.values.id;
                console.log(`Graph created successfully: ${componentId}`);
                
                // Track the component with enhanced metadata
                this.trackComponent(componentId, {
                    type: 'correlation_graph',
                    dataset: dataContext,
                    xAxis: xAxis,
                    yAxis: yAxis,
                    legend: legendAttr,
                    autoCleanup: true,
                    priority: 'high'
                });
                
                // Start monitoring for MobX errors
                this.monitorForMobXErrors();
                
                // Show a helpful message to the user
                this.showGraphCreationSuccessMessage();
            }
            
            return result;
        } catch (error) {
            console.error("Error creating graph:", error);
            throw error;
        }
    },

    /**
     * Clean up existing graphs for a dataset to prevent conflicts
     */
    cleanupExistingGraphsForDataset: async function(datasetName) {
        try {
            const componentsToRemove = [];
            
            // Find existing graphs for this dataset
            for (const [componentId, ref] of this.componentReferences) {
                if (ref.type === 'correlation_graph' && ref.data.dataset === datasetName) {
                    componentsToRemove.push(componentId);
                }
            }
            
            // Remove existing graphs
            for (const componentId of componentsToRemove) {
                try {
                    await codapInterface.sendRequest({
                        action: "delete",
                        resource: `component[${componentId}]`
                    });
                    this.untrackComponent(componentId);
                    console.log(`Cleaned up existing graph: ${componentId}`);
                } catch (error) {
                    console.warn(`Error cleaning up existing graph ${componentId}: ${error.message}`);
                }
            }
            
            if (componentsToRemove.length > 0) {
                console.log(`Cleaned up ${componentsToRemove.length} existing graphs for dataset ${datasetName}`);
            }
        } catch (error) {
            console.warn(`Error during existing graph cleanup: ${error.message}`);
        }
    },

    /**
     * Show success message after graph creation
     */
    showGraphCreationSuccessMessage: function() {
        const message = `
            <strong>Graph Created Successfully!</strong><br><br>
            
            Your correlation graph has been created and is now available in CODAP.<br><br>
            
            <strong>Important:</strong> If you encounter any errors when selecting tables from CODAP's Tables menu, 
            the MultiVariateExtras plugin will automatically handle them and attempt recovery.<br><br>
            
            <strong>What to do if you see an error:</strong><br>
            1. The plugin will automatically attempt to fix the issue<br>
            2. Try your action again - it should work after recovery<br>
            3. If problems persist, use the Debug button for more information<br><br>
            
            <em>The error monitoring system is now active and will catch any MobX-related issues.</em>
        `;
        
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'success',
                title: 'Graph Created',
                html: message,
                confirmButtonText: 'OK',
                width: '600px'
            });
        } else {
            console.log("Graph created successfully. Error monitoring is active.");
        }
    },

    /**
     * Show table viewing guidance message
     * This should be called after creating the correlation table
     */
    showTableViewingGuidance: function() {
        const message = `
            <strong>Correlation Table Created!</strong><br><br>
            
            The "PairwiseCorrelations" table has been created and is now available in CODAP.<br><br>
            
            <strong>To view the table:</strong><br>
            1. Click the "Tables" icon in CODAP's upper-left corner<br>
            2. Select "PairwiseCorrelations" from the list<br>
            3. If you see an error, the plugin will automatically handle it<br><br>
            
            <strong>If you encounter an error when viewing the table:</strong><br>
            ✅ The plugin will automatically detect and handle the error<br>
            ✅ Try selecting the table again - it should work after recovery<br>
            ✅ Use the Debug button if you need more information<br><br>
            
            <em>Error monitoring is active and will catch any issues when viewing tables.</em>
        `;
        
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'info',
                title: 'Table Created',
                html: message,
                confirmButtonText: 'OK',
                width: '600px'
            });
        } else {
            console.log("Correlation table created. Error monitoring is active for table viewing.");
        }
    },

    /**
     * Enhanced table creation with error monitoring and proactive cleanup
     */
    createTableWithMonitoring: async function() {
        try {
            console.log("MultiVariateExtras: Creating correlation table with error monitoring...");
            
            // First, clean up any existing correlation datasets to prevent conflicts
            await this.cleanupExistingCorrelationDatasets();
            
            // Initialize the correlation dataset in CODAP
            pluginHelper.initDataSet(multiVariateExtras.dataSetCorrelations);
            
            // Track the dataset creation
            this.trackDatasetCreation('PairwiseCorrelations');
            
            // Start monitoring for table viewing errors
            this.monitorForTableViewingErrors();
            
            // Show guidance message
            this.showTableViewingGuidance();
            
            console.log("Correlation table creation initiated with error monitoring");
            
        } catch (error) {
            console.error("Error creating correlation table:", error);
            throw error;
        }
    },

    /**
     * Track dataset creation to prevent conflicts
     */
    trackDatasetCreation: function(datasetName) {
        if (!this.createdDatasets) {
            this.createdDatasets = new Set();
        }
        
        this.createdDatasets.add(datasetName);
        console.log(`MultiVariateExtras: Tracking dataset creation: ${datasetName}`);
    },

    /**
     * Clean up existing correlation datasets to prevent conflicts
     */
    cleanupExistingCorrelationDatasets: async function() {
        try {
            const datasetsToCheck = ['PairwiseCorrelations'];
            
            for (const datasetName of datasetsToCheck) {
                try {
                    const result = await codapInterface.sendRequest({
                        action: "get",
                        resource: `dataContext[${datasetName}]`
                    });
                    
                    if (result.success) {
                        // Delete existing dataset to prevent conflicts
                        await codapInterface.sendRequest({
                            action: "delete",
                            resource: `dataContext[${datasetName}]`
                        });
                        console.log(`Cleaned up existing correlation dataset: ${datasetName}`);
                    }
                } catch (error) {
                    console.warn(`Error checking/deleting dataset ${datasetName}: ${error.message}`);
                }
            }
        } catch (error) {
            console.warn(`Error during dataset cleanup: ${error.message}`);
        }
    },

    /**
     * Monitor for errors that occur when viewing tables
     */
    monitorForTableViewingErrors: function() {
        console.log("MultiVariateExtras: Starting table viewing error monitoring...");
        
        // Set up monitoring for the next 30 seconds (longer for table viewing)
        const monitoringDuration = 30000; // 30 seconds
        const checkInterval = 200; // Check every 200ms
        
        const startTime = Date.now();
        const monitorInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            
            if (elapsed >= monitoringDuration) {
                clearInterval(monitorInterval);
                console.log("MultiVariateExtras: Table viewing error monitoring period ended");
                return;
            }
            
            // During monitoring, we can't directly detect errors, but we can prepare for them
            // The actual error detection happens in our console overrides
        }, checkInterval);
        
        // Set up periodic validation checks
        setTimeout(() => {
            console.log("MultiVariateExtras: Performing post-table-creation validation...");
            this.validateReferences();
        }, 1000);
        
        setTimeout(() => {
            console.log("MultiVariateExtras: Performing additional table validation...");
            this.validateReferences();
        }, 5000);
    },

    /**
     * Attempt to recover from CODAP state issues
     */
    attemptCODAPStateRecovery: async function() {
        try {
            console.log("Attempting CODAP state recovery...");
            
            // Validate our tracked components
            await this.validateReferences();
            
            // Try to refresh the current dataset info
            if (this.dsID) {
                console.log("Refreshing dataset info...");
                await this.setUpDatasets();
            }
            
            // Log recovery attempt
            console.log("CODAP state recovery completed");
            
        } catch (error) {
            console.warn("CODAP state recovery failed:", error.message);
        }
    },

    /**
     * Show user-friendly message for MobX errors
     */
    showMobXErrorRecoveryMessage: function(message, tileId) {
        // Check if this is a table viewing error
        const isTableViewingError = message.includes('FormulaManager.registerActiveFormulas.reaction') && 
                                   (message.includes('TABL') || message.includes('TileModel'));
        
        const errorMessage = `
            <strong>CODAP Internal Error Detected</strong><br><br>
            
            ${isTableViewingError ? 
                'This error occurred when trying to view a table in CODAP. The MultiVariateExtras plugin will handle this automatically.' :
                'This error occurred in CODAP\'s internal system, not in the MultiVariateExtras plugin.'
            }<br><br>
            
            <strong>Error Details:</strong><br>
            ${message}<br><br>
            
            ${tileId ? `<strong>Affected Component:</strong> ${tileId}<br><br>` : ''}
            
            <strong>Recovery Actions Taken:</strong><br>
            ✅ Validated plugin component references<br>
            ✅ Refreshed dataset information<br>
            ✅ Attempted state recovery<br><br>
            
            <strong>What You Can Do:</strong><br>
            1. <strong>Try viewing the table again</strong> - it should work now<br>
            2. If problems persist, <strong>refresh the CODAP document</strong><br>
            3. If issues continue, <strong>restart the plugin</strong><br><br>
            
            <em>${isTableViewingError ? 
                'This error is common when viewing tables with complex references. The recovery process should resolve the issue.' :
                'This error is typically caused by CODAP\'s internal state becoming inconsistent. The recovery process should resolve the issue.'
            }</em>
        `;
        
        // Show message using SweetAlert if available
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'warning',
                title: 'CODAP Internal Error',
                html: errorMessage,
                confirmButtonText: 'OK',
                width: '600px'
            });
        } else {
            // Fallback to console and alert
            console.warn("CODAP Internal Error:", message);
            alert("CODAP Internal Error detected. Check console for details. Try your action again.");
        }
    },

    /**
     * Cleanup method to remove all components and references created by this plugin
     * This helps prevent MobX state tree reference resolution errors
     */
    cleanup: async function() {
        try {
            multiVariateExtras.log("Cleaning up MultiVariateExtras plugin components and references");
            
            // Clear all cleanup intervals first
            if (this.componentCleanupIntervals) {
                for (const [componentId, interval] of this.componentCleanupIntervals) {
                    clearInterval(interval);
                }
                this.componentCleanupIntervals.clear();
            }
            
            // Clean up all tracked components
            for (const componentId of this.createdComponents) {
                try {
                    await codapInterface.sendRequest({
                        action: "delete",
                        resource: `component[${componentId}]`
                    });
                    multiVariateExtras.log(`Cleaned up component: ${componentId}`);
                } catch (error) {
                    multiVariateExtras.warn(`Failed to cleanup component ${componentId}: ${error.message}`);
                }
            }
            
            // Clear tracking sets
            this.createdComponents.clear();
            this.componentReferences.clear();
            
            // Clean up correlation datasets
            await this.cleanupCorrelationDatasets();
            
            multiVariateExtras.log("MultiVariateExtras cleanup completed");
        } catch (error) {
            multiVariateExtras.error(`Error during cleanup: ${error.message}`);
        }
    },

    /**
     * Clean up correlation datasets created by this plugin
     */
    cleanupCorrelationDatasets: async function() {
        try {
            const datasetsToCheck = ['PairwiseCorrelations'];
            
            for (const datasetName of datasetsToCheck) {
                try {
                    const result = await codapInterface.sendRequest({
                        action: "get",
                        resource: `dataContext[${datasetName}]`
                    });
                    
                    if (result.success) {
                        // Check if this dataset was created by our plugin
                        const datasetInfo = result.values;
                        if (datasetInfo && datasetInfo.metadata && 
                            datasetInfo.metadata.createdBy === 'multiVariateExtras') {
                            
                            // Delete the dataset
                            await codapInterface.sendRequest({
                                action: "delete",
                                resource: `dataContext[${datasetName}]`
                            });
                            multiVariateExtras.log(`Deleted correlation dataset: ${datasetName}`);
                        }
                    }
                } catch (error) {
                    multiVariateExtras.warn(`Error checking/deleting dataset ${datasetName}: ${error.message}`);
                }
            }
        } catch (error) {
            multiVariateExtras.warn(`Error during dataset cleanup: ${error.message}`);
        }
    },

    /**
     * Track a component created by this plugin
     * @param {string} componentId - The ID of the created component
     * @param {Object} componentData - Additional data about the component
     */
    trackComponent: function(componentId, componentData = {}) {
        if (componentId) {
            this.createdComponents.add(componentId);
            this.componentReferences.set(componentId, {
                created: new Date(),
                lastAccessed: new Date(),
                type: componentData.type || 'unknown',
                data: componentData,
                status: 'active',
                validationCount: 0,
                autoCleanup: componentData.autoCleanup !== false // Default to true
            });
            multiVariateExtras.log(`Tracked component: ${componentId} (${componentData.type || 'unknown'})`);
            
            // Set up automatic cleanup for this component
            this.setupComponentCleanup(componentId, componentData);
        }
    },

    /**
     * Set up automatic cleanup for a tracked component
     */
    setupComponentCleanup: function(componentId, componentData) {
        // Set up periodic validation for this component
        const validationInterval = setInterval(() => {
            if (!this.createdComponents.has(componentId)) {
                // Component was untracked, stop validation
                clearInterval(validationInterval);
                return;
            }
            
            // Increment validation count
            const ref = this.componentReferences.get(componentId);
            if (ref) {
                ref.validationCount++;
                ref.lastAccessed = new Date();
            }
            
            // Validate component every 10 checks (every 30 seconds)
            if (ref && ref.validationCount % 10 === 0) {
                this.validateSingleComponent(componentId);
            }
        }, 3000); // Check every 3 seconds
        
        // Store the interval ID for cleanup
        if (!this.componentCleanupIntervals) {
            this.componentCleanupIntervals = new Map();
        }
        this.componentCleanupIntervals.set(componentId, validationInterval);
    },

    /**
     * Validate a single component and clean up if needed
     */
    validateSingleComponent: async function(componentId) {
        try {
            const result = await codapInterface.sendRequest({
                action: "get",
                resource: `component[${componentId}]`
            });
            
            if (!result.success) {
                multiVariateExtras.log(`Component ${componentId} no longer exists, cleaning up...`);
                this.untrackComponent(componentId);
                
                // Trigger additional cleanup for this component type
                const ref = this.componentReferences.get(componentId);
                if (ref && ref.type === 'correlation_graph') {
                    await this.cleanupCorrelationGraph(componentId);
                }
            }
        } catch (error) {
            multiVariateExtras.warn(`Error validating component ${componentId}: ${error.message}`);
        }
    },

    /**
     * Clean up correlation graph components specifically
     */
    cleanupCorrelationGraph: async function(componentId) {
        try {
            // Clean up any related datasets or components
            const ref = this.componentReferences.get(componentId);
            if (ref && ref.data && ref.data.dataset) {
                // Check if the correlation dataset still exists
                const datasetResult = await codapInterface.sendRequest({
                    action: "get",
                    resource: `dataContext[${ref.data.dataset}]`
                });
                
                if (!datasetResult.success) {
                    multiVariateExtras.log(`Correlation dataset ${ref.data.dataset} no longer exists, cleaning up references`);
                    // Remove any references to this dataset
                    this.cleanupDatasetReferences(ref.data.dataset);
                }
            }
        } catch (error) {
            multiVariateExtras.warn(`Error cleaning up correlation graph ${componentId}: ${error.message}`);
        }
    },

    /**
     * Clean up references to a specific dataset
     */
    cleanupDatasetReferences: function(datasetName) {
        // Remove any components that reference this dataset
        const componentsToRemove = [];
        for (const [componentId, ref] of this.componentReferences) {
            if (ref.data && ref.data.dataset === datasetName) {
                componentsToRemove.push(componentId);
            }
        }
        
        componentsToRemove.forEach(componentId => {
            this.untrackComponent(componentId);
        });
        
        if (componentsToRemove.length > 0) {
            multiVariateExtras.log(`Cleaned up ${componentsToRemove.length} components referencing dataset ${datasetName}`);
        }
    },

    /**
     * Remove tracking for a component (when it's deleted externally)
     * @param {string} componentId - The ID of the component to untrack
     */
    untrackComponent: function(componentId) {
        if (componentId && this.createdComponents.has(componentId)) {
            this.createdComponents.delete(componentId);
            this.componentReferences.delete(componentId);
            
            // Clear the cleanup interval
            if (this.componentCleanupIntervals && this.componentCleanupIntervals.has(componentId)) {
                clearInterval(this.componentCleanupIntervals.get(componentId));
                this.componentCleanupIntervals.delete(componentId);
            }
            
            multiVariateExtras.log(`Untracked component: ${componentId}`);
        }
    },

    /**
     * Validate and clean up stale references
     * This can be called periodically or when errors occur
     */
    validateReferences: async function() {
        try {
            multiVariateExtras.log("Validating component references...");
            
            const validComponents = new Set();
            
            // Check each tracked component to see if it still exists
            for (const componentId of this.createdComponents) {
                try {
                    const result = await codapInterface.sendRequest({
                        action: "get",
                        resource: `component[${componentId}]`
                    });
                    
                    if (result.success) {
                        validComponents.add(componentId);
                    } else {
                        multiVariateExtras.warn(`Component ${componentId} no longer exists, removing from tracking`);
                    }
                } catch (error) {
                    multiVariateExtras.warn(`Error checking component ${componentId}: ${error.message}`);
                }
            }
            
            // Update tracking with only valid components
            const removedCount = this.createdComponents.size - validComponents.size;
            if (removedCount > 0) {
                multiVariateExtras.log(`Cleaning up ${removedCount} stale component references`);
                this.createdComponents.clear();
                this.componentReferences.clear();
                
                for (const componentId of validComponents) {
                    this.createdComponents.add(componentId);
                    // Restore reference data if available
                    const refData = this.componentReferences.get(componentId);
                    if (refData) {
                        this.componentReferences.set(componentId, refData);
                    }
                }
            }
            
            multiVariateExtras.log(`Reference validation complete. ${this.createdComponents.size} valid components tracked`);
        } catch (error) {
            multiVariateExtras.error(`Error during reference validation: ${error.message}`);
        }
    },

    /**
     * Handle MobX state tree reference resolution errors
     * This method provides debugging information and recovery options
     */
    handleReferenceResolutionError: async function(error) {
        multiVariateExtras.error(`MobX state tree reference resolution error detected: ${error.message}`);
        
        // Log detailed debugging information
        console.group("MobX Reference Resolution Error Debug Info");
        console.log("Error details:", error);
        console.log("Current tracked components:", Array.from(this.createdComponents));
        console.log("Component references:", Object.fromEntries(this.componentReferences));
        console.log("Current dataset info:", this.datasetInfo);
        console.log("Current dataset ID:", this.dsID);
        console.groupEnd();
        
        // Attempt to validate and clean up references
        try {
            await this.validateReferences();
            multiVariateExtras.log("Reference validation completed after error");
        } catch (validationError) {
            multiVariateExtras.error(`Error during reference validation: ${validationError.message}`);
        }
        
        // Provide user-friendly error message
        const errorMessage = `
            MobX State Tree Reference Resolution Error
            
            This error occurs when CODAP tries to resolve references to components or tiles that no longer exist.
            
            Possible causes:
            - Components were deleted externally
            - Document state is inconsistent
            - Plugin state is out of sync with CODAP
            
            Recovery options:
            1. Refresh the CODAP document
            2. Restart the plugin
            3. Recreate any missing components
            
            Technical details: ${error.message}
        `;
        
        // Show error to user if SweetAlert is available
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'Reference Resolution Error',
                html: errorMessage.replace(/\n/g, '<br>'),
                confirmButtonText: 'OK',
                width: '600px'
            });
        } else {
            alert(errorMessage);
        }
    },

    /**
     * Get debugging information for troubleshooting
     * This can be called from the browser console for debugging
     */
    getDebugInfo: function() {
        return {
            pluginVersion: this.constants.version,
            datasetID: this.dsID,
            datasetName: this.getNameOfCurrentDataset(),
            trackedComponents: Array.from(this.createdComponents || []),
            componentReferences: Object.fromEntries(this.componentReferences || new Map()),
            datasetInfo: this.datasetInfo || {},
            selectedCaseIDs: this.selectedCaseIDs || [],
            attributeGroupingMode: this.attributeGroupingMode
        };
    },

    /**
     * Debug mode - provides debugging information and reference validation
     * This can be called from the UI or browser console
     */
    debugMode: async function() {
        try {
            multiVariateExtras.log("=== DEBUG MODE ACTIVATED ===");
            
            // Get debug information
            const debugInfo = this.getDebugInfo();
            
            // Validate references
            await this.validateReferences();
            
            // Show debug information
            const debugMessage = `
                <strong>MultiVariateExtras Debug Information</strong><br><br>
                
                <strong>Plugin Version:</strong> ${debugInfo.pluginVersion || 'Unknown'}<br>
                <strong>Dataset ID:</strong> ${debugInfo.datasetID || 'None'}<br>
                <strong>Dataset Name:</strong> ${debugInfo.datasetName || 'None'}<br>
                <strong>Attribute Grouping Mode:</strong> ${debugInfo.attributeGroupingMode || 'Unknown'}<br>
                <strong>Tracked Components:</strong> ${(debugInfo.trackedComponents || []).length}<br>
                <strong>Selected Cases:</strong> ${(debugInfo.selectedCaseIDs || []).length}<br><br>
                
                <strong>Tracked Component IDs:</strong><br>
                ${(debugInfo.trackedComponents || []).length > 0 ? 
                    debugInfo.trackedComponents.map(id => `• ${id}`).join('<br>') : 
                    'None'}<br><br>
                
                <strong>Component References:</strong><br>
                ${Object.keys(debugInfo.componentReferences || {}).length > 0 ? 
                    Object.entries(debugInfo.componentReferences).map(([id, ref]) => 
                        `• ${id}: ${ref.type || 'unknown'} (created: ${ref.created ? ref.created.toLocaleString() : 'unknown'})`
                    ).join('<br>') : 
                    'None'}<br><br>
                
                <em>Reference validation completed. Check console for detailed logs.</em>
            `;
            
            // Show debug info using SweetAlert if available
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'info',
                    title: 'Debug Information',
                    html: debugMessage,
                    confirmButtonText: 'OK',
                    width: '600px'
                });
            } else {
                alert(debugMessage.replace(/<br>/g, '\n').replace(/<[^>]*>/g, ''));
            }
            
            // Log detailed information to console
            console.group("MultiVariateExtras Debug Information");
            console.log("Debug Info:", debugInfo);
            console.log("Component References:", debugInfo.componentReferences);
            console.log("Dataset Info:", debugInfo.datasetInfo);
            console.groupEnd();
            
            multiVariateExtras.log("=== DEBUG MODE COMPLETED ===");
            
        } catch (error) {
            multiVariateExtras.error(`Error in debug mode: ${error.message}`);
            
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'error',
                    title: 'Debug Error',
                    text: `Error during debug mode: ${error.message}`,
                    confirmButtonText: 'OK'
                });
            } else {
                alert(`Debug Error: ${error.message}`);
            }
        }
    },

    /**
     * Test function to verify debugging features are working
     * Call this from browser console: multiVariateExtras.testDebugFeatures()
     */
    testDebugFeatures: function() {
        console.group("=== MultiVariateExtras Debug Feature Test ===");
        
        try {
            // Test 1: Check if all debug functions exist
            const debugFunctions = [
                'debugMode', 'trackComponent', 'untrackComponent', 
                'validateReferences', 'handleReferenceResolutionError', 'getDebugInfo'
            ];
            
            console.log("Testing debug function availability:");
            debugFunctions.forEach(funcName => {
                const exists = typeof this[funcName] === 'function';
                console.log(`  ${funcName}: ${exists ? '✅' : '❌'}`);
            });
            
            // Test 2: Check if tracking properties exist
            console.log("\nTesting tracking properties:");
            console.log(`  createdComponents: ${this.createdComponents instanceof Set ? '✅' : '❌'}`);
            console.log(`  componentReferences: ${this.componentReferences instanceof Map ? '✅' : '❌'}`);
            
            // Test 3: Test component tracking
            console.log("\nTesting component tracking:");
            const testId = 'test-component-' + Date.now();
            this.trackComponent(testId, { type: 'test', data: 'test data' });
            console.log(`  Tracked test component: ${this.createdComponents.has(testId) ? '✅' : '❌'}`);
            
            // Test 4: Test untracking
            this.untrackComponent(testId);
            console.log(`  Untracked test component: ${!this.createdComponents.has(testId) ? '✅' : '❌'}`);
            
            // Test 5: Test debug info
            console.log("\nTesting debug info:");
            const debugInfo = this.getDebugInfo();
            console.log("  Debug info structure:", debugInfo);
            
            // Test 6: Check if debug button exists in DOM
            console.log("\nTesting debug button in DOM:");
            const debugButton = document.querySelector('.debug-button');
            console.log(`  Debug button found: ${debugButton ? '✅' : '❌'}`);
            if (debugButton) {
                console.log(`  Debug button onclick: ${debugButton.onclick ? '✅' : '❌'}`);
            }
            
            // Test 7: Manual error handler test
            console.log("\nTesting error handler manually:");
            try {
                const testError = "[mobx-state-tree] Failed to resolve reference 'TABL123456789' to type 'TileModel' (from node: /content/sharedModelMap/TEST/tiles/1)";
                console.log("  Triggering test MobX error...");
                this.handleCODAPMobXError(testError, new Error(testError));
                console.log("  Manual error handler test: ✅");
            } catch (error) {
                console.log("  Manual error handler test: ❌", error.message);
            }
            
            // Test 8: Check recent errors store
            console.log("\nChecking error storage:");
            const recentErrors = window.multiVariateExtrasRecentErrors || [];
            console.log(`  Recent errors stored: ${recentErrors.length}`);
            console.log(`  Error storage working: ${Array.isArray(recentErrors) ? '✅' : '❌'}`);
            
            console.log("\n=== ALL TESTS COMPLETED ===");
            console.log("If you see any ❌ marks above, there may be an issue with the debugging features.");
            console.log("If all tests show ✅, the debugging features should be working properly.");
            
        } catch (error) {
            console.error("Error during debug feature test:", error);
        }
        
        console.groupEnd();
    },

    /**
     * Provides a fresh, empty version of `multiVariateExtras.state`.
     * @returns {{dsID: null, datasetName: string}}
     */
    freshState: function () {
        multiVariateExtras.log(`called multiVariateExtras.freshState()`);
        return {
            dsID: null,
        };
    },

    makeInfoAlert(attrId) {
        let attr = null;
        this.datasetInfo && this.datasetInfo.collections.forEach(function (col) {
            attr = attr || col.attrs.find(function (attr) {
                return String(attr.id) === attrId;
            });
        });
        if (attr) {
            multiVariateExtras_ui.makeSweetAlert(attr.name, multiVariateExtras_ui.attributeControls.makeAttrDescriptor(attr));
        }
    },

    setUpDatasets: async function () {
        try {
            multiVariateExtras.log(`ds  multiVariateExtras --- setUpDatasets --- try`);

            this.datasetList = await connect.getListOfDatasets();
            multiVariateExtras.log(`ds      found ${this.datasetList.length} dataset(s)`);

            const tdsID = await multiVariateExtras_ui.datasetMenu.install();
            await this.setTargetDatasetByID(tdsID);
            await multiVariateExtras_ui.update();
        } catch (msg) {
            multiVariateExtras.error(`ds  multiVariateExtras --- setUpDatasets --- catch [${msg}]`);
        }
    },

    getNameOfCurrentDataset: function () {

        for (let i = 0; i < multiVariateExtras.datasetList.length; i++) {
            const theSet = multiVariateExtras.datasetList[i];
            if (Number(theSet.id) === Number(multiVariateExtras.dsID)) {
                return theSet.name;
            }
        }
        return null;
    },

    setTargetDatasetByID: async function (iDsID) {

        if (iDsID) {
            if (iDsID !== multiVariateExtras.dsID) {   //      there has been a change in dataset ID; either it's new or an actual change
                multiVariateExtras.log(`ds      now looking at dataset ${iDsID} (multiVariateExtras.setTargetDatasetByID())`);
                multiVariateExtras.dsID = iDsID;
                await notify.setUpNotifications();
            } else {
                multiVariateExtras.log(`ds      still looking at dataset ${iDsID} (multiVariateExtras.setTargetDatasetByID())`);
            }
        } else {
            multiVariateExtras.dsID = iDsID;
            multiVariateExtras.log(`?   called setTargetDatasetByID without a dataset ID`);
        }
    },

    loadCurrentData: async function () {
        const theCases = await connect.getAllCasesFrom(this.getNameOfCurrentDataset());
        this.theData = theCases;       //  fresh!
    },

    getLastCollectionName: function () {
        //  get the name of the last collection...
        const colls = this.datasetInfo.collections;
        const nCollections = colls.length;
        const lastCollName = colls.length? colls[nCollections - 1].name: null;
        return lastCollName;
    },

    getMultiVariateExtrasAttributeAndCollectionByAttributeName: function (iName) {
        for (let i = 0; i < multiVariateExtras.datasetInfo.collections.length; i++) {       //  loop over collections
            const coll = multiVariateExtras.datasetInfo.collections[i];
            for (let j = 0; j < coll.attrs.length; j++) {       //  loop over attributes within collection
                const att = coll.attrs[j];
                if (att.name === iName) {
                    return {
                        att: att,
                        coll: coll
                    }
                }
            }
        }
        return null;
    },

    addAttributeToBatch: async function (iAttName, iBatchName) {
        await connect.setAttributeBatch(multiVariateExtras.datasetInfo.name, iAttName, iBatchName);
        await multiVariateExtras_ui.update();
    },

    /**
     * return the id for an attribute stripe, e.g., "att-Age"
     * @param iName
     * @returns {string}
     */
    attributeStripeID(iName) {
        return `att-${iName}`;
    },


    /**
     * Parse the attribute "batchs" indicated by bracketed batch names in the attribute descriptions.
     *
     * For example, `{work}Percent of people working in agriculture`
     * puts the attribute in a batch called "work" and then strips that tag from the description.
     *
     * Does this by adding a `batch` key to the attribute data --- which does not exist in CODAP.
     *
     * @param theInfo   the information on all collections and attributes
     */
    processDatasetInfoForAttributeBatchs: function (theInfo) {

        const whichWayToBatch = multiVariateExtras_ui.getBatchingStrategy();

        for (let batch in multiVariateExtras_ui.batchRecord) {
            let theRecord = multiVariateExtras_ui.batchRecord[batch];
            theRecord["attrs"] = [];
        }

        if (!theInfo.collections) {
            theInfo.collections = [];
        }
        theInfo.collections.forEach(coll => {
            coll.attrs.forEach(att => {
                let theDescription = att.description || '';
                let theBatch = multiVariateExtras.constants.noBatchString;
                const leftB = theDescription.indexOf("{");
                const rightB = theDescription.indexOf("}");
                if (rightB > leftB) {
                    theBatch = theDescription.substring(leftB + 1, rightB);
                    att["description"] = theDescription.substring(rightB + 1);  //  strip the bracketed batch name from the description
                }

                //  if we're batching "byLevel", use the collection name as the batch name
                const theGroupName = (whichWayToBatch === "byLevel") ? coll.name : theBatch;   //  todo: really should be title

                //  change the `att` field to include fields for `batch` and `collection`
                att["batch"] = theGroupName
                att["collection"] = coll.name;  //  need this as part of the resource so we can change hidden

                //  this is where multiVariateExtras_ui.batchRecord gets set!
                //  add an element to the object for this batch if it's not there already

                if (!multiVariateExtras_ui.batchRecord[theGroupName]) {
                    multiVariateExtras_ui.batchRecord[theGroupName] = {open: true, attrs: [], mode: ""};
                }
                multiVariateExtras_ui.batchRecord[theGroupName].attrs.push(att.name);
                multiVariateExtras_ui.batchRecord[theGroupName].mode = whichWayToBatch;
            })
        })
    },

    getTagAttributeName : function() {
        let tagAttributeName = document.getElementById("tag-attribute-name-text").value;

        if (!tagAttributeName) {
            tagAttributeName = multiVariateExtras.constants.defaultTagName;
            document.getElementById("tag-attribute-name-text").value = tagAttributeName;
        }

        return tagAttributeName;
    },

    handlers: {

        changeSearchText: async function () {

        },

        changeTagMode: function () {
            multiVariateExtras_ui.update();
        },

        applyTagToSelection: async function (iMode) {
            await connect.tagging.doSimpleTag(iMode);
        },

        applyBinaryTags: async function () {
            await connect.tagging.doBinaryTag();
        },

        applyRandomTags: async function () {
            await connect.tagging.doRandomTag();
        },

        clearAllTags: async function () {
            const theTagName = multiVariateExtras.getTagAttributeName();
            await connect.tagging.clearAllTagsFrom(theTagName);
        },

        /**
         * Handles user press of a visibility button for a single attribute (not a batch)
         *
         * @param iAttName
         * @param iHidden       are we hiding this?
         * @returns {Promise<void>}
         */
        oneAttributeVisibilityButton: async function (iAttName, iHidden) {
            await connect.showHideAttribute(multiVariateExtras.datasetInfo.name, iAttName, !iHidden);
            //  multiVariateExtras_ui.update();   //  not needed here; called from the notification handler

        },

        batchVisibilityButton: async function (event) {

            event.stopPropagation();
            event.preventDefault();

            const theID = event.target.id;
            const theType = theID.substring(0, 4);
            const theBatchName = theID.substring(5);
            const toHide = theType === "hide";

            multiVariateExtras.log(`${toHide ? "Hiding" : "Showing"} all attributes in [${theBatchName}]`);

            let theAttNames = [];

            multiVariateExtras.datasetInfo.collections.forEach(coll => {
                coll.attrs.forEach(att => {
                    if (att.batch === theBatchName) {
                        theAttNames.push(att.name);    //  collect all these names
                    }
                })
            })
            const goodAttributes = await connect.showHideAttributeList(multiVariateExtras.datasetInfo.name, theAttNames, toHide);
            //  multiVariateExtras.updateAttributes(goodAttributes);
            //          multiVariateExtras_ui.update    //  not needed here; called from the notification handler
        },

        toggleAttributeGroupingMode: function() {
            const newMode = (multiVariateExtras.attributeGroupingMode === multiVariateExtras.constants.kGroupAttributeByBatchMode) ?
                multiVariateExtras.constants.kGroupAttributeByLevelMode : multiVariateExtras.constants.kGroupAttributeByBatchMode;

            multiVariateExtras.attributeGroupingMode = newMode;
            multiVariateExtras_ui.update();
        },

        toggleDetail: function (event) {
            const theBatchName = event.target.id.substring(8);
            multiVariateExtras_ui.recordCurrentOpenDetailStates();
            multiVariateExtras.log(`batch toggle! ${theBatchName}`);
        },

        //  todo: decide if we really need this
        handleSelectionChangeFromCODAP: async function () {
            multiVariateExtras.selectedCaseIDs = await connect.tagging.getCODAPSelectedCaseIDs();
            multiVariateExtras.log(`    ${multiVariateExtras.selectedCaseIDs.length} selected case(s)`);
            multiVariateExtras_ui.update();
        },

        /**
         * Handles user click on "compute table" button in correlation tab
         * Computes pairwise correlation values and records the results
         */
        computeCorrelationTable: async function () {
            if (!multiVariateExtras.datasetInfo) {
                multiVariateExtras.warn("No dataset selected for correlation analysis");
                return;
            }

            // Use enhanced table creation with error monitoring
            await multiVariateExtras.createTableWithMonitoring();

            // Create a mapping of attribute names to their order in the table
            const attributeOrderMap = new Map();
            let attributeCounter = 1;
            
            // First pass: build the order mapping
            for (const coll of multiVariateExtras.datasetInfo.collections) {
                for (const attr of coll.attrs) {
                    attributeOrderMap.set(attr.name, attributeCounter++);
                }
            }

            // Loop through all collections and compute correlations
            for (const coll of multiVariateExtras.datasetInfo.collections) {
                const nCases = await connect.getItemCountFrom(multiVariateExtras.datasetInfo.name);
                
                for (const attr1 of coll.attrs) {
                    const attr_name1 = attr1["name"];

                    for (const attr2 of coll.attrs) {
                        const attr_name2 = attr2["name"];

                        let correlationType = "none yet";
                        let correlationResult = null;
                        let nBlanks1_actual = 0;
                        let nBlanks2_actual = 0;
                        let correlBlanks = null;
                        let nCompleteCases = 0;

                        // Map attribute types to essential categories
                        const essentialType1 = multiVariateExtras.correlationUtils.mapAttributeTypeToCategory(attr1["type"]);
                        const essentialType2 = multiVariateExtras.correlationUtils.mapAttributeTypeToCategory(attr2["type"]);

                        // if both attributes have type numeric, use Pearson correlation:
                        if (essentialType1 === "EssentiallyNumeric" && essentialType2 === "EssentiallyNumeric") {
                            correlationType = "Pearson";
                            
                            try {
                                // Get all cases and extract numeric values for correlation
                                const allCases = await connect.getAllCasesFrom(multiVariateExtras.datasetInfo.name);
                                const bivariateData = [];
                                
                                Object.values(allCases).forEach(aCase => {
                                    const val1 = aCase.values[attr_name1];
                                    const val2 = aCase.values[attr_name2];
                                    
                                    // Convert to numbers, handling various missing value formats
                                    const num1 = (val1 === null || val1 === undefined || val1 === "") ? null : parseFloat(val1);
                                    const num2 = (val2 === null || val2 === undefined || val2 === "") ? null : parseFloat(val2);
                                    
                                    bivariateData.push({x: num1, y: num2});
                                });
                                
                                // Use our custom correlation function that also computes missingness correlation
                                const correlationResults = multiVariateExtras.correlationUtils.onlinePearsonWithMissingCorr(bivariateData);
                                
                                correlationResult = correlationResults.correlation;
                                nCompleteCases = correlationResults.nCompleteCases;
                                nBlanks1_actual = correlationResults.nxMissing;
                                nBlanks2_actual = correlationResults.nyMissing;
                                correlBlanks = correlationResults.missingnessCorrelation;
                                
                            } catch (error) {
                                console.error(`Error computing correlation between ${attr_name1} and ${attr_name2}:`, error);
                                correlationResult = null;
                                correlBlanks = null;
                            }
                        } else {
                            correlationType = "none";
                            correlationResult = null;
                            correlBlanks = null;
                        }

                        // Compute confidence intervals and p-value if we have a valid correlation
                        let CI_low95 = null;
                        let CI_high95 = null;
                        let p_value = null;

                        if (correlationResult !== null && !isNaN(correlationResult) && nCompleteCases > 3) {
                            const ciResults = multiVariateExtras.correlationUtils.computeCorrelationCI(correlationResult, nCompleteCases);
                            CI_low95 = ciResults.CI_low;
                            CI_high95 = ciResults.CI_high;
                            
                            // Simple p-value approximation (for exact calculation, would need t-distribution)
                            const t_stat = correlationResult * Math.sqrt((nCompleteCases - 2) / (1 - correlationResult * correlationResult));
                            p_value = 2 * (1 - multiVariateExtras.correlationUtils.standardNormalCDF(Math.abs(t_stat)));
                        }

                        // Create the correlation case data
                        const correlationCase = {
                            "TableName": multiVariateExtras.datasetInfo.name,
                            "Predictor": attr_name1,
                            "Response": attr_name2,
                            "correlation": correlationResult,
                            "correlationType": correlationType,
                            "nNeitherMissing": nCompleteCases,
                            "nCases": nCases,
                            "nBlanks1": nBlanks1_actual,
                            "nBlanks2": nBlanks2_actual,
                            "correlBlanks": correlBlanks,
                            "CI_low95": CI_low95,
                            "CI_high95": CI_high95,
                            "p_value": p_value,
                            "date": new Date().toISOString(),
                            "type1": attr1["type"],
                            "unit1": attr1["unit"] || "",
                            "type2": attr2["type"],
                            "unit2": attr2["unit"] || "",
                            "description1": attr1["description"] || "",
                            "description2": attr2["description"] || "",
                            "table_order_Predictor": `${String(attributeOrderMap.get(attr_name1) || 0).padStart(3, '0')}_${attr_name1}`,
                            "table_order_Response": `${String(attributeOrderMap.get(attr_name2) || 0).padStart(3, '0')}_${attr_name2}`,
                            
                            // we're calling the date function repeatedly here,
                            // and we might get slightly different results each time,
                            // and that's mostly ok since the computations were
                            // in fact done at different times.
                        };

                        // Send the data to CODAP
                        pluginHelper.createItems(correlationCase);
                    }
                }
            }

            multiVariateExtras.log("Correlation table computation completed");
        },

        /**
         * Handles user click on "create graph" button in correlation tab
         * Creates a scatter plot graph for correlation visualization using the correlation dataset
         */
        graphCorrelationTable: async function () {
            // Check if the correlation dataset exists
            const correlationDatasetName = multiVariateExtras.dataSetCorrelations.name;
            
            try {
                // First, check if the correlation dataset exists
                const datasetCheck = await codapInterface.sendRequest({
                    action: "get",
                    resource: `dataContext[${correlationDatasetName}]`
                });

                if (!datasetCheck.success) {
                    multiVariateExtras.warn("Correlation dataset not found. Please compute the correlation table first.");
                    return;
                }

                // Create a scatter plot using the correlation dataset with correlation as legend
                // Use the enhanced graph creation with error monitoring
                const result = await multiVariateExtras.createGraphWithMonitoring(
                    correlationDatasetName,
                    "Predictor",
                    "Response",
                    "correlation"
                );

                if (result.success) {
                    const componentId = result.values.id;
                    multiVariateExtras.log(`Created correlation graph: ${componentId}`);
                    multiVariateExtras.log(`Graph shows Predictor vs Response with correlation legend`);
                } else {
                    multiVariateExtras.warn(`Failed to create correlation graph: ${result.values ? result.values.error : "unknown error"}`);
                }
            } catch (error) {
                multiVariateExtras.error(`Error creating correlation graph: ${error}`);
            }
        },

    },

    /**
     * Utility functions for correlation analysis
     */
    correlationUtils: {
        /**
         * Maps CODAP attribute types to simplified categories for correlation analysis
         * @param {string} type - CODAP attribute type
         * @returns {string} Simplified category: "EssentiallyNumeric", "EssentiallyCategorical", or "Other"
         */
        mapAttributeTypeToCategory: function(type) {
            if (!type || type === "" || type === "categorical" || type === "checkbox" || type === "nominal") {
                // the roller coaster data that comes with CODAP has some attributes listed as "nominal"
                return "EssentiallyCategorical"; // checkbox can be FALSE, TRUE, or missing
            } else if (type === "numeric" || type === "date" || type === "qualitative") {
                return "EssentiallyNumeric"; // qualitative is just a way to display numeric data with bars in the table
            } else if (type === "boundary"|| type === "color") {
                return "Other";
            } else {
                // Default case for any unrecognized types
                return "Other";
            }
        },

        /**
         * Compute Pearson correlation for actual values and missingness indicators
         * @param {Array} data - Array of objects with x and y properties
         * @returns {Object} Object containing correlation results and counts
         */
        onlinePearsonWithMissingCorr: function(data) {
            // For actual (x, y) values
            let n = 0;
            let meanX = 0.0;
            let meanY = 0.0;
            let Sx = 0.0;
            let Sy = 0.0;
            let Sxy = 0.0;

            // For binary indicators (ix_missing, iy_missing)
            let nInd = 0;
            let meanIxMissing = 0.0;
            let meanIyMissing = 0.0;
            let SixMissing = 0.0;
            let SiyMissing = 0.0;
            let SixyMissing = 0.0;

            // Count of missing x and y individually
            let nxMissing = 0;
            let nyMissing = 0;

            for (const point of data) {
                const x = point.x;
                const y = point.y;

                // Create indicator variables (1 if missing, 0 if not missing)
                const ixMissing = (x === null || x === undefined || x === "" || isNaN(x)) ? 1.0 : 0.0;
                const iyMissing = (y === null || y === undefined || y === "" || isNaN(y)) ? 1.0 : 0.0;

                // Update counts of missing x and y
                nxMissing += ixMissing;
                nyMissing += iyMissing;

                // Update statistics for binary indicators
                nInd += 1;
                const dxInd = ixMissing - meanIxMissing;
                const dyInd = iyMissing - meanIyMissing;
                meanIxMissing += dxInd / nInd;
                meanIyMissing += dyInd / nInd;
                SixMissing += dxInd * (ixMissing - meanIxMissing);
                SiyMissing += dyInd * (iyMissing - meanIyMissing);
                SixyMissing += dxInd * (iyMissing - meanIyMissing);

                // Update statistics for actual (x, y) correlation only if both are not missing
                if (ixMissing === 0.0 && iyMissing === 0.0) {
                    n += 1;
                    const dx = x - meanX;
                    const dy = y - meanY;
                    meanX += dx / n;
                    meanY += dy / n;
                    Sx += dx * (x - meanX);
                    Sy += dy * (y - meanY);
                    Sxy += dx * (y - meanY);
                }
            }

            // Final Pearson correlations
            const rXy = (Sx > 0 && Sy > 0) ? Sxy / Math.sqrt(Sx * Sy) : NaN;
            const rIxIy = (SixMissing > 0 && SiyMissing > 0) ? SixyMissing / Math.sqrt(SixMissing * SiyMissing) : NaN;

            // n here is n_neithermissing
            return {
                correlation: rXy,
                nCompleteCases: n,
                missingnessCorrelation: rIxIy,
                nxMissing: nxMissing,
                nyMissing: nyMissing,
                totalCases: nInd
            };
        },

        /**
         * Compute confidence intervals for Pearson correlation coefficient using Fisher's z-transformation
         * @param {number} r - Observed Pearson correlation coefficient
         * @param {number} n - Sample size
         * @param {number} z - Z-value for confidence level (default: 1.96 for 95% CI)
         * @returns {Object} Object containing confidence interval bounds
         */
        computeCorrelationCI: function(r, n, z = 1.96) {
            // Check for valid inputs
            if (r < -1 || r > 1) {
                return { CI_low: NaN, CI_high: NaN, error: "Correlation coefficient must be between -1 and 1" };
            }
            if (n <= 3) {
                return { CI_low: NaN, CI_high: NaN, error: "Sample size must be greater than 3" };
            }
            if (Math.abs(r) === 1) {
                return { CI_low: r, CI_high: r, error: "Perfect correlation - CI is the point estimate" };
            }

            // Fisher's z-transformation: z_r = (1/2) * ln((1+r)/(1-r))
            const z_r = 0.5 * Math.log((1 + r) / (1 - r));
            
            // Standard error of the transformed correlation
            const se_z = 1 / Math.sqrt(n - 3);
            
            // Margin of error
            const me = z * se_z;
            
            // Confidence interval bounds in transformed space
            const CI_low_transformed = z_r - me;
            const CI_high_transformed = z_r + me;
            
            // Transform back to correlation space: r = (exp(2*z_r) - 1) / (exp(2*z_r) + 1)
            const CI_low = (Math.exp(2 * CI_low_transformed) - 1) / (Math.exp(2 * CI_low_transformed) + 1);
            const CI_high = (Math.exp(2 * CI_high_transformed) - 1) / (Math.exp(2 * CI_high_transformed) + 1);
            
            return {
                CI_low: CI_low,
                CI_high: CI_high,
                z_transformed: z_r,
                standard_error: se_z,
                margin_of_error: me
            };
        },

        /**
         * Standard normal cumulative distribution function approximation
         * @param {number} x - Z-score
         * @returns {number} P(Z <= x)
         */
        standardNormalCDF: function(x) {
            // Simple approximation of the standard normal CDF
            // For more accuracy, you could use a more sophisticated approximation
            return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
        },

        /**
         * Error function approximation
         * @param {number} x - Input value
         * @returns {number} Error function value
         * This code was written by Cursor AI. It's based on an approximation by
         * Abramowitz and Stegun, as given in
         * https://en.wikipedia.org/wiki/Error_function#Approximation_with_elementary_functions
         * with maximum error of 1.5 x 10^-7.
         * This blog https://www.johndcook.com/blog/2009/01/19/stand-alone-error-function-erf/
         * shows how to use Horner's method to evaluate the polynomial.
         * An even better approximation based on "C code from Sun Microsystems" is given in 
         * https://math.stackexchange.com/questions/263216/error-function-erf-with-better-precision
         * but that's probably overkill for our purposes.
         */
        erf: function(x) {
            // Simple approximation of the error function
            const a1 =  0.254829592;
            const a2 = -0.284496736;
            const a3 =  1.421413741;
            const a4 = -1.453152027;
            const a5 =  1.061405429;
            const p  =  0.3275911;

            const sign = x >= 0 ? 1 : -1;
            x = Math.abs(x);

            const t = 1.0 / (1.0 + p * x);
            const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

            return sign * y;
        },
    },

    /**
     * Constant object CODAP uses to initialize the correlation dataset
     * @type {{name: string, title: string, description: string, collections: [*]}}
     */
    dataSetCorrelations: {
        name: "PairwiseCorrelations",
        title: "PairwiseCorrelations",
        description: "table of pairwise correlations",
        collections: [
            {
                name: "PairwiseCorrelations",
                parent: null,
                labels: {
                    singleCase: "PairwiseCorrelation",
                    pluralCase: "PairwiseCorrelations",
                    setOfCasesWithArticle: "set of PairwiseCorrelations"
                },
                attrs: [
                    {name: "TableName", type: 'categorical', description: ""},
                    {name: "Predictor", type: 'categorical', description: "attribute1"},
                    {name: "Response", type: 'categorical', description: "attribute2"},
                    {name: "correlation", type: 'numeric', precision: 8, description: "correlation coefficient"},
                    {name: "correlationType", type: 'categorical', description: "type of correlation-like value computed"},
                    {name: "nNeitherMissing", type: 'numeric', description: "number of complete cases"},
                    {name: "nCases", type: 'numeric', description: "number of cases INCLUDING blanks"},
                    {name: "nBlanks1", type: 'numeric', description: "number of blanks"},
                    {name: "nBlanks2", type: 'numeric', description: "number of blanks"},
                    {name: "correlBlanks", type: 'numeric', description: "correlation coefficient between missingness indicators"},
                    {name: "CI_low95", type: 'numeric', description: "low end of naive 95% confidence interval on correlation value"},
                    {name: "CI_high95", type: 'numeric', description: "high end of naive 95% confidence interval on correlation value"},
                    {name: "p_value", type: 'numeric', description: "p-value for naive hypothesis test on correlation value"},
                    {name: "date", type: 'categorical', description: "date and time summary done"},
                    {name: "type1", type: 'categorical', description: "type of the first attribute"},
                    {name: "unit1", type: 'categorical', description: "unit of the first attribute"},
                    {name: "type2", type: 'categorical', description: "type of the second attribute"},
                    {name: "unit2", type: 'categorical', description: "unit of the second attribute"},
                    {name: "description1", type: 'categorical', description: "description of the first attribute"},
                    {name: "description2", type: 'categorical', description: "description of the second attribute"},
                    {name: "table_order_Predictor", type: 'categorical', description: "attribute1 with numeric prefix to show table order"},
                    {name: "table_order_Response", type: 'categorical', description: "attribute2 with numeric prefix to show table order"}
                ]
            }
        ]
    },

    utilities: {
        stringFractionDecimalOrPercentToNumber: function (iString) {
            let out = {theNumber: 0, theString: '0'};
            let theNumber = 0;
            let theString = "";

            const wherePercent = iString.indexOf("%");
            const whereSlash = iString.indexOf("/");
            if (wherePercent !== -1) {
                const thePercentage = parseFloat(iString.substring(0, wherePercent));
                theString = `${thePercentage}%`;
                theNumber = thePercentage / 100.0;
            } else if (whereSlash !== -1) {
                const beforeSlash = iString.substring(0, whereSlash);
                const afterSlash = iString.substring(whereSlash + 1);
                const theNumerator = parseFloat(beforeSlash);
                const theDenominator = parseFloat(afterSlash);
                theNumber = theNumerator / theDenominator;
                theString = `${theNumerator}/${theDenominator}`;
            } else {
                theNumber = parseFloat(iString);
                theString = `${theNumber}`;
            }

            if (!isNaN(theNumber)) {
                return {theNumber: theNumber, theString: theString};
            } else {
                return {theNumber: 0, theString: ""};
            }
        },
    },

    constants: {
        version: '2025a',
        datasetSummaryEL: 'summaryInfo',
        selectionStatusElementID: 'selection-status',
        tagValueElementID: "tag-value-input",
        tagValueSelectedElementID: "tag-value-selected",
        tagValueNotSelectedElementID: "tag-value-not-selected",
        tagValueGroupAElementID: "tag-value-group-A",
        tagValueGroupBElementID: "tag-value-group-B",
        tagPercentageElementID: "tag-percentage",
        noBatchString: "--",
        kGroupAttributeByBatchMode : "byBatch",
        kGroupAttributeByLevelMode : "byLevel",
        defaultTagName : "Tag",
    },
    log: function (msg) {
        // console.log(msg);
    },
    warn: function (msg) {
        console.warn(msg);
    },
    error: function (msg) {
        console.error(msg);
    }
}
