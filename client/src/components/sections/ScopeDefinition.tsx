import React from 'react';

import '../../styles/sections/scopeDefinition.scss';

import { useEffect, useState } from "react";
import Button from '../reusables/Button';
import Dropdown from '../reusables/DropdownSection';

import { getImgSrc } from '../../scripts/utils/chromeUtils.js';


const defaultScope = [{name: window.document.title, url: window.location.href}];
const defaultNewWebPage = { name: "", url: "" };


/**
 * Component for managing the evaluation scope and defining web pages.
 * @returns {JSX.Element} ScopeDefinition component.
 */
export default function ScopeDefinition (): JSX.Element {

  const [scope, setScope] = useState(defaultScope);
  const [newWebPage, setNewWebPage] = useState(defaultNewWebPage);
  const [editItemIndex, setEditItemIndex] = useState(-1);

  useEffect(() => { 
    const storedScope = localStorage.getItem("scope");
    if(storedScope){
      setScope(JSON.parse(storedScope));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("scope", JSON.stringify(scope));
  }, [scope]);

  /**
   * Adds a new web page item to the scope list.
   */
  const handleAddItem = () => {
    setNewWebPage(defaultNewWebPage);
    setEditItemIndex(scope.length);
    setScope([...scope, defaultNewWebPage]);
  };

  /**
   * Sets the selected web page item for editing.
   * @param {number} index - The index of the web page item to edit.
   */
  const handleEditItem = (index:any) => {
    setNewWebPage(scope[index]);
    setEditItemIndex(index);
  };

  /**
   * Saves the changes made to the edited web page item.
   */
  const handleSaveChanges = () => {
    const baseUrl:any = window.location.hostname;

    if(newWebPage.name === ""){
      alert("Wrong web page name");
    }else if(!newWebPage.url.includes(baseUrl)){
      alert("URL must start with: " + baseUrl);
    }else{
      const newScope = [...scope];
      newScope[editItemIndex] = newWebPage;
      setScope(newScope);
      setEditItemIndex(-1);
    }    
  };

  /**
   * Deletes a web page item from the scope list.
   * @param {number} index - The index of the web page item to delete.
   */
  const handleDeleteItem = (index:any) => {
    const newScope = [...scope];
    newScope.splice(index, 1);
    setScope(newScope.length === 0 ? defaultScope : newScope);
  };


  return ( 
    <Dropdown headerText={"Evaluation scope"} classList={"first lineSpaced"}>

      <ul id="extensionScopeInputList">
        {scope.map((webPage:any, index:any) => (
          <li className="scopeInput" key={index}>
            {editItemIndex === index ? (

              <div className="inputWrapper">
                <input
                  type="text"
                  placeholder="Name"
                  value={newWebPage.name}
                  onChange={(e) => setNewWebPage({ ...newWebPage, name: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="URL"
                  value={newWebPage.url}
                  onChange={(e) => setNewWebPage({ ...newWebPage, url: e.target.value })}
                /><br/>
                <Button 
                    classList={"primary small lineSpaced"} 
                    onClickHandler={handleSaveChanges} 
                    innerText={"Save"}   
                    small={true} 
                />
                {(newWebPage.name === "" && newWebPage.url === "")  && ( 
                  <Button 
                    classList={"secondary small spaced lineSpaced"} 
                    onClickHandler={() => handleDeleteItem(index)} 
                    innerText={"Cancel"}  
                    small={true}  
                  />
                )}
              </div>

            ) : (

              <div className="inputWrapper">
                <span onClick={() => { window.open(webPage.url, '_blank'); }}>
                  {webPage.name.length > 20 ?  
                    webPage.name.substring(0, 20) + "... " 
                  : 
                    webPage.name
                  }
                </span>
                <img 
                  className="icon edit" 
                  alt="edit web page data" 
                  src={getImgSrc("edit")} 
                  onClick={() => handleEditItem(index)} 
                />
                {(scope.length > 1 || 
                  scope[0].name !== defaultScope[0].name || 
                  scope[0].url !== defaultScope[0].url) && ( 
                  <img 
                    className="icon delete" 
                    alt="remove web page from list" 
                    src={getImgSrc("delete")} 
                    onClick={() => handleDeleteItem(index)} 
                  />
                )}
              </div>

            )}
          </li>
        ))}
      </ul>
      
      <Button 
          classList={"primary"} 
          onClickHandler={handleAddItem} 
          innerText={"New web page"}    
      />
      
    </Dropdown>
   );
}

