
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from './Button';
import Card from './Card';
import { ClockIcon, DollarSignIcon, GlobeIcon, SupportIcon } from './icons/Icons';

const tutorFaqData = [
    {
        question: 'How much can I earn as a tutor?',
        answer: 'You earn 70% of the revenue from each enrollment in your course. The more students you attract with high-quality content, the higher your earning potential.'
    },
    {
        question: 'What is the application review process like?',
        answer: 'Our team reviews each application to ensure instructors meet our quality standards. We look at your expertise, teaching ability, and the proposed course content. The process typically takes 5-7 business days.'
    },
    {
        question: 'Do I need to create my own course materials?',
        answer: 'Yes, instructors are responsible for creating their own course content, including videos, assignments, and supplementary materials. We provide the platform and tools to help you structure and upload your course effectively.'
    }
];

const FaqItem: React.FC<{
    item: { question: string; answer: string };
    isOpen: boolean;
    onClick: () => void;
}> = ({ item, isOpen, onClick }) => (
    <div className="border-b">
        <button onClick={onClick} className="w-full text-left flex justify-between items-center py-4">
            <span className="text-lg font-semibold text-slate-800">{item.question}</span>
            <span className={`transform transition-transform duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'}`}>
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </span>
        </button>
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96' : 'max-h-0'}`}>
            <p className="pb-4 text-slate-600">{item.answer}</p>
        </div>
    </div>
);

const BecomeTutor: React.FC = () => {
    const [openFaq, setOpenFaq] = useState<number | null>(null);
    const navigate = useNavigate();
    
    const handleToggle = (index: number) => {
        setOpenFaq(openFaq === index ? null : index);
    };

    const BenefitCard: React.FC<{ icon: React.ReactNode, title: string, text: string }> = ({ icon, title, text }) => (
        <div className="text-center p-6">
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-indigo-100 text-indigo-600 mb-4 mx-auto">
                {icon}
            </div>
            <h3 className="text-xl font-bold mb-2">{title}</h3>
            <p className="text-slate-600">{text}</p>
        </div>
    );
    
  return (
    <div>
        <div className="space-y-16">
          <header className="text-center py-16 bg-white rounded-2xl shadow-xl bg-gradient-to-br from-indigo-50 via-white to-sky-50">
            <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600 mb-4">
              Share Your Expertise. Change Lives.
            </h1>
            <p className="text-lg text-slate-600 max-w-3xl mx-auto mb-8">
              Join Kambi Academy as an instructor and inspire the next generation of tech talent. Turn your passion into a rewarding teaching career.
            </p>
            <Button onClick={() => navigate('/signup')} size="large">Start Your Application</Button>
          </header>

          <section className="text-center max-w-5xl mx-auto">
              <h2 className="text-3xl font-bold mb-8">Why Teach With Us?</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                  <BenefitCard icon={<DollarSignIcon />} title="Earn Revenue" text="Get a competitive 70% revenue share on every course enrollment. Your success is our success."/>
                  <BenefitCard icon={<GlobeIcon />} title="Inspire Learners" text="Reach a global audience of eager students and make a real impact on their careers and lives."/>
                  <BenefitCard icon={<ClockIcon />} title="Teach Your Way" text="Enjoy the flexibility to create your course on your own schedule and teach from anywhere in the world."/>
                  <BenefitCard icon={<SupportIcon />} title="Tools & Support" text="Leverage our powerful platform tools and get guidance from our dedicated support team."/>
              </div>
          </section>

           <section className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
            <h2 className="text-3xl font-bold text-center mb-8">How It Works</h2>
            <div className="grid md:grid-cols-4 gap-8 text-center max-w-4xl mx-auto relative">
                {/* Dashed line connector for desktop */}
                <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 border-t-2 border-dashed border-slate-300" style={{ transform: 'translateY(-3rem)'}}></div>

                <div className="relative z-10">
                    <div className="flex items-center justify-center w-16 h-16 bg-indigo-600 text-white font-bold text-2xl rounded-full mx-auto mb-4 border-4 border-white shadow-lg">1</div>
                    <h3 className="font-bold text-lg">Submit Application</h3>
                    <p className="text-sm text-slate-500">Tell us about your experience and what you want to teach.</p>
                </div>
                 <div className="relative z-10">
                    <div className="flex items-center justify-center w-16 h-16 bg-indigo-600 text-white font-bold text-2xl rounded-full mx-auto mb-4 border-4 border-white shadow-lg">2</div>
                    <h3 className="font-bold text-lg">Get Verified</h3>
                    <p className="text-sm text-slate-500">Our team will review your application and guide you on next steps.</p>
                </div>
                 <div className="relative z-10">
                    <div className="flex items-center justify-center w-16 h-16 bg-indigo-600 text-white font-bold text-2xl rounded-full mx-auto mb-4 border-4 border-white shadow-lg">3</div>
                    <h3 className="font-bold text-lg">Build Your Course</h3>
                    <p className="text-sm text-slate-500">Use our intuitive platform to upload videos, create assignments, and more.</p>
                </div>
                 <div className="relative z-10">
                    <div className="flex items-center justify-center w-16 h-16 bg-indigo-600 text-white font-bold text-2xl rounded-full mx-auto mb-4 border-4 border-white shadow-lg">4</div>
                    <h3 className="font-bold text-lg">Start Earning</h3>
                    <p className="text-sm text-slate-500">Publish your course, connect with students, and earn revenue.</p>
                </div>
            </div>
          </section>
          
           <section className="max-w-3xl mx-auto">
                <h2 className="text-3xl font-bold text-center mb-8">Instructor FAQ</h2>
                <div className="bg-white p-6 rounded-2xl shadow-xl">
                    {tutorFaqData.map((item, index) => (
                        <FaqItem
                            key={index}
                            item={item}
                            isOpen={openFaq === index}
                            onClick={() => handleToggle(index)}
                        />
                    ))}
                </div>
           </section>

          <section className="text-center bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl shadow-xl p-8 md:p-12">
              <h3 className="text-3xl font-extrabold text-white mb-4">Ready to Inspire?</h3>
              <p className="text-lg text-sky-100 max-w-2xl mx-auto mb-8">Your journey to becoming an online instructor starts here. Join us and shape the future of tech education.</p>
               <Button onClick={() => navigate('/signup')} size="large" variant="secondary" className="bg-white text-indigo-600 hover:bg-slate-100">
                Apply Now
              </Button>
          </section>
        </div>
    </div>
  );
};

export default BecomeTutor;
