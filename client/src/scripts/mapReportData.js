
import { getSuccessCriterias, getWcagHierarchy } from './utils/wcagUtils.js';
import { storeOnChromeStorage, getFromChromeStorage }  from './utils/chromeUtils.js';


const assertions = {};
var blacklist;

function getOutcomeVariables () {
    return{
        "earl:passed": { "A": 0, "AA": 0, "AAA": 0 },
        "earl:failed": { "A": 0, "AA": 0, "AAA": 0 },
        "earl:cantTell": { "A": 0, "AA": 0, "AAA": 0 },
        "earl:inapplicable": { "A": 0, "AA": 0, "AAA": 0 },
        "earl:untested": { "A": 0, "AA": 0, "AAA": 0 }
    };
}





/**
 * Maps the data of the currently loaded report for displaying it on the extension table taking into account blacklisted elements.
 * @param {Object} evaluationreport - The evaluation report (optional).
 * @param {Array} blackList - The blacklist (optional).
 * @returns {Promise<void>} - A Promise that resolves when the mapping is completed.
 */
export async function mapReportData(evaluationreport = null, blackList = null){

    const evaluationReport = evaluationreport ? evaluationreport : await getFromChromeStorage(window.location.hostname, false);

    const enableBlacklist = await getFromChromeStorage('enableBlacklist');

    if(enableBlacklist){
        blacklist = blackList ? blackList : await getFromChromeStorage("blacklist") ?? [];
    }else{
        blacklist = [];
    }

    const auditSample = evaluationReport.auditSample;
    const successCriterias = getSuccessCriterias();
    const siteSummary = getOutcomeVariables();
    const evaluationScope = [];
    
    const pageSummaries = {};
    for(const webPage of evaluationReport.structuredSample.webpage){
        pageSummaries[webPage.id] = getOutcomeVariables(); 
        evaluationScope.push(webPage.id);
    }

    for (var i = 0; i < auditSample.length; i++){

        const assertion = auditSample[i];
        const conformanceLevel = assertion.conformanceLevel;
        const hasPart = assertion.hasPart;
        const criteriaNumber = successCriterias[i].num;

        const pageOutcomes = {};

        let siteOutcome = "earl:untested";

        for(const webPage of evaluationReport.structuredSample.webpage){

            let pageOutcome = "earl:untested";

            for(const foundCase of hasPart){

                if(foundCase.subject !== webPage.id) continue;

                const blacklisteds = blacklist.filter(item => "earl:" + item.outcome === foundCase.result.outcome && item.criteria.startsWith(criteriaNumber));

                if(blacklisteds.length > 0){
                    const assertors = foundCase.assertedBy;

                    for(const listed of blacklisteds){
                        const index = assertors.findIndex(item => item.assertor === listed.evaluator && item.description === listed.message);
                        if(index > -1){
                            assertors.splice(index, 1);
                            if(assertors.length === 0){
                                break;
                            }
                        }
                    }
                    if(assertors.length === 0) continue;
                }
                
                if(pageOutcome === "earl:failed") break;

                const newOutcome = foundCase.result.outcome;

                if(pageOutcome === "earl:untested" ||
                  (pageOutcome === "earl:inapplicable" && newOutcome !== "earl:untested") ||
                  (pageOutcome === "earl:passed" && (newOutcome === "earl:failed" || newOutcome === "earl:cantTell")) ||
                  (pageOutcome === "earl:cantTell" && newOutcome === "earl:failed")){
                    pageOutcome = newOutcome;
                }
                
            }

            pageSummaries[webPage.id][pageOutcome][conformanceLevel]++;

            pageOutcomes[webPage.id] = pageOutcome;

            if(siteOutcome === "earl:untested" ||
              (siteOutcome === "earl:inapplicable" && pageOutcome !== "earl:untested") ||
              (siteOutcome === "earl:passed" && (pageOutcome === "earl:failed" || pageOutcome === "earl:cantTell")) ||
              (siteOutcome === "earl:cantTell" && pageOutcome === "earl:failed")){
                siteOutcome = pageOutcome;
            }
        }

        siteSummary[siteOutcome][conformanceLevel]++;

        assertions[criteriaNumber] = {
            conformanceLevel,
            pageOutcomes,
            "description": assertion.result.description,
            hasPart
        };
    }

    storeOnChromeStorage(window.location.hostname + ".siteSummary", siteSummary);
    storeOnChromeStorage(window.location.hostname + ".pageSummaries", pageSummaries);
    storeOnChromeStorage(window.location.hostname + ".reportTableContent", getCategoryResults());

    storeOnChromeStorage(window.location.hostname + ".reportIsLoaded", "true");
    //localStorage.setItem("scope", JSON.stringify(evaluationScope));
    window.location.reload();

}


/**
 * Gets the category results for the report table.
 * @returns {Array} - An array of category results.
 */
function getCategoryResults(){

    const reportTableContent = [];
    const mainCategories = getWcagHierarchy("mainCategories");

    for(const categoryKey in mainCategories){
        reportTableContent.push({
            "categoryTitle": mainCategories[categoryKey],
            "subCategories": getSubCategoryResults(categoryKey),
            "webPageOutcomes": getPageOutcomesByCategory(categoryKey)
        });
    }

    return reportTableContent;
}


/**
 * Gets the sub-category results for a specific category.
 * @param {string} categoryKey - The key of the category.
 * @returns {Array} - An array of sub-category results.
 */
function getSubCategoryResults(categoryKey){

    const subCategoryResults = [];
    const subCategories = getWcagHierarchy(categoryKey);

    for(const subCategoryKey in subCategories){
        subCategoryResults.push({
            "subCategoryTitle": subCategories[subCategoryKey],
            "criterias": getCriteriaResults(subCategoryKey),
            "webPageOutcomes": getPageOutcomesByCategory(subCategoryKey)
        });
    }

    return subCategoryResults;
}


/**
 * Gets the criteria results for a specific sub-category.
 * @param {string} subCategoryKey - The key of the sub-category.
 * @returns {Array} - An array of criteria results.
 */
function getCriteriaResults(subCategoryKey){

    const criteriaResults = [];
    const criterias = getWcagHierarchy(subCategoryKey);

    for(const criteriaKey in criterias){

        const assertion = assertions[criteriaKey]; 

        const results = {
            "criteria": criterias[criteriaKey],
            "criteriaNumber": criteriaKey,
            "outcomes": assertion.pageOutcomes,
            "conformanceLevel": assertion.conformanceLevel
        }

        if(assertion.hasPart.length > 0){
            results.hasPart = getHasPart(criteriaKey);
        }

        criteriaResults.push(results);
    }

    return criteriaResults;
}



/**
 * Gets the "hasPart" results for a specific criteria.
 * @param {string} criteriaKey - The key of the criteria.
 * @returns {Array} - An array of "hasPart" results.
 */
function getHasPart(criteriaKey){

    const foundCasesResults = [];
    const assertionHasPart = assertions[criteriaKey].hasPart;

    for (const foundCase of assertionHasPart) {

        const descriptions = foundCase.assertedBy;

        const blacklisteds = blacklist.filter(item => "earl:" + item.outcome === foundCase.result.outcome && item.criteria.startsWith(criteriaKey));

        if(blacklisteds.length > 0){

            for(const listed of blacklisteds){
                const index = descriptions.findIndex(item => item.assertor === listed.evaluator && item.description === listed.message);
                if(index > -1){
                    descriptions.splice(index, 1);
                    if(descriptions.length === 0){
                        break;
                    }
                }
            }

            if(descriptions.length === 0) continue;

        }

        const hasPart = {
            outcome: foundCase.result.outcome.replace("earl:", ""),
            descriptions,
            webPage: foundCase.subject
        }

        const foundCasePointers = foundCase.result.locationPointersGroup;

        if(foundCasePointers.length > 0){

            const pointers = []

            for (const pointer of foundCasePointers) {

                for(const listed of blacklisteds){
                    const index = pointer.assertedBy.findIndex(item => item === listed.evaluator);
                    if(index > -1){
                        pointer.assertedBy.splice(index, 1);
                        if(pointer.assertedBy.length === 0){
                            break;
                        }
                    }
                }

                if(pointer.assertedBy.length > 0){
                    pointers.push({
                        "html": pointer['description'].replaceAll('<','&lt;').replaceAll('>','&gt;'),
                        "path": pointer['ptr:expression'],
                        "innerText": pointer.innerText,
                        "assertedBy": pointer.assertedBy.sort(),
                        "documentation": pointer.documentation
                    });
                }
                
            }
 
            if(pointers.length === 0) continue;

            const groupedPointers = pointers.reduce((acc, pointer) => {
                const key = pointer.assertedBy.sort().join(", ");
                if (!acc[key]) {
                    acc[key] = [];
                }
                acc[key].push(pointer);
                return acc;
            }, {});

            hasPart["groupedPointers"] = groupedPointers;
        }

        foundCasesResults.push(hasPart);
    }

    foundCasesResults.sort( (a, b) => {
        if ((a.outcome === "cantTell" && b.outcome === "failed") ||
            (a.outcome === "passed" && (b.outcome === "failed" || b.outcome === "cantTell")) ||
            (a.outcome === "inapplicable" && (b.outcome === "failed" || b.outcome === "cantTell" || b.outcome === "passed"))) {
            return 1;
        }else{
            return -1;
        }
    });

    return foundCasesResults;
}
  


/**
 * Gets the page outcomes by category.
 * @param {string} categoryKey - The key of the category.
 * @returns {Object} - The page outcomes by category.
 */
function getPageOutcomesByCategory(categoryKey){

    const outcomes = {};
    for(const webPage in assertions["1.1.1"].pageOutcomes){
        outcomes[webPage] = getOutcomeVariables(); 
    }

    for (const criteriaNumber in assertions) {

        if (criteriaNumber.startsWith(categoryKey)){

            const assertion = assertions[criteriaNumber];

            for(const webPage in assertion.pageOutcomes){

                outcomes[webPage][assertion.pageOutcomes[webPage]][assertion.conformanceLevel]++;

            }
            
        }
    }

    return outcomes;
}









