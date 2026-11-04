/**
 * api.js — HTTP client for the ProtoFlow backend API
 *
 * Wraps fetch() with:
 *   - Automatic JWT token from localStorage
 *   - JSON request/response handling
 *   - Error extraction from response body
 *
 * Usage:
 *   import api from './api.js';
 *   const devices = await api.get('/devices');
 *   await api.post('/auth/login', { email, password });
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };

  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = { method, headers };
  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`${API_URL}${path}`, options);

  // No content
  if (res.status === 204) return null;

  const data = await res.json();

  if (!res.ok) {
    const err = new Error(data.error || data.message || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }

  return data;
}

const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  patch: (path, body) => request('PATCH', path, body),
  delete: (path) => request('DELETE', path),
};

export default api;
