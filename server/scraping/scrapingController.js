
const puppeteer = require('puppeteer');
const Scraper = require('./scraper');
const mergeJsonLds = require('./jsonLd/jsonLdUtils');
const JsonLd = require('./jsonLd/jsonLd');
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


/**
 * Scrapes the selected webpages based on the request object.
 * 
 * @function scrapeSelected
 * @param {Object} request - The request object that contains the selected evaluators, the url and the title of the page to evaluate.
 * @returns {Promise} - A promise that resolves with the JSON stringified version of the merged scraped reports.
 */
async function scrapeSelected(request){

	const activeEvaluators = ["am", "ac", "mv", "a11y", "pa", "lh", "wv"].filter((evaluator) => request[evaluator]);

	console.time('Execution Time');

	const results = await Promise.all(activeEvaluators.map(async (evaluator) => {

		console.log("\nInitiating " + evaluator.toUpperCase() + " scraping process ...");

		const jsonLd = new JsonLd(evaluator, request.scope);
		const scraper =  new Scraper(evaluator, jsonLd);

		switch (evaluator) {
			case "lh":
				await withBrowser(async (browser) => {
					for(const webPage of request.scope){
						await scraper.performScraping(webPage, null, browser);
					}
				});
			  	break;

			case "pa":
			  	await Promise.all(request.scope.map(async (webPage) => {
					await scraper.performScraping(webPage);
				}));
			 	break;

			default:
				await withBrowser(async (browser) => {
					await Promise.all(request.scope.map(async (webPage) => {
						await withPage(browser)(async (page) => {
							await scraper.performScraping(webPage, page);
						});
					}));
				});
				break;
		}

		console.log(`\n${evaluator.toUpperCase()} scraping successfully finished !!!`);

		return jsonLd.getJsonLd();

	}));

	console.timeEnd('Execution Time');

	for(let i = 1; i<results.length; i++){
		mergeJsonLds(results[0], results[i]);
	}

	/*fs.writeFile('./resultData.json', JSON.stringify(results[0], null, 2), err => {
		if (err) console.log('Error writing file', err)
	});*/

	return JSON.stringify(results[0]);
}


module.exports = (request) => scrapeSelected(request)