
const pa11y = require('pa11y');
const { URL } = require('url');
const path = require('path');


/**
 * Class representing a web page scraper to evaluate a pages accesibility.
*/
class Scraper {

    #evaluator;
    #Evaluator;
    #jsonld;
    #browser;

    static lighthouse;
    
    /** 
     * Constructor to create a new Scraper instance.
     * 
     * @param {Page} page - A Puppeteer page object.
     * @param {string} evaluator - The selected evaluator: 'am', 'ac', 'mv' or 'pa'.
     * @param {string} evaluationScope - The URL of the web pages to evaluate.
     * @throws Will throw an error if the evaluator is not valid.
    */
    constructor(evaluator, jsonLd){

        if (!['am', 'ac', 'mv', 'a11y', 'pa', 'lh'].includes(evaluator)) {
            throw new Error(evaluator.toUpperCase() + " is not a valid evaluator !!!");
        }

        this.#evaluator = evaluator;
        this.#Evaluator = evaluator.toUpperCase();
        this.#jsonld = jsonLd;
        
    }



    /**
     * Performs the scraping process.
     * 
     * @returns {object} - The JSON-LD evaluation report resulting of the scraping process.
     * @throws Will throw an error if an error occurs during the scraping process.
    */
    async performScraping(webPage, page = null, browser = null){

        if(browser){
            this.#browser = browser;
        }

        try{

            console.log("\n  " + this.#Evaluator + ": Starting with " + webPage.url + " ...");

            if(this.#jsonld === null){
                return await this[this.#evaluator + "Scraper"](webPage, page);
            }else{
                await this[this.#evaluator + "Scraper"](webPage, page);
            }
            
            console.log("\n  " + this.#Evaluator + ": " + webPage.url + " scraping finished."); 

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
                const documentation = techniqueInfo.querySelector("div:nth-child(2) > span > strong > a").getAttribute("href");
                const criteriaNumbers = Array.from(techniqueInfo.querySelectorAll('li')).map(li => li.textContent.substring(18,24).replaceAll(' ',''));
                let description = techniqueInfo.querySelector("p").textContent.replace(/\u00A0/g, " ");
                description += "\n\n" + techniqueInfo.querySelector("div > span > strong > a").textContent.replace(/\u00A0/g, " ").substring(4).replace(":", "").replace(" ", "");

                for(const criteria of criteriaNumbers){
                    results.push({ 
                        outcome, 
                        criteria, 
                        description, 
                        documentation 
                    });
                }
                
            }
            return results; 

        });

        const rows = await page.$$("table.evaluation-table > tbody > tr");

        for(let i = 0; i < rows.length; i++){

            const link = await rows[i].$('td > a');
            
            if(!link) continue;

            await page.evaluate(el => el.scrollIntoView(), link);

            const href = await link.evaluate(el => el.getAttribute('href'));

            if(href.startsWith("/results") || href.startsWith("https://accessmonitor.acessibilidade.gov.pt/")){
                
                const tr = i + 1

                await page.click("table.evaluation-table > tbody > tr:nth-child("+ tr +") > td:nth-child(4) > a");

                try{
                    await page.waitForSelector('#list_tab', {timeout: 500});
                }catch(err){
                    continue;
                }
                

                const casesLocations = await page.evaluate(() => {
                    
                    const casesLocations = [];
                    const foundCases = Array.from(document.querySelectorAll('ol > li'));

                    for (const foundCase of foundCases){
                        const caseElements = Array.from(foundCase.querySelectorAll('table > tr'));

                        if(caseElements[3]){
                            casesLocations.push(caseElements[3].querySelector('td span').textContent);
                        }
                        
                    }
                    return casesLocations;  
                });

                results[i]["casesLocations"] = casesLocations;

                await page.click('section > nav > a[href^="/results/"]');
            }
        }

        await page.goto(webPage.url);

        for(const result of results){

            const { casesLocations, criteria, outcome, description, documentation } = result;

            if(casesLocations){
                for (const path of result.casesLocations){

                    if(path.startsWith("html > head")) continue;
    
                    const targetElement = await page.$(path);

                    if(!targetElement) continue;
    
                    const html = await page.evaluate(el => el.outerHTML, targetElement);
    
                    await this.#jsonld.addNewAssertion(criteria, outcome, description, webPage.url, path, html, documentation);
                    
                }
            }else{
                await this.#jsonld.addNewAssertion(criteria, outcome, description, webPage.url, null, null, documentation);
            }
            
        }
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
        await page.click("#show_source");
        await page.focus('#checkuri');
        await page.keyboard.type(webPage.url);
        await page.click('#validate_uri')



        // Wait for results to be loaded and scrape the results
        await page.waitForSelector('fieldset[class="group_form"]', {timeout: 240000});

        const results = await page.evaluate(() => {

            var results = [];

            async function pushResults(id){

                const wrapper = await document.querySelector(id)

                const children = wrapper.children;

                for(const child of children){
                    if (child.tagName === 'H4') {

                        const criteria = child.textContent.match(/(\d\.\d\.\d)/)[0];

                        let nextSibling = child.nextSibling;

                        while (nextSibling){

                            if(nextSibling.tagName === 'H3') break;
                            
                            if(nextSibling.tagName === 'DIV'){
                                
                                const foundCases = Array.from(nextSibling.querySelectorAll("table > tbody > tr > td"));
                
                                for (const foundCase of foundCases){

                                    if(foundCase.querySelector("em") == null) continue;

                                    const path = foundCase.querySelector("em").textContent;

                                    const match = /Line (\d+), Column (\d+)/.exec(path);

                                    if(match == null) continue;

                                    const line = document.querySelector("#line-" + parseInt(match[1]));

                                    if(!line) continue;

                                    const html = line.textContent.substring(parseInt(match[2])-1);


                                    // Conseguir el path modificando el html
                                    let querySelector = html.replace(/[\n\t]/g, '').replace(/\n\s*/g, '').replace(/\"/g, "'");

                                    querySelector = querySelector.substring(0, querySelector.indexOf(">")+1);

                                    if(querySelector.substring(0, querySelector.indexOf(">")+1).indexOf(" ") > -1){
                                    
                                        querySelector = querySelector.replace(/<|>/g, "")
                                        
                                        querySelector = querySelector.substring(0, querySelector.indexOf(" ")) + "[" + querySelector.substring(querySelector.indexOf(" ")+1) + "]"
                                        querySelector = querySelector.replaceAll("/]", "]").replace(/\s+]/g, "]").replaceAll("' ", "'][");

                                        if(querySelector.indexOf("[style='") > 0){
                                            const querySelector1 = querySelector.substring(0, querySelector.indexOf("[style='"))
                                            const querySelector2 = querySelector.substring(querySelector.indexOf("[style='"))

                                            querySelector = querySelector1 + querySelector2.substring(querySelector2.indexOf("']")+2)
                                        }

                                        querySelector = querySelector.replace("hidden ", "hidden][");
                                        querySelector = querySelector.replace("async ", "async][");

                                    }else{
                                        querySelector = querySelector.replace(/<|>/g, "")
                                    }


                                    const outcome = id === "#AC_errors" ? "earl:failed": "earl:cantTell";

                                    if(nextSibling.querySelector("span > a") == null) continue;

                                    const description = nextSibling.querySelector("span > a").textContent;

                                    results.push({
                                        criteria,
                                        outcome,
                                        description,
                                        "path": querySelector,
                                        html
                                    });
                                }

                            }
                            nextSibling = nextSibling.nextSibling;
                        }
                        console.log('Child is an h4 element');
                    }
                }
            }

            ["#AC_errors", "#AC_likely_problems", "#AC_potential_problems"].map(async (id) => await pushResults(id));

            return results;

        });

        for (const result of results){
            try{
                result.path && await page.$(result.path)
            }catch(err){
                continue;
            }
            await this.#jsonld.addNewAssertion(result.criteria, result.outcome, result.description, webPage.url, result.path, result.html);
        }
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
        
        await page.click('#sourcecode_link');
        await page.waitForFunction(() => {
            const loader = document.querySelector('#loader');
            return loader && loader.classList.contains('display_none');
        });

        const results = await page.evaluate(() => {

            const results = [];
            
            const paragraphsWithoutId = Array.from(document.querySelectorAll('#sourcecode > p:not([id])'));
            
            paragraphsWithoutId.forEach(paragraph => {

                let html = "";
                let nextElement = paragraph.nextElementSibling;
                while (nextElement) {
                    if (nextElement.tagName.toLowerCase() === 'p' && nextElement.id) {
                        const clonElement = nextElement.cloneNode(true);
                        const elementB = clonElement.querySelector('b');
                        if (elementB) {
                            elementB.textContent = '';
                        }
                        html = clonElement.innerText.trim();
                        break;
                    }
                    nextElement = nextElement.nextElementSibling;
                }

                const firstSpan = paragraph.querySelector('span');
                if (firstSpan) {
                    const firstSpanClass = firstSpan.getAttribute('class');
                    let outcome = "";
                    if(firstSpanClass == "error"){
                        outcome = "earl:failed";
                    }else if(firstSpanClass == "warning"){
                        outcome = "earl:cantTell";
                    }
            
                    const a = firstSpan.querySelector('a');
                    if (a) {
                        const texto = a.textContent.trim();
                        const regex = /\b(\d+\.\d+\.\d+)\b/g;
                        const aCriterias = texto.match(regex);

                        const aTechniques = texto.match(/Tech\s+.+/);
                        const technique = aTechniques ? aTechniques[0] : '';

                        const documentation = a.getAttribute('href');

                        const spanStrong = paragraph.querySelector('.strong');
                        if (spanStrong) {
                            let description = spanStrong.textContent;
                            description = description.replace(/\[.*?\]/g, '').trim();

                            results.push({
                                "criterias": aCriterias,
                                "outcome": outcome,
                                description,
                                xpath: 'path-',
                                html: html,
                                "documentation": documentation
                            });
                        }
                    }
                }

            });
        
            return results;

        });


        await page.click('#livepreview_link');
        await page.waitForFunction(() => {
            const loader = document.querySelector('#loader');
            return loader && loader.classList.contains('display_none');
        });
        
        const results2 = await page.evaluate(() => {
            
            var results2 = [];

            const criteriaTable = Array.from(document.querySelectorAll('#table_sc_occ > tbody > tr'));

            for(const criteriaTableRow of criteriaTable){
                
                const outcomes = Array.from(criteriaTableRow.children);

                if (outcomes[1].textContent.match(/\d+/)[0] === "0" && 
                    outcomes[2].textContent.match(/\d+/)[0] === "0"  && 
                    outcomes[3].textContent.match(/\d+/)[0] !== "0" ){

                    results2.push({
                        "criterias": outcomes[0].querySelector("p").textContent,
                        "outcome": "earl:passed",
                        "description": "PASSED"
                    })
                }
            }

            return results2;
        });
        
        const allResults = results.concat(results2);

        await page.goto(webPage.url);

        let i = 0;
        const conteoCriterias = {};

        for (const result of allResults){
            
            if(result.outcome === "earl:passed"){
                await this.#jsonld.addNewAssertion(result.criterias, result.outcome, result.description, webPage.url);
            }else{
                for (const criteria of result.criterias){
                    i = i+1;
                    if (conteoCriterias[criteria]) {
                        conteoCriterias[criteria]++;
                    } else {
                        conteoCriterias[criteria] = 1;
                    }
                    await this.#jsonld.addNewAssertion(criteria, result.outcome, result.description, webPage.url, result.xpath + i, result.html, result.documentation);
                }
            }

        }

        for (const criteria in conteoCriterias) {
            console.log(`El criterio ${criteria} aparece ${conteoCriterias[criteria]} veces.`);
        }


        /* // Go to the evaluator page, configure it, and perform the evaluation
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
    
                    const description = foundCase.querySelector("span[class='error_summary']").textContent;
    
                    let occurrences = foundCase.querySelector(".accordion_content");
    
                    occurrences = Array.from(occurrences.querySelectorAll("div > span[class='single_error_info']"));
    
                    for (const occurrence of occurrences){
        
                        let xpath = occurrence.querySelector("button");
    
                        if(!xpath) continue;
                        
                        xpath = xpath.getAttribute("data-x");

                        const doc = document.querySelector("#iframe").contentDocument;

                        const html = document.evaluate(xpath, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                       
                        if(html){

                            results.push({
                                "criterias": foundCase.querySelector("div > span").textContent.match(/(\d\.\d\.\d)/g),
                                "outcome": outcomeType === "error" ? "earl:failed" : "earl:cantTell",
                                description,
                                xpath,
                                html: html.outerHTML,
                                "documentation": foundCase.querySelector("div > a").getAttribute("href")
                            });

                        }else{
                            continue;
                        }
        
                       
                    }
    
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
                        "criterias": outcomes[0].querySelector("p").textContent,
                        "outcome": "earl:passed",
                        "description": "PASSED"
                    })
                }
            }

            return results;
        });

        await page.goto(webPage.url);

        const conteoCriterias = {};

        for (const result of results){

            if(result.outcome === "earl:passed"){
                await this.#jsonld.addNewAssertion(result.criterias, result.outcome, result.description, webPage.url);
            }else{
                for (const criteria of result.criterias){
                    if (conteoCriterias[criteria]) {
                        conteoCriterias[criteria]++;
                    } else {
                        conteoCriterias[criteria] = 1;
                    }
                    await this.#jsonld.addNewAssertion(criteria, result.outcome, result.description, webPage.url, result.xpath, result.html, result.documentation);
                }
            }

        }

        for (const criteria in conteoCriterias) {
            console.log(`El criterio ${criteria} aparece ${conteoCriterias[criteria]} veces.`);
        } */
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

                let description = ruleResult.getRuleSummary() + "\n\n";

                description += ruleResult.getResultMessagesArray().filter(message => message !== "N/A").join("\n\n");

                const successCriteria = ruleResult.getRule().getPrimarySuccessCriterion().id;
                const results = ruleResult.getElementResultsArray();

                if (results.length <= 0){
                    a11yResults.push({
                        successCriteria, 
                        outcome, 
                        description, 
                        url: window.location.href,
                        xpath: null,
                        html: null
                    });
                    
                }else{
                    for(const result of results) {
                        let xpath = result.getDOMElement().xpath;
                        xpath = "/" + xpath.substring(xpath.indexOf("]/")+1)
                        xpath = xpath.replace(/\[@id='([\w\s-]+?)'\]\[@role='([\w\s-]+?)'\]/g, "[@id='$1']");
                        xpath = xpath.replace(/\[@class='([\w\s-]+?)'\]/g, "");

                        if(!document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue){
                            continue;
                        }

                        const html = result.getDOMElement().node.outerHTML.replace(/[\n\t]/g, "");

                        a11yResults.push({
                            successCriteria, 
                            outcome, 
                            description, 
                            url: window.location.href,
                            xpath,
                            html
                        });
                    }
                }
            }

            return a11yResults;
        })

        for(const result of results) {
            await this.#jsonld.addNewAssertion(result.successCriteria, result.outcome, result.description, result.url, result.xpath, result.html);
        }
        
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
            timeout: 120000
        });

        for(const issue of results.issues){

            const criteria = issue.code.match(/(\d\_\d\_\d)/)[0].replaceAll("_", ".");
            const outcome = issue.typeCode === 1 ? "earl:failed" : "earl:cantTell";

            await this.#jsonld.addNewAssertion(criteria, outcome, issue.message, webPage.url, issue.selector, issue.context);
        }
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
        const report = await Scraper.lighthouse(webPage.url, {
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

        for(const audit of Object.values(report.lhr.audits)){

            let description = audit.description;

            if(description.indexOf("(https://") === -1){
                continue;
            }
            
            let documentation = description.substring(description.indexOf("(https://") + 1);
            documentation = documentation.substring(0, documentation.indexOf(")"));

            if(audit.score === 0){

                if(audit.details.debugData.tags[2] === undefined){
                    continue;
                }

                const tag = audit.details.debugData.tags[2].slice(4);
                const criteria = tag.slice(0, 1) + "." + tag.slice(1, 2) + "." + tag.slice(2);

                for(const item of audit.details.items){
                    const path = item.node.selector;
                    const html = item.node.snippet;
                    description += "\n\n" + item.node.explanation;

                    await this.#jsonld.addNewAssertion(criteria, "earl:failed", description, webPage.url, path, html, documentation);
                }

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

                await this.#jsonld.addNewAssertion(criteria[audit.id], outcome, description, webPage.url, null, null, documentation);
            } 
        }
    }

}


(async ()=>{
    const lighthouseModule = await import('lighthouse');
    Scraper.lighthouse = lighthouseModule.default;
})()


module.exports = Scraper;

