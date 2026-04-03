import React, { useState } from 'react';
import { Search, Plus, Filter, FileText, Send, CheckCircle, Clock } from 'lucide-react';
import { Contract, Client } from '../types';
import { upsertContract, sendContractEmail } from '../services/dataService';

interface ContractsManagerProps {
    contracts: Contract[];
    clients: Client[];
    onUpdateContract: (contract: Contract) => void;
}

const ContractsManager: React.FC<ContractsManagerProps> = ({ contracts, clients, onUpdateContract }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // New Contract State
    const [newContractTitle, setNewContractTitle] = useState('');
    const [newContractClient, setNewContractClient] = useState('');
    const [newContractContent, setNewContractContent] = useState('');
    const [isSending, setIsSending] = useState<string | null>(null);

    const filteredContracts = contracts.filter(c =>
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.recipientName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleCreateContract = async () => {
        const client = clients.find(c => c.id === newContractClient);
        const newContract: Contract = {
            id: crypto.randomUUID(),
            clientId: newContractClient,
            recipientName: client ? client.primaryContact : 'Unknown Recipient',
            recipientEmail: client ? client.email : '',
            title: newContractTitle,
            content: newContractContent,
            status: 'Draft',
            createdAt: new Date().toISOString()
        };

        // Optimistic Update
        onUpdateContract(newContract);

        // Close & Reset
        setIsCreateModalOpen(false);
        setNewContractTitle('');
        setNewContractClient('');
        setNewContractContent('');
    };

    const handleSendContract = async (contract: Contract) => {
        setIsSending(contract.id);
        const signingLink = `${window.location.origin}?mode=sign&id=${contract.id}`;

        try {
            if (contract.recipientEmail) {
                await sendContractEmail(contract.recipientEmail, contract.recipientName, contract.title, signingLink);

                const updatedContract = { ...contract, status: 'Sent' as const, sentAt: new Date().toISOString() };
                onUpdateContract(updatedContract);
                alert(`Email Sent to ${contract.recipientEmail}!`);
            } else {
                // Fallback if no email
                navigator.clipboard.writeText(signingLink);
                alert(`No email found for recipient. Signing link copied to clipboard.`);
            }
        } catch (err) {
            console.error(err);
            alert("Failed to send email. Check console.");
        } finally {
            setIsSending(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in slide-in-from-top duration-500">
                <div>
                    <h2 className="text-3xl font-serif font-bold text-[#1A1A2E]">Contracts</h2>
                    <p className="text-gray-500 mt-1">Manage and track digital agreements</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 bg-[#1A1A2E] text-white px-5 py-2.5 rounded-xl font-medium hover:bg-[#333] transition-all shadow-lg shadow-black/10 active:scale-95"
                >
                    <Plus size={18} />
                    New Contract
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
                <div className="flex-1 flex items-center gap-3 bg-white px-4 py-3 rounded-xl border border-[#E2E8F0] shadow-sm focus-within:ring-2 focus-within:ring-black/5 transition-all">
                    <Search className="text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search contracts..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-transparent border-none outline-none text-sm w-full placeholder-gray-400"
                    />
                </div>
            </div>

            {/* Contracts List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredContracts.map((contract) => (
                    <div key={contract.id} className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm hover:shadow-md transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-[#1A1A2E] group-hover:text-white transition-colors">
                                <FileText size={20} />
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${contract.status === 'Signed' ? 'bg-emerald-50 text-emerald-600' :
                                contract.status === 'Sent' ? 'bg-blue-50 text-blue-600' :
                                    'bg-gray-100 text-gray-500'
                                }`}>
                                {contract.status}
                            </span>
                        </div>

                        <h3 className="font-bold text-lg text-[#1A1A2E] mb-1">{contract.title}</h3>
                        <p className="text-sm text-gray-500 mb-4">{contract.recipientName}</p>

                        <div className="border-t border-[#E2E8F0]/50 pt-4 flex items-center justify-between text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                                <Clock size={12} />
                                {new Date(contract.createdAt).toLocaleDateString()}
                            </span>

                            {contract.status === 'Draft' && (
                                <button
                                    onClick={() => handleSendContract(contract)}
                                    className="flex items-center gap-1.5 text-[#1A1A2E] font-semibold hover:underline"
                                >
                                    <Send size={12} />
                                    Send to Sign
                                </button>
                            )}

                            {contract.status === 'Signed' && (
                                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                                    <CheckCircle size={12} />
                                    Complete
                                </span>
                            )}
                        </div>
                    </div>
                ))}

                {filteredContracts.length === 0 && (
                    <div className="col-span-full py-20 text-center text-gray-400">
                        <FileText size={48} className="mx-auto mb-4 opacity-20" />
                        <p>No contracts found</p>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-2xl rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-2xl font-serif font-bold mb-6">Create New Contract</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Contract Title</label>
                                <input
                                    type="text"
                                    value={newContractTitle}
                                    onChange={(e) => setNewContractTitle(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-black/5 outline-none"
                                    placeholder="e.g. Service Agreement - Acme Corp"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Client</label>
                                <select
                                    value={newContractClient}
                                    onChange={(e) => setNewContractClient(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-black/5 outline-none appearance-none"
                                >
                                    <option value="">Select a Client...</option>
                                    {clients.map(c => (
                                        <option key={c.id} value={c.id}>{c.companyName} ({c.primaryContact})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Contract Terms (Content)</label>
                                <textarea
                                    value={newContractContent}
                                    onChange={(e) => setNewContractContent(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-black/5 outline-none h-40"
                                    placeholder="Enter contract terms here..."
                                />
                            </div>

                            <div className="pt-6 flex justify-end gap-3">
                                <button
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="px-6 py-3 font-semibold text-gray-500 hover:text-black transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateContract}
                                    disabled={!newContractTitle || !newContractClient}
                                    className="bg-[#1A1A2E] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#333] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Create Draft
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContractsManager;
