// components/Dashboard.tsx
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Session } from '@supabase/supabase-js';
import './DashboardStyle.css';
import logo from '../assets/logo.jpg';

export default function Dashboard() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUserEmail(session?.user?.email || '');
      setLoading(false);
    };

    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUserEmail(session?.user?.email || '');
    });

    return () => {
      subscription.unsubscribe();
      stopRecording();
    };
  }, []);

  /*const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);
      setIsRecording(true);
      
      // Ici, vous devrez implémenter la logique de reconnaissance vocale
      // Par exemple, avec Web Speech API ou une autre API de reconnaissance vocale
      // Cette partie dépendra de l'API que vous choisissez d'utiliser
      
      // Exemple fictif de mise à jour de la transcription
      // Dans la réalité, cela serait connecté à votre service de reconnaissance vocale
      const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
      recognition.continuous = true;
      recognition.interimResults = true;
      
      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');
        
        setTranscription(transcript);
      };
      
      recognition.start();
    } catch (error) {
      console.error('Erreur lors du démarrage de l'enregistrement:', error);
    }
  };*/

  const stopRecording = () => {
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
      setAudioStream(null);
    }
    setIsRecording(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return <div className="loading-container">Chargement...</div>;
  }

  if (!session) {
    return <Navigate to="/" />;
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="brand-section">
          <img src={logo} alt="Logo" className="dashboard-logo" />
          <h1>Transcription Audio en Temps Réel</h1>
        </div>
        <div className="user-section">
          <span className="user-email">{userEmail}</span>
          <button onClick={handleLogout} className="logout-button">
            Déconnexion
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="transcription-container">
          <div className="controls-section">
            <button 
              className={`record-button ${isRecording ? 'recording' : ''}`}
            >
              {isRecording ? 'Arrêter lenregistrement' : 'Démarrer lenregistrement'}
            </button>
            <div className="status-indicator">
              {isRecording ? 'Enregistrement en cours...' : 'Prêt à enregistrer'}
            </div>
          </div>

          <div className="transcription-output">
            <h2>Transcription</h2>
            <div className="transcription-text">
              {transcription || 'La transcription apparaîtra ici...'}
            </div>
          </div>

          <div className="action-buttons">
            <button className="action-button" onClick={() => navigator.clipboard.writeText(transcription)}>
              Copier la transcription
            </button>
            <button className="action-button" onClick={() => setTranscription('')}>
              Effacer
            </button>
            <button className="action-button">
              Télécharger
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}