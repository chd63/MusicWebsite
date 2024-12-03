import React, { useEffect, useState } from 'react';
import axios from 'axios';
import MusicPlayer from '../MusicPlayer/MusicPlayer'; 
import { useAuth } from '../AuthContext'; 
import "./HomePage.css";

function HomePage() {
    const ENDPOINT = process.env.REACT_APP_API_ENDPOINT;
    const { authToken, id } = useAuth(); // Assuming you have userId available through authContext
    const [songs, setSongs] = useState([]);
    const [initialSongs, setInitialSongs] = useState([]);
    const [currentSongId, setCurrentSongId] = useState(null);
    const [queue, setQueue] = useState([]);
    const [query, setQuery] = useState("");
    const [error, setError] = useState(null);
    const [activeSongId, setActiveSongId] = useState(null); // Track the song with the open hamburger menu
    const [userPlaylists, setUserPlaylists] = useState([]); // State for storing user's playlists
    const [selectedPlaylist, setSelectedPlaylist] = useState(""); // State for the selected playlist
    const [playlists, setPlaylists] = useState([]);

    const requestData = {
        id: id
    };

    useEffect(() => {
        const fetchSongs = async () => {
            try {
                const response = await axios.post(ENDPOINT + '/api/songs/homepagesongs');
                const loadedSongs = response.data.songs || [];
                
                setSongs(loadedSongs);
                setInitialSongs(loadedSongs);
            } catch (error) {
                console.error('Error fetching songs:', error);
            }
        };



        fetchSongs();
        if (authToken) {
            fetchPlaylists();
        }
    }, [ENDPOINT, authToken, id]);

    const handleInputChange = (e) => {
        setQuery(e.target.value);
    };

    const fetchPlaylists  = async () => {
        try {
            const response = await axios.post(ENDPOINT + "/api/songs/userplaylists", requestData);
            if (response.data.message === "Success") {
                console.log("Fetched Playlists:", response.data.playlists);
                setPlaylists(response.data.playlists); // Update playlists state
            } else {
                console.log("No playlists found for this user");
            }
        } catch (error) {
            console.error("Error retrieving playlists:", error);
        }
    };

    const handleSearch = async () => {
        if (!query.trim()) {
            setError('Please enter a search term.');
            return;
        }

        try {
            const response = await axios.get(ENDPOINT + '/api/search', {
                params: { q: query }
            });
            setSongs(response.data.songs || []);
            setError(null);
        } catch (error) {
            console.error('Error searching songs:', error);
            setError('Failed to fetch search results.');
        }
    };

    const handleReset = () => {
        setSongs(initialSongs);
        setQuery("");
        setError(null);
    };

    const handleHamburgerClick = (e, songId) => {
        e.stopPropagation(); 
        setActiveSongId(activeSongId === songId ? null : songId);
    };

    const handleAddToPlaylist  = async (e, songId) => {

        console.log(songId, selectedPlaylist);
        e.stopPropagation(); // Prevent song block click from triggering
        if (!selectedPlaylist) {
            alert('Please select a playlist!');
            return;
        }

        try {
            const response = await axios.post(ENDPOINT + '/api/songs/addsongtoplaylist', {
                userId: id,
                playlistId: selectedPlaylist,
                songId: songId
            });

            if (response.status === 200) {
                alert('Song added to playlist!');
                setActiveSongId(null);
                setSelectedPlaylist(""); // Reset the selected playlist after adding the song
            }
        } catch (error) {
            console.error('Error adding song to playlist:', error);
            alert('Failed to add song to playlist');
        }
    };

    const handleAddToPlayQue = (e, songId) => {
        e.stopPropagation(); // Prevent song block click from triggering
        console.log(`Song ${songId} added to queue!`);
        setQueue((prevQueue) => [...prevQueue, songId]); 
        setActiveSongId(null); 
    };

    const handleSongBlockClick = (e, songId) => {
        if (e.target.tagName === 'SELECT' || e.target.tagName === 'OPTION') {
            return; // Ignore clicks on dropdown elements
        }

        setCurrentSongId(songId); 
    };

    return (
        <div className="home-page">
            <div className="searchbar">
                <input
                    type="text"
                    value={query}
                    onChange={handleInputChange}
                    placeholder="Search..."
                />
                <button onClick={handleSearch}>Search</button>
                <button onClick={handleReset}>Reset</button>
            </div>
            {error && <div className="error-message">{error}</div>}

            <div className="song-list">
                {songs.length > 0 ? (
                    songs.map((song) => (
                        <div
                            key={song.songId}
                            className="song-block"
                            onClick={(e) => handleSongBlockClick(e, song.streamId)} // Only switch the song when clicking the block
                        >
                            <h2>{song.title}</h2>
                            <p>{song.description}</p>

                            {/* Hamburger Menu Icon */}
                            <div
                                className="hamburger-menu"
                                onClick={(e) => handleHamburgerClick(e, song.songId)} // Prevent song change when hamburger is clicked
                            >
                                &#9776;
                            </div>

                            {/* Conditional Menu for Adding to Playlist */}
                            {activeSongId === song.songId && (
                                <div className="menu">
                                    {authToken && ( // Render "Add to Playlist" only if user is signed in
                                        <>
                                            <select
                                                value={selectedPlaylist}
                                                onChange={(e) => {
                                                    e.stopPropagation(); // Prevent parent click handler from triggering
                                                    const selectedId = e.target.value;
                                                    console.log("Selected Playlist Object:", e.target.value);
                                                    setSelectedPlaylist(selectedId );
                                                }}
                                            >
                                                <option value="">Select Playlist</option>
                                                {playlists.map((playlist) => (
                                                    <option key={playlist.playlistId} value={playlist.playlistId}>
                                                        {playlist.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <button onClick={(e) => handleAddToPlaylist(e, song.streamId)}>
                                                Add to Playlist
                                            </button>
                                        </>
                                    )}
                                    <button onClick={(e) => handleAddToPlayQue(e,  song.streamId)}>
                                        Add to Que
                                    </button>
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <p>No songs found.</p>
                )}
            </div>
            {currentSongId && <MusicPlayer songId={currentSongId} queue={queue} />}
        </div>
    );
}

export default HomePage;