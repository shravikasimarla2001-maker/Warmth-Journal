import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Square,
  Play,
  Pause,
  Sparkles,
  Volume2,
  VolumeX,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Headphones,
  Radio,
  FileAudio,
} from "lucide-react";

interface VoiceDictationBarProps {
  onAppendTranscript: (text: string) => void;
  onReplaceTranscript?: (text: string) => void;
  currentThought: string;
}

// Check SpeechRecognition support
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export const VoiceDictationBar: React.FC<VoiceDictationBarProps> = ({
  onAppendTranscript,
  onReplaceTranscript,
  currentThought,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [recognitionSupported, setRecognitionSupported] = useState(true);
  const [audioLevel, setAudioLevel] = useState<number[]>([12, 24, 18, 30, 20, 16, 28, 14]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [voiceDurationSecs, setVoiceDurationSecs] = useState(0);

  // Audio recording playback state
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Check speech recognition capability on mount
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setRecognitionSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMessage(null);
      };

      recognition.onresult = (event: any) => {
        let currentInterim = "";
        let finalChunk = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalChunk += transcript + " ";
          } else {
            currentInterim += transcript;
          }
        }

        if (finalChunk.trim()) {
          onAppendTranscript(finalChunk);
        }
        setInterimTranscript(currentInterim);
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition event error:", event.error);
        if (event.error === "not-allowed") {
          setErrorMessage(
            "Microphone permission was denied. Please allow microphone access in your browser."
          );
        } else if (event.error === "no-speech") {
          // Normal timeout if user was quiet
        } else {
          setErrorMessage(`Speech recognition error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript("");
      };

      recognitionRef.current = recognition;
    } catch (e) {
      console.warn("Could not instantiate SpeechRecognition:", e);
      setRecognitionSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [onAppendTranscript]);

  // Visual audio wave animator when listening
  useEffect(() => {
    let animInterval: any;
    if (isListening) {
      animInterval = setInterval(() => {
        setAudioLevel([
          Math.floor(Math.random() * 26) + 6,
          Math.floor(Math.random() * 32) + 8,
          Math.floor(Math.random() * 28) + 10,
          Math.floor(Math.random() * 36) + 12,
          Math.floor(Math.random() * 30) + 8,
          Math.floor(Math.random() * 24) + 6,
          Math.floor(Math.random() * 34) + 10,
          Math.floor(Math.random() * 20) + 6,
        ]);
        setVoiceDurationSecs((prev) => prev + 1);
      }, 300);
    } else {
      setAudioLevel([8, 12, 10, 14, 10, 8, 12, 8]);
      setVoiceDurationSecs(0);
    }
    return () => clearInterval(animInterval);
  }, [isListening]);

  // Start live speech listening + audio recording
  const handleStartListening = async () => {
    setErrorMessage(null);
    setInterimTranscript("");

    // 1. Start SpeechRecognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (err: any) {
        console.warn("Recognition start issue:", err);
      }
    }

    // 2. Also capture voice note via MediaRecorder
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        audioChunksRef.current = [];
        const mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: "audio/webm",
          });
          const url = URL.createObjectURL(audioBlob);
          setAudioUrl(url);
          stream.getTracks().forEach((track) => track.stop());
        };

        mediaRecorder.start();
        mediaRecorderRef.current = mediaRecorder;
        setIsRecordingAudio(true);
      }
    } catch (err) {
      console.warn("Audio media recorder fallback:", err);
    }
  };

  // Stop listening
  const handleStopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.warn("Recognition stop issue:", err);
      }
    }

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
      setIsRecordingAudio(false);
    }

    setIsListening(false);
    setInterimTranscript("");
  };

  // Playback recorded audio
  const handleToggleAudioPlay = () => {
    if (!audioUrl) return;
    if (!audioElementRef.current) {
      const audio = new Audio(audioUrl);
      audio.onended = () => setIsPlayingAudio(false);
      audioElementRef.current = audio;
    }

    if (isPlayingAudio) {
      audioElementRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioElementRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  const formatSeconds = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins}:${remainder < 10 ? "0" : ""}${remainder}`;
  };

  return (
    <div className="bg-[#FAF7F2] rounded-2xl p-4 border border-[#E8DFC8] space-y-3 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left Status & Title */}
        <div className="flex items-center space-x-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              isListening
                ? "bg-gradient-to-r from-red-600 to-[#D35400] text-white shadow-md animate-pulse"
                : "bg-white text-[#935116] border border-[#E8DFC8]"
            }`}
          >
            {isListening ? (
              <Radio className="w-5 h-5 animate-spin" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className="font-display font-semibold text-xs text-[#2C241E]">
                Voice Diary & Speech-to-Text
              </span>
              {isListening && (
                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-bold animate-pulse">
                  Listening · {formatSeconds(voiceDurationSecs)}
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#7E6E5F]">
              {isListening
                ? "Speak freely... Your words will transcribe directly onto your journal page."
                : "Prefer speaking over typing? Press speak to dictate your thoughts naturally."}
            </p>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center space-x-2 self-start sm:self-auto">
          {/* Audio Player if recorded */}
          {audioUrl && !isListening && (
            <button
              type="button"
              onClick={handleToggleAudioPlay}
              className="px-3 py-1.5 bg-white hover:bg-[#F5EBE1] border border-[#E8DFC8] text-xs font-semibold text-[#4A3B32] rounded-xl flex items-center space-x-1.5 transition-colors shadow-2xs"
            >
              {isPlayingAudio ? (
                <>
                  <Pause className="w-3.5 h-3.5 text-[#BA4A00]" />
                  <span>Pause Note</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-[#BA4A00]" />
                  <span>Play Voice Note</span>
                </>
              )}
            </button>
          )}

          {/* Main Speak Trigger Button */}
          {!isListening ? (
            <button
              type="button"
              onClick={handleStartListening}
              className="px-4 py-2 bg-gradient-to-r from-[#D35400] to-[#E67E22] hover:opacity-95 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center space-x-1.5 transition-all hover:scale-102"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Speak Your Thoughts</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStopListening}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center space-x-1.5 transition-all"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Done Speaking</span>
            </button>
          )}
        </div>
      </div>

      {/* Live Visual Waveforms when Recording */}
      {isListening && (
        <div className="bg-white p-3 rounded-xl border border-[#E8DFC8] flex items-center justify-between space-x-4">
          <div className="flex items-center space-x-1 h-6">
            {audioLevel.map((height, i) => (
              <span
                key={i}
                style={{ height: `${height}px` }}
                className="w-1.5 rounded-full bg-gradient-to-t from-[#D35400] to-[#F39C12] transition-all duration-150"
              />
            ))}
          </div>

          <div className="flex-1 text-xs text-[#2C241E] font-journal italic truncate pl-2">
            {interimTranscript ? (
              <span>"{interimTranscript}..."</span>
            ) : (
              <span className="text-[#8C7B6C]">
                Listening to your voice... Speak at your own pace.
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleStopListening}
            className="text-[11px] text-[#BA4A00] font-semibold hover:underline"
          >
            Insert & Finish
          </button>
        </div>
      )}

      {/* Error / Support Banner */}
      {errorMessage && (
        <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {!recognitionSupported && (
        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Speech dictation is optimal on modern Chrome, Edge, and Safari browsers.
            You can type your thoughts or record an audio note below.
          </span>
        </div>
      )}
    </div>
  );
};
