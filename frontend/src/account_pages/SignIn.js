import React, {useState, useEffect} from 'react';
import {useAuth} from "../AuthContext";
import {Link, useNavigate} from 'react-router-dom';
import "./Forms.css";

function SignIn() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [resultMessage, setResultMessage] = useState("");
    const authContext = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (event) => {
        event.preventDefault();
        
        let loginResult = await authContext.login(username, password);

        if (loginResult) {
            setResultMessage(loginResult.data.message);

            if (loginResult.status === 200) {
                navigate("/");
            }
        } else {
            setResultMessage("There was an error logging in");
        }
    }

    useEffect(() => {
        if (authContext.authToken) {
            navigate("/");
        }
    });

    return (
        <div className="SignIn">
            <h1 className="account-form-title">Sign In</h1>
            <p className="result-message">{resultMessage}</p>
            <form className="account-form" onSubmit={handleSubmit}>
                <label className="account-label">
                    Username
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
                    Password
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
                <button className="account-submit-button" type="submit">Sign In</button>
            </form>
            <p className="account-form-link">Don't have an account? <Link to="/signup">Sign Up</Link></p>
        </div>
    );
}

export default SignIn;