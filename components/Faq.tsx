
import React, { useState } from 'react';
import Button from './Button';

const faqData = [
    {
        question: 'What are the prerequisites for the beginner courses?',
        answer: 'Absolutely none! Our beginner courses are designed for individuals with no prior experience in ICT. All you need is a computer, a reliable internet connection, and a passion for learning.'
    },
    {
        question: 'Can I get a refund if I am not satisfied with a course?',
        answer: 'Yes, we offer a 30-day money-back guarantee on all our courses. If you are not satisfied for any reason, you can request a full refund within 30 days of purchase.'
    },
    {
        question: 'Are there any discounts for students or bulk purchases?',
        answer: 'We offer special discounts for students with a valid student ID. We also provide corporate packages and bulk purchase discounts for organizations. Please reach out to our contact team for more details.'
    },
    {
        question: 'How do I access the course materials?',
        answer: 'Once you enroll in a course, all materials, including videos, documents, and slides, will be available on your student dashboard. You can access them anytime, from any device.'
    },
    {
        question: 'Do you provide a certificate upon course completion?',
        answer: 'Yes, upon successful completion of any course, you will receive a verifiable digital certificate from Kambi Academy to showcase your new skills on your resume or LinkedIn profile.'
    }
];

const FaqItem: React.FC<{
    item: { question: string; answer: string };
    isOpen: boolean;
    onClick: () => void;
}> = ({ item, isOpen, onClick }) => (
    <div className="border-b last:border-b-0">
        <button onClick={onClick} className="w-full text-left flex justify-between items-center py-6 px-4 hover:bg-slate-50 transition-colors">
            <span className="text-lg font-bold text-slate-800 pr-8">{item.question}</span>
            <span className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${isOpen ? 'bg-indigo-600 border-indigo-600 text-white rotate-180' : 'border-slate-300 text-slate-400'}`}>
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </span>
        </button>
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96' : 'max-h-0'}`}>
            <p className="px-6 pb-6 text-slate-600 leading-relaxed bg-slate-50/50">{item.answer}</p>
        </div>
    </div>
);


interface FaqProps {
    onBack: () => void;
    canGoBack: boolean;
}

const Faq: React.FC<FaqProps> = ({ onBack, canGoBack }) => {
    const [openFaq, setOpenFaq] = useState<number | null>(0);
    
    const handleToggle = (index: number) => {
        setOpenFaq(openFaq === index ? null : index);
    };

  return (
    <div>
        {canGoBack && (
            <div className="mb-6">
                <Button variant="secondary" onClick={onBack}>&larr; Back</Button>
            </div>
        )}
        <div className="max-w-7xl mx-auto">
            <header className="text-center mb-16 relative py-16 px-4 rounded-3xl bg-white shadow-xl overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-100 rounded-full -mr-32 -mt-32 opacity-50"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-sky-100 rounded-full -ml-32 -mb-32 opacity-50"></div>
                
                <div className="relative z-10">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900">Frequently Asked Questions</h1>
                    <p className="text-lg text-slate-600 mt-4 max-w-2xl mx-auto">Everything you need to know about the platform and our courses. Can't find the answer you're looking for? Reach out to our customer support team.</p>
                </div>
            </header>

            <div className="grid lg:grid-cols-2 gap-12 items-start">
                <div className="space-y-6">
                    <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                        {faqData.map((item, index) => (
                            <FaqItem
                                key={index}
                                item={item}
                                isOpen={openFaq === index}
                                onClick={() => handleToggle(index)}
                            />
                        ))}
                    </div>
                    <div className="bg-indigo-600 rounded-3xl p-8 text-white shadow-lg text-center">
                        <h3 className="text-2xl font-bold mb-2">Still have questions?</h3>
                        <p className="text-indigo-100 mb-6">If you cannot find the answer to your question in our FAQ, you can always contact us. We will answer you shortly!</p>
                        <Button variant="secondary" onClick={() => { /* Navigate to contact handled by App */ }}>Contact Us</Button>
                    </div>
                </div>

                <div className="hidden lg:block space-y-8">
                    <img 
                        src="https://images.unsplash.com/photo-1484067011813-710ae64a2a2a?q=80&w=2071&auto=format&fit=crop" 
                        alt="Questioning and Learning" 
                        className="rounded-3xl shadow-2xl w-full h-auto object-cover"
                    />
                    <div className="grid grid-cols-2 gap-6">
                        <img 
                            src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=2070&auto=format&fit=crop" 
                            alt="Student success" 
                            className="rounded-2xl shadow-xl w-full h-48 object-cover"
                        />
                        <img 
                            src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop" 
                            alt="Community help" 
                            className="rounded-2xl shadow-xl w-full h-48 object-cover"
                        />
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default Faq;
