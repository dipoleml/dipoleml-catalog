import React from 'react'
import styles from './Badge.module.css'

export interface BadgeProps {
  color?: string
  label?: string
  size?: 'sm' | 'md' | 'lg'
  pulse?: boolean
  className?: string
  style?: React.CSSProperties
}

export const Badge: React.FC<BadgeProps> = ({
  color = 'var(--text-muted)',
  label,
  size = 'md',
  pulse = false,
  className,
  style,
}) => {
  const cls = [
    styles.badge,
    size !== 'md' && styles[size],
    pulse && styles.pulse,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <span className={cls} style={style}>
      <span className={styles.dot} style={{ background: color }} />
      {label && <span className={styles.label}>{label}</span>}
    </span>
  )
}
