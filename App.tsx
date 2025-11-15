import React, { useState, useRef, useCallback } from 'react';
import { AppState } from './types';
import { analyzeTextWithThinking, generateSpeech, summarizeText, answerQuestion } from './services/geminiService';
import { decode, decodeAudioData } from './utils/audioUtils';
import { SparkIcon, SoundWaveIcon, SpinnerIcon, DocumentTextIcon, QuestionMarkCircleIcon } from './components/icons';

const App: React.FC = () => {
    const [inputText, setInputText] = useState<string>('');
    const [status, setStatus] = useState<AppState>(AppState.Idle);
    const [resultContent, setResultContent] = useState<string>('');
    const [resultTitle, setResultTitle] = useState<string>('');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [selectedTone, setSelectedTone] = useState<string>('Neutral');
    const [selectedLevel, setSelectedLevel] = useState<string>('Beginner');
    const [question, setQuestion] = useState<string>('');
    const [qaHistory, setQaHistory] = useState<{ question: string; answer: string }[]>([]);

    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

    const stopPlayback = useCallback(() => {
        if (audioSourceRef.current) {
            audioSourceRef.current.stop();
            audioSourceRef.current.disconnect();
            audioSourceRef.current = null;
        }
        if (status === AppState.Playing) {
          setStatus(AppState.Idle);
        }
    }, [status]);

    const handleProcessText = async () => {
        if (!inputText.trim()) {
            setErrorMessage('Please enter some text to analyze.');
            setStatus(AppState.Error);
            return;
        }

        stopPlayback();
        setStatus(AppState.Analyzing);
        setResultContent('');
        setResultTitle('');
        setErrorMessage('');
        setQaHistory([]);

        try {
            const script = await analyzeTextWithThinking(inputText, selectedTone, selectedLevel);
            setResultContent(script);
            setResultTitle('Generated Script');

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

    const handleSummarizeText = async () => {
        if (!inputText.trim()) {
            setErrorMessage('Please enter some text to summarize.');
            setStatus(AppState.Error);
            return;
        }

        stopPlayback();
        setStatus(AppState.Summarizing);
        setResultContent('');
        setResultTitle('');
        setErrorMessage('');
        setQaHistory([]);

        try {
            const summary = await summarizeText(inputText);
            setResultContent(summary);
            setResultTitle('Summary');
            setStatus(AppState.Idle);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'An unknown error occurred.';
            console.error(error);
            setErrorMessage(message);
            setStatus(AppState.Error);
        }
    };

    const handleAskQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!question.trim()) return;
        
        setStatus(AppState.Answering);
        setErrorMessage('');
        try {
            const answer = await answerQuestion(inputText, question);
            setQaHistory(prev => [...prev, { question, answer }]);
            setQuestion('');
            setStatus(AppState.Idle);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'An unknown error occurred.';
            console.error(error);
            setErrorMessage(message);
            setStatus(AppState.Error);
        }
    };


    const isProcessing = [AppState.Analyzing, AppState.Synthesizing, AppState.Summarizing, AppState.Answering].includes(status);

    const getStatusMessage = () => {
        switch (status) {
            case AppState.Analyzing:
                return 'Thinking... Analyzing your text with Gemini Pro.';
            case AppState.Synthesizing:
                return 'Generating speech... Creating audio explanation.';
            case AppState.Playing:
                return 'Playing audio explanation...';
            case AppState.Summarizing:
                return 'Generating summary...';
            case AppState.Answering:
                return 'Searching for an answer...';
            case AppState.Error:
                return `Error: ${errorMessage}`;
            default:
                return '';
        }
    };

    const tones = ['Neutral', 'Formal', 'Casual', 'Enthusiastic'];
    const levels = ['Beginner', 'Intermediate', 'Expert'];
    
    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-4 sm:p-6 md:p-8 font-sans">
            <main className="w-full max-w-3xl mx-auto flex flex-col gap-8">
                <header className="text-center">
                    <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
                        AI Text Explainer
                    </h1>
                    <p className="mt-2 text-lg text-gray-400">
                        Paste text for summaries, spoken explanations, or to ask questions.
                    </p>
                </header>

                <div className="bg-gray-800/50 rounded-xl shadow-lg p-6 backdrop-blur-sm border border-gray-700">
                    <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Paste any text here..."
                        className="w-full h-48 p-4 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none transition-all duration-300"
                        disabled={isProcessing}
                        aria-label="Text input for analysis"
                    />
                    
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="tone-select" className="block text-sm font-medium text-gray-400 mb-1">Tone</label>
                            <select id="tone-select" value={selectedTone} onChange={e => setSelectedTone(e.target.value)} disabled={isProcessing} className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:outline-none">
                                {tones.map(tone => <option key={tone} value={tone}>{tone}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="level-select" className="block text-sm font-medium text-gray-400 mb-1">Detail Level</label>
                            <select id="level-select" value={selectedLevel} onChange={e => setSelectedLevel(e.target.value)} disabled={isProcessing} className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:outline-none">
                                {levels.map(level => <option key={level} value={level}>{level}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-col sm:flex-row items-center gap-4">
                        {status !== AppState.Playing ? (
                             <button
                                onClick={handleProcessText}
                                disabled={isProcessing}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-md transition-all duration-300 transform hover:scale-105"
                            >
                                {isProcessing && status !== AppState.Summarizing ? <SpinnerIcon className="w-5 h-5" /> : <SparkIcon className="w-5 h-5" />}
                                <span>Analyze & Speak</span>
                            </button>
                        ) : (
                            <button
                                onClick={stopPlayback}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-md transition-all duration-300 transform hover:scale-105"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 9a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                                <span>Stop</span>
                            </button>
                        )}
                        <button
                            onClick={handleSummarizeText}
                            disabled={isProcessing}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-md transition-all duration-300 transform hover:scale-105"
                        >
                            {isProcessing && status === AppState.Summarizing ? <SpinnerIcon className="w-5 h-5" /> : <DocumentTextIcon className="w-5 h-5" />}
                            <span>Summarize</span>
                        </button>
                       
                        <div className="text-gray-400 text-center sm:text-left flex-1 min-h-[24px]">
                          {getStatusMessage()}
                        </div>
                    </div>
                </div>

                {resultContent && (
                    <div className="bg-gray-800/50 rounded-xl shadow-lg p-6 backdrop-blur-sm border border-gray-700 animate-fade-in">
                        <h2 className="text-2xl font-bold text-purple-400 mb-4 flex items-center gap-2">
                           {resultTitle === 'Summary' ? <DocumentTextIcon className="w-6 h-6"/> : <SoundWaveIcon className="w-6 h-6"/>}
                           {resultTitle}
                        </h2>
                        <div className="text-gray-300 whitespace-pre-wrap font-serif text-lg leading-relaxed max-h-[40vh] overflow-y-auto pr-2">
                           {resultContent}
                        </div>
                    </div>
                )}

                {resultContent && (
                    <div className="bg-gray-800/50 rounded-xl shadow-lg p-6 backdrop-blur-sm border border-gray-700 animate-fade-in">
                        <h2 className="text-2xl font-bold text-purple-400 mb-4 flex items-center gap-2">
                            <QuestionMarkCircleIcon className="w-6 h-6"/> Ask a Question
                        </h2>
                        <div className="space-y-4 max-h-80 overflow-y-auto pr-2 border-b border-gray-700 pb-4 mb-4">
                            {qaHistory.length === 0 && <p className="text-gray-400">No questions asked yet.</p>}
                            {qaHistory.map((item, index) => (
                                <div key={index} className="animate-fade-in">
                                    <p className="font-semibold text-cyan-400">Q: {item.question}</p>
                                    <div className="mt-1 text-gray-300 whitespace-pre-wrap border-l-2 border-cyan-500 pl-3">
                                        {item.answer}
                                    </div>

                                </div>
                            ))}
                        </div>
                        <form onSubmit={handleAskQuestion} className="flex flex-col sm:flex-row gap-2">
                            <input
                                type="text"
                                value={question}
                                onChange={e => setQuestion(e.target.value)}
                                placeholder="Ask something about the text..."
                                className="flex-1 p-2 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                disabled={status === AppState.Answering}
                                aria-label="Ask a question"
                            />
                            <button type="submit" disabled={status === AppState.Answering} className="flex items-center justify-center gap-2 px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-500 text-white font-semibold rounded-lg transition-colors">
                                {status === AppState.Answering ? <SpinnerIcon className="w-5 h-5"/> : 'Ask'}
                            </button>
                        </form>
                    </div>
                )}
            </main>
        </div>
    );
};

export default App;
