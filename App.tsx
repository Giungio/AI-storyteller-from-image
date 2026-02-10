
import React, { useState, useRef } from 'react';
import { analyzeAndWrite, generateNarration, decodeBase64, decodeAudioData } from './services/gemini';
import { StoryState } from './types';
import ChatWindow from './components/ChatWindow';

const App: React.FC = () => {
  const [state, setState] = useState<StoryState>({
    image: null,
    text: '',
    isGenerating: false,
    isNarrating: false,
    analysis: '',
  });
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setState(prev => ({ 
          ...prev, 
          image: event.target?.result as string,
          text: '',
          analysis: ''
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!state.image) return;
    
    setState(prev => ({ ...prev, isGenerating: true }));
    try {
      const fullResponse = await analyzeAndWrite(state.image);
      const parts = (fullResponse || '').split('---');
      const storyText = parts[0]?.trim();
      const analysisText = parts[1]?.trim();
      
      setState(prev => ({
        ...prev,
        text: storyText || 'The image remained silent.',
        analysis: analysisText || 'No specific analysis available.',
        isGenerating: false,
      }));
    } catch (err) {
      console.error(err);
      setState(prev => ({ ...prev, isGenerating: false }));
    }
  };

  const handleReadAloud = async () => {
    if (!state.text || state.isNarrating) {
      if (state.isNarrating && currentSourceRef.current) {
        currentSourceRef.current.stop();
        setState(prev => ({ ...prev, isNarrating: false }));
      }
      return;
    }

    setState(prev => ({ ...prev, isNarrating: true }));
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }

      const base64Audio = await generateNarration(state.text);
      if (base64Audio) {
        const bytes = decodeBase64(base64Audio);
        const buffer = await decodeAudioData(bytes, audioContextRef.current, 24000, 1);
        
        const source = audioContextRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContextRef.current.destination);
        
        currentSourceRef.current = source;
        
        source.onended = () => {
          setState(prev => ({ ...prev, isNarrating: false }));
          currentSourceRef.current = null;
        };

        source.start(0);
      }
    } catch (err) {
      console.error('Narration error:', err);
      setState(prev => ({ ...prev, isNarrating: false }));
    }
  };

  return (
    <div className="min-h-screen pb-20 px-4 md:px-8 max-w-6xl mx-auto">
      {/* Header */}
      <header className="py-12 text-center">
        <h1 className="text-5xl font-serif font-bold bg-gradient-to-r from-purple-400 to-indigo-300 bg-clip-text text-transparent mb-2">
          Ink & Image
        </h1>
        <p className="text-gray-400 tracking-widest uppercase text-xs">AI-Powered Storytelling Canvas</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        {/* Left: Image Canvas */}
        <div className="space-y-6">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`group relative glass-card rounded-3xl aspect-[4/3] flex items-center justify-center cursor-pointer overflow-hidden transition-all duration-500 border-2 ${state.image ? 'border-purple-500/30' : 'border-dashed border-white/10 hover:border-purple-500/50'}`}
          >
            {state.image ? (
              <img src={state.image} alt="Upload" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            ) : (
              <div className="text-center p-8">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-500/10 transition-colors">
                  <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                </div>
                <p className="text-gray-300 font-medium">Click to upload an image</p>
                <p className="text-gray-500 text-sm mt-1">PNG, JPG, or WEBP</p>
              </div>
            )}
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
          </div>

          <button
            onClick={handleGenerate}
            disabled={!state.image || state.isGenerating}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 transform active:scale-[0.98] ${
              !state.image 
                ? 'bg-white/5 text-gray-600 cursor-not-allowed' 
                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] text-white'
            }`}
          >
            {state.isGenerating ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Ghostwriting lore...
              </span>
            ) : 'Breathe Life Into Image'}
          </button>
        </div>

        {/* Right: Story Display */}
        <div className="space-y-8">
          <div className="glass-card rounded-3xl p-8 min-h-[300px] flex flex-col relative overflow-hidden">
            {state.isGenerating && (
              <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-10 flex items-center justify-center">
                <div className="text-purple-400 font-serif italic animate-pulse">Consulting the muses...</div>
              </div>
            )}
            
            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
              <h2 className="text-xl font-serif text-gray-400 italic">The Opening Passage</h2>
              {state.text && (
                <button 
                  onClick={handleReadAloud}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${state.isNarrating ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30'}`}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    {state.isNarrating 
                      ? <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /> 
                      : <path d="M8 5v14l11-7z" />
                    }
                  </svg>
                  {state.isNarrating ? 'STOP READING' : 'READ ALOUD'}
                </button>
              )}
            </div>

            <div className={`font-serif text-xl leading-relaxed text-gray-200 transition-opacity duration-500 ${state.text ? 'opacity-100' : 'opacity-30'}`}>
              {state.text || "Upload an image and trigger the generation to weave a story from the pixels."}
            </div>

            {state.analysis && (
              <div className="mt-8 pt-6 border-t border-white/10">
                <h4 className="text-[10px] font-bold tracking-[0.2em] text-gray-500 uppercase mb-2">Technical Analysis</h4>
                <p className="text-xs text-gray-400 leading-relaxed italic">{state.analysis}</p>
              </div>
            )}
          </div>

          {state.text && <ChatWindow context={`Image Analysis: ${state.analysis}\n\nOpening Passage: ${state.text}`} />}
        </div>
      </div>
    </div>
  );
};

export default App;
