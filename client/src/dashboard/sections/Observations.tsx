import React from 'react';

import '../../styles/dashboard/sections/observations.scss';

import { useState, useEffect } from "react";
import parse from 'html-react-parser';
import Button from '../../components/reusables/Button';

import { blackListElement, getFromChromeStorage, storeOnChromeStorage, getImgSrc, removeFromChromeStorage } from '../../scripts/utils/chromeUtils.js';
import { getElementByPath, collapsibleClickHandler } from '../../scripts/utils/moreUtils.js';
import { highlightElement, selectHighlightedElement, unselectHighlightedElement } from '../../scripts/utils/highlightUtils.js';
import { mapReportData } from '../../scripts/mapReportData';
import { getSuccessCriterias } from '../../scripts/utils/wcagUtils';
import { loadReport } from '../../scripts/reportLoadingOptions';

import extendedArrow from '../../images/extendedArrow.png';
import contractedArrow from '../../images/contractedArrow.png';
import edit from '../../images/edit.png';
import remove from '../../images/remove.png';
import blacklist from '../../images/blacklist.png';


const outcome2Background: any = {
    "earl:passed": { backgroundColor: "#C8FA8C" },
    "earl:failed": { backgroundColor: "#FA8C8C" },
    "earl:cantTell": { backgroundColor: "#F5FA8C" },
    "earl:inapplicable": { backgroundColor: "#FFFFFF" },
    "earl:untested": { backgroundColor: "#8CFAFA" }
}

const outcome2Description: any = {
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
export default function Observations({ conformanceLevels }: any): JSX.Element {

    const [mantainExtended, setMantainExtended] = useState(false);
    const [reportTableContent, setReportTableContent] = useState([]);
    const [selectedMainCategories, setSelectedMainCategories] = useState(Array(reportTableContent.length).fill(false));
    const [pageSummaries, setPageSummaries] = useState(null);

    /**
     * useEffect hook to handle component initialization and state updates.
     */
    useEffect(() => {
        (async () => {
            const update = await getFromChromeStorage("blackListUpdated");
            if (update) {
                removeFromChromeStorage("blackListUpdated", true);
                mapReportData();
            }
        })();

        getFromChromeStorage("mantainExtended")
            .then(value => {
                if (value != null) setMantainExtended(value)
            });
        getFromChromeStorage(window.location.hostname + ".reportTableContent", false)
            .then(value => {
                if (value != null) setReportTableContent(JSON.parse(value))
            });

        const storedValue = sessionStorage.getItem("selectedMainCategories");
        if (storedValue) {
            setSelectedMainCategories(JSON.parse(storedValue));
        }

        getFromChromeStorage(window.location.hostname + ".pageSummaries", false)
            .then(value => value != null && setPageSummaries(JSON.parse(value)));
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
    return (<>
        {/* {localStorage.getItem("scope")?.includes(window.location.href) && (<> */}
        {/* <p>Current webpage evaluation results:</p> */}
        <div id="resultsTable">
            <table>
                <thead>
                    <tr> <th>Standard</th> {/* <OutcomeHeaders /> */} </tr>
                </thead>
                <tbody id="resultsTableContent">
                    {reportTableContent.map((mainCategory: any, index: any) => (<>
                        <tr
                            className={"collapsible mainCategory" + (selectedMainCategories[index] ? " active" : "")}
                            onClick={() => collapsibleClickHandler(
                                selectedMainCategories,
                                setSelectedMainCategories,
                                index,
                                mantainExtended,
                                reportTableContent.length
                            )}
                        >
                            <td>{mainCategory.categoryTitle}</td>
                            {/* <ResultCount
                                category={mainCategory}
                                conformanceLevels={conformanceLevels}
                                pageSummaries={pageSummaries}
                            /> */}
                        </tr>
                        {selectedMainCategories[index] && (
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
        {/* </>)} */}
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
function SubCategory({ subCategories, mantainExtended, conformanceLevels, pageSummaries }: any) {

    const [selectedSubCategories, setSelectedSubCategories] = useState(Array(subCategories.length).fill(false));

    /**
     * useEffect hook to handle component initialization and state updates.
     */
    useEffect(() => {
        const storedValue = sessionStorage.getItem("selectedSubCategories");
        if (storedValue) {
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

    return (<>
        {subCategories.map((subCategory: any, index: any) => (<>

            <tr
                className={"collapsible subCategory" + (selectedSubCategories[index] ? " active" : "")}
                onClick={() => collapsibleClickHandler(
                    selectedSubCategories,
                    setSelectedSubCategories,
                    index,
                    mantainExtended,
                    subCategories.length
                )}
            >
                <td>{subCategory.subCategoryTitle}</td>
                {/* <ResultCount category={subCategory} conformanceLevels={conformanceLevels} pageSummaries={pageSummaries} /> */}
            </tr>
            {selectedSubCategories[index] && (
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
function Criterias({ criterias, mantainExtended, conformanceLevels, pageSummaries }: any) {

    const [selectedCriterias, setSelectedCriterias] = useState(Array(criterias.length).fill(false));

    useEffect(() => {
        const storedValue = sessionStorage.getItem("selectedCriterias");
        if (storedValue) {
            setSelectedCriterias(JSON.parse(storedValue));
        }
    }, []);

    useEffect(() => {
        sessionStorage.setItem("selectedCriterias", JSON.stringify(selectedCriterias));
    }, [selectedCriterias]);

    return (<>
        {criterias.map((criteria: any, index: any) => (<>

            {conformanceLevels.includes(criteria.conformanceLevel) && (<>
                <tr
                    className={"collapsible criteria"}
                    style={{ ...outcome2Background[criteria.outcomes[Object.keys(pageSummaries)[0]]] }}
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
                                    alt="Show information" height="20px" />
                                :
                                <img className='arrow'
                                    src={contractedArrow}
                                    alt="Show information" height="20px" />
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

                        </> : <> {criteria.criteria} </>}
                    </td>
                    {/* <td colSpan={4}>{criteria.outcomes[Object.keys(pageSummaries)[0]]}</td> */}
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
function CriteriaResults({ criteria }: any) {

    const [observation, setObservation] = useState("");

    const handleTextareaChange = (event: any) => {
        setObservation(event.target.value);
    };

    // Function to normalize the criteria key
    const normalizeCriteria = (criteria: any) => {
        return `wcag2:${criteria
            .split(':')[1]               // Get the part after the ":"
            .trim()                      // Remove any extra spaces
            .toLowerCase()               // Convert to lowercase
            .replace(/\s+/g, '-')        // Replace spaces with hyphens
            .replace(/[()]/g, '')        // Remove parentheses
            }`;
    };

    const fetchObservation = async () => {
        const normalizedKey = normalizeCriteria(criteria.criteria);
        // Load existing data from storage
        const data = await getFromChromeStorage(window.location.hostname + ".observationData", true);
        const data2 = JSON.parse(data);
        
        // Find the corresponding observation
        const existingObservation = data2.find((item: any) => item.assertion === normalizedKey)?.observation || "";
        setObservation(existingObservation);
    };

    useEffect(() => {
        fetchObservation();
    }, [criteria]); // Depend on criteria so it refetches when it changes

    const handleSaveClick = async () => {
        const normalizedKey = normalizeCriteria(criteria.criteria);

        // Load existing data from storage
        const data = await getFromChromeStorage(window.location.hostname + ".observationData", true);

        const data2 = JSON.parse(data);

        let found = false;
        for (let i = 0; i < data2.length; i++) {
            console.log(data2)
            console.log(normalizedKey)
            if (data2[i].assertion === normalizedKey) {
                console.log("asdasd")
                // Update existing observation
                data2[i].observation = observation;

                found = true;
                break;
            }
        }

        /* if (!found) {
            // Add new observation if it does not exist
            data2.push({ assertion: normalizedKey, observation: newValue });
        } */

        // Save updated data to storage
        storeOnChromeStorage(window.location.hostname + ".observationData", data2);
    };


    return (<>

        {/* <a>{criteria.criteria}</a> */}
        <div className='criteria-content'>
            <textarea
                className='textarea-observation'
                placeholder="observation"
                rows={4}
                cols={50}
                value={observation}
                onChange={handleTextareaChange} // Update state on textarea change
            />
            <Button className='button-observation' classList="primary" onClickHandler={() => handleSaveClick()} innerText="Save"></Button>
            {/* <button className='button-observation' onClick={handleSaveClick}>Guardar</button> */}
        </div>


    </>);
}