import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  MessageSquare,
  Activity,
  Download,
  Trash2,
  RefreshCw,
  Search,
  Star,
  Smartphone,
  Monitor,
  Laptop,
  CheckCircle2,
  X,
  Clock,
  LogOut,
  Mail,
  Filter,
  CreditCard,
  Check,
  AlertCircle,
  Eye,
  DollarSign,
  Tag,
  ExternalLink,
} from 'lucide-react';
import { AdminSession, AdminUserRecord, AdminFeedbackRecord, AdminStats, AdminPaymentSubmission } from '../types';
import { safeFetchJson } from '../utils/api';
import { formatBytes } from '../utils/format';
import { safeLocalStorage } from '../utils/storage';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: AdminSession;
  onLogout: () => void;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  session,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'payments' | 'users' | 'feedback' | 'export'>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [feedback, setFeedback] = useState<AdminFeedbackRecord[]>([]);
  const [payments, setPayments] = useState<AdminPaymentSubmission[]>([]);
  const [e2eePrice, setE2eePrice] = useState<number>(199);
  const [newPriceInput, setNewPriceInput] = useState<string>('199');
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [ratingFilter, setRatingFilter] = useState<number | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Rejection modal state
  const [rejectTarget, setRejectTarget] = useState<AdminPaymentSubmission | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('');
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);

  // Full-size screenshot modal state
  const [viewScreenshotUrl, setViewScreenshotUrl] = useState<string | null>(null);

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.token}`,
      };

      const [statsRes, usersRes, feedbackRes, paymentsRes] = await Promise.all([
        safeFetchJson<AdminStats>('/api/admin/stats', { headers }),
        safeFetchJson<{ totalUsers: number; onlineCount: number; users: AdminUserRecord[] }>('/api/admin/users', { headers }),
        safeFetchJson<{ totalSubmissions: number; feedback: AdminFeedbackRecord[] }>('/api/admin/feedback', { headers }),
        safeFetchJson<{ currentPrice: number; payments: AdminPaymentSubmission[] }>('/api/admin/payments', { headers }),
      ]);

      if (statsRes.ok && statsRes.data) setStats(statsRes.data);
      if (usersRes.ok && usersRes.data) setUsers(usersRes.data.users);
      if (feedbackRes.ok && feedbackRes.data) setFeedback(feedbackRes.data.feedback);
      if (paymentsRes.ok && paymentsRes.data) {
        setPayments(paymentsRes.data.payments || []);
        if (paymentsRes.data.currentPrice) {
          setE2eePrice(paymentsRes.data.currentPrice);
          setNewPriceInput(String(paymentsRes.data.currentPrice));
        }
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAdminData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUpdatePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = Number(newPriceInput);
    if (!priceNum || priceNum <= 0) {
      alert('Please enter a valid price in INR (e.g. 199)');
      return;
    }

    setIsUpdatingPrice(true);
    try {
      const res = await safeFetchJson<{ success: boolean; e2eePrice: number }>('/api/admin/price', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ price: priceNum }),
      });

      if (res.ok && res.data?.success) {
        setE2eePrice(res.data.e2eePrice);
        setActionMessage(`E2EE Lifetime Price updated to ₹${res.data.e2eePrice}. All users will now see this updated price.`);
        setTimeout(() => setActionMessage(null), 4000);
      } else {
        setActionMessage(res.error || 'Failed to update price');
        setTimeout(() => setActionMessage(null), 4000);
      }
    } catch (err: any) {
      setActionMessage(err.message || 'Error updating price');
      setTimeout(() => setActionMessage(null), 4000);
    } finally {
      setIsUpdatingPrice(false);
    }
  };

  const handleApprovePayment = async (sub: AdminPaymentSubmission) => {
    try {
      const res = await safeFetchJson(`/api/admin/payments/${sub.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
      });

      if (res.ok) {
        setPayments((prev) =>
          prev.map((p) => (p.id === sub.id ? { ...p, status: 'approved', reviewedAt: Date.now() } : p))
        );
        setActionMessage(`Payment approved! Lifetime E2EE unlocked for ${sub.email}.`);
        setTimeout(() => setActionMessage(null), 3500);
      } else {
        setActionMessage(res.error || 'Approval failed');
        setTimeout(() => setActionMessage(null), 3500);
      }
    } catch {
      setActionMessage('Failed to approve payment.');
      setTimeout(() => setActionMessage(null), 3500);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectTarget) return;
    if (!rejectReasonInput.trim()) {
      setActionMessage('Please provide a reason for rejection to inform the user.');
      setTimeout(() => setActionMessage(null), 3500);
      return;
    }

    setIsSubmittingReject(true);
    try {
      const res = await safeFetchJson(`/api/admin/payments/${rejectTarget.id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ reason: rejectReasonInput.trim() }),
      });

      if (res.ok) {
        setPayments((prev) =>
          prev.map((p) =>
            p.id === rejectTarget.id
              ? { ...p, status: 'rejected', rejectionReason: rejectReasonInput.trim(), reviewedAt: Date.now() }
              : p
          )
        );
        setActionMessage(`Payment rejected for ${rejectTarget.email}. Rejection reason dispatched.`);
        setRejectTarget(null);
        setRejectReasonInput('');
        setTimeout(() => setActionMessage(null), 3500);
      } else {
        setActionMessage(res.error || 'Rejection failed');
        setTimeout(() => setActionMessage(null), 3500);
      }
    } catch {
      setActionMessage('Failed to reject payment.');
      setTimeout(() => setActionMessage(null), 3500);
    } finally {
      setIsSubmittingReject(false);
    }
  };

  const handleDeleteFeedback = async (id: string) => {
    try {
      const res = await safeFetchJson(`/api/admin/feedback/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.token}` },
      });
      if (res.ok) {
        setFeedback((prev) => prev.filter((f) => f.id !== id));
        setActionMessage('Feedback entry deleted successfully.');
        setTimeout(() => setActionMessage(null), 3000);
      }
    } catch {
      setActionMessage('Failed to delete feedback entry.');
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  const handleExportUsers = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(users, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `beamdrop_users_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const handleExportFeedback = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(feedback, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `beamdrop_feedback_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const pendingPaymentsCount = payments.filter((p) => p.status === 'pending').length;

  const filteredPayments = payments.filter((p) => {
    if (paymentStatusFilter !== 'all' && p.status !== paymentStatusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        p.email?.toLowerCase().includes(q) ||
        p.payerName?.toLowerCase().includes(q) ||
        p.utr?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.deviceName?.toLowerCase().includes(q) ||
      u.id?.toLowerCase().includes(q)
    );
  });

  const filteredFeedback = feedback.filter((f) => {
    if (ratingFilter !== 'all' && f.rating !== ratingFilter) return false;
    if (categoryFilter !== 'all' && f.category !== categoryFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        f.feedbackText?.toLowerCase().includes(q) ||
        f.userEmail?.toLowerCase().includes(q) ||
        f.userName?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleAdminLogoutAction = async () => {
    try {
      if (session?.token) {
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.token}`,
          },
        });
      }
    } catch {
      // ignore
    }
    safeLocalStorage.removeItem('beamdrop_admin_session');
    safeLocalStorage.removeItem('beamdrop_admin_token');
    onLogout();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-neutral-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative flex flex-col w-full max-w-6xl max-h-[92vh] rounded-3xl border border-neutral-200/90 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 overflow-hidden">
        {/* Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:px-8 border-b border-neutral-200 bg-neutral-50/70 dark:border-neutral-800 dark:bg-neutral-950/60">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 text-white shadow-md">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                  BeamDrop Administrator Console
                </h2>
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-500/20">
                  Authenticated
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Administrator: <strong className="text-neutral-800 dark:text-neutral-200 font-mono">{session.email}</strong> (Kaif Khan)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchAdminData}
              disabled={isLoading}
              title="Refresh all data"
              className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              type="button"
              onClick={handleAdminLogoutAction}
              className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/60 dark:text-rose-300 transition cursor-pointer shadow-sm active:scale-95"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Logout Admin</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-neutral-950 text-neutral-950 dark:border-white dark:text-white'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>System Overview</span>
          </button>

          {/* New Payments & Approvals Tab */}
          <button
            onClick={() => setActiveTab('payments')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'payments'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
            }`}
          >
            <CreditCard className="h-4 w-4" />
            <span>Payment Gateway & Approvals</span>
            {pendingPaymentsCount > 0 && (
              <span className="flex h-5 px-1.5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white animate-pulse">
                {pendingPaymentsCount} pending
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'users'
                ? 'border-neutral-950 text-neutral-950 dark:border-white dark:text-white'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Every Tracked User ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('feedback')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'feedback'
                ? 'border-neutral-950 text-neutral-950 dark:border-white dark:text-white'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>User Feedback ({feedback.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('export')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'export'
                ? 'border-neutral-950 text-neutral-950 dark:border-white dark:text-white'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
            }`}
          >
            <Download className="h-4 w-4" />
            <span>Export & Diagnostics</span>
          </button>
        </div>

        {actionMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300">
            {actionMessage}
          </div>
        )}

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-neutral-200 p-5 bg-gradient-to-br from-neutral-50 to-white dark:border-neutral-800 dark:from-neutral-800/40 dark:to-neutral-900">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Total Tracked Users</span>
                    <Users className="h-5 w-5 text-indigo-500" />
                  </div>
                  <p className="mt-3 text-2xl font-extrabold text-neutral-900 dark:text-white font-mono">
                    {stats?.totalTrackedUsers ?? users.length}
                  </p>
                  <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    {users.filter((u) => u.status === 'online').length} currently active online
                  </p>
                </div>

                <div className="rounded-2xl border border-neutral-200 p-5 bg-gradient-to-br from-neutral-50 to-white dark:border-neutral-800 dark:from-neutral-800/40 dark:to-neutral-900">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">E2EE Current Price</span>
                    <DollarSign className="h-5 w-5 text-indigo-500" />
                  </div>
                  <p className="mt-3 text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">
                    ₹{e2eePrice}
                  </p>
                  <p className="mt-1 text-[11px] text-neutral-500 font-medium">
                    Set by Kaif Khan
                  </p>
                </div>

                <div className="rounded-2xl border border-neutral-200 p-5 bg-gradient-to-br from-neutral-50 to-white dark:border-neutral-800 dark:from-neutral-800/40 dark:to-neutral-900">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Payment Proofs</span>
                    <CreditCard className="h-5 w-5 text-amber-500" />
                  </div>
                  <p className="mt-3 text-2xl font-extrabold text-neutral-900 dark:text-white font-mono">
                    {payments.length}
                  </p>
                  <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                    {pendingPaymentsCount} awaiting review
                  </p>
                </div>

                <div className="rounded-2xl border border-neutral-200 p-5 bg-gradient-to-br from-neutral-50 to-white dark:border-neutral-800 dark:from-neutral-800/40 dark:to-neutral-900">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Average Rating</span>
                    <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
                  </div>
                  <p className="mt-3 text-2xl font-extrabold text-neutral-900 dark:text-white font-mono">
                    {stats?.averageRating ?? '5.0'} / 5.0
                  </p>
                  <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    From {feedback.length} submissions
                  </p>
                </div>
              </div>

              {/* Quick links to review payments */}
              {pendingPaymentsCount > 0 && (
                <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-4 dark:border-amber-900/60 dark:bg-amber-950/40 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-amber-600" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                        {pendingPaymentsCount} payment screenshot(s) waiting for your approval!
                      </h4>
                      <p className="text-[11px] text-amber-700 dark:text-amber-400">
                        Users have submitted UPI receipts to unlock lifetime E2EE.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab('payments');
                      setPaymentStatusFilter('pending');
                    }}
                    className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700 transition"
                  >
                    Review Receipts Now
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PAYMENTS & APPROVALS (New Core Requirement) */}
          {activeTab === 'payments' && (
            <div className="space-y-6">
              {/* E2EE Price Configuration Card */}
              <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                      <Tag className="h-4 w-4 text-indigo-500" />
                      <span>E2EE Feature Price Configuration (Set by Admin)</span>
                    </h3>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      This price is dynamically updated across the entire payment gateway, QR code, and UPI link.
                    </p>
                  </div>

                  <form onSubmit={handleUpdatePrice} className="flex items-center gap-2">
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs font-bold text-neutral-400">₹</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={newPriceInput}
                        onChange={(e) => setNewPriceInput(e.target.value)}
                        className="w-28 rounded-xl border border-neutral-300 bg-white py-1.5 pl-7 pr-3 text-xs font-mono font-bold text-neutral-900 focus:border-indigo-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isUpdatingPrice}
                      className="flex items-center gap-1.5 rounded-xl bg-neutral-900 px-4 py-2 text-xs font-bold text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100 transition whitespace-nowrap"
                    >
                      {isUpdatingPrice ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      <span>Save Price</span>
                    </button>
                  </form>
                </div>
              </div>

              {/* Payments Submissions List */}
              <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/50 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-indigo-500" />
                      <span>Payment Screenshot Submissions ({filteredPayments.length})</span>
                    </h3>
                    <p className="text-xs text-neutral-500">
                      Verify receipt screenshots, check UPI reference IDs, and click Approve or Reject.
                    </p>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    {(['all', 'pending', 'approved', 'rejected'] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setPaymentStatusFilter(filter)}
                        className={`rounded-xl px-3 py-1 text-xs font-bold capitalize transition ${
                          paymentStatusFilter === filter
                            ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950'
                            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300'
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submissions Cards */}
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {filteredPayments.map((sub) => (
                    <div key={sub.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Left: User details & UTR */}
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-neutral-900 dark:text-white font-mono">
                            {sub.email}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            sub.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                              : sub.status === 'rejected'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 animate-pulse'
                          }`}>
                            {sub.status}
                          </span>
                        </div>

                        <p className="text-xs text-neutral-600 dark:text-neutral-300 font-medium">
                          Payer: <span className="font-semibold">{sub.payerName}</span> · Amount: <strong className="text-emerald-600 dark:text-emerald-400">₹{sub.amount}</strong>
                        </p>

                        <p className="text-[11px] font-mono text-neutral-400">
                          UTR / Ref: <span className="font-bold text-neutral-700 dark:text-neutral-200">{sub.utr}</span> · Submitted: {new Date(sub.submittedAt).toLocaleString()}
                        </p>

                        {sub.rejectionReason && (
                          <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-xl border border-rose-200 dark:border-rose-900 mt-1">
                            <strong>Reason Provided:</strong> {sub.rejectionReason}
                          </p>
                        )}
                      </div>

                      {/* Right: Screenshot Thumbnail & Action Buttons */}
                      <div className="flex items-center gap-3 shrink-0">
                        {/* Clickable Screenshot Preview */}
                        {sub.screenshotBase64 ? (
                          <button
                            type="button"
                            onClick={() => setViewScreenshotUrl(sub.screenshotBase64)}
                            className="relative group h-14 w-14 rounded-xl overflow-hidden border border-neutral-300 dark:border-neutral-700 shadow-sm hover:scale-105 transition"
                            title="Click to view full payment screenshot"
                          >
                            <img src={sub.screenshotBase64} alt="Receipt thumbnail" className="h-full w-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                              <Eye className="h-4 w-4 text-white" />
                            </div>
                          </button>
                        ) : (
                          <div className="h-14 w-14 rounded-xl bg-neutral-100 flex items-center justify-center text-[10px] text-neutral-400">
                            No Image
                          </div>
                        )}

                        {/* Approve / Reject Controls */}
                        {sub.status === 'pending' ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleApprovePayment(sub)}
                              className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Approve</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setRejectTarget(sub);
                                setRejectReasonInput('UTR not verified or incorrect amount received.');
                              }}
                              className="flex items-center gap-1 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 transition"
                            >
                              <X className="h-3.5 w-3.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <div className="text-right text-[11px] text-neutral-400">
                            <span>Reviewed {sub.reviewedAt ? new Date(sub.reviewedAt).toLocaleDateString() : ''}</span>
                            {sub.status === 'rejected' && (
                              <button
                                type="button"
                                onClick={() => handleApprovePayment(sub)}
                                className="block text-indigo-600 hover:underline mt-1 font-semibold"
                              >
                                Re-approve License
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {filteredPayments.length === 0 && (
                    <div className="py-12 text-center text-xs text-neutral-400">
                      <CreditCard className="h-8 w-8 mx-auto opacity-40 mb-2" />
                      <p className="font-semibold text-neutral-700 dark:text-neutral-300">No payment submissions found</p>
                      <p className="text-[11px] text-neutral-400 mt-0.5">When users upload UPI payment screenshots, they will appear here for your review.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ALL TRACKED USERS */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 pb-2">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  All Tracked Users ({filteredUsers.length})
                </h3>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-neutral-300 bg-white py-1.5 pl-8 pr-3 text-xs text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="divide-y divide-neutral-100 dark:divide-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 p-2">
                {filteredUsers.map((u) => (
                  <div key={u.id} className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-neutral-900 dark:text-white">
                        {u.name} {u.email ? <span className="font-mono text-neutral-500 font-normal">({u.email})</span> : ''}
                      </p>
                      <p className="text-[11px] text-neutral-500 font-mono">
                        {u.deviceName} · {u.transferCount} transfer(s) · Last active: {new Date(u.lastActive).toLocaleTimeString()}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      u.status === 'online'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                    }`}>
                      {u.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: USER FEEDBACK & RATINGS */}
          {activeTab === 'feedback' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 pb-2">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  User Feedback & Suggestions ({filteredFeedback.length})
                </h3>
              </div>

              <div className="divide-y divide-neutral-100 dark:divide-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 p-2">
                {filteredFeedback.map((f) => (
                  <div key={f.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-neutral-900 dark:text-white">
                          {f.userName} ({f.userEmail})
                        </span>
                        <span className="flex items-center gap-0.5 text-xs text-amber-500 font-bold">
                          <Star className="h-3 w-3 fill-amber-500" />
                          <span>{f.rating}/5</span>
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteFeedback(f.id)}
                        className="text-neutral-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                      {f.feedbackText}
                    </p>
                    <p className="text-[10px] text-neutral-400 font-mono">
                      Category: {f.category} · Submitted {new Date(f.submittedAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: EXPORT & DIAGNOSTICS */}
          {activeTab === 'export' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800 space-y-4">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <Download className="h-4 w-4 text-indigo-500" />
                  <span>Data Export & Archiving</span>
                </h3>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    onClick={handleExportUsers}
                    className="flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100 transition shadow-sm"
                  >
                    <Users className="h-4 w-4" />
                    <span>Download All Users (JSON)</span>
                  </button>

                  <button
                    onClick={handleExportFeedback}
                    className="flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100 transition shadow-sm"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Download All Feedback (JSON)</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: Lightbox Screenshot Viewer */}
      {viewScreenshotUrl && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative max-w-3xl max-h-[90vh] bg-neutral-900 rounded-3xl p-3 border border-neutral-700 shadow-2xl flex flex-col items-center">
            <button
              onClick={() => setViewScreenshotUrl(null)}
              className="absolute right-4 top-4 rounded-full bg-black/60 p-2 text-white hover:bg-black transition"
            >
              <X className="h-5 w-5" />
            </button>
            <h4 className="text-xs font-bold text-white mb-2 self-start px-2">Payment Receipt Screenshot</h4>
            <div className="overflow-auto max-h-[80vh] rounded-2xl">
              <img src={viewScreenshotUrl} alt="Full receipt" className="max-w-full object-contain rounded-xl" />
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Rejection Reason Input Modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-500" />
                <span>Provide Reason for Rejection</span>
              </h3>
              <button onClick={() => setRejectTarget(null)} className="text-neutral-400 hover:text-neutral-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-500">
              Rejecting payment for <strong>{rejectTarget.email}</strong>. This reason will be prominently displayed to the user so they can correct their payment or receipt.
            </p>

            {/* Quick Reason Suggestions */}
            <div className="flex flex-wrap gap-1.5">
              {[
                'UTR / Transaction Ref not found in bank statement',
                'Incorrect amount paid (Required: ₹' + rejectTarget.amount + ')',
                'Blurry or unreadable receipt screenshot',
                'Duplicate or previously used transaction ID',
              ].map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setRejectReasonInput(reason)}
                  className="rounded-lg bg-neutral-100 dark:bg-neutral-800 px-2 py-1 text-[11px] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                >
                  {reason}
                </button>
              ))}
            </div>

            <textarea
              rows={3}
              value={rejectReasonInput}
              onChange={(e) => setRejectReasonInput(e.target.value)}
              placeholder="Enter rejection reason for the user..."
              className="w-full rounded-xl border border-neutral-300 bg-white p-3 text-xs text-neutral-900 focus:border-rose-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="rounded-xl border border-neutral-300 px-4 py-2 text-xs font-semibold text-neutral-700 dark:border-neutral-700 dark:text-neutral-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingReject || !rejectReasonInput.trim()}
                onClick={handleConfirmReject}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50 transition"
              >
                {isSubmittingReject ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
