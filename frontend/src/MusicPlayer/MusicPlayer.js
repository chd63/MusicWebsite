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
    const [isMinimized, setIsMinimized] = useState(false); // State to track minimized/maximized

    const audioRef = useRef(null);
    const ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

    const playSongById = async (id) => {
        try {
            const response = await axios.get(ENDPOINT + `/api/songs/streamSongById`, {
                params: { songId: id },
                responseType: 'blob',
            });

            const audioBlob = response.data;
            const newAudioUrl = URL.createObjectURL(audioBlob);
            setAudioUrl(newAudioUrl);

            const songInfoResponse = await axios.post(ENDPOINT + `/api/songs/getsonginfo`, { songId: id });
            const { song } = songInfoResponse.data;
            setSongName(song.title); 

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

    const playNextInQueue = () => {
        if (Array.isArray(currentQueue) && currentQueue.length > 0 && currentSongIndex < currentQueue.length - 1) {
            const nextSongId = currentQueue[currentSongIndex + 1];
            setCurrentSongIndex(currentSongIndex + 1);
            playSongById(nextSongId);
        } else {
            setIsPlaying(false);  
        }
    };

    const handleSongEnd = () => {
        if (loop) {
            audioRef.current.currentTime = 0;  
            audioRef.current.play();
        } else if (currentQueue && currentQueue.length > 0) {
            playNextInQueue();  
        } else {
            setIsPlaying(false);  
        }
    };

    useEffect(() => {
        if (songId) {
            playSongById(songId);  
        }
    }, [songId]);

    useEffect(() => {
        setCurrentQueue(queue || []);  
        setCurrentSongIndex(0); 
    }, [queue]);

    const togglePlayPause = (event) => {
        event.stopPropagation();  // Prevent the event from propagating to the parent div
        const audio = audioRef.current;
        if (isPlaying) {
            audio.pause();
        } else {
            audio.play().catch((error) => console.error('Error playing audio:', error));
        }
        setIsPlaying(!isPlaying);
    };

    const handleVolumeChange = (event) => {
        event.stopPropagation();  // Prevent the event from propagating to the parent div
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
        event.stopPropagation();  // Prevent the event from propagating to the parent div
        const newTime = parseFloat(event.target.value);
        setCurrentTime(newTime);
        if (audioRef.current) {
            audioRef.current.currentTime = newTime;
        }
    };

    const toggleLoop = (event) => {
        event.stopPropagation();  // Prevent the event from propagating to the parent div
        setLoop(!loop);
    };
    

    const skipToNextSong = (event) => {
        event.stopPropagation();  // Prevent the event from propagating to the parent div
        playNextInQueue();  
    };

    const toggleMinimized = () => {
        setIsMinimized(!isMinimized); 
    };

    return (
        <div className={`music-player ${isMinimized ? 'minimized' : ''}`}>
            {audioUrl && (
                <>
                    <div className="song-name" onClick={toggleMinimized}>
                        {songName}
                    </div>
                    <audio
                        ref={audioRef}
                        loop={loop}
                        onEnded={handleSongEnd}
                        onTimeUpdate={handleTimeUpdate}
                    />
                    <div className="controls-container">
                        <div
                            className={isPlaying ? 'play-button pause' : 'play-button play'}
                            onClick={(event) => {
                                event.stopPropagation();  // Prevent triggering the minimize logic
                                togglePlayPause(event);
                            }}
                        >
                            {isPlaying ? 'Pause' : 'Play'}
                        </div>
    
                        {!isMinimized && (
                            <>
                                <div className="timer-container">
                                    <span className="current-time">
                                        {formatTime(currentTime)}
                                    </span>
                                    <input
                                        type="range"
                                        min="0"
                                        max={duration}
                                        value={currentTime}
                                        onChange={(event) => {
                                            event.stopPropagation();  // Prevent triggering the minimize logic
                                            handleSliderChange(event);
                                        }}
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
                                        onChange={(event) => {
                                            event.stopPropagation();  // Prevent triggering the minimize logic
                                            handleVolumeChange(event);
                                        }}
                                    />
                                </div>
    
                                <div
                                    className="loop-button"
                                    onClick={(event) => {
                                        event.stopPropagation(); // Prevent triggering the minimize logic
                                        toggleLoop(event);
                                    }}
                                >
                                    {loop ? 'Stop Loop' : 'Loop Song'}
                                </div>
    
                                <div
                                    className="skip-button"
                                    onClick={(event) => {
                                        event.stopPropagation(); // Prevent triggering the minimize logic
                                        skipToNextSong(event);
                                    }}
                                >
                                    Skip to Next
                                </div>
                            </>
                        )}
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