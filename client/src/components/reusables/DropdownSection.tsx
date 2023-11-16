import React from 'react';

import '../../styles/reusables/dropdownSection.scss';

import { useState } from 'react';

import { getImgSrc } from '../../scripts/utils/chromeUtils';


/**
 * Dropdown component.
 * @param {Object} props - Component properties.
 * @param {string} props.headerText - Text content for the dropdown header.
 * @param {React.ReactNode} props.children - Content of the dropdown body.
 * @param {string} [props.classList] - Additional CSS classes for the dropdown.
 * @returns {JSX.Element} The rendered dropdown component.
 */
export default function Dropdown({ headerText, children, classList }:any) : JSX.Element {

    const [isOpen, setIsOpen] = useState(false);

    return(
        <div className={"extensionDropdown " + classList}>
            <div className="header" onClick={() => setIsOpen((prev:any) => !prev) }>
                <img src = { isOpen ? getImgSrc("extendedArrow") : getImgSrc("contractedArrow") } alt="dropdown_arrow" />
                <span>{headerText}</span>
            </div>

            <div className="body" style={isOpen ? {display: "block"} : {display: "none"}}>
                { children }
            </div>
        </div>
    );
}