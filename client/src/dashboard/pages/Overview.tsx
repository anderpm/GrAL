import React from 'react';

import '../../styles/dashboard/components/pages/overview.scss';

import { useEffect, useState } from "react";
import Button from '../../components/reusables/Button';

interface OverviewProps {
    onMenuSelect: (menu: string) => void;
}

const Overview: React.FC<OverviewProps> = ({ onMenuSelect }) => {

    return (
        <div className='overview'>
            <h2>Overview</h2>
            <div className='resto'>
                <p>
                    WCAG-EM Report Tool turns your accessibility evaluation findings into a report.
                    It is based on the Web Content Accessibility Guidelines Evaluation Methodology (WCAG-EM).
                </p>
                <div className="button-container">
                    <Button
                        classList={"primary"}
                        onClickHandler={() => onMenuSelect("Define Scope")}
                        innerText={"Start New Report"}
                    />
                </div>
            </div>
        </div>
    );
}

export default Overview;