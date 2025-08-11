import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Card,
  ResponsiveContext,
  Text,
  Avatar,
  Grid
} from 'grommet';
import { useMutation, useQuery } from '@apollo/client';
import { useAuth0 } from '@auth0/auth0-react';
import { message, Tag } from 'antd';
import {
  UserOutlined,
  HeartOutlined,
  ClockCircleOutlined,
  MedicineBoxOutlined,
  PlusCircleOutlined
} from '@ant-design/icons';
import { CLOCK_IN, CLOCK_OUT, GET_USER_BY_EMAIL } from '../graphql/queries';
import { USER_EVENTS } from '../graphql/managerQueries';
import ClockForm from '../components/ClockForm';
import StaffHistoryTable from '../components/StaffHistoryTable';

// Healthcare-themed navbar component
const CareNavbar = () => (
  <div style={{
    background: 'linear-gradient(135deg, #0066cc 0%, #004499 100%)',
    padding: '1rem 2rem',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    position: 'sticky',
    top: 0,
    zIndex: 1000
  }}>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      maxWidth: '1200px',
      margin: '0 auto'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          background: 'white',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'pulse 2s infinite'
        }}>
          <HeartOutlined style={{ color: '#0066cc', fontSize: '20px' }} />
        </div>
        <h1 style={{
          color: 'white',
          margin: 0,
          fontSize: '28px',
          fontWeight: '700',
          letterSpacing: '-0.5px'
        }}>
          CareSync
        </h1>
      </div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        color: 'white'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MedicineBoxOutlined style={{ fontSize: '16px' }} />
          <span style={{ fontSize: '14px', fontWeight: '500' }}>Healthcare Dashboard</span>
        </div>
      </div>
    </div>
  </div>
);

// Floating healthcare icons animation
const FloatingIcons = () => (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    zIndex: -1,
    overflow: 'hidden'
  }}>
    {[...Array(6)].map((_, i) => (
      <div
        key={i}
        style={{
          position: 'absolute',
          color: 'rgba(0, 102, 204, 0.08)',
          fontSize: '60px',
          animation: `float ${15 + i * 2}s infinite linear`,
          animationDelay: `${i * 3}s`,
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`
        }}
      >
        {i % 3 === 0 ? <HeartOutlined /> : i % 3 === 1 ? <PlusCircleOutlined /> : <MedicineBoxOutlined />}
      </div>
    ))}
  </div>
);

function Careworker() {
  const { user: auth0User, isAuthenticated } = useAuth0();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [shiftProgress, setShiftProgress] = useState(0);
  const [clockedIn, setClockedIn] = useState(false);
  const [currentShiftId, setCurrentShiftId] = useState(null);
  const [loadingClock, setLoadingClock] = useState(false);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      const now = new Date();
      const startHour = 8;
      const endHour = 20;
      const currentHour = now.getHours() + now.getMinutes() / 60;
      const progress = Math.max(
        0,
        Math.min(100, ((currentHour - startHour) / (endHour - startHour)) * 100)
      );
      setShiftProgress(progress);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Get logged-in user from DB
  const { data, loading, error } = useQuery(GET_USER_BY_EMAIL, {
    variables: { email: auth0User?.email },
    skip: !auth0User?.email,
    errorPolicy: 'all' // Handle partial errors gracefully
  });

  const [clockIn] = useMutation(CLOCK_IN, {
    errorPolicy: 'all',
    onError: (error) => {
      console.error("Clock-in mutation error:", error);
      message.error(`Clock in failed: ${error.message}`);
      setLoadingClock(false);
    }
  });

  const [clockOut] = useMutation(CLOCK_OUT, {
    errorPolicy: 'all',
    onError: (error) => {
      console.error("Clock-out mutation error:", error);
      message.error(`Clock out failed: ${error.message}`);
      setLoadingClock(false);
    }
  });

  const user = data?.getUserByEmail;
  const userId = user?.id ? parseInt(user.id) : null;

  // Fetch active shift on login
  const { data: eventsData, refetch: refetchEvents } = useQuery(USER_EVENTS, {
    variables: { userId },
    skip: !userId,
    fetchPolicy: "network-only",
    errorPolicy: 'all',
    onCompleted: (data) => {
      console.log("Events data received:", data);
      if (data?.userEvents?.length > 0) {
        const latestEvent = data.userEvents[0];
        console.log("Latest event:", latestEvent);
        if (latestEvent.type === "CLOCK_IN" && !latestEvent.clockOutTime) {
          setClockedIn(true);
          setCurrentShiftId(latestEvent.id);
        } else {
          setClockedIn(false);
          setCurrentShiftId(null);
        }
      } else {
        setClockedIn(false);
        setCurrentShiftId(null);
      }
    },
    onError: (error) => {
      console.error("Error fetching events:", error);
    }
  });

  // Run refetch when userId changes (e.g., after login)
  useEffect(() => {
    if (userId) {
      console.log("Refetching events for userId:", userId);
      refetchEvents();
    }
  }, [userId, refetchEvents]);

  // Handle Clock In with proper error handling and loading state
  const handleClockIn = async ({ latitude, longitude, note }) => {
    console.log("Handle Clock In called with:", { latitude, longitude, note, userId });
    
    if (!userId) {
      message.error("User ID not loaded yet. Please wait a moment.");
      return;
    }
    
    if (clockedIn) {
      message.warning("You're already clocked in!");
      return;
    }

    setLoadingClock(true);
    
    try {
      console.log("Attempting to clock in with mutation...");
      const result = await clockIn({
        variables: {
          userId: parseInt(userId), // Ensure it's an integer
          latitude: latitude ?? null,
          longitude: longitude ?? null,
          note: note ?? ""
        }
      });
      
      console.log("Clock in result:", result);
      
      // Update local state immediately
      setClockedIn(true);
      if (result.data?.clockIn?.id) {
        setCurrentShiftId(result.data.clockIn.id);
      }
      
      // Refresh events data
      await refetchEvents();
      
      message.success("Successfully clocked in!");
    } catch (e) {
      console.error("Clock-in error:", e);
      // More detailed error message
      const errorMessage = e.graphQLErrors?.[0]?.message || e.message || "Unknown error occurred";
      message.error(`Clock in failed: ${errorMessage}`);
    } finally {
      setLoadingClock(false);
    }
  };

  // Handle Clock Out with proper error handling and loading state
  const handleClockOut = async ({ latitude, longitude, note }) => {
    console.log("Handle Clock Out called with:", { latitude, longitude, note, userId });
    
    if (!userId) {
      message.error("User ID not loaded yet. Please wait a moment.");
      return;
    }
    
    if (!clockedIn) {
      message.warning("You're not currently clocked in!");
      return;
    }

    setLoadingClock(true);
    
    try {
      console.log("Attempting to clock out with mutation...");
      const result = await clockOut({
        variables: {
          userId: parseInt(userId), // Ensure it's an integer
          latitude: latitude ?? null,
          longitude: longitude ?? null,
          note: note ?? ""
        }
      });
      
      console.log("Clock out result:", result);
      
      // Update local state immediately
      setClockedIn(false);
      setCurrentShiftId(null);
      
      // Refresh events data
      await refetchEvents();
      
      message.success("Shift completed successfully!");
    } catch (e) {
      console.error("Clock-out error:", e);
      // More detailed error message
      const errorMessage = e.graphQLErrors?.[0]?.message || e.message || "Unknown error occurred";
      message.error(`Clock out failed: ${errorMessage}`);
    } finally {
      setLoadingClock(false);
    }
  };

  if (!isAuthenticated) return <div>Please log in</div>;
  if (loading) return <div>Loading user data...</div>;
  if (error) {
    console.error("User query error:", error);
    return <div>Error loading user data: {error.message}</div>;
  }

  return (
    <>
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        
        @keyframes float {
          from { transform: translate(0, 100vh) rotate(0deg); }
          to { transform: translate(0, -100px) rotate(360deg); }
        }
        
        @keyframes slideInUp {
          from { 
            opacity: 0; 
            transform: translateY(30px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
        
        .healthcare-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0, 102, 204, 0.12);
          border: 1px solid rgba(0, 102, 204, 0.1);
          transition: all 0.3s ease;
          animation: slideInUp 0.6s ease-out;
        }
        
        .healthcare-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 48px rgba(0, 102, 204, 0.2);
        }
        
        .clock-in-card {
          background: linear-gradient(135deg, #e8f5e8 0%, #f0fff0 100%);
          border-left: 4px solid #28a745;
        }
        
        .clock-out-card {
          background: linear-gradient(135deg, #ffeaea 0%, #fff5f5 100%);
          border-left: 4px solid #dc3545;
        }
        
        .status-badge-active {
          background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(40, 167, 69, 0.3);
        }
        
        .status-badge-inactive {
          background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(108, 117, 125, 0.3);
        }
        
        .time-display {
          background: linear-gradient(135deg, #0066cc 0%, #004499 100%);
          color: white;
          padding: 16px;
          border-radius: 12px;
          text-align: center;
          box-shadow: 0 4px 16px rgba(0, 102, 204, 0.2);
        }
        
        .user-avatar {
          background: linear-gradient(135deg, #0066cc 0%, #004499 100%);
          border: 3px solid white;
          box-shadow: 0 4px 16px rgba(0, 102, 204, 0.3);
        }
        
        .main-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fbff 0%, #e3f2fd 100%);
          position: relative;
        }
        
        .content-wrapper {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }
        
        @media (max-width: 768px) {
          .content-wrapper {
            padding: 1rem;
          }
          
          .healthcare-card {
            margin-bottom: 1rem;
          }
        }
      `}</style>
      
      <div className="main-container">
        <CareNavbar />
        <FloatingIcons />

        <ResponsiveContext.Consumer>
          {size => (
            <div className="content-wrapper">


              {/* Header Card */}
              <div className="healthcare-card" style={{ marginBottom: '2rem', padding: '2rem' }}>
                <Grid columns={size === 'small' ? ['1fr'] : ['2fr', '1fr']} gap="medium" align="center">
                  <Box direction="row" gap="medium" align="center">
                    <div className="user-avatar" style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '32px',
                      color: 'white'
                    }}>
                      <UserOutlined />
                    </div>
                    <Box>
                      <Text size="xlarge" weight="bold" style={{ color: '#2c3e50', marginBottom: '4px' }}>
                        {auth0User?.name}
                      </Text>
                      <Text size="medium" style={{ color: '#6c757d', marginBottom: '8px' }}>
                        {user?.role === 'manager' ? 'Manager' : 'Careworker'} ID: {String(userId).padStart(6, '0')}
                      </Text>
                      <div className={clockedIn ? 'status-badge-active' : 'status-badge-inactive'}>
                        <ClockCircleOutlined style={{ marginRight: '6px' }} />
                        {clockedIn ? 'Currently Clocked In' : 'Not Clocked In'}
                      </div>
                    </Box>
                  </Box>
                  <Box align={size === 'small' ? 'start' : 'end'} style={{ marginTop: size === 'small' ? '1rem' : '0' }}>
                    <div className="time-display">
                      <Text size="large" weight="bold" style={{ display: 'block', marginBottom: '4px' }}>
                        {currentTime.toLocaleTimeString()}
                      </Text>
                      <Text size="medium">
                        {currentTime.toLocaleDateString()}
                      </Text>
                    </div>
                  </Box>
                </Grid>
              </div>

              {/* Clock In / Clock Out Cards */}
              <Box direction={size === 'small' ? 'column' : 'row'} gap="large" style={{ marginBottom: '3rem' }}>
                {/* Clock In Card */}
                <div className="healthcare-card clock-in-card" style={{ flex: 1, padding: '2rem' }}>
                  <Box align="center" style={{ marginBottom: '1.5rem' }}>
                    <div style={{
                      width: '60px',
                      height: '60px',
                      background: '#28a745',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '1rem',
                      boxShadow: '0 4px 16px rgba(40, 167, 69, 0.3)'
                    }}>
                      <ClockCircleOutlined style={{ color: 'white', fontSize: '24px' }} />
                    </div>
                    <Heading level={3} margin="none" style={{ color: '#28a745', textAlign: 'center' }}>
                      Start Your Shift
                    </Heading>
                    <Text size="small" style={{ color: '#6c757d', textAlign: 'center', marginTop: '0.5rem' }}>
                      Begin caring for patients
                    </Text>
                  </Box>
                  <ClockForm
                    onClock={handleClockIn}
                    isClockingIn={true}
                    clockedIn={clockedIn}
                    disabled={clockedIn || loadingClock}
                    loading={loadingClock}
                  />
                </div>

                {/* Clock Out Card */}
                <div className="healthcare-card clock-out-card" style={{ flex: 1, padding: '2rem' }}>
                  <Box align="center" style={{ marginBottom: '1.5rem' }}>
                    <div style={{
                      width: '60px',
                      height: '60px',
                      background: '#dc3545',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '1rem',
                      boxShadow: '0 4px 16px rgba(220, 53, 69, 0.3)'
                    }}>
                      <ClockCircleOutlined style={{ color: 'white', fontSize: '24px' }} />
                    </div>
                    <Heading level={3} margin="none" style={{ color: '#dc3545', textAlign: 'center' }}>
                      End Your Shift
                    </Heading>
                    <Text size="small" style={{ color: '#6c757d', textAlign: 'center', marginTop: '0.5rem' }}>
                      Complete your day safely
                    </Text>
                  </Box>
                  <ClockForm
                    onClock={handleClockOut}
                    isClockingIn={false}
                    clockedIn={clockedIn}
                    disabled={!clockedIn || loadingClock}
                    loading={loadingClock}
                  />
                </div>
              </Box>

              {/* History Section */}
              <div className="healthcare-card" style={{ padding: '2rem' }}>
                <Box direction="row" align="center" gap="medium" style={{ marginBottom: '1.5rem' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    background: 'linear-gradient(135deg, #0066cc 0%, #004499 100%)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <MedicineBoxOutlined style={{ color: 'white', fontSize: '20px' }} />
                  </div>
                  <Box>
                    <Heading level={4} margin="none" style={{ color: '#2c3e50' }}>
                      My Clock-In/Out History
                    </Heading>
                    <Text size="small" style={{ color: '#6c757d' }}>
                      Track your healthcare shifts and attendance
                    </Text>
                  </Box>
                </Box>
                <StaffHistoryTable userId={userId} />
              </div>
            </div>
          )}
        </ResponsiveContext.Consumer>
      </div>
    </>
  );
}

export default Careworker;