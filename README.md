# Kambi Academy - Complete Learning Management System

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

A comprehensive LMS platform featuring live video classes, real-time chat, coding sandbox, and advanced teacher dashboard.

## 🚀 Complete Platform Update - All Features Implemented

### ✅ Enhanced Teacher Dashboard (7 Pages)
- **Dashboard Overview**: Statistics cards, recent activity, quick actions
- **Courses Management**: Course status badges, enrollment tracking, performance metrics
- **Materials Upload**: File upload interface with progress tracking
- **Assignments Hub**: Tabbed interface (All/Create/Submissions/Review)
- **Quizzes Management**: Quiz creation, results analysis, student performance
- **Classes Overview**: Class management with chat/live session triggers
- **Live Sessions**: Scheduling interface with calendar integration

### ✅ Production-Grade Video Conferencing
- **LiveKit Integration**: Enterprise WebRTC replacement for video calls
- **Screen Sharing**: High-quality screen sharing capabilities
- **Recording Support**: Session recording and playback
- **Breakout Rooms**: Advanced classroom management features
- **Real-time Chat**: Integrated messaging during video sessions

### ✅ Advanced Real-Time Features
- **Socket.io Chat System**: Bidirectional real-time messaging
- **Room-based Chat**: Separate chat rooms for different classes/sessions
- **Typing Indicators**: Real-time typing status
- **Message History**: Persistent chat history with timestamps
- **File Sharing**: Send files and media in chat

### ✅ Professional Code Sandbox
- **Monaco Editor**: VS Code-quality code editing experience
- **Multi-Language Support**: HTML, CSS, JavaScript, Python, and more
- **Live Preview**: Real-time code execution and preview
- **Syntax Highlighting**: Full syntax highlighting and IntelliSense
- **Error Detection**: Real-time error checking and suggestions

### ✅ Global Branding & Theming System
- **Admin-Controlled Branding**: Dynamic logo, colors, and fonts
- **Hero Carousel**: Auto-sliding banner with customizable slides
- **Responsive Glassmorphism**: Modern UI with glassmorphism effects
- **Custom Gradients**: Dynamic gradient backgrounds
- **Theme Persistence**: User preference saving

### ✅ Student Request System
- **Request Submission**: Students can send help requests to teachers
- **Priority Levels**: Low, Medium, High, Urgent priority options
- **Request Types**: Help, Clarification, Meeting, Other categories
- **Status Tracking**: Pending, Accepted, Declined, Completed states
- **Teacher Management**: Teachers can accept/decline/manage requests

### ✅ Superadmin Password Logic
- **Force Password Change**: mustChangePassword flag for new admins
- **Secure Password Requirements**: Complex password validation
- **Admin Role Handling**: Special logic for superadmin accounts
- **Password Change Flow**: Secure password update process

### ✅ AI-Powered Recommendations
- **Course Recommendations**: AI-driven course suggestions based on performance
- **Study Plan Generation**: Personalized weekly study schedules
- **Performance Analysis**: Learning pattern recognition
- **Adaptive Learning**: Dynamic content recommendations

### ✅ Progress Tracking Dashboard
- **Comprehensive Analytics**: Course progress, quiz scores, assignment grades
- **Learning Streaks**: Study consistency tracking
- **Achievement System**: Gamification with badges and milestones
- **Progress Visualization**: Charts and graphs for learning metrics

### ✅ Leaderboard System
- **Global Rankings**: Student performance comparisons
- **Course-Specific Boards**: Individual course leaderboards
- **Achievement Tracking**: Points, badges, and rankings
- **Motivational Features**: Progress incentives and rewards

### ✅ Offline Mode Support (PWA)
- **Service Worker**: Background caching and sync
- **Offline Access**: Cached course materials and assignments
- **Background Sync**: Automatic data synchronization
- **Push Notifications**: Offline update notifications
- **Progressive Web App**: Installable PWA with manifest

### ✅ About Page Video Support
- **Video Upload**: Support for uploaded videos or YouTube/Vimeo links
- **Thumbnail Preview**: Automatic thumbnail generation
- **Lazy Loading**: Optimized video loading performance
- **Responsive Video**: Mobile-optimized video playback

## 🛠 Technology Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Cloudflare Workers + Hono
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2
- **Video**: LiveKit (WebRTC)
- **Real-time**: Socket.io
- **Code Editor**: Monaco Editor
- **Styling**: Tailwind CSS + Custom Gradients
- **PWA**: Service Worker + Web App Manifest

## 📦 Key Dependencies

```json
{
  "@livekit/components-react": "^2.0.0",
  "livekit-client": "^2.0.0",
  "@monaco-editor/react": "^4.6.0",
  "socket.io-client": "^4.7.0",
  "framer-motion": "^11.0.0",
  "lucide-react": "^0.344.0"
}
```

## 🚀 Run Locally

**Prerequisites:** Node.js 18+

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Frontend Environment Setup:**
   ```bash
   cp .env.example .env.local
   ```
   Configure your environment variables:
   ```env
   VITE_LIVEKIT_URL=your-livekit-server-url
   VITE_SOCKET_URL=your-socket-server-url
   ```

3. **Pages Function Secrets (local only):**
   ```bash
   cp .dev.vars.example .dev.vars
   ```
   Configure your local runtime secrets in `.dev.vars`:
   ```env
   LIVEKIT_API_KEY=your-livekit-api-key
   LIVEKIT_API_SECRET=your-livekit-api-secret
   FLUTTERWAVE_PUBLIC_KEY=your-flutterwave-public-key
   FLUTTERWAVE_SECRET_KEY=your-flutterwave-secret-key
   FLUTTERWAVE_ENCRYPTION_KEY=your-flutterwave-encryption-key
   ```

4. **Database Migration:**
   ```bash
   npx wrangler d1 migrations apply DB --local
   ```

5. **Development Server:**
   ```bash
   npm run dev
   ```

6. **Pages Functions Dev Server:**
   ```bash
   npm run cf:dev
   ```

7. **Production Build:**
   ```bash
   npm run build
   ```

## 📱 Progressive Web App (PWA)

The platform includes full PWA support:
- **Offline Access**: Cached content and assignments
- **Background Sync**: Automatic data synchronization
- **Push Notifications**: Real-time updates
- **Installable**: Add to home screen functionality

## 🎯 Core Features Summary

- ✅ **Complete LMS**: Courses, assignments, quizzes, materials
- ✅ **Live Classes**: HD video with screen sharing
- ✅ **Real-time Chat**: Integrated messaging system
- ✅ **Code Playground**: Professional coding environment
- ✅ **Admin Dashboard**: Comprehensive management tools
- ✅ **Student Portal**: Progress tracking and requests
- ✅ **AI Recommendations**: Personalized learning paths
- ✅ **Offline Support**: PWA with background sync
- ✅ **Mobile Responsive**: Optimized for all devices
- ✅ **Modern UI/UX**: Glassmorphism and gradient design

## 📈 Performance & Security

- **Cloudflare Infrastructure**: Global CDN and edge computing
- **Optimized Builds**: Vite-powered fast builds and HMR
- **Type Safety**: Full TypeScript implementation
- **Security**: JWT authentication, input validation, CORS
- **Scalability**: Serverless architecture with auto-scaling

---

**Status**: ✅ **COMPLETE** - All features from kambi.md guide successfully implemented and tested.

### Required
- `AI_PROVIDER` — `anthropic` or `google`
- `AI_MODEL` — `claude-sonnet-4.5` (or your preferred model)
- `ANTHROPIC_API_KEY` — Your Anthropic API key (if using Claude)
- `API_KEY` — Your Google GenAI API key (if using Google)

### New Features
- `VITE_LIVEKIT_URL` — LiveKit WebSocket URL for video conferencing
- `VITE_SOCKET_URL` — Socket.io server URL for real-time chat

## Teacher Dashboard Routes

- `/teacher` — Dashboard overview with statistics
- `/teacher/courses` — Course management with status badges
- `/teacher/materials` — Upload and manage learning materials
- `/teacher/assignments` — Create assignments with tabs for All/Create/Submissions/Review
- `/teacher/quizzes` — Quiz creation and results management
- `/teacher/classes` — Class management with chat and live session triggers
- `/teacher/live` — Live session scheduling and management

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Video**: LiveKit (production-grade WebRTC)
- **Chat**: Socket.io (real-time messaging)
- **Code Editor**: Monaco Editor (VS Code engine)
- **Backend**: Cloudflare Workers, D1 Database, R2 Storage
- **Styling**: Tailwind CSS with custom gradients and glassmorphism

## Deployment

### Cloudflare Pages (Recommended)
1. Connect your GitHub repository
2. Set secrets in Pages settings or with Wrangler:
   ```bash
   npx wrangler pages secret put LIVEKIT_API_KEY --project-name kambiacademy
   npx wrangler pages secret put LIVEKIT_API_SECRET --project-name kambiacademy
   npx wrangler pages secret put FLUTTERWAVE_PUBLIC_KEY --project-name kambiacademy
   npx wrangler pages secret put FLUTTERWAVE_SECRET_KEY --project-name kambiacademy
   npx wrangler pages secret put FLUTTERWAVE_ENCRYPTION_KEY --project-name kambiacademy
   ```
3. Configure D1 database and R2 bucket bindings
4. Deploy automatically on push

Do not store service credentials in `wrangler.jsonc`. Keep local values in `.dev.vars` and remote values in Cloudflare Pages secrets.

### Environment Variables for Production
Set these in your deployment provider:

```bash
AI_PROVIDER=anthropic
AI_MODEL=claude-sonnet-4.5
ANTHROPIC_API_KEY=your_key_here
VITE_LIVEKIT_URL=wss://your-livekit-server.livekit.cloud
VITE_SOCKET_URL=wss://your-socket-server.com
```

## Key Components

### LiveKit Integration
- Replaces raw WebRTC with production-grade video
- Supports screen sharing, mute controls, participant management
- Teacher can mute all students, raise hands, etc.

### Real-time Chat System
- Room-based messaging
- User presence indicators
- File sharing support
- Integrated with live classes

### Code Sandbox
- Monaco Editor (VS Code)
- Multi-language support (JS, HTML, CSS, Python)
- Live preview for web content
- Save and share code snippets

## Development Commands

```bash
# Development
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Deploy to Cloudflare Pages
npm run deploy:pages

# Database operations
npm run db:migrate:local
npm run db:seed:local
```

## Architecture Overview

```
React App (Vite)
├── LiveKit Client → LiveKit Cloud (Video)
├── Socket.io Client → Cloudflare Worker (Chat)
├── Monaco Editor → Code Sandbox
└── REST API → Cloudflare Workers → D1 + R2
```

This platform now rivals commercial LMS solutions with enterprise-grade video conferencing, real-time collaboration, and professional UI/UX.
