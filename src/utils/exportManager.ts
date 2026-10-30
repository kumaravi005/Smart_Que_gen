import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  Header,
  Footer,
  PageNumber,
  HeadingLevel,
  convertMillimetersToTwip,
  PageOrientation,
  ImageRun
} from 'docx'
import * as XLSX from 'xlsx'
import type { FullPaper, MCQOption } from '../types'

/**
 * Sanitizes a string for safe filesystem filename usage.
 */
export function sanitizeFilename(str: string): string {
  return str
    .trim()
    .replace(/[^a-zA-Z0-9_\-\s]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 60)
}

/**
 * Generates a clean, descriptive filename for paper downloads.
 */
export function generateExportFilename(paper: FullPaper, extension: string): string {
  const inst = sanitizeFilename(paper.settings.institute.name || 'Omega').slice(0, 15)
  const exam = sanitizeFilename(paper.settings.examName || 'Exam')
  const subject = sanitizeFilename(paper.settings.subject || 'Paper')
  const className = sanitizeFilename(paper.settings.className || 'Class')
  return `${inst}_${subject}_${className}_${exam}.${extension.replace(/^\./, '')}`
}

/**
 * Triggers a browser download from a Blob.
 */
export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Converts a base64 or remote/local image URL to a Uint8Array for docx embedding.
 */
async function getImageBytes(url: string): Promise<Uint8Array | null> {
  try {
    if (url.startsWith('data:')) {
      const base64Index = url.indexOf('base64,')
      if (base64Index !== -1) {
        const base64Data = url.substring(base64Index + 7)
        const binaryStr = atob(base64Data)
        const bytes = new Uint8Array(binaryStr.length)
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i)
        }
        return bytes
      }
    } else {
      const res = await fetch(url)
      if (res.ok) {
        const buffer = await res.arrayBuffer()
        return new Uint8Array(buffer)
      }
    }
  } catch (err) {
    console.warn('Could not fetch or convert image for DOCX export:', err)
  }
  return null
}

/**
 * Helper to build an MCQ 2x2 or 4x1 table in docx.
 */
function buildMcqTable(options: MCQOption[]): Table {
  const rows: TableRow[] = []

  for (let i = 0; i < options.length; i += 2) {
    const opt1 = options[i]
    const opt2 = options[i + 1]

    const cells: TableCell[] = [
      new TableCell({
        width: { size: 50, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.NONE },
          bottom: { style: BorderStyle.NONE },
          left: { style: BorderStyle.NONE },
          right: { style: BorderStyle.NONE }
        },
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: `(${opt1.label}) `, bold: true, font: 'Times New Roman' }),
              new TextRun({ text: opt1.text, font: 'Times New Roman' })
            ],
            spacing: { before: 40, after: 40 }
          })
        ]
      })
    ]

    if (opt2) {
      cells.push(
        new TableCell({
          width: { size: 50, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE }
          },
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: `(${opt2.label}) `, bold: true, font: 'Times New Roman' }),
                new TextRun({ text: opt2.text, font: 'Times New Roman' })
              ],
              spacing: { before: 40, after: 40 }
            })
          ]
        })
      )
    } else {
      cells.push(
        new TableCell({
          width: { size: 50, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE }
          },
          children: [new Paragraph('')]
        })
      )
    }

    rows.push(new TableRow({ children: cells }))
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE }
    },
    rows
  })
}

/**
 * Builds an authentic, fully editable Microsoft Word (.docx) document.
 */
export async function exportToDocx(paper: FullPaper): Promise<Blob> {
  const { settings, content, layout } = paper
  const isLandscape = layout.orientation === 'landscape'
  const margins = layout.pageMarginsMm || { top: 15, bottom: 15, left: 15, right: 15 }

  const docChildren: (Paragraph | Table)[] = []

  // 1. Institution Header
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: settings.institute.name.toUpperCase(),
          bold: true,
          size: 32, // 16pt
          font: 'Times New Roman'
        })
      ],
      spacing: { after: 60 }
    })
  )

  if (settings.institute.tagline) {
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: settings.institute.tagline,
            italics: true,
            size: 20, // 10pt
            font: 'Times New Roman'
          })
        ],
        spacing: { after: 40 }
      })
    )
  }

  const instMeta = [settings.institute.address, settings.institute.contact].filter(Boolean).join(' | ')
  if (instMeta) {
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: instMeta,
            size: 18, // 9pt
            color: '555555',
            font: 'Times New Roman'
          })
        ],
        spacing: { after: 80 }
      })
    )
  }

  // Examination Title
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `${settings.examName.toUpperCase()} ${settings.academicSession ? `(${settings.academicSession})` : ''}`,
          bold: true,
          size: 26, // 13pt
          font: 'Times New Roman'
        })
      ],
      spacing: { before: 80, after: 120 }
    })
  )

  // Examination Details Meta Table
  docChildren.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 8, color: '333333' },
        bottom: { style: BorderStyle.SINGLE, size: 8, color: '333333' },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.NONE }
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'Subject: ', bold: true, font: 'Times New Roman' }),
                    new TextRun({ text: settings.subject, font: 'Times New Roman' })
                  ]
                })
              ]
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'Class: ', bold: true, font: 'Times New Roman' }),
                    new TextRun({ text: settings.className, font: 'Times New Roman' })
                  ]
                })
              ]
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'Time: ', bold: true, font: 'Times New Roman' }),
                    new TextRun({
                      text: `${Math.floor(settings.durationMinutes / 60)}h ${settings.durationMinutes % 60 ? `${settings.durationMinutes % 60}m` : ''}`,
                      font: 'Times New Roman'
                    })
                  ]
                })
              ]
            }),
            new TableCell({
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [
                    new TextRun({ text: 'Max Marks: ', bold: true, font: 'Times New Roman' }),
                    new TextRun({ text: String(settings.totalMarks), font: 'Times New Roman' })
                  ]
                })
              ]
            })
          ]
        })
      ]
    })
  )

  // Candidate Box (if name or roll number is enabled)
  if (settings.studentFields?.showName || settings.studentFields?.showRollNo) {
    docChildren.push(
      new Paragraph({ spacing: { before: 120 } }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 4, color: '999999' },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: '999999' },
          left: { style: BorderStyle.SINGLE, size: 4, color: '999999' },
          right: { style: BorderStyle.SINGLE, size: 4, color: '999999' },
          insideHorizontal: { style: BorderStyle.NONE },
          insideVertical: { style: BorderStyle.NONE }
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: 'Student Name: ____________________________________', font: 'Times New Roman', size: 20 }),
                      new TextRun({ text: '\t\tRoll No: __________________', font: 'Times New Roman', size: 20 })
                    ],
                    spacing: { before: 80, after: 80 }
                  })
                ]
              })
            ]
          })
        ]
      })
    )
  }

  // General Instructions
  if (settings.generalInstructions && settings.generalInstructions.length > 0) {
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'GENERAL INSTRUCTIONS:', bold: true, size: 22, font: 'Times New Roman' })
        ],
        spacing: { before: 160, after: 60 }
      })
    )

    settings.generalInstructions.forEach((inst, idx) => {
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${idx + 1}. `, bold: true, font: 'Times New Roman' }),
            new TextRun({ text: inst, font: 'Times New Roman' })
          ],
          indent: { left: convertMillimetersToTwip(4) },
          spacing: { before: 30, after: 30 }
        })
      )
    })
  }

  // Manual Mode layout difference warning notice in Word doc
  if (layout.designData?.mode === 'manual') {
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '[Note on Layout: This document was customized on the Visual Canvas Designer. Absolute millimetric positioning has been automatically reflowed into editable native Word paragraphs and tables to preserve 100% text and table editability on desktop and mobile Word.]',
            italics: true,
            size: 18,
            color: '666666',
            font: 'Times New Roman'
          })
        ],
        spacing: { before: 140, after: 120 }
      })
    )
  }

  // 2. Sections and Questions
  const sections = content.sections || []
  let globalIndex = 1

  for (const sec of sections) {
    const secConfig = settings.sections?.find(s => s.id === sec.sectionId)
    if (secConfig && secConfig.enabled === false) continue

    const secQuestions = sec.questions || []
    if (secQuestions.length === 0) continue

    const secMarks = secQuestions.reduce((acc, q) => acc + (q.marks || 0), 0)
    const secTitle = (secConfig?.title && secConfig.title.trim()) || sec.title
    const secInstructions = secConfig?.instructions !== undefined ? secConfig.instructions : sec.instructions

    // Section Heading
    docChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [
          new TextRun({
            text: `${secTitle.toUpperCase()} ${secMarks > 0 ? `(${secMarks} Marks)` : ''}`,
            bold: true,
            size: 24, // 12pt
            font: 'Times New Roman'
          })
        ],
        shading: { fill: 'F1F5F9' },
        spacing: { before: 200, after: 60 }
      })
    )

    if (secInstructions && secInstructions.trim()) {
      const formattedInst = secInstructions.trim().startsWith('(') && secInstructions.trim().endsWith(')')
        ? secInstructions.trim()
        : `(${secInstructions.trim()})`
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: formattedInst,
              italics: true,
              size: 20,
              font: 'Times New Roman',
              color: '444444'
            })
          ],
          spacing: { after: 80 }
        })
      )
    }

    // Questions in Section
    for (const q of secQuestions) {
      const qNum = q.customNumber || String(globalIndex++)

      // Question Prompt Paragraph
      const promptRuns: TextRun[] = [
        new TextRun({ text: `Q${qNum}. `, bold: true, size: 22, font: 'Times New Roman' }),
        new TextRun({ text: q.prompt, size: 22, font: 'Times New Roman' })
      ]

      if (q.marks) {
        promptRuns.push(
          new TextRun({
            text: `\t[${q.marks} Mark${q.marks > 1 ? 's' : ''}]`,
            bold: true,
            size: 20,
            font: 'Times New Roman'
          })
        )
      }

      docChildren.push(
        new Paragraph({
          children: promptRuns,
          spacing: { before: 120, after: 40 }
        })
      )

      // Per-question instructions
      if (q.instructions) {
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `(${q.instructions})`,
                italics: true,
                size: 18,
                color: '555555',
                font: 'Times New Roman'
              })
            ],
            indent: { left: convertMillimetersToTwip(4) },
            spacing: { after: 40 }
          })
        )
      }

      // Diagram / Image if present
      if (q.diagramUrl) {
        const imgBytes = await getImageBytes(q.diagramUrl)
        if (imgBytes) {
          docChildren.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new ImageRun({
                  type: 'png',
                  data: imgBytes,
                  transformation: { width: 320, height: 180 }
                })
              ],
              spacing: { before: 60, after: 60 }
            })
          )
        } else {
          docChildren.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: `[Figure / Diagram: ${q.diagramUrl}]`,
                  italics: true,
                  size: 18,
                  color: '888888'
                })
              ],
              spacing: { before: 40, after: 40 }
            })
          )
        }
      }

      // MCQ Options
      if (q.options && q.options.length > 0) {
        docChildren.push(buildMcqTable(q.options))
      }

      // Writing space lines for subjective questions
      if (q.writingSpaceLines && q.writingSpaceLines > 0) {
        for (let l = 0; l < q.writingSpaceLines; l++) {
          docChildren.push(
            new Paragraph({
              border: {
                bottom: { style: BorderStyle.SINGLE, size: 2, color: 'CCCCCC' }
              },
              spacing: { before: 60, after: 60 },
              children: [new TextRun('')]
            })
          )
        }
      }
    }
  }

  // 3. Assemble complete Document
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: isLandscape ? 16838 : 11906,
              height: isLandscape ? 11906 : 16838,
              orientation: isLandscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT
            },
            margin: {
              top: convertMillimetersToTwip(margins.top),
              bottom: convertMillimetersToTwip(margins.bottom),
              left: convertMillimetersToTwip(margins.left),
              right: convertMillimetersToTwip(margins.right)
            }
          }
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `${settings.institute.name} — ${settings.examName} | ${settings.subject} (${settings.className})`,
                    size: 16,
                    color: '777777',
                    font: 'Times New Roman'
                  })
                ]
              })
            ]
          })
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: `${settings.examName}  —  Page `, size: 18, color: '666666' }),
                  new TextRun({ children: [PageNumber.CURRENT] }),
                  new TextRun({ text: ' of ', size: 18, color: '666666' }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES] })
                ]
              })
            ]
          })
        },
        children: docChildren
      }
    ]
  })

  return await Packer.toBlob(doc)
}

/**
 * Builds an authentic, structured Excel (.xlsx) workbook.
 */
export function exportToXlsx(paper: FullPaper): Blob {
  const { settings, content } = paper
  const wb = XLSX.utils.book_new()

  // Sheet 1: Questions Matrix
  const headers = [
    'Question No',
    'Section',
    'Question Type',
    'Question Text',
    'Option A',
    'Option B',
    'Option C',
    'Option D',
    'Correct Answer',
    'Marks',
    'Negative Marks',
    'Difficulty',
    'Topic',
    'Subtopic / Tags',
    'Answer Key / Solution',
    'Explanation'
  ]

  const rows: (string | number)[][] = []
  const sections = content.sections || []
  let globalIndex = 1

  for (const sec of sections) {
    const secConfig = settings.sections?.find(s => s.id === sec.sectionId)
    if (secConfig && secConfig.enabled === false) continue
    const secTitle = (secConfig?.title && secConfig.title.trim()) || sec.title

    for (const q of sec.questions || []) {
      const qNum = q.customNumber ? q.customNumber : globalIndex++
      const optA = q.options?.find(o => o.label === 'A')?.text || ''
      const optB = q.options?.find(o => o.label === 'B')?.text || ''
      const optC = q.options?.find(o => o.label === 'C')?.text || ''
      const optD = q.options?.find(o => o.label === 'D')?.text || ''

      const correctOpt = q.options?.find(o => o.isCorrect)?.label || q.answerKey || ''

      rows.push([
        qNum,
        secTitle,
        q.type.replace(/_/g, ' ').toUpperCase(),
        q.prompt,
        optA,
        optB,
        optC,
        optD,
        correctOpt,
        q.marks || 1,
        q.negativeMarks || 0,
        (q.difficulty || 'medium').toUpperCase(),
        q.topic || 'General',
        (q.tags || []).join(', '),
        q.solutionText || q.answerKey || '',
        q.explanation || ''
      ])
    }
  }

  const wsQuestions = XLSX.utils.aoa_to_sheet([headers, ...rows])

  // Configure column widths for readability
  wsQuestions['!cols'] = [
    { wch: 12 }, // Question No
    { wch: 18 }, // Section
    { wch: 20 }, // Question Type
    { wch: 45 }, // Question Text
    { wch: 22 }, // Option A
    { wch: 22 }, // Option B
    { wch: 22 }, // Option C
    { wch: 22 }, // Option D
    { wch: 15 }, // Correct Answer
    { wch: 8 },  // Marks
    { wch: 14 }, // Negative Marks
    { wch: 12 }, // Difficulty
    { wch: 18 }, // Topic
    { wch: 24 }, // Tags
    { wch: 25 }, // Solution
    { wch: 30 }  // Explanation
  ]

  XLSX.utils.book_append_sheet(wb, wsQuestions, 'Questions_Matrix')

  // Sheet 2: Examination Summary
  const totalQuestions = rows.length
  const totalCalculatedMarks = rows.reduce((acc, r) => acc + (typeof r[9] === 'number' ? r[9] : 0), 0)

  const summaryData = [
    ['EXAMINATION PAPER SUMMARY', ''],
    ['Institution Name', settings.institute.name],
    ['Tagline', settings.institute.tagline || ''],
    ['Address', settings.institute.address || ''],
    ['Contact', settings.institute.contact || ''],
    ['Examination Name', settings.examName],
    ['Academic Session', settings.academicSession || ''],
    ['Subject', settings.subject],
    ['Class / Grade', settings.className],
    ['Exam Date', settings.date || ''],
    ['Duration (Minutes)', settings.durationMinutes],
    ['Max Marks (Configured)', settings.totalMarks],
    ['Calculated Question Marks', totalCalculatedMarks],
    ['Total Questions', totalQuestions],
    ['Sections Count', sections.length],
    ['Export Timestamp', new Date().toLocaleString()]
  ]

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData)
  wsSummary['!cols'] = [{ wch: 25 }, { wch: 45 }]
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Exam_Summary')

  const arrayBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  return new Blob([arrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
}

/**
 * Injects dynamic page orientation style and triggers window.print()
 */
export function triggerPrintWithOrientation(orientation: 'portrait' | 'landscape' = 'portrait'): void {
  const existing = document.getElementById('dynamic-print-orientation')
  if (existing) existing.remove()

  const style = document.createElement('style')
  style.id = 'dynamic-print-orientation'
  style.innerHTML = `
    @media print {
      @page {
        size: A4 ${orientation};
        margin: 0mm !important;
      }
    }
  `
  document.head.appendChild(style)
  window.print()
}
