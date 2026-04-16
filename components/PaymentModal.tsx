
import React from 'react';
import { Course } from '../types';
import { AuthUser } from '../lib/auth';
import Button from './Button';
import ButtonRow from './ButtonRow';
import Modal from './Modal';

interface PaymentModalProps {
  course: Course;
  user: AuthUser;
  onClose: () => void;
  onConfirm: () => void;
  moneyBackGuaranteeDays: number;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ course, user, onClose, onConfirm, moneyBackGuaranteeDays }) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm();
  };

  const isFreeCourse = course.price === 0;

  // Calculate location-based markup (10% for US and EU countries)
  const euCountries = [
    'Germany', 'France', 'Italy', 'Spain', 'Netherlands', 'Belgium', 'Austria',
    'Sweden', 'Denmark', 'Finland', 'Poland', 'Czech Republic', 'Hungary',
    'Portugal', 'Greece', 'Ireland', 'Slovenia', 'Estonia', 'Latvia', 'Lithuania',
    'Slovakia', 'Luxembourg', 'Malta', 'Cyprus', 'Croatia', 'Bulgaria', 'Romania'
  ];
  const isUSOrEU = user.country === 'United States' || euCountries.includes(user.country || '');
  const locationMarkup = isUSOrEU ? 0.10 : 0; // 10% markup
  const finalPrice = course.price * (1 + locationMarkup);
  const finalPriceLabel = `₦${finalPrice.toLocaleString()}`;

  return (
    <Modal onClose={onClose}>
      <h2 className="text-2xl font-bold mb-2">{isFreeCourse ? 'Start Your Free Course' : 'Complete Your Enrollment'}</h2>
      <p className="text-slate-600 mb-4">
        {isFreeCourse ? 'You are enrolling in a free course:' : 'You are enrolling in:'}
        <span className="font-semibold"> {course.title}</span>
      </p>
      {isFreeCourse ? (
        <div className="bg-green-50 p-4 rounded-lg mb-6 text-center">
          <p className="text-sm text-green-800">Free course</p>
          <p className="text-4xl font-extrabold text-green-600">Free</p>
          <p className="text-xs text-slate-500 font-semibold mt-1">Start learning instantly with no payment required</p>
        </div>
      ) : (
        <>
          <div className="bg-indigo-50 p-4 rounded-lg mb-6 text-center">
            <p className="text-sm text-indigo-800">Total Amount</p>
            <p className="text-4xl font-extrabold text-indigo-600">{finalPriceLabel}</p>
            {locationMarkup > 0 && (
              <p className="text-xs text-slate-500 mt-1">
                Includes 10% location markup for {user.country}
              </p>
            )}
            <p className="text-xs text-green-600 font-semibold mt-1">{moneyBackGuaranteeDays}-Day Money-Back Guarantee</p>
          </div>

          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6 rounded-r-lg" role="alert">
            <p className="font-bold">Demonstration Only</p>
            <p className="text-sm">This is a simulated payment form. Do not enter real credit card information.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="card-number" className="block text-sm font-medium text-gray-700">Card Number</label>
              <input type="text" id="card-number" placeholder="**** **** **** 1234" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-black"/>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="expiry" className="block text-sm font-medium text-gray-700">Expiry</label>
                <input type="text" id="expiry" placeholder="MM / YY" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-black"/>
              </div>
              <div className="col-span-2">
                <label htmlFor="cvc" className="block text-sm font-medium text-gray-700">CVC</label>
                <input type="text" id="cvc" placeholder="123" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-black"/>
              </div>
            </div>
            <ButtonRow alignment="right" className="pt-4">
              <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
              <Button type="submit">Pay {finalPriceLabel}</Button>
            </ButtonRow>
          </form>
        </>
      )}
      {isFreeCourse && (
        <div className="pt-4 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={onConfirm}>Start Course</Button>
        </div>
      )}
    </Modal>
  );
};

export default PaymentModal;
