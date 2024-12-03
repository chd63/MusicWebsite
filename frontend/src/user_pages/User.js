import React, { useState, useEffect } from 'react';
import { useAuth } from "../AuthContext";
import axios from "axios";
import { useNavigate } from 'react-router-dom';
import MusicPlayer from "../MusicPlayer/MusicPlayer"; // Import the MusicPlayer component
import "./User.css";

function User() {
    const ENDPOINT = process.env.REACT_APP_API_ENDPOINT;
    const { authToken, id } = useAuth();
    const navigate = useNavigate();
    const [userInfo, setUserInfo] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [songs, setSongs] = useState([]);
    const [currentSongId, setCurrentSongId] = useState(null);
    const [queue, setQueue] = useState([]); // Queue state
    const [activeSongId, setActiveSongId] = useState(null); // Track the active song ID for the menu
    const [playlistName, setPlaylistName] = useState('');
    const [playlists, setPlaylists] = useState([]); // Store playlists state
    const [playlistError, setPlaylistError] = useState('');
    const [songName, setSongName] = useState('');
    const [songNames, setSongNames] = useState({});

    const requestData = {
        id: id
    };

    // Fetch user profile, songs, and playlists
    useEffect(() => {
        if (authToken === null) {
            setErrorMessage("You are not signed in. Please log in to get song list.");
        } else {
            setErrorMessage('');
            handleSongCall();
            UserProfile();
            fetchUserPlaylists(); // Fetch playlists when logged in
            
        }
    }, [authToken]);

    // Fetch user's song list
    const handleSongCall = async () => {
        try {
            const response = await axios.post(ENDPOINT + "/api/songs/usersongs", requestData);
            if (response.data.message === "Success") {
                setSongs(response.data.songs);
            } else {
                console.log("No songs found for this user");
            }
        } catch (error) {
            console.error("Error retrieving songs:", error);
        }
    };

    // Fetch user profile data (username)
    const UserProfile = async () => {
        try {
            const response = await axios.get(ENDPOINT + `/api/users/read/${id}`);
            if (response.status === 200) {
                setUserInfo(response.data);  // Store the user profile data
            }
        } catch (error) {
            if (error.response) {
                setErrorMessage(error.response.data.message);
            } else {
                setErrorMessage("Error fetching user profile");
            }
        }
    };

    // Fetch user's playlists
    const fetchUserPlaylists = async () => {
        try {
            const response = await axios.post(ENDPOINT + "/api/songs/userplaylists", requestData);
            if (response.data.message === "Success") {
                setPlaylists(response.data.playlists);
            } else {
                console.log("No playlists found for this user");
            }
        } catch (error) {
            console.error("Error retrieving playlists:", error);
        }
    };

    const handleHamburgerClick = (e, songId) => {
        e.stopPropagation(); 
        setActiveSongId(activeSongId === songId ? null : songId);
    };

    // Add song to playlist
    const handleAddToPlaylist = async (playlistId, songId) => {
        try {
            // Making API call to add the song to the playlist
            const response = await axios.post(ENDPOINT + "/api/songs/addsongtoplaylist", {
                userId: id,
                playlistId: playlistId,
                songId: songId
            });
    
            if (response.data.message === "Song added to playlist successfully") {
                console.log(`Song ${songId} added to playlist ${playlistId}!`);
                alert("Song added to playlist successfully!");
                fetchUserPlaylists(); // Re-fetch playlists to include the new song in the selected playlist
            } else {
                console.error("Error adding song to playlist:", response.data.message);
            }
    
            setActiveSongId(null); // Close the menu after adding the song
        } catch (error) {
            console.error("Error adding song to playlist:", error);
            alert("An error occurred while adding the song to the playlist.");
        }
    };

    // Add song to queue with event blocking
    const handleAddToPlayQue = (e, songId) => {
        e.stopPropagation(); 
        console.log(`Song ${songId} added to queue!`);
        setQueue((prevQueue) => [...prevQueue, songId]); 
        setActiveSongId(null); 
    };

    // Handle click on a song block (to select the song for playback)
    const handleSongBlockClick = (e, songId) => {
        if (e.target.tagName === 'SELECT' || e.target.tagName === 'OPTION') {
            return; // Ignore clicks on dropdown elements
        }

        setCurrentSongId(songId); 
    };

    const handlePlaylistAddition = async (e) => {
        e.preventDefault();
        console.log(playlistName);

        if (!playlistName.trim()) {
            setPlaylistError("Playlist name is required");
            return;
        }
        
        try {
            const response = await axios.post(ENDPOINT + "/api/songs/createplaylist", {
                name: playlistName,
                userId: id, // Use the logged-in user's ID
            });

            if (response.data.message === "Playlist created successfully") {
                // Reset playlist name and show success
                setPlaylistName('');
                setPlaylistError('');
                alert("Playlist created successfully!");
                fetchUserPlaylists(); // Re-fetch playlists to include newly created one
            }
        } catch (error) {
            console.error("Error creating playlist:", error);
            setPlaylistError("Error creating playlist. Please try again.");
        }
    };

    // Add this function to handle adding all songs in a playlist to the queue
    const handlePlaylistClick = (playlistId) => {
        const playlist = playlists.find(playlist => playlist.playlistId === playlistId);
        if (playlist) {
            setQueue((prevQueue) => [...prevQueue, ...playlist.songIds]); // Add all song IDs to the queue
        }
    };

    const handleSongNameCall  = async (songId) => {
        try {
            const songInfoResponse = await axios.post(ENDPOINT + `/api/songs/getsonginfo`, { songId: songId });
            const { song } = songInfoResponse.data;
            setSongNames((prevNames) => ({
                ...prevNames,
                [songId]: song.title,  // Store the song title by songId
            }));
        } catch (error) {
            console.error("Error fetching song name:", error);
        }
    };

    useEffect(() => {
        // Only fetch song names for songs that haven't been fetched yet
        const fetchSongNames = async () => {
            const songsToFetch = playlists.flatMap((playlist) =>
                playlist.songIds.filter((songId) => !songNames[songId])
            );
    
            for (let songId of songsToFetch) {
                await handleSongNameCall(songId); // Fetch song name for each song
            }
        };
    
        fetchSongNames();
    }, [playlists, songNames]);


    return (
    <div>
        {!authToken && <p className="errorMessage" style={{ color: 'red' }}>{errorMessage}</p>}

        {userInfo ? (
            <h1>{userInfo.userInfo.username}'s Song List</h1>
        ) : (
            <p>Loading user profile...</p>
        )}

        <div className="song-list-wrapper">
            {/* Left Side: Song List */}
            <div className="song-list">
                {songs.length > 0 ? (
                    songs.map((song) => (
                        <div 
                            key={song.songId} 
                            className="song-block" 
                            onClick={(e) => handleSongBlockClick(e, song.streamId)} 
                        >
                            <h2>{song.title}</h2>
                            <p>{song.description}</p>
                            
                            {/* Hamburger Menu Icon */}
                            <div
                                className="hamburger-menu"
                                onClick={(e) => handleHamburgerClick(e, song.songId)} 
                            >
                                &#9776;
                            </div>

                            {/* Conditional Menu for Adding to Playlist and Queue */}
                            {activeSongId === song.songId && (
                                <div className="menu">
                                    {authToken && (
                                        <div>
                                            {/* Dropdown to select playlist */}
                                            <select
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    const selectedPlaylistId = e.target.value;
                                                    handleAddToPlaylist(selectedPlaylistId, song.streamId);
                            
                                                }}
                                                defaultValue="" // Default empty option
                                            >
                                                <option value="" disabled>
                                                    Select Playlist
                                                </option>
                                                {playlists.map((playlist) => (
                                                    <option
                                                        key={playlist.playlistId}
                                                        value={playlist.playlistId}
                                                    >
                                                        {playlist.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                    <button onClick={(e) => handleAddToPlayQue(e, song.streamId)}>
                                        Add to Queue
                                    </button>
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <p>No songs to display</p>
                )}
            </div>

            {/* Right Side: Playlist Creation Form */}
            {authToken && (
                <div className="playlist-section">
                    <h2>Create Playlist</h2>
                    <form onSubmit={handlePlaylistAddition}>
                        <label>
                            Playlist Name:
                            <input
                                type="text"
                                value={playlistName}
                                onChange={(e) => setPlaylistName(e.target.value)}
                            />
                        </label>
                        {playlistError && (
                            <p className="errorMessage" style={{ color: 'red' }}>{playlistError}</p>
                        )}
                        <button type="submit">Create Playlist</button>
                    </form>

                    {/* Display user's playlists */}
                    <h2>Your Playlists</h2>
                    {playlists.length > 0 ? (
                        <ul>
                            {playlists.map((playlist) => (
                                <li key={playlist.playlistId}>
                                    <button onClick={() => handlePlaylistClick(playlist.playlistId)}>
                                        {playlist.name}
                                    </button>
                                    <ul>
                                        {playlist.songIds.map((songId) => (  
                                            <li key={songId}>{songNames[songId] || 'Loading...'}</li> 
                                        ))}
                                    </ul>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p>No playlists available.</p>
                    )}
                </div>
            )}
        </div>

        {currentSongId && <MusicPlayer songId={currentSongId} queue={queue} />}
    </div>
    );
}

export default User;