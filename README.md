# Omega Education Center — Smart Question Paper Generator

A production-quality, mobile-first Progressive Web Application (PWA) designed for educational coaching centers and schools to configure, author, format, visually design, preview, and export examination papers with automated pagination and 100% offline persistence.

---

## 🌟 Key Capabilities & Architectural Highlights

### 1. Offline-First Architecture (IndexedDB)
- **Local Persistence**: Powered by browser-native **IndexedDB** (`idb`), allowing educators and staff to author, customize layouts, and export papers seamlessly with zero internet connection.
- **Stable Entity Normalization**: **Exam Settings**, **Paper Content**, and **Visual Layout** are stored as separate normalized entities in IndexedDB, linked via immutable UUIDs to prevent content corruption.
- **Continuous Local Save**: Changes to questions, sections, marks, and header configurations are stored instantaneously on-device.
- **Zero Cloud Lock-in**: Full JSON database backup and restore capabilities built directly into the system.

### 2. The 10 Core Modules
1. **Paper Setup Wizard (`#/wizard`)**: 3-step configuration for examination metadata, question blueprint breakdown, and layout geometry. Reusable institution profiles.
2. **Smart Question Editor (`#/editor`)**: Multi-format question authoring (MCQ, Short Answer, Long Answer) with bulk paste-and-parse, automatic numbering, marks assignment, internal choices, and diagram attachments.
3. **Question Bank (`#/bank`)**: Centralized repository of reusable questions with subject, topic, and difficulty indexing.
4. **Automatic Layout Engine (`#/layout`)**: Auto-balancing layout system calculating page density, question spacing, and two-column paper-saving modes to reduce photocopy expenses.
5. **Visual Paper Designer (`#/designer`)**: Mobile-friendly freeform millimeter canvas with drag-and-drop, resize handles, 1-click alignment, 25-level undo/redo, template saving, and boundary overlap detection.
6. **Live Preview (`#/preview`)**: True-to-scale A4 paper simulator reflecting physical margins, dividers, and typography in real time.
7. **Export Manager (`#/export`)**: Multi-format offline export pipeline for print-ready vector PDF, authentic Microsoft Word (.docx), and structured Excel (.xlsx) workbooks.
8. **Drafts & Local Storage (`#/drafts`)**: Revision history, offline engine diagnostics, and JSON database backup/restore.
9. **Photo & OCR Processing (`#/ocr`)**: Mobile camera photo capture, gallery upload, question number filtering (e.g. Q7, Q9), mandatory review/editing, math notation distortion detection, and diagram region preservation.
10. **Voice Input Dictation (`#/voice`)**: Guided step-by-step speech-to-text dictation for Question Prompts and Options A, B, C, D, with continuous keyword recognition and review.

---

## 🛠️ Technology Stack

- **Core**: React 19, TypeScript
- **Bundler & Tooling**: Vite 8, Vitest (Automated Unit Testing Suite)
- **Styling**: Tailwind CSS v4, Lucide React (Touch-friendly iconography)
- **Storage Layer**: IndexedDB via `idb`
- **PWA & Offline**: `vite-plugin-pwa` (Service Worker, Web App Manifest)
- **Document Generation**: `docx` (Office Open XML), `xlsx` (SheetJS)
- **OCR Engine**: `tesseract.js` (Client-side Web Worker)
- **Routing**: `react-router-dom` (HashRouter for serverless and offline deep-link resilience)

---

## 📱 Mobile-First Design & Usability

- **Touch-Friendly Controls**: Minimum 44px–48px touch targets for mobile thumb ergonomics.
- **PointerEvent Drag-and-Drop**: Unified pointer tracking (`onPointerDown`, `pointermove`, `pointerup`) with `touch-none` styling eliminates mobile touch-scroll conflicts during canvas element dragging.
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

### Development Server
Start the local Vite development server:
```bash
npm run dev
```
Open your browser and navigate to:
```
http://localhost:5173/
```

### Running Automated Tests
Run the complete Vitest test suite (48 tests across 7 test suites):
```bash
npm test
```

### Production Build
Create the production bundle with PWA service worker precaching:
```bash
npm run build
```

Preview the production build locally:
```bash
npm run preview
```

---

## 📄 Export Compatibility & Format Behavior

| Format | Engine | Offline Support | Key Fidelity & Behavior |
| :--- | :--- | :--- | :--- |
| **PDF** | Browser Print Engine (`@media print`) | **100% Offline** | Accurate A4 dimensions ($210\,\text{mm} \times 297\,\text{mm}$), custom margins, watermark, header logos, section dividers, and selectable vector text. |
| **DOCX** | `docx` (Office Open XML) | **100% Offline** | Native `.docx` document with editable tables for MCQ options and metadata. Absolute canvas coordinates are reflowed into standard Word flow to preserve 100% text editability. |
| **XLSX** | `xlsx` (SheetJS) | **100% Offline** | Two-sheet workbook (`Questions_Matrix` and `Exam_Summary`) with structured columns: Question No, Section, Type, Text, Options A-D, Answer Key, Marks, Topic, Tags. |

---

## 📷 Photo Input (OCR) & Voice Dictation Capabilities

### Photo OCR Input
- **Capture**: Direct mobile camera capture (`capture="environment"`) or file selector.
- **Question Number Filtering**: Allows requesting specific question numbers (e.g. entering `"Q7, Q9"` or `"7, 9"` filters specifically for those questions).
- **Mandatory Review & Edit**: Every candidate question must be reviewed before import. Uncertain mathematical notations, LaTeX, or ambiguous characters (e.g. 0 vs O, 1 vs l) are flagged with warning badges.
- **Diagram Preservation**: Users can crop or attach image regions from the photograph as `diagramUrl`.

### Voice Dictation
- **Guided Step-by-Step Mode**: Dedicated microphone buttons for Question Prompt and Options A, B, C, D.
- **Continuous Mode**: Continuous speech recognition parsing keywords (`Question:`, `Option A:`, `Option B:`, etc.).
- **Connectivity Notice**: Web Speech API routes audio via browser cloud services and requires an active internet connection. Offline fallback simulation and editable review cards ensure reliability.

---

## 📂 Project Structure

```
src/
├── types/                     # Enterprise TypeScript domain models
│   ├── exam.ts                # ExamSettings, InstituteProfile, StudentFieldsConfig
│   ├── question.ts            # Question, MCQOption, SectionContent, PaperContent
│   ├── layout.ts              # VisualLayout, DesignerElement, ManualDesignData
│   ├── paper.ts               # PaperMetadata, FullPaper
│   ├── bank.ts                # QuestionBankItem, BankFilter
│   ├── pageLayout.ts          # GeneratedPage, PaginatedPaper
│   └── index.ts               # Centralized domain type exports
├── services/                  # Business logic and persistence layer
│   ├── db.ts                  # IndexedDB schema, object stores & seed data
│   ├── paperService.ts        # Paper CRUD operations with stable ID linking
│   ├── bankService.ts         # Question bank operations & query filters
│   ├── templateService.ts     # Paper template persistence
│   └── storageService.ts      # Backup export & import restoration
├── hooks/                     # Custom React hooks
│   ├── useNetworkStatus.ts    # Online/offline network event detector
│   ├── usePapers.ts           # Papers query and mutations hook
│   └── usePaperDetails.ts     # Aggregated paper details hook
├── components/
│   ├── layout/                # Shell, Header, Sidebar, MobileNav
│   ├── common/                # Button, Badge, Modal, NetworkIndicator
│   ├── wizard/                # ExamDetailsStep, QuestionCountsStep, LayoutStep
│   ├── editor/                # QuestionCard, BulkQuestionInput, SectionManager
│   ├── designer/              # DesignerCanvas, DesignerPropertiesPanel
│   └── preview/               # PaperSheet (A4 Simulator)
├── views/                     # Screen views for the 10 logical modules
│   ├── DashboardView.tsx      # Primary coaching dashboard
│   ├── WizardView.tsx         # Module 1: Paper Setup Wizard
│   ├── EditorView.tsx         # Module 2: Question Editor
│   ├── QuestionBankView.tsx   # Module 3: Question Bank
│   ├── LayoutEngineView.tsx   # Module 4: Automatic Layout Engine
│   ├── DesignerView.tsx       # Module 5: Visual Paper Designer
│   ├── PreviewView.tsx        # Module 6: Live Paper Preview
│   ├── ExportView.tsx         # Module 7: Export Manager
│   ├── DraftsView.tsx         # Module 8: Drafts & Local Storage
│   ├── OcrView.tsx            # Module 9: Photo & OCR Processing
│   ├── VoiceView.tsx          # Module 10: Voice Input Dictation
│   └── SettingsView.tsx       # Coaching Center Profile & Diagnostics
├── utils/                     # Utility helpers
│   ├── exportManager.ts       # DOCX, XLSX, and PDF export builders
│   ├── ocrService.ts          # Tesseract.js recognition, number filter & crop
│   ├── designerConversion.ts  # Automatic-to-manual element conversion & overlaps
│   ├── paginationEngine.ts    # Physical height estimation & pagination
│   ├── bulkParser.ts          # Question and MCQ option regex parser
│   ├── mcqLayout.ts           # MCQ option grid density calculation
│   └── numbering.ts           # Continuous, roman, and alpha numbering
└── tests/                     # 7 automated Vitest test suites (48 passing tests)
```

---

## 📊 Honest Implementation Status Report

| Feature Area | Status | Technical Details & Boundaries |
| :--- | :--- | :--- |
| **Paper Setup Wizard** | **Completed** | Full 3-step configuration, validation, stable ID linking, profile saving. |
| **Question Editor** | **Completed** | Structured authoring, bulk text parser, MCQ 4-option grids, auto-numbering. |
| **Question Bank** | **Completed** | Tagging, search query filters, difficulty levels, insertion into paper sections. |
| **Auto Layout Engine** | **Completed** | Physical A4 height estimation, orphan prevention, 1-col and 2-col density. |
| **Visual Canvas Designer** | **Completed** | Millimeter A4 canvas, drag/resize with pointer events, properties drawer, undo/redo, template saving. |
| **Live Print Preview** | **Completed** | True-to-scale A4 preview, cover page simulator, watermarks, orientation toggle. |
| **Multi-Format Export** | **Completed** | Vector PDF printing, authentic `.docx` OpenXML, structured `.xlsx` workbooks. |
| **Offline Persistence** | **Completed** | IndexedDB storage, continuous local save, full JSON backup export & restore. |
| **Photo Input (OCR)** | **Completed** | Camera capture, Tesseract worker, Q7/Q9 number filtering, math distortion warnings, diagram crop. |
| **Voice Input** | **Completed** | Web Speech API, guided Question + Options A-D dictation, continuous keyword parser, offline fallback. |
| **Complex Math OCR** | **Partially Supported** | Clean printed formulas are recognized; highly degraded handwriting or nested multi-line LaTeX requires manual review via the review editor before import. |
| **Cloud Auto-Sync** | **Needs Future Work** | Application is currently 100% offline-first. Multi-user cloud synchronization across distinct coaching branches can be added in a future phase. |

---

## 🔒 Data Privacy & Offline Guarantee
All examination papers, student credentials, and custom question banks authored in **Omega PaperGen** remain completely on your local device. No exam papers or student data are ever transmitted to third-party cloud servers.
