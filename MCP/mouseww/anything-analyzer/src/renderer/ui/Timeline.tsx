import React from 'react'
import styles from './Timeline.module.css'

interface TimelineItem {
  key: string
  color?: string
  children: React.ReactNode
}

interface TimelineProps {
  items: TimelineItem[]
  className?: string
}

export const Timeline: React.FC<TimelineProps> = ({ items, className }) => {
  return (
    <div className={`${styles.timeline} ${className ?? ''}`}>
      {items.map((item, index) => (
        <div key={item.key} className={styles.item}>
          <div className={styles.tail}>
            <span className={styles.dot} style={{ borderColor: item.color || 'var(--color-info)' }} />
            {index < items.length - 1 && <span className={styles.line} />}
          </div>
          <div className={styles.content}>{item.children}</div>
        </div>
      ))}
    </div>
  )
}
