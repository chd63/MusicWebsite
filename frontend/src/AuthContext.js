import React, {createContext, useContext, useState} from 'react';
import axios from "axios";

const AuthContext = createContext({
    authToken : null,
    id : null,
    login : () => {},
    logout : () => {}
});

const AuthProvider = ({children}) => {
    const [authToken, setAuthToken] = useState(null);
    const [id, setId] = useState(null);
    const ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

    const login = async (username, password) => {
        console.log("ENDPOINT = " + ENDPOINT);
        try {
            let response = await axios.post(ENDPOINT + "/api/auth/login", {username, password});

            if (response.status === 200) {
                setAuthToken(response.data.token);
                setId(response.data.id);
            }

            console.log("Login status: " + response.status);

            return response;
        } catch (error) {
            console.log("Error logging in:", error);
            return null;
        }
    }

    const logout = async () => {
        setAuthToken(null);
        setId(null);
    }

    const value = {
        authToken,
        id,
        login,
        logout
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);

export default AuthProvider;