import React from 'react';

import '../styles/main.scss';

import { useEffect, useState } from "react";
import StoredReportManagement from './sections/StoredReportManagement';
import UserAuthentication from './sections/UserAuthentication';
import ScopeDefinition from './sections/ScopeDefinition';
import EvaluatorSelection from './sections/EvaluatorSelection';
import EvaluationOptions from './sections/EvaluationOptions';
import ReportResults from './sections/ReportResults/ReportResults';


import { getFromChromeStorage, getImgSrc, openOptionsPage } from '../scripts/utils/chromeUtils.js';
import icon128 from '../images/icon128.png';
import settingsGear from '../images/settingsGear.png';


/**
 * Extension main component that wraps all other functionalities.
 * @returns {JSX.Element} The rendered JSX element.
 */
export default function Main() : JSX.Element {

    const [shiftWebpage, setShiftWebpage] = useState(false);
    const [extensionHidden, setExtensionHidden] = useState(false);
    const [authenticationState, setAuthenticationState] = useState("notLogged");
    const [manageStoredReports, setManageStoredReports] = useState(false);

    return (<>
        {/*
        <img 
            id="hidden_extension_logo" 
            alt="extension logo when hidden" 
            src={icon128} 
            onClick={()=>setExtensionHidden(!extensionHidden)} 
        />
        */}

        <div id="react_chrome_extension" className= {`${extensionHidden && 'hidden'}`}>
            {/* <img 
                className="icon options" 
                src={settingsGear} 
                alt="open configuration options window" 
                onClick={openOptionsPage} 
            /> */}
            
            {/** <span className="icon close" onClick={()=>setExtensionHidden(!extensionHidden)}>&times;</span> */}

            <div className="img_container">
                <img 
                alt="extension logo" 
                src={icon128} 
                onClick={() => window.open("https://github.com/anderpm/GrAL", '_blank')} 
                />
            </div>

            {manageStoredReports ? <>
      
                <StoredReportManagement 
                    setManageStoredReports={setManageStoredReports} 
                    authenticationState={authenticationState} 
                />

            </> : <>
                
                <UserAuthentication 
                    authenticationState={authenticationState} 
                    setAuthenticationState={setAuthenticationState} 
                />

                { authenticationState !== "logging" && authenticationState !== "registering" && (<>
                    <ScopeDefinition />
                    <EvaluatorSelection />
                    <EvaluationOptions
                        authenticationState={authenticationState} 
                        setLoadingReports={setManageStoredReports} 
                    />
                    <ReportResults />
                </> )}

            </>}

        </div>



    </>);
}