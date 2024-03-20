import React from 'react';

import '../../../styles/sections/resultSection/overallTable.scss';

import { useState, useEffect} from "react";
import parse from 'html-react-parser';
import Button from '../../reusables/Button';

import { blackListElement, getFromChromeStorage, getImgSrc, removeFromChromeStorage } from '../../../scripts/utils/chromeUtils.js';
import { getElementByPath, collapsibleClickHandler } from '../../../scripts/utils/moreUtils.js';
import { highlightElement, selectHighlightedElement, unselectHighlightedElement } from '../../../scripts/utils/highlightUtils.js';
import { mapReportData } from '../../../scripts/mapReportData';
import { getSuccessCriterias } from '../../../scripts/utils/wcagUtils';
import { loadReport } from '../../../scripts/reportLoadingOptions';

import extendedArrow from '../../../images/extendedArrow.png';
import contractedArrow from '../../../images/contractedArrow.png';
import edit from '../../../images/edit.png';
import remove from '../../../images/remove.png';
import blacklist from '../../../images/blacklist.png';
import { isLabelWithInternallyDisabledControl } from '@testing-library/user-event/dist/utils';


const outcome2Background:any = {
    "earl:passed": {backgroundColor: "#C8FA8C"},
    "earl:failed": {backgroundColor: "#FA8C8C"},
    "earl:cantTell": {backgroundColor: "#F5FA8C"},
    "earl:inapplicable": {backgroundColor: "#FFFFFF"},
    "earl:untested": {backgroundColor: "#8CFAFA"}
}

const outcome2Description:any = {
    "earl:passed": ["No violations found", "PASSED:"],
    "earl:failed": ["Found a violation ...", "An ERROR was found:"],
    "earl:cantTell": ["Found possible applicable issue, but not sure...", "A POSSIBLE ISSUE was found:"],
    "earl:inapplicable": ["SC is not applicable", "Cannot apply:"]
};

const wcagCriterias = getSuccessCriterias();


/**
 * OverallTable component displays the evaluation results in a table format.
 * @param {Object} conformanceLevels - Object containing the conformance levels.
 * @returns {JSX.Element|null} - JSX element representing the OverallTable component.
 */
export default function OverallTable({conformanceLevels}:any): JSX.Element {

    const [mantainExtended, setMantainExtended] = useState(false);
    const [pageSummaries, setPageSummaries] = useState(null);
    const [overallResultData, setOverallResultData] = useState<GroupedElements[]>([]);
    const [selectedOverallResults, setSelectedOverallResults] = useState(Array(overallResultData.length).fill(false));

    interface Element {
        path: string;
        doc: string;
        assertedBy: any[];
        criteria: string;
        outcome: string;
    }

    interface OutcomeElement {
        outcome : string;
        outcomeElems : Element[];
    }
    
    interface GroupedElements {
        html: string;
        elems: OutcomeElement[];
    }
    
    function compareOutcomes(a: OutcomeElement, b: OutcomeElement): number {
        const outcomes = ["failed", "cantTell", "passed", "inapplicable", "untested"];
        return outcomes.indexOf(a.outcome) - outcomes.indexOf(b.outcome);
    }

    /**
     * useEffect hook to handle component initialization and state updates.
     */
    useEffect(() => {
        (async ()=>{
            const update = await getFromChromeStorage("blackListUpdated");
            if(update){
                removeFromChromeStorage("blackListUpdated", true);
                mapReportData();
            }
        })();

        getFromChromeStorage("mantainExtended")
        .then( value => {
            if(value != null) setMantainExtended(value) 
        });

        getFromChromeStorage(window.location.hostname + ".pageSummaries", false)
        .then( value => value != null && setPageSummaries(JSON.parse(value)) );

        getFromChromeStorage(window.location.hostname + ".overallResultData", false)
        .then( value => {
            if(value != null){
                const data = JSON.parse(value);
                const groupedElements: { [html: string]: GroupedElements } = {};

                for(var i = 0; i < conformanceLevels.length; i++){
                    let clgrElement = data[i];
                    clgrElement.elemsCL.map((elements2:any) => {
                        const html = elements2.html;
                        const elements = elements2.elems;
                        if (groupedElements.hasOwnProperty(html)) {
                            elements.forEach((element: OutcomeElement) => {
                                const existingOutcome = groupedElements[html].elems.find(e => e.outcome === element.outcome);
                                if (existingOutcome) {
                                    existingOutcome.outcomeElems.push(...element.outcomeElems);
                                } else {
                                    groupedElements[html].elems.push(element);
                                }
                            });
                        } else {
                            groupedElements[html] = { html, elems: elements };
                        }
                        groupedElements[html].elems.sort((a, b) => compareOutcomes(a, b));
                    });               
                }
                
                const newJsonData = Object.values(groupedElements);
                setOverallResultData(newJsonData);
            }
        });

        const storedValueOverall = sessionStorage.getItem("selectedOverallResults");
        if(storedValueOverall){
            setSelectedOverallResults(JSON.parse(storedValueOverall));
        }
    }, []);

    /**
     * useEffect hook to handle changes in selectedOverallResults state.
     * Updates the sessionStorage with the selectedOverallResults value and removes element highlights.
     */
    useEffect(() => {
        sessionStorage.setItem("selectedOverallResults", JSON.stringify(selectedOverallResults));
    }, [selectedOverallResults]);

    useEffect(() => {
        getFromChromeStorage(window.location.hostname + ".overallResultData", false)
        .then( value => {
            if(value != null){
                const data = JSON.parse(value);
                const groupedElements: { [html: string]: GroupedElements } = {};

                for(var i = 0; i < conformanceLevels.length; i++){
                    let clgrElement = data[i];
                    clgrElement.elemsCL.map((elements2:any) => {
                        const html = elements2.html;
                        const elements = elements2.elems;
                        if (groupedElements.hasOwnProperty(html)) {
                            elements.forEach((element: OutcomeElement) => {
                                const existingOutcome = groupedElements[html].elems.find(e => e.outcome === element.outcome);
                                if (existingOutcome) {
                                    existingOutcome.outcomeElems.push(...element.outcomeElems);
                                } else {
                                    groupedElements[html].elems.push(element);
                                }
                            });
                        } else {
                            groupedElements[html] = { html, elems: elements };
                        }
                        groupedElements[html].elems.sort((a, b) => compareOutcomes(a, b));
                    });               
                }
                
                const newJsonData = Object.values(groupedElements);
                setOverallResultData(newJsonData);            
            }
        });
    }, [conformanceLevels]);

    /**
     * Renders the OverallTable component.
     * @returns {JSX.Element|null} - JSX element representing the OverallTable component.
     */
    return(<>
        {localStorage.getItem("scope")?.includes(window.location.href) && (<>
            <p>Current webpage evaluation results:</p> 
            <div id="overallTable">
                <table>
                    <thead>
                        <tr>
                            <th>Element</th>
                            <OutcomeHeaders/>
                        </tr>
                    </thead>
                    <tbody id="overallTableContent">
                        {overallResultData.map((htmlGroupedElements:any, index) => (<>
                            <tr 
                            className={"collapsible groupedElements" + (selectedOverallResults[index] ? " active" : "") }
                            onClick={() => collapsibleClickHandler(
                                selectedOverallResults, 
                                setSelectedOverallResults, 
                                index, 
                                mantainExtended, 
                                overallResultData.length
                            )}
                            >   
                                <td className="html">
                                    {index + 1 + " "} 
                                    {/* {htmlGroupedElements.html.length < 54 ? 
                                        parse(htmlGroupedElements.html) :
                                        parse(htmlGroupedElements.html.substring(0, 54) + " ... ")
                                    } */}
                                    {parse(htmlGroupedElements.html)}
                                </td>
                                {<ResultCount 
                                    groupedElements={htmlGroupedElements} 
                                    conformanceLevels={conformanceLevels}
                                    pageSummaries = {pageSummaries}
                                />}  
                            </tr>
                            { selectedOverallResults[index] && ( 
                                <Elements 
                                    elements={htmlGroupedElements.elems} 
                                    mantainExtended={mantainExtended} 
                                    conformanceLevels={conformanceLevels} 
                                    pageSummaries={pageSummaries}
                                /> 
                            )}
                        </>))}
                    </tbody>
                </table>
            </div>
        </>)}
    </>);
    
}


/**
 * React component for displaying elements of the selected groupedElements
 * @param {Object} props - The component props.
 * @param {Array} props.elements - The array of elements.
 * @param {boolean} props.mantainExtended - Indicates whether to maintain extended state.
 * @param {any} props.conformanceLevels - The conformance levels.
 * @returns {JSX.Element} The JSX element representing the elements component.
 */
function Elements({elements, mantainExtended, conformanceLevels, pageSummaries}:any){

    const [selectedElements, setSelectedElements] = useState(Array(elements.length).fill(false));

    /**
     * useEffect hook to handle component initialization and state updates.
     */
    useEffect(() => {
        const storedValue = sessionStorage.getItem("selectedElements");
        if(storedValue){
            setSelectedElements(JSON.parse(storedValue));
        }
    }, []);

    /**
     * useEffect hook to handle changes in selectedElements state.
     * Updates the sessionStorage with the selectedElements value and removes element highlights.
     */
    useEffect(() => {
        sessionStorage.setItem("selectedElements", JSON.stringify(selectedElements));
    }, [selectedElements]);

    return(<> 
        {elements.map((element:any, index:any) => (<>
            <tr 
                className={"collapsible elements" + (selectedElements[index] ? " active" : "") }
                style={{...outcome2Background["earl:" + element.outcome]}} 
                onClick={() => collapsibleClickHandler(
                    selectedElements, 
                    setSelectedElements, 
                    index, 
                    mantainExtended, 
                    elements.length
                )}
            >
                <td colSpan={6}>
                    {selectedElements[index] ?
                        <img className='arrow'
                        src={extendedArrow}
                        alt="Show information" height="20px"/>
                    :
                        <img className='arrow'
                        src={contractedArrow}
                        alt="Show information" height="20px"/>
                    }
                    {element.outcome === "failed" ?
                        "fail" : element.outcome === "cantTell" ?
                            "cantTell" : element.outcome === "passed" ?
                                "passed" : element.outcome === "innaplicable" ?
                                    "innaplicable" : element.outcome === "untested" &&
                                        "untested"}
                </td>
            </tr>
            { selectedElements[index] && ( 
                <OutcomeElems 
                    outcomeElems={element.outcomeElems} 
                    mantainExtended={mantainExtended} 
                    conformanceLevels={conformanceLevels}
                    pageSummaries={pageSummaries}
                /> 
            )}
        </>))} 
    </>);
}


/**
 * React component for displaying the outcomeElems of the selected elements.
 * @param {Object} props - The component props.
 * @param {Array} props.outcomeElems - The array of outcomeElems.
 * @param {boolean} props.mantainExtended - Indicates whether to maintain extended state.
 * @param {any} props.conformanceLevels - The conformance levels.
 * @returns {JSX.Element} The JSX element representing the outcomeElems component.
 */
function OutcomeElems({outcomeElems, mantainExtended, conformanceLevels, pageSummaries}:any){

    const [selectedOutcomeElems, setSelectedOutcomeElems] = useState(Array(outcomeElems.length).fill(false));

    useEffect(() => {
        const storedValue = sessionStorage.getItem("selectedOutcomeElems");
        if(storedValue){
            setSelectedOutcomeElems(JSON.parse(storedValue));
        } 
    }, []);

    useEffect(() => {
        sessionStorage.setItem("selectedOutcomeElems", JSON.stringify(selectedOutcomeElems));
    }, [selectedOutcomeElems]);

    return(<> 
        {outcomeElems.map((ocElems:any, index:any) => (<>
            <tr 
                className={"collapsible outcome Elements"}
                style={{...outcome2Background["earl:" + ocElems.outcome]}} 

                onClick={() => collapsibleClickHandler(
                    selectedOutcomeElems, 
                    setSelectedOutcomeElems, 
                    index, 
                    mantainExtended, 
                    outcomeElems.length, 
                )}
            >
                <td colSpan={6}>
                    {selectedOutcomeElems[index] ?
                        <img className='arrow'
                        src={extendedArrow}
                        alt="Show information" height="20px"/>
                    :
                        <img className='arrow'
                        src={contractedArrow}
                        alt="Show information" height="20px"/>
                    }
                    {ocElems.criteria}                      
                </td>
            </tr>
            {selectedOutcomeElems[index] && ( 
                <MoreInfo 
                    moreInfo={ocElems} 
                /> 
            )}
        </>))} 
    </>);
}


/**
 * React component for displaying moreInfo of the selected outcomeElems.
 * @param {Object} props - The component props.
 * @param {Array} props.moreInfo - The array of moreInfo.
 * @returns {JSX.Element} The JSX element representing the moreInfo component.
 */
function MoreInfo({moreInfo}:any){

    return(<> 
        {moreInfo.descriptions.map((desc:any, index:any) => (<>
            <tr>
                <td style={{textAlign:"left", fontWeight:"bold", paddingTop:"10px"}} colSpan={6}>
                    {parse("@" + desc.assertor)}
                </td>
            </tr>
            <tr>
                <td style={{textAlign:"left"}} colSpan={6}>
                    {desc.description}
                </td>
            </tr>
        </>))}
    </>);
}


/**
 * Renders the outcome headers for the criteria result.
 */
export function OutcomeHeaders(){
    return(<>
        <th className="passed" title='Passed' style={{...outcome2Background["earl:passed"]}}>P</th>
        <th className="failed" title='Failed' style={{...outcome2Background["earl:failed"]}}>F</th>
        <th className="cantTell" title='Can&#39;t tell' style={{...outcome2Background["earl:cantTell"]}}>CT</th>
        <th className="inapplicable" title='Not Present' style={{...outcome2Background["earl:inapplicable"]}}>NP</th>
        <th className="untested" title='Not checked' style={{...outcome2Background["earl:untested"]}}>NC</th>
    </>);
}


/**
 * Renders the result count for the criteria groupedElements.
 * @param {object} groupedElements - The groupedElements object.
 * @param {array} conformanceLevels - The conformance levels.
 */
function ResultCount({groupedElements, conformanceLevels, pageSummaries}:any){
    let passed = 0, failed = 0, cantTell = 0, inapplicable = 0, untested = 0;

    const elements = groupedElements.elems;
    if(elements){
        for(const element of elements){
            if(element.outcome === "passed"){
                passed ++;
            }else if(element.outcome === "failed"){
                failed ++;
            }else if(element.outcome === "cantTell"){
                cantTell ++;
            }else if(element.outcome === "inapplicable"){
                inapplicable ++;
            }else if(element.outcome === "untested"){
                untested ++;
            }
        }
    }
    return(<> <td>{passed}</td><td>{failed}</td><td>{cantTell}</td><td>{inapplicable}</td><td>{untested}</td> </>);
}

