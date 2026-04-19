import { useState } from "react";
import TeacherDashboardLayout from '../../../components/layout/TeacherDashboardLayout';

type Plan = {
  id: string;
  name: string;
  price: number;
  participants: number;
  hours: number;
  storage: number;
  features: string[];
};

const plans: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    price: 5,
    participants: 10,
    hours: 20,
    storage: 5,
    features: ["Basic Classes", "No Recording", "Limited Video"]
  },
  {
    id: "growth",
    name: "Growth",
    price: 12,
    participants: 30,
    hours: 60,
    storage: 20,
    features: ["Recording", "Student Video", "HD Optional"]
  },
  {
    id: "pro",
    name: "Pro",
    price: 25,
    participants: 80,
    hours: 150,
    storage: 100,
    features: ["HD Enabled", "Large Classes", "Priority"]
  },
];

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
            Manage your plan, usage and profit impact
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
                className={`rounded-2xl border p-5 bg-white transition ${
                  isCurrent
                    ? "border-slate-900 shadow-lg"
                    : "hover:shadow-md"
                }`}
              >
                <h3 className="text-lg font-bold text-slate-900">
                  {plan.name}
                </h3>

                <p className="mt-1 text-2xl font-bold text-slate-900">
                  ${plan.price}
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

            {[
              { name: "Recording", price: "$3/month" },
              { name: "HD Video", price: "$3/month" },
              { name: "Extra Hours", price: "$2" },
              { name: "More Students", price: "$5" }
            ].map(addon => (
              <div
                key={addon.name}
                className="border rounded-xl p-4 text-center"
              >
                <p className="font-semibold text-slate-900">
                  {addon.name}
                </p>
                <p className="text-sm text-slate-500">
                  {addon.price}
                </p>

                <button className="mt-3 text-sm bg-slate-900 text-white px-3 py-1 rounded-lg">
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
