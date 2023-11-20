
const pa11y = require('pa11y');
const { URL } = require('url');

/**
 * Class representing a web page scraper to evaluate a pages accesibility.
*/
class Tester {

    #evaluator;
    #Evaluator;
    #browser;
    
    #testCriterias;
    #testOutcome;

    static lighthouse;
    
    /** 
     * Constructor to create a new Scraper instance.
     * 
     * @param {Page} page - A Puppeteer page object.
     * @param {string} evaluator - The selected evaluator: 'am', 'ac', 'mv' or 'pa'.
     * @param {string} evaluationScope - The URL of the web pages to evaluate.
     * @throws Will throw an error if the evaluator is not valid.
    */
    constructor(evaluator, criterias, expectedOutcome){

        this.#testCriterias = criterias;
        this.#testOutcome = "earl:" + expectedOutcome;

        this.#evaluator = evaluator;
        this.#Evaluator = evaluator.toUpperCase();
        
    }



    /**
     * Performs the scraping process.
     * 
     * @returns {object} - The JSON-LD evaluation report resulting of the scraping process.
     * @throws Will throw an error if an error occurs during the scraping process.
    */
    async test(webPage, page = null, browser = null){

        if(browser){
            this.#browser = browser;
        }

        try{

            return await this[this.#evaluator + "Scraper"](webPage, page);

        } catch(error) { 
            throw new Error("\nThe next error was found on " + this.#Evaluator  + " scraping process: " + error); 
        }

    }



    /**
     * Scrapes results from the Access Monitor evaluator and loads them into the jsonLd..
     * @async
     * @function amScraper
     * @param {string} evaluatorUrl - The URL of the Access Monitor evaluator.
     * @param {Page} page - The puppeteer page object to be used for scraping.
     * @returns {void}
    */
    async amScraper(webPage, page){

        // Go to the evaluator page and perform the evaluation
        await page.goto("https://accessmonitor.acessibilidade.gov.pt/");
        await page.focus('#url');
        await page.keyboard.type(webPage.url);
        await page.click('.card_actions button');

        // Wait for results to be loaded and scrape the results
        await page.waitForSelector('.evaluation-table > tbody', {timeout: 90000});
        
        const results = await page.evaluate(() => {

            const status2Outcome = {
                "Non acceptable practice": "earl:failed",
                " Practice to view manually ": "earl:cantTell",
                "Acceptable practice": "earl:passed"
            };

            const results = [];

            const foundTechniques = Array.from(document.querySelectorAll('.evaluation-table > tbody > tr'));

            for (const technique of foundTechniques){

                const cols = Array.from(technique.querySelectorAll('td'));

                const outcome = status2Outcome[cols[0].querySelector('svg title').textContent];

                if (!outcome) continue;

                const techniqueInfo = cols[1].querySelector('.collapsible-content');
                const criteriaNumbers = Array.from(techniqueInfo.querySelectorAll('li')).map(li => li.textContent.substring(18,24).replaceAll(' ',''));

                for(const criteria of criteriaNumbers){
                    results.push({ 
                        outcome, 
                        criteria
                    });
                }
                
            }
            return results; 

        });

        const criteriaResults = {};

        for(const testCriteria of this.#testCriterias){
            const elem = results.find(elem => elem.criteria === testCriteria);
            if(elem){
                if(this.#testOutcome === elem.outcome || 
                (this.#testOutcome === "earl:inapplicable" && elem.outcome !== "earl:passed" && elem.outcome !== "earl:failed")){
                    criteriaResults[testCriteria] = "passed";
                }else{
                    criteriaResults[testCriteria] = "failed";
                }
            }else{
                criteriaResults[testCriteria] = "untested";
            }
        }

        return criteriaResults;
    }



    /**
     * Scrapes results from the AChecker evaluator and loads them into the jsonLd..
     * @async
     * @function amScraper
     * @param {object} page - The Puppeteer page object to use for web scraping.
     * @returns {void}
     */
    async acScraper(webPage, page){

        // Go to the evaluator page, configure it, and perform the evaluation
        await page.goto("https://achecker.achecks.ca/checker/index.php");
        await page.click('h2[align="left"] a');
        await page.click("#radio_gid_9");
        await page.focus('#checkuri');
        await page.keyboard.type(webPage.url);
        await page.click('#validate_uri')



        // Wait for results to be loaded and scrape the results
        await page.waitForSelector('fieldset[class="group_form"]', {timeout: 120000});

        const results = await page.evaluate(() => {

            var results = [];

            async function pushResults(id){

                const wrapper = await document.querySelector(id)

                const children = wrapper.children;

                for(const child of children){
                    if (child.tagName === 'H4') {

                        const criteria = child.textContent.match(/(\d\.\d\.\d)/)[0];

                        const outcome = id === "#AC_errors" ? "earl:failed": "earl:cantTell";

                        results.push({
                            criteria,
                            outcome
                        });

                    }
                }
            }

            ["#AC_errors", "#AC_likely_problems", "#AC_potential_problems"].map(async (id) => await pushResults(id));

            return results;

        });


        const criteriaResults = {};

        for(const testCriteria of this.#testCriterias){
            const elem = results.find(elem => elem.criteria === testCriteria);
            if(elem){
                if(this.#testOutcome === elem.outcome || 
                (this.#testOutcome === "earl:inapplicable" && elem.outcome !== "earl:passed" && elem.outcome !== "earl:failed")){
                    criteriaResults[testCriteria] = "passed";
                }else{
                    criteriaResults[testCriteria] = "failed";
                }
            }else{
                criteriaResults[testCriteria] = "untested";
            }
        }

        return criteriaResults;
    }



    /**
     * Scrapes results from the Mauve evaluator and loads them into the jsonLd..
     * @async
     * @function mvScraper
     * @param {object} page - The Puppeteer page object to use for web scraping.
     * @returns {void}
     */
    async mvScraper(webPage, page){

        // Go to the evaluator page, configure it, and perform the evaluation
        await page.goto("https://mauve.isti.cnr.it/singleValidation.jsp");
        await page.waitForSelector('#uri');
        await page.focus('#uri');
        await page.keyboard.type(webPage.url);
        await page.waitForSelector('#Level_of_Conformance');
        await page.select('#Level_of_Conformance', 'AAA');
        await Promise.all([
            page.waitForNavigation({waitUntil: "domcontentloaded"}),
            page.click('#validate')
        ]);
        
        await page.click('#livepreview_link');
        await page.waitForFunction(() => {
            const loader = document.querySelector('#loader');
            return loader && loader.classList.contains('display_none');
        });
        
        const results = await page.evaluate(() => {
            
            var results = [];

            function pushResults(outcomeType){

                const foundCases = Array.from(document.querySelectorAll('#container_' + outcomeType + '_list > div'));                

                for (const foundCase of foundCases){
    
                    results.push({
                        criteria: foundCase.querySelector("div > span").textContent.match(/(\d\.\d\.\d)/g),
                        outcome: outcomeType === "error" ? "earl:failed" : "earl:cantTell"
                    });
    
                }
            }   

            ["error", "warning"].map((outcomeType) => pushResults(outcomeType));

            const criteriaTable = Array.from(document.querySelectorAll('#table_sc_occ > tbody > tr'));

            for(const criteriaTableRow of criteriaTable){
                
                const outcomes = Array.from(criteriaTableRow.children);

                if (outcomes[1].textContent.match(/\d+/)[0] === "0" && 
                    outcomes[2].textContent.match(/\d+/)[0] === "0"  && 
                    outcomes[3].textContent.match(/\d+/)[0] !== "0" ){

                    results.push({
                        criteria: outcomes[0].querySelector("p").textContent,
                        outcome: "earl:passed"
                    })
                }
            }

            return results;
        });

        const criteriaResults = {};

        for(const testCriteria of this.#testCriterias){
            const elem = results.find(elem => elem.criteria === testCriteria);
            if(elem){
                if(this.#testOutcome === elem.outcome || 
                (this.#testOutcome === "earl:inapplicable" && elem.outcome !== "earl:passed" && elem.outcome !== "earl:failed")){
                    criteriaResults[testCriteria] = "passed";
                }else{
                    criteriaResults[testCriteria] = "failed";
                }
            }else{
                criteriaResults[testCriteria] = "untested";
            }
        }

        return criteriaResults;

    }



    /**
     * Evaluates the page with a11y library and loads them data into jsonLd.
     * @async
     * @function a11yScraper
     * @returns {void}
     */
    async a11yScraper(webPage, page){

        await page.goto(webPage.url, {waitUntil: "domcontentloaded"});
        await page.addScriptTag({ path: './scraping/a11yAinspector.js' });

        const results = await page.evaluate(async () => {

            a11yResults = [];

            // Configure evaluator factory and get evaluator
            const evaluatorFactory = OpenAjax.a11y.EvaluatorFactory.newInstance();
            evaluatorFactory.setParameter('ruleset', OpenAjax.a11y.RulesetManager.getRuleset('ARIA_STRICT'));
            evaluatorFactory.setFeature('eventProcessing', 'fae-util');
            evaluatorFactory.setFeature('groups', 7);
            const evaluator = evaluatorFactory.newEvaluator();

            // Perform evaluation
            const evaluationResult = await evaluator.evaluate(window.document, window.location.title, window.location.href);

            // Get interested results data and fill the jsonld evaluation report
            const ruleResults = evaluationResult.getRuleResultsAll().getRuleResultsArray();

            const ruleResult2Outcome = {
                1: "earl:inapplicable", // NOT_APPLICABLE
                2: "earl:passed",   // PASS
                3: "earl:cantTell",  // MANUAL_CHECK
                5: "earl:failed"    // VIOLATION
            }

            for(const ruleResult of ruleResults) {

                const outcome = ruleResult2Outcome[ruleResult.getResultValue()];

                if (!outcome || !ruleResult.isRuleRequired()) continue;

                const criteria = ruleResult.getRule().getPrimarySuccessCriterion().id;

                a11yResults.push({
                    criteria, 
                    outcome
                });
            }

            return a11yResults;
        })

        const criteriaResults = {};

        for(const testCriteria of this.#testCriterias){
            const elem = results.find(elem => elem.criteria === testCriteria);
            if(elem){
                if(this.#testOutcome === elem.outcome || 
                (this.#testOutcome === "earl:inapplicable" && elem.outcome !== "earl:passed" && elem.outcome !== "earl:failed")){
                    criteriaResults[testCriteria] = "passed";
                }else{
                    criteriaResults[testCriteria] = "failed";
                }
            }else{
                criteriaResults[testCriteria] = "untested";
            }
        }

        return criteriaResults;

    }

    
    
    /**
     * Scrapes results with the Pa11y library and loads them into the jsonLd.
     * @async
     * @function pa11yScraper
     * @returns {void}
     */
    async paScraper(webPage, page){

        const results = await pa11y(webPage.url, {
            standard: 'WCAG2AAA',
            includeWarnings: true,
            timeout: 60000
        });

        const criteriaResults = {};

        for(const testCriteria of this.#testCriterias){
            const elem = results.issues.find((issue) => 
                issue.code.match(/(\d\_\d\_\d)/)[0].replaceAll("_", ".") === testCriteria
            );
            if(elem){
                const outcome = elem.typeCode === 1 ? "earl:failed" : "earl:cantTell";
                if(this.#testOutcome === outcome || 
                (this.#testOutcome === "earl:inapplicable" && outcome !== "earl:passed" && outcome !== "earl:failed")){
                    criteriaResults[testCriteria] = "passed";
                }else{
                    criteriaResults[testCriteria] = "failed";
                }
            }else{
                criteriaResults[testCriteria] = "untested";
            }
        }

        return criteriaResults;
    }


    

    /**
     * Scrapes results with the Lighthouse library and loads them into the JSON-LD.
     * @async
     * @function lhScraper
     * @param {object} webPage - The web page object to scrape.
     * @param {object} page - The Puppeteer page object to use for web scraping.
     * @returns {void}
     */
    async lhScraper(webPage, page){

        // Generate the Lighthouse report
        const report = await Tester.lighthouse(webPage.url, {
            port: (new URL(this.#browser.wsEndpoint())).port,
            onlyCategories: ['accessibility'],
            formFactor: 'desktop',
            screenEmulation: {
                // Set screen emulation options for desktop
                mobile: false,
                width: 1920,
                height: 1080,
                deviceScaleFactor: 1,
                disabled: false,
            },
            output: 'json'
        });

        const results = [];

        for(const audit of Object.values(report.lhr.audits)){

            let description = audit.description;

            if(description.indexOf("(https://") === -1){
                continue;
            }

            if(audit.score === 0){

                if(audit.details.debugData.tags[2] === undefined){
                    continue;
                }

                const tag = audit.details.debugData.tags[2].slice(4);
                const criteria = tag.slice(0, 1) + "." + tag.slice(1, 2) + "." + tag.slice(2);

                results.push({criteria, outcome: "earl:failed"});

            } else {

                const criteria = {
                    "aria-allowed-attr": "4.1.2",
                    "aria-command-name": "4.1.2",
                    "aria-hidden-body": "4.1.2",
                    "aria-hidden-focus": "4.1.2",
                    "aria-input-field-name": "4.1.2",
                    "aria-meter-name": "1.1.1",
                    "aria-progressbar-name": "1.1.1",
                    "aria-required-attr": "4.1.2",
                    "aria-required-parent": "1.3.1",
                    "aria-roles": "4.1.2",
                    "aria-toggle-field-name": "4.1.2",
                    "aria-tooltip-name": "4.1.2",
                    "aria-valid-attr-value": "4.1.2",
                    "aria-valid-attr": "4.1.2",
                    "bypass": "2.4.1",
                    "color-contrast": "1.4.3",
                    "definition-list": "1.3.1",
                    "dlitem": "1.3.1",
                    "document-title": "2.4.2",
                    "duplicate-id-active": "4.1.1",
                    "duplicate-id-aria": "4.1.1",
                    "form-field-multiple-labels": "3.3.2",
                    "frame-title": "4.1.2",
                    "html-has-lang": "3.1.1",
                    "html-lang-valid": "3.1.1",
                    "image-alt": "1.1.1",
                    "input-image-alt": "1.1.1",
                    "label": "4.1.2",
                    "link-name": "4.1.2",
                    "list": "1.3.1",
                    "listitem": "1.3.1",
                    "meta-refresh": "2.2.1",
                    "meta-viewport": "1.4.4",
                    "object-alt": "1.1.1",
                    "td-headers-attr": "1.3.1",
                    "th-has-data-cells": "1.3.1",
                    "valid-lang": "3.1.2",
                    "video-caption": "1.2.2"
                };

                if(!criteria[audit.id]){
                    continue;
                }

                let outcome;

                if(audit.score === 1){
                    outcome = "earl:passed";
                }else if(audit.scoreDisplayMode === "notApplicable"){
                    outcome = "earl:inapplicable";
                }else if(audit.scoreDisplayMode === "manual"){
                    outcome = "earl:cantTell";
                }

                results.push({criteria: criteria[audit.id], outcome});

            } 
        }

        const criteriaResults = {};

        for(const testCriteria of this.#testCriterias){
            const elem = results.find(elem => elem.criteria === testCriteria);
            if(elem){
                if(this.#testOutcome === elem.outcome || 
                (this.#testOutcome === "earl:inapplicable" && elem.outcome !== "earl:passed" && elem.outcome !== "earl:failed")){
                    criteriaResults[testCriteria] = "passed";
                }else{
                    criteriaResults[testCriteria] = "failed";
                }
            }else{
                criteriaResults[testCriteria] = "untested";
            }
        }

        return criteriaResults;
    }

}


(async ()=>{
    const lighthouseModule = await import('lighthouse');
    Tester.lighthouse = lighthouseModule.default;
})()


module.exports = Tester;

