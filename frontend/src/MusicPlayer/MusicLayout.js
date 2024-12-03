import React, { useState } from 'react';
import MusicPlayer from './MusicPlayer';

const MusicLayout = ({ children }) => {
    const [currentSongUrl, setCurrentSongUrl] = useState(null);

    const handlePlaySong = (url) => {
        setCurrentSongUrl(url);
    };

    return (
        <div className="music-layout">
            <div className="content">{children}</div>
            <MusicPlayer songUrl={currentSongUrl} />
        </div>
    );
};

export default MusicLayout;