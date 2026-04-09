
import React from 'react';
import Modal from './Modal';

interface DocumentViewerModalProps {
  documentUrl: string;
  onClose: () => void;
}

const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({ documentUrl, onClose }) => {
  const isPdf = documentUrl.toLowerCase().endsWith('.pdf');
  const isImage = ['.jpg', '.jpeg', '.png', '.gif'].some(ext => documentUrl.toLowerCase().endsWith(ext));

  const renderContent = () => {
    if (isImage) {
      // Use a placeholder image for demonstration purposes
      return <img src={`https://picsum.photos/seed/${documentUrl}/800/1100`} alt="Utility Bill Document" className="w-full h-auto rounded-lg" />;
    }

    if (isPdf) {
      // Simulate a PDF viewer
      return (
        <div className="bg-slate-200 p-4 rounded-lg">
          <div className="bg-white shadow-lg p-8">
            <h3 className="text-lg font-bold border-b pb-2 mb-4">Simulated PDF Document</h3>
            <p className="text-sm text-slate-500 mb-2">Filename: {documentUrl}</p>
            <div className="space-y-4 text-sm text-slate-700">
              <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor. Cras elementum ultrices diam. Maecenas ligula massa, varius a, semper congue, euismod non, mi.</p>
              <p>Proin porttitor, orci nec nonummy molestie, enim est eleifend mi, non fermentum diam nisl sit amet erat. Duis semper. Duis arcu massa, scelerisque vitae, consequat in, pretium a, enim. Pellentesque congue. Ut in risus volutpat libero pharetra tempor. Cras vestibulum bibendum augue. Praesent egestas leo in pede. Praesent blandit odio eu enim. Pellentesque sed dui ut augue blandit sodales.</p>
            </div>
          </div>
        </div>
      );
    }
    
    return <p>Unsupported document type.</p>;
  };

  return (
    // A secondary modal on top of another. Increase z-index.
    <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4" aria-modal="true" role="dialog" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-4 relative animate-fade-in-up" onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 transition-colors z-10"
          aria-label="Close document viewer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="max-h-[85vh] overflow-y-auto">
             {renderContent()}
        </div>
      </div>
      <style>{`
        @keyframes fade-in-up {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default DocumentViewerModal;
