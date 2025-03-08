import { useEffect, useRef, useState } from "react";

export const Sender = () => {
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [pc, setPC] = useState<RTCPeerConnection | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const ws = new WebSocket("ws://localhost:8080");

        ws.onopen = () => {
            ws.send(JSON.stringify({ type: "sender" }));
        };

        ws.onmessage = async (event) => {
            const message = JSON.parse(event.data);
            if (message.type === "createAnswer") {
                await pc?.setRemoteDescription(new RTCSessionDescription(message.sdp));
            } else if (message.type === "iceCandidate") {
                await pc?.addIceCandidate(new RTCIceCandidate(message.candidate));
            }
        };

        setSocket(ws);
        return () => ws.close();
    }, []);

    const initiateConnection = async () => {
        if (!socket) {
            alert("Socket not found!");
            return;
        }

        const peerConnection = new RTCPeerConnection({
            iceServers: [
                { urls: "stun:stun.l.google.com:19302" }, // Google STUN
    { 
        urls: "turn:openrelay.metered.ca:80", // Free TURN server  
        username: "openrelayproject",
        credential: "openrelayproject"
    }
            ]
        });

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.send(JSON.stringify({ type: "iceCandidate", candidate: event.candidate }));
            }
        };

        peerConnection.onnegotiationneeded = async () => {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            socket.send(JSON.stringify({ type: "createOffer", sdp: offer }));
        };

        setPC(peerConnection);
        getCameraStream(peerConnection);
    };

    const getCameraStream = async (peerConnection: RTCPeerConnection) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }
            stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));
        } catch (error) {
            console.error("Error accessing camera:", error);
        }
    };

    return (
        <div>
            <h2>Sender</h2>
            <video ref={videoRef} autoPlay playsInline muted width="400"></video>
            <button onClick={initiateConnection}>Start Streaming</button>
        </div>
    );
};
