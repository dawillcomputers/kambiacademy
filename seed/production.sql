-- Seed: production.sql
-- Populates site_sections with full Kambi Academy content

DELETE FROM site_sections;

INSERT INTO site_sections (key, data) VALUES ('branding', '{
  "name": "Kambi Academy",
  "strapline": "Live digital skills programs powered by Ndovera Meet.",
  "primaryCta": { "label": "Explore courses", "href": "/courses" },
  "secondaryCta": { "label": "Contact admissions", "href": "/contact" }
}');

INSERT INTO site_sections (key, data) VALUES ('hero', '{
  "eyebrow": "Now enrolling — Q2 2026 cohorts",
  "headline": "Master digital skills with live, mentor-led programs",
  "description": "Kambi Academy delivers structured cohort courses in web development, design, and data — backed by Cloudflare infrastructure and Ndovera Meet for real-time workshops.",
  "highlights": ["Live mentor sessions", "Project-based curriculum", "Industry-recognised certificates", "Small cohort sizes"],
  "primaryCta": { "label": "Browse courses", "href": "/courses" },
  "secondaryCta": { "label": "How it works", "href": "/about" }
}');

INSERT INTO site_sections (key, data) VALUES ('stats', '[
  { "label": "Active learners", "value": "2,400+", "detail": "Across 12 countries" },
  { "label": "Completion rate", "value": "94%", "detail": "Industry-leading retention" },
  { "label": "Courses offered", "value": "18", "detail": "Foundation to advanced" },
  { "label": "Mentor hours", "value": "6,200+", "detail": "Live session hours delivered" }
]');

INSERT INTO site_sections (key, data) VALUES ('about', '{
  "headline": "Built for real-world digital careers",
  "narrative": "Kambi Academy was founded to bridge the gap between traditional education and the skills employers actually need. We combine structured curriculum with hands-on mentorship delivered through Ndovera Meet, our purpose-built classroom platform.",
  "principles": [
    { "title": "Learn by building", "description": "Every course centres on real projects — not passive lectures." },
    { "title": "Mentorship first", "description": "Small cohorts ensure every learner gets direct access to industry mentors." },
    { "title": "Accessible everywhere", "description": "Cloudflare-powered infrastructure means low-latency access from anywhere." }
  ]
}');

INSERT INTO site_sections (key, data) VALUES ('contact', '{
  "headline": "Get in touch",
  "description": "Whether you have questions about enrolment, partnerships, or technical support — our team is here to help.",
  "responseTime": "We typically respond within 24 hours on business days.",
  "primaryEmail": "admissions@kambiacademy.com",
  "partnerEmail": "partnerships@kambiacademy.com",
  "location": "Freetown, Sierra Leone",
  "hours": "Monday – Friday, 9 AM – 5 PM GMT"
}');

INSERT INTO site_sections (key, data) VALUES ('tutorProgram', '{
  "headline": "Teach with Kambi Academy",
  "description": "Join our network of expert instructors and reach motivated learners across Africa and beyond. We handle the platform, marketing, and payments — you focus on teaching.",
  "benefits": [
    { "title": "Competitive revenue share", "description": "Earn 70% of every enrolment in your courses." },
    { "title": "Built-in classroom tools", "description": "Ndovera Meet provides live video, screen-sharing, and collaborative whiteboards." },
    { "title": "Curriculum support", "description": "Our instructional design team helps you structure and refine your course content." },
    { "title": "Global reach", "description": "Access learners across 12+ countries through our marketing channels." }
  ],
  "reviewSteps": [
    "Submit your application with your expertise and portfolio.",
    "Our team reviews your profile and schedules a brief interview.",
    "Complete a short demo lesson to showcase your teaching style.",
    "Once approved, build your course with our onboarding support.",
    "Launch your course and start earning."
  ]
}');

INSERT INTO site_sections (key, data) VALUES ('meet', '{
  "name": "Ndovera Meet",
  "headline": "Purpose-built for live learning",
  "description": "Ndovera Meet is our integrated classroom platform — designed from the ground up for structured, mentor-led digital skills sessions.",
  "features": [
    { "title": "HD video & screen sharing", "description": "Crystal-clear video with one-click screen sharing for live demos." },
    { "title": "Interactive whiteboard", "description": "Collaborative drawing and annotation tools for visual explanations." },
    { "title": "Session recording", "description": "Every session is recorded and available for on-demand review." },
    { "title": "Breakout rooms", "description": "Split learners into small groups for focused exercises." }
  ]
}');

INSERT INTO site_sections (key, data) VALUES ('instructors', '[
  {
    "id": "inst-001",
    "name": "Dr. Evelyn Reed",
    "role": "Lead Instructor",
    "headline": "Full-stack web development & UX design",
    "bio": "Dr. Reed brings 12 years of industry experience from roles at Shopify and Google. She specialises in modern JavaScript frameworks and human-centred design.",
    "expertise": ["React", "TypeScript", "Node.js", "UX Research"],
    "yearsExperience": 12,
    "colorToken": "indigo",
    "featured": true
  },
  {
    "id": "inst-002",
    "name": "Amadou Diallo",
    "role": "Senior Instructor",
    "headline": "Data science & Python programming",
    "bio": "Amadou is a data engineer with experience at Andela and Flutterwave. He is passionate about making data literacy accessible across Africa.",
    "expertise": ["Python", "Pandas", "SQL", "Machine Learning"],
    "yearsExperience": 8,
    "colorToken": "teal",
    "featured": true
  },
  {
    "id": "inst-003",
    "name": "Fatima Kamara",
    "role": "Instructor",
    "headline": "UI/UX design & product thinking",
    "bio": "Fatima is a product designer who has worked with startups across West Africa. She focuses on design systems and accessibility.",
    "expertise": ["Figma", "Design Systems", "User Research", "Accessibility"],
    "yearsExperience": 6,
    "colorToken": "rose",
    "featured": false
  }
]');

INSERT INTO site_sections (key, data) VALUES ('courses', '[
  {
    "id": "course-001",
    "slug": "intro-web-development",
    "title": "Introduction to Web Development",
    "summary": "Build your first websites with HTML, CSS, and JavaScript.",
    "description": "A hands-on foundation course covering the core web technologies. You will build responsive websites from scratch, learn version control with Git, and deploy your projects to the web.",
    "level": "Foundation",
    "durationLabel": "8 weeks",
    "priceLabel": "$149",
    "deliveryMode": "Live cohort + on-demand",
    "cohortSize": "25 learners max",
    "category": "Web Development",
    "tone": "indigo",
    "instructorId": "inst-001",
    "featured": true,
    "outcomes": [
      "Build responsive multi-page websites",
      "Write clean, semantic HTML and modern CSS",
      "Add interactivity with vanilla JavaScript",
      "Use Git and GitHub for version control",
      "Deploy projects to Cloudflare Pages"
    ],
    "modules": [
      { "title": "HTML Foundations", "summary": "Semantic markup, forms, and document structure.", "lengthLabel": "Week 1–2" },
      { "title": "CSS & Responsive Design", "summary": "Flexbox, Grid, media queries, and design tokens.", "lengthLabel": "Week 3–4" },
      { "title": "JavaScript Essentials", "summary": "Variables, functions, DOM manipulation, and events.", "lengthLabel": "Week 5–6" },
      { "title": "Capstone Project", "summary": "Build and deploy a complete portfolio website.", "lengthLabel": "Week 7–8" }
    ],
    "syllabusUrl": null
  },
  {
    "id": "course-002",
    "slug": "advanced-react-typescript",
    "title": "Advanced React & TypeScript",
    "summary": "Deep-dive into modern React patterns with full type safety.",
    "description": "Take your frontend skills to the next level with advanced React concepts — hooks, context, suspense, and state management — all written in TypeScript for production-grade applications.",
    "level": "Advanced",
    "durationLabel": "10 weeks",
    "priceLabel": "$249",
    "deliveryMode": "Live cohort",
    "cohortSize": "20 learners max",
    "category": "Web Development",
    "tone": "amber",
    "instructorId": "inst-001",
    "featured": true,
    "outcomes": [
      "Architect scalable React applications",
      "Master advanced hooks and custom hook patterns",
      "Implement robust state management with context and reducers",
      "Write fully typed components and utilities",
      "Test React applications with Vitest and Testing Library"
    ],
    "modules": [
      { "title": "TypeScript for React", "summary": "Generics, utility types, and component typing patterns.", "lengthLabel": "Week 1–2" },
      { "title": "Advanced Hooks", "summary": "Custom hooks, useReducer, useSyncExternalStore.", "lengthLabel": "Week 3–4" },
      { "title": "State & Data Fetching", "summary": "Context patterns, SWR/React Query, and optimistic updates.", "lengthLabel": "Week 5–7" },
      { "title": "Testing & Deployment", "summary": "Unit tests, integration tests, and CI/CD pipelines.", "lengthLabel": "Week 8–10" }
    ],
    "syllabusUrl": null
  },
  {
    "id": "course-003",
    "slug": "ui-ux-design-fundamentals",
    "title": "UI/UX Design Fundamentals",
    "summary": "Learn to design intuitive, beautiful digital products.",
    "description": "Explore the principles of user interface and user experience design. From research to wireframes to high-fidelity prototypes, you will learn a complete design workflow using industry-standard tools.",
    "level": "Intermediate",
    "durationLabel": "8 weeks",
    "priceLabel": "$199",
    "deliveryMode": "Live cohort + workshops",
    "cohortSize": "20 learners max",
    "category": "Design",
    "tone": "rose",
    "instructorId": "inst-003",
    "featured": true,
    "outcomes": [
      "Conduct user research and create personas",
      "Build wireframes and interactive prototypes in Figma",
      "Apply colour theory, typography, and layout principles",
      "Design accessible interfaces that meet WCAG standards",
      "Present and defend design decisions"
    ],
    "modules": [
      { "title": "UX Research & Strategy", "summary": "User interviews, personas, and journey mapping.", "lengthLabel": "Week 1–2" },
      { "title": "Wireframing & Information Architecture", "summary": "Low-fidelity layouts and navigation design.", "lengthLabel": "Week 3–4" },
      { "title": "Visual Design", "summary": "Colour, typography, spacing, and design systems.", "lengthLabel": "Week 5–6" },
      { "title": "Prototyping & Handoff", "summary": "High-fidelity Figma prototypes and developer handoff.", "lengthLabel": "Week 7–8" }
    ],
    "syllabusUrl": null
  },
  {
    "id": "course-004",
    "slug": "python-data-science",
    "title": "Python for Data Science",
    "summary": "Analyse and visualise data with Python, Pandas, and Matplotlib.",
    "description": "A beginner-friendly introduction to Python programming with a focus on data analysis. Learn to clean, transform, and visualise datasets using industry-standard libraries.",
    "level": "Foundation",
    "durationLabel": "8 weeks",
    "priceLabel": "$149",
    "deliveryMode": "Live cohort + labs",
    "cohortSize": "25 learners max",
    "category": "Data Science",
    "tone": "teal",
    "instructorId": "inst-002",
    "featured": false,
    "outcomes": [
      "Write Python scripts for data manipulation",
      "Use Pandas for data cleaning and transformation",
      "Create data visualisations with Matplotlib and Seaborn",
      "Perform exploratory data analysis on real datasets",
      "Build a data analysis portfolio project"
    ],
    "modules": [
      { "title": "Python Basics", "summary": "Variables, data types, control flow, and functions.", "lengthLabel": "Week 1–2" },
      { "title": "Working with Data", "summary": "NumPy arrays and Pandas DataFrames.", "lengthLabel": "Week 3–4" },
      { "title": "Data Visualisation", "summary": "Matplotlib, Seaborn, and storytelling with data.", "lengthLabel": "Week 5–6" },
      { "title": "Capstone Analysis", "summary": "End-to-end analysis of a real-world dataset.", "lengthLabel": "Week 7–8" }
    ],
    "syllabusUrl": null
  }
]');

INSERT INTO site_sections (key, data) VALUES ('testimonials', '[
  {
    "id": "test-001",
    "name": "Alice Johnson",
    "role": "Junior Frontend Developer",
    "organization": "TechBridge Africa",
    "quote": "The hands-on projects at Kambi Academy gave me the confidence to land my first developer role. The mentors are incredible.",
    "courseSlug": "intro-web-development"
  },
  {
    "id": "test-002",
    "name": "Mohamed Sesay",
    "role": "Data Analyst",
    "organization": "Orange SL",
    "quote": "The Python course was exactly what I needed. Practical, well-paced, and the live sessions made all the difference.",
    "courseSlug": "python-data-science"
  },
  {
    "id": "test-003",
    "name": "Mariama Conteh",
    "role": "Product Designer",
    "organization": "Freelance",
    "quote": "The design course transformed how I think about users. I went from making things look pretty to solving real problems.",
    "courseSlug": "ui-ux-design-fundamentals"
  }
]');

INSERT INTO site_sections (key, data) VALUES ('faqs', '[
  {
    "id": "faq-001",
    "question": "What format are the courses delivered in?",
    "answer": "All courses are delivered as live cohort programs through Ndovera Meet. Each cohort includes scheduled sessions with an instructor, hands-on projects, and on-demand recordings.",
    "category": "General"
  },
  {
    "id": "faq-002",
    "question": "Do I need any prior experience?",
    "answer": "Foundation-level courses require no prior experience. Intermediate and advanced courses list prerequisites on their course pages.",
    "category": "General"
  },
  {
    "id": "faq-003",
    "question": "How long do I have access to course materials?",
    "answer": "You have lifetime access to all course recordings and materials after enrolment.",
    "category": "General"
  },
  {
    "id": "faq-004",
    "question": "What is the refund policy?",
    "answer": "We offer a full refund within 7 days of enrolment if the course has not progressed past the first week.",
    "category": "Billing"
  },
  {
    "id": "faq-005",
    "question": "Can I switch cohorts if my schedule changes?",
    "answer": "Yes, you can transfer to a future cohort at no extra cost. Contact admissions to arrange the switch.",
    "category": "General"
  },
  {
    "id": "faq-006",
    "question": "Do you offer certificates?",
    "answer": "Yes, all learners who complete a course and capstone project receive a verifiable digital certificate.",
    "category": "General"
  }
]');

INSERT INTO site_sections (key, data) VALUES ('sessions', '[
  {
    "id": "sess-001",
    "title": "HTML & CSS Kickoff — Cohort 7",
    "courseSlug": "intro-web-development",
    "hostName": "Dr. Evelyn Reed",
    "hostRole": "Lead Instructor",
    "startsAt": "2026-04-14T14:00:00Z",
    "durationMinutes": 90,
    "timezone": "GMT",
    "status": "open",
    "joinUrl": "#",
    "agenda": "Course orientation, development environment setup, and your first HTML page.",
    "seatLabel": "12 seats left",
    "platformLabel": "Ndovera Meet"
  },
  {
    "id": "sess-002",
    "title": "React Hooks Deep-Dive",
    "courseSlug": "advanced-react-typescript",
    "hostName": "Dr. Evelyn Reed",
    "hostRole": "Lead Instructor",
    "startsAt": "2026-04-16T16:00:00Z",
    "durationMinutes": 120,
    "timezone": "GMT",
    "status": "open",
    "joinUrl": "#",
    "agenda": "Custom hooks, useCallback vs useMemo, and performance patterns.",
    "seatLabel": "8 seats left",
    "platformLabel": "Ndovera Meet"
  },
  {
    "id": "sess-003",
    "title": "Figma Prototyping Workshop",
    "courseSlug": "ui-ux-design-fundamentals",
    "hostName": "Fatima Kamara",
    "hostRole": "Instructor",
    "startsAt": "2026-04-21T10:00:00Z",
    "durationMinutes": 90,
    "timezone": "GMT",
    "status": "upcoming",
    "joinUrl": "#",
    "agenda": "Interactive prototyping, micro-interactions, and handoff to developers.",
    "seatLabel": "15 seats left",
    "platformLabel": "Ndovera Meet"
  },
  {
    "id": "sess-004",
    "title": "Pandas Data Wrangling Lab",
    "courseSlug": "python-data-science",
    "hostName": "Amadou Diallo",
    "hostRole": "Senior Instructor",
    "startsAt": "2026-04-22T14:00:00Z",
    "durationMinutes": 120,
    "timezone": "GMT",
    "status": "upcoming",
    "joinUrl": "#",
    "agenda": "Cleaning messy data, handling missing values, and merging DataFrames.",
    "seatLabel": "20 seats left",
    "platformLabel": "Ndovera Meet"
  }
]');
