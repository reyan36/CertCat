"use client";
import { useState, useEffect, useRef, useCallback } from 'react';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';
import Papa from 'papaparse';
import toast from 'react-hot-toast';
import {
  Loader2, LogOut, Plus, Trash2, CheckCircle, Upload,
  History, Award, Users, ChevronDown, ChevronUp,
  AlertCircle, X, Copy, Download, Info, Rocket, Clock, Activity,
  Mail, Send, MessageSquare, TestTube, CheckCircle2, XCircle, Eye, Smartphone, Monitor,
  FileCheck, ExternalLink, Timer
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

const ASPECT_RATIO = 842 / 595;
const CERTIFICATE_LIMIT = 50; // Increased to 50

function TemplatePreview({ template }) {
  return (
    <div className="relative w-full overflow-hidden bg-gray-100" style={{ aspectRatio: `${ASPECT_RATIO}` }}>
      {template.imageUrl ? (
        <img src={template.imageUrl} className="absolute inset-0 w-full h-full object-fill" alt={template.name} />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-400"><Award size={24} /></div>
      )}
    </div>
  );
}

function CSVHelperModal({ isOpen, onClose }) {
  if (!isOpen) return null;
  const sample = `name,email\nJohn Doe,john@example.com\nJane Smith,jane@example.com`;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">CSV Format</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full"><X size={20} /></button>
        </div>
        <pre className="bg-gray-900 text-green-400 p-4 rounded-xl text-sm mb-4 overflow-x-auto">{sample}</pre>
        <div className="flex gap-2">
          <button onClick={() => { navigator.clipboard.writeText(sample); toast.success('Copied to clipboard!'); }} className="flex-1 bg-gray-100 py-2 rounded-xl font-medium text-sm"><Copy size={14} className="inline mr-1" /> Copy</button>
          <button onClick={() => { const blob = new Blob([sample], { type: 'text/csv' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'sample.csv'; a.click(); }} className="flex-1 bg-orange-500 text-white py-2 rounded-xl font-medium text-sm"><Download size={14} className="inline mr-1" /> Download</button>
        </div>
      </div>
    </div>
  );
}

function ProgressModal({ isOpen, progress, total, completed, onClose, providersUsed }) {
  if (!isOpen) return null;
  const pct = total > 0 ? Math.round((progress / total) * 100) : 0;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-8 text-center">
        {!completed ? (
          <>
            <Loader2 className="w-16 h-16 text-orange-500 animate-spin mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Sending Certificates...</h3>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
              <div className="bg-orange-500 h-3 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-sm text-gray-600">{progress} / {total}</p>
          </>
        ) : (
          <>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-green-700 mb-2">Success! 🎉</h3>
            <p className="text-gray-500 mb-4">{total} certificates sent</p>
            {providersUsed && Object.keys(providersUsed).length > 0 && (
              <div className="bg-gray-50 rounded-xl p-3 mb-4 text-left">
                <p className="text-xs font-bold text-gray-500 mb-2">Email Providers Used:</p>
                {Object.entries(providersUsed).map(([provider, count]) => (
                  <p key={provider} className="text-sm text-gray-600">{provider}: {count} emails</p>
                ))}
              </div>
            )}
            <button onClick={onClose} className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold">Done</button>
          </>
        )}
      </div>
    </div>
  );
}

// Email Preview Modal - Shows exactly how the email will look
function EmailPreviewModal({ isOpen, onClose, onConfirm, eventName, organizerName, customMessage, sampleName = "John Doe" }) {
  const [viewMode, setViewMode] = useState('desktop'); // 'desktop' or 'mobile'

  if (!isOpen) return null;

  const sampleCertId = 'CERT-PREVIEW-123';
  const sampleUrl = 'https://certcat.com/verify/sample';

  const customMessageHTML = customMessage
    ? `<p style="font-size: 15px; color: #555; line-height: 1.6; margin: 24px 0; padding: 20px; background: #fef3c7; border-radius: 12px; border-left: 4px solid #f59e0b;">
        💬 <em>${customMessage}</em>
      </p>`
    : '';

  const emailHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

        <!-- Header -->
        <tr>
          <td style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 48px 40px; text-align: center;">
            <h1 style="color: #fff; margin: 0; font-size: 32px;">🎉 Congratulations!</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 12px 0 0; font-size: 16px;">You've earned a certificate</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding: 48px 40px;">
            <p style="font-size: 18px; color: #333; margin: 0 0 24px;">
              Dear <strong>${sampleName}</strong>,
            </p>

            <p style="font-size: 16px; color: #666; margin: 0 0 16px; line-height: 1.6;">
              You have been awarded a certificate for successfully completing
            </p>

            <p style="font-size: 24px; color: #f97316; margin: 0 0 24px; font-weight: 700; text-align: center;">
              ${eventName || 'Your Event Name'}
            </p>

            <!-- Custom Message -->
            ${customMessageHTML}

            <!-- Certificate ID -->
            <table width="100%" style="background: #f8f9fa; border-radius: 12px; margin-bottom: 32px;">
              <tr>
                <td style="padding: 20px;">
                  <p style="font-size: 11px; color: #999; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1px;">Certificate ID</p>
                  <code style="font-size: 14px; color: #333; font-family: monospace;">${sampleCertId}</code>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table width="100%"><tr><td align="center">
              <a href="${sampleUrl}" style="display: inline-block; background: linear-gradient(135deg, #f97316, #ea580c); color: #fff; text-decoration: none; padding: 18px 48px; border-radius: 10px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 14px rgba(249,115,22,0.4);">
                View & Download Certificate
              </a>
            </td></tr></table>

            <p style="font-size: 14px; color: #999; margin: 32px 0 0; text-align: center;">
              💼 Add this credential to your LinkedIn profile!
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background: #f8f9fa; padding: 24px; text-align: center; border-top: 1px solid #eee;">
            <p style="font-size: 14px; color: #666; margin: 0 0 8px;">Issued by <strong>${organizerName || 'Your Organization'}</strong></p>
            <p style="font-size: 12px; color: #999; margin: 0;">Powered by <span style="color: #f97316; font-weight: 600;">CertCat</span></p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-3">
            <Eye className="text-orange-500" size={20} />
            <h3 className="font-bold text-lg">Email Preview</h3>
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
              This is how recipients will see the email
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-200 rounded-lg p-1">
              <button
                onClick={() => setViewMode('desktop')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'desktop' ? 'bg-white shadow-sm' : 'hover:bg-gray-100'}`}
                title="Desktop view"
              >
                <Monitor size={16} />
              </button>
              <button
                onClick={() => setViewMode('mobile')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'mobile' ? 'bg-white shadow-sm' : 'hover:bg-gray-100'}`}
                title="Mobile view"
              >
                <Smartphone size={16} />
              </button>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Email Preview */}
        <div className="flex-1 overflow-auto bg-gray-100 p-4">
          <div className={`mx-auto transition-all duration-300 ${viewMode === 'mobile' ? 'max-w-[375px]' : 'max-w-[700px]'}`}>
            {/* Email Client Header Mockup */}
            <div className="bg-white rounded-t-xl border border-b-0 p-3">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                  <Award className="text-white" size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{organizerName || 'Your Organization'}</p>
                  <p className="text-xs text-gray-500 truncate">via CertCat</p>
                </div>
              </div>
              <p className="font-bold text-gray-900">🎉 Your Certificate for {eventName || 'Your Event Name'}</p>
              <p className="text-xs text-gray-500 mt-1">To: {sampleName.toLowerCase().replace(' ', '.')}@example.com</p>
            </div>

            {/* Email Content */}
            <div className="bg-white rounded-b-xl border shadow-lg">
              <iframe
                srcDoc={emailHTML}
                className="w-full border-0"
                style={{ height: viewMode === 'mobile' ? '600px' : '700px' }}
                title="Email Preview"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            <Info size={14} className="inline mr-1" />
            Preview shows sample data. Actual emails will contain real recipient information.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 border rounded-xl font-medium hover:bg-gray-100"
            >
              Edit Campaign
            </button>
            <button
              onClick={onConfirm}
              className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-bold flex items-center gap-2 hover:shadow-lg"
            >
              <Rocket size={18} /> Send Certificates
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Test Email Component
function TestEmailSection({ user }) {
  const [testEmail, setTestEmail] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [providers, setProviders] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load provider status
    fetch('/api/test-email')
      .then(res => res.json())
      .then(data => {
        setProviders(data.providers);
        // Auto-select first configured provider
        const firstConfigured = Object.entries(data.providers || {}).find(([_, p]) => p.configured);
        if (firstConfigured) setSelectedProvider(firstConfigured[0]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleTest = async () => {
    if (!testEmail || !selectedProvider) return;

    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          to: testEmail,
          userId: user?.uid
        }),
      });

      const data = await res.json();
      setTestResult(data);
    } catch (error) {
      setTestResult({ success: false, error: error.message });
    }

    setTesting(false);
  };

  if (loading) return <div className="p-4 text-center text-gray-400"><Loader2 className="animate-spin inline mr-2" size={16} /> Loading providers...</div>;

  const configuredProviders = Object.entries(providers || {}).filter(([_, p]) => p.configured);

  return (
    <div className="bg-white rounded-2xl border shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <TestTube size={18} className="text-orange-500" />
        <h3 className="font-bold">Test Email Providers</h3>
        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-500">5/day limit</span>
      </div>

      {configuredProviders.length === 0 ? (
        <p className="text-sm text-gray-500">No email providers configured. Check your .env.local file.</p>
      ) : (
        <>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Provider</label>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="w-full border rounded-lg p-2 text-sm"
              >
                {configuredProviders.map(([key, p]) => (
                  <option key={key} value={key}>
                    {p.name} {p.status === 'verified' ? '✅' : p.status === 'error' ? '❌' : '⚙️'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-500 block mb-1">Send test to</label>
              <input
                type="email"
                placeholder="your@email.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="w-full border rounded-lg p-2 text-sm"
              />
            </div>

            <button
              onClick={handleTest}
              disabled={testing || !testEmail || !selectedProvider}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2"
            >
              {testing ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
              {testing ? 'Sending...' : 'Send Test Email'}
            </button>
          </div>

          {testResult && (
            <div className={`mt-3 p-3 rounded-lg text-sm ${testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {testResult.success ? (
                <><CheckCircle2 size={14} className="inline mr-1" /> {testResult.message}</>
              ) : (
                <><XCircle size={14} className="inline mr-1" /> {testResult.error}</>
              )}
              {testResult.help && <p className="text-xs mt-1 opacity-75">{testResult.help}</p>}
            </div>
          )}
        </>
      )}

      <div className="mt-4 pt-4 border-t">
        <p className="text-xs text-gray-400">
          <strong>Provider Status:</strong>
        </p>
        <div className="flex flex-wrap gap-1 mt-2">
          {Object.entries(providers || {}).map(([key, p]) => (
            <span
              key={key}
              className={`text-xs px-2 py-0.5 rounded-full ${p.status === 'verified' ? 'bg-green-100 text-green-700' :
                  p.status === 'configured' ? 'bg-blue-100 text-blue-700' :
                    p.status === 'error' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-500'
                }`}
            >
              {p.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [csv, setCsv] = useState(null);
  const [csvData, setCsvData] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [eventName, setEventName] = useState("");
  const [organizerName, setOrganizerName] = useState("");
  const [customMessage, setCustomMessage] = useState(""); // NEW: Custom message
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [showHistory, setShowHistory] = useState(true);
  const [showCSVHelper, setShowCSVHelper] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, completed: false });
  const [providersUsed, setProvidersUsed] = useState({});
  const [totalCerts, setTotalCerts] = useState(0);
  const [showTestEmail, setShowTestEmail] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [testCertLoading, setTestCertLoading] = useState(false);
  const [testCertResult, setTestCertResult] = useState(null);
  const csvInputRef = useRef(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        setOrganizerName(u.displayName || '');

        const tSnap = await getDocs(query(collection(db, "templates"), where("userId", "==", u.uid)));
        setTemplates(tSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const cSnap = await getDocs(query(collection(db, "certificates"), where("organizerEmail", "==", u.email)));
        setTotalCerts(cSnap.size);

        const recent = cSnap.docs.map(d => ({ ...d.data() })).sort((a, b) => (b.issuedAt?.toMillis?.() || 0) - (a.issuedAt?.toMillis?.() || 0));
        const camps = []; const seen = new Set();
        for (const c of recent) {
          if (!seen.has(c.eventName) && camps.length < 5) {
            seen.add(c.eventName);
            camps.push({ eventName: c.eventName, count: recent.filter(r => r.eventName === c.eventName).length, date: c.issuedAt?.toDate?.() || new Date() });
          }
        }
        setCampaigns(camps);
      } else setUser(null);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  const handleCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCsv(file);
    Papa.parse(file, { header: true, skipEmptyLines: true, complete: (r) => setCsvData(r.data) });
  };

  // Reset CSV input to allow re-uploading same file or new file
  const resetCSVInput = useCallback(() => {
    setCsv(null);
    setCsvData(null);
    if (csvInputRef.current) {
      csvInputRef.current.value = '';
    }
  }, []);

  // Show email preview before launching
  const handlePreviewAndLaunch = () => {
    if (!csv || !selectedTemplate || !eventName || !organizerName) return toast.error("Please fill all required fields");

    const remaining = CERTIFICATE_LIMIT - totalCerts;
    if (csvData.length > remaining) {
      return toast.error(`You can only issue ${remaining} more certificates. You have ${csvData.length} participants.`);
    }

    // Show preview modal
    setShowEmailPreview(true);
  };

  // Create a test certificate that expires in 1 hour
  const handleTestCertificate = async () => {
    if (!selectedTemplate || !eventName) return toast.error("Select a template and enter event name first");

    setTestCertLoading(true);
    setTestCertResult(null);

    try {
      const res = await fetch('/api/test-certificate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventName,
          organizerName: organizerName || user?.displayName || 'Test Organization',
          templateData: selectedTemplate,
          testName: 'John Doe (Preview)',
        }),
      });

      const data = await res.json();

      if (data.success) {
        setTestCertResult(data);
        toast.success('Test certificate created!');
      } else {
        toast.error(data.error || 'Failed to create test certificate');
      }
    } catch (err) {
      toast.error(err.message);
    }

    setTestCertLoading(false);
  };

  const handleLaunch = async () => {
    // Close preview modal
    setShowEmailPreview(false);

    setLoading(true);
    setShowProgress(true);
    setProgress({ current: 0, total: csvData?.length || 0, completed: false });
    setProvidersUsed({});

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participants: csvData,
          eventName,
          organizerName,
          organizerEmail: user.email,
          templateData: selectedTemplate,
          customMessage, // NEW: Include custom message
        })
      });
      const data = await res.json();

      if (data.success) {
        setProgress({ current: data.count, total: data.count, completed: true });
        setProvidersUsed(data.emails?.providers || {});
        setTotalCerts(prev => prev + data.count);
        setCampaigns(prev => [{ eventName, count: data.count, date: new Date() }, ...prev].slice(0, 5));
        // Reset all form fields including CSV input ref
        resetCSVInput();
        setEventName("");
        setSelectedTemplate(null);
        setCustomMessage("");
        toast.success(`Successfully generated ${data.count} certificates!`);
      } else {
        setShowProgress(false);
        toast.error(data.error || "Error generating certificates");
      }
    } catch (e) {
      setShowProgress(false);
      toast.error(e.message);
    }
    setLoading(false);
  };

  const deleteTemplate = async (id, e) => {
    e.stopPropagation();
    if (confirm("Delete template?")) {
      await deleteDoc(doc(db, "templates", id));
      setTemplates(t => t.filter(x => x.id !== id));
      if (selectedTemplate?.id === id) setSelectedTemplate(null);
    }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-12 h-12 text-orange-500 animate-spin" /></div>;

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-white">
      <div className="text-center p-10 bg-white rounded-3xl shadow-xl max-w-md w-full mx-4">
        <Image src="/logo.png" alt="CertCat Logo" width={128} height={128} quality={100} priority className="mx-auto mb-4 w-16 h-16 rounded-xl" />
        <h1 className="text-2xl font-bold mb-2">Welcome to CertCat</h1>
        <p className="text-gray-500 mb-6">Sign in to create certificates</p>
        <button onClick={() => signInWithPopup(auth, new GoogleAuthProvider())} className="w-full bg-black text-white font-bold py-4 rounded-xl">
          Continue with Google
        </button>
      </div>
    </div>
  );

  const usagePercent = Math.min((totalCerts / CERTIFICATE_LIMIT) * 100, 100);
  const remaining = CERTIFICATE_LIMIT - totalCerts;

  return (
    <div className="min-h-screen bg-gray-50">
      <CSVHelperModal isOpen={showCSVHelper} onClose={() => setShowCSVHelper(false)} />
      <ProgressModal isOpen={showProgress} progress={progress.current} total={progress.total} completed={progress.completed} onClose={() => setShowProgress(false)} providersUsed={providersUsed} />

      {/* Test Certificate Result Modal */}
      {testCertResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setTestCertResult(null)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <FileCheck className="text-green-600" size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg">Test Certificate Created!</h3>
                <p className="text-sm text-gray-500">Preview expires in 1 hour</p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 text-amber-800 text-sm mb-2">
                <Timer size={16} />
                <span className="font-medium">Expires: {new Date(testCertResult.expiresAt).toLocaleTimeString()}</span>
              </div>
              <p className="text-xs text-amber-700">This is a temporary preview certificate. It will not be counted toward your limit.</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 mb-4">
              <label className="text-xs text-gray-500 block mb-1">Certificate ID</label>
              <code className="text-sm font-mono">{testCertResult.certificateId}</code>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setTestCertResult(null)}
                className="flex-1 py-2.5 border rounded-xl font-medium hover:bg-gray-50"
              >
                Close
              </button>
              <a
                href={testCertResult.verificationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-orange-600"
              >
                <ExternalLink size={16} /> View Certificate
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Test Certificate Loading */}
      {testCertLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 text-center">
            <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
            <p className="font-medium">Creating test certificate...</p>
          </div>
        </div>
      )}

      <EmailPreviewModal
        isOpen={showEmailPreview}
        onClose={() => setShowEmailPreview(false)}
        onConfirm={handleLaunch}
        eventName={eventName}
        organizerName={organizerName}
        customMessage={customMessage}
        sampleName={csvData?.[0]?.name || "John Doe"}
      />

      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="CertCat Logo" width={80} height={80} quality={100} priority className="w-10 h-10 rounded-xl" />
            <span className="text-xl font-bold">CertCat</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/status" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
              <Activity size={14} /> Status
            </Link>
            <Link href="/dashboard/templates" className="bg-black hover:bg-gray-800 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm font-bold">
              <Plus size={18} /> New Template
            </Link>
            <div className="flex items-center gap-3 pl-4 border-l">
              <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} className="w-9 h-9 rounded-full" alt="" />
              <button onClick={() => auth.signOut()} className="text-gray-400 hover:text-gray-600 p-2"><LogOut size={18} /></button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Usage Stats */}
        <div className="bg-white rounded-2xl p-6 border shadow-sm mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Award className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Certificates Issued</p>
                <p className="text-2xl font-bold">{totalCerts} <span className="text-gray-400 text-lg font-normal">/ {CERTIFICATE_LIMIT}</span></p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-sm font-medium ${remaining <= 10 ? 'text-red-500' : 'text-green-600'}`}>{remaining} remaining</p>
              <p className="text-xs text-gray-400">Free plan</p>
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div className={`h-3 rounded-full transition-all ${usagePercent >= 90 ? 'bg-red-500' : usagePercent >= 70 ? 'bg-yellow-500' : 'bg-orange-500'}`} style={{ width: `${usagePercent}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
              <div className="p-6 border-b bg-gradient-to-r from-orange-500 to-orange-600">
                <h2 className="text-xl font-bold text-white flex items-center gap-2"><Rocket size={24} /> Launch Campaign</h2>
              </div>

              <div className="p-6 space-y-6">
                {/* Step 1: Event Details */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                    <label className="font-bold">Event Details</label>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input className="border p-3 rounded-xl" placeholder="Event Name *" value={eventName} onChange={e => setEventName(e.target.value)} />
                    <input className="border p-3 rounded-xl" placeholder="Organization *" value={organizerName} onChange={e => setOrganizerName(e.target.value)} />
                  </div>
                </div>

                {/* Step 2: Template */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                    <label className="font-bold">Select Template</label>
                  </div>
                  {templates.length === 0 ? (
                    <div className="border-2 border-dashed rounded-2xl p-8 text-center">
                      <p className="text-gray-500 mb-4">No templates yet</p>
                      <Link href="/dashboard/templates" className="bg-orange-500 text-white px-6 py-2 rounded-xl inline-flex items-center gap-2">
                        <Plus size={18} /> Create Template
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {templates.map(t => (
                        <div key={t.id} onClick={() => setSelectedTemplate(t)} className={`relative group rounded-2xl border-2 overflow-hidden cursor-pointer transition-all ${selectedTemplate?.id === t.id ? 'border-orange-500 ring-4 ring-orange-100' : 'border-gray-100 hover:border-gray-300'}`}>
                          {selectedTemplate?.id === t.id && <div className="absolute top-2 left-2 bg-orange-500 text-white p-1 rounded-full z-20"><CheckCircle size={14} /></div>}
                          <button onClick={(e) => deleteTemplate(t.id, e)} className="absolute top-2 right-2 bg-white/90 text-red-500 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white z-30"><Trash2 size={14} /></button>
                          <TemplatePreview template={t} />
                          <div className={`p-2 text-center text-xs font-bold truncate ${selectedTemplate?.id === t.id ? 'bg-orange-500 text-white' : 'bg-gray-50'}`}>{t.name}</div>
                        </div>
                      ))}
                      <Link href="/dashboard/templates" className="border-2 border-dashed rounded-2xl flex flex-col items-center justify-center min-h-[140px] text-gray-400 hover:text-orange-500 hover:border-orange-300">
                        <Plus size={20} /><span className="text-xs mt-2">New</span>
                      </Link>
                    </div>
                  )}
                </div>

                {/* Step 3: CSV */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                      <label className="font-bold">Upload Participants</label>
                    </div>
                    <button onClick={() => setShowCSVHelper(true)} className="text-xs text-orange-600 flex items-center gap-1"><Info size={14} /> CSV Guide</button>
                  </div>
                  <label className={`block border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer ${csv ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-orange-300'}`}>
                    <input ref={csvInputRef} type="file" className="hidden" accept=".csv" onChange={handleCSV} />
                    {csv ? (
                      <div className="flex items-center justify-center gap-3">
                        <CheckCircle className="text-green-600" />
                        <span className="text-green-700 font-medium">{csv.name} ({csvData?.length || 0} participants)</span>
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); resetCSVInput(); }}><X size={16} className="text-green-600" /></button>
                      </div>
                    ) : (
                      <><Upload className="w-10 h-10 text-gray-300 mx-auto mb-2" /><p className="text-gray-500">Upload CSV (name, email columns)</p></>
                    )}
                  </label>
                </div>

                {/* Step 4: Custom Message (NEW) */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
                    <label className="font-bold">Custom Message</label>
                    <span className="text-xs text-gray-400">(Optional)</span>
                  </div>
                  <div className="relative">
                    <MessageSquare size={18} className="absolute left-3 top-3 text-gray-400" />
                    <textarea
                      className="w-full border rounded-xl p-3 pl-10 resize-none"
                      rows={3}
                      placeholder="Add a personal message to include in the email... (e.g., 'Thank you for participating! We hope to see you at our next event.')"
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      maxLength={500}
                    />
                    <span className="absolute right-3 bottom-3 text-xs text-gray-400">{customMessage.length}/500</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  {/* Test Certificate Button */}
                  <button
                    onClick={handleTestCertificate}
                    disabled={loading || !selectedTemplate || !eventName}
                    className={`flex-1 font-bold py-4 rounded-xl flex items-center justify-center gap-2 text-sm border-2 ${loading || !selectedTemplate || !eventName
                        ? 'bg-gray-50 text-gray-400 border-gray-200'
                        : 'bg-white text-orange-600 border-orange-500 hover:bg-orange-50'
                      }`}
                  >
                    <FileCheck size={18} /> Test Preview
                  </button>

                  {/* Preview & Launch Button */}
                  <button
                    onClick={handlePreviewAndLaunch}
                    disabled={loading || !csv || !selectedTemplate || !eventName || !organizerName || remaining === 0 || (csvData && csvData.length > remaining)}
                    className={`flex-[2] font-bold py-4 rounded-xl flex items-center justify-center gap-2 text-lg ${loading || !csv || !selectedTemplate || !eventName || !organizerName || remaining === 0 || (csvData && csvData.length > remaining)
                        ? 'bg-gray-200 text-gray-400'
                        : 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg hover:shadow-xl'
                      }`}
                  >
                    {loading ? <Loader2 className="animate-spin" /> : <Eye size={20} />} {loading ? 'Processing...' : 'Preview & Launch'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Test Email Section */}
            <div className="bg-white rounded-2xl border shadow-sm">
              <button onClick={() => setShowTestEmail(!showTestEmail)} className="w-full p-4 flex items-center justify-between">
                <span className="font-bold flex items-center gap-2"><Mail size={18} /> Test Email</span>
                {showTestEmail ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {showTestEmail && (
                <div className="border-t">
                  <TestEmailSection user={user} />
                </div>
              )}
            </div>

            {/* Recent Campaigns */}
            <div className="bg-white rounded-2xl border shadow-sm">
              <button onClick={() => setShowHistory(!showHistory)} className="w-full p-4 flex items-center justify-between">
                <span className="font-bold flex items-center gap-2"><History size={18} /> Recent</span>
                {showHistory ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {showHistory && (
                <div className="border-t">
                  {campaigns.length === 0 ? <p className="p-6 text-center text-gray-400 text-sm">No campaigns yet</p> : campaigns.map((c, i) => (
                    <div key={i} className="p-4 border-b last:border-0">
                      <p className="font-medium">{c.eventName}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-2 mt-1"><Users size={12} /> {c.count} • <Clock size={12} /> {c.date.toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Placeholders */}
            <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
              <h3 className="font-bold text-blue-800 mb-2">Placeholders</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li><code className="bg-blue-200/50 px-1 rounded">{'{name}'}</code> - Recipient</li>
                <li><code className="bg-blue-200/50 px-1 rounded">{'{event}'}</code> - Event</li>
                <li><code className="bg-blue-200/50 px-1 rounded">{'{date}'}</code> - Issue date</li>
                <li><code className="bg-blue-200/50 px-1 rounded">{'{id}'}</code> - Certificate ID</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}