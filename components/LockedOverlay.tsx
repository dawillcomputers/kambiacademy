
import React from 'react';
import Button from './Button';

interface LockedOverlayProps {
  onUnlock: () => void;
}

const LockedOverlay: React.FC<LockedOverlayProps> = ({ onUnlock }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-md">
      <div className="max-w-md w-full p-10 bg-white rounded-[2.5rem] shadow-2xl text-center border border-indigo-100 animate-in fade-in zoom-in duration-300">
        <div className="w-24 h-24 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-indigo-200">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Kambi Academy</h2>
        <p className="text-slate-600 mb-10 leading-relaxed">
          This platform utilizes <strong>Gemini 3 Flash</strong> for AI-powered education. To continue, please select a valid API key from a paid GCP project.
        </p>
        <Button size="large" className="w-full py-4 text-lg shadow-lg shadow-indigo-100 mb-6" onClick={onUnlock}>
          Configure API Access
        </Button>
        <div className="space-y-2">
          <p className="text-xs text-slate-400">
            Required for secure AI content generation and live classes.
          </p>
          <a 
            href="https://ai.google.dev/gemini-api/docs/billing" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-indigo-600 hover:text-indigo-800 text-sm font-bold transition-colors underline decoration-indigo-200 underline-offset-4"
          >
            Review Billing Documentation
          </a>
        </div>
      </div>
    </div>
  );
};

export default LockedOverlay;
