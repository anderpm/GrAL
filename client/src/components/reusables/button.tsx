import React from 'react';
import '../../styles/reusables/button.scss';

import BeatLoader from 'react-spinners/BeatLoader';


/**
 * Custom button component.
 * @param {Object} props - Component properties.
 * @param {string} props.classList - Additional CSS classes for the button.
 * @param {function} props.onClickHandler - Click event handler for the button.
 * @param {string} props.innerText - Text content of the button.
 * @param {boolean} [props.isLoading=false] - Flag indicating if the button is in loading state.
 * @param {boolean} [props.animate=false] - Flag indicating if the button should display an animation.
 * @param {boolean} [props.disabled=false] - Flag indicating if the button is disabled.
 * @returns {JSX.Element} The rendered button component.
 */
export default function Button({ 
        classList, 
        onClickHandler, 
        innerText, 
        isLoading = false, 
        animate = false, 
        disabled = false 
}:any) : JSX.Element {

    return(
        <button 
            className={"extensionButton " + classList} 
            onClick={onClickHandler}
            disabled={isLoading || disabled}
        >
            {animate && isLoading ?
                <BeatLoader size={8} color="#ffffff" />
            : 
                innerText
            }
        </button>
    );
}