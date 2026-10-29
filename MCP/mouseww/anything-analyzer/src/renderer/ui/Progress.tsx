import React from 'react'
import styles from './Progress.module.css'

export interface ProgressProps {
  percent: number
  status?: 'normal' | 'success' | 'error'
  showPercent?: boolean
  className?: string
}

export const Progress: React.FC<ProgressProps> = ({
  percent,
  status = 'normal',
  showPercent = true,
  className,
}) => {
  const clampedPercent = Math.min(100, Math.max(0, percent))

  return (
    <div className={`${styles.wrapper} ${className ?? ''}`}>
      <div className={styles.track}>
        <div
          className={`${styles.bar} ${status !== 'normal' ? styles[status] : ''}`}
          style={{ width: `${clampedPercent}%` }}
        />
      </div>
      {showPercent && <span className={styles.percent}>{Math.round(clampedPercent)}%</span>}
    </div>
  )
}
