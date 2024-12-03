import React, {useState, useEffect} from 'react';
import {useAuth} from "../AuthContext";
import {Link, useNavigate} from 'react-router-dom';
import "./Forms.css";
import axios from "axios";

function SignUp() {
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [passwordCopy, setPasswordCopy] = useState("");
    const [resultMessage, setResultMessage] = useState("");
    const navigate = useNavigate();
    const authContext = useAuth();

    const ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (password !== passwordCopy) {
            return setResultMessage("Passwords must match!")
        }
        
        await axios.post(ENDPOINT + "/api/users/create", {username, password, email})
            .then(response => {
                setResultMessage(response.data.message);

                if (response.status === 201) {
                    console.log(authContext);
                    let loginResult = authContext.login(username, password);

                    if (loginResult) {
                        setResultMessage(loginResult.data.message);

                        if (loginResult.status === 200) {
                            navigate("/");
                        }
                    } else {
                        setResultMessage("There was an error logging in");
                    }
                }
            })
            .catch(error => {
                setResultMessage("An unexpected error occurred");
                console.error("Error signing up:", error);
            });
    }

    useEffect(() => {
        console.log(authContext);

        if (authContext.authToken) {
            navigate("/");
        }
    });

    return (
        <div className="SignUp">
            <h1 className="account-form-title">Create a free account</h1>
            <p className="result-message">{resultMessage}</p>
            <form className="account-form" onSubmit={handleSubmit}>
                <label className="account-label">
                    Enter your email
                    <br/>
                    <input 
                        className="account-input"
                        type="email"
                        placeholder="Email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value.trim())}
                    />
                </label>
                <br/>
                <label className="account-label">
                    Create username
                    <br/>
                    <input 
                        className="account-input"
                        type="text"
                        placeholder="Username"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value.trim())}
                    />
                </label>
                <br />
                <label className="account-label">
                    Create password
                    <br/>
                    <input 
                        className="account-input"
                        type="password"
                        placeholder="Password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value.trim())}
                    />
                </label>
                <br/>
                <label className="account-label">
                    Confirm password
                    <br/>
                    <input 
                        className="account-input"
                        type="password"
                        placeholder="Confirm password"
                        required
                        value={passwordCopy}
                        onChange={(e) => setPasswordCopy(e.target.value.trim())}
                    />
                </label>
                <br/>
                <button className="account-submit-button" type="submit">Submit</button>
            </form>
            <p className="account-form-link">Have an account? <Link to="/signin">Sign In</Link></p>
        </div>
    );
}

export default SignUp;