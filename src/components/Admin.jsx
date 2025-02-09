import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Import useNavigate
import { createClient } from '@supabase/supabase-js';
import './Admin.css';

const supabaseUrl = 'https://nouhhtzpulljacpjbwtz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vdWhodHpwdWxsamFjcGpid3R6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkwNTE4NDksImV4cCI6MjA1NDYyNzg0OX0.mQUupVWxQRMErliyEwD9JFfRCMNz3gbm76rk9l6wdy4';

const supabase = createClient(supabaseUrl, supabaseKey);

function Admin() {
  const [pin, setPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [message, setMessage] = useState('');
  const correctPin = '1234';
  const navigate = useNavigate(); // Get the navigate function

  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        let { data, error, status } = await supabase
          .from('api_keys')
          .select(`open_router_api_key`)
          .single()

        if (error && status !== 406) {
          throw error
        }

        if (data) {
          setApiKey(data.open_router_api_key);
        }
      } catch (error) {
        console.error("Error fetching API key:", error);
        setMessage("Failed to fetch API key.");
      }
    }

    fetchApiKey();
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

  const handleApiKeyUpdate = async () => {
    try {
      const { error } = await supabase
        .from('api_keys')
        .upsert({ id: 1, open_router_api_key: apiKey }, { onConflict: 'id' })

      if (error) {
        throw error;
      }

      localStorage.setItem('openRouterApiKey', apiKey); // Store in localStorage
      setMessage('API Key updated successfully!');
      setTimeout(() => {
        setMessage('');
        navigate('/'); // Redirect to home after successful update
      }, 3000);
    } catch (error) {
      console.error("Error updating API key:", error);
      setMessage("Failed to update API key.");
    }
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
