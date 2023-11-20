
const puppeteer = require('puppeteer');
const Tester = require('./tester.js');
const actTestCases = require('./testcases.json');
const testResults = require('./testResults.json');
const errorTests = require('./errorTests.json');
const fs = require("fs");

/**
 * Wraps a function that requires a browser instance and returns its result after closing the browser.
 * @param {Function} fn - The function to be wrapped.
 * @returns {Promise} - A promise that resolves with the result of the wrapped function.
 */
const withBrowser = async (fn) => {
	let browser;
	try {
		browser = await puppeteer.launch({ 
			headless: true,
			args: ["--disable-setuid-sandbox", "--lang=en", '--start-maximized'],
			'ignoreHTTPSErrors': true
		});
		return await fn(browser);
	} finally {
		if(browser) await browser.close();
	}
}


/**
 * Wraps a function that requires a page instance and returns its result after closing the page.
 * @param {Object} browser - The browser instance to create the page on.
 * @returns {Function} - A function that accepts a function to be wrapped and returns a promise that resolves with the result of the wrapped function.
 */
const withPage = (browser) => async (fn) => {
	let page;
	try {
		page = await browser.newPage();
		await page.setViewport({ width: 1920, height: 1080});
		return await fn(page);
	} finally {
		if(page) await page.close();
	}
}



async function testEvaluators(request){

    await runTests(); // ACT test kasuak exekutatu eta emaitzak testResults.json fitxategian gorde.

    //await runErrorTests();

    //displayUncoveredSC(); // Testetan kontuan izaten EZ diren SC-ak lortzeko

    //countMultipleSCTests(); // SC bat baina gehiagoko zenbat test dauden kontatzeko.

    //getCombinations(); // Konbinaketa posibleak eta dagozkien emaitzak lortzeko.

    //getResultsByEvaluator(); // Ebaluatzaile bakoitzeko passed, failed eta untested kopuruak eta passed portzentaiak

    //getMinimumPassedValues(); // Passed kopurua minimoak betetzen dituzten testen kontaketa
    
}



function getMinimumPassedValues(){

    const atLeastAnd = {
        1:0,
        2:0,
        3:0,
        4:0,
        5:0,
        6:0
    }

    const atLeastOr = {
        1:0,
        2:0,
        3:0,
        4:0,
        5:0,
        6:0
    }

    for(const result of testResults){
        let passedCount = Object.values(result.testResults.and).filter(value => value === "passed").length;
        if (passedCount >= 1) {
            atLeastAnd[1]++;
        }
        if (passedCount >= 2) {
            atLeastAnd[2]++;
        }
        if (passedCount >= 3) {
            atLeastAnd[3]++;
        }
        if (passedCount >= 4) {
            atLeastAnd[4]++;
        }
        if (passedCount >= 5) {
            atLeastAnd[5]++;
        }
        if (passedCount == 6) {
            atLeastAnd[6]++;
        }

        passedCount = Object.values(result.testResults.or).filter(value => value === "passed").length;
        if (passedCount >= 1) {
            atLeastOr[1]++;
        }
        if (passedCount >= 2) {
            atLeastOr[2]++;
        }
        if (passedCount >= 3) {
            atLeastOr[3]++;
        }
        if (passedCount >= 4) {
            atLeastOr[4]++;
        }
        if (passedCount >= 5) {
            atLeastOr[5]++;
        }
        if (passedCount == 6) {
            atLeastOr[6]++;
        }
    }

    const testWithMinimumPassed = {
        "and": atLeastAnd,
        "or": atLeastOr
    }
    
    console.log(testWithMinimumPassed);

    fs.writeFile('./testCases/testWithMinimumPassed.json', JSON.stringify(testWithMinimumPassed, null, 2), err => {
        if (err) console.log('Error writing file', err)
    });

}



async function runTests(){
    
    const results = [];

    const errorTests = [];

    console.log("Initiating test cases...");

    for(let index = 0; index < actTestCases.testcases.length; index++){

        const test = actTestCases.testcases[index];

        if(test.ruleAccessibilityRequirements === null) continue;

        const criterias = [];

        Object.keys(test.ruleAccessibilityRequirements).forEach((criteria) => {
            const successCriterionNumber = criteria.split(':')[1];
            if (/^\d+\.\d+\.\d+$/.test(successCriterionNumber)) {
                criterias.push(successCriterionNumber);
            }
        });

        if(criterias.length === 0) continue;

        const testData = {
            testId: test.testcaseId,
            testResults: {
                and: {},
                or: {}
            },
            testResultsBySC: {}
        }

        const url = test.url;

        const testResultsByEvaluator = {};

        await Promise.all(["am", "ac", "mv", "a11y", "pa", "lh"].map(async (evaluator) => { 
            const tester =  new Tester(evaluator, criterias, test.expected);
        
            try{

                let result;

                switch (evaluator) {
                    case "lh":
                        await withBrowser(async (browser) => {
                            result = await tester.test({url}, null, browser);
                        });
                        break;
        
                    case "pa":
                        result = await tester.test({url});
                        break;
        
                    default:
                        await withBrowser(async (browser) => {
                            await withPage(browser)(async (page) => {
                                result = await tester.test({url}, page);
                            });
                        });
                        break;
                }

                testResultsByEvaluator[evaluator] = result;

            }catch(error){
                const untesteds = {};

                for(const criteria of criterias){
                    untesteds[criteria] = "untested";
                }

                testResultsByEvaluator[evaluator] = untesteds;

                const errorData = {
                    testIndex: index,
                    resultIndex: results.length,
                    evaluator
                };

                errorTests.push(errorData);

                console.log(errorData);

            }
        }));

        for (const evaluator in testResultsByEvaluator) {
            const results = testResultsByEvaluator[evaluator];

            testData.testResults.or[evaluator] = "untested";
            let andOutcome = "untested";

            for (const criteria in results) {
                const result = results[criteria];

                if(result === "passed" && andOutcome === "untested"){
                    andOutcome = "passed";
                }else if(result === "failed"){
                    andOutcome = "failed";
                }

                if(result === "passed" 
                ||(result === "failed" && testData.testResults.or[evaluator] !== "passed")){
                    testData.testResults.or[evaluator] = result;
                }

                if (!testData.testResultsBySC[criteria]) {
                    testData.testResultsBySC[criteria] = {};
                }

                testData.testResultsBySC[criteria][evaluator] = result;
            }

            testData.testResults.and[evaluator] = andOutcome;
        }

        results.push(testData);

        console.log(index);

    }

    fs.writeFile('./testCases/errorTests.json', JSON.stringify(errorTests, null, 2), err => {
		if (err) console.log('Error writing file', err)
	});

    // Emaitzak gorde.
    fs.writeFile('./testCases/testResults.json', JSON.stringify(results, null, 2), err => {
		if (err) console.log('Error writing file', err)
	});
}







async function runErrorTests(){

    const errTests = [];

    console.log("Initiating error test cases...");

    for(const errorData of errorTests){

        const test = actTestCases.testcases[errorData.testIndex];

        const resultIndex = errorData.resultIndex;

        const criterias = Object.keys(testResults[errorData.resultIndex].testResultsBySC);

        const url = test.url;

        const evaluator = errorData.evaluator;

        const tester =  new Tester(evaluator, criterias, test.expected);
    
        let results;

        try{

            switch (evaluator) {
                case "lh":
                    await withBrowser(async (browser) => {
                        results = await tester.test({url}, null, browser);
                    });
                    break;
    
                case "pa":
                    results = await tester.test({url});
                    break;
    
                default:
                    await withBrowser(async (browser) => {
                        await withPage(browser)(async (page) => {
                            results = await tester.test({url}, page);
                        });
                    });
                    break;
            }

        }catch(err){

            const newErrorData = errorData;

            newErrorData.testId = testResults[resultIndex].testId;

            errTests.push(newErrorData);

            console.log(newErrorData);

            continue;

        }

        testResults[resultIndex].testResults.or[evaluator] = "untested";

        let andOutcome = "untested";

        for (const criteria in results) {
            const result = results[criteria];

            if(result === "passed" && andOutcome === "untested"){
                andOutcome = "passed";
            }else if(result === "failed"){
                andOutcome = "failed";
            }

            if(result === "passed" 
            ||(result === "failed" && testResults[resultIndex].testResults.or[evaluator] !== "passed")){
                testResults[resultIndex].testResults.or[evaluator] = result;
            }

            testResults[resultIndex].testResultsBySC[criteria][evaluator] = result;
        }

        testResults[resultIndex].testResults.and[evaluator] = andOutcome;

        console.log(testResults[resultIndex]);

    }

    // Emaitzak gorde.
    fs.writeFile('./testCases/testResults.json', JSON.stringify(testResults, null, 2), err => {
		if (err) console.log('Error writing file', err)
	});

    fs.writeFile('./testCases/errorTests.json', JSON.stringify(errTests, null, 2), err => {
		if (err) console.log('Error writing file', err)
	});
}



function displayUncoveredSC(){

    const notTested = [];

    const testsSCCoverage = {};

    for(const criteria of successCriterias){

        const foundCases = actTestCases.testcases.filter((test) => {
            if(test.ruleAccessibilityRequirements === null) return false;

            const successCriteria = Object.keys(test.ruleAccessibilityRequirements);

            if(successCriteria.find((elem) => elem.split(':')[1] === criteria.num)) return true;
        });

        testsSCCoverage[criteria.num] = foundCases.length;

        if(foundCases.length === 0) notTested.push(criteria.num);

    }

    const coverage = {
        "totalSC": successCriterias.length,
        "occurrencesPerSC": testsSCCoverage,
        "totalUncoveredSC": notTested.length,
        "uncoveredSC": notTested
    };

    console.log(coverage);

    fs.writeFile('./testCases/testsCoverage.json', JSON.stringify(coverage, null, 2), err => {
		if (err) console.log('Error writing file', err)
	});
}



function countMultipleSCTests(){
    let cont = 0;

    for(const test of testResults){
        if(Object.keys(test.testResultsBySC).length > 1){
            cont++;
        }
    }

    console.log("\nTests with more than one SC: " + cont);
}

function getCombinations(){

    function getPassedCount(combination) {
        let count = 0;
        for (const test of testResults) {
            // Ondorengo lerroan filter barruan test.testResults.or[attr] edo test.testResults.and[attr] erabili lortu nahi den emaitzaren arabera.
            const passedValues = combination.filter(attr => test.testResults.or[attr] === "passed");
            if (passedValues.length >= 1) {
                count++;
            }
        }
        return count;
    }

    function getCombinations(arr, k) {
        const result = [];
        const combinations = [];
    
        generateCombinations(arr, k, 0, result, combinations);
    
        return combinations;
    }
    
    function generateCombinations(arr, k, start, result, combinations) {
        if (result.length === k) {
            combinations.push([...result]);
            return;
        }
    
        for (let i = start; i < arr.length; i++) {
            result.push(arr[i]);
            generateCombinations(arr, k, i + 1, result, combinations);
            result.pop();
        }
    }

    const attributeKeys = ["ac", "a11y", "pa", "mv", "am", "lh"];

    const combinationData = {
        "totalCombinations": 0,
        "combinations": []
    };

    let combinationsData = [];

    for (let i = 1; i <= attributeKeys.length; i++) {
        const combinations = getCombinations(attributeKeys, i);
        for (const combination of combinations) {
            const count = getPassedCount(combination);
            combinationsData.push({ combination, count });
        }
    }

    combinationsData.sort((a, b) => b.count - a.count);

    for (const data of combinationsData) {
        combinationData.combinations.push({
            "combination": data.combination,
            "passedTests": data.count
        });
    }

    combinationData.totalCombinations = combinationsData.length;

    console.log(combinationData);

    fs.writeFile('./testCases/combinationsOr.json', JSON.stringify(combinationData, null, 2), err => {
		if (err) console.log('Error writing file', err)
	});
}


function getResultsByEvaluator(){
    const resultsByEvaluator = {
        "and": {},
        "or": {}
    }

    for(const evaluator of ["a11y", "pa", "mv", "ac", "am", "lh"]){

        const andOutcomes = {
            passed: 0,
            failed: 0,
            untested: 0
        }

        const orOutcomes = {
            passed: 0,
            failed: 0,
            untested: 0
        }

        for(const result of testResults){
            andOutcomes[result.testResults.and[evaluator]]++;
            orOutcomes[result.testResults.or[evaluator]]++;
        }

        const andPassedPercent = andOutcomes.passed / (andOutcomes.passed + andOutcomes.failed);

        const orPassedPercent = orOutcomes.passed / (orOutcomes.passed + orOutcomes.failed);

        resultsByEvaluator.and[evaluator] = {
            "passedPercent": andPassedPercent,
            "outcomesCount": andOutcomes
        }

        resultsByEvaluator.or[evaluator] = {
            "passedPercent": orPassedPercent,
            "outcomesCount": orOutcomes
        }

    }

    console.log(resultsByEvaluator);
    
    fs.writeFile('./testCases/resultsByEvaluator.json', JSON.stringify(resultsByEvaluator, null, 2), err => {
		if (err) console.log('Error writing file', err)
	});
}


module.exports = (request) => testEvaluators(request)



const successCriterias = [
    {
        "num": "1.1.1",
        "id": "non-text-content",
        "conformanceLevel": "A"
    },
    {
        "num": "1.2.1",
        "id": "audio-only-and-video-only-prerecorded",
        "conformanceLevel": "A"
    },
    {
        "num": "1.2.2",
        "id": "captions-prerecorded",
        "conformanceLevel": "A"
    },
    {
        "num": "1.2.3",
        "id": "audio-description-or-media-alternative-prerecorded",
        "conformanceLevel": "A"
    },
    {
        "num": "1.2.4",
        "id": "captions-live",
        "conformanceLevel": "AA"
    },
    {
        "num": "1.2.5",
        "id": "audio-description-prerecorded",
        "conformanceLevel": "AA"
    },
    {
        "num": "1.2.6",
        "id": "sign-language-prerecorded",
        "conformanceLevel": "AAA"
    },
    {
        "num": "1.2.7",
        "id": "extended-audio-description-prerecorded",
        "conformanceLevel": "AAA"
    },
    {
        "num": "1.2.8",
        "id": "media-alternative-prerecorded",
        "conformanceLevel": "AAA"
    },
    {
        "num": "1.2.9",
        "id": "audio-only-live",
        "conformanceLevel": "AAA"
    },
    {
        "num": "1.3.1",
        "id": "info-and-relationships",
        "conformanceLevel": "A"
    },
    {
        "num": "1.3.2",
        "id": "meaningful-sequence",
        "conformanceLevel": "A"
    },
    {
        "num": "1.3.3",
        "id": "sensory-characteristics",
        "conformanceLevel": "A"
    },
    {
        "num": "1.3.4",
        "id": "orientation",
        "conformanceLevel": "AA"
    },
    {
        "num": "1.3.5",
        "id": "identify-input-purpose",
        "conformanceLevel": "AA"
    },
    {
        "num": "1.3.6",
        "id": "identify-purpose",
        "conformanceLevel": "AAA"
    },
    {
        "num": "1.4.1",
        "id": "use-of-color",
        "conformanceLevel": "A"
    },
    {
        "num": "1.4.2",
        "id": "audio-control",
        "conformanceLevel": "A"
    },
    {
        "num": "1.4.3",
        "id": "contrast-minimum",
        "conformanceLevel": "AA"
    },
    {
        "num": "1.4.4",
        "id": "resize-text",
        "conformanceLevel": "AA"
    },
    {
        "num": "1.4.5",
        "id": "images-of-text",
        "conformanceLevel": "AA"
    },
    {
        "num": "1.4.6",
        "id": "contrast-enhanced",
        "conformanceLevel": "AAA"
    },
    {
        "num": "1.4.7",
        "id": "low-or-no-background-audio",
        "conformanceLevel": "AAA"
    },
    {
        "num": "1.4.8",
        "id": "visual-presentation",
        "conformanceLevel": "AAA"
    },
    {
        "num": "1.4.9",
        "id": "images-of-text-no-exception",
        "conformanceLevel": "AAA"
    },
    { "num": "1.4.10", "id": "reflow", "conformanceLevel": "AA" },
    {
        "num": "1.4.11",
        "id": "non-text-contrast",
        "conformanceLevel": "AA"
    },
    {
        "num": "1.4.12",
        "id": "text-spacing",
        "conformanceLevel": "AA"
    },
    {
        "num": "1.4.13",
        "id": "content-on-hover-or-focus",
        "conformanceLevel": "AA"
    },
    { "num": "2.1.1", "id": "keyboard", "conformanceLevel": "A" },
    {
        "num": "2.1.2",
        "id": "no-keyboard-trap",
        "conformanceLevel": "A"
    },
    {
        "num": "2.1.3",
        "id": "keyboard-no-exception",
        "conformanceLevel": "AAA"
    },
    {
        "num": "2.1.4",
        "id": "character-key-shortcuts",
        "conformanceLevel": "A"
    },
    {
        "num": "2.2.1",
        "id": "timing-adjustable",
        "conformanceLevel": "A"
    },
    {
        "num": "2.2.2",
        "id": "pause-stop-hide",
        "conformanceLevel": "A"
    },
    {
        "num": "2.2.3",
        "id": "no-timing",
        "conformanceLevel": "AAA"
    },
    {
        "num": "2.2.4",
        "id": "interruptions",
        "conformanceLevel": "AAA"
    },
    {
        "num": "2.2.5",
        "id": "re-authenticating",
        "conformanceLevel": "AAA"
    },
    {
        "num": "2.2.6",
        "id": "timeouts",
        "conformanceLevel": "AAA"
    },
    {
        "num": "2.3.1",
        "id": "three-flashes-or-below-threshold",
        "conformanceLevel": "A"
    },
    {
        "num": "2.3.2",
        "id": "three-flashes",
        "conformanceLevel": "AAA"
    },
    {
        "num": "2.3.3",
        "id": "animation-from-interactions",
        "conformanceLevel": "AAA"
    },
    {
        "num": "2.4.1",
        "id": "bypass-blocks",
        "conformanceLevel": "A"
    },
    {
        "num": "2.4.2",
        "id": "page-titled",
        "conformanceLevel": "A"
    },
    {
        "num": "2.4.3",
        "id": "focus-order",
        "conformanceLevel": "A"
    },
    {
        "num": "2.4.4",
        "id": "link-purpose-in-context",
        "conformanceLevel": "A"
    },
    {
        "num": "2.4.5",
        "id": "multiple-ways",
        "conformanceLevel": "AA"
    },
    {
        "num": "2.4.6",
        "id": "headings-and-labels",
        "conformanceLevel": "AA"
    },
    {
        "num": "2.4.7",
        "id": "focus-visible",
        "conformanceLevel": "AA"
    },
    {
        "num": "2.4.8",
        "id": "location",
        "conformanceLevel": "AAA"
    },
    {
        "num": "2.4.9",
        "id": "link-purpose-link-only",
        "conformanceLevel": "AAA"
    },
    {
        "num": "2.4.10",
        "id": "section-headings",
        "conformanceLevel": "AAA"
    },
    {
        "num": "2.5.1",
        "id": "pointer-gestures",
        "conformanceLevel": "A"
    },
    {
        "num": "2.5.2",
        "id": "pointer-cancellation",
        "conformanceLevel": "A"
    },
    {
        "num": "2.5.3",
        "id": "label-in-name",
        "conformanceLevel": "A"
    },
    {
        "num": "2.5.4",
        "id": "motion-actuation",
        "conformanceLevel": "A"
    },
    {
        "num": "2.5.5",
        "id": "target-size",
        "conformanceLevel": "AAA"
    },
    {
        "num": "2.5.6",
        "id": "concurrent-input-mechanisms",
        "conformanceLevel": "AAA"
    },
    {
        "num": "3.1.1",
        "id": "language-of-page",
        "conformanceLevel": "A"
    },
    {
        "num": "3.1.2",
        "id": "language-of-parts",
        "conformanceLevel": "AA"
    },
    {
        "num": "3.1.3",
        "id": "unusual-words",
        "conformanceLevel": "AAA"
    },
    {
        "num": "3.1.4",
        "id": "abbreviations",
        "conformanceLevel": "AAA"
    },
    {
        "num": "3.1.5",
        "id": "reading-level",
        "conformanceLevel": "AAA"
    },
    {
        "num": "3.1.6",
        "id": "pronunciation",
        "conformanceLevel": "AAA"
    },
    { "num": "3.2.1", "id": "on-focus", "conformanceLevel": "A" },
    { "num": "3.2.2", "id": "on-input", "conformanceLevel": "A" },
    {
        "num": "3.2.3",
        "id": "consistent-navigation",
        "conformanceLevel": "AA"
    },
    {
        "num": "3.2.4",
        "id": "consistent-identification",
        "conformanceLevel": "AA"
    },
    {
        "num": "3.2.5",
        "id": "change-on-request",
        "conformanceLevel": "AAA"
    },
    {
        "num": "3.3.1",
        "id": "error-identification",
        "conformanceLevel": "A"
    },
    {
        "num": "3.3.2",
        "id": "labels-or-instructions",
        "conformanceLevel": "A"
    },
    {
        "num": "3.3.3",
        "id": "error-suggestion",
        "conformanceLevel": "AA"
    },
    {
        "num": "3.3.4",
        "id": "error-prevention-legal-financial-data",
        "conformanceLevel": "AA"
    },
    { "num": "3.3.5", "id": "help", "conformanceLevel": "AAA" },
    {
        "num": "3.3.6",
        "id": "error-prevention-all",
        "conformanceLevel": "AAA"
    },
    { "num": "4.1.1", "id": "parsing", "conformanceLevel": "A" },
    {
        "num": "4.1.2",
        "id": "name-role-value",
        "conformanceLevel": "A"
    },
    {
        "num": "4.1.3",
        "id": "status-messages",
        "conformanceLevel": "AA"
    }
];