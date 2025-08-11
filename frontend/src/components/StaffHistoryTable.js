// src/components/StaffHistoryTable.js
import React from 'react';
import { useQuery } from '@apollo/client';
import { USER_EVENTS } from '../graphql/managerQueries';
import { Table } from 'antd';

/**
 * Parse various timestamp formats into a JS Date or null:
 * - ISO string "2025-08-09T12:34:56.789Z"
 * - numeric string "1627814400000" (ms) or "1627814400" (s)
 * - number (ms or s)
 */
function parseToDate(ts) {
  if (ts === null || ts === undefined) return null;

  // If already a Date
  if (ts instanceof Date) {
    return isNaN(ts.getTime()) ? null : ts;
  }

  // Numbers
  if (typeof ts === 'number') {
    // if it's clearly seconds (e.g. <= 1e11), treat as seconds
    if (ts < 1e11) return new Date(ts * 1000);
    return new Date(ts);
  }

  // Strings
  if (typeof ts === 'string') {
    const trimmed = ts.trim();

    // Pure digits => interpret as epoch seconds or ms
    if (/^\d+$/.test(trimmed)) {
      // length 10 -> seconds, length 13 -> ms
      if (trimmed.length === 10) return new Date(Number(trimmed) * 1000);
      if (trimmed.length === 13) return new Date(Number(trimmed));
      // fallback heuristic
      const asNum = Number(trimmed);
      if (!Number.isNaN(asNum)) {
        return asNum < 1e11 ? new Date(asNum * 1000) : new Date(asNum);
      }
    }

    // Otherwise try Date parsing (ISO etc.)
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

function formatToIST(date) {
  if (!date) return '-';
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

function StaffHistoryTable({ userId }) {
  const parsedUserId = userId ? Number(userId) : null;

  const { data, loading, error } = useQuery(USER_EVENTS, {
    variables: { userId: parsedUserId },
    skip: !parsedUserId,
  });

  if (error) {
    console.error('Error fetching user events:', error);
  }

  const rawEvents = data?.clockEvents || [];

  // Sort newest first by parsed timestamp
  const sortedData = rawEvents
    .slice()
    .map((ev, idx) => {
      const parsedDate = parseToDate(ev.timestamp);
      if (!parsedDate) {
        // helpful console output for debugging malformed timestamps
        console.warn('Unparseable timestamp for event:', { index: idx, timestamp: ev.timestamp, event: ev });
      }
      return { ...ev, __parsedDate: parsedDate };
    })
    .sort((a, b) => {
      const ta = a.__parsedDate ? a.__parsedDate.getTime() : 0;
      const tb = b.__parsedDate ? b.__parsedDate.getTime() : 0;
      return tb - ta; // newest first
    });

  const columns = [
    { title: 'Type', dataIndex: 'type', key: 'type' },
    { title: 'Note', dataIndex: 'note', key: 'note', render: (t) => t || '-' },
    { title: 'Latitude', dataIndex: 'latitude', key: 'latitude', render: (v) => (v != null ? v : '-') },
    { title: 'Longitude', dataIndex: 'longitude', key: 'longitude', render: (v) => (v != null ? v : '-') },
    {
      title: 'Timestamp (IST)',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (ts, record) => {
        const d = record.__parsedDate ?? parseToDate(ts);
        if (!d) {
          // show raw value if parse failed
          return typeof ts === 'string' && ts.length > 0 ? `Invalid date: ${ts}` : '-';
        }
        return formatToIST(d);
      },
    },
  ];

  return (
    <div style={styles.container}>
      <h3 style={styles.heading}>Clock-In/Out History</h3>
      <Table
        dataSource={sortedData}
        columns={columns}
        loading={loading}
        rowKey={(record, index) => index}
        pagination={{ pageSize: 5 }}
        locale={{ emptyText: 'No clock events found' }}
        bordered={false}
        style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}
        components={{
          header: {
            cell: (props) => (
              <th
                {...props}
                style={{
                  backgroundColor: '#205081',
                  color: 'white',
                  padding: '12px 8px',
                  fontWeight: '700',
                  fontSize: 14,
                  textAlign: 'left',
                }}
              />
            ),
          },
          body: {
            row: (props) => {
              const style = {
                cursor: 'default',
                transition: 'background-color 0.3s ease',
              };
              // Add subtle hover effect
              return (
                <tr
                  {...props}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e6f0ff')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
                  style={style}
                />
              );
            },
            cell: (props) => (
              <td
                {...props}
                style={{
                  padding: '12px 8px',
                  borderBottom: '1px solid #ddd',
                  fontSize: 14,
                  color: '#333',
                }}
              />
            ),
          },
        }}
      />
    </div>
  );
}
const styles = {
  container: {
    background: 'rgba(255, 255, 255, 0.8)',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 10px 30px rgba(32, 80, 129, 0.1)',
    marginTop: '2rem',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  heading: {
    color: '#205081',
    fontWeight: 700,
    marginBottom: '1rem',
    fontSize: '1.5rem',
    textAlign: 'left',
  },
};


export default StaffHistoryTable;
