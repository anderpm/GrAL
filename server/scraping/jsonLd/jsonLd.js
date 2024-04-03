

class JsonLd{
    
    #jsonld; 
    #evaluator;
    #lock;

    constructor(evaluator, evaluationScope){

        this.#lock = false;

        const url = new URL(evaluationScope[0].url);
        const webSite = url.origin + "/";

        const evaluators = {
            "mv": { "name": "MAUVE", "url": "https://mauve.isti.cnr.it/singleValidation.jsp"},
            "am": { "name": "AccessMonitor", "url": "https://accessmonitor.acessibilidade.gov.pt"},
            "ac": { "name": "AChecker", "url": "https://achecker.achecks.ca/checker/index.php"},
            "pa": { "name": "Pa11y", "url": "https://github.com/pa11y/pa11y"},
            "a11y": { "name": "A11Y", "url": "https://github.com/ainspector/a11y-evaluation-library"},
            "lh": { "name": "Lighthouse", "url": "https://github.com/GoogleChrome/lighthouse#readme"},
            "wv": { "name": "WAVE", "url": "https://wave.webaim.org"},
            "tv": { "name": "Total Validator", "url": "https://www.totalvalidator.com/index.html"}
        };
        this.#evaluator = evaluators[evaluator];

        this.#jsonld = {

            "@context": this.#context,

            "type": "Evaluation",
            "@language": "en",
            "title": "Accessibility Evaluation Report for " + webSite + " website",
            "commissioner": "https://github.com/larraagirrejulen/GrAL/tree/main/ac_check%20(react)",
            "dct:date": new Date().toLocaleString(),

            "assertors": [{
                "id": "_:" + this.#evaluator.name,
                "type": "earl:Assertor",
                "xmlns:name": this.#evaluator.name,
                "description": this.#evaluator.url
            }],

            "creator": {
                "id": "_:assertors",
                "xmlns:name": this.#evaluator.name
            },
    
            "evaluationScope":
            {
                "website":
                {
                    "id": "_:website",
                    "type": [
                        "earl:TestSubject",
                        "sch:WebSite"
                    ],
                    "siteName": webSite,
                    "siteScope": evaluationScope.map(obj => obj.url).join(', ')
                },
                "conformanceTarget": "wai:WCAG2AAA-Conformance",
                "accessibilitySupportBaseline": "Google Chrome latest version",
                "additionalEvalRequirement": "The report will include location pointers to the cases found for each result"
            },
    
            "structuredSample":
            {
                "webpage": []
            },
    
            "auditSample": []
        };

        for(const webPage of evaluationScope){
            this.#jsonld.structuredSample.webpage.push({
                "id": webPage.url,
                "type": ["earl:TestSubject", "sch:WebPage"],
                "description": webPage.url,
                "source": "_:website",
                "title": webPage.name,
                "tested": true
            });
        }

        for (const key in this.#successCriterias){
            this.#jsonld.auditSample.push(
                {
                    "type": "Assertion",
                    "test": "wcag2:" + this.#successCriterias[key].id,
                    "conformanceLevel": this.#successCriterias[key].conformanceLevel,
                    "subject": "_:website",
                    "result":
                    {
                        "outcome": "earl:untested",
                        "description": ""
                    },
                    "hasPart": []
                }
            );
        };
    }




    async addNewAssertion(criteriaNumber, newOutcome, newDescription, webPageURL, path = null, html = null, documentationUrl=null){

        let assertorDescription = newDescription.replaceAll('<','&lt;').replaceAll('>','&gt;');
        assertorDescription.replaceAll('&lt;','<pre>&lt;').replaceAll('&gt;','&gt;</pre>');

        while (this.#lock) {
            await new Promise(resolve => setTimeout(resolve, 100)); // Wait for a short period
        }

        try{
            this.#lock = true;

            const criteriaId = this.#successCriterias[criteriaNumber].id;
            let docUrl = documentationUrl;
            if(docUrl === null){
                docUrl = "https://www.w3.org/TR/WCAG21/#" + criteriaId
            }
            const webSiteAssertion = this.#jsonld.auditSample.find(siteAssertion => siteAssertion.test === "wcag2:" + criteriaId);

            const outcomeDescriptions = {
                "earl:passed": ["No violations found", "PASSED:"],
                "earl:failed": ["Found a violation ...", "An ERROR was found:"],
                "earl:cantTell": ["Found possible applicable issue, but not sure...", "A POSSIBLE ISSUE was found:"],
                "earl:inapplicable": ["SC is not applicable", "Cannot apply:"]
            };

            function newGeneralOutcome(){
                webSiteAssertion.result.outcome = newOutcome;
                webSiteAssertion.result.description = outcomeDescriptions[newOutcome][0];
            }

            switch (webSiteAssertion.result.outcome) {  // Current general outcome
                case "earl:untested":
                    newGeneralOutcome();
                    webSiteAssertion.assertedBy = "_:" + this.#evaluator.name;
                    webSiteAssertion.mode = "earl:automatic";
                    break;  
                case "earl:inapplicable":
                    if(newOutcome !== "earl:inapplicable" || newOutcome !== "earl:untested"){
                        newGeneralOutcome();
                    }
                    break;  
                case "earl:passed":
                    if(newOutcome === "earl:cantTell" || newOutcome === "earl:failed"){
                        newGeneralOutcome();
                    }
                    break;
                case "earl:cantTell":
                    if(newOutcome === "earl:failed"){
                        newGeneralOutcome();
                    }
                    break;
                default:
            }
            
            const locationPointersGroup = [];
            let description = "*************@" + this.#evaluator.name + "************* \n\n"
            description += outcomeDescriptions[newOutcome][1] + "\n\n" + newDescription;
            description += "\n\n [Success criteria documentation](https://www.w3.org/TR/WCAG21/#" + criteriaId +")";

            const webPageAssertion = webSiteAssertion.hasPart.find(pageAssertion => pageAssertion.subject === webPageURL && pageAssertion.result.outcome === newOutcome);

            if(path){

                let innerText;

                let correctedHtml = html.replace(/[\n\t]/g, '').replace(/\"/g, "'").replace(/\n\s*/g, '');            

                if(correctedHtml.indexOf(">") > -1){

                    if(html.indexOf("</") > -1){
                        innerText = html.substring(html.indexOf(">")+1, html.indexOf("</"));
                    }

                    if(correctedHtml.substring(0, correctedHtml.indexOf(">")+1).indexOf(" ")>0){
                        correctedHtml = correctedHtml.substring(0, correctedHtml.indexOf(">")+1);
                    }
                }

                const newPointer = {
                    "id": "_:pointer",
                    "type": "ptr:groupPointer",
                    "assertedBy": [this.#evaluator.name],
                    "ptr:expression": path, 
                    "description": correctedHtml,
                    "innerText": innerText,
                    "documentation": docUrl
                };

                if(webPageAssertion){

                    if(webPageAssertion.result.locationPointersGroup.every(pointer => pointer["ptr:expression"] !== path) 
                    && webPageAssertion.result.locationPointersGroup.length < 30
                    && webPageAssertion.result.locationPointersGroup.every(pointer => pointer.description !== correctedHtml)){

                        if(docUrl.startsWith("https://www.w3.org/TR/WCAG21/")){
                            webPageAssertion.result.description += "\n " + path;
                        }else{
                            // webPageAssertion.result.description += "\n [" + path + "](" + docUrl + ")";
                            
                            var temp = webPageAssertion.result.description;
                            var count = (temp.match(/Instance/g) || []).length + 1;

                            webPageAssertion.result.description += "\n [" + "Instance " + count + "](" + docUrl + ") \n";
                        }
                        
                        webPageAssertion.result.locationPointersGroup.push(newPointer);
                    }
                    return;
                }

                if(docUrl.startsWith("https://www.w3.org/TR/WCAG21/")){
                    description += "\n\n Found cases locations: \n\n " + path;
                }else{
                    // description += "\n\n Found cases locations: \n\n [" + path + "](" + docUrl + ")";

                    var temp = description;
                    var count = (temp.match(/Instance/g) || []).length + 1;

                    description += "\n\n Found cases locations: \n\n [" + "Instance " + count + "](" + docUrl + ") \n";
                }
                
                locationPointersGroup.push(newPointer);

            }else if (webPageAssertion) return;

            /* webSiteAssertion.hasPart.push({
                "type": "Assertion",
                "testcase": "wcag2:" + criteriaId,
                "assertedBy": [{
                    "assertor": this.#evaluator.name, 
                    "description": assertorDescription,
                    "modifiedBy": [],
                    "lastModifier": "",
                }],
                "subject": webPageURL,
                "mode": "earl:automatic",
                "result":
                {
                    "outcome": newOutcome,
                    "description": description,
                    "locationPointersGroup": locationPointersGroup
                }
            }); */


            // Copiar el array antes de agregar el nuevo elemento
            const newArray = [...webSiteAssertion.hasPart];

            // Agregar al array
            newArray.push({
                "type": "Assertion",
                "testcase": "wcag2:" + criteriaId,
                "assertedBy": [{
                    "assertor": this.#evaluator.name, 
                    "description": assertorDescription,
                    "modifiedBy": [],
                    "lastModifier": "",
                }],
                "subject": webPageURL,
                "mode": "earl:automatic",
                "result":
                {
                    "outcome": newOutcome,
                    "description": description,
                    "locationPointersGroup": locationPointersGroup
                }
            });

            if(criteriaId=="non-text-content"){
                // Ordenar el nuevo array según el orden específico
                newArray.sort((a, b) => {
                    const order = {
                        "earl:failed": 3,
                        "earl:cantTell": 2,
                        "earl:inapplicable": 1,
                        "earl:passed": 0
                    };

                    const outcomeA = a.result.outcome
                    const outcomeB = b.result.outcome

                    return order[outcomeA] - order[outcomeB];
                });
            }else{
                // Ordenar el nuevo array según el orden específico
                newArray.sort((a, b) => {
                    const order = {
                        "earl:failed": 0,
                        "earl:cantTell": 1,
                        "earl:inapplicable": 2,
                        "earl:passed": 3
                    };

                    const outcomeA = a.result.outcome
                    const outcomeB = b.result.outcome

                    return order[outcomeA] - order[outcomeB];
                });
            }

            // Imprimir resultados para verificar el orden
            console.log(criteriaId);
            console.log(newArray.map(item => item.result.outcome));

            // Asignar el nuevo array al objeto original
            webSiteAssertion.hasPart = newArray;

        }finally{
            this.#lock = false;
        }
        
        
    }




    getJsonLd(){

        if(this.#jsonld.auditSample.find(assertion => assertion.result.outcome == "earl:failed")){
            this.#jsonld["dct:summary"] = "Some errors where found..."
        } else{
            this.#jsonld["dct:summary"] = "No errors where found!!!"
        }
        return this.#jsonld;
    }




    #context = {
        "@vocab": "http://www.w3.org/TR/WCAG-EM/#",
        "wcag2": "http://www.w3.org/TR/WCAG21/#",
        "earl": "http://www.w3.org/ns/earl#",
        "dct": "http://purl.org/dc/terms/",
        "wai": "http://www.w3.org/WAI/",
        "sch": "http://schema.org/",
        "xmlns": "http://xmlns.com/foaf/0.1/",
        "ptr": "http://www.w3.org/2009/pointers#",
        
        "evaluationScope": { 
            "@id": "step1",
            "@type": "EvaluationScope"
        },
        "siteScope": "step1a",
        "conformanceTarget": { "@id": "step1b", "@type": "@id" },
        "accessibilitySupportBaseline": "step1c",
        "additionalEvalRequirement": "step1d",
        "structuredSample": {
            "@id": "step3a",
            "@type": "Sample"
        },
        "auditSample": "step4",

        "siteName": "sch:name",
        "website": "wcag2:dfn-set-of-web-pages",
        "webpage": "wcag2:dfn-web-page-s",

        "Assertion": "earl:Assertion",
        "test":
        {
            "@id": "earl:test",
            "@type": "@id"
        },
        "assertedBy":
        {
            "@id": "earl:assertedBy",
            "@type": "@id"
        },
        "subject":
        {
            "@id": "earl:subject",
            "@type": "@id"
        },
        "result": "earl:result",
        "mode":
        {
            "@id": "earl:mode",
            "@type": "@id"
        },
        "outcome":
        {
            "@id": "earl:outcome",
            "@type": "@id"
        },

        "locationPointersGroup": "ptr:PointersGroup",
        "elementPointersGroup": "ptr:PointersGroup",

        "title": "dct:title",
        "description": "dct:description",
        "hasPart": "dct:hasPart",
        "creator":
        {
            "@id": "dct:creator",
            "@type": "earl:Assertor"
        },

        "id": "@id",
        "type": "@type"
    };

    #successCriterias = { 
        "1.1.1": {
            "id": "non-text-content",
            "conformanceLevel": "A"
        },
        "1.2.1": {
            "id": "audio-only-and-video-only-prerecorded",
            "conformanceLevel": "A"
        },
        "1.2.2": {
            "id": "captions-prerecorded",
            "conformanceLevel": "A"
        },
        "1.2.3": {
            "id": "audio-description-or-media-alternative-prerecorded",
            "conformanceLevel": "A"
        },
        "1.2.4": {
            "id": "captions-live",
            "conformanceLevel": "AA"
        },
        "1.2.5": {
            "id": "audio-description-prerecorded",
            "conformanceLevel": "AA"
        },
        "1.2.6": {
            "id": "sign-language-prerecorded",
            "conformanceLevel": "AAA"
        },
        "1.2.7": {
            "id": "extended-audio-description-prerecorded",
            "conformanceLevel": "AAA"
        },
        "1.2.8": {
            "id": "media-alternative-prerecorded",
            "conformanceLevel": "AAA"
        },
        "1.2.9": {
            "id": "audio-only-live",
            "conformanceLevel": "AAA"
        },
        "1.3.1": {
            "id": "info-and-relationships",
            "conformanceLevel": "A"
        },
        "1.3.2": {
            "id": "meaningful-sequence",
            "conformanceLevel": "A"
        },
        "1.3.3": {
            "id": "sensory-characteristics",
            "conformanceLevel": "A"
        },
        "1.3.4": {
            "id": "orientation",
            "conformanceLevel": "AA"
        },
        "1.3.5": {
            "id": "identify-input-purpose",
            "conformanceLevel": "AA"
        },
        "1.3.6": {
            "id": "identify-purpose",
            "conformanceLevel": "AAA"
        },
        "1.4.1": {
            "id": "use-of-color",
            "conformanceLevel": "A"
        },
        "1.4.2": {
            "id": "audio-control",
            "conformanceLevel": "A"
        },
        "1.4.3": {
            "id": "contrast-minimum",
            "conformanceLevel": "AA"
        },
        "1.4.4": {
            "id": "resize-text",
            "conformanceLevel": "AA"
        },
        "1.4.5": {
            "id": "images-of-text",
            "conformanceLevel": "AA"
        },
        "1.4.6": {
            "id": "contrast-enhanced",
            "conformanceLevel": "AAA"
        },
        "1.4.7": {
            "id": "low-or-no-background-audio",
            "conformanceLevel": "AAA"
        },
        "1.4.8": {
            "id": "visual-presentation",
            "conformanceLevel": "AAA"
        },
        "1.4.9": {
            "id": "images-of-text-no-exception",
            "conformanceLevel": "AAA"
        },
        "1.4.10": { "id": "reflow", "conformanceLevel": "AA" },
        "1.4.11": {
            "id": "non-text-contrast",
            "conformanceLevel": "AA"
        },
        "1.4.12": {
            "id": "text-spacing",
            "conformanceLevel": "AA"
        },
        "1.4.13": {
            "id": "content-on-hover-or-focus",
            "conformanceLevel": "AA"
        },
        "2.1.1": { "id": "keyboard", "conformanceLevel": "A" },
        "2.1.2": {
            "id": "no-keyboard-trap",
            "conformanceLevel": "A"
        },
        "2.1.3": {
            "id": "keyboard-no-exception",
            "conformanceLevel": "AAA"
        },
        "2.1.4": {
            "id": "character-key-shortcuts",
            "conformanceLevel": "A"
        },
        "2.2.1": {
            "id": "timing-adjustable",
            "conformanceLevel": "A"
        },
        "2.2.2": {
            "id": "pause-stop-hide",
            "conformanceLevel": "A"
        },
        "2.2.3": {
            "id": "no-timing",
            "conformanceLevel": "AAA"
        },
        "2.2.4": {
            "id": "interruptions",
            "conformanceLevel": "AAA"
        },
        "2.2.5": {
            "id": "re-authenticating",
            "conformanceLevel": "AAA"
        },
        "2.2.6": {
            "id": "timeouts",
            "conformanceLevel": "AAA"
        },
        "2.3.1": {
            "id": "three-flashes-or-below-threshold",
            "conformanceLevel": "A"
        },
        "2.3.2": {
            "id": "three-flashes",
            "conformanceLevel": "AAA"
        },
        "2.3.3": {
            "id": "animation-from-interactions",
            "conformanceLevel": "AAA"
        },
        "2.4.1": {
            "id": "bypass-blocks",
            "conformanceLevel": "A"
        },
        "2.4.2": {
            "id": "page-titled",
            "conformanceLevel": "A"
        },
        "2.4.3": {
            "id": "focus-order",
            "conformanceLevel": "A"
        },
        "2.4.4": {
            "id": "link-purpose-in-context",
            "conformanceLevel": "A"
        },
        "2.4.5": {
            "id": "multiple-ways",
            "conformanceLevel": "AA"
        },
        "2.4.6": {
            "id": "headings-and-labels",
            "conformanceLevel": "AA"
        },
        "2.4.7": {
            "id": "focus-visible",
            "conformanceLevel": "AA"
        },
        "2.4.8": {
            "id": "location",
            "conformanceLevel": "AAA"
        },
        "2.4.9": {
            "id": "link-purpose-link-only",
            "conformanceLevel": "AAA"
        },
        "2.4.10": {
            "id": "section-headings",
            "conformanceLevel": "AAA"
        },
        "2.5.1": {
            "id": "pointer-gestures",
            "conformanceLevel": "A"
        },
        "2.5.2": {
            "id": "pointer-cancellation",
            "conformanceLevel": "A"
        },
        "2.5.3": {
            "id": "label-in-name",
            "conformanceLevel": "A"
        },
        "2.5.4": {
            "id": "motion-actuation",
            "conformanceLevel": "A"
        },
        "2.5.5": {
            "id": "target-size",
            "conformanceLevel": "AAA"
        },
        "2.5.6": {
            "id": "concurrent-input-mechanisms",
            "conformanceLevel": "AAA"
        },
        "3.1.1": {
            "id": "language-of-page",
            "conformanceLevel": "A"
        },
        "3.1.2": {
            "id": "language-of-parts",
            "conformanceLevel": "AA"
        },
        "3.1.3": {
            "id": "unusual-words",
            "conformanceLevel": "AAA"
        },
        "3.1.4": {
            "id": "abbreviations",
            "conformanceLevel": "AAA"
        },
        "3.1.5": {
            "id": "reading-level",
            "conformanceLevel": "AAA"
        },
        "3.1.6": {
            "id": "pronunciation",
            "conformanceLevel": "AAA"
        },
        "3.2.1": { "id": "on-focus", "conformanceLevel": "A" },
        "3.2.2": { "id": "on-input", "conformanceLevel": "A" },
        "3.2.3": {
            "id": "consistent-navigation",
            "conformanceLevel": "AA"
        },
        "3.2.4": {
            "id": "consistent-identification",
            "conformanceLevel": "AA"
        },
        "3.2.5": {
            "id": "change-on-request",
            "conformanceLevel": "AAA"
        },
        "3.3.1": {
            "id": "error-identification",
            "conformanceLevel": "A"
        },
        "3.3.2": {
            "id": "labels-or-instructions",
            "conformanceLevel": "A"
        },
        "3.3.3": {
            "id": "error-suggestion",
            "conformanceLevel": "AA"
        },
        "3.3.4": {
            "id": "error-prevention-legal-financial-data",
            "conformanceLevel": "AA"
        },
        "3.3.5": { "id": "help", "conformanceLevel": "AAA" },
        "3.3.6": {
            "id": "error-prevention-all",
            "conformanceLevel": "AAA"
        },
        "4.1.1": { "id": "parsing", "conformanceLevel": "A" },
        "4.1.2": {
            "id": "name-role-value",
            "conformanceLevel": "A"
        },
        "4.1.3": {
            "id": "status-messages",
            "conformanceLevel": "AA"
        }
    };

}



if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = JsonLd;
}


