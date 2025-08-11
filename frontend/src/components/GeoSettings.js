import React, { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Box, Heading } from 'grommet';
import { InputNumber, Button, message, Card, Divider, Alert, Spin } from 'antd';
import { EnvironmentOutlined, SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import { GET_SETTING, UPDATE_SETTING } from '../graphql/managerQueries';

function GeoSettings() {
  const [latitude, setLatitude] = useState(18.5204);
  const [longitude, setLongitude] = useState(73.8567);
  const [radius, setRadius] = useState(2);
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalData, setOriginalData] = useState(null);

  // Query to get current settings
  const { data, loading: queryLoading, error: queryError, refetch } = useQuery(GET_SETTING, {
    variables: { name: 'geo_perimeter' },
    errorPolicy: 'all',
    fetchPolicy: 'cache-and-network',
    onCompleted: (data) => {
      console.log('Settings query completed:', data);
    },
    onError: (error) => {
      console.error('Settings query error:', error);
    }
  });

  // Mutation to update settings
  const [updateSetting] = useMutation(UPDATE_SETTING, {
    errorPolicy: 'all',
    onCompleted: (data) => {
      console.log('Update mutation completed:', data);
    },
    onError: (error) => {
      console.error('Update mutation error:', error);
    }
  });

  // Load settings when data is available
  useEffect(() => {
    console.log('Data received:', data);
    
    if (data?.getSetting?.value) {
      try {
        const parsedValue = JSON.parse(data.getSetting.value);
        console.log('Parsed setting value:', parsedValue);
        
        // Handle different possible data structures
        const lat = parsedValue.lat || parsedValue.latitude || 18.5204;
        const lng = parsedValue.lng || parsedValue.longitude || 73.8567;
        const rad = parsedValue.radius || 2;
        
        setLatitude(lat);
        setLongitude(lng);
        setRadius(rad);
        
        // Store original data for comparison
        setOriginalData({ lat, lng, radius: rad });
        setHasChanges(false);
        
        console.log('Settings loaded:', { lat, lng, radius: rad });
      } catch (parseError) {
        console.error('Error parsing settings value:', parseError);
        console.log('Raw value:', data.getSetting.value);
        message.error('Error parsing saved settings. Using defaults.');
      }
    } else if (data?.getSetting === null) {
      console.log('No settings found, using defaults');
      // Settings don't exist yet, use defaults
      const defaultData = { lat: latitude, lng: longitude, radius };
      setOriginalData(defaultData);
    }
  }, [data]);

  // Track changes
  useEffect(() => {
    if (originalData) {
      const currentData = { lat: latitude, lng: longitude, radius };
      const changed = JSON.stringify(currentData) !== JSON.stringify(originalData);
      setHasChanges(changed);
      console.log('Changes detected:', changed, { original: originalData, current: currentData });
    }
  }, [latitude, longitude, radius, originalData]);

  const handleSubmit = async () => {
    console.log('=== SUBMITTING GEO SETTINGS ===');
    console.log('Current values:', { latitude, longitude, radius });
    
    // Validation
    if (!latitude || !longitude || !radius) {
      message.error('Please fill in all fields');
      return;
    }
    
    if (radius <= 0) {
      message.error('Radius must be greater than 0');
      return;
    }
    
    if (latitude < -90 || latitude > 90) {
      message.error('Latitude must be between -90 and 90');
      return;
    }
    
    if (longitude < -180 || longitude > 180) {
      message.error('Longitude must be between -180 and 180');
      return;
    }

    setLoading(true);
    
    try {
      const settingValue = {
        lat: parseFloat(latitude),
        lng: parseFloat(longitude),
        radius: parseFloat(radius)
      };
      
      const valueString = JSON.stringify(settingValue);
      console.log('Sending mutation with value:', valueString);
      
      const result = await updateSetting({
        variables: {
          name: 'geo_perimeter',
          value: valueString,
        },
        // Optionally refetch the query after update
        refetchQueries: [{ query: GET_SETTING, variables: { name: 'geo_perimeter' } }]
      });
      
      console.log('Mutation result:', result);
      
      if (result.data?.updateSetting) {
        message.success('Perimeter updated successfully!');
        setOriginalData(settingValue);
        setHasChanges(false);
        
        // Also refetch to ensure we have the latest data
        await refetch();
      } else {
        throw new Error('No data returned from updateSetting mutation');
      }
      
    } catch (error) {
      console.error('Error updating settings:', error);
      
      let errorMessage = 'Failed to update perimeter: ';
      
      if (error.graphQLErrors && error.graphQLErrors.length > 0) {
        errorMessage += error.graphQLErrors[0].message;
      } else if (error.networkError) {
        errorMessage += 'Network error. Please check your connection.';
      } else if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Unknown error occurred';
      }
      
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (originalData) {
      setLatitude(originalData.lat);
      setLongitude(originalData.lng);
      setRadius(originalData.radius);
      message.info('Values reset to saved settings');
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      message.error('Geolocation is not supported by your browser');
      return;
    }

    message.loading('Getting current location...', 0);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        message.destroy();
        const { latitude: currentLat, longitude: currentLng } = position.coords;
        setLatitude(parseFloat(currentLat.toFixed(6)));
        setLongitude(parseFloat(currentLng.toFixed(6)));
        message.success('Location updated to current position');
      },
      (error) => {
        message.destroy();
        console.error('Geolocation error:', error);
        message.error('Unable to get current location');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  // Loading state
  if (queryLoading) {
    return (
      <Box align="center" pad="large">
        <Spin size="large" />
        <Heading level={4} margin={{ top: 'medium' }}>Loading geo settings...</Heading>
      </Box>
    );
  }

  // Error state
  if (queryError) {
    return (
      <Box margin={{ vertical: 'medium' }}>
        <Alert
          type="error"
          message="Error Loading Settings"
          description={queryError.message}
          showIcon
          action={
            <Button size="small" onClick={() => refetch()}>
              Retry
            </Button>
          }
        />
      </Box>
    );
  }

  return (
    <>
      <style jsx>{`
        .geo-settings-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          border: 1px solid #f0f0f0;
        }
        
        .setting-group {
          margin-bottom: 20px;
        }
        
        .setting-label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #2c3e50;
          font-size: 14px;
        }
        
        .coordinate-input {
          width: 100%;
          border-radius: 6px;
        }
        
        .button-group {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 24px;
        }
        
        .primary-button {
          background: linear-gradient(135deg, #0066cc 0%, #004499 100%);
          border: none;
          border-radius: 8px;
          height: 40px;
          font-weight: 600;
          flex: 1;
          min-width: 120px;
        }
        
        .secondary-button {
          background: #f8f9fa;
          color: #6c757d;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          height: 40px;
          font-weight: 600;
        }
        
        .location-button {
          background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
          border: none;
          border-radius: 8px;
          height: 40px;
          font-weight: 600;
          color: white;
        }
        
        .info-box {
          background: #f8fbff;
          border: 1px solid #e3f2fd;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 20px;
        }
        
        .debug-info {
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 20px;
          font-family: 'Courier New', monospace;
          font-size: 12px;
        }
        
        @media (max-width: 768px) {
          .button-group {
            flex-direction: column;
          }
          
          .primary-button,
          .secondary-button,
          .location-button {
            width: 100%;
            min-width: unset;
          }
        }
      `}</style>
      
      <Box margin={{ vertical: 'medium' }}>
        <Card className="geo-settings-card" style={{ padding: '24px' }}>
          <Heading level={4} margin={{ bottom: 'medium' }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <EnvironmentOutlined style={{ color: '#0066cc' }} />
            Configure Clock-In Perimeter
          </Heading>
        
          
          <div className="info-box">
            <Alert
              type="info"
              message="Geolocation Settings"
              description="Set the hospital location and allowed radius for clock-in/out operations. Staff must be within this radius to clock in or out."
              showIcon
            />
          </div>
          
          <Box gap="medium" width="medium">
            <div className="setting-group">
              <label className="setting-label">Hospital Latitude:</label>
              <InputNumber 
                className="coordinate-input"
                value={latitude} 
                onChange={setLatitude} 
                step={0.000001}
                precision={6}
                placeholder="Enter latitude (e.g., 18.520400)"
              />
            </div>
            
            <div className="setting-group">
              <label className="setting-label">Hospital Longitude:</label>
              <InputNumber 
                className="coordinate-input"
                value={longitude} 
                onChange={setLongitude} 
                step={0.000001}
                precision={6}
                placeholder="Enter longitude (e.g., 73.856700)"
              />
            </div>
            
            <div className="setting-group">
              <label className="setting-label">Allowed Radius (kilometers):</label>
              <InputNumber 
                className="coordinate-input"
                value={radius} 
                onChange={setRadius} 
                min={0.01} 
                max={10}
                step={0.1}
                precision={2}
                placeholder="Enter radius in km (e.g., 2.0)"
              />
            </div>
            
            <Divider />
            
            <div className="button-group">
              <Button 
                className="primary-button"
                type="primary" 
                icon={<SaveOutlined />}
                onClick={handleSubmit}
                loading={loading}
                disabled={!hasChanges}
              >
                {loading ? 'Saving...' : 'Save Settings'}
              </Button>
              
              <Button 
                className="secondary-button"
                icon={<ReloadOutlined />}
                onClick={handleReset}
                disabled={!hasChanges}
              >
                Reset
              </Button>
              
              <Button 
                className="location-button"
                icon={<EnvironmentOutlined />}
                onClick={getCurrentLocation}
              >
                Use Current Location
              </Button>
            </div>
            
            {hasChanges && (
              <Alert
                type="warning"
                message="Unsaved Changes"
                description="You have unsaved changes. Click 'Save Settings' to apply them."
                showIcon
                style={{ marginTop: '16px' }}
              />
            )}
            
            <div style={{ 
              marginTop: '20px', 
              padding: '12px', 
              background: '#f8fbff',
              borderRadius: '6px',
              fontSize: '13px',
              color: '#6c757d'
            }}>
              <strong>Current Settings Preview:</strong><br/>
              📍 Hospital Location: {latitude?.toFixed(6)}, {longitude?.toFixed(6)}<br/>
              📏 Allowed Radius: {radius} km ({(radius * 1000).toFixed(0)} meters)<br/>
              🌍 <a 
                href={`https://maps.google.com?q=${latitude},${longitude}`} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: '#0066cc' }}
              >
                View on Google Maps
              </a>
            </div>
          </Box>
        </Card>
      </Box>
    </>
  );
}

export default GeoSettings;