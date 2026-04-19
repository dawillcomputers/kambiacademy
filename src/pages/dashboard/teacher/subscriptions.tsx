import { useState } from "react";
import TeacherDashboardLayout from '../../../components/layout/TeacherDashboardLayout';

type Plan = {
  id: string;
  name: string;
  priceNgn: number;
  participants: number;
  hours: number;
  storage: number;
  features: string[];
  popular?: boolean;
};

type Addon = {
  id: string;
  name: string;
  priceNgn: number;
  unit: string;
  icon: string;
};

const plans: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    priceNgn: 7500,
    participants: 10,
    hours: 20,
    storage: 5,
    features: ["Basic Classes", "No Recording", "Limited Video"]
  },
  {
    id: "growth",
    name: "Growth",
    priceNgn: 18000,
    participants: 30,
    hours: 60,
    storage: 20,
    features: ["Recording", "Student Video", "HD Optional"],
    popular: true
  },
  {
    id: "pro",
    name: "Pro",
    priceNgn: 37500,
    participants: 80,
    hours: 150,
    storage: 100,
    features: ["HD Enabled", "Large Classes", "Priority Support"]
  },
];

const addons: Addon[] = [
  { id: "recording", name: "Recording", priceNgn: 4500, unit: "/month", icon: "🎙️" },
  { id: "hd_video", name: "HD Video", priceNgn: 4500, unit: "/month", icon: "🎥" },
  { id: "extra_hours", name: "Extra Hours (+10h)", priceNgn: 3000, unit: "one-time", icon: "⏱" },
  { id: "more_students", name: "More Students (+20)", priceNgn: 5000, unit: "/month", icon: "👥" },
];

const fmtNgn = (v: number) => `₦${v.toLocaleString()}`;

export default function TeacherSubscriptionsPage() {
  const [currentPlan, setCurrentPlan] = useState("starter");

  return (
    <TeacherDashboardLayout>
      <div className="space-y-6">

        {/* HEADER */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Subscription & Billing
          </h1>
          <p className="text-sm text-slate-500">
            Choose your plan, manage usage, and purchase add-ons
          </p>
        </div>

        {/* CURRENT PLAN */}
        <div className="rounded-2xl bg-white p-5 shadow-sm border">
          <h2 className="text-sm font-semibold text-slate-500">
            Current Plan
          </h2>

          <div className="mt-3 flex items-center justify-between">
            <div>
              <p className="text-xl font-bold text-slate-900 capitalize">
                {currentPlan}
              </p>
              <p className="text-sm text-slate-500">
                Active subscription
              </p>
            </div>

            <button className="rounded-xl bg-slate-900 px-4 py-2 text-white text-sm">
              Upgrade Plan
            </button>
          </div>
        </div>

        {/* USAGE + PROFIT WARNING */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border">
            <p className="text-sm text-slate-500">Hours Used</p>
            <p className="text-xl font-bold text-slate-900">18 / 20</p>
            <div className="mt-2 h-2 bg-slate-100 rounded">
              <div className="h-2 bg-orange-500 rounded w-[90%]" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border">
            <p className="text-sm text-slate-500">Participants</p>
            <p className="text-xl font-bold text-slate-900">8 / 10</p>
          </div>

          <div className="bg-white p-4 rounded-xl border">
            <p className="text-sm text-slate-500">Profit Status</p>
            <p className="text-lg font-bold text-red-500">⚠ Danger</p>
            <p className="text-xs text-slate-500">
              Student video increasing cost
            </p>
          </div>
        </div>

        {/* PLAN CARDS */}
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map(plan => {
            const isCurrent = currentPlan === plan.id;

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border p-5 bg-white transition ${
                  isCurrent
                    ? "border-slate-900 shadow-lg"
                    : "hover:shadow-md"
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">
                    Most Popular
                  </span>
                )}

                <h3 className="text-lg font-bold text-slate-900">
                  {plan.name}
                </h3>

                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {fmtNgn(plan.priceNgn)}
                  <span className="text-sm text-slate-500">/month</span>
                </p>

                <ul className="mt-4 space-y-2 text-sm text-slate-600">
                  <li>👥 {plan.participants} Participants</li>
                  <li>⏱ {plan.hours} Hours</li>
                  <li>💾 {plan.storage} GB Storage</li>

                  {plan.features.map(f => (
                    <li key={f}>✔ {f}</li>
                  ))}
                </ul>

                <button
                  disabled={isCurrent}
                  onClick={() => setCurrentPlan(plan.id)}
                  className={`mt-5 w-full rounded-xl py-2 text-sm font-semibold ${
                    isCurrent
                      ? "bg-slate-200 text-slate-500"
                      : "bg-slate-900 text-white hover:bg-slate-800"
                  }`}
                >
                  {isCurrent ? "Current Plan" : "Upgrade"}
                </button>
              </div>
            );
          })}
        </div>

        {/* ADD-ONS */}
        <div className="rounded-2xl bg-white p-5 border">
          <h2 className="text-lg font-bold text-slate-900">
            Add-ons
          </h2>

          <div className="mt-4 grid md:grid-cols-4 gap-4">
            {addons.map(addon => (
              <div
                key={addon.id}
                className="border rounded-xl p-4 text-center"
              >
                <span className="text-2xl">{addon.icon}</span>
                <p className="mt-2 font-semibold text-slate-900">
                  {addon.name}
                </p>
                <p className="text-sm font-bold text-emerald-700">
                  {fmtNgn(addon.priceNgn)}
                </p>
                <p className="text-xs text-slate-500">{addon.unit}</p>

                <button className="mt-3 text-sm bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800">
                  Add
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* SMART WARNINGS */}
        <div className="rounded-2xl bg-yellow-50 border border-yellow-200 p-4">
          <p className="text-sm font-semibold text-yellow-800">
            ⚠ Smart Suggestions
          </p>

          <ul className="mt-2 text-sm text-yellow-700 space-y-1">
            <li>• Student video increases cost by ~30%</li>
            <li>• Upgrade to Growth to avoid throttling</li>
            <li>• You are at 90% usage</li>
          </ul>
        </div>

      </div>
    </TeacherDashboardLayout>
  );
}
