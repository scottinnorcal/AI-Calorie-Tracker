import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import './Auth.css';

const supabaseUrl = 'https://nouhhtzpulljacpjbwtz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vdWhodHpwdWxsamFjcGpid3R6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkwNTE4NDksImV4cCI6MjA1NDYyNzg0OX0.mQUupVWxQRMErliyEwD9JFfRCMNz3gbm76rk9l6wdy4';

const supabase = createClient(supabaseUrl, supabaseKey);

function Auth() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);

    const handleSignIn = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) {
                setError(error.message || 'Sign-in failed');
            }
        } catch (err) {
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleSignUp = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { error } = await supabase.auth.signUp({
                email: email,
                password: password,
            });

            if (error) {
                setError(error.message || 'Sign-up failed');
            } else {
                // Optionally, inform the user to check their email for verification
                setError('Please check your email to verify your account.');
            }
        } catch (err) {
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <h2>{isSignUp ? 'Sign Up' : 'Sign In'}</h2>
            <form onSubmit={isSignUp ? handleSignUp : handleSignIn}>
                <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input
                        type="email"
                        id="email"
                        className="form-control"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <input
                        type="password"
                        id="password"
                        className="form-control"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                {error && <p className="form-error">{error}</p>}
                <button type="submit" disabled={loading}>
                    {loading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Sign In')}
                </button>
            </form>
            <div className="auth-links">
                <a href="#" onClick={() => setIsSignUp(!isSignUp)}>
                    {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
                </a>
            </div>
        </div>
    );
}

export default Auth;
