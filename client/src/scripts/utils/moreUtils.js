
import { getFromChromeStorage } from './chromeUtils.js';
import { getSuccessCriterias } from './wcagUtils.js';
import {  removeElementHighlights } from './highlightUtils.js';


/**
 * Fetches data from the server.
 *
 * @param {object} bodyData - The data to send in the request body.
 * @param {string} action - The server action to perform.
 * @param {number} [timeout=120000] - The timeout value in milliseconds.
 * @returns {Promise<object>} A promise that resolves to the fetched data.
 * @throws {Error} If an error occurs during the fetch process.
 */
export async function fetchServer(bodyData, action, timeout = 120000) {

    try {
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

        return JSON.parse(fetchData);

    } catch (error) {
        throw new Error("Error fetching scraping server => " + error.name === 'AbortError' ? 'fetch timed out!' : error.message)
    }

}

/**
 * Retrieves an element from the DOM based on the provided path and inner text.
 *
 * @param {string} path - The path or selector to locate the element.
 * @param {string} innerText - The inner text of the element (optional).
 * @returns {HTMLElement} The matched element.
 * @throws {Error} If the path is null or undefined.
 */
export function getElementByPath(path, innerText) {
    
    if (!path) throw new Error("Invalid input: path is null or undefined.");

    let element = null;

    if (path.startsWith("/")) {
        element = document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    } else {
        const elements = window.document.querySelectorAll(path);

        if (elements.length > 0) {
            
            element = elements[0];

            for (let i = 0; i < elements.length; i++) {
                if (innerText && elements[i].textContent === innerText) {
                    element = elements[i];
                    break;
                }
            }
        }
    }

    return element;
}


/**
 * Event handler for the collapsible click event.
 *
 * @param {Array<boolean>} useState - The state variable used for collapsible items.
 * @param {function} setUseState - The state setter function.
 * @param {number} index - The index of the clicked item.
 * @param {boolean} mantainExtended - Flag indicating whether to maintain the extended state.
 * @param {number} arrayLength - The length of the array.
 */
export function collapsibleClickHandler(useState, setUseState, index, mantainExtended, arrayLength){

    removeElementHighlights();

    const newStates = mantainExtended ? [...useState] : Array(arrayLength).fill(false);
    newStates[index] = !useState[index];
    setUseState(newStates);

}




/**
 * Applies the blacklist to the current report.
 *
 * @param {object} currentReport - The current report object.
 * @returns {Promise<void>} A promise that resolves when the blacklist is applied.
 */
export async function applyBlackList(currentReport){

    const successCriterias = getSuccessCriterias();
    const blacklist = await getFromChromeStorage("blacklist") ?? [];

    if(blacklist.length === 0){
        return;
    }

    for(let index = 0; index < currentReport.auditSample.length; index++){

        const criteria = currentReport.auditSample[index];

        const criteriaNumber = successCriterias[index].num;

        let outcome = "earl:untested";

        for (let i = 0; i < criteria.hasPart.length; i++) {

            const foundCase = criteria.hasPart[i];

            const blacklisteds = blacklist.filter(
                item => item.criteria.startsWith(criteriaNumber) && "earl:" + item.outcome === foundCase.result.outcome
            );

            if(blacklisteds.length > 0){

                for(const listed of blacklisteds){
                    const index = foundCase.assertedBy.findIndex(
                        item => item.assertor === listed.evaluator && item.description === listed.message
                    );
                    if(index !== -1){
                        foundCase.assertedBy.splice(index, 1);
                        if(foundCase.assertedBy.length === 0){
                            break;
                        }
                    }
                }

                if(foundCase.assertedBy.length > 0){

                    const newOutcome = foundCase.result.outcome;
    
                    if(outcome === "earl:untested" ||
                    (outcome === "earl:inapplicable" && newOutcome !== "earl:untested") ||
                    (outcome === "earl:passed" && (newOutcome === "earl:failed" || newOutcome === "earl:cantTell")) ||
                    (outcome === "earl:cantTell" && newOutcome === "earl:failed")){
                        outcome = newOutcome;
                    }
    
                    for (let j = 0; j < foundCase.result.locationPointersGroup.length; j++) {
    
                        const pointer = foundCase.result.locationPointersGroup[j];
    
                        for(const listed of blacklisteds){
                            const index = pointer.assertedBy.findIndex(item => item === listed.evaluator);
                            if(index !== -1){
                                pointer.assertedBy.splice(index, 1);
                                if(pointer.assertedBy.length === 0){
                                    break;
                                }
                            }
                        }  
    
                        if(pointer.assertedBy.length === 0){
                            foundCase.result.locationPointersGroup.splice(j, 1);
                            j--;
                        }
                    };
    
                }else{
    
                    criteria.hasPart.splice(i, 1);
                    i--;

                }
            }
        }

        if(criteria.hasPart.length === 0){

            criteria.result = {
                "outcome": "earl:untested",
                "description": ""
            }
            delete criteria.assertedBy;
            delete criteria.mode;

        } else {

            criteria.result.outcome = outcome;
            
        }
    }
}