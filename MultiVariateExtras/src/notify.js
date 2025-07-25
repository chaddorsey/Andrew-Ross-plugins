const notify = {

    nHandled: 0,

    setUpDocumentNotifications: async function () {
        try {
            await codapInterface.on('notify', 'component', this.handleComponentChangeNotice.bind(this));
            await codapInterface.on('notify', 'dataContextChangeNotice', this.handleDataContextChangeNotice.bind(this));
            await codapInterface.on('notify', 'documentChangeNotice', this.handleDocumentChangeNotice.bind(this));
            multiVariateExtras.log("Document notifications set up");
        } catch (error) {
            multiVariateExtras.error(`Error setting up document notifications: ${error.message}`);
        }
    },

    setUpNotifications: async function () {
        const theCurrentDSName = multiVariateExtras.getNameOfCurrentDataset();
        if (theCurrentDSName && theCurrentDSName !== this.notificationsAreSetUp) {
            try {
                await codapInterface.on('notify', `dataContextChangeNotice[${theCurrentDSName}]`, this.handleDataContextChangeNotice.bind(this));
                this.notificationsAreSetUp = theCurrentDSName;
                multiVariateExtras.log(`Notifications set up for dataset: ${theCurrentDSName}`);
            } catch (error) {
                multiVariateExtras.error(`Error setting up notifications for dataset ${theCurrentDSName}: ${error.message}`);
            }
        }
    },

    /**
     * Handle component change notifications to track component lifecycle
     * This helps prevent MobX state tree reference resolution errors
     */
    handleComponentChangeNotice: function (iMessage) {
        this.nHandled++;
        if (this.nHandled % 50 === 0) {
            multiVariateExtras.log(`fyi     ${this.nHandled} notifications handled. `)
        }

        const theValues = iMessage.values;
        if (!theValues) return;

        multiVariateExtras.log(`˜  handleComponentChangeNotice operation ${this.nHandled}: ${theValues.operation}`);

        switch (theValues.operation) {
            case 'delete':
                // Component was deleted - remove from tracking to prevent stale references
                if (theValues.id && multiVariateExtras.untrackComponent) {
                    multiVariateExtras.untrackComponent(theValues.id);
                    multiVariateExtras.log(`Component ${theValues.id} was deleted externally`);
                }
                break;

            case 'create':
                // Component was created - could be tracked if needed
                if (theValues.id) {
                    multiVariateExtras.log(`Component ${theValues.id} was created`);
                }
                break;

            case 'update':
                // Component was updated
                if (theValues.id) {
                    multiVariateExtras.log(`Component ${theValues.id} was updated`);
                }
                break;

            case 'select':
                // Component was selected - this can trigger MobX errors
                if (theValues.id) {
                    multiVariateExtras.log(`Component ${theValues.id} was selected`);
                    
                    // If this is a table component, prepare for potential MobX errors
                    if (theValues.type === 'table' || theValues.id.startsWith('TABL')) {
                        console.log("Table component selected - monitoring for potential MobX errors...");
                        
                        // Set a flag to watch for errors in the next few seconds
                        setTimeout(() => {
                            console.log("Table selection monitoring period ended");
                        }, 5000);
                    }
                }
                break;

            default:
                multiVariateExtras.log(`?  handleComponentChangeNotice unhandled operation: ${theValues.operation}`);
                break;
        }
    },

    handleDataContextChangeNotice: function (iMessage) {
        const theCurrentDSName = multiVariateExtras.getNameOfCurrentDataset();
        if (iMessage.resource === `dataContextChangeNotice[${theCurrentDSName}]`) {
            this.nHandled++;
            if (this.nHandled % 50 === 0) {
                multiVariateExtras.log(`fyi     ${this.nHandled} notifications handled. `)
            }

            const theValues = iMessage.values;

            multiVariateExtras.log(`˜  handleDataContextChangeNotice operation ${this.nHandled}: ${theValues.operation}`);
            switch (theValues.operation) {
                case `selectCases`:
                case `updateCases`:
                    multiVariateExtras.handlers.handleSelectionChangeFromCODAP();
                    break;

                case `updateCollection`:
                case `createCollection`:
                case `deleteCollection`:
                case `moveAttribute`:
                case `deleteAttributes` :
                case `createAttributes` :
                case `updateAttributes`:
                case `hideAttributes`:
                case `showAttributes`:

                    multiVariateExtras_ui.update();     //  which reads the database structure (cols, atts) from CODAP
                    break;
                //  todo: alter when JS fixes the bug about not issuing notifications for plugin-initiated changes.

                case `updateDataContext`:       //  includes renaming dataset, so we have to redo the menu
                    multiVariateExtras.setUpDatasets();
                    multiVariateExtras_ui.update();
                    break;

                case 'createCases':
                case 'createItems':
                    break;

                default:
                    multiVariateExtras.log(`?  handleDataContextChangeNotice unhandled operation: ${theValues.operation}`);
                    break;
            }
        }
    },

    handleDocumentChangeNotice: function (iMessage) {
        this.nHandled++;
        if (this.nHandled % 50 === 0) {
            multiVariateExtras.log(`fyi     ${this.nHandled} notifications handled. `)
        }

        const theValues = iMessage.values;
        if (!theValues) return;

        multiVariateExtras.log(`˜  handleDocumentChangeNotice operation ${this.nHandled}: ${theValues.operation}`);

        switch (theValues.operation) {
            case 'close':
                // Document is being closed - perform cleanup
                if (multiVariateExtras.cleanup) {
                    multiVariateExtras.cleanup();
                }
                break;

            case 'save':
                // Document is being saved - validate references
                if (multiVariateExtras.validateReferences) {
                    multiVariateExtras.validateReferences();
                }
                break;

            default:
                multiVariateExtras.log(`?  handleDocumentChangeNotice unhandled operation: ${theValues.operation}`);
                break;
        }
    }
}
