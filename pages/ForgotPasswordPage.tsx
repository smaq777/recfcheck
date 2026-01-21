
import React, { useState } from 'react';
import { AppView } from '../types';
import { sendEmail } from '../services';

interface ForgotPasswordPageProps {
  onNavigate: (view: AppView) => void;
}

const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const resetHtml = `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #2c346d;">Reset your RefCheck password</h2>
          <p>We received a request to reset your password. Click the button below to proceed.</p>
          <div style="margin: 30px 0;">
            <a href="${window.location.origin}?reset=true" style="background-color: #2c346d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Password</a>
          </div>
          <p style="font-size: 12px; color: #666;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `;
      
      const res = await sendEmail(email, "Reset your RefCheck password", resetHtml);
      
      if (!res.success) {
        throw new Error("Failed to send reset link. Please verify your email address.");
      }
      
      setIsSent(true);
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl border border-border-light shadow-xl p-8 lg:p-10">
          {!isSent ? (
            <>
              <div className="mb-8">
                <button onClick={() => onNavigate(AppView.LOGIN)} className="flex items-center gap-2 text-slate-400 hover:text-primary font-bold text-xs uppercase tracking-widest mb-6">
                  <span className="material-symbols-outlined text-[18px]">west</span> Back
                </button>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Reset password</h2>
                <p className="text-slate-500 font-medium mt-2">Enter your email and we'll send you a recovery link.</p>
              </div>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 text-error text-sm font-bold border border-red-100 flex items-center gap-3">
                  <span className="material-symbols-outlined text-lg">error</span>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email Address</label>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full h-12 px-4 rounded-xl border-border-light bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all font-medium" />
                </div>
                <button type="submit" disabled={isLoading} className="w-full h-14 rounded-xl bg-primary text-white font-black text-lg shadow-xl shadow-primary/20 hover:bg-primary-hover transition-all flex items-center justify-center">
                  {isLoading ? <div className="size-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Send Reset Link'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-6">
              <div className="size-20 rounded-full bg-blue-50 text-primary flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-[40px]">mail</span>
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Check your email</h2>
              <p className="text-slate-500 font-medium mt-4 leading-relaxed">
                We've sent a password reset link to <span className="text-slate-900 font-bold">{email}</span>.
              </p>
              <button onClick={() => onNavigate(AppView.LOGIN)} className="mt-8 text-primary font-black text-sm uppercase tracking-widest hover:underline">
                Back to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
