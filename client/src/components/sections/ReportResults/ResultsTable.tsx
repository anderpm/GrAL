import React from 'react';

import '../../../styles/sections/resultSection/resultsTable.scss';

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
 * ResultsTable component displays the evaluation results in a table format.
 * @param {Object} conformanceLevels - Object containing the conformance levels.
 * @returns {JSX.Element|null} - JSX element representing the ResultsTable component.
 */
export default function ResultsTable({conformanceLevels}:any): JSX.Element {

    const [mantainExtended, setMantainExtended] = useState(false);
    const [reportTableContent, setReportTableContent] = useState([]);
    const [selectedMainCategories, setSelectedMainCategories] = useState(Array(reportTableContent.length).fill(false));
    const [pageSummaries, setPageSummaries] = useState(null);

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
        getFromChromeStorage(window.location.hostname + ".reportTableContent", false)
        .then( value => {
            if(value != null) setReportTableContent(JSON.parse(value))
        });
        
        const storedValue = sessionStorage.getItem("selectedMainCategories");
        if(storedValue){
            setSelectedMainCategories(JSON.parse(storedValue));
        }

        getFromChromeStorage(window.location.hostname + ".pageSummaries", false)
        .then( value => value != null && setPageSummaries(JSON.parse(value)) );
    }, []);

    /**
     * useEffect hook to handle changes in selectedMainCategories state.
     * Updates the sessionStorage with the selectedMainCategories value and removes element highlights.
     */
    useEffect(() => {
        sessionStorage.setItem("selectedMainCategories", JSON.stringify(selectedMainCategories));
    }, [selectedMainCategories]);
    

    /**
     * Renders the ResultsTable component.
     * @returns {JSX.Element|null} - JSX element representing the ResultsTable component.
     */
    return(<>
        {localStorage.getItem("scope")?.includes(window.location.href) && (<>
            <p>Current webpage evaluation results:</p>
            <div id="resultsTable">
                <table>
                    <thead>
                        <tr> <th>Standard</th> <OutcomeHeaders/> </tr>
                    </thead>
                    <tbody id="resultsTableContent">
                        {reportTableContent.map((mainCategory:any, index:any) => (<>
                            <tr 
                                className={"collapsible mainCategory" + (selectedMainCategories[index] ? " active" : "") }
                                onClick={() => collapsibleClickHandler(
                                    selectedMainCategories, 
                                    setSelectedMainCategories, 
                                    index, 
                                    mantainExtended, 
                                    reportTableContent.length
                                )}
                            >
                                <td>{mainCategory.categoryTitle}</td>
                                <ResultCount 
                                    category={mainCategory} 
                                    conformanceLevels={conformanceLevels}
                                    pageSummaries = {pageSummaries}
                                />
                            </tr>
                            { selectedMainCategories[index] && ( 
                                <SubCategory 
                                    subCategories={mainCategory.subCategories} 
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
 * React component for displaying subcategories of the selected categories
 * @param {Object} props - The component props.
 * @param {Array} props.subCategories - The array of subcategories.
 * @param {boolean} props.mantainExtended - Indicates whether to maintain extended state.
 * @param {any} props.conformanceLevels - The conformance levels.
 * @returns {JSX.Element} The JSX element representing the subcategory component.
 */
function SubCategory({subCategories, mantainExtended, conformanceLevels, pageSummaries}:any){

    const [selectedSubCategories, setSelectedSubCategories] = useState(Array(subCategories.length).fill(false));

    /**
     * useEffect hook to handle component initialization and state updates.
     */
    useEffect(() => {
        const storedValue = sessionStorage.getItem("selectedSubCategories");
        if(storedValue){
            setSelectedSubCategories(JSON.parse(storedValue));
        }
    }, []);

    /**
     * useEffect hook to handle changes in selectedSubCategories state.
     * Updates the sessionStorage with the selectedSubCategories value and removes element highlights.
     */
    useEffect(() => {
        sessionStorage.setItem("selectedSubCategories", JSON.stringify(selectedSubCategories));
    }, [selectedSubCategories]);

    return(<> 
        {subCategories.map((subCategory:any, index:any) => (<>

            <tr 
                className={"collapsible subCategory" + (selectedSubCategories[index] ? " active" : "") }
                onClick={() => collapsibleClickHandler(
                    selectedSubCategories, 
                    setSelectedSubCategories, 
                    index, 
                    mantainExtended, 
                    subCategories.length
                )}
            >
                <td>{subCategory.subCategoryTitle}</td>
                <ResultCount category={subCategory} conformanceLevels={conformanceLevels} pageSummaries={pageSummaries} />
            </tr>
            { selectedSubCategories[index] && ( 
                <Criterias 
                    criterias={subCategory.criterias} 
                    mantainExtended={mantainExtended} 
                    conformanceLevels={conformanceLevels}
                    pageSummaries={pageSummaries}
                /> 
            )}
        
        </>))} 
    </>);
}


/**
 * React component for displaying the criterias of the selected subcategories.
 * @param {Object} props - The component props.
 * @param {Array} props.criterias - The array of criterias.
 * @param {boolean} props.mantainExtended - Indicates whether to maintain extended state.
 * @param {any} props.conformanceLevels - The conformance levels.
 * @returns {JSX.Element} The JSX element representing the criterias component.
 */
function Criterias({criterias, mantainExtended, conformanceLevels, pageSummaries}:any){

    const [selectedCriterias, setSelectedCriterias] = useState(Array(criterias.length).fill(false));

    useEffect(() => {
        const storedValue = sessionStorage.getItem("selectedCriterias");
        if(storedValue){
            setSelectedCriterias(JSON.parse(storedValue));
        } 
    }, []);

    useEffect(() => {
        sessionStorage.setItem("selectedCriterias", JSON.stringify(selectedCriterias));
    }, [selectedCriterias]);

    return(<> 
        {criterias.map((criteria:any, index:any) => (<>

            { conformanceLevels.includes(criteria.conformanceLevel) && (<>
                <tr 
                    className={"collapsible criteria"} 
                    style={{...outcome2Background[criteria.outcomes[Object.keys(pageSummaries)[0]]]}} 
                    onClick={() => collapsibleClickHandler(
                        selectedCriterias, 
                        setSelectedCriterias, 
                        index, 
                        mantainExtended, 
                        criterias.length, 
                    )}
                >
                    <td colSpan={2}>
                        {criteria.hasOwnProperty("hasPart") ? <>
                            {selectedCriterias[index] ?
                                <img className='arrow'
                                src={extendedArrow}
                                alt="Show information" height="20px"/>
                            :
                                <img className='arrow'
                                src={contractedArrow}
                                alt="Show information" height="20px"/>
                            }
                            {/* <img 
                                className='arrow'
                                src={ selectedCriterias[index] ? 
                                        getImgSrc("extendedArrow") 
                                    : 
                                        getImgSrc("contractedArrow") 
                                    } 
                                alt="Show information" height="20px"
                            /> */}
                            {criteria.criteria}
                            
                        </> : <> {criteria.criteria} </> }
                    </td>
                    <td colSpan={4}>{criteria.outcomes[Object.keys(pageSummaries)[0]]}</td>
                </tr>
                {criteria.hasOwnProperty("hasPart") && selectedCriterias[index] && ( 
                    <CriteriaResults criteria={criteria} />
                )}
        
            </>)}

        </>))} 
    </>);
}



/**
 * React component to display the results of the selected criteria.
 * @param {object} props - The component props.
 * @param {any} props.criteria - The criteria object.
 * @returns {JSX.Element} The criteria results component.
 */
function CriteriaResults({criteria}:any){  

    const [selectedCriteriaResults, setSelectedCriteriaResults] = useState(Array(criteria.hasPart.length).fill(false));
    const [editIndex, setEditIndex] = useState(-1);

    const [removedPointers, setRemovedPointers] = useState([]);
    const [editedPointersGroup, setEditedPointersGroup] = useState([]);
    const [editedDescriptions, setEditedDescriptions] = useState([]);

    /**
     * Retrieves the found case from the evaluation report.
     * @param {number} index - The index of the criteria result.
     * @returns {Promise<Array<any>>} A promise that resolves to the evaluation report, report criteria, and found case index.
     */
    async function getFoundCaseFromReport(index:any){
        
        const evaluationReport = await getFromChromeStorage(window.location.hostname, false);

        const criteriaTxt = wcagCriterias.find((elem:any) => elem.num === criteria.criteriaNumber);

        const reportCriteria = evaluationReport.auditSample.find(
            (elem:any) => elem.test.includes(criteriaTxt.id)
        );
    
        const foundCaseIndex = reportCriteria.hasPart.findIndex(
            (elem:any) => elem.subject === criteria.hasPart[index].webPage && 
                elem.result.outcome.replace("earl:", "") === criteria.hasPart[index].outcome
        );

        return [evaluationReport, reportCriteria, foundCaseIndex];

    }


    /**
     * Saves the changes made to the criteria result.
     */
    const saveChanges = async () => {
        
        const [evaluationReport, reportCriteria, foundCaseIndex] = await getFoundCaseFromReport(editIndex);

        const foundCase = reportCriteria.hasPart[foundCaseIndex];
        const locationPointersGroup = foundCase.result.locationPointersGroup;

        const modifier = await getFromChromeStorage("authenticationState");

        editedDescriptions.forEach((desc:any) => {


            const editedDescription = criteria.hasPart[editIndex].descriptions.find(
                (elem:any) => elem.assertor === desc.assertor
            );
            const assertorDescription = foundCase.assertedBy.find(
                (elem:any) => elem.assertor === desc.assertor
            );
            assertorDescription.description = editedDescription.description;

            if(!assertorDescription.modifiedBy.includes(modifier)){
                assertorDescription.modifiedBy.push(modifier);
            }

            assertorDescription.lastModifier = modifier;

        });

        removedPointers.forEach((ptr:any) => {

            const index = locationPointersGroup.findIndex(
                (elem:any) => elem["ptr:expression"] === ptr.pointer.path
            );

            if(index !== -1){
                locationPointersGroup.splice(index, 1);
            }

            for(const assertor of foundCase.assertedBy){
                if(ptr.groupKey.includes(assertor.assertor)){
                    if(!assertor.modifiedBy.includes(modifier)){
                        assertor.modifiedBy.push(modifier);
                    }
        
                    assertor.lastModifier = modifier;
                }
            }
        
        });

        loadReport(evaluationReport);
    };

    /**
     * Cancels the changes made to the found case.
     */
    const cancelChanges = () => {

        editedPointersGroup.forEach((elem:any) => {
            criteria.hasPart[editIndex].groupedPointers[elem.key] = elem.pointers;
        });

        editedDescriptions.forEach((oldValues:any) => {
            const assertorDescription = criteria.hasPart[editIndex].descriptions.find(
                (desc:any) => desc.assertor === oldValues.assertor
            );
            assertorDescription.description = oldValues.description;
        });

        removedPointers.forEach((ptr:any) => {
            criteria.hasPart[editIndex].groupedPointers[ptr.groupKey].splice(ptr.index, 0, ptr.pointer);
        }); 

        setEditedPointersGroup([]);
        setRemovedPointers([]);
        setEditedDescriptions([]);
        setEditIndex(-1);

    };

    /**
     * Updates a description in the found case.
     * @param {string} newValue - The new value of the description.
     * @param {number} index - The index of the description to update.
     */
    const updateDescription = async (newValue:any, index:any) => {

        const edited:any = [...editedDescriptions];

        const editedAssertorDesc:any = criteria.hasPart[editIndex].descriptions[index];

        if(edited.findIndex((elem:any) => elem.assertor === editedAssertorDesc.assertor) === -1){
            edited.push({
                assertor: editedAssertorDesc.assertor, 
                description: editedAssertorDesc.description
            });
        }

        editedAssertorDesc.description = newValue;

        setEditedDescriptions(edited);

    };




    /**
     * Removes a found case from the report.
     * @param {number} index - The index of the found case to remove.
     */
    const removeFoundCase = async (index:any) =>{

        if(!window.confirm("Are you sure you want to remove this found case?")) return;
    
        const [evaluationReport, reportCriteria, foundCaseIndex] = await getFoundCaseFromReport(index);
    
        removeFoundCaseFromReport(reportCriteria, foundCaseIndex);
    
        loadReport(evaluationReport);
    
    };




    function removeFoundCaseFromReport(reportCriteria:any, foundCaseIndex:any){

        reportCriteria.hasPart.splice(foundCaseIndex, 1);
    
        if(reportCriteria.hasPart.length === 0){

            reportCriteria.result.outcome = "earl:untested";
            reportCriteria.result.description = "";
            delete reportCriteria.assertedBy;
            delete reportCriteria.mode;

        }else{

            let newOutcome = "earl:untested";
    
            for(const foundCase of reportCriteria.hasPart){
                if(newOutcome === "earl:untested" 
                ||(newOutcome === "earl:inapplicable" && foundCase.result.outcome !== "earl:untested") 
                ||(newOutcome === "earl:passed" && (foundCase.result.outcome === "earl:failed" || foundCase.result.outcome === "earl:cantTell")) 
                ||(newOutcome === "earl:cantTell" && foundCase.result.outcome === "earl:failed")){
                    newOutcome = foundCase.result.outcome;
                }
            }

            reportCriteria.result.outcome = newOutcome;
            reportCriteria.result.description = outcome2Description[newOutcome];
        }

    }




    /**
     * Removes a description from the found case.
     * @param {number} index - The index of the description to remove.
     */
    const removeDescription = async (index:any) => {

        if(!window.confirm("Are you sure you want to remove this assertors results?")) return;

        const [evaluationReport, reportCriteria, foundCaseIndex] = await getFoundCaseFromReport(index[0]);

        const foundCase = reportCriteria.hasPart[foundCaseIndex];

        const description2remove = criteria.hasPart[index[0]].descriptions[index[1]].assertor;

        const assertorIndex = foundCase.assertedBy.findIndex(
            (elem:any) => elem.assertor === description2remove
        );
        foundCase.assertedBy.splice(assertorIndex, 1);

        if(foundCase.assertedBy.length === 0){

            removeFoundCaseFromReport(reportCriteria, foundCaseIndex);

        }else{

            const locationPointersGroup = foundCase.result.locationPointersGroup;

            for(let i = 0; i < locationPointersGroup.length; i++){
    
                const pointerAssertors = locationPointersGroup[i].assertedBy;
    
                if(pointerAssertors.includes(description2remove)){
    
                    if(pointerAssertors.length === 1){
                        locationPointersGroup.splice(i, 1);
                        i--;
                    }else{
                        pointerAssertors.splice(pointerAssertors.indexOf(description2remove), 1);
                    }
    
                }
            }

        }

        loadReport(evaluationReport);
    };


    return(<>
        {criteria.hasPart.map((result:any, index:any) => (<>

            {result.webPage === "https://www.ehu.eus/es/home" && (<>
                <tr 
                    className="collapsible criteriaResult" 
                    onClick={
                        () => collapsibleClickHandler(selectedCriteriaResults, setSelectedCriteriaResults, index, false, criteria.hasPart.length)
                    }
                >
                    <td colSpan={6} style={{...outcome2Background["earl:" + result.outcome]}}>

                        {selectedCriteriaResults[index] ?
                                <img className='arrow'
                                src={extendedArrow}
                                alt="Show information" 
                                height="20px"/>
                            :
                                <img className='arrow'
                                src={contractedArrow}
                                alt="Show information" 
                                height="20px"/>
                        }

                        {/* <img 
                            className='arrow'
                            src={ selectedCriteriaResults[index] ? 
                                    getImgSrc("extendedArrow") 
                                : 
                                    getImgSrc("contractedArrow") 
                                } 
                            alt="Show information" 
                            height="20px"
                        /> */}

                        {result.outcome}

                        {editIndex === index ? <>
                            <Button 
                                classList={"primary small spaced"} 
                                onClickHandler={saveChanges}
                                innerText={"Save"}
                            />
                            <Button 
                                classList={"secondary small spaced"} 
                                onClickHandler={cancelChanges}
                                innerText={"Cancel"}
                            />
                        </> : <>
                            <img 
                                className='editIcon'
                                src={edit} 
                                alt="Edit found case" 
                                title="Edit found case" 
                                height="16px" 
                                onClick={()=>{
                                    if(editIndex !== -1) cancelChanges();
                                    setEditIndex(index);
                                }}
                            />
                            <img 
                                className='removeIcon'
                                src={remove
                                } 
                                alt="Remove found case"
                                title="Remove found case"
                                height="16px" 
                                onClick={()=>removeFoundCase(index)}
                            />
                        </>}
                        
                    </td>
                </tr>

                {selectedCriteriaResults[index] && (<>
                
                    {result.descriptions.map((element:any, i:any) => (<>

                        <tr>
                            <td style={{textAlign:"left", fontWeight:"bold", paddingTop:"10px"}} colSpan={6}>
                                
                                {parse("@" + element.assertor)}

                                {editIndex !== index && (<>

                                    {element.modifiedBy.length > 0 && (<>
                                        {" - modifier: @" + element.lastModifier} 
                                    </>)}

                                    <img 
                                        className='blacklistIcon' 
                                        src={blacklist} 
                                        alt="Add message to blacklist" 
                                        title="Add message to blacklist"
                                        height="16px" 
                                        onClick={() => blackListElement({
                                            evaluator: element.assertor, 
                                            criteria: criteria.criteria, 
                                            outcome: result.outcome, 
                                            message: element.description
                                        })}
                                    />
                                    
                                    <img 
                                        className='removeIcon' 
                                        src={remove} 
                                        alt="Remove message" 
                                        title="Remove message"
                                        height="16px"
                                        onClick={() => removeDescription([index, i])}
                                    />

                                </>)}

                            </td>
                        </tr>
                        <tr>
                            {editIndex === index ?
                                <textarea 
                                    className='textInput'
                                    style={{textAlign:"left"}} 
                                    value={element.description} 
                                    onChange={(e:any) => updateDescription(e.target.value, i)} 
                                />
                            :
                                <td style={{textAlign:"left"}} colSpan={6}>{element.description}</td>
                            }
                        </tr>
                    
                    </>))}

                    { result.hasOwnProperty("groupedPointers") && (
                        <CriteriaResultPointers 
                            resultGroupedPointers={result.groupedPointers} 
                            edit={editIndex === index} 
                            removedPointers={removedPointers} 
                            setRemovedPointers={setRemovedPointers} 
                        />
                    )}
                    
                </>)}
            </>)}
            
            

        </>))} 
    </>);
}



/**
 * Renders the pointers for the selected criteria result.
 * @param {object} resultGroupedPointers - The grouped pointers for the criteria result.
 * @param {boolean} edit - Flag indicating if the pointers are editable.
 * @param {array} removedPointers - Array of removed pointers.
 * @param {function} setRemovedPointers - Function to set the removed pointers.
 */
function CriteriaResultPointers({resultGroupedPointers, edit, removedPointers, setRemovedPointers}:any){  

    const [selectedPointer, setSelectedPointer] = useState<{ [groupKey: string]: number | null }>({});

    const [hiddenElements, setHiddenElements] = useState<{ [groupKey: string]: number[] }>({});

    const [ignoredElements, setIgnoredElements] = useState<{ [groupKey: string]: number[] }>({});

    useEffect(() => {

        const newHiddenElements: { [groupKey: string]: number[] } = {};
        const newIgnoredElements: { [groupKey: string]: number[] } = {};

        for (const groupKey in resultGroupedPointers) {
            for (let i = 0; i < resultGroupedPointers[groupKey].length; i++) {

                const pointer = resultGroupedPointers[groupKey][i];
                const pointedElement = getElementByPath(pointer.path, pointer.innerText);

                if(pointedElement){
                    if(pointedElement.getAttribute('type') === "hidden" || pointedElement.getAttribute("hidden")!==null){
                        
                        if (!newHiddenElements[groupKey]) {
                            newHiddenElements[groupKey] = [];
                        }
                        newHiddenElements[groupKey].push(i);

                    }else if(!pointer.html.startsWith("<body")){
                        // highlightElement(pointedElement, groupKey, i);
                    }
                }else{
                    if (!newIgnoredElements[groupKey]) {
                        newIgnoredElements[groupKey] = [];
                    }
                    newIgnoredElements[groupKey].push(i);
                }
            }
        }
        setHiddenElements(newHiddenElements);
        setIgnoredElements(newIgnoredElements);
    }, [resultGroupedPointers]);

    /**
     * Handles the click event on a pointer.
     * @param {string} groupKey - The group key of the pointer.
     * @param {number} index - The index of the pointer.
     */
    function handlePointerClick(groupKey:string, index:number){

        // unselectHighlightedElement(); // If previously selected

        if (selectedPointer[groupKey] === index) {

            setSelectedPointer({});

        } else{

            setSelectedPointer({ [groupKey]: index });

            const pointer = resultGroupedPointers[groupKey][index];

            if(!hiddenElements[groupKey]?.includes(index) 
            && !ignoredElements[groupKey]?.includes(index) 
            && !pointer.html.startsWith("<body")) {
    
                // selectHighlightedElement(groupKey, index, pointer.documentation);
            
            }
        } 

    }

    /**
     * Handles the click event on the remove pointer icon.
     * @param {string} groupKey - The group key of the pointer.
     * @param {number} index - The index of the pointer.
     */
    function handleRemovePointerClick(groupKey:string, index:any){

        const newRemovedPointers = [...removedPointers];
        newRemovedPointers.push({
            pointer: resultGroupedPointers[groupKey][index],
            groupKey,
            index
        });
        setRemovedPointers(newRemovedPointers);

        resultGroupedPointers[groupKey].splice(index, 1);

    }

    return(<>
        
        {Object.entries(resultGroupedPointers).map(([groupKey, groupPointers]:any) => (<>

            <tr><td colSpan={6} style={{textAlign:"left"}}>

                <span style={{fontWeight: "bold", paddingTop:"10px"}}>{"[ " + groupKey + " ]"}</span>

                {groupPointers.map((pointer:any, index:any) => (

                    <pre className="codigo_analisis"
                        style={!hiddenElements[groupKey]?.includes(index) && !ignoredElements[groupKey]?.includes(index) ? 
                            (selectedPointer[groupKey] === index ? { border: "3px solid #FF3633" } : { border: "1px solid #005a6a" }) 
                            : { color:"black" }
                        }
                    >
                        <span onClick={() => handlePointerClick(groupKey, index)}>
                            {index + 1}. {selectedPointer[groupKey] === index ? 
                                parse(pointer.html) 
                            : 
                                parse(pointer.html.substring(0, 27) + " ... ")
                            } 
                            {hiddenElements[groupKey]?.includes(index) && "(HIDDEN)"}
                        </span>
                        
                        {edit && (
                            <img 
                                className='removePointerIcon' 
                                src={remove} 
                                alt="Remove pointer from list" 
                                title="Remove pointer" 
                                height="16px" 
                                onClick={() => handleRemovePointerClick(groupKey, index)}
                            />
                        )}
                        
                    </pre> 
                    
                ))}
 
            </td></tr>

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
 * Renders the result count for the criteria category.
 * @param {object} category - The category object.
 * @param {array} conformanceLevels - The conformance levels.
 */
function ResultCount({category, conformanceLevels, pageSummaries}:any){
    let passed = 0, failed = 0, cantTell = 0, inapplicable = 0, untested = 0;

    const outcomes = category.webPageOutcomes[Object.keys(pageSummaries)[0]];
    if(outcomes){
        for(const conformanceLevel of conformanceLevels){
            passed += outcomes["earl:passed"][conformanceLevel];
            failed += outcomes["earl:failed"][conformanceLevel];
            cantTell += outcomes["earl:cantTell"][conformanceLevel];
            inapplicable += outcomes["earl:inapplicable"][conformanceLevel];
            untested += outcomes["earl:untested"][conformanceLevel];
        }
    }
    return(<> <td>{passed}</td><td>{failed}</td><td>{cantTell}</td><td>{inapplicable}</td><td>{untested}</td> </>);
}

