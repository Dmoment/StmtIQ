import { useState } from 'react';
import { X, Mail, Copy, Check, Send, Loader2, Clock, Eye, Download, Link, Globe, Lock, Users } from 'lucide-react';
import { clsx } from 'clsx';
import type { Document, Bucket } from '../../types/documents';
import { useShareDocument, useShareBucket } from '../../queries/useDocuments';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Document | Bucket | null;
  type: 'document' | 'bucket';
}

type ShareTab = 'link' | 'email';

export function ShareModal({ isOpen, onClose, item, type }: ShareModalProps) {
  const [activeTab, setActiveTab] = useState<ShareTab>('link');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [permission, setPermission] = useState<'view' | 'download'>('view');
  const [expiresInDays, setExpiresInDays] = useState<number | null>(7);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [linkGenerated, setLinkGenerated] = useState(false);

  const shareDocument = useShareDocument();
  const shareBucket = useShareBucket();

  const isSharing = shareDocument.isPending || shareBucket.isPending;

  const handleGenerateLink = async () => {
    if (!item) return;

    try {
      const data = {
        id: item.id,
        email: 'link-share@stmtiq.app', // Placeholder email for link-only shares
        permission,
        expires_in_days: expiresInDays || undefined,
      };

      let result;
      if (type === 'document') {
        result = await shareDocument.mutateAsync(data);
      } else {
        result = await shareBucket.mutateAsync(data);
      }

      if (result.share_url) {
        setShareUrl(result.share_url);
        setLinkGenerated(true);
      }
    } catch (error) {
      console.error('Generate link failed:', error);
    }
  };

  const handleShareByEmail = async () => {
    if (!item || !email) return;

    try {
      const data = {
        id: item.id,
        email,
        name: name || undefined,
        permission,
        message: message || undefined,
        expires_in_days: expiresInDays || undefined,
      };

      let result;
      if (type === 'document') {
        result = await shareDocument.mutateAsync(data);
      } else {
        result = await shareBucket.mutateAsync(data);
      }

      if (result.share_url) {
        setShareUrl(result.share_url);
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const handleCopy = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setActiveTab('link');
    setEmail('');
    setName('');
    setMessage('');
    setPermission('view');
    setExpiresInDays(7);
    setShareUrl(null);
    setCopied(false);
    setLinkGenerated(false);
    onClose();
  };

  if (!isOpen || !item) return null;

  const itemName = (item as Document | Bucket).name || (item as Bucket).period_label || 'Item';

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      <div className="relative bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full md:max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Share "{itemName}"
            </h2>
            <p className="text-sm text-slate-500">
              {type === 'document' ? 'Share this document' : 'Share this bucket'} with others
            </p>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors" aria-label="Close modal">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4">
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl" role="tablist">
            <button
              onClick={() => setActiveTab('link')}
              className={clsx(
                'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                activeTab === 'link'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              )}
              role="tab"
              aria-selected={activeTab === 'link'}
              aria-controls="link-panel"
            >
              <Link className="w-4 h-4" />
              Get Link
            </button>
            <button
              onClick={() => setActiveTab('email')}
              className={clsx(
                'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                activeTab === 'email'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              )}
              role="tab"
              aria-selected={activeTab === 'email'}
              aria-controls="email-panel"
            >
              <Mail className="w-4 h-4" />
              Send Email
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'link' ? (
            // Get Link Tab
            <div role="tabpanel" id="link-panel" aria-labelledby="link-tab">
              {linkGenerated && shareUrl ? (
                // Link Generated
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <Check className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium text-emerald-900">Link ready to share!</p>
                      <p className="text-sm text-emerald-700">
                        Anyone with this link can {permission === 'view' ? 'view' : 'download'} this {type}
                      </p>
                    </div>
                  </div>

                  {/* Link Copy */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Share Link</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={shareUrl}
                        readOnly
                        className="flex-1 px-4 py-2.5 text-sm bg-slate-50 rounded-xl border border-slate-200 truncate"
                        aria-label="Shareable link"
                      />
                      <button
                        onClick={handleCopy}
                        className={clsx(
                          'px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2 text-sm font-medium',
                          copied
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-200 hover:bg-amber-300 text-slate-900'
                        )}
                        aria-label={copied ? 'Link copied' : 'Copy link to clipboard'}
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  {/* Expiry Info */}
                  {expiresInDays && (
                    <p className="text-sm text-slate-500 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Link expires in {expiresInDays} days
                    </p>
                  )}
                </div>
              ) : (
                // Link Settings
                <div className="space-y-5">
                  {/* Permission Selection */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">
                      Anyone with the link can:
                    </label>
                    <div className="space-y-2">
                      <button
                        onClick={() => setPermission('view')}
                        className={clsx(
                          'w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-colors text-left',
                          permission === 'view'
                            ? 'border-amber-400 bg-amber-50'
                            : 'border-slate-200 hover:border-slate-300'
                        )}
                        aria-label="View only permission"
                        aria-pressed={permission === 'view'}
                      >
                        <div className={clsx(
                          'w-10 h-10 rounded-xl flex items-center justify-center',
                          permission === 'view' ? 'bg-amber-100' : 'bg-slate-100'
                        )}>
                          <Eye className={clsx('w-5 h-5', permission === 'view' ? 'text-amber-600' : 'text-slate-500')} />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">View only</p>
                          <p className="text-sm text-slate-500">Can view but not download</p>
                        </div>
                        {permission === 'view' && (
                          <Check className="w-5 h-5 text-amber-600 ml-auto" />
                        )}
                      </button>

                      <button
                        onClick={() => setPermission('download')}
                        className={clsx(
                          'w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-colors text-left',
                          permission === 'download'
                            ? 'border-amber-400 bg-amber-50'
                            : 'border-slate-200 hover:border-slate-300'
                        )}
                        aria-label="Can download permission"
                        aria-pressed={permission === 'download'}
                      >
                        <div className={clsx(
                          'w-10 h-10 rounded-xl flex items-center justify-center',
                          permission === 'download' ? 'bg-amber-100' : 'bg-slate-100'
                        )}>
                          <Download className={clsx('w-5 h-5', permission === 'download' ? 'text-amber-600' : 'text-slate-500')} />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">Can download</p>
                          <p className="text-sm text-slate-500">Can view and download files</p>
                        </div>
                        {permission === 'download' && (
                          <Check className="w-5 h-5 text-amber-600 ml-auto" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expiry */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Link expires in</label>
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-slate-400" />
                      <select
                        value={expiresInDays || ''}
                        onChange={(e) => setExpiresInDays(e.target.value ? Number(e.target.value) : null)}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      >
                        <option value="">Never (always accessible)</option>
                        <option value="1">1 day</option>
                        <option value="7">7 days</option>
                        <option value="14">14 days</option>
                        <option value="30">30 days</option>
                        <option value="90">90 days</option>
                      </select>
                    </div>
                  </div>

                  {/* Generate Button */}
                  <button
                    onClick={handleGenerateLink}
                    disabled={isSharing}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-200 hover:bg-amber-300 text-slate-900 rounded-xl font-medium transition-colors disabled:opacity-50"
                  >
                    {isSharing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Link className="w-5 h-5" />
                        Create Shareable Link
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : (
            // Email Tab
            <div role="tabpanel" id="email-panel" aria-labelledby="email-tab">
              {shareUrl ? (
                // Success State
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Shared Successfully!</h3>
                  <p className="text-sm text-slate-500 mb-4">
                    An email has been sent to <strong>{email}</strong>
                  </p>

                  {/* Share Link */}
                  <div className="bg-slate-50 rounded-xl p-4 mb-4 text-left">
                    <label className="block text-xs font-medium text-slate-500 mb-2">Share Link</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={shareUrl}
                        readOnly
                        className="flex-1 px-3 py-2 text-sm bg-white rounded-lg border border-slate-200 truncate"
                      />
                      <button
                        onClick={handleCopy}
                        className={clsx(
                          'px-3 py-2 rounded-lg transition-colors flex items-center gap-1 text-sm font-medium',
                          copied
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                        )}
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleClose}
                    className="w-full px-4 py-2.5 bg-amber-200 hover:bg-amber-300 text-slate-900 rounded-xl font-medium transition-colors"
                  >
                    Done
                  </button>
                </div>
              ) : (
                // Form State
                <div className="space-y-4">
                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="ca@example.com"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Recipient Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="CA Sharma"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>

                  {/* Permission */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Permission</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setPermission('view')}
                        className={clsx(
                          'flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-colors',
                          permission === 'view'
                            ? 'border-amber-400 bg-amber-50 text-amber-900'
                            : 'border-slate-200 hover:border-slate-300'
                        )}
                      >
                        <Eye className="w-4 h-4" />
                        <span className="font-medium">View Only</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPermission('download')}
                        className={clsx(
                          'flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-colors',
                          permission === 'download'
                            ? 'border-amber-400 bg-amber-50 text-amber-900'
                            : 'border-slate-200 hover:border-slate-300'
                        )}
                      >
                        <Download className="w-4 h-4" />
                        <span className="font-medium">Download</span>
                      </button>
                    </div>
                  </div>

                  {/* Expiry */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Link Expires In</label>
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-slate-400" />
                      <select
                        value={expiresInDays || ''}
                        onChange={(e) => setExpiresInDays(e.target.value ? Number(e.target.value) : null)}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      >
                        <option value="">Never</option>
                        <option value="1">1 day</option>
                        <option value="7">7 days</option>
                        <option value="14">14 days</option>
                        <option value="30">30 days</option>
                        <option value="90">90 days</option>
                      </select>
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Message (optional)</label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Please review the attached documents..."
                      rows={3}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                    />
                  </div>

                  {/* Send Button */}
                  <button
                    onClick={handleShareByEmail}
                    disabled={!email || isSharing}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-200 hover:bg-amber-300 text-slate-900 rounded-xl font-medium transition-colors disabled:opacity-50"
                  >
                    {isSharing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Send Invite
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
