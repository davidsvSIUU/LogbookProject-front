import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Session } from '@supabase/supabase-js'; // Import Session type

function App() {
  const [session, setSession] = useState<Session | null>(null); // Initialize session with null and correct type

  useEffect(() => {
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={session ? <Navigate to="/dashboard" /> : <Login />} />
        <Route
          path="/dashboard"
          element={session ? <div>Dashboard</div> : <Navigate to="/" />}
        />
      </Routes>
    </Router>
  );
}

export default App;
