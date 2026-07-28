import React from 'react';
import styles from './DataTable.module.css';

interface Column {
  key: string;
  label: string;
  numeric?: boolean;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
}

export function DataTable({ columns, data }: DataTableProps) {
  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={col.numeric ? styles.numeric : ''}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((col) => {
                const val = row[col.key];
                const isNumeric = col.numeric;
                let colorClass = '';
                if (typeof val === 'string' && val.startsWith('+')) colorClass = styles.positive;
                if (typeof val === 'string' && val.startsWith('-')) colorClass = styles.negative;
                
                return (
                  <td key={col.key} className={`${isNumeric ? styles.numeric : ''} ${colorClass}`}>
                    {val}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
