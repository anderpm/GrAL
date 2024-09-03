import React from 'react';

import '../../styles/dashboard/components/pages/viewReport.scss';
import Button from '../../components/reusables/Button';
import { downloadLoadedReport } from '../../scripts/reportLoadingOptions.js';


const ViewReport = () => {

    return (
        <div className='exploreWebsite'>
            <h2>View Report</h2>
            <div className='resto'>
                <div className="button-container">
                    <Button className='button-export' classList="primary" onClickHandler={() => downloadLoadedReport()} innerText="Export Report"></Button>
                </div>
            </div>
        </div>
    );
}

export default ViewReport;