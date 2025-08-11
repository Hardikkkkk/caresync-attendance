import React, { useState } from 'react';
import { Button, Input, message, Card } from 'antd';
import {
  ClockCircleOutlined,
  EnvironmentOutlined,
  EditOutlined,
  CheckCircleOutlined,
  StopOutlined
} from '@ant-design/icons';

function ClockForm({ onClock, isClockingIn, clockedIn }) {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClock = async () => {
    if (!navigator.geolocation) {
      message.error('Geolocation is not supported by your browser');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;

        const hospitalLat = 18.5204;
        const hospitalLong = 73.8567;
        const dist = distance(latitude, longitude, hospitalLat, hospitalLong);

        if (dist > 300) {
          message.error('You are outside the allowed perimeter to clock in/out.');
          setLoading(false);
          return;
        }

        try {
          await onClock({ latitude, longitude, note });
          message.success(`${isClockingIn ? 'Clocked in' : 'Clocked out'} successfully!`);
        } catch (err) {
          console.error('Clock error:', err);
          message.error('Something went wrong.');
        }

        setLoading(false);
        setNote('');
      },
      () => {
        message.error('Unable to retrieve your location');
        setLoading(false);
      }
    );
  };

  const distance = (lat1, lon1, lat2, lon2) => {
    const toRad = (value) => (value * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const isDisabled = (isClockingIn && clockedIn) || (!isClockingIn && !clockedIn);

  return (
    <>
      <style jsx>{`
        .healthcare-clock-form {
          border: none !important;
          background: transparent !important;
          box-shadow: none !important;
        }
        
        .clock-form-content {
          display: flex;
          flex-direction: column;
          gap: 20px;
          height: 100%;
        }
        
        .location-info {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: rgba(0, 102, 204, 0.08);
          border-radius: 10px;
          border: 1px solid rgba(0, 102, 204, 0.15);
          margin-bottom: 8px;
        }
        
        .location-icon {
          color: #0066cc;
          font-size: 16px;
        }
        
        .location-text {
          color: #0066cc;
          font-size: 13px;
          font-weight: 500;
        }
        
        .note-section {
          position: relative;
        }
        
        .note-label {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
          color: #2c3e50;
          font-weight: 600;
          font-size: 14px;
        }
        
        .healthcare-textarea {
          border-radius: 12px !important;
          border: 2px solid #e8f4fd !important;
          background: #fafcff !important;
          transition: all 0.3s ease !important;
          font-size: 14px !important;
          line-height: 1.5 !important;
        }
        
        .healthcare-textarea:focus {
          border-color: #0066cc !important;
          box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1) !important;
          background: white !important;
        }
        
        .healthcare-textarea:hover {
          border-color: #4dabf7 !important;
          background: white !important;
        }
        
        .clock-button-container {
          margin-top: auto;
          padding-top: 10px;
        }
        
        .clock-in-button {
          background: linear-gradient(135deg, #28a745 0%, #34ce57 100%) !important;
          border: none !important;
          border-radius: 12px !important;
          height: 50px !important;
          font-size: 16px !important;
          font-weight: 700 !important;
          box-shadow: 0 4px 20px rgba(40, 167, 69, 0.3) !important;
          transition: all 0.3s ease !important;
          letter-spacing: 0.5px !important;
        }
        
        .clock-in-button:hover:not(:disabled) {
          transform: translateY(-2px) !important;
          box-shadow: 0 6px 25px rgba(40, 167, 69, 0.4) !important;
          background: linear-gradient(135deg, #34ce57 0%, #28a745 100%) !important;
        }
        
        .clock-out-button {
          background: linear-gradient(135deg, #dc3545 0%, #e74c3c 100%) !important;
          border: none !important;
          border-radius: 12px !important;
          height: 50px !important;
          font-size: 16px !important;
          font-weight: 700 !important;
          box-shadow: 0 4px 20px rgba(220, 53, 69, 0.3) !important;
          transition: all 0.3s ease !important;
          letter-spacing: 0.5px !important;
        }
        
        .clock-out-button:hover:not(:disabled) {
          transform: translateY(-2px) !important;
          box-shadow: 0 6px 25px rgba(220, 53, 69, 0.4) !important;
          background: linear-gradient(135deg, #e74c3c 0%, #dc3545 100%) !important;
        }
        
        .disabled-button {
          background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%) !important;
          opacity: 0.7 !important;
          cursor: not-allowed !important;
          transform: none !important;
          box-shadow: 0 2px 10px rgba(108, 117, 125, 0.2) !important;
        }
        
        .disabled-button:hover {
          transform: none !important;
          box-shadow: 0 2px 10px rgba(108, 117, 125, 0.2) !important;
        }
        
        .button-icon {
          margin-right: 8px;
          font-size: 18px;
        }
        
        .loading-button {
          background: linear-gradient(135deg, #4dabf7 0%, #228be6 100%) !important;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        
        .loading-text {
          animation: pulse 1.5s infinite;
        }
        
        .status-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border-radius: 8px;
          margin-bottom: 12px;
          font-size: 13px;
          font-weight: 600;
        }
        
        .status-ready {
          background: rgba(40, 167, 69, 0.1);
          color: #28a745;
          border: 1px solid rgba(40, 167, 69, 0.2);
        }
        
        .status-unavailable {
          background: rgba(108, 117, 125, 0.1);
          color: #6c757d;
          border: 1px solid rgba(108, 117, 125, 0.2);
        }
        
        @media (max-width: 768px) {
          .clock-form-content {
            gap: 16px;
          }
          
          .clock-in-button, .clock-out-button {
            height: 48px !important;
            font-size: 15px !important;
          }
        }
      `}</style>
      
<div className="healthcare-clock-form">
  <div className="clock-form-content">
    {/* Location Verification Info */}
    <div className="location-info">
      <EnvironmentOutlined className="location-icon" />
      <span className="location-text">
        Location verification enabled - Must be within hospital perimeter
      </span>
    </div>

    {/* Status Indicator */}
    <div
      className={`status-indicator ${
        clockedIn
          ? isClockingIn
            ? 'status-unavailable'
            : 'status-ready'
          : isClockingIn
          ? 'status-ready'
          : 'status-unavailable'
      }`}
    >
      {clockedIn ? (
        isClockingIn ? (
          <>
            <StopOutlined />
            Already clocked in
          </>
        ) : (
          <>
            <CheckCircleOutlined />
            Ready to end shift
          </>
        )
      ) : isClockingIn ? (
        <>
          <CheckCircleOutlined />
          Ready to start shift
        </>
      ) : (
        <>
          <StopOutlined />
          Not clocked in yet
        </>
      )}
    </div>

    {/* Note Section */}
    <div className="note-section">
      <div className="note-label">
        <EditOutlined />
        Shift Notes (Optional)
      </div>
      <Input.TextArea
        className="healthcare-textarea"
        rows={3}
        placeholder={`Add any important notes about your ${
          isClockingIn ? 'shift start' : 'shift completion'
        }...`}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={250}
        showCount
        disabled={
          loading || (isClockingIn ? clockedIn : !clockedIn)
        }
      />
    </div>

    {/* Clock Button */}
    <div className="clock-button-container">
      <Button
        className={`
          ${isClockingIn ? 'clock-in-button' : 'clock-out-button'}
          ${(isClockingIn ? clockedIn : !clockedIn) ? 'disabled-button' : ''}
          ${loading ? 'loading-button' : ''}
        `}
        onClick={handleClock}
        loading={loading}
        disabled={
          loading || (isClockingIn ? clockedIn : !clockedIn)
        }
        block
        size="large"
      >
        {loading ? (
          <span className="loading-text">
            <ClockCircleOutlined className="button-icon" />
            Verifying Location...
          </span>
        ) : (
          <>
            {isClockingIn ? (
              <CheckCircleOutlined className="button-icon" />
            ) : (
              <StopOutlined className="button-icon" />
            )}
            {isClockingIn
              ? 'Start Healthcare Shift'
              : 'Complete Healthcare Shift'}
          </>
        )}
      </Button>
    </div>

    {/* Additional Info */}
    <div
      style={{
        fontSize: '12px',
        color: '#6c757d',
        textAlign: 'center',
        marginTop: '8px',
        lineHeight: '1.4'
      }}
    >
      <ClockCircleOutlined style={{ marginRight: '4px' }} />
      Automated GPS verification ensures secure attendance tracking
    </div>
  </div>
</div>

    </>
  );
}

export default ClockForm;