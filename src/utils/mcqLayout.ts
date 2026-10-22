import type { MCQOption, McqOptionLayoutMode, ColumnLayout } from '../types'

export interface McqLayoutEstimation {
  resolvedGridCols: 1 | 2 | 4
  gridClass: string
  reason: string
  maxOptionLength: number
}

/**
 * Calculates optimal MCQ option grid columns based on option lengths and column mode
 */
export function estimateMcqOptionGrid({
  options,
  mode = 'auto',
  columnLayout = 'single'
}: {
  options?: MCQOption[]
  mode?: McqOptionLayoutMode
  columnLayout?: ColumnLayout
}): McqLayoutEstimation {
  if (!options || options.length === 0) {
    return {
      resolvedGridCols: 1,
      gridClass: 'grid-cols-1',
      reason: 'No options provided',
      maxOptionLength: 0
    }
  }

  const lengths = options.map(o => (o.text || '').trim().length)
  const maxOptionLength = Math.max(...lengths, 0)
  const isTwoColumnPaper = columnLayout === 'two_column'

  // Explicit user override modes
  if (mode === 'four_per_row') {
    // In two-column paper, 4 per row might be too cramped for longer options, but we permit wrapping
    return {
      resolvedGridCols: 4,
      gridClass: 'grid-cols-2 sm:grid-cols-4',
      reason: 'User forced 4 options per row',
      maxOptionLength
    }
  }

  if (mode === 'two_per_row') {
    return {
      resolvedGridCols: 2,
      gridClass: 'grid-cols-1 sm:grid-cols-2',
      reason: 'User forced 2 options per row',
      maxOptionLength
    }
  }

  if (mode === 'one_per_row') {
    return {
      resolvedGridCols: 1,
      gridClass: 'grid-cols-1',
      reason: 'User forced 1 option per row (stacked)',
      maxOptionLength
    }
  }

  // Automatic intelligent adaptation
  if (isTwoColumnPaper) {
    // Two-column paper has narrower width (~80mm per column)
    if (options.length === 4 && maxOptionLength <= 10) {
      return {
        resolvedGridCols: 2,
        gridClass: 'grid-cols-2',
        reason: 'Auto: Short options fit dual columns in 2-column layout',
        maxOptionLength
      }
    }
    return {
      resolvedGridCols: 1,
      gridClass: 'grid-cols-1',
      reason: 'Auto: Stacked vertically for readable 2-column layout',
      maxOptionLength
    }
  }

  // Single column paper (~170mm width)
  if (options.length === 4 && maxOptionLength <= 18) {
    return {
      resolvedGridCols: 4,
      gridClass: 'grid-cols-2 sm:grid-cols-4',
      reason: 'Auto: Short options (<=18 chars) fit comfortably across 4 columns',
      maxOptionLength
    }
  }

  if (maxOptionLength <= 48) {
    return {
      resolvedGridCols: 2,
      gridClass: 'grid-cols-1 sm:grid-cols-2',
      reason: 'Auto: Medium options (<=48 chars) fit 2 per row cleanly',
      maxOptionLength
    }
  }

  return {
    resolvedGridCols: 1,
    gridClass: 'grid-cols-1',
    reason: 'Auto: Long options require full width per row to prevent clipping',
    maxOptionLength
  }
}
