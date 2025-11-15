
import React, { useState, useRef, useCallback } from 'react';
import { AppState } from './types';
import { analyzeTextWithThinking, generateSpeech } from './services/geminiService';
import { decode, decodeAudioData } from './utils/audioUtils';
import { SparkIcon, SoundWaveIcon, SpinnerIcon } from './components/icons';

const App: React.FC = () => {
    const [inputText, setInputText] = useState<string>('');
    const [status, setStatus] = useState<AppState>(AppState.Idle);
    const [generatedScript, setGeneratedScript] = useState<string>('');
    const [errorMessage, setErrorMessage] = useState<string>('');

    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

    const stopPlayback = useCallback(() => {
        if (audioSourceRef.current) {
            audioSourceRef.current.stop();
            audioSourceRef.current.disconnect();
            audioSourceRef.current = null;
        }
        setStatus(AppState.Idle);
    }, []);

    const handleProcessText = async () => {
        if (!inputText.trim()) {
            setErrorMessage('Please enter some text to analyze.');
            setStatus(AppState.Error);
            return;
        }

        stopPlayback();
        setStatus(AppState.Analyzing);
        setGeneratedScript('');
        setErrorMessage('');

        try {
            const script = await analyzeTextWithThinking(inputText);
            setGeneratedScript(script);

            setStatus(AppState.Synthesizing);
            const base64Audio = await generateSpeech(script);

            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            }
            const audioContext = audioContextRef.current;
            await audioContext.resume();

            const audioData = decode(base64Audio);
            const audioBuffer = await decodeAudioData(audioData, audioContext, 24000, 1);

            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            source.onended = () => {
                setStatus(AppState.Idle);
                audioSourceRef.current = null;
            };
            source.start();
            audioSourceRef.current = source;
            setStatus(AppState.Playing);

        } catch (error) {
            const message = error instanceof Error ? error.message : 'An unknown error occurred.';
            console.error(error);
            setErrorMessage(message);
            setStatus(AppState.Error);
        }
    };

    const isProcessing = status === AppState.Analyzing || status === AppState.Synthesizing;

    const getStatusMessage = () => {
        switch (status) {
            case AppState.Analyzing:
                return 'Thinking... Analyzing your text with Gemini Pro.';
            case AppState.Synthesizing:
                return 'Generating speech... Creating audio explanation.';
            case AppState.Playing:
                return 'Playing audio explanation...';
            case AppState.Error:
                return `Error: ${errorMessage}`;
            default:
                return '';
        }
    };
    
    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-4 sm:p-6 md:p-8 font-sans">
            <main className="w-full max-w-3xl mx-auto flex flex-col gap-8">
                <header className="text-center">
                    <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
                        AI Text Explainer
                    </h1>
                    <p className="mt-2 text-lg text-gray-400">
                        Paste text, and I'll think about it, then explain it to you out loud.
                    </p>
                </header>

                <div className="bg-gray-800/50 rounded-xl shadow-lg p-6 backdrop-blur-sm border border-gray-700">
                    <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Paste any text here..."
                        className="w-full h-48 p-4 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none transition-all duration-300"
                        disabled={isProcessing}
                    />

                    <div className="mt-4 flex flex-col sm:flex-row items-center gap-4">
                        {status !== AppState.Playing ? (
                             <button
                                onClick={handleProcessText}
                                disabled={isProcessing}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-md transition-all duration-300 transform hover:scale-105"
                            >
                                {isProcessing ? (
                                    <>
                                        <SpinnerIcon className="w-5 h-5" />
                                        <span>Processing...</span>
                                    </>
                                ) : (
                                    <>
                                        <SparkIcon className="w-5 h-5" />
                                        <span>Analyze & Speak</span>
                                    </>
                                )}
                            </button>
                        ) : (
                            <button
                                onClick={stopPlayback}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-md transition-all duration-300 transform hover:scale-105"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 9a1 1 0 00-1 1v0a1 1 0 102 0v0a1 1 0 00-1-1z" clipRule="evenodd" />
                                    <path d="M2 10a8 8 0 1116 0 8 8 0 01-16 0zM9 5a1 1 0 102 0v0a1 1 0 10-2 0v0z"/>
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 8a1 1 0 100 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
                                </svg>
                                <span>Stop</span>
                            </button>
                        )}
                       
                        <div className="text-gray-400 text-center sm:text-left flex-1 min-h-[24px]">
                          {getStatusMessage()}
                        </div>
                    </div>
                </div>

                {generatedScript && (
                    <div className="bg-gray-800/50 rounded-xl shadow-lg p-6 backdrop-blur-sm border border-gray-700">
                        <h2 className="text-2xl font-bold text-purple-400 mb-4 flex items-center gap-2">
                           <SoundWaveIcon className="w-6 h-6"/> Generated Script
                        </h2>
                        <div className="text-gray-300 whitespace-pre-wrap font-serif text-lg leading-relaxed">
                           {generatedScript}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default App;
