import React, { useState, useRef, useCallback, useEffect } from 'react';
import { AppState } from './types';
import { analyzeTextWithThinking, generateSpeech, summarizeText, answerQuestion } from './services/geminiService';
import { decode, decodeAudioData, audioBufferToWav } from './utils/audioUtils';
import { SparkIcon, SoundWaveIcon, SpinnerIcon, DocumentTextIcon, QuestionMarkCircleIcon, DownloadIcon, HistoryIcon, StarIcon } from './components/icons';

const App: React.FC = () => {
    const [inputText, setInputText] = useState<string>('');
    const [status, setStatus] = useState<AppState>(AppState.Idle);
    const [resultContent, setResultContent] = useState<string>('');
    const [resultTitle, setResultTitle] = useState<string>('');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [selectedTone, setSelectedTone] = useState<string>('دوستانه');
    const [selectedLevel, setSelectedLevel] = useState<string>('مبتدی');
    const [question, setQuestion] = useState<string>('');
    const [qaHistory, setQaHistory] = useState<{ question: string; answer: string }[]>([]);
    
    // New features state
    const [history, setHistory] = useState<string[]>([]);
    const [showHistory, setShowHistory] = useState<boolean>(false);
    const [playbackRate, setPlaybackRate] = useState<number>(1);
    const [volume, setVolume] = useState<number>(1);
    const [feedbackRating, setFeedbackRating] = useState<number>(0);
    const [feedbackText, setFeedbackText] = useState('');
    const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);
    const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);

    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);

    useEffect(() => {
        try {
            const storedHistory = localStorage.getItem('textHistory');
            if (storedHistory) {
                setHistory(JSON.parse(storedHistory));
            }
        } catch (error) {
            console.error("Failed to parse history from localStorage", error);
        }
    }, []);

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
    
    const addToHistory = (text: string) => {
        const newHistory = [text, ...history.filter(item => item !== text)].slice(0, 20);
        setHistory(newHistory);
        localStorage.setItem('textHistory', JSON.stringify(newHistory));
    };

    const handleProcessText = async () => {
        if (!inputText.trim()) {
            setErrorMessage('لطفاً برای تحلیل، متنی را وارد کنید.');
            setStatus(AppState.Error);
            return;
        }

        stopPlayback();
        setStatus(AppState.Analyzing);
        setResultContent('');
        setResultTitle('');
        setErrorMessage('');
        setQaHistory([]);
        setAudioBuffer(null);
        setFeedbackSubmitted(false);
        setFeedbackRating(0);
        setFeedbackText('');
        addToHistory(inputText);

        try {
            const script = await analyzeTextWithThinking(inputText, selectedTone, selectedLevel);
            setResultContent(script);
            setResultTitle('اسکریپت تولید شده');

            setStatus(AppState.Synthesizing);
            const base64Audio = await generateSpeech(script);

            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            }
            const audioContext = audioContextRef.current;
            await audioContext.resume();

            if (!gainNodeRef.current || gainNodeRef.current.context !== audioContext) {
                gainNodeRef.current = audioContext.createGain();
                gainNodeRef.current.connect(audioContext.destination);
            }

            const audioData = decode(base64Audio);
            const decodedBuffer = await decodeAudioData(audioData, audioContext, 24000, 1);
            setAudioBuffer(decodedBuffer);

            const source = audioContext.createBufferSource();
            source.buffer = decodedBuffer;
            source.playbackRate.value = playbackRate;
            gainNodeRef.current.gain.setValueAtTime(volume, audioContext.currentTime);
            source.connect(gainNodeRef.current);
            
            source.onended = () => {
                setStatus(AppState.Idle);
                audioSourceRef.current = null;
            };
            source.start();
            audioSourceRef.current = source;
            setStatus(AppState.Playing);

        } catch (error) {
            const message = error instanceof Error ? error.message : 'یک خطای ناشناخته رخ داد.';
            console.error(error);
            setErrorMessage(message);
            setStatus(AppState.Error);
        }
    };
    
    const handleSummarizeText = async () => {
        if (!inputText.trim()) {
            setErrorMessage('لطفاً برای خلاصه‌سازی، متنی را وارد کنید.');
            setStatus(AppState.Error);
            return;
        }

        stopPlayback();
        setStatus(AppState.Summarizing);
        setResultContent('');
        setResultTitle('');
        setErrorMessage('');
        setQaHistory([]);
        addToHistory(inputText);

        try {
            const summary = await summarizeText(inputText);
            setResultContent(summary);
            setResultTitle('خلاصه');
            setStatus(AppState.Idle);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'یک خطای ناشناخته رخ داد.';
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
            const message = error instanceof Error ? error.message : 'یک خطای ناشناخته رخ داد.';
            console.error(error);
            setErrorMessage(message);
            setStatus(AppState.Error);
        }
    };
    
    const handleDownload = (type: 'script' | 'audio') => {
        if (type === 'script') {
            const blob = new Blob([resultContent], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'script.txt';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } else if (type === 'audio' && audioBuffer) {
            const wavBlob = audioBufferToWav(audioBuffer);
            const url = URL.createObjectURL(wavBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'explanation.wav';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        if (gainNodeRef.current && audioContextRef.current) {
            gainNodeRef.current.gain.setValueAtTime(newVolume, audioContextRef.current.currentTime);
        }
    };

    const handlePlaybackRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newRate = parseFloat(e.target.value);
        setPlaybackRate(newRate);
        if (audioSourceRef.current) {
            audioSourceRef.current.playbackRate.value = newRate;
        }
    };

    const handleSubmitFeedback = () => {
        console.log('Feedback submitted:', { rating: feedbackRating, text: feedbackText });
        setFeedbackSubmitted(true);
    };

    const isProcessing = [AppState.Analyzing, AppState.Synthesizing, AppState.Summarizing, AppState.Answering].includes(status);
    const tones = ['دوستانه', 'رسمی', 'مشتاقانه', 'خنثی'];
    const levels = ['مبتدی', 'متوسط', 'پیشرفته'];
    
    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-4 sm:p-6 md:p-8 font-sans">
            <main className="w-full max-w-3xl mx-auto flex flex-col gap-8">
                <header className="text-center">
                    <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
                        تشریح کننده متن با هوش مصنوعی
                    </h1>
                    <p className="mt-2 text-lg text-gray-400">
                        متن را برای خلاصه‌سازی، توضیحات صوتی، یا پرسیدن سوال وارد کنید.
                    </p>
                </header>

                <div className="bg-gray-800/50 rounded-xl shadow-lg p-6 backdrop-blur-sm border border-gray-700">
                    <div className="relative">
                       <textarea
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="هر متنی را اینجا وارد کنید..."
                            className="w-full h-48 p-4 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none transition-all duration-300"
                            disabled={isProcessing}
                            aria-label="ورودی متن برای تحلیل"
                        />
                         <button onClick={() => setShowHistory(!showHistory)} className="absolute top-2 left-2 text-gray-400 hover:text-white" title="تاریخچه"><HistoryIcon className="w-6 h-6"/></button>
                         {showHistory && (
                            <div className="absolute z-10 top-12 left-2 w-64 max-h-60 overflow-y-auto bg-gray-800 border border-gray-700 rounded-lg shadow-xl">
                                {history.length > 0 ? history.map((item, index) => (
                                    <button key={index} onClick={() => { setInputText(item); setShowHistory(false); }} className="block w-full text-right px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 truncate">
                                        {item}
                                    </button>
                                )) : <p className="px-4 py-2 text-sm text-gray-500">تاریخچه خالی است.</p>}
                            </div>
                         )}
                    </div>
                    
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="tone-select" className="block text-sm font-medium text-gray-400 mb-1">لحن</label>
                            <select id="tone-select" value={selectedTone} onChange={e => setSelectedTone(e.target.value)} disabled={isProcessing} className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:outline-none">
                                {tones.map(tone => <option key={tone} value={tone}>{tone}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="level-select" className="block text-sm font-medium text-gray-400 mb-1">سطح جزئیات</label>
                            <select id="level-select" value={selectedLevel} onChange={e => setSelectedLevel(e.target.value)} disabled={isProcessing} className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:outline-none">
                                {levels.map(level => <option key={level} value={level}>{level}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="volume-slider" className="block text-sm font-medium text-gray-400 mb-1">بلندی صدا: {Math.round(volume * 100)}%</label>
                            <input id="volume-slider" type="range" min="0" max="1" step="0.05" value={volume} onChange={handleVolumeChange} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500" />
                        </div>
                        <div>
                            <label htmlFor="speed-slider" className="block text-sm font-medium text-gray-400 mb-1">سرعت پخش: {playbackRate.toFixed(2)}x</label>
                            <input id="speed-slider" type="range" min="0.5" max="2" step="0.1" value={playbackRate} onChange={handlePlaybackRateChange} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
                        </div>
                    </div>

                    <div className="mt-6 flex flex-col sm:flex-row-reverse items-center gap-4">
                        {status !== AppState.Playing ? (
                             <button onClick={handleProcessText} disabled={isProcessing} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-md transition-all duration-300 transform hover:scale-105">
                                {isProcessing && status !== AppState.Summarizing ? <SpinnerIcon className="w-5 h-5" /> : <SparkIcon className="w-5 h-5" />}
                                <span>تحلیل و پخش صوتی</span>
                            </button>
                        ) : (
                            <button onClick={stopPlayback} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-md transition-all duration-300 transform hover:scale-105">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 9a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                                <span>توقف</span>
                            </button>
                        )}
                        <button onClick={handleSummarizeText} disabled={isProcessing} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-md transition-all duration-300 transform hover:scale-105">
                            {isProcessing && status === AppState.Summarizing ? <SpinnerIcon className="w-5 h-5" /> : <DocumentTextIcon className="w-5 h-5" />}
                            <span>خلاصه‌سازی</span>
                        </button>
                    </div>
                </div>

                {resultContent && (
                    <div className="bg-gray-800/50 rounded-xl shadow-lg p-6 backdrop-blur-sm border border-gray-700 animate-fade-in">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold text-purple-400 flex items-center gap-2">
                               {resultTitle === 'خلاصه' ? <DocumentTextIcon className="w-6 h-6"/> : <SoundWaveIcon className="w-6 h-6"/>}
                               {resultTitle}
                            </h2>
                            <div className="flex items-center gap-2">
                                <button onClick={() => handleDownload('script')} title="دانلود اسکریپت" className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-700 transition-colors"><DownloadIcon className="w-5 h-5"/></button>
                                {audioBuffer && <button onClick={() => handleDownload('audio')} title="دانلود صدا (WAV)" className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-700 transition-colors"><SoundWaveIcon className="w-5 h-5"/></button>}
                            </div>
                        </div>
                        <div className="text-gray-300 whitespace-pre-wrap font-serif text-lg leading-relaxed max-h-[40vh] overflow-y-auto pr-2">
                           {resultContent}
                        </div>
                        
                        {!feedbackSubmitted ? (
                            <div className="mt-6 border-t border-gray-700 pt-4">
                                <h3 className="text-lg font-semibold text-gray-300 mb-2">بازخورد شما چطور بود؟</h3>
                                <div className="flex items-center gap-2 mb-3">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button key={star} onClick={() => setFeedbackRating(star)}>
                                            <StarIcon className={`w-7 h-7 cursor-pointer transition-colors ${feedbackRating >= star ? 'text-yellow-400' : 'text-gray-600 hover:text-gray-500'}`} />
                                        </button>
                                    ))}
                                </div>
                                <textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)} placeholder="بازخورد اختیاری..." className="w-full h-20 p-2 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none"/>
                                <button onClick={handleSubmitFeedback} className="mt-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors">ثبت بازخورد</button>
                            </div>
                        ) : (
                             <div className="mt-6 border-t border-gray-700 pt-4 text-center text-green-400">از بازخورد شما متشکریم!</div>
                        )}
                    </div>
                )}
                
                {inputText && !resultContent && isProcessing && (
                    <div className="text-center p-6 text-lg text-cyan-400">
                        <SpinnerIcon className="w-8 h-8 mx-auto mb-2" />
                        {status === AppState.Analyzing && 'در حال تفکر... تحلیل متن شما با Gemini Pro.'}
                        {status === AppState.Summarizing && 'در حال ساخت خلاصه...'}
                    </div>
                )}
                
                {errorMessage && (
                    <div className="bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg text-center">
                        خطا: {errorMessage}
                    </div>
                )}


                {resultContent && (
                    <div className="bg-gray-800/50 rounded-xl shadow-lg p-6 backdrop-blur-sm border border-gray-700 animate-fade-in">
                        <h2 className="text-2xl font-bold text-purple-400 mb-4 flex items-center gap-2">
                            <QuestionMarkCircleIcon className="w-6 h-6"/> یک سوال بپرسید
                        </h2>
                        <div className="space-y-4 max-h-80 overflow-y-auto pr-2 border-b border-gray-700 pb-4 mb-4">
                            {qaHistory.length === 0 && <p className="text-gray-400">هنوز سوالی پرسیده نشده است.</p>}
                            {qaHistory.map((item, index) => (
                                <div key={index} className="animate-fade-in">
                                    <p className="font-semibold text-cyan-400">سوال: {item.question}</p>
                                    <div className="mt-1 text-gray-300 whitespace-pre-wrap border-r-2 border-cyan-500 pr-3">
                                        {item.answer}
                                    </div>

                                </div>
                            ))}
                        </div>
                        <form onSubmit={handleAskQuestion} className="flex flex-col sm:flex-row-reverse gap-2">
                            <input
                                type="text"
                                value={question}
                                onChange={e => setQuestion(e.target.value)}
                                placeholder="در مورد متن سوالی بپرسید..."
                                className="flex-1 p-2 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                disabled={status === AppState.Answering}
                                aria-label="یک سوال بپرسید"
                            />
                            <button type="submit" disabled={status === AppState.Answering} className="flex items-center justify-center gap-2 px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-500 text-white font-semibold rounded-lg transition-colors">
                                {status === AppState.Answering ? <SpinnerIcon className="w-5 h-5"/> : 'بپرس'}
                            </button>
                        </form>
                    </div>
                )}
            </main>
        </div>
    );
};

export default App;
