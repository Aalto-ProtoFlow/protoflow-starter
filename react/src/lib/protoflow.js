/**
 * ProtoFlow.js - IoT Prototyping Library
 * Single-file library for ESP32 ↔ NodeRED ↔ PWA communication
 *
 * @version 1.0.0
 * @license MIT
 *
 * Quick Start:
 *   <script src="protoflow.js"></script>
 *   <script>
 *       ProtoFlow
 *           .on('devices', (devices) => console.log('Devices:', devices))
 *           .on('sensor', (data) => console.log('Sensor:', data))
 *           .connect();
 *   </script>
 *
 * React Example:
 *   useEffect(() => {
 *       ProtoFlow
 *           .on('sensor', (data) => setSensorValue(data.value))
 *           .connect();
 *       return () => ProtoFlow.disconnect();
 *   }, []);
 */

(function(global) {
    'use strict';

    // =========================================================================
    // SECTION 1: CONFIGURATION
    // =========================================================================

    const DEFAULT_CONFIG = {
        // WebSocket URL must be configured via meta tag or window.PROTOFLOW_CONFIG
        // Example: <meta name="protoflow-websocket-url" content="wss://your-server/ws/app">
        websocketUrl: '',
        clientName: 'ProtoFlow Web Client',
        reconnectInterval: 3000,
        maxReconnectAttempts: 10,
        pingInterval: 5000,  // PWA ping every 5 seconds (per protocol spec)
        debug: false
    };

    // =========================================================================
    // SECTION 2: PROTOFLOW CLASS
    // =========================================================================

    class ProtoFlowClient {
        constructor() {
            this._config = { ...DEFAULT_CONFIG };
            this._ws = null;
            this._clientId = `pwa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            this._isRegistered = false;
            this._connectionStatus = 'disconnected';
            this._reconnectAttempts = 0;
            this._reconnectTimer = null;
            this._pingTimer = null;
            this._devices = [];
            this._subscriptions = new Set();

            // Event callbacks
            this._callbacks = {
                connect: [],
                disconnect: [],
                registered: [],
                devices: [],
                sensor: [],
                error: [],
                message: []
            };

            // Load config from meta tags or window object
            this._loadBrowserConfig();
        }

        // =====================================================================
        // PUBLIC API: Configuration
        // =====================================================================

        /**
         * Configure the ProtoFlow client
         * @param {Object} options - Configuration options
         * @returns {ProtoFlowClient} - For chaining
         */
        configure(options) {
            Object.assign(this._config, options);
            this._log('Configuration updated:', this._config);
            return this;
        }

        // =====================================================================
        // PUBLIC API: Connection
        // =====================================================================

        /**
         * Connect to NodeRED WebSocket server
         * @returns {ProtoFlowClient} - For chaining
         */
        connect() {
            if (this._ws && this._ws.readyState === WebSocket.OPEN) {
                this._log('Already connected');
                return this;
            }

            // Check if WebSocket URL is configured
            if (!this._config.websocketUrl) {
                this._handleError('WebSocket URL not configured. Add a meta tag: <meta name="protoflow-websocket-url" content="wss://your-server/ws/app">');
                return this;
            }

            this._log(`Connecting to: ${this._config.websocketUrl}`);
            this._connectionStatus = 'connecting';

            try {
                this._ws = new WebSocket(this._config.websocketUrl);
                this._setupWebSocketHandlers();
            } catch (error) {
                this._handleError('Failed to create WebSocket:', error);
            }

            return this;
        }

        /**
         * Disconnect from NodeRED
         * @returns {ProtoFlowClient} - For chaining
         */
        disconnect() {
            this._stopPing();
            this._stopReconnect();

            if (this._ws) {
                this._log('Disconnecting...');
                this._ws.close(1000, 'Manual disconnect');
                this._ws = null;
            }

            this._isRegistered = false;
            this._connectionStatus = 'disconnected';
            this._subscriptions.clear();

            return this;
        }

        /**
         * Check if connected to WebSocket
         * @returns {boolean}
         */
        isConnected() {
            return this._ws && this._ws.readyState === WebSocket.OPEN;
        }

        /**
         * Check if registered and ready
         * @returns {boolean}
         */
        isReady() {
            return this.isConnected() && this._isRegistered;
        }

        // =====================================================================
        // PUBLIC API: Devices
        // =====================================================================

        /**
         * Get list of connected devices
         * @returns {Promise<Array>} - Array of device objects
         */
        getDevices() {
            return new Promise((resolve, reject) => {
                if (!this.isReady()) {
                    reject(new Error('Not connected or registered'));
                    return;
                }

                // One-time listener for device list
                const handler = (devices) => {
                    const idx = this._callbacks.devices.indexOf(handler);
                    if (idx > -1) this._callbacks.devices.splice(idx, 1);
                    resolve(devices);
                };
                this._callbacks.devices.push(handler);

                this._sendMessage({
                    type: 'get_devices',
                    timestamp: Date.now()
                });
            });
        }

        /**
         * Subscribe to a specific device's sensor data
         * @param {string} deviceUuid - Device UUID to subscribe to
         * @returns {ProtoFlowClient} - For chaining
         */
        subscribeToDevice(deviceUuid) {
            if (!this.isReady()) {
                this._handleError('Cannot subscribe - not connected');
                return this;
            }

            this._subscriptions.add(deviceUuid);
            this._sendMessage({
                type: 'subscribe',
                device: deviceUuid,
                client: this._clientId,
                timestamp: Date.now()
            });

            this._log(`Subscribed to device: ${deviceUuid}`);
            return this;
        }

        /**
         * Unsubscribe from a device
         * @param {string} deviceUuid - Device UUID to unsubscribe from
         * @returns {ProtoFlowClient} - For chaining
         */
        unsubscribeFromDevice(deviceUuid) {
            this._subscriptions.delete(deviceUuid);
            this._sendMessage({
                type: 'unsubscribe',
                device: deviceUuid,
                client: this._clientId,
                timestamp: Date.now()
            });

            this._log(`Unsubscribed from device: ${deviceUuid}`);
            return this;
        }

        /**
         * Subscribe to all available devices
         * @returns {Promise<void>}
         */
        async subscribeToAll() {
            const devices = await this.getDevices();
            devices.forEach(device => {
                this.subscribeToDevice(device.uuid);
            });
        }

        // =====================================================================
        // PUBLIC API: Actuator Control
        // =====================================================================

        /**
         * Send command to an actuator
         * @param {string} deviceUuid - Target device UUID
         * @param {string} actuatorName - Actuator name (e.g., 'led')
         * @param {*} value - Value to send (0/1 for boolean, number for servo, etc.)
         * @returns {boolean} - True if message was sent
         */
        sendCommand(deviceUuid, actuatorName, value) {
            if (!this.isReady()) {
                this._handleError('Cannot send command - not connected');
                return false;
            }

            return this._sendMessage({
                type: 'actuator_command',
                device: deviceUuid,
                actuator: actuatorName,
                value: value,
                timestamp: Date.now()
            });
        }

        // =====================================================================
        // PUBLIC API: Events
        // =====================================================================

        /**
         * Register event callback (chainable)
         * @param {string} event - Event name: 'connect', 'disconnect', 'registered', 'devices', 'sensor', 'error', 'message'
         * @param {Function} callback - Callback function
         * @returns {ProtoFlowClient} - For chaining
         */
        on(event, callback) {
            if (this._callbacks[event]) {
                this._callbacks[event].push(callback);
            } else {
                console.warn(`ProtoFlow: Unknown event '${event}'`);
            }
            return this;
        }

        /**
         * Remove event callback
         * @param {string} event - Event name
         * @param {Function} callback - Callback to remove
         * @returns {ProtoFlowClient} - For chaining
         */
        off(event, callback) {
            if (this._callbacks[event]) {
                const idx = this._callbacks[event].indexOf(callback);
                if (idx > -1) {
                    this._callbacks[event].splice(idx, 1);
                }
            }
            return this;
        }

        // =====================================================================
        // INTERNAL: WebSocket Management
        // =====================================================================

        _setupWebSocketHandlers() {
            this._ws.onopen = () => {
                this._log('WebSocket connected');
                this._connectionStatus = 'connected';
                this._reconnectAttempts = 0;
                this._sendRegistration();
            };

            this._ws.onmessage = (event) => {
                this._handleMessage(event.data);
            };

            this._ws.onerror = (error) => {
                this._handleError('WebSocket error:', error);
            };

            this._ws.onclose = (event) => {
                this._log('WebSocket closed:', event.code, event.reason);
                this._stopPing();
                this._isRegistered = false;
                this._connectionStatus = 'disconnected';

                this._emit('disconnect', { code: event.code, reason: event.reason });

                // Auto-reconnect unless manually closed
                if (event.code !== 1000) {
                    this._scheduleReconnect();
                }
            };
        }

        _sendRegistration() {
            const registration = {
                type: 'pwa_registration',
                client_id: this._clientId,
                client_name: this._config.clientName,
                user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'ProtoFlow Client',
                timestamp: Date.now()
            };

            this._log('Sending PWA registration...');
            this._sendMessage(registration);
        }

        _startPing() {
            this._stopPing();
            this._pingTimer = setInterval(() => {
                if (this._ws && this._ws.readyState === WebSocket.OPEN) {
                    // Ultra-minimal ping per protocol spec
                    this._sendMessage({
                        type: 'pwa_ping',
                        client_id: this._clientId,
                        timestamp: Date.now()
                    });
                }
            }, this._config.pingInterval);
        }

        _stopPing() {
            if (this._pingTimer) {
                clearInterval(this._pingTimer);
                this._pingTimer = null;
            }
        }

        _scheduleReconnect() {
            if (this._reconnectAttempts >= this._config.maxReconnectAttempts) {
                this._handleError(`Max reconnect attempts (${this._config.maxReconnectAttempts}) reached`);
                return;
            }

            this._reconnectAttempts++;
            this._log(`Reconnecting in ${this._config.reconnectInterval}ms (attempt ${this._reconnectAttempts})`);

            this._reconnectTimer = setTimeout(() => {
                this.connect();
            }, this._config.reconnectInterval);
        }

        _stopReconnect() {
            if (this._reconnectTimer) {
                clearTimeout(this._reconnectTimer);
                this._reconnectTimer = null;
            }
        }

        // =====================================================================
        // INTERNAL: Message Handling
        // =====================================================================

        _handleMessage(data) {
            try {
                const message = JSON.parse(data);
                this._emit('message', message);

                switch (message.type) {
                    case 'pwa_registration_ack':
                        this._handleRegistrationAck(message);
                        break;

                    case 'device_list':
                        this._devices = message.devices || [];
                        this._emit('devices', this._devices);
                        break;

                    case 'sensor_data':
                        this._emit('sensor', {
                            device: message.device,
                            sensor: message.sensor,
                            value: message.value,
                            timestamp: message.timestamp
                        });
                        break;

                    case 'subscription_ack':
                        this._log('Subscription acknowledged:', message.device);
                        break;

                    case 'error':
                        this._handleError('Server error:', message.message);
                        break;

                    default:
                        this._log('Unknown message type:', message.type);
                }

            } catch (error) {
                this._handleError('Failed to parse message:', data, error);
            }
        }

        _handleRegistrationAck(message) {
            if (message.status === 'accepted') {
                this._isRegistered = true;
                this._connectionStatus = 'registered';
                this._startPing();

                this._log('Registration successful!');
                this._emit('connect', { clientId: this._clientId });
                this._emit('registered', { success: true, clientId: message.client_id });

                // Auto-request device list after registration
                this._sendMessage({
                    type: 'get_devices',
                    timestamp: Date.now()
                });

            } else {
                this._handleError('Registration rejected:', message.message);
                this._emit('registered', { success: false, message: message.message });
            }
        }

        _sendMessage(message) {
            if (this._ws && this._ws.readyState === WebSocket.OPEN) {
                this._ws.send(JSON.stringify(message));
                return true;
            }
            return false;
        }

        // =====================================================================
        // INTERNAL: Utilities
        // =====================================================================

        _loadBrowserConfig() {
            if (typeof window === 'undefined') return;

            // Check window.PROTOFLOW_CONFIG
            if (window.PROTOFLOW_CONFIG) {
                Object.assign(this._config, window.PROTOFLOW_CONFIG);
            }

            // Check meta tags
            const metaMappings = {
                'protoflow-websocket-url': 'websocketUrl',
                'protoflow-websocket-app-url': 'websocketUrl',
                'protoflow-client-name': 'clientName',
                'protoflow-debug': 'debug'
            };

            Object.entries(metaMappings).forEach(([metaName, configKey]) => {
                const meta = document.querySelector(`meta[name="${metaName}"]`);
                if (meta) {
                    let value = meta.getAttribute('content');
                    if (configKey === 'debug') value = value === 'true';
                    this._config[configKey] = value;
                }
            });
        }

        _emit(event, data) {
            if (this._callbacks[event]) {
                this._callbacks[event].forEach(callback => {
                    try {
                        callback(data);
                    } catch (e) {
                        console.error(`ProtoFlow: Error in ${event} callback:`, e);
                    }
                });
            }
        }

        _log(...args) {
            if (this._config.debug) {
                console.log('[ProtoFlow]', ...args);
            }
        }

        _handleError(...args) {
            console.error('[ProtoFlow]', ...args);
            this._emit('error', { message: args.join(' ') });
        }
    }

    // =========================================================================
    // SECTION 3: EXPORT SINGLETON
    // =========================================================================

    const ProtoFlow = new ProtoFlowClient();

    // Export for different module systems
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = ProtoFlow;
    }

    if (typeof global !== 'undefined') {
        global.ProtoFlow = ProtoFlow;
    }

    if (typeof window !== 'undefined') {
        window.ProtoFlow = ProtoFlow;
    }

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));

// ES module export for Vite/React — same singleton as window.ProtoFlow
export default (typeof window !== 'undefined' ? window : globalThis).ProtoFlow;
