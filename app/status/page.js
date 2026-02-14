"use client";
import { useState, useEffect } from 'react';
import {
  CheckCircle, XCircle, AlertTriangle, RefreshCw,
  Cloud, Database, Mail, Globe, Clock, HardDrive
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

const STATUS_COLORS = {
  operational: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  degraded: { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  down: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  partial_outage: { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
};

const STATUS_ICONS = {
  operational: CheckCircle,
  degraded: AlertTriangle,
  down: XCircle,
  partial_outage: AlertTriangle,
};

const SERVICE_ICONS = {
  cloudinary: Cloud,
  imagekit: HardDrive,
  firebase: Database,
  email: Mail,
  domain: Globe,
};

function StatusBadge({ status }) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.down;
  const Icon = STATUS_ICONS[status] || XCircle;
  const label = status === 'operational' ? 'Operational'
    : status === 'degraded' ? 'Degraded'
      : status === 'partial_outage' ? 'Partial Outage'
        : 'Down';

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${colors.bg} ${colors.text}`}>
      <Icon size={14} />
      {label}
    </span>
  );
}

function ServiceCard({ id, name, status, message }) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.down;
  const Icon = SERVICE_ICONS[id] || Globe;

  return (
    <div className={`p-4 rounded-xl border-2 ${status === 'operational' ? 'border-green-200 bg-green-50/50' :
        status === 'degraded' ? 'border-yellow-200 bg-yellow-50/50' :
          'border-red-200 bg-red-50/50'
      }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors.bg}`}>
            <Icon size={20} className={colors.text} />
          </div>
          <div>
            <h3 className="font-semibold">{name}</h3>
            <p className="text-sm text-gray-500">{message}</p>
          </div>
        </div>
        <div className={`w-3 h-3 rounded-full ${colors.dot}`} />
      </div>
    </div>
  );
}

export default function StatusPage() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/status', { cache: 'no-store' });
      const data = await res.json();
      setStatus(data);
      setLastChecked(new Date());
    } catch (error) {
      console.error('Failed to fetch status:', error);
      setStatus({
        overall: 'down',
        services: {
          cloudinary: { name: 'Storage (Cloudinary)', status: 'down', message: 'Unable to check' },
          imagekit: { name: 'Storage (ImageKit)', status: 'down', message: 'Unable to check' },
          firebase: { name: 'Database (Firebase)', status: 'down', message: 'Unable to check' },
          email: { name: 'Email Service (Gmail)', status: 'down', message: 'Unable to check' },
          domain: { name: 'App Domain', status: 'down', message: 'Unable to check' },
        }
      });
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStatus();
  };

  const formatTime = (date) => {
    if (!date) return '';
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Checking service status...</p>
        </div>
      </div>
    );
  }

  // Group storage services
  const storageServices = status?.services ?
    Object.entries(status.services).filter(([id]) => id === 'cloudinary' || id === 'imagekit') : [];
  const otherServices = status?.services ?
    Object.entries(status.services).filter(([id]) => id !== 'cloudinary' && id !== 'imagekit') : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image src="/logo.png" alt="CertCat Logo" width={64} height={64} quality={100} priority className="w-8 h-8 rounded-lg" />
            <span className="font-bold">CertCat</span>
          </Link>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Overall Status */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-4">System Status</h1>
          <StatusBadge status={status?.overall || 'down'} />
          {lastChecked && (
            <p className="text-sm text-gray-500 mt-3 flex items-center justify-center gap-1">
              <Clock size={14} />
              Last checked: {formatTime(lastChecked)}
            </p>
          )}
        </div>

        {/* Storage Services Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Cloud size={20} /> Storage Services
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {storageServices.map(([id, service]) => (
              <ServiceCard
                key={id}
                id={id}
                name={service.name}
                status={service.status}
                message={service.message}
              />
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Cloudinary is primary storage. ImageKit is backup.
          </p>
        </div>

        {/* Other Services */}
        <div className="space-y-4 mb-12">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Other Services</h2>

          {otherServices.map(([id, service]) => (
            <ServiceCard
              key={id}
              id={id}
              name={service.name}
              status={service.status}
              message={service.message}
            />
          ))}
        </div>

        {/* Status Legend */}
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold mb-4">Status Indicators</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { status: 'operational', label: 'All systems normal' },
              { status: 'degraded', label: 'Minor issues' },
              { status: 'partial_outage', label: 'Some services affected' },
              { status: 'down', label: 'Service unavailable' },
            ].map(item => (
              <div key={item.status} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${STATUS_COLORS[item.status].dot}`} />
                <span className="text-sm text-gray-600">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Info */}
        <p className="text-center text-sm text-gray-400 mt-12">
          Status checks run automatically every 60 seconds.
          <br />
          For issues, contact support or check our documentation.
        </p>
      </main>
    </div>
  );
}