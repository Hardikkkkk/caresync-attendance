import React from 'react';
import { Box, Card, Heading } from 'grommet';
import { LoginOutlined, LogoutOutlined } from '@ant-design/icons';
import ClockForm from './ClockForm';

function ShiftCards({ handleClockIn, handleClockOut, clockedIn }) {
  return (
    <Card
      pad="medium"
      background="#ffffff"
      round="medium"
      elevation="medium"
      style={{
        maxWidth: '1000px',
        margin: 'auto',
        border: '1px solid #f0f0f0',
        boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
      }}
    >
      <Box direction="row" gap="medium" wrap>
        {/* Start Shift */}
        <Box
          flex
          background="#e6f7ff"
          pad="medium"
          round="small"
          elevation="small"
        >
          <Box direction="row" align="center" gap="small" margin={{ bottom: 'small' }}>
            <LoginOutlined style={{ fontSize: 24, color: '#1890ff' }} />
            <Heading level={3} margin="none" color="#1890ff">
              Start Shift
            </Heading>
          </Box>
          <ClockForm
            onClock={handleClockIn}
            isClockingIn={true}
            clockedIn={clockedIn}
          />
        </Box>

        {/* End Shift */}
        <Box
          flex
          background="#fff1f0"
          pad="medium"
          round="small"
          elevation="small"
        >
          <Box direction="row" align="center" gap="small" margin={{ bottom: 'small' }}>
            <LogoutOutlined style={{ fontSize: 24, color: '#ff4d4f' }} />
            <Heading level={3} margin="none" color="#ff4d4f">
              End Shift
            </Heading>
          </Box>
          <ClockForm
            onClock={handleClockOut}
            isClockingIn={false}
            clockedIn={clockedIn}
          />
        </Box>
      </Box>
    </Card>
  );
}

export default ShiftCards;
