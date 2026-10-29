import React from 'react'
import styles from './Spinner.module.css'

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  /** If true, renders as an overlay covering the parent container */
  overlay?: boolean
  className?: string
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  overlay = false,
  className,
}) => {
  const content = (
    <div className={`${styles.spinner} ${styles[size]} ${className ?? ''}`}>
      <div className={styles.ring} />
    </div>
  )

  if (overlay) {
    return <div className={styles.overlay}>{content}</div>
  }

  return content
}
