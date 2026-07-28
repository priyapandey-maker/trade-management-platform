import React from 'react';
import styles from './ChartCard.module.css';

interface ChartCardProps {
  title: string;
}

export function ChartCard({ title }: ChartCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.title}>{title}</div>
        <div className={styles.controls}>
          <button className={styles.timeframeBtn}>1m</button>
          <button className={styles.timeframeBtn}>5m</button>
          <button className={`${styles.timeframeBtn} ${styles.active}`}>1H</button>
          <button className={styles.timeframeBtn}>1D</button>
        </div>
      </div>
      <div className={styles.chartArea}>
        [ Financial Chart Canvas Placeholder ]
      </div>
    </div>
  );
}
