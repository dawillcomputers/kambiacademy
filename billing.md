🧩 1. DATABASE SCHEMA (CLOUDFLARE D1)
👨‍🏫 users
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  password TEXT,
  role TEXT, -- admin | teacher | student
  created_at TEXT
);
💳 subscriptions (platform + teacher plans)
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  type TEXT, -- platform | teacher
  plan TEXT, -- starter | growth | pro | scale
  status TEXT, -- active | suspended | expired
  price REAL,
  billing_cycle TEXT, -- monthly | yearly
  start_date TEXT,
  end_date TEXT
);
📊 usage_tracking (core profit engine)
CREATE TABLE usage_tracking (
  id TEXT PRIMARY KEY,
  teacher_id TEXT,
  class_id TEXT,
  date TEXT,

  hours_used REAL,
  participants INTEGER,

  video_gb REAL,
  storage_gb REAL,
  worker_requests INTEGER,

  estimated_cost REAL,
  estimated_revenue REAL
);
➕ addons
CREATE TABLE addons (
  id TEXT PRIMARY KEY,
  teacher_id TEXT,
  type TEXT, 
  -- recording | hd | extra_hours | class_size | student_video | storage

  quantity REAL,
  price REAL,
  active INTEGER,
  created_at TEXT
);
🧠 pricing_overrides (SUPERADMIN CONTROL)
CREATE TABLE pricing_overrides (
  id TEXT PRIMARY KEY,
  target TEXT, -- plan | addon | global
  target_id TEXT,
  new_price REAL,
  active INTEGER,
  updated_at TEXT
);
📉 cost_logs (Cloudflare cost engine)
CREATE TABLE cost_logs (
  id TEXT PRIMARY KEY,
  teacher_id TEXT,
  class_id TEXT,

  sfu_cost REAL,
  storage_cost REAL,
  worker_cost REAL,

  total_cost REAL,
  revenue REAL,
  profit REAL,

  created_at TEXT
);
⚙️ 2. CLOUDFLARE WORKER LOGIC (CORE ENGINE)
🧠 A. COST CALCULATOR
export function calculateCost({
  videoGB,
  storageGB,
  workerCalls
}) {
  const sfuCost = videoGB * 0.05;
  const storageCost = storageGB * 0.015;
  const workerCost = workerCalls * 0.0001;

  return sfuCost + storageCost + workerCost;
}
💰 B. PROFIT ENGINE
export function calculateProfit(revenue: number, cost: number) {
  return revenue - cost;
}
🚨 C. PROFIT SAFETY GUARD
export function checkProfitHealth(profit: number, revenue: number) {
  const ratio = profit / revenue;

  if (ratio < 0.4) {
    return {
      status: "danger",
      action: "restrict_features"
    };
  }

  if (ratio < 0.5) {
    return {
      status: "warning",
      action: "suggest_upgrade"
    };
  }

  return {
    status: "healthy",
    action: "none"
  };
}
🎥 D. ENFORCEMENT ENGINE
export function enforceClassRules(classData, plan) {
  return {
    maxParticipants: plan.limit,
    maxHours: plan.hours,

    videoQuality:
      classData.participants > 20 ? "240p" : "420p",

    studentVideoEnabled: plan.allowStudentVideo,

    recordingEnabled: plan.allowRecording
  };
}
⚠️ E. AUTO-OVERRIDE LOGIC
export function applyOverride(plan, overrides) {
  const override = overrides.find(o => o.target_id === plan.id);

  if (!override) return plan;

  return {
    ...plan,
    price: override.new_price
  };
}
🖥️ 3. SUPERADMIN DASHBOARD (REACT + VITE)
📊 Layout
Sidebar
Dashboard
Pricing Control
Usage Monitor
Profit Engine
Teacher Accounts
Add-ons Manager
Overrides
💰 Pricing Control Page
- Edit Platform Plans
- Edit Teacher Plans
- Edit Add-on Prices
- Toggle features globally
📈 Profit Monitor
Per teacher:
- revenue
- cost
- profit
- margin %
- warnings (red/yellow/green)
⚙️ Override Panel
- Increase plan price
- Reduce add-on cost
- Block high-cost teachers
- Auto-adjust pricing toggle
👨‍🏫 4. TEACHER DASHBOARD (KEY UI)
📊 Usage Panel
- Hours used / limit
- Participants active
- Storage used
- Estimated cost per class
⚠️ Smart Warnings
- "Student video increases cost"
- "Enable HD → +$3/month"
- "You are at 80% usage"
➕ Add-ons Panel
- Recording toggle
- HD upgrade button
- Extra hours purchase
- Participant boost
🧠 5. SYSTEM ARCHITECTURE (IMPORTANT)
User → Cloudflare Worker
      ↓
Auth + Subscription check
      ↓
D1 DB (plans + usage)
      ↓
SFU (media)
      ↓
Usage tracking engine
      ↓
Cost + profit calculation
      ↓
Dashboard updates
🔥 6. PROFIT CONTROL SYSTEM (YOUR CORE EDGE)
RULES:
1. Minimum margin rule
If profit < 40% → restrict features or suggest upgrade
2. Auto downgrade system
High usage → lower video quality automatically
3. Pay-more trigger system
Student video ON → extra charge
HD ON → extra charge
Large class → extra charge
🎯 FINAL RESULT

With this system:

✔ You are protected from Cloudflare cost spikes
✔ Every teacher is profit-tracked
✔ Add-ons become your main revenue
✔ Abuse is automatically throttled
✔ Superadmin has full control

🖥️ Complete React dashboard UI (ready-to-run)
🔐 Auth + billing integration (Flutterwave-ready)
📡 Live class enforcement (WebRTC + SFU rules)
enforce all



🧠 KAMBI ACADEMY — ENFORCEMENT SYSTEM (FINAL IMPLEMENTATION)
⚙️ 1. CORE PRINCIPLE (IMPORTANT)

Everything in your system must pass through one gate:

User → Worker → Subscription Engine → Enforcement Engine → SFU

👉 If it doesn’t pass enforcement → it doesn’t run.

🧩 2. ENFORCEMENT ENGINE (HARD RULE SYSTEM)

This replaces “soft rules” with strict runtime control

🎓 A. PLAN ENFORCEMENT
export function enforcePlanLimits(user, plan) {
  return {
    maxParticipants: plan.maxParticipants,
    maxHours: plan.maxHours,
    maxStorageGB: plan.storageLimit,

    videoQualityCap:
      plan.maxParticipants > 20 ? "240p" : "420p",

    allowStudentVideo: plan.studentVideoEnabled,
    allowRecording: plan.recordingEnabled
  };
}
🚫 HARD BLOCK RULES
export function blockIfExceeded(usage, plan) {
  if (usage.hoursUsed >= plan.maxHours) {
    return { block: true, reason: "HOURS_LIMIT_REACHED" };
  }

  if (usage.participants > plan.maxParticipants) {
    return { block: true, reason: "PARTICIPANT_LIMIT" };
  }

  if (usage.storageGB > plan.storageLimit) {
    return { block: true, reason: "STORAGE_LIMIT" };
  }

  return { block: false };
}
🎥 3. VIDEO CONTROL ENGINE (SFU COST CONTROL)

This is where profit is protected.

👀 STUDENT VIDEO RULES
export function studentVideoPolicy(plan, classState) {
  if (!plan.studentVideoEnabled) {
    return { enabled: false };
  }

  if (classState.participants > 10) {
    return { maxActiveVideos: 1 };
  }

  return { maxActiveVideos: 3 };
}
📉 AUTO QUALITY CONTROL
export function videoQualityEngine(participants) {
  if (participants > 50) return "240p";
  if (participants > 20) return "360p";
  return "420p";
}
💰 4. COST + PROFIT ENGINE (REAL-TIME)
📊 COST CALCULATION
export function calculateClassCost({
  videoGB,
  storageGB,
  workerCalls
}) {
  const sfuCost = videoGB * 0.05;
  const storageCost = storageGB * 0.015;
  const workerCost = workerCalls * 0.0001;

  return sfuCost + storageCost + workerCost;
}
📈 PROFIT CHECK
export function checkProfit(revenue, cost) {
  const profit = revenue - cost;
  const margin = profit / revenue;

  return {
    profit,
    margin,
    status:
      margin < 0.4 ? "danger" :
      margin < 0.5 ? "warning" :
      "healthy"
  };
}
🚨 AUTO ACTIONS
export function profitActions(status) {
  if (status === "danger") {
    return [
      "reduce_video_quality",
      "disable_student_video",
      "suggest_upgrade"
    ];
  }

  if (status === "warning") {
    return [
      "limit_hd",
      "show_upgrade_banner"
    ];
  }

  return [];
}
⚠️ 5. AUTO OVERRIDE SYSTEM (SUPERADMIN CONTROL)
👑 GLOBAL OVERRIDE ENGINE
export function applyGlobalOverride(plan, overrides) {
  const override = overrides.find(o =>
    o.target === "plan" &&
    o.target_id === plan.id
  );

  if (!override) return plan;

  return {
    ...plan,
    price: override.new_price
  };
}
🔥 EMERGENCY COST PROTECTION
export function emergencyThrottle(costRatio) {
  if (costRatio > 0.8) {
    return {
      mode: "emergency",
      actions: [
        "force_240p",
        "disable_student_video",
        "pause_recording"
      ]
    };
  }

  return { mode: "normal" };
}
🧠 6. SYSTEM FLOW (FULL ENFORCEMENT PIPELINE)
1. User joins class
        ↓
2. Worker checks subscription
        ↓
3. Enforcement engine runs:
      - plan limits
      - usage limits
      - override rules
        ↓
4. Cost engine predicts session cost
        ↓
5. Profit engine checks margin
        ↓
6. If safe → allow SFU connection
        ↓
7. If risky → throttle or block features
🖥️ 7. DASHBOARD ENFORCEMENT UI
📊 Teacher Dashboard

Shows:

hours used / limit
cost per class (real-time)
profit impact warning
“this feature increases cost” labels
⚠️ Smart Warnings
- “Student video increases cost by ~30%”
- “HD will reduce your profit margin”
- “You are near usage limit”
💰 Upgrade triggers
“Unlock 10 more hours → $2”
“Enable HD → $3/month”
“Increase class size → $5”
🧠 8. SUPERADMIN CONTROL (GLOBAL POWER)

Superadmin can:

💰 Pricing
change ANY plan instantly
adjust add-ons globally
⚙️ System control
force video quality caps
disable student video platform-wide
throttle expensive teachers
📉 Profit protection
auto-raise prices if margins drop
block unprofitable usage patterns
🔥 9. FINAL RESULT (WHAT YOU BUILT)

You now have:

✔ Real-time cost engine
✔ Profit-aware SFU control
✔ Auto-throttling system
✔ Usage-based billing system
✔ Add-on monetization layer
✔ Superadmin override power
🚀 CRITICAL INSIGHT

This is no longer just a pricing system.

This is a self-regulating SaaS profit engine