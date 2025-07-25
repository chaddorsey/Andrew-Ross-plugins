/*
==========================================================================

 * Created by tim on 9/29/20.
 
 
 ==========================================================================
connect in multiVariateExtras

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

/* global codapInterface, Swal  */

const connect = {

    initialize: async function () {
        await codapInterface.init(this.iFrameDescriptor, null);
    },


    /**
     * used by multiVariateExtras-ui.js to get a list of datasets, so it can make a menu.
     *
     * @returns {Promise<*>}
     */
    getListOfDatasets: async function () {
        const tMessage = {
            "action": "get",
            "resource": "dataContextList"
        }
        const dataContextListResult = await codapInterface.sendRequest(tMessage);
        return dataContextListResult.values;
    },


    /**
     * Get "dataset info" for the dataset from CODAP
     * This includes all attribute names in all collections, as returned by `get...dataContext`.
     *
     * @param iDsID         dataset id
     * @returns {Promise<null|*>}
     */
    refreshDatasetInfoFor: async function (iDsID) {
        let theName = multiVariateExtras.getNameOfCurrentDataset();

        if (iDsID) {
            if (theName) {
                const tMessage = {
                    "action": "get",
                    "resource": `dataContext[${theName}]`
                }
                const dsInfoResult = await codapInterface.sendRequest(tMessage);
                if (dsInfoResult.success) {
                    // await multiVariateExtras.processDatasetInfoForAttributeBatchs(dsInfoResult.values);
                    return dsInfoResult.values;
                } else {
                    Swal.fire({
                        icon: "error",
                        title: "Drat!",
                        text: `Problem getting information for dataset [${theName}]`
                    });
                    return null;
                }
            } else {
                Swal.fire({icon: "error", title: "Drat!", text: `Dataset #[${iDsID}] -- couldn't find its name`});
                return null;
            }
        } else {
            return {};
        }
    },

    getItemCountFrom: async function (iName) {
        const tMessage = {
            action: "get",
            resource: `dataContext[${iName}].itemCount`,
        };

        const tItemCountResult = await codapInterface.sendRequest(tMessage);

        return (tItemCountResult.success) ? tItemCountResult.values : null;
    },

    getLastCollectionCaseCount: async function (iDataset, iCollection) {
        const tMessage = {
            action: "get",
            resource: `dataContext[${iDataset}].collection[${iCollection}].caseCount`,
        };

        const tItemCountResult = await codapInterface.sendRequest(tMessage);

        return (tItemCountResult.success) ? tItemCountResult.values : 0;
    },


    /**
     * Get all of the cases from the named dataset.
     *
     * Note: we get them from the "last" collection in the current hierarchy.
     * We do this partly because we need CASE IDs to cope with selection
     * (because selection does not work with items ...)
     *
     * @param iDatasetName
     * @returns {Promise<{}>}   Object keyed by the (unique) caseIDs
     */
    getAllCasesFrom: async function (iDatasetName) {

        //  figure out the name of the last collection.
        let collectionName = multiVariateExtras.getLastCollectionName();

        const tMessage = {
            action: "get",
            resource: `dataContext[${iDatasetName}].collection[${collectionName}].allCases`,
        };
        const tAllCasesResult = await codapInterface.sendRequest(tMessage);

        let outCases = {};      //  we will return an object

        tAllCasesResult.values.cases.forEach(
            aCase => {
                const theValues = aCase.case.values;
                const theID = aCase.case.id;
                const theCaseIndex = aCase.caseIndex;
                outCases[aCase.case.id] = {
                    id: theID,
                    caseIndex: theCaseIndex,
                    values: theValues,
                }
            }
        );
        return outCases;
    },

    /**
     * Produces an object that's going to be appended to the
     * dataset info.
     * {
     *     indexCollection : <index (ZIP) collection name>,
     *     filterCollection : <filter collection name>,
     *     tagsCollection : <tags collection name>,
     * }
     * @param theInfo
     */
    /*
    processDatasetInfoForAttributeLocations: function (theInfo) {
        let out = {
            "indexCollection": null,
            "filterCollection": null,
            "tagsCollection": null,
        };

        theInfo.collections.forEach(coll => {
            coll.attrs.forEach(att => {
                switch (att.name) {
                    case multiVariateExtras.constants.indexAttributeName:
                        out.indexCollection = coll.name;
                        break;
                    case multiVariateExtras.constants.filterAttributeName:
                        out.filterCollection = coll.name;
                        break;
                    case multiVariateExtras.constants.tagsAttributeName:
                        out.tagsCollection = coll.name;
                        multiVariateExtras.log(`¬   Found [${multiVariateExtras.constants.tagsAttributeName}] in [${coll.name}]`);
                        break;
                }
            })
        });

        return out;
    },
*/
    /**
     * Assign the given attribute (by name) to the batch (also by name).
     * This actually updates the dataset, altering the description (!), so that the next time we process it,
     * multiVariateExtras will read the batch assignment properly.
     *
     * @param iDSName   the string name of the dataset
     * @param iAttName  the string name of the attribute
     * @param iBatch    the string name of the batch
     * @returns {Promise<void>}
     */
    setAttributeBatch: async function (iDSName, iAttName, iBatch) {
        const theCollection = this.utilities.collectionNameFromAttributeName(iAttName, multiVariateExtras.datasetInfo);
        let theDescription = this.utilities.descriptionFromAttributeName(iAttName, multiVariateExtras.datasetInfo);

        theDescription = "{" + iBatch + "}" + (theDescription || '');

        if (theCollection) {
            const theResource = `dataContext[${iDSName}].collection[${theCollection}].attribute[${iAttName}]`;

            const tMessage = {
                "action": "update",
                "resource": theResource,
                "values": {
                    "description": theDescription,
                }
            }
            const addBatchResult = await codapInterface.sendRequest(tMessage);
            multiVariateExtras.log(`    ∂    ${addBatchResult.success ? "success" : "failure"} adding ${iAttName} to batch ${iBatch}`);
        } else {
            Swal.fire({icon: "error", title: "Drat!", text: `Could not find a collection for attribute [${iAttName}]`});
        }

    },

    /**
     * Ask CODAP to show or hide the specified attribute in the table.
     *
     * Called by `multiVariateExtras.handlers.oneAttributeVisibilityButton()`
     *
     * @param iDSName
     * @param iAttrName
     * @param toHide
     * @returns {Promise<null|[]>}
     */
    showHideAttribute: async function (iDSName, iAttrName, toHide) {
        const theCollection = await this.utilities.collectionNameFromAttributeName(iAttrName, multiVariateExtras.datasetInfo);

        if (theCollection) {
            const theResource = `dataContext[${iDSName}].collection[${theCollection}].attribute[${iAttrName}]`;

            const tMessage = {
                "action": "update",
                "resource": theResource,
                "values": {
                    "hidden": toHide
                }
            }
            const hideResult = await codapInterface.sendRequest(tMessage);
            multiVariateExtras.log(`    ∂    ${hideResult.success ? "success" : "failure"} changing ${iAttrName} to ${toHide ? "hidden" : "visible"}`);
            let goodAttributes = [];

            if (hideResult.success) {
                hideResult.values.attrs.forEach(att => {
                    const cat = multiVariateExtras.getMultiVariateExtrasAttributeAndCollectionByAttributeName(att.name).att;
                    goodAttributes.push(cat);
                })
            }

            //  return   goodAttributes;   //  the ARRAY of affected attributes, in this case, the one named `iAttrName`.
        } else {
            Swal.fire({
                icon: "error",
                title: "Drat!",
                text: `Could not find a collection for attribute [${iAttrName}]`
            });
            //  return null;
        }
    },

    /**
     * Ask CODAP to show or hide the attributes named in the argument Array, en masse.
     *
     * called in `multiVariateExtras.handlers.batchVisibilityButton()`
     *
     * Note: Tim thinks the use of `goodAttributes` is no longer necessary.
     *
     * @param iDSName   String name of the dataset
     * @param iList     Array of attribute _names_.
     * @param toHide    Should we hide all of these? (Otherwise, make all visible)
     * @returns {Promise<[]>}
     */
    showHideAttributeList: async function (iDSName, iList, toHide) {
        let messageList = [];
        let problemAttributes = [];
        let goodAttributes = [];

        for (let i = 0; i < iList.length; i++) {
            const attName = iList[i];
            const theCollection = await this.utilities.collectionNameFromAttributeName(attName, multiVariateExtras.datasetInfo);
            if (theCollection) {
                const theResource = `dataContext[${iDSName}].collection[${theCollection}].attribute[${attName}]`;

                const tMessage = {
                    "action": "update",
                    "resource": theResource,
                    "values": {
                        "hidden": toHide
                    }
                }
                messageList.push(tMessage);
            } else {
                problemAttributes.push(attName);
            }
        }
        const hideResult = await codapInterface.sendRequest(messageList);
        //  goodAttributes = hideResult.values.attrs;

        let nSuccess = 0, nFailure = 0;
        hideResult.forEach(res => {
            if (res.success) {
                nSuccess++;
                goodAttributes = goodAttributes.concat(res.values.attrs);
            } else {
                nFailure++;
            }
        })
        multiVariateExtras.log(`    ∂    ${nSuccess} successes and ${nFailure} failures changing ${messageList.length} attributes to ${toHide ? "hidden" : "visible"}`);

        if (problemAttributes.length > 0) {
            Swal.fire({
                icon: "warning",
                title: "look out!",
                text: `Couldn't find a collection for these attributes: ${problemAttributes.join(', ')}`,
            })
        }

        /*
        //  this was here from when we were updating the attributes separately in the DOM.

                let outAttributes = [];
                goodAttributes.forEach( att => {
                    const cat = multiVariateExtras.getMultiVariateExtrasAttributeAndCollectionByAttributeName(att.name).att;
                    outAttributes.push(cat);
                })
                return outAttributes;
        */
    },

    /**
     * Selection methods: interacting with CODAP selection, applying tags, etc.
     */
    tagging: {

        /**
         * Actually creates the attribute if it does not exist.
         * @returns {Promise<string>} the name of the "Tags" collection
         */
        ensureTagsAttributeExists: async function () {

            let tagAttributeName = multiVariateExtras.getTagAttributeName();

            await connect.refreshDatasetInfoFor(multiVariateExtras.dsID);
            let theTagsCollectionName = connect.utilities.collectionNameFromAttributeName(
                tagAttributeName,
                multiVariateExtras.datasetInfo
            );

            if (multiVariateExtras.dsID) {
                if (!theTagsCollectionName) {       //  we don't have this attribute yet
                    //  for new tags attributes, we'll make it at the bottom level.
                    const bottomLevel = multiVariateExtras.datasetInfo.collections.length - 1;
                    const theFirstCollection = multiVariateExtras.datasetInfo.collections[bottomLevel];
                    theTagsCollectionName = theFirstCollection.name;
                    const tResource = `dataContext[${multiVariateExtras.datasetInfo.name}].collection[${theTagsCollectionName}].attribute`;
                    const tValues = {
                        "name": tagAttributeName,
                        "type": "nominal",
                        "title": tagAttributeName,
                        "description": "user-made tags for sets of cases",
                        "editable": true,
                        //  "hidden" : "true",
                    }

                    const tMessage = {
                        "action": "create", "resource": tResource, "values": [tValues],
                    }

                    const makeTagsAttResult = await codapInterface.sendRequest(tMessage);

                    if (makeTagsAttResult.success) {
                        multiVariateExtras.log(`µ   Yay! Made "${tagAttributeName}" in collection "${theTagsCollectionName}"!`);
                        Swal.fire({
                            icon: "success",
                            title: "Yay!",
                            text: `The new "${tagAttributeName}" attribute 
                            is in collection "${theTagsCollectionName}"!`,
                        });
                    } else {
                        Swal.fire({
                            icon: "error",
                            title: "Dagnabbit!",
                            text: `Trouble making the "${tagAttributeName}" attribute in ${iDSname}|${theTagsCollectionName}:`
                                + ` ${makeTagsAttResult.values.error}.`,
                        });
                    }
                } else {
                    multiVariateExtras.log(`Hmm. The tags attribute already existed in ${theTagsCollectionName}.`);
                }
            } else {
                Swal.fire({
                    icon: "error",
                    title: "Dagnabbit!",
                    text: `We apparently don't have a dataset defined: ${makeTagsAttResult.values.error}.`,
                })
            }

            return theTagsCollectionName;

        },

        /**
         * Get the list of selected cases from CODAP, then
         * process the array of cases to get just the CaseIDs
         *
         * @returns {Promise<[]>}
         */
        getCODAPSelectedCaseIDs: async function () {
            const selectionListResource = `dataContext[${multiVariateExtras.datasetInfo.name}].selectionList`;
            //  now get all the currently selected caseIDs.
            const gMessage = {
                "action": "get", "resource": selectionListResource
            }
            const getSelectionResult = await codapInterface.sendRequest(gMessage);

            //  the result has the ID but also the collection ID and name,
            //  so we collect just the caseID in `oldIDs`
            let oldIDs = [];
            if (getSelectionResult.success) {

                //  construct an array of the currently-selected cases.
                //  NOTE that `val`
                getSelectionResult.values.forEach(val => {
                    oldIDs.push(val.caseID)
                })
            }
            return oldIDs;
        },

        /**
         * Given an Array of CODAP case IDs, ask CODAP to select them.
         *
         * @param iList
         * @returns {Promise<void>}
         */
        setCODAPSelectionToCaseIDs: async function (iList) {
            const selectionListResource = `dataContext[${multiVariateExtras.datasetInfo.name}].selectionList`;
            const tMessage = {
                "action": "create",
                "resource": selectionListResource,
                "values": iList,
            }

            const makeSelectionResult = await codapInterface.sendRequest(tMessage);
            if (!makeSelectionResult.success) {
                Swal.fire({
                    icon: 'error',
                    title: "Curses!",
                    text: `Trouble making the new selection`,
                });
            }
        },

        /**
         * Set up a "simple" tag for CODAP. This is like the others but is, ironically, less simple.
         *
         * Ultimately applies the name of the tag in the box
         * (or the empty string if `iMode` is "clear")
         * to the selection.
         *
         * @param iMode
         * @returns {Promise<void>}
         */
        doSimpleTag: async function (iMode = "clear") {

            const tagLabel = (iMode === "add") ?
                document.getElementById(multiVariateExtras.constants.tagValueElementID).value :
                "";
            const tTagAttributeName = multiVariateExtras.getTagAttributeName();     //      probably "Tags"
            const selectedCases = await connect.tagging.getCODAPSelectedCaseIDs();

            let valuesArray = [];

            //  construct the array of value objects, one for each selected case.

            selectedCases.forEach(caseID => {
                let valuesObject = {};
                valuesObject[tTagAttributeName] = tagLabel;
                const oneCase = {
                    "id": caseID,
                    "values": valuesObject,
                }
                valuesArray.push(oneCase);
            });

            await connect.updateTagValues(tTagAttributeName, valuesArray);
        },

        /**
         * Retrieve the specifications for a binary tag and apply them.
         *
         * That is, find the names to be given to the selected and unselected cases,
         * then construct an array of "values" that will go to CODAP as part of an `updateCases` call.
         *
         * This happens in `connect.updateTagValues`.
         *
         * @returns {Promise<void>}
         */
        doBinaryTag: async function () {
            const yesTag = document.getElementById(multiVariateExtras.constants.tagValueSelectedElementID).value;
            const noTag = document.getElementById(multiVariateExtras.constants.tagValueNotSelectedElementID).value;

            const tTagAttributeName = multiVariateExtras.getTagAttributeName();     //      probably "Tags"
            const selectedCases = await connect.tagging.getCODAPSelectedCaseIDs();


            //  construct the array of value objects, one for each case.

            const allData = await connect.getAllCasesFrom(multiVariateExtras.datasetInfo.name);
            let valuesArray = [];

            Object.keys(allData).forEach(caseID => {
                let valuesObject = {};
                const isSelected = selectedCases.includes(Number(caseID));
                valuesObject[tTagAttributeName] = isSelected ? yesTag : noTag;
                const oneCase = {
                    "id": caseID,
                    "values": valuesObject,
                }
                valuesArray.push(oneCase);
            });

            await connect.updateTagValues(tTagAttributeName, valuesArray);

        },

        /**
         *  Retrieve the specifications for random tagging and apply them.
         *
         * That is, find the names to be given to the chosen and unchosen cases,
         * and the percentage of cases to be chosen.
         * Then construct an array of "values" that will go to CODAP as part of an `updateCases` call.
         *
         * This happens in `connect.updateTagValues`.

         * @returns {Promise<void>}
         */
        doRandomTag: async function () {
            const aTag = document.getElementById(multiVariateExtras.constants.tagValueGroupAElementID).value;
            const bTag = document.getElementById(multiVariateExtras.constants.tagValueGroupBElementID).value;
            const theParsedResult = multiVariateExtras.utilities.stringFractionDecimalOrPercentToNumber(
                document.getElementById(multiVariateExtras.constants.tagPercentageElementID).value
            );
            const theProportion = theParsedResult.theNumber;
            document.getElementById(multiVariateExtras.constants.tagPercentageElementID).value = theParsedResult.theString;

            //  const theProportion = Number(document.getElementById(multiVariateExtras.constants.tagPercentageElementID).value) / 100.0;

            const tTagAttributeName = multiVariateExtras.getTagAttributeName();     //      probably "Tag"

            //  construct the array of value objects, one for each case.

            const allData = await connect.getAllCasesFrom(multiVariateExtras.datasetInfo.name);
            let valuesArray = [];

            Object.keys(allData).forEach(caseID => {
                let valuesObject = {};
                const inGroupA = Math.random() < theProportion;
                valuesObject[tTagAttributeName] = inGroupA ? aTag : bTag;
                const oneCase = {
                    "id": caseID,
                    "values": valuesObject,
                }
                valuesArray.push(oneCase);
            });

            await connect.updateTagValues(tTagAttributeName, valuesArray);

        },

        /**
         * Set up a request to CODAP to blank all the values in the Tags attribute.
         * Does not remove the attribute.
         *
         * @param iTag
         * @returns {Promise<void>}
         */
        clearAllTagsFrom: async function (iTag) {
            let valuesArray = [];

            const allData = await connect.getAllCasesFrom(multiVariateExtras.datasetInfo.name);

            Object.keys(allData).forEach(caseID => {
                let valuesObject = {};
                valuesObject[iTag] = "";
                const oneCase = {
                    "id": caseID,
                    "values": valuesObject,
                }
                valuesArray.push(oneCase);
            });

            await connect.updateTagValues(iTag, valuesArray);

        },

    },

    /**
     * Update the cases in the dataset, changing the values of their Tags attribute
     * according to the values in the `iValues` parameter.
     *
     * Called by a method in `connect.tagging`
     *
     * @param iTagAttName   name of the Tags attribute, apparently not used?
     * @param iValues       Array similar to [{id : 42, values : {Tags : "foo"}}, {etc}, ...]
     * @returns {Promise<void>}
     */
    updateTagValues: async function (iTagAttName, iValues) {
        const tagCollection = await connect.tagging.ensureTagsAttributeExists();

        const theResource = `dataContext[${multiVariateExtras.datasetInfo.name}].collection[${tagCollection}].case`;
        const theRequest = {
            "action": "update",
            "resource": theResource,
            "values": iValues,
        }

        const tagCasesResult = await codapInterface.sendRequest(theRequest);
        if (tagCasesResult.success) {
            multiVariateExtras.log(`Applied tags to ${tagCasesResult.caseIDs.length} case(s)`);
        } else {
            Swal.fire({
                icon: 'error',
                title: tagCasesResult[0].values.error,
                text: `In connect.tagSelectedCases(), we failed to update the cases with the new tag.`,
            });
        }

    },

    /**
     * Creates a simple scatter-plot graph component in CODAP
     * @param {string} dataContext - The name of the dataset
     * @param {string} xAxis - The name of the x-axis attribute
     * @param {string} yAxis - The name of the y-axis attribute
     * @param {string} legendAttr - Optional name of the legend attribute
     * @returns {Promise} - Promise that resolves with the result of the graph creation
     */
    createGraph: async function (dataContext, xAxis, yAxis, legendAttr = null) {
        const graphObject = {
            type: "graph",
            dataContext: dataContext,
            xAttributeName: xAxis,
            yAttributeName: yAxis,
        };

        // Add legend attribute if specified
        if (legendAttr) {
            graphObject.legendAttributeName = legendAttr;
        }

        const theMessage = {
            action: "create",
            resource: "component",
            values: graphObject,
        };

        try {
            // Validate that the dataset exists before creating the graph
            const datasetCheck = await codapInterface.sendRequest({
                action: "get",
                resource: `dataContext[${dataContext}]`
            });

            if (!datasetCheck.success) {
                throw new Error(`Dataset '${dataContext}' not found. Cannot create graph.`);
            }

            // Validate that the attributes exist in the dataset
            const datasetInfo = datasetCheck.values;
            const allAttributes = [];
            datasetInfo.collections.forEach(collection => {
                collection.attrs.forEach(attr => {
                    allAttributes.push(attr.name);
                });
            });

            const missingAttributes = [];
            if (!allAttributes.includes(xAxis)) missingAttributes.push(xAxis);
            if (!allAttributes.includes(yAxis)) missingAttributes.push(yAxis);
            if (legendAttr && !allAttributes.includes(legendAttr)) missingAttributes.push(legendAttr);

            if (missingAttributes.length > 0) {
                throw new Error(`Attributes not found in dataset: ${missingAttributes.join(', ')}`);
            }

            const result = await codapInterface.sendRequest(theMessage);
            
            // Add error handling for reference resolution issues
            if (result.success && result.values && result.values.id) {
                console.log(`Graph component created successfully: ${result.values.id}`);
            } else if (result.values && result.values.error) {
                // Check for MobX reference resolution errors
                if (result.values.error.includes("Failed to resolve reference") || 
                    result.values.error.includes("mobx-state-tree")) {
                    console.warn("MobX state tree reference resolution error detected. Attempting to validate references...");
                    
                    // Try to validate and clean up references
                    if (typeof multiVariateExtras !== 'undefined' && multiVariateExtras.validateReferences) {
                        await multiVariateExtras.validateReferences();
                    }
                    
                    // Use the dedicated error handler
                    if (typeof multiVariateExtras !== 'undefined' && multiVariateExtras.handleReferenceResolutionError) {
                        await multiVariateExtras.handleReferenceResolutionError(new Error(result.values.error));
                    }
                    
                    throw new Error(`Reference resolution error: ${result.values.error}. Please try again after the system stabilizes.`);
                }
                
                throw new Error(`Failed to create graph: ${result.values.error}`);
            }
            
            return result;
        } catch (error) {
            console.error(`Error creating graph: ${error.message}`);
            
            // Log additional debugging information
            if (error.message.includes("reference") || error.message.includes("MobX")) {
                console.warn("Reference-related error detected. This may be due to stale shared model references.");
                console.warn("Consider refreshing the CODAP document or restarting the plugin.");
            }
            
            throw error;
        }
    },

    utilities: {

        batchNameFromAttributeName: function (iName, info) {
            let out = "";
            info.collections.forEach(coll => {
                coll.attrs.forEach(att => {
                    if (att.name === iName) {
                        out = att.batch;
                    }
                })
            })
            return out;

        },

        collectionNameFromAttributeName: function (iName, info) {
            let out = "";

            info.collections.forEach(coll => {
                coll.attrs.forEach(att => {
                    if (att.name === iName) {
                        out = coll.name;
                    }
                })
            })
            return out;
        },

        descriptionFromAttributeName: function (iName, info) {
            let out = "";

            info.collections.forEach(coll => {
                coll.attrs.forEach(att => {
                    if (att.name === iName) {
                        out = att.description;
                    }
                })
            })
            return out;
        }

    },


    iFrameDescriptor: {
        version: multiVariateExtras.constants.version,
        name: 'multiVariateExtras',
        title: 'multiVariateExtras',
        dimensions: {
            width: 333, height: 444,
        },
    },

    myCODAPId: null,
    selectSelf: function () {
        function selectSelf(id) {
            return codapInterface.sendRequest({
                action: 'notify',
                resource: `component[${id}]`,
                values: {
                    request: 'select'
                }
            });
        }
        if (this.myCODAPId == null) {
            codapInterface.sendRequest({action: 'get', resource: 'interactiveFrame'}).then(function (resp) {
                if (resp.success) {
                    this.myCODAPId = resp.values.id;
                    selectSelf(this.myCODAPId);
                }
            }.bind(this));
        } else {
            selectSelf(this.myCODAPId);
        }
    },
}
