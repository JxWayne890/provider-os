
import React, { useState, useEffect } from 'react';
import { Settings, CreditCard, Shield, Info, ExternalLink, Save, CheckCircle, AlertCircle, Database, Globe } from 'lucide-react';
import { ConfigItem } from '../types';
import { upsertConfig } from '../services/dataService';

interface SettingsManagerProps {
    configs: ConfigItem[];
    onRefresh: () => void;
}

const SettingsManager: React.FC<SettingsManagerProps> = ({ configs, onRefresh }) => {
    const [stripeKey, setStripeKey] = useState('');
    const [googleKey, setGoogleKey] = useState('');
    const [businessName, setBusinessName] = useState('');
    const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const stripeConfig = configs.find(c => c.key === 'stripe_api_key');
        const googleConfig = configs.find(c => c.key === 'google_api_key');
        const nameConfig = configs.find(c => c.key === 'business_name');
        if (stripeConfig) setStripeKey(stripeConfig.value);
        if (googleConfig) setGoogleKey(googleConfig.value);
        if (nameConfig) setBusinessName(nameConfig.value);
        const tzConfig = configs.find(c => c.key === 'timezone');
        if (tzConfig) setTimezone(tzConfig.value);
    }, [configs]);

    const handleSave = async () => {
        setIsSaving(true);
        setSaveStatus('idle');
        try {
            // Save Stripe Key
            const stripeOk = await upsertConfig({
                key: 'stripe_api_key',
                value: stripeKey,
                description: 'Restricted API Key for Stripe data fetching',
                category: 'Integrations'
            });

            // Save Google Key
            const googleOk = await upsertConfig({
                key: 'google_api_key',
                value: googleKey,
                description: 'Google Sheets API Key (Read-only access)',
                category: 'System'
            });

            // Save Business Name
            const nameOk = await upsertConfig({
                key: 'business_name',
                value: businessName,
                description: 'The name of your business displayed in the UI',
                category: 'General'
            });

            const tzOk = await upsertConfig({
                key: 'timezone',
                value: timezone,
                description: 'Display timezone for calendar and dates',
                category: 'General'
            });

            if (!stripeOk || !googleOk || !nameOk || !tzOk) {
                setErrorMessage('Webhook URL missing or Connection failed');
                setSaveStatus('error');
                return;
            }

            setSaveStatus('success');
            setErrorMessage('');
            onRefresh();
            setTimeout(() => setSaveStatus('idle'), 3000);
        } catch (err) {
            console.error('Failed to save settings:', err);
            setSaveStatus('error');
            setErrorMessage('Network or Server Error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = () => {
        if (window.confirm('Clear all local integration keys and reset to system defaults?')) {
            localStorage.removeItem('OS_LOCAL_CONFIG');
            setStripeKey('');
            setGoogleKey('');
            setSaveStatus('success');
            setTimeout(() => {
                setSaveStatus('idle');
                onRefresh();
            }, 1000);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-12 animate-reveal pb-20">
            {/* Header */}
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-5xl font-serif font-bold text-[#1A1A2E] tracking-tight">Config Hub</h1>
                    <p className="text-[#64748B] mt-2 font-medium tracking-wide uppercase text-xs">Manage system integrations and fiscal security</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleReset}
                        className="px-6 py-3 rounded-2xl font-bold bg-[#F7F8FA] text-[#64748B] hover:text-[#1A1A2E] border border-black/5 transition-all active:scale-95"
                    >
                        Reset Integration
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`flex items-center gap-3 px-8 py-3 rounded-2xl font-bold transition-all shadow-lg active:scale-95 ${saveStatus === 'success'
                            ? 'bg-[#1D9D60] text-white'
                            : 'luminous-button-gold text-white shadow-[#FF9F1C]/20'
                            }`}
                    >
                        {isSaving ? (
                            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : saveStatus === 'success' ? (
                            <CheckCircle size={20} />
                        ) : (
                            <Save size={20} />
                        )}
                        {isSaving ? 'Encrypting...' : saveStatus === 'success' ? 'Vault Updated' : saveStatus === 'error' ? 'Connection Error' : 'Save System Changes'}
                    </button>
                </div>
            </div>

            {saveStatus === 'error' && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-center gap-3 text-red-600 animate-reveal">
                    <AlertCircle size={20} />
                    <span className="text-sm font-bold uppercase tracking-tight">{errorMessage}</span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                {/* Sidebar Nav */}
                <div className="space-y-2">
                    {[
                        { id: 'general', icon: Globe, label: 'General Identity' },
                        { id: 'integrations', icon: CreditCard, label: 'Financial Matrix' },
                        { id: 'security', icon: Shield, label: 'Security & Auth' },
                        { id: 'data', icon: Database, label: 'Data Management' }
                    ].map((item, idx) => (
                        <button
                            key={item.id}
                            className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-bold transition-all ${idx === 0 ? 'bg-white text-[#FF9F1C] shadow-sm border border-black/5' : 'text-[#64748B] hover:bg-white hover:text-[#1A1A2E]'}`}
                        >
                            <item.icon size={18} /> {item.label}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="md:col-span-2 space-y-8">
                    {/* General Section */}
                    <div className="luminous-card p-8 space-y-8 bg-white/80">
                        <h2 className="text-2xl font-serif font-bold text-[#1A1A2E] flex items-center gap-3">
                            <Globe size={20} className="text-[#FF9F1C]" /> Business Identity
                        </h2>

                        <div className="space-y-3">
                            <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-[0.2em] ml-1">Company Display Name</label>
                            <input
                                type="text"
                                value={businessName}
                                onChange={(e) => setBusinessName(e.target.value)}
                                placeholder="Provider OS"
                                className="w-full bg-[#F7F8FA] border border-black/5 rounded-2xl px-5 py-4 text-[#1A1A2E] font-bold focus:outline-none focus:ring-2 focus:ring-[#FF9F1C]/10 transition-all shadow-inner"
                            />
                        </div>
                    </div>

                    {/* Timezone Setting */}
                    <div className="luminous-card p-8 bg-white/80">
                        <h2 className="text-2xl font-serif font-bold text-[#1A1A2E] flex items-center gap-3 mb-6">
                            <Globe size={20} className="text-[#FF9F1C]" /> Timezone
                        </h2>
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-[0.2em] ml-1">Display Timezone</label>
                            <select
                                value={timezone}
                                onChange={(e) => setTimezone(e.target.value)}
                                className="w-full bg-[#F7F8FA] border border-black/5 rounded-2xl px-5 py-4 text-[#1A1A2E] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#FF9F1C]/10 transition-all appearance-none cursor-pointer"
                            >
                                {[
                                    "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
                                    "America/Phoenix", "America/Anchorage", "Pacific/Honolulu",
                                    "Europe/London", "Europe/Paris", "Europe/Berlin",
                                    "Asia/Tokyo", "Asia/Shanghai", "Asia/Kolkata", "Asia/Dubai",
                                    "Australia/Sydney", "Pacific/Auckland",
                                    "UTC"
                                ].map(tz => (
                                    <option key={tz} value={tz}>{tz.replace(/_/g, " ")} ({new Date().toLocaleTimeString("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" })})</option>
                                ))}
                            </select>
                            <p className="text-xs text-[#64748B] ml-1">Controls how times are displayed in the Sessions calendar.</p>
                        </div>
                    </div>

                    {/* Stripe Integration Section */}
                    <div className="luminous-card p-8 relative overflow-hidden bg-white/80">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-[#FF9F1C]/5 blur-3xl rounded-full"></div>

                        <div className="relative space-y-8">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-serif font-bold text-[#1A1A2E] flex items-center gap-3">
                                    <CreditCard size={20} className="text-[#0066CC]" /> Stripe Integration
                                </h2>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${stripeKey ? 'bg-[#1D9D60]/10 text-[#1D9D60] border-[#1D9D60]/20' : 'bg-[#E8E8E8] text-[#64748B] border-black/5'}`}>
                                    {stripeKey ? 'Active Protocol' : 'Sync Offline'}
                                </span>
                            </div>

                            <div className="bg-[#F7F8FA] border border-black/5 rounded-2xl p-6 flex gap-5">
                                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-black/5 shadow-sm shrink-0">
                                    <Info size={24} className="text-[#FF9F1C]" />
                                </div>
                                <div className="space-y-2">
                                    <p className="text-sm font-bold text-[#1A1A2E]">Configuration Instructions</p>
                                    <p className="text-xs text-[#64748B] leading-relaxed font-sans font-medium">
                                        Utilize a <strong>Restricted API Key</strong> for maximum fiscal security.
                                        Grant <code>Read</code> access to <code>Charges</code> and <code>Customers</code> via your Stripe Dashboard.
                                    </p>
                                    <a
                                        href="https://dashboard.stripe.com/apikeys"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-[10px] font-bold text-[#0066CC] hover:underline mt-2 font-mono"
                                    >
                                        System Access Panel <ExternalLink size={12} />
                                    </a>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center ml-1">
                                    <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-[0.2em]">Master Sheet API Key</label>
                                    <span className="text-[10px] text-[#64748B] font-sans">Required for direct sync</span>
                                </div>
                                <input
                                    type="password"
                                    value={googleKey}
                                    onChange={(e) => setGoogleKey(e.target.value)}
                                    placeholder="Enter Google Sheets API Key..."
                                    className="w-full bg-[#F7F8FA] border border-black/5 rounded-2xl px-5 py-4 text-[#1A1A2E] font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9F1C]/10 transition-all shadow-inner"
                                />
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center ml-1">
                                    <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-[0.2em]">Secure API Protocol Key</label>
                                    <span className="text-[10px] text-[#64748B] font-mono">rk_live_...</span>
                                </div>
                                <input
                                    type="password"
                                    value={stripeKey}
                                    onChange={(e) => setStripeKey(e.target.value)}
                                    placeholder="rk_live_••••••••••••••••••••••••"
                                    className="w-full bg-[#F7F8FA] border border-black/5 rounded-2xl px-5 py-4 text-[#1A1A2E] font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#0066CC]/10 transition-all shadow-inner"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Security Status */}
                    <div className="luminous-card p-6 flex items-center gap-4 text-[#64748B] bg-white/50 border-black/5">
                        <Shield size={20} className="text-[#1D9D60] opacity-70" />
                        <span className="text-xs font-bold uppercase tracking-widest leading-none">Encrypted via Google Cloud Service Auth</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsManager;
