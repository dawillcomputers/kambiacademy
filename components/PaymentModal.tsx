
import React from 'react';
import { Course } from '../types';
import Button from './Button';
import ButtonRow from './ButtonRow';
import Modal from './Modal';

interface PaymentModalCourse {
  title: string;
  price: number;
}

interface PaymentModalProps {
  course: PaymentModalCourse;
  onClose: () => void;
  onConfirm: () => void;
  moneyBackGuaranteeDays: number;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ course, onClose, onConfirm, moneyBackGuaranteeDays }) => {
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm();
    }
  return (
    <Modal onClose={onClose}>
      <h2 className="text-2xl font-bold mb-2">Complete Your Enrollment</h2>
      <p className="text-slate-600 mb-4">You are enrolling in: <span className="font-semibold">{course.title}</span></p>
      
      <div className="bg-indigo-50 p-4 rounded-lg mb-6 text-center">
        <p className="text-sm text-indigo-800">Total Amount</p>
        <p className="text-4xl font-extrabold text-indigo-600">${course.price.toFixed(2)}</p>
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
          <Button type="submit">Pay ${course.price.toFixed(2)}</Button>
        </ButtonRow>
      </form>
    </Modal>
  );
};

export default PaymentModal;
