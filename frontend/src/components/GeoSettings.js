import React, { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { InputNumber, Slider, message, Alert } from 'antd';
import { EnvironmentOutlined, SaveOutlined, ReloadOutlined, AimOutlined } from '@ant-design/icons';
import { GET_SETTING, UPDATE_SETTING } from '../graphql/managerQueries';

function GeoSettings() {
  const [latitude, setLatitude] = useState(18.5204);
  const [longitude, setLongitude] = useState(73.8567);
  const [radius, setRadius] = useState(2);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalData, setOriginalData] = useState(null);

  const { data, loading: queryLoading, error: queryError, refetch } = useQuery(GET_SETTING, {
    variables: { name: 'geo_perimeter' },
    errorPolicy: 'all',
    fetchPolicy: 'cache-and-network',
  });
  const [updateSetting] = useMutation(UPDATE_SETTING, { errorPolicy: 'all' });

  // Load saved settings
  useEffect(() => {
    if (data?.getSetting?.value) {
      try {
        const v = JSON.parse(data.getSetting.value);
        const lat = v.lat || v.latitude || 18.5204;
        const lng = v.lng || v.longitude || 73.8567;
        const rad = v.radius || 2;
        setLatitude(lat); setLongitude(lng); setRadius(rad);
        setOriginalData({ lat, lng, radius: rad });
        setHasChanges(false);
      } catch (e) {
        console.error('Error parsing settings value:', e, data.getSetting.value);
        message.error('Error parsing saved settings. Using defaults.');
      }
    } else if (data?.getSetting === null) {
      setOriginalData({ lat: latitude, lng: longitude, radius });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Track unsaved changes
  useEffect(() => {
    if (originalData) {
      setHasChanges(JSON.stringify({ lat: latitude, lng: longitude, radius }) !== JSON.stringify(originalData));
    }
  }, [latitude, longitude, radius, originalData]);

  const handleSubmit = async () => {
    if (!latitude || !longitude || !radius) return message.error('Please fill in all fields');
    if (radius <= 0) return message.error('Radius must be greater than 0');
    if (latitude < -90 || latitude > 90) return message.error('Latitude must be between -90 and 90');
    if (longitude < -180 || longitude > 180) return message.error('Longitude must be between -180 and 180');

    setSaving(true);
    try {
      const settingValue = { lat: parseFloat(latitude), lng: parseFloat(longitude), radius: parseFloat(radius) };
      const result = await updateSetting({
        variables: { name: 'geo_perimeter', value: JSON.stringify(settingValue) },
        refetchQueries: [{ query: GET_SETTING, variables: { name: 'geo_perimeter' } }],
      });
      if (result.data?.updateSetting) {
        message.success('Perimeter updated successfully!');
        setOriginalData(settingValue);
        setHasChanges(false);
        await refetch();
      } else {
        throw new Error('No data returned from updateSetting mutation');
      }
    } catch (error) {
      let msg = 'Failed to update perimeter: ';
      if (error.graphQLErrors?.length) msg += error.graphQLErrors[0].message;
      else if (error.networkError) msg += 'Network error. Please check your connection.';
      else msg += error.message || 'Unknown error occurred';
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!originalData) return;
    setLatitude(originalData.lat); setLongitude(originalData.lng); setRadius(originalData.radius);
    message.info('Values reset to saved settings');
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) return message.error('Geolocation is not supported by your browser');
    message.loading('Getting current location...', 0);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        message.destroy();
        setLatitude(parseFloat(pos.coords.latitude.toFixed(6)));
        setLongitude(parseFloat(pos.coords.longitude.toFixed(6)));
        message.success('Location updated to current position');
      },
      (err) => {
        message.destroy();
        console.error('Geolocation error:', err);
        message.error('Unable to get current location');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
    return undefined;
  };

  if (queryLoading && !data) return <div className="md-skels"><div className="md-skel" /><div className="md-skel" /></div>;
  if (queryError) {
    return (
      <Alert
        type="error" showIcon message="Error loading settings" description={queryError.message}
        action={<button type="button" className="md-btn" onClick={() => refetch()}>Retry</button>}
      />
    );
  }

  const zone = 22 + Math.min(Math.max(Number(radius) || 0, 0), 5) * 14; // preview size only

  return (
    <div className="md-geo">
      <div className="md-geo-form">
        <label>
          Facility latitude
          <InputNumber value={latitude} onChange={setLatitude} step={0.000001} precision={6} style={{ width: '100%' }} />
        </label>
        <label>
          Facility longitude
          <InputNumber value={longitude} onChange={setLongitude} step={0.000001} precision={6} style={{ width: '100%' }} />
        </label>
        <label>
          Allowed radius: <strong>{Number(radius).toFixed(2)} km</strong> ({Math.round(radius * 1000)} m)
          <Slider min={0.05} max={5} step={0.05} value={Math.min(Math.max(Number(radius) || 0.05, 0.05), 5)} onChange={setRadius} tooltip={{ formatter: (v) => `${v} km` }} />
          <InputNumber value={radius} onChange={setRadius} min={0.01} max={10} step={0.1} precision={2} addonAfter="km" style={{ width: '100%' }} />
        </label>

        <div className="md-geo-actions">
          <button type="button" className="md-btn is-primary" onClick={handleSubmit} disabled={!hasChanges || saving}>
            <SaveOutlined /> {saving ? 'Saving...' : 'Save settings'}
          </button>
          <button type="button" className="md-btn" onClick={handleReset} disabled={!hasChanges}><ReloadOutlined /> Reset</button>
          <button type="button" className="md-btn" onClick={getCurrentLocation}><AimOutlined /> Use my location</button>
        </div>
        {hasChanges && <p className="md-unsaved">You have unsaved changes.</p>}
      </div>

      <div className="md-geo-preview">
        <svg viewBox="0 0 160 160" role="img" aria-label="Preview of the allowed zone">
          <rect width="160" height="160" rx="18" className="md-geo-ground" />
          <path d="M0 110 L160 70 M60 0 L100 160" className="md-geo-road" />
          <circle cx="80" cy="80" r={zone} className="md-geo-zone" />
          <circle cx="80" cy="80" r={zone} className="md-geo-ping" />
          <circle cx="80" cy="80" r="9" className="md-geo-pin" />
        </svg>
        <p><EnvironmentOutlined /> {Number(latitude).toFixed(5)}, {Number(longitude).toFixed(5)}</p>
        <a href={`https://maps.google.com?q=${latitude},${longitude}`} target="_blank" rel="noopener noreferrer">View on Google Maps</a>
      </div>
    </div>
  );
}

export default GeoSettings;