
import React, { useEffect, useMemo, useState } from 'react';
import { Course } from '../types';
import { AuthUser } from '../lib/auth';
import { api } from '../lib/api';
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

const FLUTTERWAVE_PROCESSING_FEE_RATE = 0.02;

const PaymentModal: React.FC<PaymentModalProps> = ({ course, user, onClose, onConfirm, moneyBackGuaranteeDays }) => {
  const isFreeCourse = course.price === 0;
  const [pricingQuote, setPricingQuote] = useState<{
    amount_paid: number;
    course_amount: number;
    processing_fee: number;
    processing_fee_source: string;
  } | null>(null);

  // Calculate location-based markup (10% for US and EU countries)
  const euCountries = [
    'Germany', 'France', 'Italy', 'Spain', 'Netherlands', 'Belgium', 'Austria',
    'Sweden', 'Denmark', 'Finland', 'Poland', 'Czech Republic', 'Hungary',
    'Portugal', 'Greece', 'Ireland', 'Slovenia', 'Estonia', 'Latvia', 'Lithuania',
    'Slovakia', 'Luxembourg', 'Malta', 'Cyprus', 'Croatia', 'Bulgaria', 'Romania'
  ];
  const isUSOrEU = user.country === 'United States' || euCountries.includes(user.country || '');
  const locationMarkup = isUSOrEU ? 0.10 : 0; // 10% markup
  const fallbackCourseAmount = course.price * (1 + locationMarkup);
  const fallbackProcessingFee = fallbackCourseAmount > 0 ? fallbackCourseAmount * FLUTTERWAVE_PROCESSING_FEE_RATE : 0;
  const fallbackFinalPrice = fallbackCourseAmount + fallbackProcessingFee;
  const isAIGeneratedCourse = useMemo(() => (course.category || '').toLowerCase().includes('ai'), [course.category]);

  useEffect(() => {
    let cancelled = false;

    if (isFreeCourse) {
      setPricingQuote(null);
      return () => {
        cancelled = true;
      };
    }

    const aiCourse = isAIGeneratedCourse
      ? {
          title: course.title,
          description: course.description || course.summary,
          level: course.level,
          duration_label: course.durationLabel,
          price: Number(course.price || 0),
        }
      : undefined;

    void api.quoteStudentCoursePayment(course.slug, user.country, aiCourse)
      .then((quote) => {
        if (!cancelled) {
          setPricingQuote(quote);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPricingQuote(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [course.description, course.durationLabel, course.level, course.price, course.slug, course.summary, course.title, isAIGeneratedCourse, isFreeCourse, user.country]);

  const courseAmount = pricingQuote?.course_amount ?? fallbackCourseAmount;
  const processingFee = pricingQuote?.processing_fee ?? fallbackProcessingFee;
  const finalPrice = pricingQuote?.amount_paid ?? fallbackFinalPrice;
  const finalPriceLabel = `₦${finalPrice.toLocaleString()}`;
  const processingFeeLabel = `₦${processingFee.toLocaleString()}`;

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
            <div className="mt-3 space-y-1 text-xs text-slate-600">
              <p>Course subtotal: ₦{courseAmount.toLocaleString()}</p>
              <p>
                Flutterwave processing fee{pricingQuote?.processing_fee_source === 'flutterwave' ? ' (live quote)' : ' (estimated)'}: {processingFeeLabel}
              </p>
            </div>
            {locationMarkup > 0 && (
              <p className="text-xs text-slate-500 mt-1">
                Includes 10% location markup for {user.country}
              </p>
            )}
            <p className="text-xs text-green-600 font-semibold mt-1">{moneyBackGuaranteeDays}-Day Money-Back Guarantee</p>
          </div>

          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6 rounded-r-lg" role="alert">
            <p className="font-bold">Secure Checkout</p>
            <p className="text-sm">You will be redirected to Flutterwave v3 to complete payment securely.</p>
          </div>

          <ButtonRow alignment="right" className="pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="button" onClick={onConfirm}>Continue to Flutterwave ({finalPriceLabel})</Button>
          </ButtonRow>
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
