import React from 'react';

/* import '../../styles/sections/scopeDefinition.scss'; */
import '../../styles/dashboard/components/pages/defineScope.scss';

import { useEffect, useState } from "react";
import Button from '../../components/reusables/Button';
import Dropdown from '../../components/reusables/DropdownSection';

import { getImgSrc } from '../../scripts/utils/chromeUtils.js';
import edit from '../../images/edit.png';
import deleteI from '../../images/delete.png';
import { uploadNewReport } from '../../scripts/reportLoadingOptions.js';

import extendedArrow from '../../images/extendedArrow.png';
import contractedArrow from '../../images/contractedArrow.png';



// const defaultScope = [{name: window.document.title, url: window.location.href}];
const defaultScope = [{ name: "Noticias de Gipuzkoa", url: "https://www.noticiasdegipuzkoa.eus/" }];
const defaultNewWebPage = { name: "", url: "" };


/**
 * Component for managing the evaluation scope and defining web pages.
 * @returns {JSX.Element} DefineScope component.
 */
export default function DefineScope(): JSX.Element {

	const [scope, setScope] = useState(defaultScope);
	const [newWebPage, setNewWebPage] = useState(defaultNewWebPage);
	const [editItemIndex, setEditItemIndex] = useState(-1);
	const [conformanceLevels, setConformanceLevels] = useState(['A', 'AA']);
	const [dropdownOpen, setDropdownOpen] = useState(false);

	useEffect(() => {
		const storedScope = localStorage.getItem("scope");
		if (storedScope) {
			setScope(JSON.parse(storedScope));
		}
	}, []);

	useEffect(() => {
		localStorage.setItem("scope", JSON.stringify(scope));
	}, [scope]);

	useEffect(() => {
		const storedConformanceLevels = localStorage.getItem("conformanceLevels");
		if (storedConformanceLevels) {
			setConformanceLevels(JSON.parse(storedConformanceLevels));
		}
	}, []);

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
	const handleEditItem = (index: any) => {
		setNewWebPage(scope[index]);
		setEditItemIndex(index);
	};

	/**
	 * Saves the changes made to the edited web page item.
	 */
	const handleSaveChanges = () => {
		const baseUrl: any = window.location.hostname;

		if (newWebPage.name === "") {
			alert("Wrong web page name");
			/* }else if(!newWebPage.url.includes(baseUrl)){
			  alert("URL must start with: " + baseUrl); */
		} else {
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
	const handleDeleteItem = (index: any) => {
		const newScope = [...scope];
		newScope.splice(index, 1);
		setScope(newScope.length === 0 ? defaultScope : newScope);
	};

	const handleLevelClick = (level: any) => {
		const levels = level === 'A' ? ['A'] : (level === 'AA' ? ['A', 'AA'] : ['A', 'AA', 'AAA']);
		setConformanceLevels(levels);
		localStorage.setItem("conformanceLevels", JSON.stringify(levels));
	};

	return (
		<div className="define-scope">
			<h2>Define Scope</h2>

			<ul id="extensionScopeInputList">
				{scope.map((webPage: any, index: any) => (
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
								/><br />
								<Button
									classList={"primary small lineSpaced"}
									onClickHandler={handleSaveChanges}
									innerText={"Save"}
									small={true}
								/>
								{(newWebPage.name === "" && newWebPage.url === "") && (
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
									src={edit}
									onClick={() => handleEditItem(index)}
								/>
								{(scope.length > 1 ||
									scope[0].name !== defaultScope[0].name ||
									scope[0].url !== defaultScope[0].url) && (
										<img
											className="icon delete"
											alt="remove web page from list"
											src={deleteI}
											onClick={() => handleDeleteItem(index)}
										/>
									)}
							</div>
						)}
					</li>
				))}
			</ul>

			<div className='buttons'>
				<Button
					classList={"primary"}
					onClickHandler={handleAddItem}
					innerText={"New web page"}
				/>
				<label className='W3Report'>
					<input type="file" accept=".json" onChange={(event: any) => uploadNewReport(event)} />
					Import W3Report
				</label>
			</div>

			<div className="alignment-container">
				<div id="conformanceLevelSelector">
					<p>Select conformance level:</p>
					<div className="level-container">
						{["A", "AA", "AAA"].map((level: any) => (
							<div
								key={level}
								className={`conformanceLevels ${conformanceLevels.includes(level) ? 'selected' : ''}`}
								onClick={() => handleLevelClick(level)}
							>
								{level}
							</div>
						))}
					</div>
				</div>
				<div className='dropdownBtn'>
					<p>Select conformance level:</p>
					<div
						className={`dropdownHead${dropdownOpen ? " active" : ""}`}
						onClick={() => setDropdownOpen(!dropdownOpen)}
					>
						<label>WCAG Version</label>
						<img src={dropdownOpen ? extendedArrow : contractedArrow} alt="dropdown_arrow" />
					</div>
					{dropdownOpen && (
						<div className='dropdownBody'>
							<label>
								WCAG 2.1
							</label>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
