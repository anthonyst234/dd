import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, LocationId, NarrativeEntry, GamePhase, Clue } from './types';
import { initializeGame, sendPlayerAction } from './services/geminiService';
import Notebook from './components/Notebook';
import { BookIcon, MapIcon, BackpackIcon, SearchIcon, MessageSquareIcon, FootprintsIcon, BrainIcon } from './components/Icons';

// Fallback image for when picsum is slow or for specific vibe
const LOCATION_IMAGES: Record<string, string> = {
  [LocationId.Station]: 'https://picsum.photos/seed/station_greybridge/1200/600?grayscale',
  [LocationId.TownSquare]: 'https://picsum.photos/seed/town_square_grey/1200/600?grayscale',
  [LocationId.OldLibrary]: 'https://picsum.photos/seed/library_old/1200/600?grayscale',
  [LocationId.Observatory]: 'https://picsum.photos/seed/observatory_night/1200/600?grayscale',
  [LocationId.Forest]: 'https://picsum.photos/seed/forest_dark/1200/600?grayscale',
  [LocationId.MayasHouse]: 'https://picsum.photos/seed/abandoned_house/1200/600?grayscale',
};

function App() {
  const [gameState, setGameState] = useState<GameState>({
    currentLocation: LocationId.Station,
    inventory: [],
    clues: [],
    narrativeHistory: [],
    phase: GamePhase.Start,
    trust: {
      'Silas': 30,
      'Evelyn': 50,
      'Jonas': 10,
    }
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isNotebookOpen, setIsNotebookOpen] = useState(false);
  const [showMemoryOverlay, setShowMemoryOverlay] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [gameState.narrativeHistory]);

  // Initial Game Start
  useEffect(() => {
    const start = async () => {
      setIsLoading(true);
      const response = await initializeGame();
      
      if (response.error) {
         // Handle error visually
         setGameState(prev => ({
          ...prev,
          narrativeHistory: [...prev.narrativeHistory, {
            id: Date.now().toString(),
            speaker: 'System',
            text: "Failed to connect to the story engine. Please check your API Key configuration.",
            type: 'action',
            timestamp: Date.now()
          }]
         }));
      } else {
        handleApiResponse(response);
      }
      setIsLoading(false);
    };
    // Run once on mount
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const handleApiResponse = (response: any) => {
    const newHistory: NarrativeEntry = {
      id: Date.now().toString(),
      speaker: 'GM',
      text: response.narrative,
      type: response.updates.memoryTriggered ? 'memory' : 'description',
      timestamp: Date.now()
    };

    setGameState(prev => {
      const newState = { ...prev };
      
      newState.narrativeHistory = [...prev.narrativeHistory, newHistory];

      if (response.updates.newLocation) {
        newState.currentLocation = response.updates.newLocation;
      }
      if (response.updates.itemAdded) {
        newState.inventory = [...new Set([...prev.inventory, response.updates.itemAdded])];
      }
      if (response.updates.itemRemoved) {
        newState.inventory = prev.inventory.filter(i => i !== response.updates.itemRemoved);
      }
      if (response.updates.clueAdded) {
        const newClue: Clue = {
            id: Date.now().toString(),
            name: response.updates.clueAdded.name,
            description: response.updates.clueAdded.description,
            discoveredAt: new Date().toISOString()
        };
        newState.clues = [...prev.clues, newClue];
      }
      
      if (response.updates.memoryTriggered) {
          setShowMemoryOverlay(true);
          setTimeout(() => setShowMemoryOverlay(false), 3000); // Flash effect
      }

      return newState;
    });
  };

  const handleAction = useCallback(async (actionText: string, type: 'move' | 'investigate' | 'talk' | 'custom' = 'custom') => {
    if (isLoading) return;
    
    // Add player message to history immediately
    setGameState(prev => ({
      ...prev,
      narrativeHistory: [...prev.narrativeHistory, {
        id: Date.now().toString(),
        speaker: 'Alex',
        text: actionText,
        type: 'action',
        timestamp: Date.now()
      }]
    }));

    setIsLoading(true);
    const response = await sendPlayerAction(actionText, gameState);
    handleApiResponse(response);
    setIsLoading(false);
    setInput('');
  }, [gameState, isLoading]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && input.trim()) {
      handleAction(input);
    }
  };

  // Quick Actions based on context
  const renderControls = () => {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-4 bg-mystery-800 border-t border-mystery-700">
        <button 
          onClick={() => handleAction("Look around carefully", 'investigate')}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 bg-mystery-700 hover:bg-mystery-600 text-gray-200 py-3 rounded transition disabled:opacity-50"
        >
          <SearchIcon /> Investigate
        </button>
        <button 
          onClick={() => handleAction("Who is here?", 'talk')}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 bg-mystery-700 hover:bg-mystery-600 text-gray-200 py-3 rounded transition disabled:opacity-50"
        >
          <MessageSquareIcon /> Talk
        </button>
         <button 
          onClick={() => handleAction("Where can I go from here?", 'move')}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 bg-mystery-700 hover:bg-mystery-600 text-gray-200 py-3 rounded transition disabled:opacity-50"
        >
          <FootprintsIcon /> Travel
        </button>
        <button 
           onClick={() => setIsNotebookOpen(true)}
           className="flex items-center justify-center gap-2 bg-mystery-accent hover:bg-violet-600 text-white py-3 rounded transition shadow-lg shadow-violet-900/20"
        >
          <BookIcon /> Notebook
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-mystery-900 text-slate-200 font-sans flex flex-col md:flex-row overflow-hidden selection:bg-mystery-accent selection:text-white">
      
      {/* --- Memory Overlay Effect --- */}
      {showMemoryOverlay && (
        <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center bg-white/10 backdrop-blur-sm animate-pulse-slow">
             <div className="text-6xl font-serif text-white tracking-[1em] uppercase opacity-50 animate-fade-in">Remember</div>
        </div>
      )}

      {/* --- Left Panel: Visuals & Status --- */}
      <div className="w-full md:w-[400px] bg-mystery-950 flex flex-col border-r border-mystery-800 relative shrink-0">
        {/* Header */}
        <div className="p-6 border-b border-mystery-800">
            <h1 className="text-2xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-400">
                Echoes of the Forgotten
            </h1>
            <p className="text-xs text-mystery-accent uppercase tracking-widest mt-1">Chapter 1: The Return</p>
        </div>

        {/* Location Image */}
        <div className="relative h-64 w-full bg-black overflow-hidden">
            <img 
                src={LOCATION_IMAGES[gameState.currentLocation]} 
                alt="Location" 
                className="w-full h-full object-cover opacity-80 hover:scale-105 transition duration-[3s]"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-mystery-950 to-transparent p-4 pt-12">
                <div className="flex items-center gap-2 text-mystery-highlight font-serif text-lg">
                    <MapIcon className="w-5 h-5" />
                    {gameState.currentLocation.replace('_', ' ').toUpperCase()}
                </div>
            </div>
        </div>

        {/* Status List */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
            <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Current Objective</h3>
                <p className="text-sm text-gray-300 italic border-l-2 border-mystery-accent pl-3">
                    Find out what happened to Maya. Search the Station for clues.
                </p>
            </div>

            <div>
                 <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Inventory Preview</h3>
                 <div className="flex gap-2 flex-wrap">
                    {gameState.inventory.length > 0 ? (
                        gameState.inventory.map((item, i) => (
                            <span key={i} className="text-xs bg-mystery-800 px-2 py-1 rounded border border-mystery-700 text-gray-300">{item}</span>
                        ))
                    ) : (
                        <span className="text-xs text-gray-600">Empty pockets</span>
                    )}
                 </div>
            </div>
        </div>
      </div>

      {/* --- Right Panel: Narrative & Interaction --- */}
      <div className="flex-1 flex flex-col relative">
        
        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth">
            {gameState.narrativeHistory.map((entry) => (
                <div key={entry.id} className={`flex ${entry.speaker === 'Alex' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                    <div 
                        className={`max-w-2xl p-4 rounded-lg shadow-lg text-lg leading-relaxed ${
                            entry.speaker === 'Alex' 
                            ? 'bg-mystery-800 border border-mystery-700 text-gray-200' 
                            : entry.type === 'memory' 
                                ? 'bg-amber-900/20 border border-amber-900/50 text-amber-100 font-serif italic'
                                : 'bg-transparent text-gray-300 font-serif'
                        }`}
                    >
                        {entry.speaker !== 'Alex' && entry.speaker !== 'GM' && (
                            <span className="block text-xs font-bold text-mystery-accent mb-1 uppercase">{entry.speaker}</span>
                        )}
                        {entry.text}
                    </div>
                </div>
            ))}
            
            {/* Loading Indicator */}
            {isLoading && (
                 <div className="flex justify-start animate-pulse">
                    <div className="text-mystery-accent font-serif italic">Something is emerging from the fog...</div>
                 </div>
            )}
            
            <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-mystery-900 z-10">
            {renderControls()}
            
            <div className="p-4 border-t border-mystery-800 flex gap-4">
                <div className="relative flex-1">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="What do you want to do?"
                        disabled={isLoading}
                        className="w-full bg-mystery-950 border border-mystery-700 text-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-mystery-accent focus:ring-1 focus:ring-mystery-accent transition placeholder-gray-600"
                    />
                    <div className="absolute right-3 top-3 text-gray-600">
                        <BrainIcon className="w-5 h-5" />
                    </div>
                </div>
                <button 
                    onClick={() => handleAction(input)}
                    disabled={!input.trim() || isLoading}
                    className="bg-mystery-accent hover:bg-violet-600 text-white px-6 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Act
                </button>
            </div>
        </div>

      </div>

      {/* Modals */}
      <Notebook 
        isOpen={isNotebookOpen} 
        onClose={() => setIsNotebookOpen(false)} 
        clues={gameState.clues} 
        inventory={gameState.inventory}
      />
    </div>
  );
}

export default App;
