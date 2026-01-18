import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSignIn, useSignUp } from '@clerk/clerk-react';
import { Loader2, ArrowLeft, Mail } from 'lucide-react';
import { clsx } from 'clsx';

type Step = 'choose' | 'email_input' | 'otp';

interface ClerkError {
  errors?: Array<{
    message: string;
    code?: string;
  }>;
}

function isClerkError(error: unknown): error is ClerkError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'errors' in error &&
    Array.isArray((error as ClerkError).errors)
  );
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (isClerkError(error) && error.errors?.[0]?.message) {
    return error.errors[0].message;
  }
  return fallback;
}

// Google Icon Component
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function Login() {
  const navigate = useNavigate();
  const { signIn, setActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setSignUpActive, isLoaded: signUpLoaded } = useSignUp();

  const [step, setStep] = useState<Step>('choose');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const [isNewUser, setIsNewUser] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const isLoaded = signInLoaded && signUpLoaded;
  const otpValue = otp.join('');

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Handle Google OAuth sign-in
  const handleGoogleSignIn = useCallback(async () => {
    if (!signIn) return;

    try {
      setIsLoading(true);
      setError(null);

      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/app/sso-callback',
        redirectUrlComplete: '/app',
      });
    } catch (err: unknown) {
      console.error('Google sign-in error:', err);
      setError(getErrorMessage(err, 'Google sign-in failed. Please try again.'));
      setIsLoading(false);
    }
  }, [signIn]);

  // Start resend timer
  const startResendTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setResendTimer(60);
    intervalRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Handle Email OTP - Send Code
  const handleSendOtp = useCallback(async () => {
    if (!signIn || !signUp || !email) return;

    setIsLoading(true);
    setError(null);

    try {
      const signInResult = await signIn.create({
        identifier: email,
      });

      const emailFactor = signInResult.supportedFirstFactors?.find(
        (f) => f.strategy === 'email_code'
      );

      if (emailFactor && 'emailAddressId' in emailFactor) {
        await signIn.prepareFirstFactor({
          strategy: 'email_code',
          emailAddressId: emailFactor.emailAddressId,
        });

        setIsNewUser(false);
        setStep('otp');
        startResendTimer();
      } else {
        throw new Error('Email verification not available');
      }
    } catch (signInError: unknown) {
      if (
        isClerkError(signInError) &&
        (signInError.errors?.[0]?.code === 'form_identifier_not_found' ||
          signInError.errors?.[0]?.code === 'identifier_not_found')
      ) {
        try {
          await signUp.create({
            emailAddress: email,
          });

          await signUp.prepareEmailAddressVerification({
            strategy: 'email_code',
          });

          setIsNewUser(true);
          setStep('otp');
          startResendTimer();
        } catch (signUpError: unknown) {
          console.error('Sign-up error:', signUpError);
          setError(getErrorMessage(signUpError, 'Failed to send verification code'));
        }
      } else {
        console.error('Sign-in error:', signInError);
        setError(getErrorMessage(signInError, 'Failed to send verification code'));
      }
    } finally {
      setIsLoading(false);
    }
  }, [signIn, signUp, email, startResendTimer]);

  // Handle OTP input change
  const handleOtpChange = useCallback((index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError(null);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  }, [otp]);

  // Handle OTP keydown
  const handleOtpKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }, [otp]);

  // Handle OTP Verification
  const handleVerifyOtp = useCallback(async () => {
    if (!signIn || !signUp) return;

    if (otpValue.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (isNewUser) {
        const signUpResult = await signUp.attemptEmailAddressVerification({
          code: otpValue,
        });

        if (signUpResult.status === 'complete') {
          if (signUpResult.createdSessionId) {
            await setSignUpActive({ session: signUpResult.createdSessionId });
            await new Promise((resolve) => setTimeout(resolve, 500));
            window.location.href = '/app';
            return;
          }
        }

        if (signUpResult.status === 'missing_requirements') {
          if (signUpResult.createdSessionId) {
            await setSignUpActive({ session: signUpResult.createdSessionId });
            window.location.href = '/app';
            return;
          }
        }
      } else {
        const signInResult = await signIn.attemptFirstFactor({
          strategy: 'email_code',
          code: otpValue,
        });

        if (signInResult.status === 'complete') {
          if (signInResult.createdSessionId) {
            await setActive({ session: signInResult.createdSessionId });
            await new Promise((resolve) => setTimeout(resolve, 500));
            window.location.href = '/app';
            return;
          }
        }
      }

      setError('Verification incomplete. Please try again.');
    } catch (err: unknown) {
      console.error('OTP verification error:', err);
      setError(getErrorMessage(err, 'Invalid code. Please try again.'));
      setOtp(['', '', '', '', '', '']);
    } finally {
      setIsLoading(false);
    }
  }, [signIn, signUp, otpValue, isNewUser, setActive, setSignUpActive]);

  // Handle resend OTP
  const handleResendOtp = useCallback(async () => {
    if (resendTimer > 0) return;
    await handleSendOtp();
  }, [resendTimer, handleSendOtp]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: 'url(/images/login_page.png)' }}
    >
      {/* Logo */}
      <div className="absolute top-8 left-8">
        <h1 className="text-2xl font-bold text-slate-800">KhataTrack</h1>
      </div>

      {/* Main Content */}
      <div className="min-h-screen flex items-center justify-center px-4 py-16 lg:justify-start lg:px-16">
        <div className="w-full max-w-6xl flex flex-col lg:flex-row items-center lg:items-stretch gap-8 lg:gap-16">
          {/* Login Card */}
          <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8 lg:p-10">
            {/* Step: Choose Auth Method */}
            {step === 'choose' && (
              <div>
                <div className="mb-8">
                  <p className="text-slate-500 text-sm">Welcome to KhataTrack,</p>
                  <h2 className="text-2xl font-semibold text-slate-900 mt-1">Sign in to continue</h2>
                </div>

                <div className="space-y-4">
                  {/* Email Input */}
                  <div>
                    <label htmlFor="email" className="block text-xs text-slate-500 mb-1">
                      Email address
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError(null);
                      }}
                      placeholder="Enter your email"
                      className="w-full px-4 py-3 border border-slate-200 rounded text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                      autoComplete="email"
                    />
                  </div>

                  {/* Continue Button */}
                  <button
                    onClick={() => {
                      if (email) {
                        handleSendOtp();
                      } else {
                        setError('Please enter your email');
                      }
                    }}
                    disabled={isLoading}
                    className={clsx(
                      'w-full py-3 rounded font-medium transition-colors flex items-center justify-center gap-2',
                      'bg-amber-300 text-slate-900 hover:bg-amber-400',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Sending code...</span>
                      </>
                    ) : (
                      'Continue'
                    )}
                  </button>

                  {/* Divider */}
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white text-slate-500">or</span>
                    </div>
                  </div>

                  {/* Google Sign In */}
                  <button
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className={clsx(
                      'w-full py-3 rounded font-medium transition-colors flex items-center justify-center gap-3',
                      'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    <GoogleIcon className="w-5 h-5" />
                    <span>Continue with Google</span>
                  </button>
                </div>

                {error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                    {error}
                  </div>
                )}

                <p className="mt-8 text-center text-xs text-slate-500">
                  By clicking continue, you agree to our{' '}
                  <a href="#" className="text-slate-700 underline">Terms of Service</a>
                  {' '}and{' '}
                  <a href="#" className="text-slate-700 underline">Privacy Policy</a>.
                </p>
              </div>
            )}

            {/* Step: OTP Verification */}
            {step === 'otp' && (
              <div>
                <button
                  onClick={() => {
                    setStep('choose');
                    setOtp(['', '', '', '', '', '']);
                    setError(null);
                  }}
                  className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-sm">Back</span>
                </button>

                <div className="mb-8">
                  <h2 className="text-2xl font-semibold text-slate-900">Check your email</h2>
                  <p className="text-slate-500 mt-2">
                    We sent a verification code to{' '}
                    <span className="font-medium text-slate-700">{email}</span>
                  </p>
                </div>

                {/* OTP Input */}
                <div className="flex gap-3 justify-center mb-6">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (otpRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className={clsx(
                        'w-12 h-14 text-center text-xl font-semibold rounded border-2 transition-colors',
                        'focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent',
                        error ? 'border-red-300' : 'border-slate-200'
                      )}
                      autoFocus={index === 0}
                    />
                  ))}
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm text-center">
                    {error}
                  </div>
                )}

                {/* Verify Button */}
                <button
                  onClick={handleVerifyOtp}
                  disabled={isLoading || otpValue.length !== 6}
                  className={clsx(
                    'w-full py-3 rounded font-medium transition-colors flex items-center justify-center gap-2',
                    'bg-amber-300 text-slate-900 hover:bg-amber-400',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    'Verify'
                  )}
                </button>

                {/* Resend */}
                <div className="mt-6 text-center">
                  <p className="text-sm text-slate-500">
                    Didn't receive the code?{' '}
                    {resendTimer > 0 ? (
                      <span className="text-slate-400">Resend in {resendTimer}s</span>
                    ) : (
                      <button
                        onClick={handleResendOtp}
                        disabled={isLoading}
                        className="text-slate-700 font-medium underline hover:text-slate-900 disabled:opacity-50"
                      >
                        Resend code
                      </button>
                    )}
                  </p>
                </div>

                {/* Change Email */}
                <button
                  onClick={() => {
                    setStep('choose');
                    setOtp(['', '', '', '', '', '']);
                    setError(null);
                  }}
                  className="mt-4 w-full text-center text-sm text-slate-500 hover:text-slate-700"
                >
                  Use a different email
                </button>
              </div>
            )}
          </div>

          {/* Testimonial Section - Hidden on mobile */}
          <div className="hidden lg:flex flex-1 flex-col justify-start pt-12 max-w-md">
            <div className="text-slate-800">
              <svg className="w-10 h-10 text-slate-700 mb-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
              </svg>
              <p className="text-xl leading-relaxed italic mb-6">
                KhataTrack transformed how we manage our business expenses. Create professional invoices, track expenses automatically, and stay GST-compliant effortlessly.
              </p>
              <p className="text-lg leading-relaxed text-slate-600">
                Its smart categorization and analytics give us complete visibility into our spending patterns.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
