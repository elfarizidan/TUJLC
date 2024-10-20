import React, { useRef } from 'react';
import './VideoPlayer.css';
import video from '../../assets/Language Club_PKKMB2024.mp4';

const VideoPlayer = ({ playState, setPlayState }) => {
    const player = useRef(null);
    const videoElement = useRef(null); // Create a ref for the video element

    const closePlayer = (e) => {
        if (e.target === player.current) {
            if (videoElement.current) {
                videoElement.current.pause(); // Pause the video
                videoElement.current.muted = true; // Mute the audio
            }
            setPlayState(false);
        }
    };

    return (
        <div className={`video-player ${playState ? '' : 'hide'}`} ref={player} onClick={closePlayer}>
            <video ref={videoElement} src={video} autoPlay muted controls></video>
        </div>
    );
};

export default VideoPlayer;
