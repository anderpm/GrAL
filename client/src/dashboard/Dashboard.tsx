import React from 'react';
import { useState, useEffect } from "react";
import '../styles/dashboard/dashboard.scss';
import Button from '../components/reusables/Button';
import { fetchServer } from '../scripts/utils/moreUtils.js';
import { getFromChromeStorage, removeFromChromeStorage, storeOnChromeStorage } from "../scripts/utils/chromeUtils.js";
import Header from './components/Header';
import Navbar from './components/Navbar';
import DefineScope from './pages/DefineScope';
import SelectSample from './pages/SelectSample';
import AuditSample from './pages/AuditSample';
import Overview from './pages/Overview';
import ExploreWebsite from './pages/ExploreWebsite';

export default function Dashboard(): JSX.Element {

	const [authenticationState, setAuthenticationState] = useState("notLogged");
	const [selectedMenu, setSelectedMenu] = useState<string>("");

	const onLogoutHandler = () => {
		removeFromChromeStorage("authenticationState", true);
		setAuthenticationState("notLogged");
	}

	useEffect(() => {
		getFromChromeStorage("authenticationState", true)
			.then(value => value != null && setAuthenticationState(JSON.parse(value)));
	});

	return (
		<>
			<Header
				authenticationState={authenticationState}
				setAuthenticationState={setAuthenticationState}
			></Header>
			{authenticationState !== "logging" && authenticationState !== "registering" && (<>
				<div className="container">
					<Navbar onMenuSelect={setSelectedMenu}></Navbar>
					<div className='menu'>
						{selectedMenu === "Overview" && (<>
							<Overview onMenuSelect={setSelectedMenu}></Overview>
						</>)}
						{selectedMenu === "Define Scope" && (<>
							<DefineScope></DefineScope>
						</>)}
						{selectedMenu === "Explore Website" && (<>
							<ExploreWebsite></ExploreWebsite>
						</>)}
						{selectedMenu === "Select Sample" && (<>
							<SelectSample></SelectSample>
						</>)}
						{selectedMenu === "Audit Sample" && (<>
							<AuditSample></AuditSample>
						</>)}
					</div>
				</div>
			</>)}

			<div id="extension_authentication_section">
				{authenticationState === "logging" ? (
					<LoginForm setAuthState={setAuthenticationState} />
				) : authenticationState === "registering" ? (
					<RegisterForm setAuthState={setAuthenticationState} />
				) : null}
			</div>
		</>
	);
}


/**
 * LoginForm component.
 * @param {Object} props - Component properties.
 * @param {Function} props.setAuthState - Function to set the authentication state.
 * @returns {JSX.Element} The rendered LoginForm component.
 */
function LoginForm({ setAuthState }: any): JSX.Element {

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");

	const handleSubmit = async () => {

		if (email === "" || password === "") {
			alert("You must fill all input fields!!");
			return;
		}

		const bodyData: any = JSON.stringify({ email, password, action: "login" });

		const loginResult: any = await fetchServer(bodyData, "userAuthentication");

		if (loginResult.success) {
			storeOnChromeStorage("authenticationState", loginResult.username, true);
			setAuthState(loginResult.username);
		} else {
			window.alert(loginResult.error);
		}

	};

	return (
		<div className='form'>

			<h2>Login</h2>

			<InputField
				value={email}
				htmlFor={"email"}
				onChangeHandler={(e: any) => setEmail(e.target.value)}
			/>

			<InputField
				value={password}
				htmlFor={"password"}
				onChangeHandler={(e: any) => setPassword(e.target.value)}
			/>

			<FormButtons
				authState={"logging"}
				setAuthState={setAuthState}
				submitHandler={handleSubmit}
			/>

		</div>
	);
}


/**
 * RegisterForm component.
 * @param {Object} props - Component properties.
 * @param {Function} props.setAuthState - Function to set the authentication state.
 * @returns {JSX.Element} The rendered RegisterForm component.
 */
function RegisterForm({ setAuthState }: any): JSX.Element {

	const [email, setEmail] = useState('');
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [repeatPassword, setRepeatPassword] = useState('');

	const handleSubmit = async () => {

		if (password !== repeatPassword) {
			alert("Passwords do not match!!");
			return;
		} else if (email === "" || username === "" || password === "") {
			alert("You must fill all input fields!!");
			return;
		}

		const bodyData: any = JSON.stringify({ email, username, password, action: "register" });

		const registerResult: any = await fetchServer(bodyData, "userAuthentication");

		if (registerResult.success) {
			window.alert("Successfully registered");
			setAuthState("logging");
		} else {
			window.alert("User already exists!!");
		}

	};

	return (
		<div className='form'>

			<h2>Register</h2>

			<InputField
				value={email}
				htmlFor={"email"}
				onChangeHandler={(e: any) => setEmail(e.target.value)}
			/>

			<InputField
				value={username}
				htmlFor={"username"}
				onChangeHandler={(e: any) => setUsername(e.target.value)}
			/>

			<InputField
				value={password}
				htmlFor={"password"}
				onChangeHandler={(e: any) => setPassword(e.target.value)}
			/>

			<InputField
				value={repeatPassword}
				htmlFor={"repeatPassword"}
				onChangeHandler={(e: any) => setRepeatPassword(e.target.value)}
			/>

			<FormButtons
				authState={"registering"}
				setAuthState={setAuthState}
				submitHandler={handleSubmit}
			/>

		</div>
	);
}


/**
 * InputField component.
 * @param {Object} props - Component properties.
 * @param {string} props.value - The current value of the input field.
 * @param {string} props.htmlFor - The HTML 'for' attribute of the input field.
 * @param {Function} props.onChangeHandler - Function to handle input field changes.
 * @returns {JSX.Element} The rendered InputField component.
 */
function InputField({ value, htmlFor, onChangeHandler }: any): JSX.Element {

	const data: any = {
		"email": { type: "text", labelTxt: "Email:" },
		"username": { type: "text", labelTxt: "Username:" },
		"password": { type: "password", labelTxt: "Password:" },
		"repeatPassword": { type: "password", labelTxt: "Repeat password:" }
	}

	return (
		<div className='field'>
			<label htmlFor={htmlFor}>{data[htmlFor].labelTxt}</label>
			<input
				type={data[htmlFor].type}
				value={value}
				onChange={onChangeHandler}
			/>
		</div>
	);

}


/**
 * FormButtons component.
 * @param {Object} props - Component properties.
 * @param {string} props.authState - The current authentication state.
 * @param {Function} props.setAuthState - Function to set the authentication state.
 * @param {Function} props.submitHandler - Function to handle form submission.
 * @returns {JSX.Element} The rendered FormButtons component.
 */
function FormButtons({ authState, setAuthState, submitHandler }: any): JSX.Element {

	const [btnIsLoading, setBtnIsLoading] = useState(false);

	const stateBtnData: any = {
		"logging": ["Login", "Register", "registering"],
		"registering": ["Register", "Login", "logging"]
	};

	const onSubmit = () => {
		setBtnIsLoading(true);
		try {
			submitHandler();
		} catch (error) {
			console.log(error);
		} finally {
			setBtnIsLoading(false);
		}
	}

	return (
		<div className='options'>

			<div className='leftDiv'>
				<Button
					classList={"primary"}
					onClickHandler={onSubmit}
					innerText={stateBtnData[authState][0]}
					isLoading={btnIsLoading}
				/>
			</div>

			<div className='rightDiv'>
				<Button
					classList={"secondary"}
					onClickHandler={() => setAuthState(stateBtnData[authState][2])}
					innerText={stateBtnData[authState][1]}
					isLoading={btnIsLoading}
				/>
				<Button
					classList={"secondary spaced"}
					onClickHandler={() => setAuthState("notLogged")}
					innerText={"Cancel"}
					isLoading={btnIsLoading}
				/>
			</div>

		</div>
	);

}