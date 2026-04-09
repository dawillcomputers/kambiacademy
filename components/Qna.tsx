
import React, { useState } from 'react';
import { User } from '../types';
import { MOCK_QNA } from '../constants';
import Button from './Button';

interface QnaProps {
  currentUser: User | null;
  onBack: () => void;
  canGoBack: boolean;
}

const Qna: React.FC<QnaProps> = ({ currentUser, onBack, canGoBack }) => {
    const [posts, setPosts] = useState(MOCK_QNA);
    const [newQuestion, setNewQuestion] = useState('');

    const handleAskQuestion = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newQuestion.trim() || !currentUser) return;
        
        const question = {
            id: `q${posts.length + 1}`,
            author: currentUser,
            question: newQuestion,
            timestamp: 'Just now',
            answers: [],
        };
        setPosts([question, ...posts]);
        setNewQuestion('');
    };

    return (
        <div>
            {canGoBack && (
                <div className="mb-6">
                    <Button variant="secondary" onClick={onBack}>&larr; Back</Button>
                </div>
            )}
            <div className="max-w-4xl mx-auto">
                <header className="text-center mb-12">
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Q&A Forum</h2>
                    <p className="mt-2 text-lg leading-8 text-gray-600">Have a question? Ask our community of learners and instructors.</p>
                </header>

                {currentUser ? (
                     <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
                        <h3 className="text-xl font-semibold mb-4">Ask a New Question</h3>
                        <form onSubmit={handleAskQuestion}>
                            <textarea
                                value={newQuestion}
                                onChange={(e) => setNewQuestion(e.target.value)}
                                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                rows={4}
                                placeholder="Type your question here..."
                            />
                            <div className="text-right mt-4">
                                <Button type="submit">Post Question</Button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8 rounded-r-lg">
                        <div className="flex">
                            <div className="py-1">
                                <p className="text-sm text-yellow-700">
                                    Please <span className="font-bold">sign in</span> to ask a question.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
               

                <div className="space-y-8">
                    {posts.map(post => (
                        <div key={post.id} className="bg-white p-6 rounded-xl shadow-lg border border-slate-100">
                            <div className="flex items-start space-x-4">
                                <div className="flex-shrink-0 h-10 w-10 bg-indigo-200 rounded-full flex items-center justify-center font-bold text-indigo-700">
                                    {post.author.name.charAt(0)}
                                </div>
                                <div className="flex-grow">
                                    <div className="flex justify-between items-start">
                                        <p className="font-semibold">{post.author.name} <span className="font-normal text-sm text-slate-500 ml-2">{post.timestamp}</span></p>
                                    </div>
                                    <p className="mt-2 text-slate-800 leading-relaxed">{post.question}</p>
                                </div>
                            </div>
                            {post.answers.length > 0 && (
                                 <div className="mt-6 pl-14 space-y-4">
                                    {post.answers.map(answer => (
                                        <div key={answer.id} className={`flex items-start space-x-4 p-4 rounded-lg border bg-slate-50 border-slate-100`}>
                                            <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center font-bold text-white bg-slate-300`}>
                                                {answer.author.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm">
                                                    {answer.author.name} 
                                                    <span className="font-normal text-xs text-slate-500 ml-2">{answer.timestamp}</span>
                                                </p>
                                                <p className="mt-1 text-sm text-slate-700 leading-relaxed">{answer.text}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Qna;
