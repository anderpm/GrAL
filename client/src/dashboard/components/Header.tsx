import React from 'react';
import { useState, useEffect} from "react";
import '../../styles/dashboard/components/header.scss';
import icon128 from '../../images/icon128.png';
import WAA from '../../images/WAA.png';
import Button from '../../components/reusables/Button';
import { fetchServer } from '../../scripts/utils/moreUtils.js';
import { getFromChromeStorage, removeFromChromeStorage, storeOnChromeStorage } from "../../scripts/utils/chromeUtils.js";

export default function Header ({authenticationState, setAuthenticationState}:any): JSX.Element {

    const onLogoutHandler = () => {
        removeFromChromeStorage("authenticationState", true);
        setAuthenticationState("notLogged");
    }

    useEffect( ()=>{
        getFromChromeStorage("authenticationState", true)
        .then( value => value != null && setAuthenticationState(JSON.parse(value)) );
    });

    return (
        <div className='header'>
            <div className='left'>
                <img 
                    className='logo'
                    alt="extension logo" 
                    src={WAA} 
                    onClick={() => window.open("https://github.com/anderpm/GrAL", '_blank')} 
                />
                <h1>Web Accessibility Aggregator</h1>
            </div>
            
            <div className='right'>
                {authenticationState === "notLogged" ? (
                    <>
                        <Button 
                            classList="primary" 
                            onClickHandler={() => setAuthenticationState("logging")} 
                            innerText="Login" 
                        />
                        <Button 
                            /* classList="secondary spaced" */
                            classList="primary spaced" 
                            onClickHandler={() => setAuthenticationState("registering")} 
                            innerText="Register"  
                        />
                    </>
                ) : authenticationState === "logging" ? (
                    <></>
                ) : authenticationState === "registering" ? (
                    <></>
                ) : (
                    <>
                        <label className="userNameLabel">
                            {"@" + authenticationState}
                        </label>
                        <Button 
                            classList="secondary spaced" 
                            onClickHandler={onLogoutHandler} 
                            innerText="Logout" 
                        />
                    </>
                )}
            </div>
        </div>
    );
}


/**
 * LoginForm component.
 * @param {Object} props - Component properties.
 * @param {Function} props.setAuthState - Function to set the authentication state.
 * @returns {JSX.Element} The rendered LoginForm component.
 */
function LoginForm({setAuthState}:any): JSX.Element {

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = async () => {

        if(email === "" || password === ""){
            alert("You must fill all input fields!!");
            return;
        }

        const bodyData:any = JSON.stringify({email, password, action: "login"});

        const loginResult:any = await fetchServer(bodyData, "userAuthentication");

        if(loginResult.success){
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
                onChangeHandler={(e:any) => setEmail(e.target.value)}
            />

            <InputField 
                value={password} 
                htmlFor={"password"}
                onChangeHandler={(e:any) => setPassword(e.target.value)}
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
function RegisterForm({setAuthState}:any): JSX.Element {

    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [repeatPassword, setRepeatPassword] = useState('');

    const handleSubmit = async () => {

        if(password !== repeatPassword){
            alert("Passwords do not match!!");
            return;
        } else if(email === "" || username === "" || password === ""){
            alert("You must fill all input fields!!");
            return;
        }

        const bodyData:any = JSON.stringify({email, username, password, action: "register"});

        const registerResult:any = await fetchServer(bodyData, "userAuthentication");

        if(registerResult.success){
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
                onChangeHandler={(e:any) => setEmail(e.target.value)}
            />

            <InputField 
                value={username} 
                htmlFor={"username"}
                onChangeHandler={(e:any) => setUsername(e.target.value)}
            />

            <InputField 
                value={password} 
                htmlFor={"password"}
                onChangeHandler={(e:any) => setPassword(e.target.value)}
            />

            <InputField 
                value={repeatPassword} 
                htmlFor={"repeatPassword"}
                onChangeHandler={(e:any) => setRepeatPassword(e.target.value)}
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
function InputField({value, htmlFor, onChangeHandler}:any): JSX.Element {

    const data:any = {
        "email":{type:"text", labelTxt: "Email:"},
        "username": {type:"text", labelTxt: "Username:"},
        "password": {type:"password", labelTxt: "Password:"},
        "repeatPassword": {type:"password", labelTxt: "Repeat password:"}
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
function FormButtons({authState, setAuthState, submitHandler}:any): JSX.Element {

    const [btnIsLoading, setBtnIsLoading] = useState(false);

    const stateBtnData:any = {
        "logging":[ "Login", "Register", "registering" ],
        "registering":[ "Register", "Login", "logging" ]
    };

    const onSubmit = () => {
        setBtnIsLoading(true);
        try{
            submitHandler();
        }catch(error){
            console.log(error);
        }finally{
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