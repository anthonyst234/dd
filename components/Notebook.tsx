import React from 'react';
import { Clue } from '../types';

interface NotebookProps {
  isOpen: boolean;
  onClose: () => void;
  clues: Clue[];
  inventory: string[];
}

const Notebook: React.FC<NotebookProps> = ({ isOpen, onClose, clues, inventory }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-mystery-800 w-full max-w-3xl h-[80vh] rounded-lg shadow-2xl border border-mystery-700 flex overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sidebar */}
        <div className="w-1/3 bg-mystery-900 p-6 border-r border-mystery-700">
          <h2 className="text-2xl font-serif font-bold text-mystery-highlight mb-6 tracking-wider">Investigation</h2>
          <div className="space-y-4">
            <div className="text-gray-400 text-sm uppercase tracking-widest mb-2">Inventory</div>
            <ul className="space-y-2">
              {inventory.length === 0 ? (
                <li className="text-gray-600 italic">Empty...</li>
              ) : (
                inventory.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-gray-300 bg-mystery-800 p-2 rounded">
                    <span className="w-2 h-2 bg-mystery-accent rounded-full"></span>
                    {item}
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        {/* Main Content: Clues */}
        <div className="flex-1 p-8 overflow-y-auto bg-paper text-mystery-900">
          <h3 className="text-xl font-bold font-serif border-b-2 border-mystery-900/20 pb-2 mb-6">Collected Notes & Clues</h3>
          
          <div className="grid gap-6">
            {clues.length === 0 ? (
              <p className="text-gray-500 italic text-center mt-10">No clues found yet. Keep searching.</p>
            ) : (
              clues.map((clue) => (
                <div key={clue.id} className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-mystery-accent to-mystery-highlight rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                    <div className="relative p-4 bg-white shadow-md rounded border border-gray-200 transform rotate-1 hover:rotate-0 transition-transform duration-300">
                        <h4 className="font-bold text-lg text-mystery-900 mb-1">{clue.name}</h4>
                        <p className="text-sm text-gray-700 leading-relaxed font-serif">{clue.description}</p>
                        <div className="mt-2 text-xs text-gray-400 text-right">Ref: {clue.id.substring(0,6)}</div>
                    </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* Close Button */}
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
    </div>
  );
};

export default Notebook;
