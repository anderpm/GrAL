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

import Dashboard from '../dashboard/Dashboard';

/**
 * Extension main component that wraps all other functionalities.
 * @returns {JSX.Element} The rendered JSX element.
 */
export default function Main(): JSX.Element {

    return (
        <div>
            <Dashboard></Dashboard>
        </div>
    );

}