const notify = {
    setUpDocumentNotifications: async function () {
        //  receive notifications about doc changes, especially number of datasets
        //  (user has added or deleted a dataset)
        const tResource = `documentChangeNotice`;
        codapInterface.on(
            'notify',
            tResource,
            //  'updateAttribute',
            notify.handleDocumentChangeNotice
        );
        multiVariateExtras.log(`˜  notifications on [${tResource}]`);
    },
    /**
     * Ask to be notified about changes in attributes and selections
     * @returns {Promise<void>}
     */
    setUpNotifications: async function () {
        //  register to receive notifications about changes to the data context (including selection)
        const theCurrentDSName = multiVariateExtras.getNameOfCurrentDataset();
        const sResource = `dataContextChangeNotice[${theCurrentDSName}]`;
        codapInterface.on(
            'notify',
            sResource,
            //'selectCases',
            notify.handleDataContextChangeNotice
        );
        multiVariateExtras.log(`˜  notifications on [${sResource}]`);
    },

    nHandled : 0,

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
        // multiVariateExtras.log(`handleDocumentChange operation: ${theValues.operation}`);
        multiVariateExtras.setUpDatasets();
    },

}
