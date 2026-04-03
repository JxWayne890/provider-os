import React, { useState, useCallback } from 'react';
import { Upload, File, Trash2, Download, Loader2, Paperclip, Image, FileText } from 'lucide-react';
import { Attachment } from '../types';
import { uploadFile, deleteAttachment, fetchAttachments } from '../services/dataService';

interface FileAttachmentsProps {
  entityType: 'client' | 'project' | 'contract';
  entityId: string;
  attachments: Attachment[];
  onUpdate: () => void;
}

const FileAttachments: React.FC<FileAttachmentsProps> = ({ entityType, entityId, attachments, onUpdate }) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleUpload = async (files: FileList | null) => {
    if (!files) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await uploadFile(file, entityType, entityId);
      }
      onUpdate();
    } catch (err) { console.error('Upload error:', err); }
    finally { setUploading(false); }
  };

  const handleDelete = async (id: string) => {
    await deleteAttachment(id);
    onUpdate();
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    handleUpload(e.dataTransfer.files);
  }, [entityType, entityId]);

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image size={18} className="text-blue-500" />;
    if (mimeType.includes('pdf')) return <FileText size={18} className="text-red-500" />;
    return <File size={18} className="text-gray-500" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const entityAttachments = attachments.filter(a => a.entityType === entityType && a.entityId === entityId);

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
          dragOver ? 'border-[#FF9F1C] bg-[#FF9F1C]/5' : 'border-gray-200 hover:border-gray-300'
        }`}
        onClick={() => document.getElementById(`file-input-${entityId}`)?.click()}
      >
        {uploading ? (
          <Loader2 size={24} className="mx-auto text-[#FF9F1C] animate-spin mb-2" />
        ) : (
          <Upload size={24} className="mx-auto text-[#64748B] mb-2" />
        )}
        <p className="text-sm font-medium text-[#64748B]">
          {uploading ? 'Uploading...' : 'Drop files here or click to upload'}
        </p>
        <input id={`file-input-${entityId}`} type="file" multiple className="hidden" onChange={e => handleUpload(e.target.files)} />
      </div>

      {/* File list */}
      {entityAttachments.length > 0 && (
        <div className="space-y-2">
          {entityAttachments.map(a => (
            <div key={a.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl group">
              <div className="flex items-center gap-3 min-w-0">
                {getFileIcon(a.mimeType)}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#1A1A2E] truncate">{a.fileName}</p>
                  <p className="text-[10px] text-[#64748B]">{formatSize(a.fileSize)}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <a href={a.fileUrl} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-gray-200 rounded-lg"><Download size={14} className="text-[#64748B]" /></a>
                <button onClick={() => handleDelete(a.id)} className="p-2 hover:bg-red-50 rounded-lg"><Trash2 size={14} className="text-red-400" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileAttachments;
