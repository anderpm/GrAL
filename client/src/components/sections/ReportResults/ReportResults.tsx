import React from 'react';

import '../../../styles/sections/resultSection/reportResults.scss';

import { useEffect, useState } from "react";
import ResultsTable from './ResultsTable';
import SummaryTable from './SummaryTable';
import { getFromChromeStorage } from '../../../scripts/utils/chromeUtils';


/**
 * Component for displaying currently loaded report results.
 * @returns {JSX.Element} ReportResults component.
 */
export default function ReportResults(): JSX.Element {
  
  const [conformanceLevels, setConformanceLevels] = useState(['A', 'AA']);

  const [reportIsLoaded, setReportIsLoaded] = useState("false");

  useEffect(() => {
    const storedConformanceLevels = localStorage.getItem("conformanceLevels");
    if(storedConformanceLevels){
      setConformanceLevels(JSON.parse(storedConformanceLevels));
    }

    /**
    getFromChromeStorage(window.location.hostname + ".reportIsLoaded", false)
    .then((value)=>{
      setReportIsLoaded(value);
    });
    */
  }, []);

  useEffect(()=>{
    getFromChromeStorage(window.location.hostname + ".reportIsLoaded").then(result => {
      setReportIsLoaded(JSON.parse(result));
    })
  }, []);


  useEffect(() => {
    localStorage.setItem("conformanceLevels", JSON.stringify(conformanceLevels));
  }, [conformanceLevels]);

  /**
   * Handles the click event on a conformance level.
   * @param {string} level - The selected conformance level.
   */
  function handleLevelClick (level:any) {
    const levels = level === 'A' ? ['A'] : (level === 'AA' ? ['A', 'AA'] : ['A', 'AA', 'AAA']);
    setConformanceLevels(levels);
  };

  return ( 
    <div id="resultSection">

      <div className="header"><span>Current report results</span></div>

      <div className="body">
        {reportIsLoaded === "true" ? <>

          <div id="conformanceLevelSelector">
            <p>Select conformace level:</p>
            <div className="level-container">
              {["A", "AA", "AAA"].map((level:any) => (
                <div 
                  className={`conformanceLevels ${conformanceLevels.includes(level) ? 'selected' : ''}`} 
                  onClick={() => handleLevelClick(level)}
                >
                  {level}
                </div>
              ))}
            </div>
          </div>

          <SummaryTable conformanceLevels={conformanceLevels}/>

          <ResultsTable conformanceLevels={conformanceLevels}/>
        
        </> : 
          <div style={{textAlign: "center", padding:"15px 0"}}>
            Website has not been evaluated
          </div>
        }
      </div>

    </div> 
  );

}

