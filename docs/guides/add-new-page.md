# Add a New Page

## What you'll build

You will create a new "Notes" page in the React starter app that displays and creates notes for a device. You will add a route in the app router, a navigation link in the layout, and connect the page to the backend notes API built in [Add a Backend Route](https://github.com/Aalto-ProtoFlow/protoflow/blob/main/docs/guides/add-backend-route.md).

## Prerequisites

- The starter app running locally (`npm run dev` in `react/`)
- The backend running with the `/api/notes` route from [Add a Backend Route](https://github.com/Aalto-ProtoFlow/protoflow/blob/main/docs/guides/add-backend-route.md)
- A claimed device with ID you can test against

> **Note**: This guide assumes the backend `/api/notes` route already exists (see [Add a Backend Route](https://github.com/Aalto-ProtoFlow/protoflow/blob/main/docs/guides/add-backend-route.md)). Coordinate with your backend developer if this endpoint is not yet implemented.

## Steps

### 1. Create the page component

Create `react/src/pages/NotesPage.jsx`:

```jsx
import { useState, useEffect } from 'react';
import { useParams, NavLink } from 'react-router-dom';
import api from '../lib/api.js';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export default function NotesPage() {
  const { deviceId } = useParams();
  const [device, setDevice] = useState(null);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);

  // Load device info + notes on mount
  useEffect(() => {
    async function load() {
      try {
        const [dev, noteList] = await Promise.all([
          api.get(`/devices/${deviceId}`),
          api.get(`/notes/${deviceId}`),
        ]);
        setDevice(dev);
        setNotes(noteList);
      } catch (err) {
        console.error('Failed to load:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [deviceId]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!newNote.trim()) return;

    try {
      const note = await api.post(`/notes/${deviceId}`, { content: newNote });
      setNotes([note, ...notes]);
      setNewNote('');
    } catch (err) {
      console.error('Failed to add note:', err);
    }
  }

  const tabClass = ({ isActive }) =>
    cn(
      'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
      isActive
        ? 'bg-secondary text-secondary-foreground'
        : 'text-muted-foreground hover:text-foreground'
    );

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{device?.name || 'Device'}</h1>

      {/* Tab navigation — matches existing pages */}
      <div className="flex gap-1">
        <NavLink to={`/dashboard/${deviceId}`} className={tabClass}>Live</NavLink>
        <NavLink to={`/history/${deviceId}`} className={tabClass}>History</NavLink>
        <NavLink to={`/notes/${deviceId}`} className={tabClass}>Notes</NavLink>
        <NavLink to={`/settings/${deviceId}`} className={tabClass}>Settings</NavLink>
      </div>

      {/* Add note form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a note about this device..."
          className="flex-1"
        />
        <Button type="submit">Add</Button>
      </form>

      {/* Notes list */}
      {notes.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          No notes yet. Add one above.
        </p>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <Card key={note.id}>
              <CardContent className="pt-4">
                <p>{note.content}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {note.name || note.email} &middot; {new Date(note.created_at).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 2. Add the route in App.jsx

Open `react/src/App.jsx` and add the import and route:

```jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DevicesPage from './pages/DevicesPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import HistoryPage from './pages/HistoryPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import NotesPage from './pages/NotesPage.jsx';        // <-- add import

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/devices" element={<DevicesPage />} />
          <Route path="/dashboard/:deviceId" element={<DashboardPage />} />
          <Route path="/history/:deviceId" element={<HistoryPage />} />
          <Route path="/notes/:deviceId" element={<NotesPage />} />      {/* <-- add route */}
          <Route path="/settings/:deviceId" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/devices" replace />} />
    </Routes>
  );
}
```

The route uses `:deviceId` as a URL parameter, matching the same pattern as the existing dashboard, history, and settings pages.

### 3. Add the nav link to other device pages (optional)

If you want the "Notes" tab to appear on the existing Dashboard and History pages too, add a `NavLink` to their tab bars. For example, in `DashboardPage.jsx`, add it alongside the existing tabs:

```jsx
<div className="flex gap-1">
  <NavLink to={`/dashboard/${deviceId}`} className={tabClass}>Live</NavLink>
  <NavLink to={`/history/${deviceId}`} className={tabClass}>History</NavLink>
  <NavLink to={`/notes/${deviceId}`} className={tabClass}>Notes</NavLink>
  <NavLink to={`/settings/${deviceId}`} className={tabClass}>Settings</NavLink>
</div>
```

The tab styling pattern uses `NavLink` with an `isActive` callback. The `cn()` utility from `@/lib/utils` merges Tailwind classes conditionally.

### 4. Understand the existing navigation pattern

The starter app uses two levels of navigation:

- **Top nav bar** (`Layout.jsx`): Shows the app name, "Devices" link, user email, and logout button. This is shared across all pages.
- **Per-device tab bar** (inside each page): Shows "Live", "History", "Settings" tabs. Each page renders its own tab bar so you can customize which tabs appear.

The top nav bar in `Layout.jsx` only has the "Devices" link. Device-specific pages use inline tab navigation instead. This is intentional -- the tab bar only appears when viewing a specific device.

## Verify it works

1. Navigate to `/notes/1` in your browser (replace `1` with your device ID)
2. You should see the device name, tab navigation, and the empty notes state
3. Type a note and click "Add" -- it should appear in the list below
4. Navigate to Dashboard or History and back to Notes -- the note should persist
5. Refresh the page -- notes load from the backend

## Next steps

- [Add a Backend Route](https://github.com/Aalto-ProtoFlow/protoflow/blob/main/docs/guides/add-backend-route.md) — if you have not built the notes API yet
- [Add a Custom Visualization](./add-custom-visualization.md) — build custom sensor display components
- [Integrate an External API](https://github.com/Aalto-ProtoFlow/protoflow/blob/main/docs/guides/integrate-external-api.md) — fetch external data and display it on your page
