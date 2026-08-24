import React, { useState, useRef, useEffect, useCallback } from 'react';
import { IonPage, IonContent } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import {
  ChevronLeft, Camera, FileUp, Type, Sparkles, Zap,
  CheckCircle2, AlertCircle, RefreshCw, Trash2, FileText, Image as ImageIcon,
  SwitchCamera, Eye
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

type TabId = 'text' | 'upload' | 'camera';

interface UploadedFileInfo {
  name: string;
  size: number;
  type: string;
  dataUrl: string;
  isImage: boolean;
  isPdf: boolean;
}

const tabs: { id: TabId; icon: React.ElementType; label: string }[] = [
  { id: 'text', icon: Type, label: 'Text Input' },
  { id: 'upload', icon: FileUp, label: 'Upload File' },
  { id: 'camera', icon: Camera, label: 'Live Camera' },
];

export const Capture: React.FC = () => {
  const history = useHistory();
  const { state, setCapture } = useSession();
  const [tab, setTab] = useState<TabId>('text');
  const [text, setText] = useState('');
  const [uploadedFile, setUploadedFile] = useState<UploadedFileInfo | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Camera stream states
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedSnapshot, setCapturedSnapshot] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const sampleBills: Record<string, string> = {
    bill: `HOSPITAL INVOICE #2024-8831
Patient: Rahul Sharma
Date: 14/08/2024
Department: Radiology & Diagnostic

1. Brain MRI with Contrast (3.0 Tesla): ₹8,500 (CGHS Cap: ₹6,400)
2. Paracetamol 500mg Tablets x 10: ₹45 (DPCO Cap: ₹2)
3. Complete Blood Count (CBC): ₹150

Total Amount Billed: ₹8,695`,
    lease: `RESIDENTIAL LEASE AGREEMENT
Landlord: Green Real Estate
Tenant: Priya Mehta
Property: Apt 4B, Koramangala 5th Block

1. Monthly Rent: ₹35,000 / month
2. Security Deposit: ₹3,50,000 (10 Months Demanded - Legal Ceiling: 2 Months)
3. Annual Escalation: 15% automatic yearly increase`,
    gig_payslip: `AGGREGATOR WEEKLY DRIVER SETTLEMENT
Driver: Suresh Kumar
Platform: QuickRide Aggregator
Week: 01 Aug - 07 Aug 2025

1. Gross Customer Fare Billed: ₹5,000
2. Platform Commission Deducted: ₹2,200 (44%)
3. Driver Net Payout: ₹2,800 (56%)
(Note: MoRTH 2025 Clause 17 mandates minimum 80% driver payout: ₹4,000)`,
    insurance: `TPA HEALTH CLAIM SETTLEMENT SUMMARY
Policyholder: Anita Roy
Insurer: Star Health Assurance
Hospital: City Multispeciality

1. Total Incurred Hospital Bill: ₹1,20,000
2. Approved Amount Settled: ₹85,000
3. Disallowed Room Rent Proportionate Deduction: ₹35,000 (Violates IRDAI 2024)`,
    medicine: `PHARMACY CASH MEMO & TAX INVOICE
Store: MedPlus Chemist & Druggist
Date: 10/08/2025

1. Paracetamol 650mg Strip of 10: ₹45 (NPPA DPCO Price Ceiling: ₹22)
2. Azithromycin Tablets IP 500mg (Batch AYC-2407): ₹185 (Flagged under CDSCO NSQ Safety Recall)`,
    challan: `TRAFFIC E-CHALLAN VIOLATION NOTICE
Notice No: DL-8849-2025-CH
Vehicle No: DL-03-CC-9120

1. Alleged Offense: Section 183 MV Act (Speed Violation: 74 km/h in 60 km/h zone)
2. Fine Demanded: ₹2,000
(Note: Lacks mandatory Section 136A electronic speed camera calibration proof)`,
  };

  const handleApplySample = () => {
    setText(sampleBills[state.domain] || sampleBills.bill);
    setErrorMsg(null);
  };

  // ── Camera management ───────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setCapturedSnapshot(null);

    // Stop existing stream if any
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Webcam not supported on this browser/device.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.warn('Video play error:', e));
      }
      setCameraActive(true);
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in browser settings.'
          : 'Could not connect to webcam. Please upload an image file instead.'
      );
      setCameraActive(false);
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // Switch camera between tabs
  useEffect(() => {
    if (tab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [tab, startCamera, stopCamera]);

  const toggleCameraFacing = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedSnapshot(dataUrl);
    stopCamera();
  };

  const retakeSnapshot = () => {
    setCapturedSnapshot(null);
    startCamera();
  };

  // ── File upload handling ────────────────────────────────────────────────────
  const processFile = (file: File) => {
    setErrorMsg(null);
    if (!file) return;

    // Check size limit: 15 MB
    const MAX_SIZE = 15 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setErrorMsg(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 15 MB.`);
      return;
    }

    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isText = file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.json') || file.name.endsWith('.csv');

    const reader = new FileReader();

    if (isImage || isPdf) {
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setUploadedFile({
          name: file.name,
          size: file.size,
          type: file.type || (isPdf ? 'application/pdf' : 'image/jpeg'),
          dataUrl,
          isImage,
          isPdf,
        });
      };
      reader.onerror = () => {
        setErrorMsg('Failed to read document file. Please try again.');
      };
      reader.readAsDataURL(file);
    } else if (isText) {
      reader.onload = () => {
        const textContent = reader.result as string;
        setUploadedFile({
          name: file.name,
          size: file.size,
          type: file.type || 'text/plain',
          dataUrl: textContent,
          isImage: false,
          isPdf: false,
        });
      };
      reader.readAsText(file);
    } else {
      // Default to data URL
      reader.onload = () => {
        setUploadedFile({
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl: reader.result as string,
          isImage: false,
          isPdf: false,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // ── Run analysis ────────────────────────────────────────────────────────────
  const handleAnalyze = () => {
    setErrorMsg(null);

    if (tab === 'text') {
      const payloadText = text.trim() || sampleBills[state.domain] || sampleBills.bill;
      setCapture('text', payloadText);
      history.push('/analyze');
    } else if (tab === 'upload') {
      if (!uploadedFile) {
        setErrorMsg('Please select or drop a document file first.');
        return;
      }
      if (uploadedFile.isImage) {
        setCapture('image', uploadedFile.dataUrl);
      } else if (uploadedFile.isPdf) {
        setCapture('file', uploadedFile.dataUrl);
      } else {
        setCapture('text', uploadedFile.dataUrl);
      }
      history.push('/analyze');
    } else if (tab === 'camera') {
      if (capturedSnapshot) {
        setCapture('camera', capturedSnapshot);
        history.push('/analyze');
      } else if (cameraActive && videoRef.current) {
        // Auto-take snapshot if live camera is active
        takeSnapshot();
        const canvas = canvasRef.current || document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth || 1280;
        canvas.height = videoRef.current.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const snap = canvas.toDataURL('image/jpeg', 0.92);
          setCapture('camera', snap);
          history.push('/analyze');
        }
      } else {
        setErrorMsg('Please capture a photo with the webcam first.');
      }
    }
  };

  const domainLabels: Record<string, string> = {
    bill: 'Scan Medical Bill',
    lease: 'Upload Lease Agreement',
    gig_payslip: 'Scan Gig Payslip',
    insurance: 'Upload Insurance Claim',
    medicine: 'Scan Medicine Bill',
    challan: 'Scan Traffic Challan',
  };

  return (
    <IonPage>
      <IonContent fullscreen scrollX={false} scrollY={true}>
        <div className="mobile-shell" style={{ justifyContent: 'space-between', paddingBottom: 'calc(var(--sab) + 20px)' }}>

          {/* Hidden Canvas for Camera Snapshots */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Top Header */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: 'calc(var(--sat) + 12px)',
              paddingLeft: 20,
              paddingRight: 20,
              paddingBottom: 16,
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(5, 5, 8, 0.85)',
              backdropFilter: 'blur(20px)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  onClick={() => history.goBack()}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#ffffff',
                  }}
                >
                  <ChevronLeft size={22} />
                </button>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--c-text-3)', margin: 0, marginBottom: 2 }}>
                    Evidence Input · {state.domain.toUpperCase()}
                  </p>
                  <h1 style={{ fontSize: 19, fontWeight: 900, letterSpacing: '-0.4px', color: '#ffffff', margin: 0 }}>
                    {domainLabels[state.domain] || 'Upload Document'}
                  </h1>
                </div>
              </div>
            </div>

            {/* Error Notification Banner */}
            <AnimatePresence>
              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  style={{
                    margin: '12px 20px 0',
                    padding: '10px 14px',
                    borderRadius: 12,
                    background: 'rgba(251, 113, 133, 0.14)',
                    border: '1px solid var(--c-danger-border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <AlertCircle size={16} color="var(--c-danger)" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-danger)', flex: 1 }}>{errorMsg}</span>
                  <button onClick={() => setErrorMsg(null)} style={{ background: 'none', border: 'none', color: 'var(--c-text-3)', cursor: 'pointer', fontSize: 11 }}>
                    ✕
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Segmented Mode Selector */}
            <div style={{ padding: '16px 20px' }}>
              <div style={{
                display: 'flex',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 14,
                padding: 4,
                gap: 4,
                boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.6)',
              }}>
                {tabs.map(t => {
                  const Icon = t.icon;
                  const active = tab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        setTab(t.id);
                        setErrorMsg(null);
                      }}
                      style={{
                        flex: 1,
                        height: 40,
                        borderRadius: 10,
                        fontSize: 13,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        cursor: 'pointer',
                        fontFamily: 'Inter, sans-serif',
                        transition: 'all 0.15s ease',
                        background: active ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                        color: active ? '#ffffff' : 'var(--c-text-3)',
                        border: active ? '1px solid rgba(255, 255, 255, 0.18)' : '1px solid transparent',
                        boxShadow: active ? '0 4px 12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2)' : 'none',
                      }}
                    >
                      <Icon size={16} color={active ? '#ffffff' : 'var(--c-text-3)'} />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Main Interactive Tab Area */}
            <div style={{ padding: '0 20px' }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* ──────────────────────────────────────────────────────────
                      TAB 1: TEXT INPUT TAB
                     ────────────────────────────────────────────────────────── */}
                  {tab === 'text' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.035)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: 18,
                        padding: 16,
                        height: 240,
                        display: 'flex',
                        flexDirection: 'column',
                      }}>
                        <textarea
                          value={text}
                          onChange={e => setText(e.target.value)}
                          placeholder={`Paste invoice text, line items or contract clauses here...`}
                          style={{
                            width: '100%',
                            flex: 1,
                            background: 'transparent',
                            border: 'none',
                            color: '#ffffff',
                            fontSize: 14,
                            lineHeight: 1.65,
                            resize: 'none',
                            outline: 'none',
                            fontFamily: 'Inter, sans-serif',
                          }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                          <span style={{ fontSize: 11, color: 'var(--c-text-3)', fontFamily: 'IBM Plex Mono, monospace' }}>
                            {text.length > 0 ? `${text.length} characters` : 'Ready for input'}
                          </span>
                          {text.length > 0 && (
                            <button
                              onClick={() => setText('')}
                              style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-danger)', cursor: 'pointer', background: 'none', border: 'none' }}
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 1-Tap Quick Sample Auto-Fill Preset */}
                      <button
                        onClick={handleApplySample}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          padding: '13px 16px',
                          borderRadius: 14,
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.08)',
                          color: '#ffffff',
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        <Zap size={14} color="#ffffff" />
                        Auto-fill Statutory Sample ({state.domain.toUpperCase()})
                      </button>
                    </div>
                  )}

                  {/* ──────────────────────────────────────────────────────────
                      TAB 2: FILE UPLOAD TAB (Real OCR / PDF Upload)
                     ────────────────────────────────────────────────────────── */}
                  {tab === 'upload' && (
                    <div>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*,.pdf,.txt,.json,.csv"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                      />

                      {!uploadedFile ? (
                        <div
                          onClick={() => fileRef.current?.click()}
                          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                          onDragLeave={() => setIsDragging(false)}
                          onDrop={handleDrop}
                          style={{
                            background: isDragging ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.035)',
                            border: isDragging ? '2px dashed #ffffff' : '1.5px dashed rgba(255, 255, 255, 0.22)',
                            boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(20px)',
                            borderRadius: 20,
                            padding: '44px 20px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 14,
                            cursor: 'pointer',
                            textAlign: 'center',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <div style={{
                            width: 60,
                            height: 60,
                            borderRadius: 18,
                            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.04) 100%)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            <FileUp size={30} color="#ffffff" />
                          </div>

                          <div>
                            <p style={{ fontSize: 16, fontWeight: 800, color: '#ffffff', marginBottom: 4 }}>
                              Choose Document File
                            </p>
                            <p style={{ fontSize: 13, color: 'var(--c-text-2)', margin: 0 }}>
                              Click or drop JPG, PNG, WebP or PDF here
                            </p>
                          </div>

                          <div style={{
                            display: 'flex',
                            gap: 8,
                            alignItems: 'center',
                          }}>
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: 20,
                              background: 'rgba(255, 255, 255, 0.06)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              fontSize: 10,
                              fontWeight: 700,
                              color: 'var(--c-text-3)',
                              letterSpacing: '0.4px',
                            }}>
                              PDF / OCR IMAGES
                            </span>
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: 20,
                              background: 'rgba(255, 255, 255, 0.06)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              fontSize: 10,
                              fontWeight: 700,
                              color: 'var(--c-text-3)',
                            }}>
                              MAX 15 MB
                            </span>
                          </div>
                        </div>
                      ) : (
                        /* Selected File Card Preview */
                        <div style={{
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid rgba(52, 211, 153, 0.4)',
                          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
                          backdropFilter: 'blur(20px)',
                          borderRadius: 20,
                          padding: 20,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 16,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                              {uploadedFile.isImage ? (
                                <div style={{
                                  width: 48,
                                  height: 48,
                                  borderRadius: 12,
                                  overflow: 'hidden',
                                  border: '1px solid rgba(255, 255, 255, 0.2)',
                                  background: '#000000',
                                  flexShrink: 0,
                                }}>
                                  <img
                                    src={uploadedFile.dataUrl}
                                    alt="Preview"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  />
                                </div>
                              ) : (
                                <div style={{
                                  width: 48,
                                  height: 48,
                                  borderRadius: 12,
                                  background: 'rgba(255, 255, 255, 0.08)',
                                  border: '1px solid rgba(255, 255, 255, 0.15)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}>
                                  <FileText size={24} color="var(--c-success)" />
                                </div>
                              )}

                              <div style={{ minWidth: 0 }}>
                                <p style={{
                                  fontSize: 14,
                                  fontWeight: 800,
                                  color: '#ffffff',
                                  margin: 0,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}>
                                  {uploadedFile.name}
                                </p>
                                <p style={{ fontSize: 12, color: 'var(--c-text-3)', margin: '2px 0 0 0', fontFamily: 'IBM Plex Mono, monospace' }}>
                                  {formatFileSize(uploadedFile.size)} · {uploadedFile.isPdf ? 'PDF DOCUMENT' : (uploadedFile.isImage ? 'OCR IMAGE' : 'DOCUMENT')}
                                </p>
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                setUploadedFile(null);
                                if (fileRef.current) fileRef.current.value = '';
                              }}
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 10,
                                background: 'rgba(251, 113, 133, 0.12)',
                                border: '1px solid var(--c-danger-border)',
                                color: 'var(--c-danger)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                              }}
                              title="Remove file"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>

                          <div style={{
                            padding: '10px 14px',
                            borderRadius: 12,
                            background: 'rgba(52, 211, 153, 0.08)',
                            border: '1px solid rgba(52, 211, 153, 0.25)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                          }}>
                            <CheckCircle2 size={16} color="var(--c-success)" />
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-success)' }}>
                              File loaded into memory — Ready for OCR analysis
                            </span>
                          </div>

                          <button
                            onClick={() => fileRef.current?.click()}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--c-text-2)',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                              textDecoration: 'underline',
                              textAlign: 'center',
                            }}
                          >
                            Choose a different file
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ──────────────────────────────────────────────────────────
                      TAB 3: LIVE CAMERA TAB (Webcam Stream & Snapshot)
                     ────────────────────────────────────────────────────────── */}
                  {tab === 'camera' && (
                    <div>
                      {!capturedSnapshot ? (
                        <div style={{
                          height: 300,
                          borderRadius: 20,
                          background: '#000000',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.95), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                          position: 'relative',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          {/* Live Video Feed */}
                          {cameraActive && !cameraError ? (
                            <video
                              ref={videoRef}
                              autoPlay
                              playsInline
                              muted
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                              }}
                            />
                          ) : (
                            <div style={{ padding: 24, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                              <Camera size={36} color="var(--c-text-3)" />
                              <p style={{ fontSize: 13, color: 'var(--c-text-2)', margin: 0 }}>
                                {cameraError || 'Connecting to device camera…'}
                              </p>
                              {cameraError && (
                                <button
                                  onClick={startCamera}
                                  style={{
                                    marginTop: 6,
                                    padding: '8px 14px',
                                    borderRadius: 10,
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    color: '#ffffff',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                  }}
                                >
                                  <RefreshCw size={13} /> Retry Camera Access
                                </button>
                              )}
                            </div>
                          )}

                          {/* Viewfinder Target Laser Overlay */}
                          {cameraActive && (
                            <>
                              <div style={{
                                position: 'absolute',
                                width: '82%',
                                height: '78%',
                                border: '1.5px dashed rgba(255, 255, 255, 0.4)',
                                borderRadius: 14,
                                pointerEvents: 'none',
                              }}>
                                <motion.div
                                  animate={{ y: [0, 200, 0] }}
                                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                                  style={{
                                    height: 1.5,
                                    width: '100%',
                                    background: 'linear-gradient(90deg, transparent, #34d399, transparent)',
                                    boxShadow: '0 0 12px rgba(52, 211, 153, 0.8)',
                                  }}
                                />
                              </div>

                              {/* Camera flip control */}
                              <button
                                onClick={toggleCameraFacing}
                                style={{
                                  position: 'absolute',
                                  top: 14,
                                  right: 14,
                                  width: 38,
                                  height: 38,
                                  borderRadius: 12,
                                  background: 'rgba(0, 0, 0, 0.6)',
                                  border: '1px solid rgba(255, 255, 255, 0.2)',
                                  color: '#ffffff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  zIndex: 10,
                                }}
                                title="Switch camera"
                              >
                                <SwitchCamera size={18} />
                              </button>

                              {/* Shutter snapshot button */}
                              <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 10 }}>
                                <motion.button
                                  whileTap={{ scale: 0.92 }}
                                  onClick={takeSnapshot}
                                  style={{
                                    width: 58,
                                    height: 58,
                                    borderRadius: '50%',
                                    background: '#ffffff',
                                    border: '4px solid rgba(0, 0, 0, 0.4)',
                                    boxShadow: '0 0 20px rgba(0, 0, 0, 0.8)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                  title="Capture snapshot"
                                >
                                  <div style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid #050508' }} />
                                </motion.button>
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        /* Captured Snapshot Preview */
                        <div style={{
                          borderRadius: 20,
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.85)',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 12,
                          padding: 16,
                        }}>
                          <div style={{
                            height: 220,
                            borderRadius: 14,
                            overflow: 'hidden',
                            position: 'relative',
                            background: '#000000',
                          }}>
                            <img
                              src={capturedSnapshot}
                              alt="Captured snapshot"
                              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            />
                            <div style={{
                              position: 'absolute',
                              bottom: 8,
                              left: 8,
                              padding: '4px 10px',
                              borderRadius: 8,
                              background: 'rgba(0, 0, 0, 0.7)',
                              fontSize: 11,
                              fontWeight: 700,
                              color: 'var(--c-success)',
                            }}>
                              ✓ Snapshot Captured
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: 10 }}>
                            <button
                              onClick={retakeSnapshot}
                              style={{
                                flex: 1,
                                padding: '10px 14px',
                                borderRadius: 12,
                                background: 'rgba(255, 255, 255, 0.06)',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                color: 'var(--c-text-2)',
                                fontSize: 13,
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                              }}
                            >
                              <RefreshCw size={14} /> Retake
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Bottom Action Footer */}
          <div style={{ padding: '24px 20px 0' }}>
            <button
              onClick={handleAnalyze}
              className="btn-primary"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Sparkles size={17} />
              {tab === 'upload' && uploadedFile
                ? `Analyze ${uploadedFile.name}`
                : (tab === 'camera' && capturedSnapshot ? 'Analyze Photo' : 'Run Forensic AI Analysis')}
            </button>
          </div>

        </div>
      </IonContent>
    </IonPage>
  );
};
