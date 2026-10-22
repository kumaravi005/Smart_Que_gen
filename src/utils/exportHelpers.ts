import type { FullPaper, Question } from '../types'

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function renderQuestionWordHtml(q: Question, num: number): string {
  let qHtml = `
    <div class="question-block" style="margin-bottom: 14px;">
      <div>
        <strong>Q${num}.</strong> ${q.prompt || ''}
        ${q.marks ? `<span style="float: right; font-weight: bold;">[${q.marks}]</span>` : ''}
      </div>
  `

  if (q.options && q.options.length > 0) {
    qHtml += `<table style="width: 100%; margin-left: 20px; margin-top: 6px; font-size: 11pt;">`
    for (let i = 0; i < q.options.length; i += 2) {
      const opt1 = q.options[i]
      const opt2 = q.options[i + 1]
      qHtml += `<tr>`
      qHtml += `<td style="width: 50%; padding: 2px;"><strong>(${opt1.label})</strong> ${opt1.text}</td>`
      if (opt2) {
        qHtml += `<td style="width: 50%; padding: 2px;"><strong>(${opt2.label})</strong> ${opt2.text}</td>`
      } else {
        qHtml += `<td></td>`
      }
      qHtml += `</tr>`
    }
    qHtml += `</table>`
  }

  if (q.writingSpaceLines && q.writingSpaceLines > 0) {
    qHtml += `<div style="margin-top: 8px;">`
    for (let i = 0; i < q.writingSpaceLines; i++) {
      qHtml += `<div style="border-bottom: 1px solid #ccc; height: 18px; width: 100%;"></div>`
    }
    qHtml += `</div>`
  }

  qHtml += `</div>`
  return qHtml
}

/**
 * Generates an editable Microsoft Word (.doc) document preserving editable typography,
 * questions, marks, and MCQ tables while reflowing absolute visual designer elements.
 */
export function exportWordDocument(paper: FullPaper): void {
  const { settings, content } = paper
  let html = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>${settings.examName}</title>
      <style>
        body { font-family: 'Times New Roman', Cambria, serif; font-size: 12pt; line-height: 1.35; color: #111; }
        .institute-header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
        .inst-title { font-size: 18pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
        .exam-title { font-size: 14pt; font-weight: bold; margin-top: 6px; }
        .meta-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10.5pt; font-family: Arial, sans-serif; }
        .meta-table td { padding: 4px; }
        .section-header { font-size: 12pt; font-weight: bold; background-color: #f1f5f9; padding: 6px 8px; margin-top: 18px; margin-bottom: 12px; text-transform: uppercase; border-top: 1.5px solid #333; border-bottom: 1.5px solid #333; }
        .question-block { margin-bottom: 14px; page-break-inside: avoid; }
        .instruction-box { background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 10px; margin-bottom: 16px; font-size: 10pt; font-family: Arial, sans-serif; }
      </style>
    </head>
    <body>
      <div class="institute-header">
        <div class="inst-title">${settings.institute.name}</div>
        ${settings.institute.tagline ? `<div><i>${settings.institute.tagline}</i></div>` : ''}
        ${settings.institute.address ? `<div>${settings.institute.address}</div>` : ''}
        <div class="exam-title">${settings.examName} ${settings.academicSession ? `(${settings.academicSession})` : ''}</div>
        <table class="meta-table">
          <tr>
            <td><strong>Subject:</strong> ${settings.subject}</td>
            <td><strong>Class:</strong> ${settings.className}</td>
            <td><strong>Duration:</strong> ${settings.durationMinutes} Minutes</td>
            <td style="text-align:right"><strong>Max Marks:</strong> ${settings.totalMarks}</td>
          </tr>
        </table>
      </div>
  `

  if (settings.generalInstructions && settings.generalInstructions.length > 0) {
    html += `
      <div class="instruction-box">
        <strong>GENERAL INSTRUCTIONS:</strong>
        <ol style="margin-top: 4px; margin-bottom: 4px; padding-left: 20px;">
          ${settings.generalInstructions.map(i => `<li>${i}</li>`).join('')}
        </ol>
      </div>
    `
  }

  const sections = content.sections || []
  let globalIndex = 1

  if (sections.length > 0) {
    sections.forEach(sec => {
      const secQs = sec.questions || []
      if (secQs.length === 0) return
      html += `
        <div class="section-header">${sec.title} ${sec.instructions ? `— ${sec.instructions}` : ''}</div>
      `
      secQs.forEach(q => {
        html += renderQuestionWordHtml(q, globalIndex++)
      })
    })
  }

  html += `</body></html>`
  const blob = new Blob([html], { type: 'application/msword;charset=utf-8' })
  downloadBlob(blob, `${(settings.examName || 'Exam_Paper').replace(/\s+/g, '_')}.doc`)
}

/**
 * Generates an Excel-compatible CSV question list with answer keys, syllabus tags, and marks.
 */
export function exportExcelCsv(paper: FullPaper): void {
  const headers = ['Question No', 'Type', 'Marks', 'Question Prompt', 'Options', 'Answer Key', 'Explanation']
  const allQuestions = (paper.content.sections || []).flatMap(s => s.questions || [])
  const rows = allQuestions.map((q, idx) => {
    const opts = q.options ? q.options.map(o => `(${o.label}) ${o.text}`).join('; ') : ''
    return [
      idx + 1,
      q.type,
      q.marks,
      `"${(q.prompt || '').replace(/"/g, '""')}"`,
      `"${opts.replace(/"/g, '""')}"`,
      `"${(q.answerKey || '').replace(/"/g, '""')}"`,
      `"${(q.explanation || '').replace(/"/g, '""')}"`
    ].join(',')
  })

  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, `${(paper.settings.examName || 'Question_Matrix').replace(/\s+/g, '_')}_questions.csv`)
}
