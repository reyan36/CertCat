"use client";

import { useState, useEffect, useCallback } from 'react';
import { auth } from '@/lib/firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import toast from 'react-hot-toast';
import {
  Shield, Users, Award, BarChart3, FileText, LogOut, Loader2,
  Search, ChevronLeft, ChevronRight, RefreshCw, AlertTriangle,
  CheckCircle, XCircle, Eye, Trash2, UserX, UserCheck, Clock,
  TrendingUp, Calendar, Filter, X, ExternalLink
} from 'lucide-react';
import Image from 'next/image';

// Admin Dashboard Component
export default function AdminDashboard() {
  // Auth state
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [csrfToken, setCsrfToken] = useState(null);

  // Dashboard state
  const [activeTab, setActiveTab] = useState('overview');
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [logs, setLogs] = useState([]);

  // Pagination
  const [pagination, setPagination] = useState({ page: 1, limit: 20, totalPages: 1 });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [periodFilter, setPeriodFilter] = useState('month');

  // Loading states
  const [dataLoading, setDataLoading] = useState(false);

  // Modal state
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [actionReason, setActionReason] = useState('');

  // Check auth status on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Verify admin session
        await verifyAdminSession(firebaseUser);
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Verify admin session with backend
  const verifyAdminSession = async (firebaseUser) => {
    try {
      // First check if we have an existing session
      const checkRes = await fetch('/api/admin/auth');
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        if (checkData.success) {
          setIsAdmin(true);
          setLoading(false);
          return;
        }
      }

      // Try to create new session
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: firebaseUser.email,
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsAdmin(true);
        setCsrfToken(data.csrfToken);
        toast.success('Admin session started');
      } else {
        setIsAdmin(false);
        toast.error(data.error || 'Admin access denied');
      }
    } catch (error) {
      console.error('Admin verification error:', error);
      setIsAdmin(false);
    }
    setLoading(false);
  };

  // Sign in with Google
  const handleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      toast.error('Sign in failed');
    }
  };

  // Sign out
  const handleSignOut = async () => {
    try {
      await fetch('/api/admin/auth', { method: 'DELETE' });
      await signOut(auth);
      setIsAdmin(false);
      setCsrfToken(null);
      toast.success('Signed out');
    } catch (error) {
      toast.error('Sign out failed');
    }
  };

  // Fetch analytics
  const fetchAnalytics = useCallback(async () => {
    setDataLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics?period=${periodFilter}`);
      const data = await res.json();
      if (data.success) {
        setAnalytics(data.analytics);
      }
    } catch (error) {
      toast.error('Failed to fetch analytics');
    }
    setDataLoading(false);
  }, [periodFilter]);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setDataLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
        setPagination(prev => ({ ...prev, ...data.pagination }));
      }
    } catch (error) {
      toast.error('Failed to fetch users');
    }
    setDataLoading(false);
  }, [pagination.page, pagination.limit, searchQuery, statusFilter]);

  // Fetch certificates
  const fetchCertificates = useCallback(async () => {
    setDataLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (searchQuery) params.append('search', searchQuery);

      const res = await fetch(`/api/admin/certificates?${params}`);
      const data = await res.json();
      if (data.success) {
        setCertificates(data.certificates);
        setPagination(prev => ({ ...prev, ...data.pagination }));
      }
    } catch (error) {
      toast.error('Failed to fetch certificates');
    }
    setDataLoading(false);
  }, [pagination.page, pagination.limit, searchQuery]);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    setDataLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      const res = await fetch(`/api/admin/logs?${params}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs);
        setPagination(prev => ({ ...prev, ...data.pagination }));
      }
    } catch (error) {
      toast.error('Failed to fetch logs');
    }
    setDataLoading(false);
  }, [pagination.page, pagination.limit]);

  // Fetch data when tab changes
  useEffect(() => {
    if (!isAdmin) return;

    setPagination(prev => ({ ...prev, page: 1 }));
    setSearchQuery('');

    switch (activeTab) {
      case 'overview':
        fetchAnalytics();
        break;
      case 'users':
        fetchUsers();
        break;
      case 'certificates':
        fetchCertificates();
        break;
      case 'logs':
        fetchLogs();
        break;
    }
  }, [activeTab, isAdmin]);

  // Refetch when filters change
  useEffect(() => {
    if (!isAdmin) return;
    if (activeTab === 'overview') fetchAnalytics();
  }, [periodFilter, isAdmin, activeTab, fetchAnalytics]);

  useEffect(() => {
    if (!isAdmin) return;
    if (activeTab === 'users') fetchUsers();
  }, [pagination.page, searchQuery, statusFilter, isAdmin, activeTab, fetchUsers]);

  useEffect(() => {
    if (!isAdmin) return;
    if (activeTab === 'certificates') fetchCertificates();
  }, [pagination.page, searchQuery, isAdmin, activeTab, fetchCertificates]);

  useEffect(() => {
    if (!isAdmin) return;
    if (activeTab === 'logs') fetchLogs();
  }, [pagination.page, isAdmin, activeTab, fetchLogs]);

  // User actions
  const handleUserAction = async (email, action) => {
    if (action === 'suspend' && !actionReason) {
      toast.error('Please provide a reason');
      return;
    }

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ email, action, reason: actionReason }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchUsers();
        setShowUserModal(false);
        setActionReason('');
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error('Action failed');
    }
  };

  // Delete certificate
  const handleDeleteCertificate = async (certificateId) => {
    const reason = prompt('Enter reason for deletion:');
    if (!reason) return;

    try {
      const res = await fetch('/api/admin/certificates', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ certificateId, reason }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Certificate deleted');
        fetchCertificates();
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  // Not signed in
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full mx-4 text-center">
          <Shield className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Admin Dashboard</h1>
          <p className="text-gray-400 mb-6">Sign in with your admin account to continue</p>
          <button
            onClick={handleSignIn}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-medium transition-colors"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  // Not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full mx-4 text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400 mb-2">Your account does not have admin privileges.</p>
          <p className="text-gray-500 text-sm mb-6">{user.email}</p>
          <button
            onClick={handleSignOut}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl font-medium transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // Admin dashboard
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="CertCat Logo" width={64} height={64} quality={100} priority className="w-8 h-8 rounded-lg" />
            <h1 className="text-xl font-bold">CertCat Admin</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-sm">{user.email}</span>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-gray-800 min-h-[calc(100vh-73px)] p-4">
          <nav className="space-y-2">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'users', label: 'Users', icon: Users },
              { id: 'certificates', label: 'Certificates', icon: Award },
              { id: 'logs', label: 'Audit Logs', icon: FileText },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === tab.id
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                  }`}
              >
                <tab.icon size={20} />
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Dashboard Overview</h2>
                <div className="flex items-center gap-2">
                  <select
                    value={periodFilter}
                    onChange={(e) => setPeriodFilter(e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="day">Last 24 hours</option>
                    <option value="week">Last 7 days</option>
                    <option value="month">Last 30 days</option>
                    <option value="all">All time</option>
                  </select>
                  <button
                    onClick={fetchAnalytics}
                    className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700"
                  >
                    <RefreshCw size={18} className={dataLoading ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>

              {analytics && (
                <>
                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <StatCard
                      title="Total Certificates"
                      value={analytics.overview.totalCertificates}
                      subValue={`+${analytics.overview.periodCertificates} this period`}
                      icon={Award}
                      color="orange"
                    />
                    <StatCard
                      title="Total Users"
                      value={analytics.overview.totalUsers}
                      subValue={`${analytics.overview.periodUsers} active`}
                      icon={Users}
                      color="blue"
                    />
                    <StatCard
                      title="Total Events"
                      value={analytics.overview.totalEvents}
                      subValue={`${analytics.overview.periodEvents} this period`}
                      icon={Calendar}
                      color="green"
                    />
                    <StatCard
                      title="Templates"
                      value={analytics.overview.totalTemplates}
                      subValue="Available"
                      icon={FileText}
                      color="purple"
                    />
                  </div>

                  {/* Charts Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Daily Activity */}
                    <div className="bg-gray-800 rounded-xl p-6">
                      <h3 className="text-lg font-semibold mb-4">Daily Activity</h3>
                      <div className="h-64 flex items-end gap-1">
                        {analytics.dailyBreakdown.slice(-14).map((day, i) => (
                          <div key={i} className="flex-1 flex flex-col items-center">
                            <div
                              className="w-full bg-orange-500 rounded-t"
                              style={{
                                height: `${Math.max(4, (day.certificates / Math.max(...analytics.dailyBreakdown.map(d => d.certificates))) * 200)}px`
                              }}
                            />
                            <span className="text-xs text-gray-500 mt-2 rotate-45">
                              {day.date.slice(5)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Top Organizers */}
                    <div className="bg-gray-800 rounded-xl p-6">
                      <h3 className="text-lg font-semibold mb-4">Top Organizers</h3>
                      <div className="space-y-3">
                        {analytics.topOrganizers.slice(0, 5).map((org, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <span className="text-gray-300 truncate">{org.email}</span>
                            <span className="text-orange-500 font-medium">{org.certificateCount}</span>
                          </div>
                        ))}
                        {analytics.topOrganizers.length === 0 && (
                          <p className="text-gray-500 text-center py-4">No data for this period</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Top Events */}
                  <div className="bg-gray-800 rounded-xl p-6">
                    <h3 className="text-lg font-semibold mb-4">Top Events</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {analytics.topEvents.slice(0, 6).map((event, i) => (
                        <div key={i} className="bg-gray-700 rounded-lg p-4">
                          <p className="font-medium truncate">{event.name}</p>
                          <p className="text-orange-500 text-sm">{event.certificateCount} certificates</p>
                        </div>
                      ))}
                      {analytics.topEvents.length === 0 && (
                        <p className="text-gray-500 col-span-3 text-center py-4">No events for this period</p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Users</h2>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm w-64"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-400">User</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-400">Certificates</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-400">Last Active</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-400">Status</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {users.map((user) => (
                      <tr key={user.email} className="hover:bg-gray-750">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium">{user.displayName}</p>
                            <p className="text-sm text-gray-400">{user.email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">{user.certificateCount}</td>
                        <td className="px-6 py-4 text-sm text-gray-400">
                          {user.lastActivity ? new Date(user.lastActivity).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${user.status === 'active'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                            }`}>
                            {user.status === 'active' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                            {user.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowUserModal(true);
                              }}
                              className="p-2 hover:bg-gray-700 rounded-lg"
                              title="View Details"
                            >
                              <Eye size={16} />
                            </button>
                            {user.status === 'active' ? (
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowUserModal(true);
                                }}
                                className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg"
                                title="Suspend User"
                              >
                                <UserX size={16} />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUserAction(user.email, 'unsuspend')}
                                className="p-2 hover:bg-green-500/20 text-green-400 rounded-lg"
                                title="Unsuspend User"
                              >
                                <UserCheck size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {users.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    No users found
                  </div>
                )}

                {/* Pagination */}
                <Pagination pagination={pagination} setPagination={setPagination} />
              </div>
            </div>
          )}

          {/* Certificates Tab */}
          {activeTab === 'certificates' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Certificates</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input
                    type="text"
                    placeholder="Search certificates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm w-64"
                  />
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-400">Recipient</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-400">Event</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-400">Organizer</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-400">Issued</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-400">Type</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {certificates.map((cert) => (
                      <tr key={cert.id} className="hover:bg-gray-750">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium">{cert.recipientName}</p>
                            <p className="text-sm text-gray-400">{cert.recipientEmail}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 max-w-xs truncate">{cert.eventName}</td>
                        <td className="px-6 py-4 text-sm text-gray-400">{cert.organizerEmail}</td>
                        <td className="px-6 py-4 text-sm text-gray-400">
                          {cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4">
                          {cert.isTest ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-400">
                              <Clock size={12} />
                              Test
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400">
                              <CheckCircle size={12} />
                              Live
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <a
                              href={`/verify/${cert.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 hover:bg-gray-700 rounded-lg"
                              title="View Certificate"
                            >
                              <ExternalLink size={16} />
                            </a>
                            <button
                              onClick={() => handleDeleteCertificate(cert.id)}
                              className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg"
                              title="Delete Certificate"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {certificates.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    No certificates found
                  </div>
                )}

                <Pagination pagination={pagination} setPagination={setPagination} />
              </div>
            </div>
          )}

          {/* Logs Tab */}
          {activeTab === 'logs' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Audit Logs</h2>
              </div>

              <div className="bg-gray-800 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-400">Timestamp</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-400">Action</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-400">Admin</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-400">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-750">
                        <td className="px-6 py-4 text-sm text-gray-400">
                          {log.timestamp ? new Date(log.timestamp).toLocaleString() : '-'}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-700">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">{log.adminEmail}</td>
                        <td className="px-6 py-4 text-sm text-gray-400 max-w-xs truncate">
                          {JSON.stringify(log.details)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {logs.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    No logs found
                  </div>
                )}

                <Pagination pagination={pagination} setPagination={setPagination} />
              </div>
            </div>
          )}
        </main>
      </div>

      {/* User Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">User Details</h3>
              <button onClick={() => setShowUserModal(false)} className="p-2 hover:bg-gray-700 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-400">Email</p>
                <p className="font-medium">{selectedUser.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Display Name</p>
                <p className="font-medium">{selectedUser.displayName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Certificates Issued</p>
                <p className="font-medium">{selectedUser.certificateCount}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Status</p>
                <p className={`font-medium ${selectedUser.status === 'active' ? 'text-green-400' : 'text-red-400'}`}>
                  {selectedUser.status}
                </p>
              </div>

              {selectedUser.status === 'active' && (
                <div className="pt-4 border-t border-gray-700">
                  <p className="text-sm text-gray-400 mb-2">Suspend User</p>
                  <textarea
                    placeholder="Reason for suspension..."
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-sm resize-none"
                    rows={3}
                  />
                  <button
                    onClick={() => handleUserAction(selectedUser.email, 'suspend')}
                    className="w-full mt-3 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg font-medium"
                  >
                    Suspend User
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({ title, value, subValue, icon: Icon, color }) {
  const colorClasses = {
    orange: 'bg-orange-500/20 text-orange-400',
    blue: 'bg-blue-500/20 text-blue-400',
    green: 'bg-green-500/20 text-green-400',
    purple: 'bg-purple-500/20 text-purple-400',
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <span className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon size={20} />
        </span>
      </div>
      <p className="text-3xl font-bold">{value.toLocaleString()}</p>
      <p className="text-gray-400 text-sm">{title}</p>
      <p className="text-gray-500 text-xs mt-1">{subValue}</p>
    </div>
  );
}

// Pagination Component
function Pagination({ pagination, setPagination }) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-700">
      <p className="text-sm text-gray-400">
        Page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} total)
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
          disabled={pagination.page <= 1}
          className="p-2 bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
          disabled={pagination.page >= pagination.totalPages}
          className="p-2 bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
