import React, { useState, useEffect, useRef } from 'react';

const API_URL = 'http://127.0.0.1:8000';

export default function App() {
  const [serverOnline, setServerOnline] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewSrc, setPreviewSrc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const canvasRef = useRef(null);

  // Check server health on load
  useEffect(() => {
    fetch(`${API_URL}/`)
      .then((res) => (res.ok ? setServerOnline(true) : setServerOnline(false)))
      .catch(() => setServerOnline(false));
  }, []);

  // When image or result changes, draw bounding boxes on canvas
  useEffect(() => {
    if (!previewSrc) return;

    const img = new Image();
    img.src = previewSrc;
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');

      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      // Draw original image
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      // If we have AI detections, draw them
      if (result && result.detections) {
        const cracks = result.detections.cracks?.predictions || [];
        const rust = result.detections.rust?.predictions || [];

        // Draw Cracks (Red)
        cracks.forEach((p) => {
          drawBox(ctx, p, '#dc2626', 'Crack');
        });

        // Draw Rust (Orange/Amber)
        rust.forEach((p) => {
          drawBox(ctx, p, '#d97706', 'Rust');
        });
      }
    };
  }, [previewSrc, result]);

  const drawBox = (ctx, pred, color, label) => {
    const x = pred.x - pred.width / 2;
    const y = pred.y - pred.height / 2;
    const w = pred.width;
    const h = pred.height;

    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, Math.round(ctx.canvas.width / 350));
    ctx.strokeRect(x, y, w, h);

    const conf = Math.round((pred.confidence || 0) * 100);
    const tag = `${label} ${conf}%`;

    const fontSize = Math.max(13, Math.round(ctx.canvas.width / 45));
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillStyle = color;
    ctx.fillRect(x, Math.max(0, y - fontSize - 6), ctx.measureText(tag).width + 8, fontSize + 6);

    ctx.fillStyle = '#ffffff';
    ctx.fillText(tag, x + 4, Math.max(fontSize, y - 2));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setResult(null);
      setErrorMsg('');
      setPreviewSrc(URL.createObjectURL(file));
    }
  };

  const handleRunTest = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setErrorMsg('');

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await fetch(`${API_URL}/analyze-infrastructure`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.status === 'error') {
        throw new Error(data.message || 'Error occurred during inference');
      }

      setResult(data);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to connect to AI server.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewSrc(null);
    setResult(null);
    setErrorMsg('');
  };

  const crackCount = result?.detections?.cracks?.predictions?.length || 0;
  const rustCount = result?.detections?.rust?.predictions?.length || 0;

  return (
    <div className="container">
      {/* Simple Header */}
      <div className="header">
        <div>
          <h1>AI Server Test Page</h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            FastAPI AI Engine ({API_URL})
          </p>
        </div>
        <div>
          <span
            className={`status-badge ${
              serverOnline === true
                ? 'online'
                : serverOnline === false
                ? 'offline'
                : 'checking'
            }`}
          >
            {serverOnline === true
              ? '● AI Server Online'
              : serverOnline === false
              ? '● AI Server Offline'
              : 'Checking...'}
          </span>
        </div>
      </div>

      {/* Step 1: Upload */}
      <div className="section">
        <div className="section-title">1. Select an Image to Test</div>
        <div className="upload-box">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="file-input"
          />
          {selectedFile && (
            <p style={{ marginTop: '8px', fontSize: '0.85rem', color: '#334155' }}>
              Selected: <strong>{selectedFile.name}</strong> (
              {(selectedFile.size / 1024).toFixed(1)} KB)
            </p>
          )}
        </div>

        <div>
          <button
            className="btn btn-primary"
            onClick={handleRunTest}
            disabled={!selectedFile || loading}
          >
            {loading ? 'Running AI Models...' : 'Run Test'}
          </button>
          {selectedFile && (
            <button className="btn btn-secondary" onClick={handleReset} disabled={loading}>
              Clear
            </button>
          )}
        </div>

        {errorMsg && <div className="msg msg-error">Error: {errorMsg}</div>}
        {loading && <div className="msg msg-info">Processing image with Roboflow models...</div>}
      </div>

      {/* Step 2: Image Preview & Results */}
      {previewSrc && (
        <div className="result-box">
          <div className="section-title">2. Test Results & Image Preview</div>

          {result && (
            <div className="summary-cards">
              <div className="card">
                <div className="card-label">Cracks Detected</div>
                <div className="card-value crack-val">{crackCount}</div>
              </div>
              <div className="card">
                <div className="card-label">Rust / Corrosion Detected</div>
                <div className="card-value rust-val">{rustCount}</div>
              </div>
            </div>
          )}

          <div className="canvas-container">
            <canvas ref={canvasRef}></canvas>
          </div>

          {result && (
            <div className="json-output">
              <div className="section-title" style={{ fontSize: '0.9rem' }}>
                Raw JSON Output:
              </div>
              <pre>{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
