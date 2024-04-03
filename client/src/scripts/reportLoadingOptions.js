
import { mapReportData } from './mapReportData.js';
import { storeOnChromeStorage, getFromChromeStorage, removeFromChromeStorage } from './utils/chromeUtils.js';
import { applyBlackList } from "./utils/moreUtils.js";


/**
 * Loads a new report.
 * @param {Object} newReport - The new report to be loaded.
 * @throws {Error} Throws an error if there is an issue with storing or mapping the report.
 */
export function loadReport(newReport){

    try{
        storeOnChromeStorage(window.location.hostname, newReport);
        mapReportData(newReport);
    } catch(error) {
        throw new Error("Error when storing or mapping the report => " + error);
    }
}

/**
 * Removes the loaded report.
 */
export function removeLoadedReport(){
    
    if (!window.confirm("Unsaved reports will be lost. Continue?")) return;

    removeFromChromeStorage(window.location.hostname + ".parentId");
    removeFromChromeStorage(window.location.hostname + ".reportIsLoaded");

    const currentWebsite = window.location.hostname;

    [currentWebsite, currentWebsite + ".siteSummary", currentWebsite + ".pageSummaries", currentWebsite + ".reportTableContent"].map((key) => removeFromChromeStorage(key));

    window.location.reload();
}

/**
 * Uploads a new report.
 * @param {Event} uploadEvent - The upload event containing the new report.
 */
export async function uploadNewReport(uploadEvent){

    const getReportLoaded = await getFromChromeStorage(window.location.hostname + ".reportIsLoaded", false);
    const reportLoaded = JSON.parse(getReportLoaded);

    if(reportLoaded === "true") {
        if (!window.confirm("The upload will overwrite the current stored report. You want to continue?")) return;
    }

    const reader = new FileReader();

    reader.readAsText(uploadEvent.target.files[0], "UTF-8");
    
    reader.onload = async (uploadEvent) => {
        const newReport = JSON.parse(uploadEvent.target.result);

        const getCurrentReport = await getFromChromeStorage(window.location.hostname, false);
        const currentReport = JSON.parse(getCurrentReport);

        includeEditedFoundCases(newReport, currentReport);

        loadReport(newReport);
    }

}


/**
 * Downloads the loaded report.
 */
export async function downloadLoadedReport(){

    const getCurrentReport = await getFromChromeStorage(window.location.hostname, false);
    const currentReport = JSON.parse(getCurrentReport);
    const activeConformanceLevels = JSON.parse(localStorage.getItem("conformanceLevels"));

    currentReport.evaluationScope.conformanceTarget = "wai:WCAG2" + activeConformanceLevels[activeConformanceLevels.length - 1] + "-Conformance";

    const untestedOutcome = {
        outcome: "earl:untested",
        description: "",
    };

    currentReport.auditSample.forEach((criteria) => {

        const conformanceLevel = criteria.conformanceLevel;

        if(!activeConformanceLevels.includes(conformanceLevel)){

            criteria.result = untestedOutcome;
            criteria.hasPart = [];
            delete criteria.assertedBy;
            delete criteria.mode;

        }else if(criteria.result.outcome === "earl:untested"){

            criteria.result.description += "\n\n----------------------------------\n\n";
            criteria.hasPart.forEach((elem) => {
                elem.result.description += "\n\n----------------------------------\n\n";
            });
        
        }
    });

    const enableBlacklist = await getFromChromeStorage('enableBlacklist');
        
    if(enableBlacklist){
        await applyBlackList(currentReport);
    }

    const fileName = currentReport.title + ".json";
    const fileType = "text/json";
    const blob = new Blob([JSON.stringify(currentReport)], { type: fileType })

    const a = document.createElement('a');
    a.download = fileName;
    a.href = window.URL.createObjectURL(blob)
    a.dispatchEvent(new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true,
    }))
    a.remove()

    if (window.confirm("Do you want to upload the report on W3C?")){
        window.open("https://www.w3.org/WAI/eval/report-tool/", '_blank');
    } 
}

/**
 * Evaluates the scope.
 * @param {function} setAnimateBtn - The function to set the animate button state.
 */
export async function evaluateScope(setAnimateBtn){

    const scope = JSON.parse(localStorage.getItem("scope"));

    const checkboxes = JSON.parse(localStorage.getItem("checkboxes"));
    const [am, ac, mv, a11y, pa, lh, wv, tv] = checkboxes.map(({ checked }) => checked);

    if([am, ac, mv, a11y, pa, lh, wv, tv].every(val => val === false)) {
        alert("You need to choose at least one analizer");
        return;
    }

    setAnimateBtn("evaluate");

    const bodyData = JSON.stringify({ am, ac, mv, a11y, pa, lh, wv, tv, scope });

    fetchServer(bodyData, "scrapeAccessibilityResults")
    .then( async (result) => {
        const reportLoaded = await getFromChromeStorage(window.location.hostname + ".reportIsLoaded", false);
        if(reportLoaded === "true"){
            const currentReport = await getFromChromeStorage(window.location.hostname, false);
            includeEditedFoundCases(result, currentReport);
        }
        loadReport(result);
    })
    .catch((err) => {
        console.error("Error during evaluation process => ", err);
        alert("An error occurred during evaluation. Please try again.");
    })
    .finally(() => setAnimateBtn("none"));

}

/**
 * Tests the evaluators.
 */
export async function testEvaluators(){

    const checkboxes = JSON.parse(localStorage.getItem("checkboxes"));
    const [am, ac, mv, a11y, pa, lh, wv, tv] = checkboxes.map(({ checked }) => checked);
    const body = JSON.stringify({ am, ac, mv, a11y, pa, lh, wv, tv });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 600000);

    const response = await fetch('http://localhost:7070/testEvaluators', {
        body,
        method: "POST",
        headers: {"Content-Type": "application/json"},
        signal: controller.signal
    });
    
    clearTimeout(timer);

    if (!response.ok) throw new Error("HTTP error! Status: " + response.status);
    
    const fetchData = await response.json();

    console.log(JSON.parse(fetchData));

}

/**
 * Fetches data from the server.
 * @param {string} bodyData - The body data to be sent in the request.
 * @param {string} action - The action to be performed on the server.
 * @param {number} [timeout=180000] - The timeout value for the request in milliseconds.
 * @returns {Promise<Object>} A promise that resolves to the fetched data.
 */
function fetchServer(bodyData, action, timeout = 180000) {

    return new Promise(async (resolve, reject) => {
        try{
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeout);

            const response = await fetch('http://localhost:7070/' + action, {
                body: bodyData,
                method: "POST",
                headers: {"Content-Type": "application/json"},
                signal: controller.signal
            });
            
            clearTimeout(timer);

            if (!response.ok) throw new Error("HTTP error! Status: " + response.status);
            
            const fetchData = await response.json();

            resolve(JSON.parse(fetchData));
        }catch(err){
            reject(err);
        }
        
    });

}

/**
 * Includes edited found cases from the current report into the new report.
 * @param {Object} newReport - The new report to include the edited found cases.
 * @param {Object} currentReport - The current report containing the edited found cases.
 */
export function includeEditedFoundCases(newReport, currentReport){

    for(let index = 0; index < currentReport.auditSample.length; index++){

        const currentCriteriaResult = currentReport.auditSample[index];

        for(let j = 0; j < currentCriteriaResult.hasPart.length; j++){

            const currentFoundCase = currentCriteriaResult.hasPart[j];

            const editedAssertors = currentFoundCase.assertedBy.filter(
                (assertor) => assertor.modifiedBy.length > 0
            );

            if(editedAssertors.length > 0){
                
                const newFoundCase = newReport.auditSample[index].hasPart.find((elem) => 
                    elem.subject === currentFoundCase.subject && elem.result.outcome === currentFoundCase.result.outcome
                );

                const foundCaseTemplate = {
                    "type": "Assertion",
                    "testcase": currentFoundCase.testcase,
                    "assertedBy": [],
                    "subject": currentFoundCase.subject,
                    "mode": "earl:automatic",
                    "result":
                    {
                        "outcome": currentFoundCase.result.outcome,
                        "description": currentFoundCase.result.description,
                        "locationPointersGroup": []
                    }
                };



                const currentPointers = currentFoundCase.result.locationPointersGroup;

                // Include assertor
                for(const assertor of editedAssertors){
                    if(newReport.assertors.findIndex(elem => elem["xmlns:name"] === assertor.assertor) === -1){
                        newReport.assertors.push(currentReport.assertors.find(
                            elem => elem["xmlns:name"] === assertor.assertor
                        ));
                    }

                    if(!newFoundCase){

                        foundCaseTemplate.assertedBy.push(assertor);

                        for(const pointer of currentPointers){

                            if(!pointer.assertedBy.includes(assertor.assertor)) continue;

                            const templatePointer = foundCaseTemplate.result.locationPointersGroup.find((elem) => 
                                elem["ptr:expression"] === pointer["ptr:expression"]
                            )

                            if(templatePointer){
                                templatePointer.assertedBy.push(assertor)
                            }else{
                                foundCaseTemplate.result.locationPointersGroup.push(pointer);
                            }

                        }

                    }else{

                        const assertorIndex = newFoundCase.assertedBy.findIndex((elem) => elem.assertor === assertor.assertor);

                        if(assertorIndex !== -1){
                            const newAssertor = newFoundCase.assertedBy[assertorIndex];
                            newAssertor.description = assertor.description;
                            newAssertor.modifiedBy = assertor.modifiedBy;
                            newAssertor.lastModifier = assertor.lastModifier;
                        }else{
                            newFoundCase.assertedBy.push(assertor);
                        }

                        const newPointers = newFoundCase.result.locationPointersGroup;

                        for(const pointer of currentPointers){

                            if(!pointer.assertedBy.includes(assertor.assertor)) continue;

                            const newPointerIndex = newPointers.findIndex((elem) => 
                                elem["ptr:expression"] === pointer["ptr:expression"] || elem.description === pointer.description
                            )

                            if(newPointerIndex !== -1){
                                const newPointerAssertors = newFoundCase.result.locationPointersGroup[newPointerIndex].assertedBy;

                                if(!newPointerAssertors.includes(assertor.assertor)){
                                    newFoundCase.result.locationPointersGroup[newPointerIndex].assertedBy.push(assertor.assertor);
                                }
                            }else{
                                newFoundCase.result.locationPointersGroup.push(pointer);
                            }

                        }

                    }
                    
                }

                if(!newFoundCase){

                    newReport.auditSample[index].hasPart.push(foundCaseTemplate);

                    const currentOutcome = currentFoundCase.result.outcome;
                    const newOutcome = newReport.auditSample[index].result.outcome;

                    if(newOutcome === "earl:untested"
                    ||(newOutcome === "earl:inapplicable" && currentOutcome !== "earl:inapplicable") 
                    ||(newOutcome === "earl:passed" && (currentOutcome === "earl:cantTell" || currentOutcome === "earl:failed"))
                    ||(newOutcome === "earl:cantTell" && currentOutcome === "earl:failed")){

                        newReport.auditSample[index].result.outcome = currentOutcome;
                    }
                }

                // Include scope
                if(newReport.structuredSample.webpage.findIndex(elem => elem.id === currentFoundCase.subject) === -1){
                    newReport.structuredSample.webpage.push(currentReport.structuredSample.webpage.find(elem => elem.id === currentFoundCase.subject))
                }
            }
        }
    }
}









