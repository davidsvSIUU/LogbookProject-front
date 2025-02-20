// components/Dashboard.tsx
import { useEffect, useState,useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Session } from '@supabase/supabase-js';
import './DashboardStyle.css';
import logo from '../assets/logo.jpg';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faMicrophone, 
  faStop, 
  faCopy, 
  faCheck, 
  faTrash, 
  faList, 
  faTimes 
} from '@fortawesome/free-solid-svg-icons';
export default function Dashboard() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null); // WebSocket state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [audioList, setAudioList] = useState<any[]>([]);
  const [selectedAudio, setSelectedAudio] = useState<any>(null);
  const [hasCopied, setHasCopied] = useState(false);
  const [currentRecordingId, setCurrentRecordingId] = useState<number | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioChunks, setAudioChunks] = useState<BlobPart[]>([]);
  const audioChunksRef = useRef<BlobPart[]>([]);

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
      if (ws) { // Close WebSocket connection on component unmount
        ws.close();
      }
    };
  }, []);
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };
  useEffect(() => {
    const fetchRecordings = async () => {
      if (session) {
        const { data, error } = await supabase
          .from('recordings') // Changement de table
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });
        
        if (!error) setAudioList(data || []);
      }
    };
    
    if (isSidebarOpen) fetchRecordings();
  }, [isSidebarOpen, session]);
  const handleCopy = async () => {
  await navigator.clipboard.writeText(transcription);
  setHasCopied(true);
  setTimeout(() => setHasCopied(false), 2000); // Reset après 2 secondes
};
  useEffect(() => {
    const fetchAudios = async () => {
      if (session) {
        const { data, error } = await supabase
          .from('audios')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });
        
        if (!error) setAudioList(data || []);
      }
    };
    
    if (isSidebarOpen) fetchAudios();
  }, [isSidebarOpen, session]);
  
  const startRecording = async () => {
    try {
      // Créer d'abord l'enregistrement dans la base de données
      const { data: recordingData, error: recordingError } = await supabase
        .from('recordings')
        .insert([
          {
            user_id: session?.user.id,
            title: `Enregistrement du ${new Date().toLocaleString()}`,
            transcription_text: '',
            audio_url: ''
          }
        ])
        .select()
        .single();
  
      if (recordingError) {
        console.error('Erreur lors de la création de l\'enregistrement:', recordingError);
        return;
      }
  
      setCurrentRecordingId(recordingData.id);
  
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      setMediaRecorder(recorder);
      setAudioChunks([]);
  
      const newWs = new WebSocket('ws://localhost:8000/ws/transcire');
      setWs(newWs);
  
      newWs.onopen = () => {
        console.log('WebSocket connection opened');
        newWs.send(JSON.stringify({ user_id: session?.user.id }));
        setIsRecording(true);
        setTranscription('');
        recorder.start();
      };
  
      newWs.onmessage = async (event) => {
        const newTranscription = event.data;
        setTranscription(prevTranscription => {
          const updatedTranscription = prevTranscription + newTranscription + '\n';
          
          if (currentRecordingId) {
            supabase
              .from('recordings')
              .update({ transcription_text: updatedTranscription })
              .eq('id', currentRecordingId)
              .then(({ error }) => {
                if (error) console.error('Erreur lors de la mise à jour de la transcription:', error);
              });
          }
          
          return updatedTranscription;
        });
      };
  
      newWs.onerror = (error) => {
        console.error('WebSocket error:', error);
        setTranscription('Erreur de transcription WebSocket.');
        setIsRecording(false);
        stopRecording();
      };
  
      newWs.onclose = () => {
        console.log('WebSocket connection closed');
        setIsRecording(false);
      };
  
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data); // Stockage synchrone
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(event.data);
          }
        }
      };
  
      recorder.onstop = async () => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      
        if (currentRecordingId) {
          try {
            // Création du Blob audio
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            
            // Génération d'un nom de fichier unique
            const fileName = `recording_${currentRecordingId}_${Date.now()}.webm`;
      
            // Upload vers Supabase Storage
            const { error: uploadError } = await supabase.storage
              .from('logbook-audio-records')
              .upload(fileName, audioBlob);
      
            if (uploadError) throw uploadError;
      
            // Récupération de l'URL publique
            const { data: { publicUrl } } = supabase.storage
              .from('logbook-audio-records')
              .getPublicUrl(fileName);
      
            // Mise à jour de l'enregistrement
            const { error: updateError } = await supabase
              .from('recordings')
              .update({ audio_url: publicUrl })
              .eq('id', currentRecordingId);
      
            if (updateError) throw updateError;
      
          } catch (error) {
            console.error('Erreur lors du traitement audio :', error);
          }
        }
      
        // Nettoyage
        if (audioStream) {
          audioStream.getTracks().forEach(track => track.stop());
          setAudioStream(null);
        }
        audioChunksRef.current = [];
      };
  
    } catch (error) {
      console.error('Erreur lors du démarrage de l\'enregistrement:', error);
      setTranscription('Erreur lors du démarrage de l\'enregistrement.');
      setIsRecording(false);
    }
  };
  
  // Remplace la fonction stopRecording complète :
  const stopRecording = async () => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
    }
  
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
      setAudioStream(null);
    }
  
    setIsRecording(false);
    
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  
    // Attendre un peu pour s'assurer que l'audioBlob est créé
    await new Promise(resolve => setTimeout(resolve, 100));
  
    if (currentRecordingId && audioBlob) {
      try {
        // Créer un nom de fichier unique
        const fileName = `${session?.user.id}/recording-${currentRecordingId}-${Date.now()}.webm`;
        
        // Upload the audio file to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('logbook-audio-records')
          .upload(fileName, audioBlob);
  
        if (uploadError) {
          throw new Error(`Erreur lors de l'upload: ${uploadError.message}`);
        }
  
        // Créer l'URL publique pour l'audio
        const { data: { publicUrl } } = supabase.storage
          .from('logbook-audio-records')
          .getPublicUrl(fileName);
  
        // Mettre à jour l'enregistrement avec l'URL de l'audio et la transcription finale
        const { error: updateError } = await supabase
          .from('recordings')
          .update({
            transcription_text: transcription,
            audio_url: publicUrl
          })
          .eq('id', currentRecordingId);
  
        if (updateError) {
          throw new Error(`Erreur lors de la mise à jour: ${updateError.message}`);
        }
  
      } catch (error) {
        console.error('Erreur lors de l\'enregistrement de l\'audio:', error);
      }
    }
  
    // Réinitialiser les states
    setCurrentRecordingId(null);
    setAudioBlob(null);
    setAudioChunks([]);
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
    <button 
    className="sidebar-toggle"
    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
  >
    <FontAwesomeIcon icon={isSidebarOpen ? faTimes : faList} />
  </button>

  <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        {selectedAudio ? (
          <div className="audio-details">
            <button className="back-button" onClick={() => setSelectedAudio(null)}>
              ← Retour
            </button>
            <h3>{selectedAudio.title || 'Sans titre'}</h3>
            <p>Date: {new Date(selectedAudio.created_at).toLocaleString()}</p>
            <audio controls src={selectedAudio.audio_url} />
            <div className="transcription-preview">
              <h4>Transcription :</h4>
              <p>{selectedAudio.transcription_text || 'Aucune transcription disponible'}</p>
            </div>
          </div>
        ) : (
          <div className="audio-list">
            <h3>Vos enregistrements</h3>
            {audioList.map(recording => (
              <div 
                key={recording.id} 
                className="audio-item"
                onClick={() => setSelectedAudio(recording)}
              >
                <div className="audio-title">{recording.title || 'Sans titre'}</div>
                <div className="audio-date">
                  {new Date(recording.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
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
            onClick={toggleRecording}
          >
            <FontAwesomeIcon 
              icon={isRecording ? faStop : faMicrophone} 
              style={{ marginRight: '8px' }}
            />
            {isRecording ? 'Arrêter l\'enregistrement' : 'Démarrer l\'enregistrement'}
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
            <button 
              className="action-button" 
              onClick={handleCopy}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <FontAwesomeIcon icon={hasCopied ? faCheck : faCopy} />
              {hasCopied ? 'Copié !' : 'Copier la transcription'}
            </button>
            <button 
              className="action-button"
              onClick={() => setTranscription('')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <FontAwesomeIcon icon={faTrash} />
              Effacer
            </button>
            </div>
        </div>
      </main>
    </div>
  );
}