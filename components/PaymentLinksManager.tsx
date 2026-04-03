import React, { useEffect, useState } from 'react';
import { listPaymentLinks } from '../services/dataService';
import { ExternalLink, Copy, Check, Filter } from 'lucide-react';

interface PaymentLinksManagerProps { }

const PaymentLinksManager: React.FC<PaymentLinksManagerProps> = () => {
    const [links, setLinks] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    useEffect(() => {
        loadLinks();
    }, []);

    const loadLinks = async () => {
        setIsLoading(true);
        const data = await listPaymentLinks();
        setLinks(data);
        setIsLoading(false);
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <header className="flex items-end justify-between">
                <div>
                    <h1 className="text-3xl font-serif font-bold text-[#0B3060] tracking-tight">Payment Links</h1>
                    <p className="text-[#64748B] mt-2 font-medium">Manage your active checkout links</p>
                </div>
                <div className="flex gap-2">
                    <button className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-[#0B3060] flex items-center gap-2 shadow-sm hover:bg-gray-50 transition-all">
                        <Filter size={16} /> Filter
                    </button>
                </div>
            </header>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-40 bg-gray-100 rounded-2xl animate-pulse"></div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {links.map((link) => {
                        const items = link.line_items?.data || [];
                        const title = items.length > 0 ? items[0].description : 'Generic Payment Link';
                        const amount = items.length > 0 ? (items[0].amount_total / 100).toLocaleString('en-US', { style: 'currency', currency: items[0].currency }) : 'Variable';

                        return (
                            <div key={link.id} className="bg-white border border-[#E2E8F0] p-6 rounded-2xl shadow-sm hover:shadow-md transition-all group flex flex-col justify-between h-full">
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <span className={`px-2 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider ${link.active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {link.active ? 'Active' : 'Inactive'}
                                        </span>
                                        <a href={link.url} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-blue-600 transition-colors">
                                            <ExternalLink size={18} />
                                        </a>
                                    </div>

                                    <h3 className="text-lg font-bold text-[#0B3060] mb-1 line-clamp-2">{title}</h3>
                                    <p className="text-2xl font-serif text-[#0B3060] mb-4">{amount}</p>
                                </div>

                                <div className="pt-4 border-t border-[#E2E8F0]/50 mt-auto">
                                    <button
                                        onClick={() => copyToClipboard(link.url, link.id)}
                                        className="w-full py-2.5 rounded-xl bg-gray-50 text-[#0B3060] text-xs font-bold hover:bg-black hover:text-white transition-all flex items-center justify-center gap-2"
                                    >
                                        {copiedId === link.id ? <Check size={14} /> : <Copy size={14} />}
                                        {copiedId === link.id ? 'Copied' : 'Copy Link'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default PaymentLinksManager;
