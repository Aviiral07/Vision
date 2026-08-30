import React, { useState } from "react";
import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function Login() {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccessMessage("");
    
    try {
      if (isRegisterMode) {
        await signup(username, password);
        setSuccessMessage("Account created successfully! Signing in...");
        // Auto login after registration
        await login(username, password);
        navigate("/");
      } else {
        await login(username, password);
        navigate("/");
      }
    } catch (err) {
      setError(err.message || (isRegisterMode ? "Registration failed" : "Invalid username or password"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-zinc-200 p-8">
        <div className="text-center mb-6">
          <div className="inline-block p-3 rounded-full bg-blue-50 text-blue-900 mb-3 font-black text-xl">
            🏛️ MoSJE
          </div>
          <h1 className="text-2xl font-bold text-blue-900 mb-1">InfraMind Portal</h1>
          <p className="text-sm text-zinc-500">
            {isRegisterMode ? "Register new inspector credentials" : "Sign in to access AI inspection & monitoring"}
          </p>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm text-center font-medium">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm text-center font-medium">
            {successMessage}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Username / Inspector ID</label>
            <input 
              type="text" 
              className="w-full border border-zinc-300 rounded-lg px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white text-zinc-900 text-sm"
              placeholder="e.g. inspector_delhi"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Password</label>
            <input 
              type="password" 
              className="w-full border border-zinc-300 rounded-lg px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white text-zinc-900 text-sm"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold py-3 rounded-lg shadow"
            disabled={isLoading}
          >
            {isLoading 
              ? (isRegisterMode ? "Creating Account..." : "Signing in...") 
              : (isRegisterMode ? "Register Inspector Account" : "Sign In")}
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t border-zinc-100 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(!isRegisterMode);
              setError("");
              setSuccessMessage("");
            }}
            className="text-sm font-semibold text-blue-800 hover:text-blue-950 hover:underline"
          >
            {isRegisterMode 
              ? "Already have an account? Sign In" 
              : "Need an inspector account? Register here"}
          </button>
        </div>
      </div>
    </div>
  );
}
