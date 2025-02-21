import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginForm.css';
import { supabase } from '../supabaseClient';
import logo from '../assets/logo.jpg'; // Changed to .png
interface LoginForm {
  email?: string;
  password?: string;
}

export default function Login() {
  const [formData, setFormData] = useState<LoginForm>({
    email: '',
    password: '',
  });
  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      alert('Veuillez remplir tous les champs.');
      return;
    }

    try {
      let response;
      if (isSignUp) {
        response = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
        });
      } else {
        response = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
      }

      if (response.error) {
        console.error('Erreur d\'authentification:', response.error.message);
        alert(response.error.message);
      } else {
        console.log('Authentification réussie!', response.data);
        navigate('/dashboard'); // Redirect after login/signup
      }
    } catch (error) {
      console.error('Erreur inattendue:', error);
      alert('Erreur inattendue lors de l\'authentification.');
    }
  };

  return (
    <div className="main-container">
      <div className="left-side">
        <img src={logo} alt="Logbook Logo" className="logo" />
        <h1>Logbook</h1>
        <p>Des corrections à l'oral pour motiver les élèves et soulager les enseignants</p>
      </div>
      <div className="login-container">
        <form onSubmit={handleSubmit} className="login-form">
<h2 className="login-title">{isSignUp ? 'Inscription' : 'Connexion'}</h2>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Mot de passe</label>
            <input
              type="password"
              className="form-input"
              value={formData.password || ''}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>

          <button type="submit" className="submit-button">
            Se connecter
          </button>
          <p className="signup-link" onClick={() => setIsSignUp(!isSignUp)}>
            {isSignUp ? 'Déjà un compte ? Se connecter' : 'Pas de compte ? S\'inscrire'}
          </p>
        </form>
      </div>
    </div>
  );
}
