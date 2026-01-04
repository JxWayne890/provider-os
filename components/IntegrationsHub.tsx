
import React, { useState } from 'react';
import { Package, Plus, Link, ArrowUpRight, CheckCircle2, AlertCircle, ShoppingBag, DollarSign, RefreshCw } from 'lucide-react';
import { createStripeProduct, createStripePaymentLink } from '../services/sheetsService';

interface IntegrationsHubProps {
    onRefresh: () => void;
}

const IntegrationsHub: React.FC<IntegrationsHubProps> = ({ onRefresh }) => {
    const [isCreatingProduct, setIsCreatingProduct] = useState(false);
    const [isCreatingLink, setIsCreatingLink] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    // Form states
    const [productName, setProductName] = useState('');
    const [productDesc, setProductDesc] = useState('');
    const [productPrice, setProductPrice] = useState('');
    const [productType, setProductType] = useState<'one_time' | 'recurring'>('one_time');

    const handleCreateProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreatingProduct(true);
        setStatus(null);
        try {
            const result = await createStripeProduct(productName, productDesc, parseFloat(productPrice), productType);
            if (result) {
                setStatus({ type: 'success', message: `Product Created! ID: ${result.productId}` });
                setProductName('');
                setProductDesc('');
                setProductPrice('');
                onRefresh();
            } else {
                throw new Error("Direct cloud sync failed. Backend integration required.");
            }
        } catch (err) {
            setStatus({ type: 'error', message: "Cloud synchronization failed. Please check your backend configuration." });
        } finally {
            setIsCreatingProduct(false);
        }
    };

    return (
        <div className="space-y-10 animate-reveal pb-20">
            <header>
                <h2 className="text-5xl font-serif font-bold text-[#1D1D1F] tracking-tight">Integrations Hub</h2>
                <p className="text-[#86868B] mt-2 font-medium tracking-wide uppercase text-xs">Manage Stripe products and fiscal infrastructure</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Product Creation Card */}
                <div className="luminous-card bg-white p-8 space-y-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#B8860B]/10 rounded-2xl flex items-center justify-center border border-[#B8860B]/20">
                            <Package size={24} className="text-[#B8860B]" />
                        </div>
                        <div>
                            <h3 className="text-xl font-serif font-bold text-[#1D1D1F]">Create Service Product</h3>
                            <p className="text-[10px] text-[#86868B] font-bold uppercase tracking-widest">Formalize your offerings</p>
                        </div>
                    </div>

                    <form onSubmit={handleCreateProduct} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest ml-1">Product Name</label>
                            <input
                                type="text"
                                required
                                value={productName}
                                onChange={(e) => setProductName(e.target.value)}
                                placeholder="e.g. Premium Strategy Audit"
                                className="w-full bg-[#F5F5F7] border border-black/5 rounded-2xl py-4 px-6 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#B8860B]/10"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest ml-1">Description</label>
                            <input
                                type="text"
                                value={productDesc}
                                onChange={(e) => setProductDesc(e.target.value)}
                                placeholder="Brief overview of the service"
                                className="w-full bg-[#F5F5F7] border border-black/5 rounded-2xl py-4 px-6 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#B8860B]/10"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest ml-1">Price (USD)</label>
                                <div className="relative">
                                    <DollarSign size={14} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#86868B]" />
                                    <input
                                        type="number"
                                        required
                                        value={productPrice}
                                        onChange={(e) => setProductPrice(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full bg-[#F5F5F7] border border-black/5 rounded-2xl py-4 pl-12 pr-6 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#B8860B]/10"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest ml-1">Billing</label>
                                <select
                                    className="w-full bg-[#F5F5F7] border border-black/5 rounded-2xl py-4 px-6 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#B8860B]/10 appearance-none cursor-pointer"
                                    value={productType}
                                    onChange={(e) => setProductType(e.target.value as any)}
                                >
                                    <option value="one_time">One-time</option>
                                    <option value="recurring">Recurring (Monthly)</option>
                                </select>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isCreatingProduct}
                            className="w-full py-4 luminous-button-gold rounded-2xl text-sm font-bold shadow-lg shadow-[#B8860B]/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {isCreatingProduct ? <RefreshCw size={18} className="animate-spin" /> : <Plus size={18} />}
                            Sync to Stripe
                        </button>
                    </form>
                </div>

                {/* Status and Catalog Card */}
                <div className="space-y-8">
                    {status && (
                        <div className={`p-6 rounded-3xl border flex items-center gap-4 animate-in slide-in-from-top-4 duration-300 ${status.type === 'success' ? 'bg-[#1D9D60]/5 border-[#1D9D60]/20 text-[#1D9D60]' : 'bg-red-500/5 border-red-500/20 text-red-500'
                            }`}>
                            {status.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                            <div>
                                <p className="text-sm font-bold">{status.type === 'success' ? 'Operation Success' : 'Operation Failed'}</p>
                                <p className="text-xs opacity-80">{status.message}</p>
                            </div>
                        </div>
                    )}

                    <div className="luminous-card bg-[#1D1D1F] p-8 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#B8860B]/10 blur-3xl rounded-full"></div>
                        <div className="relative z-10 space-y-6">
                            <div className="flex items-center gap-4 border-b border-white/10 pb-6">
                                <div className="p-3 bg-white/10 rounded-xl border border-white/10">
                                    <ShoppingBag size={20} className="text-[#B8860B]" />
                                </div>
                                <div>
                                    <h4 className="text-lg font-serif font-bold">Stripe Infrastructure</h4>
                                    <p className="text-[10px] text-[#86868B] font-bold uppercase tracking-widest">Live Catalog Connectivity</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <p className="text-sm text-[#86868B] leading-relaxed">
                                    Your products are automatically synchronized with your Stripe dashboard. Creating a product here also prepares the metadata needed for our local AI auditing.
                                </p>
                                <div className="flex items-center gap-2 text-[#B8860B] font-bold text-xs">
                                    <ArrowUpRight size={14} />
                                    <span>Sync Status: Cloud Infrastructure Active</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IntegrationsHub;
