import React, { useState, useEffect } from "react"
import logoImg from "@/assets/logo.png"
import { Link, useLocation } from "react-router-dom"
import { useAuth } from "./AuthContext"
import { LogOut, UserCheck, HardDriveDownload, Download, Wifi, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Header({ serverOnline, offlineQueueCount = 0, onOpenOfflineQueue }) {
  const { isAuthenticated, currentUser, logout } = useAuth();
  const location = useLocation();
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert("To install this app on your device:\n\n• On Chrome/Edge: Click the install icon in the address bar.\n• On iOS Safari: Tap Share -> Add to Home Screen.\n• On Android: Tap Menu -> Install App.");
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  return (
    <header className="bg-blue-900 border-b border-blue-950 px-4 sm:px-6 py-3.5 shadow-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Brand Logo & Name */}
        <Link to="/" className="flex items-center gap-3">
          <img
            src={logoImg}
            alt="InfraMind Logo"
            className="h-10 w-10 rounded bg-white p-1 shadow-sm"
          />
          <div className="flex flex-col">
            <span className="font-bold text-white text-lg tracking-tight leading-tight">
              InfraMind AI
            </span>
            <span className="text-[11px] text-blue-200 font-medium">
              MoSJE Inspection Portal (PWA)
            </span>
          </div>
        </Link>

        {isAuthenticated && (
          <nav className="hidden md:flex items-center gap-8">
            <Link 
              to="/" 
              className={`text-base font-bold transition-colors ${location.pathname === '/' ? 'text-white border-b-2 border-white pb-1' : 'text-blue-200 hover:text-white'}`}
            >
              Inspection Portal
            </Link>
            <Link 
              to="/dashboard" 
              className={`text-base font-bold transition-colors ${location.pathname === '/dashboard' ? 'text-white border-b-2 border-white pb-1' : 'text-blue-200 hover:text-white'}`}
            >
              Analytics Dashboard
            </Link>
          </nav>
        )}

        <div className="flex items-center gap-2.5 sm:gap-4">
          {/* Offline Queue Badge */}
          {offlineQueueCount > 0 && (
            <button
              onClick={onOpenOfflineQueue}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/90 text-amber-950 hover:bg-amber-300 font-black text-xs transition-colors shadow-sm animate-pulse cursor-pointer"
              title="Click to view offline queue"
            >
              <HardDriveDownload className="w-3.5 h-3.5" />
              <span>{offlineQueueCount} Queued</span>
            </button>
          )}

          {/* PWA Install Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleInstallClick}
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold bg-blue-950/70 border-blue-700 text-blue-100 hover:bg-blue-800 hover:text-white h-8 px-2.5"
          >
            <Download className="w-3.5 h-3.5 text-blue-300" />
            Install App
          </Button>

          {/* Connection Status */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-950/60 border border-blue-800">
            {serverOnline ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span className="text-[11px] sm:text-xs text-blue-100 font-bold tracking-wider">
              {serverOnline ? "CLOUD AI" : "OFFLINE"}
            </span>
          </div>

          {isAuthenticated && (
            <div className="flex items-center gap-2 sm:gap-3">
              {currentUser?.username && (
                <div className="hidden lg:flex items-center gap-1.5 text-xs text-blue-100 bg-blue-950/40 px-2.5 py-1 rounded-md border border-blue-800">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-semibold">{currentUser.username}</span>
                </div>
              )}
              
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={logout}
                className="text-blue-100 font-bold hover:text-white hover:bg-blue-800 text-xs px-2.5 sm:px-3 py-1.5"
              >
                <LogOut className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
