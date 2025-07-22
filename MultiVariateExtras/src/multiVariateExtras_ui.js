/*
==========================================================================

 * Created by tim on 10/1/20.
 
 
 ==========================================================================
multiVariateExtras_ui in multiVariateExtras

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

/*  global Swal  */
const multiVariateExtras_ui = {

    currentBatchName: "",

    /**
     * An object keyed by batch names that records whether the details for that batch are open.
     */
    batchRecord: {},

    initialize: async function () {
        //  set up the dataset menu
        try {
            await this.datasetMenu.install();      //  async but we can go on...
            multiVariateExtras.log(`ui initialize: dataset menu installed`);
        } catch (msg) {
            multiVariateExtras.log(`ui initialize: caught trying to install the datasetMenu: ${msg}`);
        }
        //  this.update();
        
        // Update correlation dataset name on initialization
        this.updateCorrelationDatasetName();
    },

    updateCount: 0,
    /**
     * Main update routine --- gets dataset structure from CODAP and redraws everything.
     * @returns {Promise<void>}
     */
    update: async function () {
        this.updateCount++;
        if (this.updateCount % 50 === 0) {
            multiVariateExtras.log(`fyi     ${this.updateCount} calls to multiVariateExtras_ui.update(). `);
        }

        multiVariateExtras.datasetInfo = await connect.refreshDatasetInfoFor(multiVariateExtras.dsID);

        if (multiVariateExtras.datasetInfo) {
            multiVariateExtras.processDatasetInfoForAttributeBatchs(multiVariateExtras.datasetInfo);        //  sets this.batchRecord;
            this.setBatchNameDefault();
            this.recordCurrentOpenDetailStates();
            this.attributeControls.install();
            this.doTagVisibility();
            await this.makeSummary();
            this.updateCorrelationDatasetName();  // Update correlation tab dataset name
        }

        //  more miscellaneous visibility

        const batchNameDIV = document.getElementById("batchNameDIV");
        batchNameDIV.style.display = (this.getBatchingStrategy() === "byBatch") ? "flex" : "none";

        //  display correct attribute grouping mode control

        const theImageURL = (multiVariateExtras.attributeGroupingMode === multiVariateExtras.constants.kGroupAttributeByBatchMode) ?
            "art/batch-slide.png" :
            "art/level-slide.png";
        const theAGMControl = document.getElementById("attribute-grouping-mode-control");
        theAGMControl.innerHTML = `&ensp; <img height="20" width="100" style="cursor:pointer;"  src="${theImageURL}"></img>`;
    },

    setBatchNameDefault: function () {
        let current = document.getElementById("batch-name-text-input").value;
        this.currentBatchName = current;

        if (!this.batchRecord[current] || this.batchRecord[current].attrs.length <= 0) {
            for (let batch in this.batchRecord) {
                if (this.batchRecord[batch] && this.batchRecord[batch].attrs.length > 0
                    && batch !== multiVariateExtras.constants.noBatchString
                    && this.batchRecord[batch].mode === "byBatch"
                ) {
                    document.getElementById("batch-name-text-input").value = batch;
                    this.currentBatchName = batch;

                    return;
                }
            }
        }
    },

    /**
     * Set visibility for different parts of the **Tag** interface,
     * e.g., show only "binary" controls in binary mode.
     */
    doTagVisibility: function () {
        const tagModeString = document.querySelector("input[name='tag-mode']:checked").value;

        document.getElementById("simple-tag").style.display = (tagModeString === "simple") ? "block" : "none";
        document.getElementById("binary-tag").style.display = (tagModeString === "binary") ? "block" : "none";
        document.getElementById("random-tag").style.display = (tagModeString === "random") ? "block" : "none";
    },

    /**
     * Construct and install summaries about how many cases, attributes, and selected cases there are.
     * @returns {Promise<void>}
     */
    makeSummary: async function () {
        const summaryEl = document.getElementById(multiVariateExtras.constants.selectionStatusElementID);
        const datasetSummaryEL = document.getElementById(multiVariateExtras.constants.datasetSummaryEL);
        const selectedCases = await connect.tagging.getCODAPSelectedCaseIDs();

        let theText = "";
        let nAttributes = 0;
        if (multiVariateExtras.datasetInfo) {
            multiVariateExtras.datasetInfo.collections.forEach(coll => {
                coll.attrs.forEach(() => {
                    nAttributes++;
                })
            })
        }
        //  const nCases = await connect.getItemCountFrom(multiVariateExtras.datasetInfo.name);
        const nCases = await connect.getLastCollectionCaseCount(
            multiVariateExtras.datasetInfo.name,
            multiVariateExtras.getLastCollectionName()
        );

        theText += `${nAttributes} attributes, ${nCases} cases. ${selectedCases.length} selected.`;

        //  install this summary text in the DOM

        summaryEl.innerHTML = theText;
        datasetSummaryEL.innerHTML = theText;
    },

    /**
     * User has changed the name of the batch. Set `this.currentBatchName` and ask for the attribute
     * control "stripes" to be redrawn.
     */
    changeAttributeBatchNameInput: function () {
        this.attributeControls.install();
    },


    /**
     * Look at the UI to tell whether we're batching "by batch" or using the hierarchy (byLayer)
     * @returns {*} string! `byLayer` or `byBatch`
     */
    getBatchingStrategy: function () {
        return multiVariateExtras.attributeGroupingMode;
    },

    /**
     * Record whether the `<details>` UI for each batch is currently open in the `batchRecord` object.
     */
    recordCurrentOpenDetailStates: function () {
        for (const batch in this.batchRecord) {
            //  if (batch !== multiVariateExtras.constants.noBatchString) {
            const theID = "details-" + batch;
            const theElement = document.getElementById(theID);
            if (theElement) {   //  there might be an empty batch, so no element to be open or closed
                const isOpen = theElement.hasAttribute("open");
                this.batchRecord[batch].open = isOpen;
                multiVariateExtras.log(`ç  recording that ${batch} is ${isOpen ? " open" : " closed"}`);
            }
            //  }
        }
    },

    makeSweetAlert: function (iTitle, iText, iIcon = 'info') {
        Swal.fire({
            icon: iIcon,
            title: iTitle,
            text: iText,
        })
    },

    /**
     *  attribute checkbox section
     */

    attributeControls: {
        divID: "chooseAttributeDiv",

        mungedAttributes: null,

        /**
         * Go through the attributes as returned by CODAP.
         * Make an object keyed by batch name whose values are Arrays of attributes.
         *
         * called by attributeControls:make()
         *
         * @param iCollInfo
         * @returns {{}}    Object: An object keyed by batch name. Values are Arrays of attributes.
         */
        preprocessAttributes: function (iCollInfo) {
            let out = {};
            const byBatch = multiVariateExtras_ui.getBatchingStrategy() === "byBatch";

            iCollInfo.forEach(coll => {
                coll.attrs.forEach(att => {
                    const theBatch = att.batch ? att.batch : multiVariateExtras.constants.noBatchString;
                    if (!out[theBatch]) {
                        out[theBatch] = [];     //  fresh array for new batch
                    }
                    out[theBatch].push(att);
                })
            })

            return out;
        },

        /**
         * Create HTML for the batchs and the attributes inside them.
         *
         * @returns {string}   the HTML
         */
        make: function () {
            let tGuts = "";

            if (multiVariateExtras.datasetInfo.collections) {
                const hierarchy = (multiVariateExtras.datasetInfo.collections.length !== 1);

                this.mungedAttributes = this.preprocessAttributes(multiVariateExtras.datasetInfo.collections);

                if (hierarchy) {
                }

                const theNameBox = document.getElementById("batch-name-text-input");
                let possibleNewBatch = theNameBox.value.trim();


                //  loop over all the batches (or collections, if we're doing this by level)
                for (let theBatchName in this.mungedAttributes) {
                    if (theBatchName === possibleNewBatch) {
                        possibleNewBatch = null;
                    }

                    const theArrayOfAttributes = this.mungedAttributes[theBatchName];
                    tGuts += this.makeEntireBatchWithContents(theBatchName, theArrayOfAttributes);

                }       //  end of for-in loop over batches
                if (multiVariateExtras.attributeGroupingMode === multiVariateExtras.constants.kGroupAttributeByBatchMode) {
                    if (possibleNewBatch) {
                        multiVariateExtras_ui.batchRecord[possibleNewBatch] = {open: true};
                        this.mungedAttributes[possibleNewBatch] = [];   //  empty array of attributes
                        tGuts += this.makeEntireBatchWithContents(possibleNewBatch, []);
                    }
                }
            } else {
                tGuts = "No attributes to work with here";
            }
            return tGuts;   //  the entire HTML
        },

        makeEntireBatchWithContents(iBatchName, iAttributes) {
            let tGuts = "";

            //  make all of the individual attribute "stripes" and put them together here
            const oneAttributeBatchControlSet = this.makeAttrBatchCode(iAttributes, iBatchName);

            //  is this batch open or not?
            const openClause = multiVariateExtras_ui.batchRecord[iBatchName].open ? "open" : "";

            //  we need to give this batch a unique `id` in the DOM
            const theDOMid = "details-" + iBatchName;

            const batchVisibilityButtons = this.makeBatchVisibilityButtons(iBatchName);   //  the two eyeballs in the summary

            //  this is the opening of the `<details>` markup for the top of the batch.
            //  tGuts += `<details id="${theDOMid}" ${openClause} onclick="multiVariateExtras_ui.setCurrentBatchTo('${theBatchName}')">
            tGuts += `<details id="${theDOMid}" ${openClause}>
                                <summary id="batch-head-${iBatchName}" class="attribute-batch-summary">
                                    <div class="batch-summary-head">
                                        ${iBatchName}&emsp;${batchVisibilityButtons}
                                    </div>
                                </summary>
                                ${oneAttributeBatchControlSet}
                            </details>
                            `;
            return tGuts;
        },

        /**
         * Create the attribute controls (stripes) for an entire batch of attributes.
         * Called by `make()`
         * @param iBatchOfAttributes    array of attribute infos
         * @param iBatchName    the name of this batch, a string
         * @returns {string}
         */
        makeAttrBatchCode(iBatchOfAttributes, iBatchName) {
            let tGuts = "<div class='attribute-batch'>";

            iBatchOfAttributes.forEach(att => {
                const theClasses = att.hidden ? "invisible-stripe attribute-control-stripe"
                    : "visible-stripe attribute-control-stripe";
                tGuts += `<div class="${theClasses}" id="${multiVariateExtras.attributeStripeID(att.name)}">`;
                tGuts += this.makeOneAttCode(att);
                tGuts += `</div>`;
            })
            tGuts += "</div>"
            return tGuts;
        },

        /**
         * Makes the HTML code for the INSIDE (the innerHTML) of one attribute,
         * that is, the stuff inside its <div>.
         *
         * Called by   `makeAttrBatchCode()`
         *
         * @param att
         * @returns {string}
         */
        makeOneAttCode(att) {
            const batchingStrategy = multiVariateExtras_ui.getBatchingStrategy();

            let tGuts = "";
            const attrInfoButton = this.makeAttrInfo(att);
            const visibilityButtons = this.makeVisibilityButtons(att);
            //  const addSubtractBatchButton = this.makeAddSubtractBatchButton(att);
            const isHiddenNow = att.hidden;

            tGuts += "&emsp;" + visibilityButtons;
            let batchedPropertyPhrase = "";

            //  if we're batching byLevel, i.e., using hierarchy, we don't get dragability
            if (batchingStrategy === "byBatch") {
                tGuts += "&ensp;";     //  + addSubtractBatchButton;
                batchedPropertyPhrase = `id="att-named-${att.name}" class = "batched-attribute" draggable="true"`;
            }

            // todo note that this should really be title, but CODAP doesn't do that correctly
            tGuts += `&ensp; <div ${batchedPropertyPhrase} >${att.name}</div>`;     //  the actual title of the attribute, at last!
            tGuts += attrInfoButton;

            return tGuts;
        },

        /**
         * Make HTML for the visibility buttons for one attribute.
         *
         * @param iAttr
         * @returns {string}
         */
        makeVisibilityButtons(iAttr) {

            const isHidden = iAttr.hidden;
            /*
                        const visibilityIconPath = isHidden ?       //      reverse !isHidden to show destiny instead of state
                            "../common/art/blank.png" :
                            "../common/art/check-box.png";      //  "../common/art/visibility.png";
                        const invisibilityIconPath = isHidden ?     //      reverse !isHidden
                            "../common/art/blank-check-box.png" :  //  "../common/art/visibility-no.png"
                            "../common/art/blank.png";
            */
            const visibilityIconPath = isHidden
                ? "../common/art/slide-off-simplest.png"
                : "../common/art/slide-on-simplest.png";   //  only one icon in this scheme

            const theHint = isHidden ?
                `click to make ${iAttr.name} visible in the table` :     //  todo: should be title
                `click to hide ${iAttr.name} in the table`;             //  todo: should be title

            /*
                        const invisibility = `<img class="small-button-image"
                                src=${invisibilityIconPath} title="${theHint}"
                                onclick="multiVariateExtras.handlers.oneAttributeVisibilityButton('${iAttr.name}', ${isHidden})"
                                alt = "invisibility image"
                                />`;
            */
            const visibility = `<div draggable="false"><img class="slide-switch" draggable="false"
                    src=${visibilityIconPath} title="${theHint}" 
                    onclick="multiVariateExtras.handlers.oneAttributeVisibilityButton('${iAttr.name}', ${isHidden})" 
                    alt = "visibility switch"  
                    /></div>`;

            return `${visibility}`;   /*${invisibility}*/
        },

        /**
         * Make the HTML for the visibility buttons for one batch (the eyeballs in its stripe)
         * This takes the form of two `<img>` tags with ids of `hide-whatever` and `show-whatever`.
         *
         * Their `onclick` handlers get registered later, in `registerForMoreNotifications`.
         *
         * @param iBatchName
         * @returns {string}
         */
        makeBatchVisibilityButtons: function (iBatchName) {
            const theHideHint = `Hide all attributes in [${iBatchName}]`;
            const theShowHint = `Show all attributes in [${iBatchName}]`;

            const hidingImage = `<img class="small-button-image" 
                    src="../common/art/visibility-no.png" title="${theHideHint}" 
                    id="hide-${iBatchName}"
                    alt = "batch invisibility image"  
                    />`;
            const showingImage = `<img class="small-button-image" 
                    src="../common/art/visibility.png" title="${theShowHint}" 
                    id="show-${iBatchName}"
                    alt = "batch visibility image"  
                    />`;

            //  onclick="multiVariateExtras_ui.attributeControls.handleBatchVisibilityButton('${iBatchName}', true)"
            //  onclick="multiVariateExtras_ui.attributeControls.handleBatchVisibilityButton('${iBatchName}', false)"

            return showingImage + "&ensp;" + hidingImage;
        },

        /**
         * Make the html for the plus- or minus- buttons that appear with attributes.
         *
         * This routine determines whether it should be plus or minus,
         * and that depends only on whether the attribute is in a real batch (minus) or in the no-batch zone (plus).
         *
         * @param iAttr
         * @returns {string}
         */
        makeAddSubtractBatchButton(iAttr) {

            const destBatch = (iAttr.batch && (iAttr.batch !== multiVariateExtras.constants.noBatchString)) ?
                multiVariateExtras.constants.noBatchString : multiVariateExtras_ui.currentBatchName;

            // we will clear the batch if our computed "destination" is no batch.
            const useClearIcon = (destBatch === multiVariateExtras.constants.noBatchString);

            const batchIconPath = useClearIcon ?
                "../common/art/subtract.png" :
                "../common/art/add.png";

            const theHint = useClearIcon ?
                `click to remove ${iAttr.name} from batch [${iAttr.batch}]` :           //  todo: should be title
                `click to add ${iAttr.name} to batch [${multiVariateExtras_ui.currentBatchName}]`;  //  todo: should be title

            let theImage = `&nbsp;<img class="small-button-image" 
                    src=${batchIconPath} title="${theHint}" 
                    onclick="multiVariateExtras.addAttributeToBatch('${iAttr.name}', '${destBatch}')" 
                    alt = "batch toggle image"  
                    />`;

            //  but if there is nothing in the batch name box, we cannot use the "add" button

            if (!useClearIcon && !multiVariateExtras_ui.currentBatchName) {
                theImage = "";
            }
            return theImage;

        },

        makeAttrDescriptor(iAttr) {
            let str = `${iAttr.description||''} ${iAttr.unit||''}`;
            if (iAttr.batch && iAttr.batch !== multiVariateExtras.constants.noBatchString) {
                str += ` (${iAttr.batch})`;
            }
            return str;
        },

        /**
         * This text appears in a nice dialog if the user clicks the info button.
         * @param iAttr
         * @returns {string}
         */
        makeAttrInfo(iAttr) {
            function quote(str) {
              return str.replace(/\n/g, '')
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/'/g, '&apos;')
                    .replace(/"/g, '&quot;')
            }
            let out = "";

            if (iAttr.description || iAttr.unit) {
                let theHint = this.makeAttrDescriptor(iAttr);
                theHint = quote(theHint);
                const theImage = `&emsp;<img class="small-button-image" 
                    src="../common/art/info.png" width="14" title="${theHint}" 
                    alt="press for info"
                    onclick="multiVariateExtras.makeInfoAlert('${iAttr.id}')" 
                    alt = "circular information button image"  
                    />`;
                out += theImage;
            }
            return out;
        },

        registerForMoreNotifications: function () {

            if (multiVariateExtras_ui.getBatchingStrategy() === "byBatch") {

                //  register for toggle events on <detail> for batchs
                for (let batchName in this.mungedAttributes) {
                    const detailID = `details-${batchName}`
                    const theElement = document.getElementById(detailID);
                    if (theElement) {
                        theElement.addEventListener('toggle', multiVariateExtras.handlers.toggleDetail);
                    } else {
                        multiVariateExtras.log(`bogus batch in registerForMoreNotifications(): ${batchName}`)
                    }
                }

                //  register the attributes in the list to start dragging

                multiVariateExtras.datasetInfo.collections.forEach(coll => {
                    coll.attrs.forEach(att => {
                        const theAttNameID = `att-named-${att.name}`;
                        const theElement = document.getElementById(theAttNameID);
                        theElement.addEventListener('dragstart',
                            event => {
                                event.dataTransfer.setData('text/plain', `${att.name}`);
                                multiVariateExtras.log(`dragging ${att.name}`);
                            })
                    })
                })

                //  register the batch stripes for drop zones

                for (let batchName in this.mungedAttributes) {
                    const theBatchID = `batch-head-${batchName}`;
                    const theElement = document.getElementById(theBatchID);
                    theElement.addEventListener('dragover',
                        event => {
                        const theElement = document.getElementById(event.target.id);
                        theElement.style.backgroundColor = "yellow";
                            event.preventDefault();
                        })
                    theElement.addEventListener('dragleave',
                        event => {
                            const theElement = document.getElementById(event.target.id);
                            theElement.style.backgroundColor = "#abc";  //  todo: use a constant somewhere?
                            event.preventDefault();
                        })
                    theElement.addEventListener('drop',
                        event => {
                            const droppedName = event.dataTransfer.getData('text');
                            multiVariateExtras.log(`${batchName} gets ${droppedName}`);
                            multiVariateExtras.addAttributeToBatch(droppedName, batchName);
                            multiVariateExtras_ui.update();
                        })
                }
            }

            //  register for the batch visibility buttons

            for (let batchName in multiVariateExtras_ui.batchRecord) {
                const batchDOMid = `details-${batchName}`;
                const theElement = document.getElementById(batchDOMid);
                if (theElement) {
                    //  theElement.addEventListener('toggle', multiVariateExtras.handlers.toggleDetail);

                    const hideButton = document.getElementById(`hide-${batchName}`);
                    const showButton = document.getElementById(`show-${batchName}`);

                    hideButton.addEventListener('click', multiVariateExtras.handlers.batchVisibilityButton);
                    showButton.addEventListener('click', multiVariateExtras.handlers.batchVisibilityButton);
                }
            }
        },

        install: function () {
            document.getElementById(this.divID).innerHTML = this.make();
            this.registerForMoreNotifications();
        },

    },

    /**
     * Update the dataset name display in the correlation tab
     */
    updateCorrelationDatasetName: function () {
        const correlationDatasetElement = document.getElementById("correlation-dataset-name");
        if (correlationDatasetElement) {
            if (multiVariateExtras.datasetInfo && multiVariateExtras.datasetInfo.name) {
                // Use the dataset name from datasetInfo
                correlationDatasetElement.textContent = multiVariateExtras.datasetInfo.name;
            } else if (multiVariateExtras.datasetList && multiVariateExtras.datasetList.length > 0) {
                // Fallback: find the current dataset by ID and use its title
                const currentDataset = multiVariateExtras.datasetList.find(ds => ds.id === multiVariateExtras.dsID);
                if (currentDataset) {
                    correlationDatasetElement.textContent = currentDataset.title || currentDataset.name;
                } else {
                    correlationDatasetElement.textContent = "No dataset selected";
                }
            } else {
                correlationDatasetElement.textContent = "No dataset selected";
            }
        }
    },


    /*
        dataset menu section
    */

    datasetMenu: {
        divID: "chooseDatasetDIV",
        stripeID: "chooseDatasetControl",
        menuID: "dataset-menu",
        nHandles: 0,

        install: async function () {
            const menuInfo = await this.make();
            document.getElementById(this.stripeID).innerHTML = menuInfo.guts;
            return menuInfo.chosen;
        },

        handle: async function () {
            this.nHandles++;
            const tElement = document.getElementById(this.menuID);
            if (tElement) {
                const theChosenID = tElement.value;
                await multiVariateExtras.setTargetDatasetByID(theChosenID);   //  will set the new ID if necessary
                multiVariateExtras_ui.update();
                multiVariateExtras.log(`handling dataset change to ${theChosenID} number ${this.nHandles}`);
            } else {
                multiVariateExtras.log(`NB: no dataset menu`);
            }
        },

        make: async function () {
            const theList = multiVariateExtras.datasetList;
            let tGuts = "";
            let chosen = null;

            if (multiVariateExtras.datasetList.length === 0) {
                tGuts = `<h3 class="stripe-hed">No datasets</h3>`;

            } else if (theList.length === 1) {
                const theDataSet = theList[0];    //  the only one
                chosen = theDataSet.id;
                await multiVariateExtras.setTargetDatasetByID(theDataSet.id);       //  if therre is only one DS, set the dsID!
                tGuts = `<h3 class="stripe-hed">Dataset: <strong>${theDataSet.title}</strong></h3>`;
                
                // Update correlation tab dataset name when single dataset is auto-selected
                multiVariateExtras_ui.updateCorrelationDatasetName();

            } else {
                //      in this case (2 or more datasets) we have to make a menu

                //  which item will be selected when we're done?
                //  the one that was chosen before, OR the first one in the list if that's gone.
                chosen = theList[0].id;
                theList.forEach(ds => {
                    if (multiVariateExtras.dsID === ds.id) {
                        chosen = ds.id;
                    }
                })

                tGuts = `<label for="dataset-menu">choose a dataset&ensp;</label>`;
                tGuts += `<select id="dataset-menu" onchange="multiVariateExtras_ui.datasetMenu.handle()">`;
                theList.forEach(ds => {
                    const selectedGuts = (chosen === ds.id) ? "selected" : "";
                    multiVariateExtras.log(`making menu:  ds ${ds.id} named [${ds.name}] title [${ds.title}]`);
                    tGuts += `<option value=${ds.id} ${selectedGuts}>${ds.title} </option>`;
                })
                tGuts += `</select>`;
            }

            multiVariateExtras.log(`µ   made dataset menu with ${theList.length} dataset(s)`);
            return {guts: tGuts, chosen: chosen};
        },
    },
}
