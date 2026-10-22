# Omega Education Center — Smart Question Paper Generator

A production-quality, mobile-first Progressive Web Application (PWA) designed for educational coaching centers and schools to configure, author, format, preview, and export examination papers with automated layout and offline persistence.

---

## 🌟 Key Capabilities & Architectural Highlights

### 1. Offline-First Architecture (IndexedDB)
- **Local Persistence**: Powered by browser-native **IndexedDB** (`idb`), allowing educators and staff to author and edit examination papers seamlessly even with unstable or zero internet connection.
- **Stable ID Separation**: In accordance with enterprise architectural standards, **Exam Settings**, **Paper Content**, and **Visual Layout** are stored as separate normalized entities in IndexedDB, linked via stable UUIDs.
- **Continuous Local Save**: Changes to questions, sections, marks, and header configurations are stored instantaneously on-device.
- **Zero Cloud Lock-in**: Full JSON database backup and restore capabilities built directly into the system.

### 2. The 10 Core Modules
1. **Paper Setup Wizard**: Configure examination parameters (subject, grade, duration, maximum marks, blueprint sections, student instructions) prior to question entry.
2. **Question Editor**: Multi-format question authoring with automated MCQ option structuring, difficulty tagging, marks assignment, and internal choice support.
3. **Question Bank**: Centralized repository of reusable questions with subject, topic, and difficulty indexing.
4. **Automatic Layout Engine**: Auto-balancing layout system calculating page density, question spacing, and two-column paper-saving modes to reduce photocopy expenses.
5. **Visual Paper Designer**: Comprehensive institution branding controls for headers, logos, anti-piracy diagonal watermarks, and typography.
6. **Live Preview**: True-to-scale A4 paper simulator reflecting physical margins, dividers, and typography in real time.
7. **Export Manager**: Export pipelines for print-ready vector PDF, editable Microsoft Word DOCX, and Excel XLSX question matrices.
8. **Drafts & Local Storage**: Revision history, draft statuses (`draft`, `in_progress`, `ready`, `exported`), and database diagnostics.
9. **Image & OCR Processing**: Textbook photo capture and camera scanner pipeline with clear online/offline mode indication.
10. **Voice Input**: Speech-to-text dictation parser structuring spoken questions directly into active paper sections.

---

## 🛠️ Technology Stack

- **Core**: React 19, TypeScript
- **Bundler & Tooling**: Vite 8, Vitest (Automated Unit Testing)
- **Styling**: Tailwind CSS v4, Lucide React (Touch-friendly iconography)
- **Storage Layer**: IndexedDB via `idb`
- **PWA & Offline**: `vite-plugin-pwa` (Service Worker, Web App Manifest)
- **Routing**: `react-router-dom` (HashRouter for serverless and offline deep-link resilience)

---

## 📱 Mobile-First Design & Usability

- **Touch-Friendly Controls**: Minimum 44px–48px touch targets for mobile thumb ergonomics.
- **Adaptive Layout**: Persistent mobile bottom navigation bar with prominent floating action button, paired with desktop collapsible sidebar drawer.
- **Network Status Bar**: Real-time visual indicator (`Online` in green or `Offline Mode (IndexedDB Active)` in amber) ensuring transparency for staff members.
- **Print Optimization**: Dedicated `@media print` CSS rules hiding UI controls and outputting pristine vector A4 pages.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended; v24 tested)
- npm (v9 or higher)

### Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/kumaravi005/Smart_Que_gen.git
cd Question_Gen
npm install
```

### Running Locally (Development Server)
Start the Vite development server:
```bash
npm run dev
```
Open your browser and navigate to:
```
http://localhost:5173/
```

### Running Automated Tests
Run unit tests for domain data models and IndexedDB services:
```bash
npm test
```

### Building for Production
Create the optimized production bundle with PWA service worker precaching:
```bash
npm run build
```

Preview the production build locally:
```bash
npm run preview
```

---

## 📂 Project Structure

```
src/
├── types/                     # Enterprise TypeScript domain models
│   ├── exam.ts                # ExamSettings, InstituteProfile, ExamSectionConfig
│   ├── question.ts            # Question, MCQOption, SectionContent, PaperContent
│   ├── layout.ts              # VisualLayout, HeaderStyle, ColumnLayout
│   ├── paper.ts               # PaperMetadata, FullPaper
│   ├── bank.ts                # QuestionBankItem, BankFilter
│   └── index.ts               # Centralized domain type exports
├── services/                  # Business logic and persistence layer
│   ├── db.ts                  # IndexedDB schema, object stores & seed data
│   ├── paperService.ts        # Paper CRUD operations with stable ID linking
│   ├── bankService.ts         # Question bank operations & query filters
│   └── storageService.ts      # Backup export & database diagnostics
├── hooks/                     # Custom React hooks
│   ├── useNetworkStatus.ts    # Online/offline network event detector
│   ├── usePapers.ts           # Papers query and mutations hook
│   └── usePaperDetails.ts     # Aggregated paper details hook
├── components/
│   ├── layout/
│   │   ├── Header.tsx         # Brand bar with network indicator & actions
│   │   ├── Sidebar.tsx        # Navigation drawer for all 10 modules
│   │   ├── MobileNav.tsx      # Bottom navigation bar with central create FAB
│   │   └── AppLayout.tsx      # Shell coordinating header, sidebar & outlet
│   └── common/
│       ├── Button.tsx         # Touch-optimized button with variants & loading state
│       ├── Badge.tsx          # Categorical status badges
│       ├── Modal.tsx          # Accessible modal dialog
│       ├── NetworkIndicator.tsx # Real-time online/offline status badge
│       └── CreatePaperModal.tsx # Rapid paper initialization modal
├── views/                     # Screen views for the 10 logical modules
│   ├── DashboardView.tsx      # Primary coaching dashboard & quick access
│   ├── WizardView.tsx         # Module 1: Paper Setup Wizard
│   ├── EditorView.tsx         # Module 2: Question Editor
│   ├── QuestionBankView.tsx   # Module 3: Question Bank
│   ├── LayoutEngineView.tsx   # Module 4: Automatic Layout Engine
│   ├── DesignerView.tsx       # Module 5: Visual Paper Designer
│   ├── PreviewView.tsx        # Module 6: Live Paper Preview
│   ├── ExportView.tsx         # Module 7: Export Manager
│   ├── DraftsView.tsx         # Module 8: Drafts & Local Storage
│   ├── OcrView.tsx            # Module 9: Image & OCR Processing
│   ├── VoiceView.tsx          # Module 10: Voice Input Dictation
│   └── SettingsView.tsx       # Coaching Center Profile & Diagnostics
├── utils/                     # Utility helpers
│   ├── id.ts                  # Stable ID generator
│   └── date.ts                # Date and relative time formatters
├── tests/                     # Automated Vitest test suites
│   └── db.test.ts             # Domain models, stable IDs & CRUD tests
├── App.tsx                    # Route definitions (HashRouter)
├── index.css                  # Tailwind tokens, typography, and print styles
└── main.tsx                   # React root entry point
```

---

## 🔒 Offline & Data Integrity Guarantee
All question papers, settings, and layouts authored in Omega PaperGen remain fully accessible offline. No data is sent to external servers unless an export or remote OCR operation is explicitly triggered by the user. Full database backups can be downloaded as JSON at any time from the **Drafts & Storage** module.
