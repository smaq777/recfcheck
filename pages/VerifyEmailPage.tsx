
import React, { useState, useEffect } from 'react';
import { AppView } from '../types';
import { sendEmail } from '../api';

interface VerifyEmailPageProps {
  userEmail: string;
  onNavigate: (view: AppView) => void;
}

const VerifyEmailPage: React.FC<VerifyEmailPageProps> = ({ userEmail, onNavigate }) => {
  const [cooldown, setCooldown] = useState(0);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown === 0 && !isSending) {
      setIsSending(true);
      try {
        const verificationHtml = `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #2c346d;">Verify your RefCheck account</h2>
            <p>Welcome to RefCheck! Please verify your email to start auditing your bibliography.</p>
            <div style="margin: 30px 0;">
              <a href="${window.location.origin}?verify=true" style="background-color: #2c346d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Verify Email Address</a>
            </div>
            <p style="font-size: 12px; color: #666;">If you didn't create an account, you can safely ignore this email.</p>
          </div>
        `;
        
        const res = await sendEmail(userEmail, "Verify your RefCheck account", verificationHtml);
        
        if (res.success) {
          setCooldown(60);
          alert("Verification email resent!");
        } else {
          alert("Failed to resend email. Please try again later.");
        }
      } catch (err) {
        alert("An error occurred. Check your connection.");
      } finally {
        setIsSending(false);
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('refcheck_user');
    window.location.reload();
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl border border-border-light shadow-xl p-10 text-center">
          <div className="size-20 rounded-full bg-amber-50 text-warning flex items-center justify-center mx-auto mb-8 animate-pulse">
            <span className="material-symbols-outlined text-[40px]">mark_email_unread</span>
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Verify your email</h2>
          <p className="text-slate-500 font-medium mt-4 leading-relaxed">
            We sent a verification link to:<br/>
            <span className="text-slate-900 font-bold">{userEmail}</span>
          </p>
          <p className="text-slate-400 text-sm mt-6 mb-10 italic">
            Please check your inbox (and spam folder) to complete your registration.
          </p>

          <div className="space-y-4">
            <button 
              onClick={handleResend}
              disabled={cooldown > 0 || isSending}
              className="w-full h-14 rounded-xl border-2 border-primary text-primary font-black text-sm uppercase tracking-widest hover:bg-primary/5 transition-all disabled:opacity-50 flex items-center justify-center"
            >
              {isSending ? (
                <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              ) : cooldown > 0 ? (
                `Resend in ${cooldown}s`
              ) : (
                'Resend Verification Email'
              )}
            </button>
            <button 
              onClick={handleLogout}
              className="w-full h-12 text-slate-400 font-bold text-sm hover:text-error transition-all"
            >
              Sign out and use a different account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
