import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import { supabase } from './supabaseClient';
import { Session } from '@supabase/supabase-js';

async function getSessionToken() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error("Erreur lors de la récupération de la session:", String(error));
    return null;
  }
  return session?.access_token || null;
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [dataFromBackend, setDataFromBackend] = useState<any>(null);

  useEffect(() => {
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
  }, []);

  useEffect(() => {
    const fetchToken = async () => {
      const jwtToken = await getSessionToken();
      setToken(jwtToken);
    };

    fetchToken();
  }, [session]);

  const fetchData = async () => {
    if (!token) {
      console.log("Token JWT non disponible.");
      return;
    }

    try {
      const response = await fetch('http://localhost:8000', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP! statut: ${response.status}`);
      }

      const data = await response.json();
      setDataFromBackend(data);
      console.log("Données du backend:", data);

    } catch (error) {
      console.error("Erreur lors de la récupération des données du backend:", error);
      setDataFromBackend({ error: error.message });
    }
  };


  return (
    <Router>
      <Routes>
        <Route path="/" element={session ? <Navigate to="/dashboard" /> : <Login />} />
        <Route
          path="/dashboard"
          element={session ? (
            <div>
              Dashboard
              <button onClick={() => supabase.auth.signOut()}>Déconnexion</button>
              <button onClick={fetchData}>Récupérer données du Backend</button>

              {dataFromBackend && (
                <div>
                  <h3>Données du Backend:</h3>
                  {dataFromBackend.error ? (
                    <p style={{ color: 'red' }}>Erreur: {dataFromBackend.error}</p>
                  ) : (
                    <pre>{JSON.stringify(dataFromBackend, null, 2)}</pre>
                  )}
                </div>
              )}
            </div>
          ) : (
            <Navigate to="/" />
          )}
        />
      </Routes>
    </Router>
  );
}

export default App;
