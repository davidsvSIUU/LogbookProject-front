import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './LoginForm.css'; // Assurez-vous que ce fichier existe et est correctement configuré

interface LoginForm {
  identifiant: string;
  password: string;
}

export default function Login() {
  const [formData, setFormData] = useState<LoginForm>({
    identifiant: '',
    password: '',
  });
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:8000/login', formData);
      localStorage.setItem('token', response.data.token);
      navigate('/dashboard'); // Redirige après connexion
    } catch (error) {
      console.error('Erreur de connexion:', error);
      alert('Identifiants incorrects');
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-form">
        <h2 className="login-title">Connexion</h2>

        <div className="form-group">
          <label className="form-label">identifiant</label>
          <input
            type="identifiant"
            className="form-input"
            value={formData.identifiant}
            onChange={(e) => setFormData({ ...formData, identifiant: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Mot de passe</label>
          <input
            type="password"
            className="form-input"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
          />
        </div>

        <button type="submit" className="submit-button">
          Se connecter
        </button>
      </form>
    </div>
  );
}