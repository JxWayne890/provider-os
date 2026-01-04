
import React, { useState, useEffect } from 'react';
import { Plus, ArrowUpRight, Package, RefreshCw, Search, Users, Target } from 'lucide-react';
import { Lead, Client } from '../types';
import { listStripeProducts, createPaymentLink } from '../services/sheetsService';

interface GlobalHyperLinkEngineProps {
    leads: Lead[];
    clients: Client[];
    isOpen: boolean;
    onClose: () => void;
    initialLead?: Lead | null;
}

const GlobalHyperLinkEngine: React.FC<GlobalHyperLinkEngineProps> = ({
    leads,
    clients,
    isOpen,
    onClose,
    initialLead = null
}) => {
    const [linkLead, setLinkLead] = useState<Lead | Client | null>(initialLead);
    const [linkMode, setLinkMode] = useState<'existing' | 'new'>('existing');
    const [stripeProducts, setStripeProducts] = useState<any[]>([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(false);
    const [selectedPriceId, setSelectedPriceId] = useState('');
    const [newProdName, setNewProdName] = useState('');
    const [newProdAmount, setNewProdAmount] = useState<number>(0);
    const [newProdType, setNewProdType] = useState<'one_time' | 'recurring'>('one_time');
    const [isCreatingLink, setIsCreatingLink] = useState<string | null>(null);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

    // Customization States
    const [automaticTax, setAutomaticTax] = useState(false);
    const [allowPromotionCodes, setAllowPromotionCodes] = useState(false);
    const [collectPhone, setCollectPhone] = useState(false);
    const [collectAddress, setCollectAddress] = useState(false);
    const [collectTaxId, setCollectTaxId] = useState(false);
    const [collectCustomerName, setCollectCustomerName] = useState(false);
    const [collectBusinessName, setCollectBusinessName] = useState(false);
    const [paymentLimit, setPaymentLimit] = useState('');
    const [requireTos, setRequireTos] = useState(false);
    const [savePaymentDetails, setSavePaymentDetails] = useState(false);
    const [submitType, setSubmitType] = useState<'pay' | 'book' | 'donate' | 'auto'>('pay');
    const [customFields, setCustomFields] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen) {
            loadProducts();
        }
    }, [isOpen]);

    const loadProducts = async () => {
        setIsLoadingProducts(true);
        try {
            const products = await listStripeProducts();
            setStripeProducts(products);
            if (products.length > 0) setSelectedPriceId(products[0].default_price?.id || '');
        } catch (err) {
            console.error("Failed to load products:", err);
        } finally {
            setIsLoadingProducts(false);
        }
    };

    const handleExecuteLinkCreation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!linkLead) {
            setStatus({ type: 'error', message: "Please select a lead or client first." });
            return;
        }

        setIsCreatingLink(linkLead.id);
        setStatus(null);
        try {
            let priceId = selectedPriceId;

            if (linkMode === 'new') {
                // Validation
                if (!newProdName || !newProdAmount) {
                    throw new Error("Product name and amount are required");
                }
            }

            const result = await createPaymentLink({
                leadId: linkLead.id,
                leadEmail: linkLead.email,
                priceId: linkMode === 'existing' ? selectedPriceId : null,
                customProduct: linkMode === 'new' ? {
                    name: newProdName,
                    amount: Math.round((newProdAmount || 0) * 100),
                    interval: newProdType === 'recurring' ? 'month' : undefined
                } : undefined,
                automatic_tax: automaticTax,
                allow_promotion_codes: allowPromotionCodes,
                collect_phone: collectPhone,
                collect_address: collectAddress,
                collect_tax_id: collectTaxId,
                collect_customer_name: collectCustomerName,
                collect_business_name: collectBusinessName,
                payment_limit: paymentLimit,
                require_tos: requireTos,
                save_payment_details: savePaymentDetails,
                submit_type: submitType,
                custom_fields: customFields
            });

            if (result.url) {
                setStatus({ type: 'success', message: "Payment link deployed! Redirecting..." });
                setTimeout(() => {
                    window.open(result.url, '_blank');
                    onClose();
                }, 1500);
            }
        } catch (err: any) {
            setStatus({ type: 'error', message: err.message || "Failed to create link" });
        } finally {
            setIsCreatingLink(null);
        }
    };

    // Filtered lists for search
    const filteredLeads = leads.filter(l =>
        `${l.firstName} ${l.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.company.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredClients = clients.filter(c =>
        c.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.primaryContact.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-xl animate-reveal">
            <div className="w-full max-w-2xl bg-white rounded-[40px] shadow-2xl border border-black/5 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-8 border-b border-[#F5F5F7] flex justify-between items-center bg-[#F5F5F7]/30">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#0066CC] rounded-2xl flex items-center justify-center">
                            <ArrowUpRight size={24} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-serif font-bold text-[#1D1D1F]">Global Hyper-Link</h3>
                            <p className="text-[10px] text-[#86868B] font-bold uppercase tracking-widest">
                                {linkLead ? `Generating checkout for ${'companyName' in linkLead ? linkLead.companyName : linkLead.company}` : 'Stripe-Powered Sales Intelligence'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-[#F5F5F7] rounded-xl transition-all">
                        <Plus size={24} className="rotate-45 text-[#86868B]" />
                    </button>
                </div>

                <form onSubmit={handleExecuteLinkCreation} className="p-10 space-y-8 overflow-y-auto">
                    {/* Categorized Lead/Client Picker */}
                    <div className="space-y-4 animate-reveal">
                        <label className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest ml-1">Select Lead or Client</label>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#86868B]">
                                <Search size={18} />
                            </div>
                            <input
                                type="text"
                                placeholder="Search leads or clients..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-[#F5F5F7] border border-black/5 rounded-2xl py-4 pl-12 pr-6 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066CC]/10"
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto p-2 bg-[#F5F5F7]/50 rounded-2xl border border-black/5">
                            {linkLead ? (
                                <div className="animate-reveal">
                                    <div className="flex items-center justify-between bg-[#0066CC] text-white px-4 py-2 rounded-xl shadow-md border border-white/10 group">
                                        <div className="flex items-center gap-2">
                                            {('firstName' in linkLead) ? <Target size={12} className="opacity-70" /> : <Users size={12} className="opacity-70" />}
                                            <span className="text-sm font-bold uppercase tracking-wider">
                                                {('companyName' in linkLead) ? linkLead.companyName : linkLead.company}
                                            </span>
                                            <span className="text-[10px] opacity-70">
                                                ({('primaryContact' in linkLead) ? linkLead.primaryContact : linkLead.firstName})
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setLinkLead(null)}
                                            className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
                                        >
                                            <Plus size={16} className="rotate-45" />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {filteredLeads.length > 0 && (
                                        <div className="space-y-1">
                                            <div className="text-[9px] font-bold text-[#86868B] uppercase tracking-[0.2em] px-2 py-1 flex items-center gap-2">
                                                <Target size={10} /> Leads
                                            </div>
                                            {filteredLeads.map(l => (
                                                <button
                                                    key={l.id}
                                                    type="button"
                                                    onClick={() => setLinkLead(l)}
                                                    className="w-full text-left px-4 py-2 rounded-xl text-sm transition-all flex items-center justify-between hover:bg-white text-[#1D1D1F]"
                                                >
                                                    <span>{l.company} <span className="opacity-60 text-xs ml-2">({l.firstName})</span></span>
                                                    <Plus size={14} className="opacity-0 group-hover:opacity-100" />
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {filteredClients.length > 0 && (
                                        <div className="space-y-1 mt-3">
                                            <div className="text-[9px] font-bold text-[#86868B] uppercase tracking-[0.2em] px-2 py-1 flex items-center gap-2">
                                                <Users size={10} /> Clients
                                            </div>
                                            {filteredClients.map(c => (
                                                <button
                                                    key={c.id}
                                                    type="button"
                                                    onClick={() => setLinkLead(c)}
                                                    className="w-full text-left px-4 py-2 rounded-xl text-sm transition-all flex items-center justify-between hover:bg-white text-[#1D1D1F]"
                                                >
                                                    <span>{c.companyName} <span className="opacity-60 text-xs ml-2">({c.primaryContact})</span></span>
                                                    <Plus size={14} className="opacity-0 group-hover:opacity-100" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {filteredLeads.length === 0 && filteredClients.length === 0 && (
                                        <div className="py-4 text-center text-[#86868B] text-[10px] font-bold uppercase tracking-widest">
                                            No matches found
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {status && (
                        <div className={`p-4 rounded-2xl text-xs font-bold animate-reveal ${status.type === 'success' ? 'bg-[#1D9D60]/10 text-[#1D9D60]' : 'bg-red-500/10 text-red-500'}`}>
                            {status.message}
                        </div>
                    )}

                    <div className="flex bg-[#F5F5F7] p-1.5 rounded-2xl">
                        <button
                            type="button"
                            onClick={() => setLinkMode('existing')}
                            className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${linkMode === 'existing' ? 'bg-white text-[#1D1D1F] shadow-sm' : 'text-[#86868B]'}`}
                        >
                            Existing Product
                        </button>
                        <button
                            type="button"
                            onClick={() => setLinkMode('new')}
                            className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${linkMode === 'new' ? 'bg-white text-[#1D1D1F] shadow-sm' : 'text-[#86868B]'}`}
                        >
                            Custom Offer
                        </button>
                    </div>

                    {linkMode === 'existing' ? (
                        <div className="space-y-4">
                            <label className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest ml-1">Select Stripe Product</label>
                            {isLoadingProducts ? (
                                <div className="flex items-center justify-center py-8 text-[#86868B]">
                                    <RefreshCw size={24} className="animate-spin opacity-20" />
                                </div>
                            ) : (
                                <select
                                    className="w-full bg-[#F5F5F7] border border-black/5 rounded-2xl py-4 px-6 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[#0066CC]/10"
                                    value={selectedPriceId}
                                    onChange={(e) => setSelectedPriceId(e.target.value)}
                                >
                                    {stripeProducts.length > 0 ? stripeProducts.map(p => (
                                        <option key={p.id} value={p.default_price?.id || ''}>{p.name} — ${((p.default_price?.unit_amount || 0) / 100).toLocaleString()}</option>
                                    )) : (
                                        <option disabled>No products found in Stripe</option>
                                    )}
                                </select>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6 animate-reveal">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest ml-1">Product Name</label>
                                <input
                                    required
                                    className="w-full bg-[#F5F5F7] border border-black/5 rounded-2xl py-4 px-6 text-sm"
                                    placeholder="e.g. Q1 Strategy Retainer"
                                    value={newProdName}
                                    onChange={e => setNewProdName(e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest ml-1">Amount ($)</label>
                                    <input
                                        required type="number"
                                        className="w-full bg-[#F5F5F7] border border-black/5 rounded-2xl py-4 px-6 text-sm"
                                        placeholder="1500"
                                        value={newProdAmount || ''}
                                        onChange={e => setNewProdAmount(parseFloat(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest ml-1">Billing Type</label>
                                    <select
                                        className="w-full bg-[#F5F5F7] border border-black/5 rounded-2xl py-4 px-6 text-sm appearance-none"
                                        value={newProdType}
                                        onChange={e => setNewProdType(e.target.value as any)}
                                    >
                                        <option value="one_time">One-Time</option>
                                        <option value="recurring">Monthly Recurring</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-6 pt-6 border-t border-[#F5F5F7]">
                        <h4 className="text-xl font-bold text-[#1D1D1F]">Options</h4>

                        <div className="space-y-5">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input type="checkbox" checked={automaticTax} onChange={e => setAutomaticTax(e.target.checked)} className="w-[18px] h-[18px] rounded border-black/10 text-[#0066CC] focus:ring-0" />
                                <span className="text-sm font-medium text-[#424245]">Collect tax automatically</span>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input type="checkbox" checked={collectCustomerName} onChange={e => setCollectCustomerName(e.target.checked)} className="w-[18px] h-[18px] rounded border-black/10 text-[#0066CC] focus:ring-0" />
                                <span className="text-sm font-medium text-[#424245]">Collect customers' names</span>
                                <span className="px-1.5 py-0.5 bg-[#635BFF]/10 text-[#635BFF] text-[9px] font-bold rounded uppercase">New</span>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input type="checkbox" checked={collectBusinessName} onChange={e => setCollectBusinessName(e.target.checked)} className="w-[18px] h-[18px] rounded border-black/10 text-[#0066CC] focus:ring-0" />
                                <span className="text-sm font-medium text-[#424245]">Collect businesses' names</span>
                                <span className="px-1.5 py-0.5 bg-[#635BFF]/10 text-[#635BFF] text-[9px] font-bold rounded uppercase">New</span>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input type="checkbox" checked={collectAddress} onChange={e => setCollectAddress(e.target.checked)} className="w-[18px] h-[18px] rounded border-black/10 text-[#0066CC] focus:ring-0" />
                                <span className="text-sm font-medium text-[#424245]">Collect customers' addresses</span>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input type="checkbox" checked={collectPhone} onChange={e => setCollectPhone(e.target.checked)} className="w-[18px] h-[18px] rounded border-black/10 text-[#0066CC] focus:ring-0" />
                                <span className="text-sm font-medium text-[#424245] flex items-center gap-1.5">
                                    Require customers to provide a phone number
                                    <span className="w-4 h-4 rounded-full bg-[#86868B]/10 flex items-center justify-center text-[10px] text-[#86868B] cursor-help">i</span>
                                </span>
                            </label>

                            <div className="space-y-2">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input type="checkbox" checked={!!paymentLimit} onChange={e => setPaymentLimit(e.target.checked ? '1' : '')} className="w-[18px] h-[18px] rounded border-black/10 text-[#0066CC] focus:ring-0" />
                                    <span className="text-sm font-medium text-[#424245] flex items-center gap-1.5">
                                        Limit the number of payments
                                        <span className="w-4 h-4 rounded-full bg-[#86868B]/10 flex items-center justify-center text-[10px] text-[#86868B] cursor-help">i</span>
                                    </span>
                                </label>
                                {paymentLimit && (
                                    <div className="ml-8 animate-reveal">
                                        <input
                                            type="number"
                                            value={paymentLimit}
                                            onChange={e => setPaymentLimit(e.target.value)}
                                            className="w-32 bg-[#F5F5F7] border border-black/5 rounded-xl py-2 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066CC]/10"
                                            placeholder="Limit count"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                            className="flex items-center gap-2 text-xl font-bold text-[#1D1D1F] hover:opacity-70 transition-all"
                        >
                            Advanced options {isAdvancedOpen ? '▾' : '▸'}
                        </button>

                        {isAdvancedOpen && (
                            <div className="space-y-5 animate-reveal">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input type="checkbox" className="w-[18px] h-[18px] rounded border-black/10 text-[#0066CC] focus:ring-0" />
                                    <span className="text-sm font-medium text-[#424245] flex items-center gap-1.5">
                                        Add custom fields
                                        <span className="w-4 h-4 rounded-full bg-[#86868B]/10 flex items-center justify-center text-[10px] text-[#86868B] cursor-help">i</span>
                                    </span>
                                </label>

                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input type="checkbox" checked={allowPromotionCodes} onChange={e => setAllowPromotionCodes(e.target.checked)} className="w-[18px] h-[18px] rounded border-black/10 text-[#0066CC] focus:ring-0" />
                                    <span className="text-sm font-medium text-[#424245] flex items-center gap-1.5">
                                        Allow promotion codes
                                        <span className="w-4 h-4 rounded-full bg-[#86868B]/10 flex items-center justify-center text-[10px] text-[#86868B] cursor-help">i</span>
                                    </span>
                                </label>

                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input type="checkbox" checked={collectTaxId} onChange={e => setCollectTaxId(e.target.checked)} className="w-[18px] h-[18px] rounded border-black/10 text-[#0066CC] focus:ring-0" />
                                    <span className="text-sm font-medium text-[#424245] flex items-center gap-1.5">
                                        Allow business customers to provide tax IDs
                                        <span className="w-4 h-4 rounded-full bg-[#86868B]/10 flex items-center justify-center text-[10px] text-[#86868B] cursor-help">i</span>
                                    </span>
                                </label>

                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input type="checkbox" checked={savePaymentDetails} onChange={e => setSavePaymentDetails(e.target.checked)} className="w-[18px] h-[18px] rounded border-black/10 text-[#0066CC] focus:ring-0" />
                                    <span className="text-sm font-medium text-[#424245] flex items-center gap-1.5">
                                        Save payment details for future use
                                        <span className="w-4 h-4 rounded-full bg-[#86868B]/10 flex items-center justify-center text-[10px] text-[#86868B] cursor-help">i</span>
                                    </span>
                                </label>

                                <label className="flex items-center gap-3 cursor-pointer group opacity-40 grayscale">
                                    <input type="checkbox" checked={requireTos} onChange={e => setRequireTos(e.target.checked)} disabled className="w-[18px] h-[18px] rounded border-black/10 text-[#0066CC] focus:ring-0" />
                                    <span className="text-sm font-medium text-[#424245] flex items-center gap-1.5">
                                        Require customers to accept your terms of service
                                        <span className="w-4 h-4 rounded-full bg-[#86868B]/10 flex items-center justify-center text-[10px] text-[#86868B] cursor-help">i</span>
                                    </span>
                                </label>

                                <div className="flex items-center gap-3 pt-2">
                                    <div className="relative">
                                        <select
                                            value={submitType}
                                            onChange={e => setSubmitType(e.target.value as any)}
                                            className="appearance-none bg-white border border-black/10 rounded-lg py-1.5 pl-3 pr-8 text-sm font-semibold text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0066CC]/10"
                                        >
                                            <option value="pay">Pay</option>
                                            <option value="book">Book</option>
                                            <option value="donate">Donate</option>
                                        </select>
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[#86868B]">
                                            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </div>
                                    </div>
                                    <span className="text-sm font-medium text-[#424245]">as the call to action</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isCreatingLink !== null}
                        className="w-full py-5 bg-[#0066CC] text-white rounded-2xl text-[11px] font-bold uppercase tracking-[0.2em] shadow-lg shadow-[#0066CC]/20 hover:bg-[#0052A3] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {isCreatingLink ? <RefreshCw className="animate-spin" size={18} /> : <Package size={18} />}
                        Deploy Secure Payment Link
                    </button>
                </form>
            </div>
        </div>
    );
};

export default GlobalHyperLinkEngine;
