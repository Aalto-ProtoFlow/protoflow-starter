/**
 * useProtoFlow — React hook for live sensor data via WebSocket
 *
 * Wraps the ProtoFlow event API (protoflow.js) and bridges events into React state.
 * Reads the WebSocket URL from VITE_WS_URL environment variable.
 *
 * Usage:
 *   const { status, devices, sensorData, connect, disconnect, subscribe, sendCommand } = useProtoFlow();
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import ProtoFlow from '../lib/protoflow.js';

export default function useProtoFlow() {
  const [status, setStatus] = useState('disconnected');
  const [devices, setDevices] = useState([]);
  const [sensorData, setSensorData] = useState(null);

  const currentDevice = useRef(null);

  // Wire up ProtoFlow events once, clean up on unmount
  useEffect(() => {
    // Configure WebSocket URL from env var
    const wsUrl = import.meta.env.VITE_WS_URL;
    if (wsUrl) {
      ProtoFlow.configure({ websocketUrl: wsUrl });
    }

    const onConnect = () => setStatus('connected');

    const onDisconnect = () => {
      setStatus('disconnected');
      setDevices([]);
      setSensorData(null);
      currentDevice.current = null;
    };

    const onDevices = (deviceList) => setDevices(deviceList);
    const onSensor = (data) => setSensorData(data);
    const onError = (err) => console.error('[ProtoFlow]', err.message);

    ProtoFlow
      .on('connect', onConnect)
      .on('disconnect', onDisconnect)
      .on('devices', onDevices)
      .on('sensor', onSensor)
      .on('error', onError);

    return () => {
      ProtoFlow
        .off('connect', onConnect)
        .off('disconnect', onDisconnect)
        .off('devices', onDevices)
        .off('sensor', onSensor)
        .off('error', onError);
      ProtoFlow.disconnect();
    };
  }, []);

  const connect = useCallback(() => {
    setStatus('connecting');
    ProtoFlow.connect();
  }, []);

  const disconnect = useCallback(() => {
    ProtoFlow.disconnect();
    setStatus('disconnected');
    setDevices([]);
    setSensorData(null);
    currentDevice.current = null;
  }, []);

  const subscribe = useCallback((uuid) => {
    if (currentDevice.current && currentDevice.current !== uuid) {
      ProtoFlow.unsubscribeFromDevice(currentDevice.current);
    }
    ProtoFlow.subscribeToDevice(uuid);
    currentDevice.current = uuid;
    setSensorData(null);
  }, []);

  const sendCommand = useCallback((uuid, actuator, value) => {
    ProtoFlow.sendCommand(uuid, actuator, value);
  }, []);

  return { status, devices, sensorData, connect, disconnect, subscribe, sendCommand };
}
