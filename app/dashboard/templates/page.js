"use client";
import { useState, useRef, useEffect, useCallback } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Trash2, Type, Image as ImageIcon, Save, Grid3X3,
  Copy, ChevronUp, ChevronDown, Undo2, Redo2, Lock, Unlock,
  Bold, Italic, Underline, Layers, Eye, EyeOff, QrCode, Layout,
  ZoomIn, ZoomOut, ChevronDown as ChevronDownIcon, X, Wand2, Loader2, AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { uploadImage, compressImage, UPLOAD_LIMITS } from '@/lib/storage-service';
import {
  A4_WIDTH, A4_HEIGHT, ASPECT_RATIO,
  getImageDimensions
} from '@/lib/position-utils';

const SNAP_THRESHOLD = 2;

const FONT_CATEGORIES = {
  'Script': [
    { name: 'Great Vibes', value: 'Great Vibes' },
    { name: 'Dancing Script', value: 'Dancing Script' },
    { name: 'Pacifico', value: 'Pacifico' },
  ],
  'Serif': [
    { name: 'Playfair Display', value: 'Playfair Display' },
    { name: 'Merriweather', value: 'Merriweather' },
    { name: 'Lora', value: 'Lora' },
  ],
  'Sans Serif': [
    { name: 'Inter', value: 'Inter' },
    { name: 'Roboto', value: 'Roboto' },
    { name: 'Open Sans', value: 'Open Sans' },
    { name: 'Poppins', value: 'Poppins' },
    { name: 'Montserrat', value: 'Montserrat' },
  ],
  'Display': [
    { name: 'Oswald', value: 'Oswald' },
    { name: 'Bebas Neue', value: 'Bebas Neue' },
  ],
};

const ALL_FONTS = Object.values(FONT_CATEGORIES).flat();

function FontSelector({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setIsOpen(!isOpen)} className="w-full p-2 border rounded-lg text-left flex items-center justify-between hover:border-orange-400 text-sm" style={{ fontFamily: value }}>
        <span className="truncate">{value}</span>
        <ChevronDownIcon size={14} className={isOpen ? 'rotate-180' : ''} />
      </button>
      {isOpen && (
        <div className="absolute z-50 mt-1 w-64 bg-white border rounded-xl shadow-2xl max-h-64 overflow-y-auto">
          {Object.entries(FONT_CATEGORIES).map(([cat, fonts]) => (
            <div key={cat}>
              <p className="px-3 py-2 text-xs font-bold text-gray-400 uppercase bg-gray-50">{cat}</p>
              {fonts.map(f => (
                <button key={f.value} onClick={() => { onChange(f.value); setIsOpen(false); }} className={`w-full px-3 py-2 text-left hover:bg-orange-50 ${value === f.value ? 'bg-orange-100' : ''}`} style={{ fontFamily: f.value }}>
                  {f.name}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ColorPicker({ value, onChange, label }) {
  const [isOpen, setIsOpen] = useState(false);
  const colors = ['#1a1a2e', '#4a4a6a', '#8b7355', '#c9a959', '#ffffff', '#000000', '#333333', '#666666'];
  
  return (
    <div>
      <label className="text-xs font-bold text-gray-600 mb-1 block">{label}</label>
      <div className="flex gap-2">
        <button onClick={() => setIsOpen(!isOpen)} className="w-10 h-10 rounded-lg border-2 hover:border-orange-400" style={{ backgroundColor: value }} />
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 p-2 border rounded-lg text-sm font-mono" />
      </div>
      {isOpen && (
        <div className="mt-2 p-3 bg-white border rounded-xl shadow-xl">
          <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-16 rounded cursor-pointer" />
          <div className="flex gap-1 mt-2">
            {colors.map((c, i) => (
              <button key={i} onClick={() => { onChange(c); setIsOpen(false); }} className="w-6 h-6 rounded border" style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CreateTemplate() {
  const [user, setUser] = useState(null);
  const [bgImage, setBgImage] = useState(null);
  const [templateName, setTemplateName] = useState("");
  const [elements, setElements] = useState([]);
  const [draggingIdx, setDraggingIdx] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [scale, setScale] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [activePanel, setActivePanel] = useState('elements');
  const [snapX, setSnapX] = useState(false);
  const [snapY, setSnapY] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // Template settings for consistent output
  const [templateSettings, setTemplateSettings] = useState({
    outputWidth: 1684,  // 2x A4 landscape width at 72dpi (high quality)
    outputHeight: 1190, // 2x A4 landscape height at 72dpi
    qrCodeSize: 80,     // Default QR code size in A4 points
  });

  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedo = useRef(false);
  const canvasRef = useRef(null);
  const router = useRouter();

  // Load Google Fonts and wait for them to be ready
  useEffect(() => {
    const loadFonts = async () => {
      // Add font stylesheet
      const link = document.createElement('link');
      link.href = `https://fonts.googleapis.com/css2?family=${ALL_FONTS.map(f => f.value.replace(/ /g, '+')).join('&family=')}&display=swap`;
      link.rel = 'stylesheet';
      document.head.appendChild(link);

      // Wait for fonts to be ready
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
    };
    loadFonts();
  }, []);

  useEffect(() => {
    onAuthStateChanged(auth, (u) => u ? setUser(u) : router.push('/dashboard'));
  }, []);

  useEffect(() => {
    const updateScale = () => {
      if (canvasRef.current) {
        setScale(canvasRef.current.offsetWidth / A4_WIDTH);
      }
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [bgImage, zoom]);

  // History
  useEffect(() => {
    if (isUndoRedo.current) { isUndoRedo.current = false; return; }
    if (elements.length > 0 || history.length === 0) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(JSON.stringify(elements));
      if (newHistory.length > 50) newHistory.shift();
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  }, [elements]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      isUndoRedo.current = true;
      setHistoryIndex(historyIndex - 1);
      setElements(JSON.parse(history[historyIndex - 1]));
      setSelectedIdx(null);
    }
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      isUndoRedo.current = true;
      setHistoryIndex(historyIndex + 1);
      setElements(JSON.parse(history[historyIndex + 1]));
      setSelectedIdx(null);
    }
  }, [historyIndex, history]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIdx !== null) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        e.preventDefault(); deleteElement(selectedIdx);
      }
      if (e.key === 'Escape') setSelectedIdx(null);
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedIdx, elements, undo, redo]);

  // Image upload
  const handleImageUpload = async (e, isBackground = true) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    setUploadError(null);
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        let imageData = event.target.result;
        
        imageData = await compressImage(imageData, {
          maxWidth: isBackground ? 1920 : 800,
          maxHeight: isBackground ? 1400 : 600,
          quality: 0.85
        });
        
        const result = await uploadImage(imageData, {
          folder: isBackground ? 'certcat/backgrounds' : 'certcat/elements',
          type: isBackground ? 'background' : 'element'
        });
        
        if (!result.success) {
          setUploadError(result.error);
          setUploading(false);
          return;
        }
        
        if (isBackground) {
          setBgImage(result.url);
        } else {
          // Get image dimensions to preserve aspect ratio
          try {
            const dims = await getImageDimensions(result.url);
            const defaultWidth = 120;
            const defaultHeight = Math.round(defaultWidth / dims.aspectRatio);

            const newElements = [...elements, {
              type: 'image', src: result.url, x: 50, y: 50,
              width: defaultWidth, height: defaultHeight,
              aspectRatio: dims.aspectRatio,
              opacity: 100, locked: false, visible: true, name: `Image ${elements.length + 1}`
            }];
            setElements(newElements);
            setSelectedIdx(newElements.length - 1);
          } catch {
            // Fallback if we can't get dimensions
            const newElements = [...elements, {
              type: 'image', src: result.url, x: 50, y: 50, width: 120, height: 120,
              opacity: 100, locked: false, visible: true, name: `Image ${elements.length + 1}`
            }];
            setElements(newElements);
            setSelectedIdx(newElements.length - 1);
          }
        }
      } catch (error) {
        setUploadError(error.message || 'Upload failed');
      }
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const addTextField = (preset = null) => {
    const defaults = preset || { fontSize: 40, fontFamily: 'Poppins', fontWeight: 'normal', color: '#000000' };
    const newElements = [...elements, { 
      type: 'text', value: preset?.value || '{name}', x: 50, y: 50, 
      fontSize: defaults.fontSize, fontFamily: defaults.fontFamily, fontWeight: defaults.fontWeight,
      fontStyle: 'normal', textDecoration: 'none', color: defaults.color,
      letterSpacing: 0, opacity: 100, locked: false, visible: true, name: `Text ${elements.length + 1}`
    }];
    setElements(newElements);
    setSelectedIdx(newElements.length - 1);
  };

  const addQRCode = () => {
    const newElements = [...elements, {
      type: 'qrcode', value: '{qr}', x: 85, y: 85, size: templateSettings.qrCodeSize,
      opacity: 100, locked: false, visible: true, name: 'QR Code'
    }];
    setElements(newElements);
    setSelectedIdx(newElements.length - 1);
  };

  const deleteElement = (idx) => { setElements(elements.filter((_, i) => i !== idx)); setSelectedIdx(null); };
  const duplicateElement = (idx) => {
    const el = elements[idx];
    const newEl = { ...el, x: Math.min(el.x + 3, 95), y: Math.min(el.y + 3, 95), name: `${el.name} (copy)` };
    setElements([...elements, newEl]);
    setSelectedIdx(elements.length);
  };
  const updateElement = (idx, updates) => {
    const newElements = [...elements];
    newElements[idx] = { ...newElements[idx], ...updates };
    setElements(newElements);
  };
  const moveLayer = (idx, direction) => {
    const newIdx = direction === 'up' ? idx + 1 : idx - 1;
    if (newIdx < 0 || newIdx >= elements.length) return;
    const newElements = [...elements];
    [newElements[idx], newElements[newIdx]] = [newElements[newIdx], newElements[idx]];
    setElements(newElements);
    setSelectedIdx(newIdx);
  };

  // Get scaled dimensions for elements
  // Position is handled by CSS percentage + transform (matching verify page)
  const getScaledDimensions = useCallback((el) => {
    if (el.type === 'text') {
      return { fontSize: (parseInt(el.fontSize) || 20) * scale };
    }
    if (el.type === 'image') {
      const width = (parseInt(el.width) || 100) * scale;
      const height = el.height ? parseInt(el.height) * scale : width;
      return { width, height };
    }
    if (el.type === 'qrcode') {
      return { size: (parseInt(el.size) || 80) * scale };
    }
    return {};
  }, [scale]);

  const handleMouseDown = (e, idx) => {
    e.preventDefault(); e.stopPropagation();
    if (elements[idx].locked) { setSelectedIdx(idx); return; }
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * 100;
      const mouseY = ((e.clientY - rect.top) / rect.height) * 100;
      setDragOffset({ x: mouseX - elements[idx].x, y: mouseY - elements[idx].y });
    }
    setDraggingIdx(idx);
    setSelectedIdx(idx);
  };
  
  const handleMouseMove = useCallback((e) => {
    if (draggingIdx === null || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    let x = ((e.clientX - rect.left) / rect.width) * 100 - dragOffset.x;
    let y = ((e.clientY - rect.top) / rect.height) * 100 - dragOffset.y;
    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));
    
    let snappedX = false, snappedY = false;
    if (Math.abs(x - 50) < SNAP_THRESHOLD) { x = 50; snappedX = true; }
    if (Math.abs(y - 50) < SNAP_THRESHOLD) { y = 50; snappedY = true; }
    setSnapX(snappedX); setSnapY(snappedY);
    
    const newElements = [...elements];
    newElements[draggingIdx] = { ...newElements[draggingIdx], x, y };
    setElements(newElements);
  }, [draggingIdx, dragOffset, elements]);

  const handleMouseUp = useCallback(() => {
    setDraggingIdx(null);
    setDragOffset({ x: 0, y: 0 });
    setTimeout(() => { setSnapX(false); setSnapY(false); }, 300);
  }, []);

  useEffect(() => {
    if (draggingIdx !== null) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingIdx, handleMouseMove, handleMouseUp]);

  const handleCanvasClick = (e) => {
    if (e.target === canvasRef.current || e.target.classList.contains('bg-image')) setSelectedIdx(null);
  };

  const saveTemplate = async () => {
    if (!templateName) return toast.error("Please enter a template name.");
    if (!bgImage) return toast.error("Please upload a background image.");

    setSaving(true);
    try {
      await addDoc(collection(db, "templates"), {
        userId: user.uid,
        name: templateName,
        imageUrl: bgImage,
        elements: elements,
        settings: templateSettings, // Include output resolution settings
        createdAt: serverTimestamp()
      });
      toast.success("Template saved successfully!");
      router.push('/dashboard');
    } catch (err) {
      console.error('Save error:', err);
      toast.error("Error saving: " + err.message);
    }
    setSaving(false);
  };

  const selectedElement = selectedIdx !== null ? elements[selectedIdx] : null;
  const maxBgSizeMB = (UPLOAD_LIMITS.BACKGROUND / 1024 / 1024).toFixed(0);
  const maxElementSizeMB = (UPLOAD_LIMITS.ELEMENT / 1024 / 1024).toFixed(0);

  return (
    <div className="min-h-screen bg-gray-100 text-black flex flex-col">
      {uploading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 text-center">
            <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
            <p className="font-medium">Uploading...</p>
          </div>
        </div>
      )}

      {uploadError && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="text-red-500" size={24} />
              <h3 className="font-bold text-lg">Upload Failed</h3>
            </div>
            <p className="text-gray-600 mb-4">{uploadError}</p>
            <button onClick={() => setUploadError(null)} className="w-full bg-orange-500 text-white py-2 rounded-lg font-medium">OK</button>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className="bg-white border-b px-4 py-3 flex justify-between items-center shadow-sm flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft size={20}/></Link>
          <input className="text-lg font-bold border-b-2 border-transparent focus:border-orange-500 outline-none px-2 w-48" placeholder="Template Name..." value={templateName} onChange={e => setTemplateName(e.target.value)} />
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg px-2">
            <button onClick={() => setZoom(Math.max(50, zoom - 10))} className="p-1.5 hover:bg-gray-200 rounded"><ZoomOut size={16} /></button>
            <span className="text-xs font-medium w-12 text-center">{zoom}%</span>
            <button onClick={() => setZoom(Math.min(150, zoom + 10))} className="p-1.5 hover:bg-gray-200 rounded"><ZoomIn size={16} /></button>
          </div>
          <button onClick={undo} disabled={historyIndex <= 0} className={`p-2 rounded ${historyIndex > 0 ? 'hover:bg-gray-100' : 'opacity-40'}`}><Undo2 size={18}/></button>
          <button onClick={redo} disabled={historyIndex >= history.length - 1} className={`p-2 rounded ${historyIndex < history.length - 1 ? 'hover:bg-gray-100' : 'opacity-40'}`}><Redo2 size={18}/></button>
          <button onClick={() => setShowGrid(!showGrid)} className={`p-2 rounded ${showGrid ? 'bg-orange-100 text-orange-600' : 'hover:bg-gray-100'}`}><Grid3X3 size={18}/></button>
          <button onClick={saveTemplate} disabled={saving} className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-lg font-bold flex items-center gap-2 ml-2 disabled:opacity-50">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16}/>} {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="flex-grow flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-72 bg-white border-r flex flex-col flex-shrink-0">
          <div className="flex border-b">
            <button onClick={() => setActivePanel('elements')} className={`flex-1 py-3 text-xs font-bold uppercase ${activePanel === 'elements' ? 'text-orange-600 border-b-2 border-orange-500' : 'text-gray-500'}`}>Elements</button>
            <button onClick={() => setActivePanel('layers')} className={`flex-1 py-3 text-xs font-bold uppercase ${activePanel === 'layers' ? 'text-orange-600 border-b-2 border-orange-500' : 'text-gray-500'}`}>Layers</button>
            <button onClick={() => setActivePanel('settings')} className={`flex-1 py-3 text-xs font-bold uppercase ${activePanel === 'settings' ? 'text-orange-600 border-b-2 border-orange-500' : 'text-gray-500'}`}>Settings</button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {activePanel === 'elements' && (
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-bold text-gray-400 mb-3 uppercase">Background</p>
                  <label className="block p-4 border-2 border-dashed rounded-xl hover:bg-orange-50 hover:border-orange-300 cursor-pointer text-center">
                    <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, true)} />
                    <ImageIcon className="mx-auto mb-2 text-gray-400" size={24}/>
                    <span className="text-xs font-medium text-gray-600">{bgImage ? 'Change Background' : 'Upload Background'}</span>
                    <span className="text-[10px] text-gray-400 block mt-1">Max {maxBgSizeMB}MB</span>
                  </label>
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-400 mb-3 uppercase">Field Placeholders</p>
                  <div className="space-y-2">
                    {[
                      { label: 'Recipient Name', value: '{name}', icon: '👤', fontSize: 48, fontFamily: 'Great Vibes' },
                      { label: 'Event Name', value: '{event}', icon: '🎉', fontSize: 20, fontFamily: 'Open Sans' },
                      { label: 'Date', value: '{date}', icon: '📅', fontSize: 16, fontFamily: 'Open Sans' },
                      { label: 'Certificate ID', value: '{id}', icon: '🔑', fontSize: 10, fontFamily: 'Roboto', warning: 'ID is ~20 chars. Use small font (8-12px) and place near edges.' },
                    ].map((p, i) => (
                      <button key={i} onClick={() => addTextField({ value: p.value, fontSize: p.fontSize, fontFamily: p.fontFamily, fontWeight: 'normal', color: '#1a1a2e' })} className="w-full flex items-center gap-3 p-3 bg-gray-50 border rounded-xl hover:border-orange-500 text-sm group relative">
                        <span className="text-lg">{p.icon}</span>
                        <div className="text-left flex-1">
                          <span className="font-medium block">{p.label}</span>
                          <span className="text-xs text-gray-400">{p.value}</span>
                        </div>
                        {p.warning && (
                          <div className="relative">
                            <AlertCircle size={14} className="text-amber-500" />
                            <div className="absolute right-0 top-6 w-48 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 opacity-0 group-hover:opacity-100 pointer-events-none z-50 shadow-lg transition-opacity">
                              {p.warning}
                            </div>
                          </div>
                        )}
                      </button>
                    ))}
                    <button onClick={addQRCode} className="w-full flex items-center gap-3 p-3 bg-gray-50 border rounded-xl hover:border-orange-500 text-sm">
                      <span className="text-lg">📱</span>
                      <div className="text-left"><span className="font-medium block">QR Code</span><span className="text-xs text-gray-400">Verification link</span></div>
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-400 mb-3 uppercase">Add Image</p>
                  <label className="block p-3 border-2 border-dashed rounded-xl hover:bg-orange-50 hover:border-orange-300 cursor-pointer text-center">
                    <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, false)} />
                    <ImageIcon className="mx-auto mb-1 text-gray-400" size={20}/>
                    <span className="text-xs text-gray-600">Upload Logo/Image</span>
                    <span className="text-[10px] text-gray-400 block">Max {maxElementSizeMB}MB</span>
                  </label>
                </div>
              </div>
            )}

            {activePanel === 'layers' && (
              <div className="space-y-2">
                {elements.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">No elements yet</p> : (
                  [...elements].reverse().map((el, ri) => {
                    const idx = elements.length - 1 - ri;
                    return (
                      <div key={idx} onClick={() => setSelectedIdx(idx)} className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer ${selectedIdx === idx ? 'bg-orange-50 border-orange-400' : 'hover:bg-gray-50'}`}>
                        <button onClick={(e) => { e.stopPropagation(); updateElement(idx, { visible: !el.visible }); }} className="p-1">
                          {el.visible ? <Eye size={14} /> : <EyeOff size={14} className="text-gray-300" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium truncate block">{el.name}</span>
                          {el.type === 'text' && <p className="text-xs text-gray-400 truncate">{el.value}</p>}
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); updateElement(idx, { locked: !el.locked }); }} className={el.locked ? 'text-orange-500' : 'text-gray-300'}>
                          {el.locked ? <Lock size={14} /> : <Unlock size={14} />}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); deleteElement(idx); }} className="text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activePanel === 'settings' && (
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-bold text-gray-400 mb-3 uppercase">Output Resolution</p>
                  <p className="text-xs text-gray-500 mb-3">Higher resolution produces better quality certificates but larger file sizes.</p>
                  <div className="space-y-2">
                    {[
                      { label: 'Standard (842×595)', width: 842, height: 595, desc: 'A4 at 72dpi - smaller files' },
                      { label: 'High Quality (1684×1190)', width: 1684, height: 1190, desc: 'A4 at 144dpi - recommended' },
                      { label: 'Print Quality (2526×1785)', width: 2526, height: 1785, desc: 'A4 at 216dpi - best for print' },
                    ].map((preset, i) => (
                      <button
                        key={i}
                        onClick={() => setTemplateSettings(prev => ({ ...prev, outputWidth: preset.width, outputHeight: preset.height }))}
                        className={`w-full p-3 border rounded-xl text-left ${
                          templateSettings.outputWidth === preset.width
                            ? 'bg-orange-50 border-orange-400'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <span className="font-medium text-sm block">{preset.label}</span>
                        <span className="text-xs text-gray-400">{preset.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-400 mb-3 uppercase">Default QR Code Size</p>
                  <p className="text-xs text-gray-500 mb-3">Set the default size for QR codes added to this template.</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Size: {templateSettings.qrCodeSize}px</span>
                    </div>
                    <input
                      type="range"
                      min="40"
                      max="150"
                      value={templateSettings.qrCodeSize}
                      onChange={(e) => setTemplateSettings(prev => ({ ...prev, qrCodeSize: parseInt(e.target.value) }))}
                      className="w-full accent-orange-500"
                    />
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>40px</span>
                      <span>150px</span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <p className="text-xs font-medium text-blue-800 mb-1">Tip</p>
                  <p className="text-xs text-blue-600">QR codes are always generated at 300×300px and scaled to fit. Larger display sizes maintain quality.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-grow bg-gray-200 overflow-auto flex items-center justify-center p-8 min-w-0">
          {!bgImage ? (
            <div className="text-center">
              <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"><ImageIcon size={40} className="text-gray-300" /></div>
              <p className="text-gray-500 font-medium mb-2">Upload a background to start</p>
              <label className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg cursor-pointer font-medium">
                <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, true)} />
                <ImageIcon size={18} /> Choose Image
              </label>
            </div>
          ) : (
            <div 
              ref={canvasRef} 
              className="relative shadow-2xl bg-white select-none" 
              style={{ aspectRatio: `${ASPECT_RATIO}`, width: `${zoom}%`, maxWidth: '100%', maxHeight: '85vh' }} 
              onClick={handleCanvasClick}
            >
              {showGrid && (
                <>
                  <div className={`absolute top-0 bottom-0 left-1/2 w-px pointer-events-none ${snapX ? 'bg-red-500 w-0.5 shadow-lg' : 'bg-orange-300/50'}`} style={{ transform: 'translateX(-50%)' }} />
                  <div className={`absolute left-0 right-0 top-1/2 h-px pointer-events-none ${snapY ? 'bg-red-500 h-0.5 shadow-lg' : 'bg-orange-300/50'}`} style={{ transform: 'translateY(-50%)' }} />
                </>
              )}

              <img 
                src={bgImage} 
                className="bg-image w-full h-full pointer-events-none" 
                style={{ objectFit: 'fill' }}
                alt="Background" 
                onLoad={() => { if (canvasRef.current) setScale(canvasRef.current.offsetWidth / A4_WIDTH); }} 
              />
              
              {scale > 0 && elements.map((el, idx) => {
                if (!el.visible) return null;
                const dims = getScaledDimensions(el);
                const xPercent = parseFloat(el.x) || 50;
                const yPercent = parseFloat(el.y) || 50;

                // All elements use percentage positioning with transform: translate(-50%, -50%)
                // This matches the verify page exactly
                return (
                  <div
                    key={idx}
                    onMouseDown={(e) => handleMouseDown(e, idx)}
                    onClick={(e) => e.stopPropagation()}
                    className={`absolute ${el.locked ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'} ${selectedIdx === idx ? 'z-50' : 'z-10'}`}
                    style={{
                      left: `${xPercent}%`,
                      top: `${yPercent}%`,
                      transform: 'translate(-50%, -50%)',
                      opacity: (el.opacity || 100) / 100
                    }}
                  >
                    {selectedIdx === idx && (
                      <div className={`absolute -inset-2 border-2 rounded pointer-events-none ${el.locked ? 'border-gray-400' : 'border-orange-500'}`}>
                        {!el.locked && <><div className="absolute -top-1 -left-1 w-2 h-2 bg-orange-500 rounded-full"></div><div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full"></div><div className="absolute -bottom-1 -left-1 w-2 h-2 bg-orange-500 rounded-full"></div><div className="absolute -bottom-1 -right-1 w-2 h-2 bg-orange-500 rounded-full"></div></>}
                      </div>
                    )}
                    {el.type === 'text' && <span style={{ fontSize: `${dims.fontSize}px`, fontFamily: `'${el.fontFamily}', sans-serif`, fontWeight: el.fontWeight, fontStyle: el.fontStyle, color: el.color, letterSpacing: `${(el.letterSpacing || 0) * scale}px`, whiteSpace: 'nowrap', lineHeight: 1 }}>{el.value}</span>}
                    {el.type === 'image' && <img src={el.src} style={{ width: `${dims.width}px`, height: `${dims.height}px`, objectFit: 'contain' }} draggable={false} alt="" />}
                    {el.type === 'qrcode' && <div className="flex items-center justify-center bg-white border border-gray-200 rounded" style={{ width: `${dims.size}px`, height: `${dims.size}px` }}><QrCode size={dims.size * 0.7} className="text-gray-800" /></div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="w-72 bg-white border-l overflow-y-auto flex-shrink-0">
          {selectedElement ? (
            <>
              <div className="p-4 border-b bg-gray-50 sticky top-0 flex items-center justify-between">
                <input type="text" value={selectedElement.name || ''} onChange={(e) => updateElement(selectedIdx, { name: e.target.value })} className="font-bold text-sm bg-transparent border-b border-transparent focus:border-orange-500 outline-none w-32" />
                <button onClick={() => setSelectedIdx(null)} className="p-1 hover:bg-gray-200 rounded"><X size={16} /></button>
              </div>

              <div className="p-4 space-y-4">
                <div className="flex gap-2">
                  <button onClick={() => moveLayer(selectedIdx, 'up')} disabled={selectedIdx >= elements.length - 1} className="flex-1 p-2 bg-gray-50 border rounded-lg hover:bg-gray-100 disabled:opacity-40 text-xs font-medium"><ChevronUp size={14} className="inline" /> Forward</button>
                  <button onClick={() => moveLayer(selectedIdx, 'down')} disabled={selectedIdx <= 0} className="flex-1 p-2 bg-gray-50 border rounded-lg hover:bg-gray-100 disabled:opacity-40 text-xs font-medium"><ChevronDown size={14} className="inline" /> Back</button>
                </div>

                {selectedElement.type === 'text' && (
                  <>
                    <div><label className="text-xs font-bold text-gray-600 mb-1 block">Text</label><textarea value={selectedElement.value} onChange={(e) => updateElement(selectedIdx, { value: e.target.value })} className="w-full p-2 border rounded-lg text-sm resize-none" rows={2} /></div>
                    <div><label className="text-xs font-bold text-gray-600 mb-1 block">Font</label><FontSelector value={selectedElement.fontFamily} onChange={(v) => updateElement(selectedIdx, { fontFamily: v })} /></div>
                    <div><label className="text-xs font-bold text-gray-600 mb-1 block">Size ({selectedElement.fontSize}px)</label><input type="range" min="8" max="200" value={selectedElement.fontSize} onChange={(e) => updateElement(selectedIdx, { fontSize: parseInt(e.target.value) })} className="w-full accent-orange-500" /></div>
                    <div className="flex gap-1">
                      <button onClick={() => updateElement(selectedIdx, { fontWeight: selectedElement.fontWeight === 'bold' ? 'normal' : 'bold' })} className={`p-2 rounded border ${selectedElement.fontWeight === 'bold' ? 'bg-orange-100 border-orange-400' : ''}`}><Bold size={16} /></button>
                      <button onClick={() => updateElement(selectedIdx, { fontStyle: selectedElement.fontStyle === 'italic' ? 'normal' : 'italic' })} className={`p-2 rounded border ${selectedElement.fontStyle === 'italic' ? 'bg-orange-100 border-orange-400' : ''}`}><Italic size={16} /></button>
                    </div>
                    <ColorPicker label="Color" value={selectedElement.color} onChange={(v) => updateElement(selectedIdx, { color: v })} />
                  </>
                )}

                {selectedElement.type === 'image' && (
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-1 block">Size ({selectedElement.width}px)</label>
                    <input
                      type="range"
                      min="20"
                      max="600"
                      value={selectedElement.width}
                      onChange={(e) => {
                        const newWidth = parseInt(e.target.value);
                        const aspectRatio = selectedElement.aspectRatio || (selectedElement.height ? selectedElement.width / selectedElement.height : 1);
                        const newHeight = Math.round(newWidth / aspectRatio);
                        updateElement(selectedIdx, { width: newWidth, height: newHeight });
                      }}
                      className="w-full accent-orange-500"
                    />
                  </div>
                )}

                {selectedElement.type === 'qrcode' && (
                  <div><label className="text-xs font-bold text-gray-600 mb-1 block">Size ({selectedElement.size}px)</label><input type="range" min="40" max="200" value={selectedElement.size} onChange={(e) => updateElement(selectedIdx, { size: parseInt(e.target.value) })} className="w-full accent-orange-500" /></div>
                )}

                <div className="pt-4 border-t">
                  <label className="text-xs font-bold text-gray-600 mb-1 block">Opacity ({selectedElement.opacity || 100}%)</label>
                  <input type="range" min="10" max="100" value={selectedElement.opacity || 100} onChange={(e) => updateElement(selectedIdx, { opacity: parseInt(e.target.value) })} className="w-full accent-orange-500" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-[10px] text-gray-400">X (%)</label><input type="number" min="0" max="100" step="0.5" value={parseFloat(selectedElement.x).toFixed(1)} onChange={(e) => updateElement(selectedIdx, { x: parseFloat(e.target.value) || 0 })} className="w-full p-1.5 border rounded text-sm" /></div>
                  <div><label className="text-[10px] text-gray-400">Y (%)</label><input type="number" min="0" max="100" step="0.5" value={parseFloat(selectedElement.y).toFixed(1)} onChange={(e) => updateElement(selectedIdx, { y: parseFloat(e.target.value) || 0 })} className="w-full p-1.5 border rounded text-sm" /></div>
                </div>

                <div className="pt-4 border-t space-y-2">
                  <button onClick={() => duplicateElement(selectedIdx)} className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 py-2 rounded-lg text-sm font-medium"><Copy size={14}/> Duplicate</button>
                  <button onClick={() => updateElement(selectedIdx, { locked: !selectedElement.locked })} className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium ${selectedElement.locked ? 'bg-orange-100 text-orange-700' : 'bg-gray-100'}`}>{selectedElement.locked ? <><Unlock size={14}/> Unlock</> : <><Lock size={14}/> Lock</>}</button>
                  <button onClick={() => deleteElement(selectedIdx)} className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 py-2 rounded-lg text-sm font-medium"><Trash2 size={14}/> Delete</button>
                </div>
              </div>
            </>
          ) : (
            <div className="p-6 text-center text-gray-400">
              <Layers size={32} className="mx-auto mb-2 text-gray-300" />
              <p className="font-medium">No Element Selected</p>
              <p className="text-xs mt-1">Click an element to edit</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}