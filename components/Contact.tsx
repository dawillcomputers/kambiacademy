
import React, { useState } from 'react';
import Button from './Button';
import Card from './Card';

interface ContactProps {
    onBack: () => void;
    canGoBack: boolean;
}

const Contact: React.FC<ContactProps> = ({ onBack, canGoBack }) => {
  const [formState, setFormState] = useState({ name: '', email: '', message: '' });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormState({ ...formState, [e.target.name]: e.target.value });
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, you would send this data to a server
    console.log('Form submitted:', formState);
    setIsSubmitted(true);
  };

  return (
    <div>
        {canGoBack && (
            <div className="mb-6">
                <Button variant="secondary" onClick={onBack}>&larr; Back</Button>
            </div>
        )}
        <header className="text-center mb-16 relative py-12 px-4 rounded-3xl bg-indigo-900 text-white overflow-hidden">
            <img 
                src="https://images.unsplash.com/photo-1423666639041-f56000c27a9a?q=80&w=2070&auto=format&fit=crop" 
                className="absolute inset-0 w-full h-full object-cover opacity-20" 
                alt="" 
            />
            <div className="relative z-10">
                <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Get In Touch</h1>
                <p className="text-lg text-indigo-100 max-w-2xl mx-auto">We'd love to hear from you! Whether you have a question about courses, pricing, or anything else, our team is ready to answer all your questions.</p>
            </div>
        </header>
        <div className="grid lg:grid-cols-5 gap-12 max-w-7xl mx-auto items-start">
            <div className="lg:col-span-3">
                <Card className="p-8 sm:p-12">
                    {isSubmitted ? (
                        <div className="text-center p-12">
                            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 className="text-3xl font-bold text-slate-900">Thank you!</h2>
                            <p className="text-slate-600 mt-2 text-lg">Your message has been sent successfully. We'll get back to you shortly.</p>
                            <Button className="mt-8" variant="secondary" onClick={() => setIsSubmitted(false)}>Send another message</Button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="name" className="block text-sm font-bold text-gray-700 mb-1">Full Name</label>
                                    <input type="text" name="name" id="name" required onChange={handleChange} value={formState.name} className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="e.g. John Doe"/>
                                </div>
                                <div>
                                    <label htmlFor="email" className="block text-sm font-bold text-gray-700 mb-1">Email Address</label>
                                    <input type="email" name="email" id="email" required onChange={handleChange} value={formState.email} className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="name@example.com"/>
                                </div>
                            </div>
                             <div>
                                <label htmlFor="message" className="block text-sm font-bold text-gray-700 mb-1">Message</label>
                                <textarea name="message" id="message" rows={5} required onChange={handleChange} value={formState.message} className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="How can we help you?"></textarea>
                            </div>
                            <div className="pt-2">
                                <Button type="submit" className="w-full py-4 text-xl" size="large">Send Message</Button>
                            </div>
                        </form>
                    )}
                </Card>
            </div>
            <div className="lg:col-span-2 space-y-8">
                <Card className="p-8 bg-slate-900 text-white relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="text-2xl font-bold mb-6">Contact Information</h3>
                        <address className="not-italic space-y-6 text-slate-300">
                            <div className="flex items-start space-x-4">
                                <div className="bg-indigo-600/20 p-2 rounded-lg text-indigo-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <p>123 Academy Lane<br/>Tech City, TX 75001</p>
                            </div>
                            <div className="flex items-start space-x-4">
                                <div className="bg-indigo-600/20 p-2 rounded-lg text-indigo-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <p><a href="mailto:contact@kambi.academy" className="text-indigo-400 hover:text-white transition-colors">contact@kambi.academy</a></p>
                            </div>
                            <div className="flex items-start space-x-4">
                                <div className="bg-indigo-600/20 p-2 rounded-lg text-indigo-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                </div>
                                <p><a href="tel:+1234567890" className="text-indigo-400 hover:text-white transition-colors">(123) 456-7890</a></p>
                            </div>
                        </address>
                    </div>
                </Card>
                <img 
                    src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=80&w=1974&auto=format&fit=crop" 
                    alt="Our Support Team" 
                    className="rounded-3xl shadow-xl w-full h-64 object-cover"
                />
            </div>
        </div>
    </div>
  );
};

export default Contact;
