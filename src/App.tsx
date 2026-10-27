import React from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { DashboardView } from './views/DashboardView'
import { WizardView } from './views/WizardView'
import { EditorView } from './views/EditorView'
import { QuestionBankView } from './views/QuestionBankView'
import { LayoutEngineView } from './views/LayoutEngineView'
import { DesignerView } from './views/DesignerView'
import { PreviewView } from './views/PreviewView'
import { ExportView } from './views/ExportView'
import { DraftsView } from './views/DraftsView'
import { OcrView } from './views/OcrView'
import { VoiceView } from './views/VoiceView'
import { SettingsView } from './views/SettingsView'

import { AuthProvider } from './contexts/AuthContext'
import { AuthGate } from './components/auth/AuthGate'

export const App: React.FC = () => {
  return (
    <HashRouter>
      <AuthProvider>
        <AuthGate>
          <Routes>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<DashboardView />} />
              <Route path="wizard" element={<WizardView />} />
              <Route path="editor" element={<EditorView />} />
              <Route path="bank" element={<QuestionBankView />} />
              <Route path="layout" element={<LayoutEngineView />} />
              <Route path="designer" element={<DesignerView />} />
              <Route path="preview" element={<PreviewView />} />
              <Route path="export" element={<ExportView />} />
              <Route path="drafts" element={<DraftsView />} />
              <Route path="ocr" element={<OcrView />} />
              <Route path="voice" element={<VoiceView />} />
              <Route path="settings" element={<SettingsView />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </AuthGate>
      </AuthProvider>
    </HashRouter>
  )
}

export default App
