import React from 'react';

import '../../../styles/sections/resultSection/summaryTable.scss';

import { useState, useEffect} from "react";
import { OutcomeHeaders } from './ResultsTable';

import { getFromChromeStorage } from '../../../scripts/utils/chromeUtils';


/**
 * Component for displaying the summary table of website and webpage outcomes.
 * @param {Object} conformanceLevels - The conformance levels.
 * @returns {JSX.Element} SummaryTable component.
 */
export default function SummaryTable({conformanceLevels}:any){

    const [webSiteOutcomes, setWebSiteOutcomes] = useState([0, 0, 0, 0, 0]);
    const [siteSummary, setSiteSummary] = useState(null);
    
    const [webPageOutcomes, setWebPageOutcomes] = useState([0, 0, 0, 0, 0]);
    const [pageSummaries, setPageSummaries] = useState(null);

    const [webpage, setWebpage] = useState(null);

    const [activeTab, setActiveTab] = useState('website');

    /**
     * Counts the outcomes based on the summary and updates the state.
     * @param {Object} summary - The summary object.
     * @param {function} setOutcomes - The state setter function.
     */
    const countOutcomes = (summary:any, setOutcomes:any) => {
        let outcomes = [0, 0, 0, 0, 0];
        for(const conformanceLevel of conformanceLevels){
            outcomes[0] += summary["earl:passed"][conformanceLevel];
            outcomes[1] += summary["earl:failed"][conformanceLevel];
            outcomes[2] += summary["earl:cantTell"][conformanceLevel];
            outcomes[3] += summary["earl:inapplicable"][conformanceLevel];
            outcomes[4] += summary["earl:untested"][conformanceLevel];
        }
        setOutcomes(outcomes);
    };

    useEffect(() => { 
        getFromChromeStorage(window.location.hostname + ".siteSummary", false)
        .then( value => value != null && setSiteSummary(JSON.parse(value)) );
        getFromChromeStorage(window.location.hostname + ".pageSummaries", false)
        .then( value => value != null && setPageSummaries(JSON.parse(value)) );
    },[]);

    useEffect(() => { 
        if(siteSummary){
            countOutcomes(siteSummary, setWebSiteOutcomes);
        }
        if(pageSummaries){

            let scope:any = localStorage.getItem("scope");

            scope = JSON.parse(scope);

            const currentWebpage:any = scope.find((elem:any) => elem.url === window.location.href)

            setWebpage(currentWebpage ? currentWebpage.name : null)

            const webPageSummary = pageSummaries[window.location.href];
            
            if(webPageSummary){
                countOutcomes(webPageSummary, setWebPageOutcomes);
            }
            
        }
    },[conformanceLevels, siteSummary, pageSummaries]);

    return(
        <div id="evaluationSummary">

            <p>Current Site/Page summary:</p>
            <div className="tabs">
                <div
                    className={activeTab === 'website' ? 'active' : ''}
                    onClick={() => setActiveTab('website')}
                    style={{width: "90px"}}
                >
                    Website
                </div>
                <div
                    className={activeTab === 'webpage' ? 'active' : ''}
                    onClick={() => setActiveTab('webpage')}
                    style={{width: "136px"}}
                >
                    {pageSummaries && pageSummaries[window.location.href] && webpage ? 
                        webpage
                    : "Current webpage"}
                </div>
            </div>

            {activeTab === 'website' && (<>
                <table id="summaryTable">
                    <tr> <OutcomeHeaders /> </tr>
                    <tr> {webSiteOutcomes.map((count:any) => ( <td>{count}</td> ))} </tr>
                </table>
            </>)}

            {activeTab === 'webpage' && (<>
                {pageSummaries && pageSummaries[window.location.href] ? (
                    <table id="summaryTable">
                        <tr> <OutcomeHeaders /> </tr>
                        <tr> {webPageOutcomes.map((count:any) => ( <td>{count}</td> ))} </tr>
                    </table>
                ) : (
                    <div style={{ textAlign: 'center', padding: '15px 0' }}>
                        Current webpage has not been evaluated
                    </div>
                )}
            </>)}

        </div>
    );
}
