import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Contract } from '../types';
import { PenTool, Check, Calendar } from 'lucide-react';

interface ContractSigningInterfaceProps {
    contract: Contract;
    onSign: (signatureData: string) => void;
}

const ContractSigningInterface: React.FC<ContractSigningInterfaceProps> = ({ contract, onSign }) => {
    const sigCanvas = useRef<any>({});
    const [isSigned, setIsSigned] = useState(false);

    const clear = () => sigCanvas.current.clear();

    const handleSave = () => {
        if (sigCanvas.current.isEmpty()) {
            alert("Please provide a signature first.");
            return;
        }
        const signatureData = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
        onSign(signatureData);
        setIsSigned(true);
    };

    if (contract.status === 'Signed') {
        return (
            <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-4">
                <div className="bg-white max-w-lg w-full p-10 rounded-3xl shadow-xl text-center animate-in zoom-in-95 duration-300">
                    <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Check size={40} strokeWidth={3} />
                    </div>
                    <h1 className="text-3xl font-serif font-bold text-[#1A1A2E] mb-4">Contract Signed</h1>
                    <p className="text-gray-500">
                        Thank you, {contract.recipientName}. This document has been successfully signed and recorded.
                    </p>
                    <div className="mt-8 pt-8 border-t border-[#E2E8F0] text-xs text-gray-400">
                        Signed on {new Date(contract.signedAt || '').toLocaleString()}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F7F8FA] py-12 px-4 md:px-8">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="w-12 h-12 bg-[#0B3060] text-white rounded-xl flex items-center justify-center mx-auto mb-4 shadow-xl">
                        <PenTool size={20} />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#1A1A2E]">Review & Sign</h1>
                    <p className="text-gray-500">Please review the agreement below and sign to accept.</p>
                </div>

                {/* Contract Paper */}
                <div className="bg-white rounded-none md:rounded rounded-tl-sm shadow-2xl overflow-hidden min-h-[600px] flex flex-col relative paper-texture">
                    {/* Document Header */}
                    <div className="p-8 md:p-12 border-b border-[#E2E8F0]">
                        <h2 className="text-2xl font-bold uppercase tracking-widest text-[#1A1A2E] mb-2">{contract.title}</h2>
                        <div className="flex items-center gap-6 text-sm text-gray-500 mt-4">
                            <span className="flex items-center gap-2">
                                <span className="font-semibold text-black">Recipient:</span> {contract.recipientName}
                            </span>
                            <span className="flex items-center gap-2">
                                <Calendar size={14} />
                                {new Date(contract.createdAt).toLocaleDateString()}
                            </span>
                        </div>
                    </div>

                    {/* Document Content */}
                    <div className="p-8 md:p-12 flex-1 text-gray-800 leading-relaxed space-y-4 font-serif text-lg">
                        {/* Render simplified content for now */}
                        <div className="whitespace-pre-wrap">{contract.content}</div>
                    </div>

                    {/* Signature Area */}
                    <div className="bg-gray-50 p-8 md:p-12 border-t border-gray-200">
                        <p className="font-bold text-[#1A1A2E] mb-4 text-sm uppercase tracking-wider">Sign Here</p>

                        <div className="border-2 border-dashed border-gray-300 rounded-xl bg-white overflow-hidden relative cursor-crosshair hover:border-black transition-colors">
                            <SignatureCanvas
                                ref={sigCanvas}
                                penColor="black"
                                canvasProps={{
                                    className: 'w-full h-48',
                                    style: { width: '100%', height: '200px' }
                                }}
                            />
                            <span className="absolute bottom-2 right-2 text-[10px] text-gray-300 pointer-events-none">X__________________________</span>
                        </div>

                        <div className="flex justify-between items-center mt-4">
                            <button onClick={clear} className="text-sm font-medium text-gray-500 hover:text-black underline">Clear Signature</button>
                            <button
                                onClick={handleSave}
                                className="bg-[#1A1A2E] text-white px-8 py-3 rounded-lg font-bold shadow-lg shadow-black/20 hover:bg-[#333] active:scale-95 transition-all"
                            >
                                Accept & Sign
                            </button>
                        </div>
                    </div>
                </div>

                <div className="text-center text-xs text-gray-400">
                    Powered by ProviderOS Secure Sign
                </div>
            </div>
        </div>
    );
};

export default ContractSigningInterface;
