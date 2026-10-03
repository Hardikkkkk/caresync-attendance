import React from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const TEAL = '#1c7c7d';
const AMBER = '#e8a33d';
const INK = '#12303a';

const options = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { backgroundColor: INK, padding: 10, cornerRadius: 8 } },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#4f6770', font: { family: 'Figtree, sans-serif' } } },
    y: { beginAtZero: true, grid: { color: '#e4ece9' }, border: { display: false }, ticks: { color: '#4f6770' } },
  },
  animation: { duration: 900, easing: 'easeOutCubic' },
};

function Chart({ title, labels, values, color, wide }) {
  return (
    <div className={`md-chart${wide ? ' is-wide' : ''}`}>
      <h3>{title}</h3>
      <div className="md-chart-box">
        <Bar
          options={options}
          data={{ labels, datasets: [{ data: values, backgroundColor: color, borderRadius: 8, maxBarThickness: 44 }] }}
        />
      </div>
    </div>
  );
}

function AnalyticsDashboard({ data = [] }) {
  if (!data.length) return <div className="md-empty">No attendance data for the last 7 days yet.</div>;
  const names = data.map((d) => d.name);
  return (
    <div className="md-charts">
      <Chart wide title="Total hours (last 7 days)" labels={names} values={data.map((d) => d.totalHoursLastWeek)} color={TEAL} />
      <Chart title="Average daily hours" labels={names} values={data.map((d) => d.avgDailyHours)} color={AMBER} />
      <Chart title="Days present" labels={names} values={data.map((d) => d.daysPresent)} color={INK} />
    </div>
  );
}

export default AnalyticsDashboard;