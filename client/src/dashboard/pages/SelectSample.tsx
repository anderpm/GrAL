import React, { useState, useEffect } from 'react';

import '../../styles/dashboard/components/pages/selectSample.scss';


/**
 * A React component that allows the user to select which accessibility evaluators to use.
 * 
 * @function EvaluatorSelectionSection
 * @returns {JSX.Element} The JSX code for rendering the component.  
*/
export default function SelectSample(): JSX.Element {

	const defaultNewWebPage = { name: "", url: "" };
	const [newWebPage, setNewWebPage] = useState<{ name: string; url: string }>(defaultNewWebPage);
	const [scope, setScope] = useState<{ name: string; url: string }[]>([]);
	const [baseUrl, setBaseUrl] = useState<string>("");
	const [editItemIndex, setEditItemIndex] = useState<number>(-1);
	const [defaultScope, setDefaultScope] = useState<{ name: string; url: string }[]>([]);


	useEffect(() => {
		// Recuperar el scope del localStorage al montar el componente
		const storedScope = localStorage.getItem("scope");
		const storedBaseUrl = localStorage.getItem("baseUrl");
		const storedDefaultScope = localStorage.getItem("defaultScope");

		if (storedScope) {
			setScope(JSON.parse(storedScope));
		}
		if (storedBaseUrl) {
			setBaseUrl(storedBaseUrl);
		}
		if (storedDefaultScope) {
			setDefaultScope(JSON.parse(storedDefaultScope));
		}
	}, []);

	const handleAddItem = () => {
		if (!newWebPage.name || !newWebPage.url) {
			alert("Both name and URL are required to add a new web page.");
		} else if (!newWebPage.url.startsWith(baseUrl)) {
			alert(`The URL must start with ${baseUrl}`);
		} else {
			const newScope = [...scope, newWebPage];
			setScope(newScope);
			localStorage.setItem("scope", JSON.stringify(newScope));
			setNewWebPage(defaultNewWebPage);
		}
	};

	const handleEditItem = (index: number) => {
		if (isDefaultScope(scope[index])) {
			return; // No hacer nada si el elemento es inmutable
		}
		setNewWebPage(scope[index]);
		setEditItemIndex(index);
	};

	const handleSaveChanges = () => {
		if (!newWebPage.name || !newWebPage.url) {
			alert("Both name and URL are required.");
		} else if (!newWebPage.url.startsWith(baseUrl)) {
			alert(`The URL must start with ${baseUrl}`);
		} else {
			const newScope = [...scope];
			newScope[editItemIndex] = newWebPage;
			setScope(newScope);
			localStorage.setItem("scope", JSON.stringify(newScope));
			setNewWebPage(defaultNewWebPage);
			setEditItemIndex(-1);
		}
	};

	const handleDeleteItem = (index: number) => {
		if (isDefaultScope(scope[index])) {
			return; // No hacer nada si el elemento es inmutable
		}
		const newScope = [...scope];
		newScope.splice(index, 1);
		setScope(newScope);
		localStorage.setItem("scope", JSON.stringify(newScope));
	};

	const isDefaultScope = (item: { name: string; url: string }) => {
		return defaultScope.some(d => d.name === item.name && d.url === item.url);
	};


	return (
		<div className="evaluator-selection">
			<h2>Select Sample</h2>
			<div className='resto'>
				<div id="scopeList">
					{scope.map((webPage, index) => (
						<div className="scopeInput" key={index}>
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
									/>
									<button onClick={handleSaveChanges}>Save</button>
								</div>
							) : (
								<div className="inputWrapper">
									<span onClick={() => { window.open(webPage.url, '_blank'); }}>
										{webPage.name}
									</span>
									{index !== 0 && !isDefaultScope(webPage) && (
										<>
											<button
												className="edit"
												onClick={() => handleEditItem(index)}
											>
												Edit
											</button>
											<button
												className="delete"
												onClick={() => handleDeleteItem(index)}
											>
												Delete
											</button>
										</>
									)}
								</div>
							)}
						</div>
					))}
				</div>
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
					/>
					<button onClick={handleAddItem}>Add to Scope</button>
				</div>

			</div>
		</div >
	);
}