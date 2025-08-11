import React, { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { CURRENTLY_CLOCKED_IN, ALL_USERS, STAFF_STATS, TODAY_CLOCK_INS } from '../graphql/managerQueries';
import { Box, Heading, Text, Spinner } from 'grommet';
import { Select, Modal, Button } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  BarChartOutlined,
  ClockCircleOutlined,
  SettingOutlined,
  EnvironmentOutlined,
  UserOutlined,
  HeartOutlined
} from '@ant-design/icons';

import ClockedInTable from '../components/ClockedInTable';
import StaffHistoryTable from '../components/StaffHistoryTable';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import { GET_USER_BY_EMAIL } from '../graphql/queries';
import { useAuth0 } from '@auth0/auth0-react';
import GeoSettings from '../components/GeoSettings';

// Healthcare Navbar for Manager
const ManagerNavbar = () => (
  <div style={{
    background: 'linear-gradient(135deg, #0066cc 0%, #004499 100%)',
    padding: '1rem 2rem',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    marginBottom: '2rem'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{
        width: '40px', height: '40px', background: 'white', borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'pulse 2s infinite'
      }}>
        <HeartOutlined style={{ color: '#0066cc', fontSize: '20px' }} />
      </div>
      <h1 style={{ color: 'white', margin: 0, fontSize: '28px', fontWeight: '700' }}>
        CareSync Manager
      </h1>
      <DashboardOutlined style={{ color: 'white', fontSize: '24px', marginLeft: '12px' }} />
    </div>
  </div>
);

// Section Card Component
const SectionCard = ({ icon, title, subtitle, children, color = '#0066cc' }) => (
  <div style={{
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0, 102, 204, 0.12)',
    border: '1px solid rgba(0, 102, 204, 0.1)',
    marginBottom: '2rem',
    overflow: 'hidden'
  }}>
    <div style={{
      background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
      padding: '1.5rem',
      color: 'white'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ fontSize: '24px' }}>{icon}</div>
        <div>
          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>{title}</h3>
          {subtitle && <p style={{ margin: 0, opacity: 0.9, fontSize: '14px' }}>{subtitle}</p>}
        </div>
      </div>
    </div>
    <div style={{ padding: '1.5rem' }}>{children}</div>
  </div>
);

function ManagerDashboard() {
  const { user: auth0User, isAuthenticated } = useAuth0();
  const { data: userData, loading: userLoading, error: userError } = useQuery(GET_USER_BY_EMAIL, {
    variables: { email: auth0User?.email },
    skip: !auth0User?.email
  });
  const { data: clockedInData } = useQuery(CURRENTLY_CLOCKED_IN);
  const { data: usersData } = useQuery(ALL_USERS);
  const { data: statsData } = useQuery(STAFF_STATS);
  const { data: todayData, loading: todayLoading } = useQuery(TODAY_CLOCK_INS);

  const todayCount = todayData?.todayClockIns?.length || 0;

  const [selectedUser, setSelectedUser] = useState(null);
  const [modalUser, setModalUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);





  const loggedInUser = userData?.getUserByEmail;

  const openModal = (userId) => {
    setModalUser(parseInt(userId));
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalUser(null);
  };

  if (!isAuthenticated) return <Box pad="large"><Heading>Please log in first</Heading></Box>;
  if (userLoading) return <Spinner />;
  if (userError) return <Text>Error: {userError.message}</Text>;
  if (!loggedInUser) return <Text>No user record found</Text>;
  if (loggedInUser.role.toLowerCase() !== 'manager') return <Text>Access denied</Text>;

  return (
    <>
      <style jsx>{`
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
        .main-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fbff 0%, #e3f2fd 100%);
        }
        .content-wrapper { max-width: 1200px; margin: 0 auto; padding: 0 2rem 2rem; }
        .healthcare-select {
          border-radius: 8px !important;
          border: 2px solid #e8f4fd !important;
        }
        .healthcare-select:hover { border-color: #4dabf7 !important; }
        .healthcare-button {
          background: linear-gradient(135deg, #0066cc 0%, #004499 100%) !important;
          border: none !important;
          border-radius: 8px !important;
          font-weight: 600 !important;
        }
        @media (max-width: 768px) { .content-wrapper { padding: 0 1rem 2rem; } }
      `}</style>

      <div className="main-container">
        <ManagerNavbar />
        <div className="content-wrapper">

         {/* New Stat Card */}
          <SectionCard
            icon={<BarChartOutlined />}
            title="Today's Clock-Ins"
            subtitle="Summary of all staff who clocked in today"
            color="#ff5722"
          >
            {todayLoading ? (
              <Spinner />
            ) : (
              <>
                <div style={{
                  fontSize: '48px',
                  fontWeight: 'bold',
                  color: '#ff5722',
                  marginBottom: '1rem'
                }}>
                  {todayCount}
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#ffe9e0' }}>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Name</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Clock In</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Clock Out</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Coordinates</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayData?.todayClockIns?.map((entry, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '8px' }}>{entry.user.name}</td>
                        <td style={{ padding: '8px' }}>
                          {entry.clockInTime ? new Date(entry.clockInTime).toLocaleTimeString() : '—'}
                        </td>
                        <td style={{ padding: '8px' }}>
                          {entry.clockOutTime ? new Date(entry.clockOutTime).toLocaleTimeString() : '—'}
                        </td>
                        <td style={{ padding: '8px' }}>
                          {entry.latitude.toFixed(5)}, {entry.longitude.toFixed(5)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </SectionCard>

          <SectionCard
            icon={<TeamOutlined />}
            title="Currently Clocked-In Staff"
            subtitle="Real-time monitoring of active healthcare workers"
            color="#28a745"
          >
            <ClockedInTable
              data={clockedInData?.currentlyClockedIn || []}
              onViewHistory={openModal}
            />
          </SectionCard>

          <SectionCard
            icon={<BarChartOutlined />}
            title="Staff Analytics"
            subtitle="Performance insights and shift patterns"
            color="#17a2b8"
          >
            <AnalyticsDashboard data={statsData?.staffClockStats || []} />
          </SectionCard>

          <SectionCard
            icon={<ClockCircleOutlined />}
            title="Staff History"
            subtitle="View detailed clock-in/out records"
            color="#6f42c1"
          >
            <Select
              className="healthcare-select"
              style={{ width: '100%', maxWidth: 300, marginBottom: '1rem' }}
              placeholder="Select a healthcare worker"
              onChange={(value) => setSelectedUser(parseInt(value))}
              options={usersData?.users.map((u) => ({
                label: u.name,
                value: u.id
              })) || []}
            />
            {selectedUser && <StaffHistoryTable userId={selectedUser} />}
          </SectionCard>


          <SectionCard
            icon={<EnvironmentOutlined />}
            title="Location Settings"
            subtitle="Configure geofencing and location parameters"
            color="#6c757d"
          >
            <GeoSettings />
          </SectionCard>

          <Modal
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0066cc' }}>
                <ClockCircleOutlined />
                Staff Clock History
              </div>
            }
            open={isModalOpen}
            onCancel={closeModal}
            footer={
              <Button className="healthcare-button" onClick={closeModal}>
                Close
              </Button>
            }
            width={800}
          >
            {modalUser && <StaffHistoryTable userId={modalUser} />}
          </Modal>
        </div>
      </div>
    </>
  );
}

export default ManagerDashboard;