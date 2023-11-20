

/**
 * Merges two JSON-LD objects representing accessibility evaluation reports.
 * @function mergeJsonLds
 * @param {Object} jsonLd1 - The first JSON-LD object to merge.
 * @param {Object} jsonLd2 - The second JSON-LD object to merge.
 * @returns {void}
 * @throws {Error} If there was an error merging the reports.
 */
function mergeJsonLds(jsonLd1, jsonLd2){

    try{

        jsonLd1.assertors.push(...jsonLd2.assertors);
        jsonLd1.creator["xmlns:name"] += " & " + jsonLd2.creator["xmlns:name"];

        for (let i = 0; i < jsonLd1.auditSample.length; i++) {

            const newOutcome = jsonLd2.auditSample[i].result.outcome;

            if(newOutcome === "earl:untested") continue; 
            
            const currentOutcome = jsonLd1.auditSample[i].result.outcome;

            if(currentOutcome === "earl:untested"){

                jsonLd1.auditSample[i] = jsonLd2.auditSample[i];

            } else {

                if((currentOutcome === "earl:inapplicable" && newOutcome !== "earl:inapplicable") 
                || (currentOutcome === "earl:passed" && (newOutcome === "earl:cantTell" || newOutcome === "earl:failed"))
                || (currentOutcome === "earl:cantTell" && newOutcome === "earl:failed")){

                    jsonLd1.auditSample[i].result = jsonLd2.auditSample[i].result;
        
                }

                mergeFoundCases(jsonLd1.auditSample[i].hasPart, jsonLd2.auditSample[i].hasPart);

            }
        }

    } catch(error) {
        throw new Error("Error merging JsonLd reports => " + error.message);
    }
	
}




/**
 * Merges the "hasPart" array of two EARL reports, updating the first report with any new or modified assertions from the second report.
 * @function mergeFoundCases
 * @param {Array} currentHasPart - The "hasPart" array of the first EARL report.
 * @param {Array} newHasPart - The "hasPart" array of the second EARL report.
 * @returns {undefined}
 */
function mergeFoundCases(currentHasPart, newHasPart){

    for(const newFoundCase of newHasPart){

        const currentFoundCase = currentHasPart.find(currentCase => currentCase.subject === newFoundCase.subject && currentCase.result.outcome === newFoundCase.result.outcome);
        
        if(currentFoundCase){

            for(const newAssertor of newFoundCase.assertedBy){
                currentFoundCase.assertedBy.push(newAssertor);
            }
            
            currentFoundCase.result.description += "\n\n" + newFoundCase.result.description;
            
            const newPointers = newFoundCase.result.locationPointersGroup

            for(const newPointer of newPointers){

                const currentPointer = currentFoundCase.result.locationPointersGroup.find(pointer => pointer.description === newPointer.description);

                if(currentPointer){
                    for(const newAssertor of newPointer.assertedBy){
                        currentPointer.assertedBy.push(newAssertor);
                    }
                }else{
                    currentFoundCase.result.locationPointersGroup.push(newPointer);
                }
                
            }

        }else{
            currentHasPart.push(newFoundCase);
        }
    }
}

module.exports = mergeJsonLds;