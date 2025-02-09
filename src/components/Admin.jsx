import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Import useNavigate
import './Admin.css';

function Admin() {
  const [pin, setPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [message, setMessage] = useState('');
  const correctPin = '1234';
    const navigate = useNavigate(); // Get the navigate function

  useEffect(() => {
    const storedApiKey = localStorage.getItem('openRouterApiKey');
    if (storedApiKey) {
      setApiKey(storedApiKey);
    }
  }, []);

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pin === correctPin) {
      setIsAuthenticated(true);
      setMessage('');
    } else {
      setMessage('Incorrect PIN.');
    }
  };

  const handleApiKeyUpdate = () => {
    localStorage.setItem('openRouterApiKey', apiKey);
    setMessage('API Key updated successfully!');
    setTimeout(() => {
        setMessage('');
        navigate('/'); // Redirect to home after successful update
    }, 3000);
  };

  if (!isAuthenticated) {
    return (
      <div className="admin-container">
        <h2>Admin Login</h2>
        <form onSubmit={handlePinSubmit}>
          <input
            type="password"
            placeholder="Enter PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="form-control"
          />
          <button type="submit" className="primary-button">Login</button>
        </form>
        {message && <p className="error-message">{message}</p>}
        <footer>
          <Link to="/">Back to Main App</Link>
        </footer>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <h2>Admin Panel</h2>
      <div className="form-group">
        <label htmlFor="apiKey">OpenRouter API Key:</label>
        <input
          type="text"
          id="apiKey"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="form-control"
        />
      </div>
      <button onClick={handleApiKeyUpdate} className="primary-button">Update API Key</button>
      {message && <p className="success-message">{message}</p>}
      <footer>
        <Link to="/">Back to Main App</Link>
      </footer>
    </div>
  );
}

export default Admin;
