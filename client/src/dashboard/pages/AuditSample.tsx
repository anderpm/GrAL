import React from 'react';

import '../../styles/dashboard/components/pages/auditSample.scss';

import { useEffect, useState } from "react";

import Dropdown from '../../components/reusables/DropdownSection';
import ReportResults from '../../components/sections/ReportResults/ReportResults';
import OverallTable from '../../components/sections/ReportResults/OverallTable';
import SummaryTable from '../../components/sections/ReportResults/SummaryTable';
import ResultsTable from '../../components/sections/ReportResults/ResultsTable';
import { getFromChromeStorage } from '../../scripts/utils/chromeUtils';
import Button from '../../components/reusables/Button';
import { evaluateScope } from '../../scripts/reportLoadingOptions.js';
import Observations from '../sections/Observations';

const defaultCheckboxes = [
    { checked: false, label: "AccessMonitor - Website", href: "https://accessmonitor.acessibilidade.gov.pt/" },
    { checked: false, label: "AChecker - Website", href: "https://achecker.achecks.ca/checker/index.php" },
    { checked: false, label: "Mauve - Website", href: "https://mauve.isti.cnr.it/singleValidation.jsp" },
    { checked: false, label: "A11y - Library", href: "https://github.com/ainspector/a11y-evaluation-library" },
    { checked: false, label: "Pa11y - Library", href: "https://www.npmjs.com/package/pa11y" },
    { checked: false, label: "Lighthouse - Library", href: "https://developer.chrome.com/docs/lighthouse/overview/" },
    { checked: false, label: "WAVE - Website", href: "https://wave.webaim.org" },
    // { checked: false, label: "Total Validator - Website", href: "https://www.totalvalidator.com/index.html"}
];

/**
 * A React component that allows the user to select which accessibility evaluators to use.
 * 
 * @function EvaluatorSelectionSection
 * @returns {JSX.Element} The JSX code for rendering the component.  
*/
export default function EvaluatorSelection(): JSX.Element {

    const [checkboxes, setCheckboxes] = useState(defaultCheckboxes);
    const [conformanceLevels, setConformanceLevels] = useState(['A', 'AA']);
    const [reportIsLoaded, setReportIsLoaded] = useState("false");
    const [animateBtn, setAnimateBtn] = useState("none");
    const [activeTab, setActiveTab] = useState('website');

    /**
     * useEffect hook that sets the state of checkboxes based on the values stored in localStorage.
     * If no values are found in localStorage, the initial state of checkboxes is stored in localStorage.
     * 
     * @param {array} checkboxes - The current state of the checkboxes
    */
    useEffect(() => {
        const storedCheckboxes = localStorage.getItem("checkboxes");
        if (storedCheckboxes) {
            setCheckboxes(JSON.parse(storedCheckboxes));
        }
    }, []);

    useEffect(() => {
        localStorage.setItem("checkboxes", JSON.stringify(checkboxes));
    }, [checkboxes]);

    const handleCheckboxChange = (index: any) => {
        const newCheckboxes = [...checkboxes];
        newCheckboxes[index].checked = !newCheckboxes[index].checked;
        setCheckboxes(newCheckboxes);
    };


    useEffect(() => {
        const storedConformanceLevels = localStorage.getItem("conformanceLevels");
        if (storedConformanceLevels) {
            setConformanceLevels(JSON.parse(storedConformanceLevels));
        }

        /**
        getFromChromeStorage(window.location.hostname + ".reportIsLoaded", false)
        .then((value)=>{
          setReportIsLoaded(value);
        });
        */
    }, []);

    useEffect(() => {
        getFromChromeStorage(window.location.hostname + ".reportIsLoaded").then(result => {
            setReportIsLoaded(JSON.parse(result));
        })
    }, []);


    return (
        <div className="audit-sample">
            <h2>Audit Sample</h2>

            <p className='sep'>Select Evaluators:</p>
            <div className="page-div">
                <div className="checkboxes">
                    {checkboxes.map((checkbox: any, index: any) => (
                        <div className="checkbox-wrapper" key={index}>
                            <div className="checkbox">
                                <input
                                    type="checkbox"
                                    checked={checkbox.checked}
                                    onChange={() => handleCheckboxChange(index)}
                                    className={checkbox.checked ? "checked" : ""}
                                />
                                <span onClick={() => { window.open(checkbox.href, '_blank'); }}>
                                    {checkbox.label}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
                <div className='ev-button'>
                    <Button
                        classList={"primary br"}
                        onClickHandler={() => { evaluateScope(setAnimateBtn) }}
                        innerText={"Evaluate selected scope"}
                        isLoading={animateBtn !== "none"}
                        animate={animateBtn === "evaluate"}
                    />
                </div>

                <div className="tabs">
                    <div
                        className={activeTab === 'tables' ? 'active' : ''}
                        onClick={() => setActiveTab('tables')}
                        style={{ width: "90px" }}
                    >
                        Tables
                    </div>
                    <div
                        className={activeTab === 'observations' ? 'active' : ''}
                        onClick={() => setActiveTab('observations')}
                        style={{ width: "136px" }}
                    >
                        Observations
                    </div>
                </div>

                <div className="table">
                    {activeTab === 'tables' && (<>
                        <div className='row'>
                            <SummaryTable conformanceLevels={conformanceLevels}></SummaryTable>
                        </div>
                        <div className='tables'>
                            <ResultsTable conformanceLevels={conformanceLevels}></ResultsTable>
                            <OverallTable conformanceLevels={conformanceLevels}></OverallTable>
                        </div>
                    </>)}

                    {activeTab === 'observations' && (<>
                        <p>Observations:</p>
                        <div className='observations'>
                            <Observations conformanceLevels={conformanceLevels}></Observations>
                        </div>
                    </>)}
                </div>

            </div>
        </div>
    );
}