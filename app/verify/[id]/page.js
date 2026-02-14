"use client";
import { useEffect, useState, use, useRef, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import {
  Loader2, Linkedin, Download, AlertCircle, CheckCircle,
  Copy, Calendar, User, ShieldCheck, Share2, Twitter,
  Facebook, Link2, Mail, Award, Building, QrCode, X, RefreshCw,
  Clock, TestTube
} from 'lucide-react';
import Image from 'next/image';

// A4 Landscape dimensions
const A4_WIDTH = 842;
const A4_HEIGHT = 595;
const ASPECT_RATIO = A4_WIDTH / A4_HEIGHT;

function CertificatePreview({ elements = [], backgroundImage, certificateRef }) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [ready, setReady] = useState(false);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  // Load Google Fonts and wait for them to be ready
  useEffect(() => {
    const loadFonts = async () => {
      // Add font stylesheet if not already present
      if (!document.querySelector('link[href*="fonts.googleapis.com"]')) {
        const link = document.createElement('link');
        link.href = 'https://fonts.googleapis.com/css2?family=Great+Vibes&family=Dancing+Script:wght@400;700&family=Pacifico&family=Playfair+Display:wght@400;700&family=Merriweather:wght@400;700&family=Lora:wght@400;700&family=Inter:wght@400;700&family=Roboto:wght@400;700&family=Open+Sans:wght@400;700&family=Poppins:wght@400;700&family=Montserrat:wght@400;700&family=Oswald:wght@400;700&family=Bebas+Neue&display=swap';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
      }

      // Wait for fonts to be ready using the Font Loading API
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      // Small additional delay for rendering
      await new Promise(r => setTimeout(r, 100));
      setFontsLoaded(true);
    };

    loadFonts();

    // Fallback timeout
    const timeout = setTimeout(() => setFontsLoaded(true), 3000);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        setScale(containerWidth / A4_WIDTH);
        setReady(true);
      }
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  const renderElement = useCallback((el, idx) => {
    if (el.visible === false) return null;

    const xPercent = parseFloat(el.x) || 50;
    const yPercent = parseFloat(el.y) || 50;
    const opacity = (el.opacity || 100) / 100;

    // Calculate center position as percentage of container
    // This ensures perfect alignment regardless of scale
    if (el.type === 'text') {
      const fontSize = (parseInt(el.fontSize) || 20) * scale;

      return (
        <div
          key={idx}
          style={{
            position: 'absolute',
            left: `${xPercent}%`,
            top: `${yPercent}%`,
            transform: 'translate(-50%, -50%)',
            opacity,
            pointerEvents: 'none',
          }}
        >
          <span
            style={{
              fontSize: `${fontSize}px`,
              fontFamily: `'${el.fontFamily || 'Helvetica'}', sans-serif`,
              fontWeight: el.fontWeight || 'normal',
              fontStyle: el.fontStyle || 'normal',
              color: el.color || '#000000',
              letterSpacing: `${(el.letterSpacing || 0) * scale}px`,
              whiteSpace: 'nowrap',
              display: 'block',
              lineHeight: 1,
            }}
          >
            {el.value}
          </span>
        </div>
      );
    }

    if (el.type === 'image' && el.src) {
      const width = (parseInt(el.width) || 100) * scale;
      const height = el.height ? parseInt(el.height) * scale : width;

      return (
        <div
          key={idx}
          style={{
            position: 'absolute',
            left: `${xPercent}%`,
            top: `${yPercent}%`,
            transform: 'translate(-50%, -50%)',
            opacity,
            pointerEvents: 'none',
          }}
        >
          <img
            src={el.src}
            style={{ width: `${width}px`, height: `${height}px`, objectFit: 'contain' }}
            alt=""
            crossOrigin="anonymous"
          />
        </div>
      );
    }

    if (el.type === 'qrcode') {
      const size = (parseInt(el.size) || 80) * scale;

      return (
        <div
          key={idx}
          style={{
            position: 'absolute',
            left: `${xPercent}%`,
            top: `${yPercent}%`,
            transform: 'translate(-50%, -50%)',
            opacity,
            pointerEvents: 'none',
          }}
        >
          {el.qrDataUrl ? (
            <img
              src={el.qrDataUrl}
              style={{
                width: `${size}px`,
                height: `${size}px`,
                objectFit: 'contain',
                aspectRatio: '1 / 1',
              }}
              alt="QR Code"
            />
          ) : (
            <div
              className="bg-white border flex items-center justify-center"
              style={{ width: `${size}px`, height: `${size}px` }}
            >
              <QrCode size={size * 0.7} className="text-gray-400" />
            </div>
          )}
        </div>
      );
    }

    return null;
  }, [scale]);

  return (
    <div
      ref={(node) => {
        containerRef.current = node;
        if (certificateRef) certificateRef.current = node;
      }}
      className="relative w-full overflow-hidden bg-gray-100"
      style={{ aspectRatio: `${ASPECT_RATIO}` }}
    >
      {backgroundImage && (
        <img
          src={backgroundImage}
          className="absolute inset-0 w-full h-full"
          style={{ objectFit: 'fill' }}
          alt="Certificate Background"
          crossOrigin="anonymous"
        />
      )}

      {ready && fontsLoaded && elements.map(renderElement)}

      {!fontsLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50">
          <Loader2 className="animate-spin text-orange-500" size={24} />
        </div>
      )}
    </div>
  );
}

function ShareModal({ isOpen, onClose, url, title }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold flex items-center gap-2"><Share2 size={20} className="text-orange-500" /> Share</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={18} /></button>
        </div>
        <div className="space-y-3 mb-6">
          <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`I earned my ${title} certificate!`)}&url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" className="w-full bg-black text-white py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-medium"><Twitter size={18} /> Twitter</a>
          <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-medium"><Facebook size={18} /> Facebook</a>
          <a href={`mailto:?subject=${encodeURIComponent(`My ${title} certificate`)}&body=${encodeURIComponent(url)}`} className="w-full bg-gray-600 text-white py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-medium"><Mail size={18} /> Email</a>
        </div>
        <div className="flex gap-2">
          <input type="text" value={url} readOnly className="flex-1 bg-gray-50 border rounded-lg px-3 py-2 text-sm truncate" />
          <button onClick={() => { navigator.clipboard.writeText(url); toast.success('Copied!'); }} className="bg-orange-500 text-white px-4 py-2 rounded-lg font-medium"><Copy size={16} /></button>
        </div>
      </div>
    </div>
  );
}

// PDF Download Component - Uses pdf-lib for direct PDF generation
// This draws directly to PDF canvas for pixel-perfect positioning
function PDFDownloadButton({ fileName, elements, backgroundImage }) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  const handleDownload = async () => {
    setGenerating(true);
    setError(null);

    try {
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');

      // Create PDF document
      const pdfDoc = await PDFDocument.create();

      // Add A4 landscape page
      const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);

      // Helper to detect image type from response
      const embedImage = async (url, bytes) => {
        // Check URL extension first
        const lowerUrl = url.toLowerCase();
        if (lowerUrl.includes('.png') || lowerUrl.includes('image/png')) {
          return await pdfDoc.embedPng(bytes);
        }
        // Try to detect from bytes (PNG starts with specific magic bytes)
        const arr = new Uint8Array(bytes);
        if (arr[0] === 0x89 && arr[1] === 0x50 && arr[2] === 0x4E && arr[3] === 0x47) {
          return await pdfDoc.embedPng(bytes);
        }
        // Default to JPEG
        return await pdfDoc.embedJpg(bytes);
      };

      // Load and embed background image if present
      if (backgroundImage) {
        try {
          const response = await fetch(backgroundImage);
          const imageBytes = await response.arrayBuffer();
          const image = await embedImage(backgroundImage, imageBytes);

          // Draw background to fill entire page
          page.drawImage(image, {
            x: 0,
            y: 0,
            width: A4_WIDTH,
            height: A4_HEIGHT,
          });
        } catch (imgErr) {
          console.warn('Could not load background image:', imgErr);
        }
      }

      // Load standard fonts as fallbacks
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

      // Font cache to avoid re-fetching
      const fontCache = {};

      // Google Fonts CDN URLs for TTF files
      const googleFontUrls = {
        'great vibes': 'https://fonts.gstatic.com/s/greatvibes/v18/RWmMoKWR9v4ksMfaWd_JN-XCg6UKDXlq.ttf',
        'dancing script': 'https://fonts.gstatic.com/s/dancingscript/v25/If2cXTr6YS-zF4S-kcSWSVi_sxjsohD9F50Ruu7BMSo3Sup6hNX6plRP.ttf',
        'pacifico': 'https://fonts.gstatic.com/s/pacifico/v22/FwZY7-Qmy14u9lezJ96A4sijpFu_.ttf',
        'playfair display': 'https://fonts.gstatic.com/s/playfairdisplay/v36/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKdFvUDQZNLo_U2r.ttf',
        'merriweather': 'https://fonts.gstatic.com/s/merriweather/v30/u-440qyriQwlOrhSvowK_l5-fCZM.ttf',
        'lora': 'https://fonts.gstatic.com/s/lora/v32/0QI6MX1D_JOuGQbT0gvTJPa787weuxJBkqs.ttf',
        'inter': 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.ttf',
        'roboto': 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5WZLCzYlKw.ttf',
        'open sans': 'https://fonts.gstatic.com/s/opensans/v35/memSYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZyOOSr4dVJWUgsjZ0B4gaVI.ttf',
        'poppins': 'https://fonts.gstatic.com/s/poppins/v20/pxiEyp8kv8JHgFVrFJDUc1NECPY.ttf',
        'montserrat': 'https://fonts.gstatic.com/s/montserrat/v25/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCtr6Hw5aXo.ttf',
        'oswald': 'https://fonts.gstatic.com/s/oswald/v49/TK3_WkUHHAIjg75cFRf3bXL8LICs1_FvsUZiYySUhiCXAA.ttf',
        'bebas neue': 'https://fonts.gstatic.com/s/bebasneue/v14/JTUSjIg69CK48gW7PXooxW5rygbi49c.ttf',
      };

      // Fetch and embed a Google Font
      const fetchGoogleFont = async (fontFamily) => {
        const fontKey = fontFamily.toLowerCase();

        // Check cache first
        if (fontCache[fontKey]) {
          return fontCache[fontKey];
        }

        // Find matching font URL
        let fontUrl = null;
        for (const [name, url] of Object.entries(googleFontUrls)) {
          if (fontKey.includes(name) || name.includes(fontKey)) {
            fontUrl = url;
            break;
          }
        }

        if (!fontUrl) {
          return null;
        }

        try {
          const response = await fetch(fontUrl);
          const fontBytes = await response.arrayBuffer();
          const font = await pdfDoc.embedFont(fontBytes);
          fontCache[fontKey] = font;
          return font;
        } catch (err) {
          console.warn(`Could not load font ${fontFamily}:`, err);
          return null;
        }
      };

      // Get font for element - tries custom font first, falls back to standard
      const getFontForElement = async (el) => {
        const fontFamily = (el.fontFamily || '').toLowerCase();
        const isBold = el.fontWeight === 'bold' || parseInt(el.fontWeight) >= 700;

        // Try to get custom Google font
        const customFont = await fetchGoogleFont(fontFamily);
        if (customFont) {
          return customFont;
        }

        // Fallback to standard fonts
        // Serif fonts
        if (fontFamily.includes('playfair') || fontFamily.includes('merriweather') ||
          fontFamily.includes('lora') || fontFamily.includes('times') ||
          fontFamily.includes('georgia')) {
          return isBold ? timesRomanBold : timesRoman;
        }

        // Default to Helvetica for sans-serif and decorative fonts
        return isBold ? helveticaBold : helvetica;
      };

      // Parse color from hex to RGB
      const parseColor = (hexColor) => {
        const hex = (hexColor || '#000000').replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16) / 255;
        const g = parseInt(hex.substr(2, 2), 16) / 255;
        const b = parseInt(hex.substr(4, 2), 16) / 255;
        return rgb(r, g, b);
      };

      // Draw each element
      for (const el of (elements || [])) {
        if (el.visible === false) continue;

        const xPercent = parseFloat(el.x) || 50;
        const yPercent = parseFloat(el.y) || 50;
        const opacity = (el.opacity || 100) / 100;

        // Convert percentage to PDF coordinates
        // PDF origin is bottom-left, so we flip Y
        const xPt = (xPercent / 100) * A4_WIDTH;
        const yPt = A4_HEIGHT - ((yPercent / 100) * A4_HEIGHT);

        if (el.type === 'text') {
          const fontSize = parseInt(el.fontSize) || 20;
          const font = await getFontForElement(el);
          const color = parseColor(el.color);
          const text = el.value || '';

          // Calculate text width for centering
          const textWidth = font.widthOfTextAtSize(text, fontSize);

          // Get font metrics for proper vertical centering
          // The ascent is the height above baseline, descent is below
          const fontHeight = font.heightAtSize(fontSize);
          const ascent = font.heightAtSize(fontSize, { descender: false });
          const descent = fontHeight - ascent;

          // Center horizontally
          const drawX = xPt - (textWidth / 2);

          // Center vertically: position baseline so text is visually centered
          // We need to offset by half the cap height (roughly 70% of ascent for most fonts)
          const capHeight = ascent * 0.7;
          const drawY = yPt - (capHeight / 2);

          page.drawText(text, {
            x: drawX,
            y: drawY,
            size: fontSize,
            font: font,
            color: color,
            opacity: opacity,
          });
        }

        if (el.type === 'image' && el.src) {
          try {
            const response = await fetch(el.src);
            const imageBytes = await response.arrayBuffer();
            const image = await embedImage(el.src, imageBytes);

            const width = parseInt(el.width) || 100;
            const height = el.height ? parseInt(el.height) : width;

            // Center the image at the position
            const drawX = xPt - (width / 2);
            const drawY = yPt - (height / 2);

            page.drawImage(image, {
              x: drawX,
              y: drawY,
              width: width,
              height: height,
              opacity: opacity,
            });
          } catch (imgErr) {
            console.warn('Could not load image:', imgErr);
          }
        }

        if (el.type === 'qrcode' && el.qrDataUrl) {
          try {
            // QR code is a data URL, need to convert to bytes
            const base64Data = el.qrDataUrl.split(',')[1];
            const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

            const image = await pdfDoc.embedPng(imageBytes);

            const size = parseInt(el.size) || 80;

            // Center the QR code at the position
            const drawX = xPt - (size / 2);
            const drawY = yPt - (size / 2);

            page.drawImage(image, {
              x: drawX,
              y: drawY,
              width: size,
              height: size,
              opacity: opacity,
            });
          } catch (qrErr) {
            console.warn('Could not load QR code:', qrErr);
          }
        }
      }

      // Save PDF
      const pdfBytes = await pdfDoc.save();

      // Download
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (err) {
      console.error('PDF generation failed:', err);
      setError('Failed to generate PDF. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  if (error) {
    return (
      <button
        onClick={handleDownload}
        className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 font-bold"
      >
        <RefreshCw size={18} /> Retry PDF
      </button>
    );
  }

  return (
    <button
      onClick={handleDownload}
      disabled={generating}
      className="bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-xl flex items-center gap-2 font-bold shadow-lg transition-colors disabled:opacity-50"
    >
      {generating ? (
        <><Loader2 className="animate-spin" size={18} /> Generating...</>
      ) : (
        <><Download size={18} /> Download PDF</>
      )}
    </button>
  );
}

export default function VerifyPage({ params }) {
  const { id } = use(params);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const certificateRef = useRef(null);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') setCurrentUrl(window.location.href);
    if (!id) return;
    const fetchCert = async () => {
      try {
        const docSnap = await getDoc(doc(db, "certificates", id));
        if (docSnap.exists()) setData(docSnap.data());
      } catch (err) { console.error("Error:", err); }
      setLoading(false);
    };
    fetchCert();
  }, [id]);

  const formatDate = (ts) => ts ? new Date(ts.seconds * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';
  const getYear = () => data?.issuedAt ? new Date(data.issuedAt.seconds * 1000).getFullYear() : new Date().getFullYear();
  const getMonth = () => data?.issuedAt ? new Date(data.issuedAt.seconds * 1000).getMonth() + 1 : new Date().getMonth() + 1;

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 to-white">
      <Image src="/logo.png" alt="CertCat Logo" width={128} height={128} quality={100} priority className="mb-4 w-16 h-16 rounded-xl" />
      <Loader2 className="animate-spin text-orange-500" size={32} />
      <p className="text-gray-500 mt-4">Verifying certificate...</p>
    </div>
  );

  // Check if test certificate has expired
  const isTestCert = data?.isTest === true;
  const isExpired = isTestCert && data?.expiresAt && (data.expiresAt.seconds * 1000 < Date.now());

  if (!data) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <AlertCircle size={64} className="text-red-500 mb-4" />
      <h1 className="text-2xl font-bold mb-2">Certificate Not Found</h1>
      <p className="text-gray-500">ID: {id}</p>
    </div>
  );

  if (isExpired) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-orange-50 to-white">
      <Clock size={64} className="text-orange-500 mb-4" />
      <h1 className="text-2xl font-bold mb-2">Test Certificate Expired</h1>
      <p className="text-gray-500 mb-4">This was a preview certificate that has expired.</p>
      <p className="text-sm text-gray-400">ID: {id}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <ShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} url={currentUrl} title={data.eventName} />

      {/* Test Certificate Banner */}
      {isTestCert && !isExpired && (
        <div className="bg-amber-500 text-white py-2 px-4">
          <div className="max-w-6xl mx-auto flex items-center justify-center gap-2 text-sm font-medium">
            <TestTube size={16} />
            <span>Test Certificate Preview</span>
            <span className="opacity-75">|</span>
            <Clock size={14} />
            <span>Expires: {data.expiresAt ? new Date(data.expiresAt.seconds * 1000).toLocaleTimeString() : 'Soon'}</span>
          </div>
        </div>
      )}

      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="CertCat Logo" width={64} height={64} quality={100} priority className="w-8 h-8 rounded-lg" />
            <span className="font-bold">CertCat</span>
          </div>
          <button onClick={() => setShowShareModal(true)} className="p-2 hover:bg-gray-100 rounded-lg"><Share2 size={18} /></button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-5 py-2 rounded-full text-sm font-bold mb-4">
            <CheckCircle size={18} /> Verified Certificate
          </div>
          <h1 className="text-3xl font-bold mb-2">{data.eventName}</h1>
          <p className="text-gray-500">Awarded to <span className="font-semibold text-gray-900">{data.name}</span></p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border overflow-hidden mb-8">
          <CertificatePreview
            elements={data.elements || []}
            backgroundImage={data.templateUrl}
            certificateRef={certificateRef}
          />
        </div>

        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {isClient && (
            <PDFDownloadButton
              fileName={`${data.name}-${data.eventName}-Certificate.pdf`}
              elements={data.elements || []}
              backgroundImage={data.templateUrl}
            />
          )}
          <a href={`https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(data.eventName)}&organizationName=${encodeURIComponent(data.organizer)}&issueYear=${getYear()}&issueMonth=${getMonth()}&certUrl=${encodeURIComponent(currentUrl)}&certId=${id}`} target="_blank" rel="noopener noreferrer" className="bg-[#0077b5] hover:bg-[#006399] text-white px-6 py-3 rounded-xl flex items-center gap-2 font-bold shadow-lg">
            <Linkedin size={18} /> Add to LinkedIn
          </a>
          <button onClick={() => setShowShareModal(true)} className="bg-white border px-6 py-3 rounded-xl flex items-center gap-2 font-bold shadow-sm">
            <Share2 size={18} /> Share
          </button>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="p-6 border-b bg-gray-50 flex items-center gap-2">
            <ShieldCheck size={20} className="text-orange-500" />
            <h3 className="font-bold">Credential Details</h3>
          </div>
          <div className="p-6">
            <div className="grid gap-4 md:grid-cols-4 mb-6">
              {[
                { icon: User, label: 'Recipient', value: data.name },
                { icon: Building, label: 'Issued By', value: data.organizer },
                { icon: Calendar, label: 'Issue Date', value: formatDate(data.issuedAt) },
                { icon: CheckCircle, label: 'Status', value: 'Valid', isStatus: true },
              ].map((item, i) => (
                <div key={i} className={`rounded-xl p-4 ${item.isStatus ? 'bg-green-50' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <item.icon size={14} className={item.isStatus ? 'text-green-500' : 'text-gray-400'} />
                    <span className={`text-xs font-bold uppercase ${item.isStatus ? 'text-green-600' : 'text-gray-400'}`}>{item.label}</span>
                  </div>
                  <p className={`font-semibold truncate ${item.isStatus ? 'text-green-700' : ''}`}>{item.value}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Certificate ID</label>
                <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-xl">
                  <QrCode size={16} className="text-gray-400" />
                  <code className="text-sm font-mono truncate flex-1">{id}</code>
                  <button onClick={() => { navigator.clipboard.writeText(id); toast.success('Copied!'); }} className="p-1 hover:bg-gray-200 rounded"><Copy size={14} /></button>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Verification URL</label>
                <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-xl">
                  <Link2 size={16} className="text-gray-400" />
                  <code className="text-sm font-mono truncate flex-1">{currentUrl}</code>
                  <button onClick={() => { navigator.clipboard.writeText(currentUrl); toast.success('Copied!'); }} className="p-1 hover:bg-gray-200 rounded"><Copy size={14} /></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
