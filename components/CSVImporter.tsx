import React, { useState, useCallback } from 'react';
import { Upload, X, Check, AlertTriangle, FileSpreadsheet, ClipboardPaste } from 'lucide-react';
import { CampaignLead, SendStatus } from '../types';

interface CSVImporterProps {
  campaignId: string;
  onImport: (leads: CampaignLead[]) => Promise<void>;
  existingEmails: Set<string>;
  suppressedEmails: Set<string>;
}

function generateId() {
  return crypto.randomUUID();
}

function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/)[0] || '';
  const tabs = (firstLine.match(/\t/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  return tabs > commas ? '\t' : ',';
}

function parseDelimited(text: string, delimiter?: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const delim = delimiter || detectDelimiter(text);

  const parseLine = (line: string): string[] => {
    if (delim === '\t') {
      // Tab-separated: simple split (Google Sheets doesn't quote-wrap on paste)
      return line.split('\t').map(c => c.trim());
    }
    // CSV: handle quoted fields
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const CSVImporter: React.FC<CSVImporterProps> = ({ campaignId, onImport, existingEmails, suppressedEmails }) => {
  const [file, setFile] = useState<File | null>(null);
  const [pasteSource, setPasteSource] = useState(false);
  const [parsed, setParsed] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [mapping, setMapping] = useState<Record<string, number>>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number; invalid: number } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [showPaste, setShowPaste] = useState(false);

  const fields = [
    { key: 'email', label: 'Email *', required: true },
    { key: 'companyName', label: 'Company Name' },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State' },
    { key: 'country', label: 'Country' },
    { key: 'website', label: 'Website' },
  ];

  const autoMapHeaders = useCallback((data: { headers: string[]; rows: string[][] }) => {
    const autoMap: Record<string, number> = {};
    const headerLower = data.headers.map(h => h.toLowerCase().replace(/[^a-z]/g, ''));
    fields.forEach(field => {
      const key = field.key.toLowerCase();
      const idx = headerLower.findIndex(h =>
        h === key || h.includes(key) ||
        (key === 'companyname' && (h.includes('company') || h.includes('business') || h.includes('name'))) ||
        (key === 'email' && h.includes('email')) ||
        (key === 'city' && h.includes('city')) ||
        (key === 'state' && (h.includes('state') || h.includes('province'))) ||
        (key === 'country' && h.includes('country')) ||
        (key === 'website' && (h.includes('website') || h.includes('url') || h.includes('domain')))
      );
      if (idx >= 0) autoMap[field.key] = idx;
    });
    setMapping(autoMap);
  }, []);

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setPasteSource(false);
    setResult(null);
    const text = await f.text();
    const data = parseDelimited(text);
    setParsed(data);
    autoMapHeaders(data);
  }, [autoMapHeaders]);

  const handlePasteData = useCallback((text: string) => {
    if (!text.trim()) return;
    setFile(null);
    setPasteSource(true);
    setResult(null);
    const data = parseDelimited(text);
    setParsed(data);
    autoMapHeaders(data);
    setShowPaste(false);
    setPasteText('');
  }, [autoMapHeaders]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith('.csv') || f.type === 'text/csv')) handleFile(f);
  }, [handleFile]);

  const handleImport = async () => {
    if (!parsed || mapping.email === undefined) return;
    setImporting(true);

    const leads: CampaignLead[] = [];
    let skipped = 0;
    let invalid = 0;
    const seenEmails = new Set<string>();

    for (const row of parsed.rows) {
      const email = (row[mapping.email] || '').trim().toLowerCase();

      if (!email || !isValidEmail(email)) { invalid++; continue; }
      if (seenEmails.has(email) || existingEmails.has(email)) { skipped++; continue; }
      if (suppressedEmails.has(email)) { skipped++; continue; }

      seenEmails.add(email);

      leads.push({
        id: generateId(),
        campaignId,
        email,
        companyName: mapping.companyName !== undefined ? (row[mapping.companyName] || '').trim() : '',
        city: mapping.city !== undefined ? (row[mapping.city] || '').trim() : '',
        state: mapping.state !== undefined ? (row[mapping.state] || '').trim() : '',
        country: mapping.country !== undefined ? (row[mapping.country] || '').trim() : '',
        website: mapping.website !== undefined ? (row[mapping.website] || '').trim() : '',
        verificationStatus: 'unknown',
        sendStatus: SendStatus.QUEUED,
        engagementScore: 0,
        createdAt: new Date().toISOString(),
      });
    }

    try {
      await onImport(leads);
      setResult({ imported: leads.length, skipped, invalid });
    } catch (err) {
      console.warn('Import failed:', err);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Input area — shown when no data is parsed yet */}
      {!parsed && !showPaste && (
        <>
          {/* Drag-and-drop / file picker */}
          <div
            onDragOver={e => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer ${
              dragActive ? 'border-[#FF9F1C] bg-[#FF9F1C]/5' : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => document.getElementById('csv-file-input')?.click()}
          >
            <Upload size={28} className="mx-auto mb-3 text-gray-400" />
            <p className="text-sm font-semibold text-[#0B3060] mb-1">Drop CSV file here or click to browse</p>
            <p className="text-xs text-[#94A3B8]">Supports .csv files with email column</p>
            <input
              id="csv-file-input" type="file" accept=".csv" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-100"></div>
            <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-gray-100"></div>
          </div>

          {/* Paste from Google Sheets */}
          <button
            onClick={() => setShowPaste(true)}
            className="w-full border-2 border-dashed border-gray-200 hover:border-[#FF9F1C] rounded-2xl p-6 text-center transition-all group"
          >
            <ClipboardPaste size={28} className="mx-auto mb-3 text-gray-400 group-hover:text-[#FF9F1C] transition-colors" />
            <p className="text-sm font-semibold text-[#0B3060] mb-1">Paste from Google Sheets</p>
            <p className="text-xs text-[#94A3B8]">Copy rows in Google Sheets, then paste here</p>
          </button>
        </>
      )}

      {/* Paste textarea */}
      {!parsed && showPaste && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardPaste size={16} className="text-[#FF9F1C]" />
              <span className="text-sm font-bold text-[#0B3060]">Paste from Google Sheets</span>
            </div>
            <button
              onClick={() => { setShowPaste(false); setPasteText(''); }}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              <X size={14} />
            </button>
          </div>
          <p className="text-xs text-[#64748B]">
            Select your rows in Google Sheets (including the header row), copy them (Ctrl+C / Cmd+C), then paste below.
          </p>
          <textarea
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
            onPaste={e => {
              // Let the paste populate the textarea, then process on next tick
              setTimeout(() => {
                const val = e.currentTarget?.value || (e.clipboardData?.getData('text/plain') || '');
                if (val.trim()) handlePasteData(val);
              }, 50);
            }}
            placeholder="Paste your Google Sheets data here...&#10;&#10;(Header row + data rows — tab-separated is fine)"
            rows={8}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-[#FF9F1C]/20 focus:border-[#FF9F1C] resize-y placeholder:text-gray-400"
            autoFocus
          />
          <button
            onClick={() => handlePasteData(pasteText)}
            disabled={!pasteText.trim()}
            className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
              pasteText.trim()
                ? 'bg-[#0B3060] text-white hover:bg-[#0a2850]'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            Parse Pasted Data
          </button>
        </div>
      )}

      {/* Data loaded — column mapping */}
      {parsed && !result && (
        <>
          <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
            <div className="flex items-center gap-2">
              {pasteSource ? (
                <ClipboardPaste size={16} className="text-[#FF9F1C]" />
              ) : (
                <FileSpreadsheet size={16} className="text-[#FF9F1C]" />
              )}
              <span className="text-sm font-semibold">
                {pasteSource ? 'Pasted data' : file?.name}
              </span>
              <span className="text-xs text-[#94A3B8]">{parsed.rows.length} rows</span>
            </div>
            <button onClick={() => { setParsed(null); setFile(null); setPasteSource(false); }} className="p-1 hover:bg-gray-200 rounded-lg">
              <X size={14} />
            </button>
          </div>

          {/* Column mapping */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Map Columns</h4>
            {fields.map(field => (
              <div key={field.key} className="flex items-center gap-3">
                <span className="text-xs font-medium text-[#475569] w-28">{field.label}</span>
                <select
                  value={mapping[field.key] ?? ''}
                  onChange={e => setMapping(m => ({ ...m, [field.key]: e.target.value ? parseInt(e.target.value) : undefined as any }))}
                  className="flex-1 text-xs bg-gray-50 border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-black/5"
                >
                  <option value="">— Skip —</option>
                  {parsed.headers.map((h, i) => (
                    <option key={i} value={i}>{h}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Preview */}
          <div className="overflow-x-auto">
            <h4 className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2">Preview (first 5 rows)</h4>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0]">
                  {parsed.headers.map((h, i) => (
                    <th key={i} className="text-left py-2 px-2 text-[#94A3B8] font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsed.rows.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-b border-[#E2E8F0]/50">
                    {row.map((cell, j) => (
                      <td key={j} className="py-1.5 px-2 text-[#475569] truncate max-w-[150px]">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleImport}
            disabled={mapping.email === undefined || importing}
            className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
              mapping.email !== undefined && !importing
                ? 'bg-[#0B3060] text-white hover:bg-[#0a2850]'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {importing ? 'Importing...' : `Import ${parsed.rows.length} Leads`}
          </button>
        </>
      )}

      {/* Result */}
      {result && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Check size={16} className="text-emerald-600" />
            <span className="text-sm font-bold text-emerald-800">Import Complete</span>
          </div>
          <div className="text-xs text-emerald-700 space-y-1">
            <p>Imported: {result.imported} leads</p>
            {result.skipped > 0 && <p>Skipped (duplicates/suppressed): {result.skipped}</p>}
            {result.invalid > 0 && <p className="flex items-center gap-1"><AlertTriangle size={12} /> Invalid emails: {result.invalid}</p>}
          </div>
          <button
            onClick={() => { setParsed(null); setFile(null); setResult(null); setPasteSource(false); }}
            className="mt-3 text-xs font-semibold text-emerald-700 hover:text-emerald-900"
          >
            Import More
          </button>
        </div>
      )}
    </div>
  );
};

export default CSVImporter;
