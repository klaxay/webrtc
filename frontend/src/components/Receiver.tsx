import { useEffect, useRef, useState } from "react";

export const Receiver = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [pc, setPC] = useState<RTCPeerConnection | null>(null);

    useEffect(() => {
        const socket = new WebSocket("ws://localhost:8080");

        socket.onopen = () => {
            socket.send(JSON.stringify({ type: "receiver" }));
        };

        const peerConnection = new RTCPeerConnection({
            iceServers: [
                { urls: "stun:stun.l.google.com:19302" }, // Google STUN
    { 
        urls: "turn:openrelay.metered.ca:80", // Free TURN server  
        username: "openrelayproject",
        credential: "openrelayproject"
    }            ]
        });

        const mediaStream = new MediaStream();
        if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
        }

        peerConnection.ontrack = (event) => {
            mediaStream.addTrack(event.track);
            if (videoRef.current) {
                videoRef.current.play().catch(() => {
                    console.log("Autoplay blocked, waiting for user interaction...");
                });
            }
        };

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.send(JSON.stringify({ type: "iceCandidate", candidate: event.candidate }));
            }
        };

        socket.onmessage = async (event) => {
            const message = JSON.parse(event.data);
            if (message.type === "createOffer") {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(message.sdp));
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);
                socket.send(JSON.stringify({ type: "createAnswer", sdp: answer }));
            } else if (message.type === "iceCandidate" && message.candidate) {
                await peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
            }
        };

        setPC(peerConnection);
        return () => {
            socket.close();
            peerConnection.close();
        };
    }, []);

    return (
        <div>
            <h2>Receiver</h2>
            <video ref={videoRef} autoPlay playsInline controls width="400"></video>
            <button onClick={() => videoRef.current?.play()}>Start Video</button>
        </div>
    );
};
