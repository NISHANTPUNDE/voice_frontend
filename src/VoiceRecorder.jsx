// components/VoiceRecorder.js
import React, { useState, useEffect } from "react";
import axios from "axios";

const VoiceRecorder = () => {
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [previewAudio, setPreviewAudio] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [recordingStatus, setRecordingStatus] = useState("");

  useEffect(() => {
    fetchUploadedFiles();
  }, []);

  const fetchUploadedFiles = async () => {
    try {
      const res = await axios.get("http://localhost:5000/audios");
      setUploadedFiles(res.data.files);
    } catch (error) {
      console.error("Failed to fetch uploaded files", error);
    }
  };

  const startRecording = async () => {
    // Clear any previous audio chunks when starting a new recording
    setAudioChunks([]);
    setRecordingStatus("Recording...");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Use audio/webm for recording (most compatible)
      const mimeType = "audio/webm";

      const recorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        audioBitsPerSecond: 128000,
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          setAudioChunks((prev) => [...prev, e.data]);
        }
      };

      recorder.onstop = () => {
        setRecordingStatus("Processing...");
      };

      // Set time slice to 1 second
      recorder.start(1000);
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      console.error("Error starting recording:", err);
      setRecordingStatus("Recording failed to start");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      // First update the state
      setIsRecording(false);

      // Then stop the recorder
      mediaRecorder.stop();

      // Process the recording after stopping
      setTimeout(async () => {
        try {
          // Create a blob from the audio chunks
          const blob = new Blob(audioChunks, { type: "audio/webm" });
          const url = URL.createObjectURL(blob);
          setPreviewAudio(url);

          // Upload the audio file
          const formData = new FormData();
          formData.append("audio", blob, `recording_${Date.now()}.webm`);

          setRecordingStatus("Uploading and converting to MP3...");

          const response = await axios.post(
            "http://localhost:5000/upload",
            formData
          );

          console.log("Upload successful:", response.data);
          setRecordingStatus("Ready");

          // Refresh the file list
          fetchUploadedFiles();
        } catch (err) {
          console.error("Upload error", err);
          setRecordingStatus("Upload failed");
        }
      }, 500);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>🎤 Voice Recorder App (MP3)</h1>
      <div style={{ marginBottom: 10 }}>
        <button
          onClick={startRecording}
          disabled={isRecording}
          style={{
            padding: 10,
            backgroundColor: "#4CAF50",
            color: "white",
            marginRight: 10,
          }}
        >
          Start Recording
        </button>
        <button
          onClick={stopRecording}
          disabled={!isRecording}
          style={{ padding: 10, backgroundColor: "#ccc" }}
        >
          Stop Recording
        </button>
        {recordingStatus && (
          <span style={{ marginLeft: 10 }}>{recordingStatus}</span>
        )}
      </div>

      {/* {previewAudio && (
        <div>
          <h3>🎧 Preview</h3>
          <audio controls src={previewAudio}></audio>
          <p style={{ fontSize: 12, color: "#666" }}>
            (Preview is in WebM format, uploaded version will be MP3)
          </p>
        </div>
      )} */}



      <div style={{ marginTop: 30 }}>
        <h3>📁 MP3 Recordings</h3>
        {uploadedFiles.length > 0 ? (
          uploadedFiles.map((file, i) => (
            <div
              key={i}
              style={{
                marginBottom: 20,
                padding: 10,
                border: "1px solid #eee",
                borderRadius: 5,
              }}
            >
              <p>Recording #{uploadedFiles.length - i}</p>
              <audio controls src={`http://localhost:5000${file}`}></audio>
              <div style={{ fontSize: 12, marginTop: 5 }}>
                <a
                  href={`http://localhost:5000${file}`}
                  download
                  target="_blank"
                  rel="noreferrer"
                >
                  Download MP3
                </a>
              </div>
            </div>
          ))
        ) : (
          <p>No recordings yet. Record something!</p>
        )}
      </div>
    </div>
  );
};

export default VoiceRecorder;
