import "./UploadSong.css";
import React, { useState, useEffect, useRef  } from 'react';
import {useAuth} from "../AuthContext";
import axios from "axios";

function UploadSong() {
    const ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

    const { authToken, id } = useAuth();
    const [errorMessage, setErrorMessage] = useState('');
    //console.log(authToken);
    //console.log(id);

    
    // state to store a selected file
    const [selectedFile, setSelectedFile] = useState(null);
    const [songTitle, setSongTitle] = useState('');
    const [songDescription, setDescription] = useState('');

    // Effect to set error message based on authToken
    useEffect(() => {
        if (authToken === null) {
            setErrorMessage("You are not signed in. Please log in to upload a song.");
        } else {
            setErrorMessage(''); // Clear error message if signed in
        }
    }, [authToken]); 

    // ref for file input
    const fileInputRef = useRef(null);

    // set null song title 
    const handleTitleChange = (event) => {
        setSongTitle(event.target.value);
    };

    // set description
    const handleDescriptionChange = (event) => {
        setDescription(event.target.value);
    };

    // handle file selection
    const handleFileChange = (event) =>{
        setSelectedFile(event.target.files[0]);
    };


    const handleFileUpload = async () => {
        if(selectedFile && songTitle)
        {
            // TODO : add an append data for user 

            // TODO : add an append data for the users
            const formData = new FormData();
            formData.append('id', id); // Add the user ID
            formData.append('songTitle', songTitle); // Add the song title
            formData.append('songDescription', songDescription || ''); // Add the song description
            formData.append('selectedFile', selectedFile);

            // temp for upload use
            console.log('Form Data:', formData);

            // TODO 
            try {
                const response = await axios.post(ENDPOINT + "/api/songs/create", formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data', // Set the proper content type
                    },
                });
                console.log('Upload response:', response.data);
                clearInputs();
                fileInputRef.current.value = null;
                alert('File successfully uploaded!'); 
            } catch (error) {
                console.error('Error uploading song:', error);
                alert('Error uploading file. Please try again.'); // Notify the user of the error
            }

        }
        else if(authToken === null)
        {
            alert('you are not signed in so you can not upload a file');
        }
        else
        {
            alert('please select a file to upload');
        }
    };

    // Function to clear the inputs
    const clearInputs = () => {
        setSelectedFile(null);
        setSongTitle('');
        setDescription('');
    };

    return (

        <>
            <div className="UploadSong">
                <h1>Please Enter A Song To Upload</h1>
            </div>
            <br></br>
            {!authToken && <p className="errorMessage" style={{ color: 'red' }}>{errorMessage}</p>} {/* Display error message */}
            <div className="uploadFile">
                <span>Enter Song Name </span>
                <input
                    type="text" 
                    placeholder="Enter Song Title"
                    value={songTitle}
                    onChange={handleTitleChange} 
                />
                <br /><br />
                <span>Enter Description </span>
                <input
                    type="text" 
                    placeholder="Enter Description"
                    value={songDescription}
                    onChange={handleDescriptionChange} 
                />
                <br /><br />
                <input type="file"  ref={fileInputRef} onChange={handleFileChange} />
                {selectedFile && <p>Selected File: {selectedFile.name}</p>}
                <button onClick={handleFileUpload}>Upload</button>
                
            </div>
        </>

    );
}

export default UploadSong;