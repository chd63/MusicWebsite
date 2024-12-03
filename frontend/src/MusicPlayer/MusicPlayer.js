import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './MusicPlayer.css';

const MusicPlayer = ({ songId, queue }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioUrl, setAudioUrl] = useState(null);
    const [volume, setVolume] = useState(1);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [currentQueue, setCurrentQueue] = useState(queue || []);  
    const [currentSongIndex, setCurrentSongIndex] = useState(0);  
    const [loop, setLoop] = useState(false);  
    const [songName, setSongName] = useState('');
    const audioRef = useRef(null);
    const ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

    // Fetch and play the song based on the current song ID
    const playSongById = async (id) => {
        try {
            const response = await axios.get(ENDPOINT + `/api/songs/streamSongById`, {
                params: { songId: id },
                responseType: 'blob',
            });

            const audioBlob = response.data;
            const newAudioUrl = URL.createObjectURL(audioBlob);
            setAudioUrl(newAudioUrl);

            // TODO: add a request for song name
            const songInfoResponse = await axios.post(ENDPOINT + `/api/songs/getsonginfo`, { songId: id });
            const { song } = songInfoResponse.data;
            setSongName(song.title); // Set the song title
            console.log("Song Metadata:", song);


            if (audioRef.current) {
                audioRef.current.src = newAudioUrl;
                audioRef.current.volume = volume;
                audioRef.current.play().catch((error) => console.error('Error playing audio:', error));
                setIsPlaying(true);
            }
        } catch (error) {
            console.error('Error fetching song stream:', error);
        }
    };

    // Play the next song in the queue
    const playNextInQueue = () => {
        if (Array.isArray(currentQueue) && currentQueue.length > 0 && currentSongIndex < currentQueue.length - 1) {
            const nextSongId = currentQueue[currentSongIndex + 1];
            setCurrentSongIndex(currentSongIndex + 1);
            playSongById(nextSongId);
        } else {
            console.log('Queue is empty or all songs have been played.');
            setIsPlaying(false);  // Stop playback when queue is empty
        }
    };

    // Handle song end event to play the next song in the queue
    const handleSongEnd = () => {
        if (loop) {
            audioRef.current.currentTime = 0;  // Restart song if loop is enabled
            audioRef.current.play();
        } else if (currentQueue && currentQueue.length > 0) {
            playNextInQueue();  // Play next song in queue
        } else {
            setIsPlaying(false);  // Stop playback if no songs in the queue
        }
    };

    // Handle normal song playback
    useEffect(() => {
        if (songId) {
            playSongById(songId);  // Play the song if a new song ID is passed
        }
    }, [songId]);

    // Handle queue change
    useEffect(() => {
        setCurrentQueue(queue || []);  // Ensure queue is updated
        setCurrentSongIndex(0); // Start from the first song in the queue
    }, [queue]);

    

    const togglePlayPause = () => {
        const audio = audioRef.current;
        if (isPlaying) {
            audio.pause();
        } else {
            audio.play().catch((error) => console.error('Error playing audio:', error));
        }
        setIsPlaying(!isPlaying);
    };

    const handleVolumeChange = (event) => {
        const newVolume = parseFloat(event.target.value);
        setVolume(newVolume);
        if (audioRef.current) {
            audioRef.current.volume = newVolume;
        }
    };

    const handleTimeUpdate = () => {
        const audio = audioRef.current;
        setCurrentTime(audio.currentTime);
        setDuration(audio.duration);
    };

    const handleSliderChange = (event) => {
        const newTime = parseFloat(event.target.value);
        setCurrentTime(newTime);
        if (audioRef.current) {
            audioRef.current.currentTime = newTime;
        }
    };

    const toggleLoop = () => {
        setLoop(!loop);  // Toggle the loop feature
    };

    const skipToNextSong = () => {
        playNextInQueue();  // Skip to the next song in the queue
    };

    return (
        <div className="music-player">
            {audioUrl && (
                <>
                    <div className="song-name">{songName}</div>
                    <audio
                        ref={audioRef}
                        loop={loop}  // Set loop functionality
                        onEnded={handleSongEnd} // Call the function to play the next song
                        onTimeUpdate={handleTimeUpdate}
                    />
                    <div className="controls-container">
                        <div
                            className={isPlaying ? 'play-button pause' : 'play-button play'}
                            onClick={togglePlayPause}
                        >
                            {isPlaying ? 'Pause' : 'Play'}
                        </div>

                        <div className="timer-container">
                            <span className="current-time">
                                {formatTime(currentTime)}
                            </span>
                            <input
                                type="range"
                                min="0"
                                max={duration}
                                value={currentTime}
                                onChange={handleSliderChange}
                                className="time-slider"
                            />
                            <span className="duration">
                                {formatTime(duration)}
                            </span>
                        </div>

                        <div className="volume-control">
                            <label htmlFor="volume-slider">Volume</label>
                            <input
                                id="volume-slider"
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={volume}
                                onChange={handleVolumeChange}
                            />
                        </div>

                        {/* Loop button */}
                        <div className="loop-button" onClick={toggleLoop}>
                            {loop ? 'Stop Loop' : 'Loop Song'}
                        </div>

                        {/* Skip button */}
                        <div className="skip-button" onClick={skipToNextSong}>
                            Skip to Next
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
};

export default MusicPlayer;