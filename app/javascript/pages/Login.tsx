import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, ArrowRight, Loader2, RefreshCw, CheckCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../contexts/AuthContext';

type Step = 'phone' | 'otp';

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [step, setStep] = useState<Step>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);

  // Format phone number as user types
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhoneNumber(value);
    setError(null);
  };

  // Handle OTP input
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      const newOtp = [...otp];
      digits.forEach((digit, i) => {
        if (index + i < 6) {
          newOtp[index + i] = digit;
        }
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + digits.length, 5);
      document.getElementById(`otp-${nextIndex}`)?.focus();
    } else {
      const newOtp = [...otp];
      newOtp[index] = value.replace(/\D/g, '');
      setOtp(newOtp);
      
      // Auto-focus next input
      if (value && index < 5) {
        document.getElementById(`otp-${index + 1}`)?.focus();
      }
    }
    setError(null);
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  // Start resend timer
  const startResendTimer = () => {
    setResendTimer(30);
    const interval = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Send OTP
  const handleSendOtp = async () => {
    if (phoneNumber.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/auth/send_otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phoneNumber }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send OTP');
      }

      // In development, show the OTP for testing
      if (data.dev_otp) {
        setDevOtp(data.dev_otp);
      }

      setStep('otp');
      startResendTimer();
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOtp = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setError('Please enter the complete 6-digit OTP');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/auth/verify_otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phoneNumber, otp: otpCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid OTP');
      }

      // Login successful
      login(data.token, data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Verification failed');
      setOtp(['', '', '', '', '', '']);
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendTimer > 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/auth/resend_otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phoneNumber }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend OTP');
      }

      if (data.dev_otp) {
        setDevOtp(data.dev_otp);
      }

      startResendTimer();
      setOtp(['', '', '', '', '', '']);
    } catch (err: any) {
      setError(err.message || 'Failed to resend OTP');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 mb-4">
            <span className="text-2xl font-bold text-white">S</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">StmtIQ</h1>
          <p className="text-slate-400">Smart expense tracking from bank statements</p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
          {step === 'phone' ? (
            <>
              <h2 className="text-xl font-semibold text-white mb-6">Login with Mobile</h2>
              
              {/* Phone Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Mobile Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-slate-400 font-medium">+91</span>
                  </div>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={handlePhoneChange}
                    placeholder="98765 43210"
                    className={clsx(
                      "w-full pl-14 pr-4 py-3 bg-slate-800 border rounded-xl text-white text-lg",
                      "placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500",
                      error ? "border-red-500" : "border-slate-700"
                    )}
                    autoFocus
                  />
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                    <Phone className="w-5 h-5 text-slate-500" />
                  </div>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={handleSendOtp}
                disabled={isLoading || phoneNumber.length !== 10}
                className={clsx(
                  "w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all",
                  phoneNumber.length === 10
                    ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed"
                )}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Get OTP
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-white mb-2">Enter OTP</h2>
              <p className="text-slate-400 text-sm mb-6">
                We've sent a 6-digit code to +91 {phoneNumber.slice(0, 5)} {phoneNumber.slice(5)}
              </p>

              {/* Dev OTP Display */}
              {devOtp && (
                <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <div className="flex items-center gap-2 text-emerald-400 text-sm">
                    <CheckCircle className="w-4 h-4" />
                    <span>Dev Mode OTP: <strong className="font-mono">{devOtp}</strong></span>
                  </div>
                </div>
              )}

              {/* OTP Input */}
              <div className="flex gap-2 mb-6 justify-center">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className={clsx(
                      "w-12 h-14 text-center text-xl font-bold bg-slate-800 border rounded-xl text-white",
                      "focus:outline-none focus:ring-2 focus:ring-violet-500",
                      error ? "border-red-500" : "border-slate-700"
                    )}
                    autoFocus={index === 0}
                  />
                ))}
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Verify Button */}
              <button
                onClick={handleVerifyOtp}
                disabled={isLoading || otp.join('').length !== 6}
                className={clsx(
                  "w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all mb-4",
                  otp.join('').length === 6
                    ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed"
                )}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Verify & Login
                    <CheckCircle className="w-5 h-5" />
                  </>
                )}
              </button>

              {/* Resend & Back */}
              <div className="flex items-center justify-between text-sm">
                <button
                  onClick={() => {
                    setStep('phone');
                    setOtp(['', '', '', '', '', '']);
                    setError(null);
                    setDevOtp(null);
                  }}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  ← Change number
                </button>
                <button
                  onClick={handleResendOtp}
                  disabled={resendTimer > 0 || isLoading}
                  className={clsx(
                    "flex items-center gap-1 transition-colors",
                    resendTimer > 0
                      ? "text-slate-500 cursor-not-allowed"
                      : "text-violet-400 hover:text-violet-300"
                  )}
                >
                  <RefreshCw className="w-4 h-4" />
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-sm mt-6">
          By continuing, you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
}

