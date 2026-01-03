
import React, { useState, useEffect } from 'react';
import { Settings, CreditCard, Shield, Info, ExternalLink, Save, CheckCircle, AlertCircle, Database, Globe } from 'lucide-react';
import { updateSheetRow } from '../services/sheetsService';

interface ConfigItem {
    key: string;
    value: string;
    description: string;
    category: string;
}

interface SettingsManagerProps {
    configs: ConfigItem[];
    onRefresh: () => void;
}

const SettingsManager: React.FC<SettingsManagerProps> = ({ configs, onRefresh }) => {
    const [stripeKey, setStripeKey] = useState('');
    const [businessName, setBusinessName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

    useEffect(() => {
        const stripeConfig = configs.find(c => c.key === 'stripe_api_key');
        const nameConfig = configs.find(c => c.key === 'business_name');
        if (stripeConfig) setStripeKey(stripeConfig.value);
        if (nameConfig) setBusinessName(nameConfig.value);
    }, [configs]);

    const handleSave = async () => {
        setIsSaving(true);
        setSaveStatus('idle');
        try {
            // Save Stripe Key
            await updateSheetRow('CONFIG', 'stripe_api_key', {
                'Setting Key': 'stripe_api_key',
                'Value': stripeKey,
                'Description': 'Restricted API Key for Stripe data fetching',
                'Category': 'Integrations'
            });

            // Save Business Name
            await updateSheetRow('CONFIG', 'business_name', {
                'Setting Key': 'business_name',
                'Value': businessName,
                'Description': 'The name of your business displayed in the UI',
                'Category': 'General'
            });

            setSaveStatus('success');
            onRefresh();
            setTimeout(() => setSaveStatus('idle'), 3000);
        } catch (err) {
            console.error('Failed to save settings:', err);
            setSaveStatus('error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-12 animate-reveal pb-20">
            {/* Header */}
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-5xl font-serif font-bold text-[#1D1D1F] tracking-tight">Config Hub</h1>
                    <p className="text-[#86868B] mt-2 font-medium tracking-wide uppercase text-xs">Manage system integrations and fiscal security</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className={`flex items-center gap-3 px-8 py-3 rounded-2xl font-bold transition-all shadow-lg active:scale-95 ${saveStatus === 'success'
                        ? 'bg-[#1D9D60] text-white'
                        : 'luminous-button-gold text-white shadow-[#B8860B]/20'
                        }`}
                >
                    {isSaving ? (
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : saveStatus === 'success' ? (
                        <CheckCircle size={20} />
                    ) : (
                        <Save size={20} />
                    )}
                    {isSaving ? 'Encrypting...' : saveStatus === 'success' ? 'Vault Updated' : 'Save System Changes'}
                </button>
            </div>

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
                            className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-bold transition-all ${idx === 0 ? 'bg-white text-[#B8860B] shadow-sm border border-black/5' : 'text-[#86868B] hover:bg-white hover:text-[#1D1D1F]'}`}
                        >
                            <item.icon size={18} /> {item.label}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="md:col-span-2 space-y-8">
                    {/* General Section */}
                    <div className="luminous-card p-8 space-y-8 bg-white/80">
                        <h2 className="text-2xl font-serif font-bold text-[#1D1D1F] flex items-center gap-3">
                            <Globe size={20} className="text-[#B8860B]" /> Business Identity
                        </h2>

                        <div className="space-y-3">
                            <label className="text-[10px] font-bold text-[#86868B] uppercase tracking-[0.2em] ml-1">Company Display Name</label>
                            <input
                                type="text"
                                value={businessName}
                                onChange={(e) => setBusinessName(e.target.value)}
                                placeholder="Provider OS"
                                className="w-full bg-[#F5F5F7] border border-black/5 rounded-2xl px-5 py-4 text-[#1D1D1F] font-bold focus:outline-none focus:ring-2 focus:ring-[#B8860B]/10 transition-all shadow-inner"
                            />
                        </div>
                    </div>

                    {/* Stripe Integration Section */}
                    <div className="luminous-card p-8 relative overflow-hidden bg-white/80">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-[#B8860B]/5 blur-3xl rounded-full"></div>

                        <div className="relative space-y-8">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-serif font-bold text-[#1D1D1F] flex items-center gap-3">
                                    <CreditCard size={20} className="text-[#0066CC]" /> Stripe Integration
                                </h2>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${stripeKey ? 'bg-[#1D9D60]/10 text-[#1D9D60] border-[#1D9D60]/20' : 'bg-[#E8E8E8] text-[#86868B] border-black/5'}`}>
                                    {stripeKey ? 'Active Protocol' : 'Sync Offline'}
                                </span>
                            </div>

                            <div className="bg-[#F5F5F7] border border-black/5 rounded-2xl p-6 flex gap-5">
                                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-black/5 shadow-sm shrink-0">
                                    <Info size={24} className="text-[#B8860B]" />
                                </div>
                                <div className="space-y-2">
                                    <p className="text-sm font-bold text-[#1D1D1F]">Configuration Instructions</p>
                                    <p className="text-xs text-[#6E6E73] leading-relaxed font-sans font-medium">
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
                                    <label className="text-[10px] font-bold text-[#86868B] uppercase tracking-[0.2em]">Secure API Protocol Key</label>
                                    <span className="text-[10px] text-[#86868B] font-mono">rk_live_...</span>
                                </div>
                                <input
                                    type="password"
                                    value={stripeKey}
                                    onChange={(e) => setStripeKey(e.target.value)}
                                    placeholder="rk_live_••••••••••••••••••••••••"
                                    className="w-full bg-[#F5F5F7] border border-black/5 rounded-2xl px-5 py-4 text-[#1D1D1F] font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#0066CC]/10 transition-all shadow-inner"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Security Status */}
                    <div className="luminous-card p-6 flex items-center gap-4 text-[#86868B] bg-white/50 border-black/5">
                        <Shield size={20} className="text-[#1D9D60] opacity-70" />
                        <span className="text-xs font-bold uppercase tracking-widest leading-none">Encrypted via Google Cloud Service Auth</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsManager;
