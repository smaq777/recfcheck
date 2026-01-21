
import React from 'react';
import { AppView } from '../types';

interface PricingPageProps {
  onNavigate: (view: AppView) => void;
}

const PricingPage: React.FC<PricingPageProps> = ({ onNavigate }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-20 lg:py-32">
      <div className="max-w-4xl text-center mb-16">
        <h1 className="text-5xl lg:text-6xl font-black tracking-tight text-slate-900 mb-6">Simple, Transparent Pricing</h1>
        <p className="text-xl text-slate-500 leading-relaxed max-w-2xl mx-auto font-medium">
          Plans that scale with your research needs, from individual referencing to team collaboration.
        </p>
        
        {/* Toggle */}
        <div className="mt-10 flex items-center justify-center gap-4">
          <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Monthly</span>
          <button className="relative inline-flex h-7 w-14 flex-shrink-0 cursor-pointer rounded-full bg-primary p-1 shadow-inner ring-0 transition-colors">
            <span className="translate-x-7 inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200"></span>
          </button>
          <span className="text-sm font-bold text-slate-900 uppercase tracking-widest">Yearly <span className="ml-1 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-black text-success uppercase tracking-widest">Save 20%</span></span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 w-full max-w-7xl">
        {[
          { 
            name: 'Basic', 
            price: '$0', 
            desc: 'Essential tools for students.', 
            features: ['100 References per month', '7-day History', 'Standard PDF Export'],
            cta: 'Start Free',
            highlight: false
          },
          { 
            name: 'Pro', 
            price: '$12', 
            desc: 'Power for serious researchers.', 
            features: ['Unlimited References', 'Permanent History', 'BibTeX & CSV Export', 'Priority Support'],
            cta: 'Upgrade to Pro',
            highlight: true,
            label: 'Most Popular'
          },
          { 
            name: 'Team', 
            price: '$49', 
            desc: 'Collaboration for labs.', 
            features: ['Shared Workspaces', 'Admin Dashboard', 'API Access', 'Dedicated Support'],
            cta: 'Create Team',
            highlight: false
          }
        ].map(plan => (
          <div 
            key={plan.name}
            className={`relative flex flex-col rounded-3xl p-10 transition-all hover:-translate-y-2 ${
              plan.highlight 
                ? 'bg-primary text-white shadow-2xl shadow-primary/30 ring-4 ring-primary/10' 
                : 'bg-white border border-border-light shadow-sm text-slate-900'
            }`}
          >
            {plan.label && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary text-white border-4 border-white dark:border-primary px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] shadow-lg">
                {plan.label}
              </div>
            )}
            <h3 className={`text-2xl font-black mb-2 ${plan.highlight ? 'text-blue-100' : 'text-slate-400 uppercase tracking-widest text-sm'}`}>{plan.name}</h3>
            <p className={`text-sm mb-8 ${plan.highlight ? 'text-blue-100' : 'text-slate-500'}`}>{plan.desc}</p>
            <div className="mb-10 flex items-baseline gap-1">
              <span className="text-6xl font-black">{plan.price}</span>
              <span className={`text-lg font-bold ${plan.highlight ? 'text-blue-100' : 'text-slate-400'}`}>/mo</span>
            </div>
            <ul className="mb-12 space-y-5 flex-1">
              {plan.features.map(f => (
                <li key={f} className="flex items-start gap-3">
                  <span className={`material-symbols-outlined text-[20px] ${plan.highlight ? 'text-blue-200' : 'text-primary'}`}>check_circle</span>
                  <span className={`text-sm font-bold ${plan.highlight ? 'text-blue-50' : 'text-slate-600'}`}>{f}</span>
                </li>
              ))}
            </ul>
            <button 
              onClick={() => onNavigate(AppView.NEW_CHECK)}
              className={`w-full py-4 rounded-2xl text-lg font-black transition-all ${
                plan.highlight 
                  ? 'bg-white text-primary shadow-xl hover:bg-blue-50' 
                  : 'bg-primary text-white hover:bg-primary-hover shadow-lg shadow-primary/20'
              }`}
            >
              {plan.cta}
            </button>
          </div>
        ))}
      </div>
      
      <button 
        onClick={() => onNavigate(AppView.LANDING)}
        className="mt-16 text-slate-400 hover:text-primary font-bold text-sm underline flex items-center gap-2"
      >
        <span className="material-symbols-outlined text-[18px]">west</span>
        Back to Home
      </button>
    </div>
  );
};

export default PricingPage;
