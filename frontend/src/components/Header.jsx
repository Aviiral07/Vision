import React, { useState, useEffect } from "react"
import logoImg from "@/assets/logo.png"
import logoTextImg from "@/assets/logo-text.png"
import { Link, useLocation } from "react-router-dom"
import { useAuth } from "./AuthContext"
import { LogOut, UserCheck, HardDriveDownload, Download, Wifi, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Header({ serverOnline, offlineQueueCount = 0, onOpenOfflineQueue }) {
  const { isAuthenticated, currentUser, logout } = useAuth();
  const location = useLocation();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPopup, setShowInstallPopup] = useState(false);

  // Helper to detect iOS device
  const isIos = () => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(userAgent);
  };

  // Helper to check if already installed on iOS
  const isInStandaloneMode = () => ('standalone' in window.navigator) && (window.navigator.standalone);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!localStorage.getItem('pwa_install_dismissed')) {
        setShowInstallPopup(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // iOS fallback prompt since beforeinstallprompt is not supported
    if (isIos() && !isInStandaloneMode()) {
      if (!localStorage.getItem('pwa_install_dismissed')) {
        setShowInstallPopup(true);
      }
    }

    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (isIos() && !isInStandaloneMode()) {
      alert("To install on iOS:\n\n1. Tap the Share button at the bottom of Safari.\n2. Scroll down and tap 'Add to Home Screen'.");
      return;
    }
    if (!deferredPrompt) {
      alert("To install this app on your device:\n\n• On Chrome/Edge: Click the install icon in the address bar.\n• On Android: Tap Menu -> Install App.");
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setShowInstallPopup(false);
    }
  };

  const handleDismissPopup = () => {
    setShowInstallPopup(false);
    localStorage.setItem('pwa_install_dismissed', 'true');
  };

  return (
    <header className="bg-blue-900 border-b border-blue-950 px-4 sm:px-6 py-3 shadow-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Brand Logo & Name */}
        <Link to="/" className="flex items-center gap-3">
          <img
            src={logoImg}
            alt="InfraMind Logo"
            className="h-10 w-10 rounded-xl bg-white p-1 shadow-sm object-contain"
          />
          <div className="flex flex-col gap-1">
            <div className="bg-white px-2 py-0.5 rounded shadow-xs flex items-center w-fit">
              <img
                src={logoTextImg}
                alt="InfraMind AI"
                className="h-5 sm:h-6 w-auto object-contain"
              />
            </div>
            <span className="text-[10px] sm:text-[11px] text-blue-200 font-medium tracking-wide">
              MoSJE Inspection Portal (PWA)
            </span>
          </div>
        </Link>

        {isAuthenticated && (
          <nav className="flex items-center gap-3 sm:gap-8 ml-2 sm:ml-0 overflow-x-auto no-scrollbar">
            <Link 
              to="/" 
              className={`text-[11px] sm:text-base font-bold transition-colors whitespace-nowrap ${location.pathname === '/' ? 'text-white border-b-2 border-white pb-0.5 sm:pb-1' : 'text-blue-200 hover:text-white'}`}
            >
              <span className="hidden sm:inline">Inspection Portal</span>
              <span className="sm:hidden">Inspect</span>
            </Link>
            <Link 
              to="/dashboard" 
              className={`text-[11px] sm:text-base font-bold transition-colors whitespace-nowrap ${location.pathname === '/dashboard' ? 'text-white border-b-2 border-white pb-0.5 sm:pb-1' : 'text-blue-200 hover:text-white'}`}
            >
              <span className="hidden sm:inline">Analytics Dashboard</span>
              <span className="sm:hidden">Analytics</span>
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
            className="inline-flex items-center gap-1.5 text-xs font-bold bg-blue-950/70 border-blue-700 text-blue-100 hover:bg-blue-800 hover:text-white h-8 px-2 sm:px-2.5"
          >
            <Download className="w-3.5 h-3.5 text-blue-300" />
            <span className="hidden sm:inline">Install App</span>
          </Button>

          {/* Connection Status */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-950/60 border border-blue-800">
            {serverOnline ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span className="text-[11px] sm:text-xs text-blue-100 font-bold tracking-wider">
              {serverOnline ? "ONLINE" : "OFFLINE"}
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
      
      {/* Universal PWA Install Popup */}
      {showInstallPopup && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 bg-white p-4 rounded-xl shadow-2xl border border-zinc-200 z-[100] flex flex-col gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="flex items-start gap-3">
            <img src={logoImg} alt="InfraMind Logo" className="w-10 h-10 rounded-xl bg-white p-1 shadow-sm border border-blue-100 object-contain" />
            <div className="flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-xs font-bold text-zinc-700">Install</span>
                <img src={logoTextImg} alt="InfraMind AI" className="h-4 w-auto object-contain" />
              </div>
              <p className="text-xs text-zinc-500 leading-snug font-medium">Install our app for true offline inspections and faster loading directly from your home screen.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Button onClick={handleInstallClick} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold h-9 text-xs">
              Install Now
            </Button>
            <Button onClick={handleDismissPopup} variant="outline" className="flex-1 text-zinc-600 font-bold h-9 text-xs border-zinc-300">
              Maybe Later
            </Button>
          </div>
        </div>
      )}
    </header>
  )
}
