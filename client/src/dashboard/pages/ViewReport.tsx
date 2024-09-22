import React from 'react';
import { useState, useEffect } from "react";

import '../../styles/dashboard/components/pages/viewReport.scss';
import Button from '../../components/reusables/Button';
import { downloadLoadedReport } from '../../scripts/reportLoadingOptions.js';


interface ReportData {
    "@context": string;
    type: string;
    "@language": string;
    title: string;
    commissioner: string;
    "dct:date": string;
    assertors: {
        id: string;
        type: string;
        "xmlns:name": string;
        description: string;
    }[];
    creator: {
        id: string;
        "xmlns:name": string;
    };
    evaluationScope: {
        website: {
            id: string;
            type: string[];
            siteName: string;
            siteScope: string;
        };
        conformanceTarget: string;
        accessibilitySupportBaseline: string;
        additionalEvalRequirement: string;
    };
    structuredSample: {
        webpage: any[]; // Ajustar si sabes el tipo exacto
    };
    auditSample: any[]; // Ajustar si sabes el tipo exacto
}


const ViewReport = () => {

    const [json, setJson] = useState<ReportData | null>(null);

    useEffect(() => {
        const getJson = localStorage.getItem("localhost");
        if (getJson) {
            setJson(JSON.parse(getJson));
        }
    }, []);

    return (
        <div className='exploreWebsite'>
            <h2>View Report</h2>
            <div className='resto'>
                <h3>Report title</h3>
                <p>{json?.title}</p>
                <h3>Evaluation commissioner</h3>
                <p>{json?.commissioner}</p>
                <h3>Evaluator</h3>
                <p>
                    {
                        json?.assertors?.map((assertor: any) => assertor?.['xmlns:name']).join(' & ')
                    }
                </p>
                <h3>Evaluation date</h3>
                <p>{json?.['dct:date']}</p>
                <div className="button-container">
                    <Button className='button-export' classList="primary" onClickHandler={() => downloadLoadedReport()} innerText="Export Report"></Button>
                </div>
            </div>
        </div>
    );
}

export default ViewReport;