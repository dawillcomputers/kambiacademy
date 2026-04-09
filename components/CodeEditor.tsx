
import React, { useState } from 'react';

// Basic syntax highlighting logic
const highlightSyntax = (code: string, language: string) => {
    if (language === 'text') return code;
    let highlighted = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    if (language === 'javascript') {
        highlighted = highlighted
            .replace(/\b(const|let|var|function|return|if|else|for|while|import|export|from)\b/g, '<span class="text-purple-400">$1</span>') // Keywords
            .replace(/('.*?'|".*?"|`.*?`)/g, '<span class="text-green-400">$1</span>') // Strings
            .replace(/(\/\/.*|\/\*[\s\S]*?\*\/)/g, '<span class="text-slate-500">$1</span>') // Comments
            .replace(/([A-Z][a-zA-Z]*)/g, '<span class="text-sky-400">$1</span>'); // Components/Classes
    } else if (language === 'html') {
        highlighted = highlighted
            .replace(/(&lt;\/?)([a-zA-Z0-9]+)/g, '$1<span class="text-red-400">$2</span>') // Tags
            .replace(/([a-zA-Z-]+)=(".*?"|'.*?')/g, '<span class="text-sky-400">$1</span>=<span class="text-green-400">$2</span>'); // Attributes
    } else if (language === 'css') {
        highlighted = highlighted
            .replace(/(.*?):/g, '<span class="text-sky-400">$1</span>:') // Properties
            .replace(/:(.*?);/g, ':<span class="text-green-400">$1</span>;') // Values
            .replace(/([.#][a-zA-Z0-9-]+)/g, '<span class="text-purple-400">$1</span>'); // Selectors
    }

    return highlighted;
};


interface CodeEditorProps {
  language?: 'html' | 'css' | 'javascript' | 'text';
  initialCode?: string;
  onChange?: (code: string) => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ language = 'javascript', initialCode = '', onChange }) => {
    const [code, setCode] = useState(initialCode);
    const [selectedLanguage, setSelectedLanguage] = useState(language);

    const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newCode = e.target.value;
        setCode(newCode);
        if (onChange) {
            onChange(newCode);
        }
    };
    
    const highlightedCode = highlightSyntax(code, selectedLanguage);

  return (
    <div className="relative border rounded-lg overflow-hidden">
        <div className="bg-slate-800 p-2 flex justify-end">
            <select value={selectedLanguage} onChange={e => setSelectedLanguage(e.target.value as any)} className="bg-slate-700 text-white text-sm rounded px-2 py-1">
                <option value="javascript">JavaScript</option>
                <option value="html">HTML</option>
                <option value="css">CSS</option>
                <option value="text">Plain Text</option>
            </select>
        </div>
      <div className="relative font-mono text-sm">
        <textarea
          value={code}
          onChange={handleCodeChange}
          spellCheck="false"
          className="absolute inset-0 w-full h-full p-4 bg-transparent text-transparent caret-white resize-none z-10"
          style={{ WebkitTextFillColor: 'transparent' }}
          rows={10}
        />
        <pre
          className="w-full h-full p-4 bg-slate-900 text-slate-100 overflow-auto"
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: highlightedCode + '\n' }} // Added newline to ensure last line is visible
        />
      </div>
    </div>
  );
};

export default CodeEditor;
