import React, { useState } from 'react';
import {
  User,
  Bell,
  Shield,
  Palette,
  Building2,
  Send,
  Mail,
  Loader2,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { clsx } from 'clsx';
import { useGmailStatus, useGmailConnections } from '../queries';
import { useGmailManager } from '../hooks/useGmailManager';
import { GmailConnectionCard } from '../components/gmail/GmailConnectionCard';
import { GmailInfoBox } from '../components/gmail/GmailInfoBox';
import { GmailConfigWarning } from '../components/gmail/GmailConfigWarning';
import { GmailConnectButton } from '../components/gmail/GmailConnectButton';

const settingsSections = [
  {
    id: 'profile',
    title: 'Profile',
    description: 'Manage your account details',
    icon: User,
    color: 'from-violet-500 to-purple-500',
  },
  {
    id: 'gmail',
    title: 'Gmail Integration',
    description: 'Auto-import invoices from email',
    icon: Mail,
    color: 'from-red-500 to-orange-500',
  },
  {
    id: 'ca',
    title: 'CA Integration',
    description: 'Configure WhatsApp auto-send to your CA',
    icon: Send,
    color: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'banks',
    title: 'Bank Accounts',
    description: 'Manage linked bank accounts',
    icon: Building2,
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'Configure alerts and reminders',
    icon: Bell,
    color: 'from-amber-500 to-orange-500',
  },
  {
    id: 'security',
    title: 'Security',
    description: 'Password and authentication settings',
    icon: Shield,
    color: 'from-rose-500 to-pink-500',
  },
  {
    id: 'appearance',
    title: 'Appearance',
    description: 'Customize the look and feel',
    icon: Palette,
    color: 'from-fuchsia-500 to-pink-500',
  },
];

export function Settings() {
  const [activeSection, setActiveSection] = useState('gmail');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-slate-400 mt-1">
          Manage your preferences and integrations
        </p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-2">
          {settingsSections.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={clsx(
                "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all",
                activeSection === section.id
                  ? "bg-slate-800 border border-slate-700"
                  : "hover:bg-slate-900"
              )}
            >
              <div className={clsx(
                "w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center",
                section.color
              )}>
                <section.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium">{section.title}</p>
                <p className="text-sm text-slate-500">{section.description}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {activeSection === 'gmail' && <GmailSettings />}
          {activeSection === 'ca' && <CASettings />}
          {activeSection === 'profile' && <ProfileSettings />}
          {activeSection === 'banks' && <BankSettings />}
          {activeSection === 'notifications' && <NotificationSettings />}
          {activeSection === 'security' && <SecuritySettings />}
          {activeSection === 'appearance' && <AppearanceSettings />}
        </div>
      </div>
    </div>
  );
}

function GmailSettings() {
  const { data: status, isLoading: statusLoading } = useGmailStatus();
  const {
    data: connections,
    isLoading: connectionsLoading,
    refetch,
  } = useGmailConnections();
  const {
    handleConnect,
    handleSync,
    handleToggleSync,
    handleDisconnect,
    disconnectingId,
    error,
    clearError,
  } = useGmailManager(refetch);

  if (statusLoading || connectionsLoading) {
    return (
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6">
        <div
          className="flex items-center justify-center py-12"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
          <span className="sr-only">Loading Gmail settings...</span>
        </div>
      </div>
    );
  }

  if (!status?.configured) {
    return <GmailConfigWarning />;
  }

  const hasConnections = connections && connections.length > 0;

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Gmail Integration</h2>
        <p className="text-slate-400">
          Automatically import invoice PDFs from your Gmail inbox. We scan for
          emails with invoice attachments from common vendors.
        </p>
      </div>

      {error && (
        <div
          className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start justify-between gap-3"
          role="alert"
        >
          <div className="flex items-start gap-3">
            <AlertCircle
              className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm text-red-200 font-medium">Error</p>
              <p className="text-sm text-red-200/70 mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={clearError}
            className="p-1 rounded hover:bg-red-500/20 text-red-400 transition-colors"
            aria-label="Dismiss error"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      <GmailInfoBox />

      {hasConnections && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-slate-300">
            Connected Accounts
          </h3>
          {connections.map((connection) => (
            <GmailConnectionCard
              key={connection.id}
              connection={connection}
              onSync={handleSync}
              onToggleSync={handleToggleSync}
              onDisconnect={handleDisconnect}
              isSyncing={false}
              isDisconnecting={disconnectingId === connection.id}
            />
          ))}
        </div>
      )}

      <GmailConnectButton onClick={handleConnect} isLoading={false} />
    </div>
  );
}

function CASettings() {
  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">CA WhatsApp Integration</h2>
        <p className="text-slate-400">
          Automatically send monthly expense summaries to your CA via WhatsApp.
        </p>
      </div>

      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
        <p className="text-sm text-amber-200">
          <strong>Note:</strong> This feature requires WhatsApp Business API access. 
          You'll need to verify your business and get approval for message templates.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            CA WhatsApp Number
          </label>
          <input
            type="tel"
            placeholder="+91 98765 43210"
            className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Send Schedule
          </label>
          <select className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50">
            <option value="1">1st of every month</option>
            <option value="2">2nd of every month</option>
            <option value="3">3rd of every month</option>
            <option value="5">5th of every month</option>
            <option value="7">7th of every month</option>
          </select>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800 border border-slate-700">
          <div>
            <p className="font-medium">Auto-send enabled</p>
            <p className="text-sm text-slate-500">Automatically send summary on schedule</p>
          </div>
          <button className="w-12 h-6 rounded-full bg-slate-700 relative transition-colors">
            <span className="absolute left-1 top-1 w-4 h-4 rounded-full bg-slate-400 transition-transform" />
          </button>
        </div>
      </div>

      <button className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-900 font-semibold hover:from-emerald-400 hover:to-cyan-400 transition-all">
        Save Settings
      </button>
    </div>
  );
}

function ProfileSettings() {
  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-6">
      <h2 className="text-xl font-semibold">Profile Settings</h2>
      <p className="text-slate-400">Coming soon...</p>
    </div>
  );
}

function BankSettings() {
  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-6">
      <h2 className="text-xl font-semibold">Bank Accounts</h2>
      <p className="text-slate-400">Coming soon...</p>
    </div>
  );
}

function NotificationSettings() {
  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-6">
      <h2 className="text-xl font-semibold">Notification Settings</h2>
      <p className="text-slate-400">Coming soon...</p>
    </div>
  );
}

function SecuritySettings() {
  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-6">
      <h2 className="text-xl font-semibold">Security Settings</h2>
      <p className="text-slate-400">Coming soon...</p>
    </div>
  );
}

function AppearanceSettings() {
  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-6">
      <h2 className="text-xl font-semibold">Appearance Settings</h2>
      <p className="text-slate-400">Coming soon...</p>
    </div>
  );
}

