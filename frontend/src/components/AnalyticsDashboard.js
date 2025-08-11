import React from 'react';
import { Card, Row, Col } from 'antd';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

import { Bar } from 'react-chartjs-2';


ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function AnalyticsDashboard({ data }) {
  const names = data.map((d) => d.name);

  const totalHoursData = {
    labels: names,
    datasets: [
      {
        label: 'Total Hours (Last 7 days)',
        data: data.map((d) => d.totalHoursLastWeek),
        backgroundColor: 'rgba(24, 144, 255, 0.6)',
      }
    ]
  };

  const avgHoursData = {
    labels: names,
    datasets: [
      {
        label: 'Average Daily Hours',
        data: data.map((d) => d.avgDailyHours),
        backgroundColor: 'rgba(82, 196, 26, 0.6)',
      }
    ]
  };

  const daysPresentData = {
    labels: names,
    datasets: [
      {
        label: 'Days Present',
        data: data.map((d) => d.daysPresent),
        backgroundColor: 'rgba(250, 173, 20, 0.6)',
      }
    ]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top'
      }
    }
  };

  return (
    <Row gutter={[24, 24]}>
      <Col span={24}>
        <Card title="Total Hours (Last 7 Days)">
          <Bar data={totalHoursData} options={options} />
        </Card>
      </Col>
      <Col span={12}>
        <Card title="Average Daily Hours">
          <Bar data={avgHoursData} options={options} />
        </Card>
      </Col>
      <Col span={12}>
        <Card title="Days Present">
          <Bar data={daysPresentData} options={options} />
        </Card>
      </Col>
    </Row>
  );
}

export default AnalyticsDashboard;
