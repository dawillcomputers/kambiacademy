import React, { useState, useRef } from 'react';
import Editor from '@monaco-editor/react';

type Language = 'javascript' | 'html' | 'css' | 'python';

interface CodeSandboxProps {
  initialLanguage?: Language;
  initialCode?: string;
}

export default function CodeSandbox({
  initialLanguage = 'javascript',
  initialCode = ''
}: CodeSandboxProps) {
  const [code, setCode] = useState(initialCode || getDefaultCode(initialLanguage));
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  function getDefaultCode(lang: Language): string {
    switch (lang) {
      case 'html':
        return `<!DOCTYPE html>
<html>
<head>
  <title>My App</title>
</head>
<body>
  <h1>Hello World!</h1>
  <p>This is my HTML page.</p>
</body>
</html>`;
      case 'css':
        return `body {
  font-family: Arial, sans-serif;
  background-color: #f0f0f0;
  margin: 0;
  padding: 20px;
}

h1 {
  color: #333;
  text-align: center;
}

p {
  color: #666;
  line-height: 1.6;
}`;
      case 'javascript':
        return `// JavaScript Code
function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet('World'));
console.log('Welcome to the Code Sandbox!');

// Try editing this code and click "Run"`;
      case 'python':
        return `# Python Code
def greet(name):
    return f"Hello, {name}!"

print(greet("World"))
print("Welcome to the Code Sandbox!")

# Try editing this code and click "Run"`;
      default:
        return '';
    }
  }

  const runCode = async () => {
    setIsRunning(true);
    setOutput('');

    try {
      if (language === 'html' || language === 'css') {
        // For HTML/CSS, create a complete HTML document
        const htmlContent = language === 'html' ? code : `
<!DOCTYPE html>
<html>
<head>
  <title>Code Output</title>
  <style>${code}</style>
</head>
<body>
  <h1>Output</h1>
  <p>Check the styling applied above.</p>
</body>
</html>`;

        const iframe = iframeRef.current;
        if (iframe) {
          iframe.srcdoc = htmlContent;
        }
        setOutput('HTML/CSS rendered in preview pane');
      } else if (language === 'javascript') {
        // For JavaScript, run in a sandboxed environment
        const logs: string[] = [];
        const originalConsoleLog = console.log;

        console.log = (...args) => {
          logs.push(args.map(arg =>
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
          ).join(' '));
        };

        try {
          // Use Function constructor to run code in isolated scope
          const result = new Function(code)();
          if (result !== undefined) {
            logs.push(`Return value: ${result}`);
          }
        } catch (error) {
          logs.push(`Error: ${error.message}`);
        } finally {
          console.log = originalConsoleLog;
        }

        setOutput(logs.join('\n'));
      } else if (language === 'python') {
        // For Python, we'll use a placeholder since client-side Python requires Pyodide
        setOutput('Python execution requires server-side processing.\n\nFor now, this is a preview of your Python code:\n\n' + code);
      }
    } catch (error) {
      setOutput(`Execution error: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const changeLanguage = (newLang: Language) => {
    setLanguage(newLang);
    setCode(getDefaultCode(newLang));
    setOutput('');
  };

  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm overflow-hidden">
      <div className="p-4 bg-white/10 border-b border-white/10">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Code Sandbox</h2>
          <div className="flex gap-2">
            <select
              value={language}
              onChange={(e) => changeLanguage(e.target.value as Language)}
              className="px-3 py-1 bg-white/10 border border-white/20 rounded text-white text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="javascript">JavaScript</option>
              <option value="html">HTML</option>
              <option value="css">CSS</option>
              <option value="python">Python</option>
            </select>
            <button
              onClick={runCode}
              disabled={isRunning}
              className="px-4 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 rounded font-semibold text-sm transition-colors"
            >
              {isRunning ? 'Running...' : '▶ Run'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ height: '500px' }}>
        {/* Editor */}
        <div className="border-r border-white/10">
          <Editor
            height="100%"
            language={language}
            value={code}
            onChange={(value) => setCode(value || '')}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              roundedSelection: false,
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
        </div>

        {/* Output/Preview */}
        <div className="flex flex-col">
          <div className="p-3 bg-white/5 border-b border-white/10">
            <h3 className="font-semibold text-sm">
              {language === 'html' || language === 'css' ? 'Preview' : 'Console Output'}
            </h3>
          </div>
          <div className="flex-1 p-3 overflow-auto">
            {(language === 'html' || language === 'css') ? (
              <iframe
                ref={iframeRef}
                className="w-full h-full border-0 bg-white rounded"
                title="Code Preview"
              />
            ) : (
              <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap">
                {output || 'Click "Run" to execute your code...'}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}