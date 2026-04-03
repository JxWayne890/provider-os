import React, { useState } from 'react';
import { Tag, Eye, EyeOff } from 'lucide-react';
import { CampaignLead } from '../types';

interface EmailTemplateEditorProps {
  subjectTemplate: string;
  bodyTemplate: string;
  onSubjectChange: (subject: string) => void;
  onBodyChange: (body: string) => void;
  sampleLead?: CampaignLead;
}

const MERGE_TAGS = [
  { tag: '{{company}}', label: 'Company' },
  { tag: '{{city}}', label: 'City' },
  { tag: '{{state}}', label: 'State' },
  { tag: '{{website}}', label: 'Website' },
];

const DEFAULT_SUBJECT = 'quick question for {{company}}';

const DEFAULT_BODY = `Hi there,

I came across {{company}} in {{city}}, {{state}} and was impressed by your practice.

I help med spas like yours get found on Google and ChatGPT through high-performance websites with SEO and AI Engine Optimization — built with city + service page strategies that actually drive bookings.

Want to see what that could look like for {{company}}?

See our work: https://theprovidersystem.com/projects
Book a 15-min call: [BOOKING_LINK]

Talk soon,
John W Johnson
The Provider System

[UNSUBSCRIBE_LINK]`;

function personalize(template: string, lead?: CampaignLead): string {
  if (!lead) return template;
  return template
    .replace(/\{\{company\}\}/gi, lead.companyName || '[Company]')
    .replace(/\{\{city\}\}/gi, lead.city || '[City]')
    .replace(/\{\{state\}\}/gi, lead.state || '[State]')
    .replace(/\{\{website\}\}/gi, lead.website || '[Website]')
    .replace(/\[BOOKING_LINK\]/gi, 'https://go.theprovidersystem.com/book?ref=xxx')
    .replace(/\[UNSUBSCRIBE_LINK\]/gi, 'Unsubscribe');
}

const EmailTemplateEditor: React.FC<EmailTemplateEditorProps> = ({
  subjectTemplate, bodyTemplate, onSubjectChange, onBodyChange, sampleLead,
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const [activeField, setActiveField] = useState<'subject' | 'body'>('body');

  const insertTag = (tag: string) => {
    if (activeField === 'subject') onSubjectChange(subjectTemplate + tag);
    else onBodyChange(bodyTemplate + tag);
  };

  const useDefault = () => {
    onSubjectChange(DEFAULT_SUBJECT);
    onBodyChange(DEFAULT_BODY);
  };

  // Convert plain text to simple HTML for preview (preserving line breaks and links)
  const renderPlainTextAsHtml = (text: string) => {
    const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const withLinks = escaped.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" style="color:#0B3060;text-decoration:underline;">$1</a>');
    const withBreaks = withLinks.replace(/\n/g, '<br/>');
    return withBreaks;
  };

  return (
    <div className="space-y-4">
      {/* Merge tag buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <Tag size={14} className="text-[#FF9F1C]" />
        <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider mr-1">Insert:</span>
        {MERGE_TAGS.map(mt => (
          <button key={mt.tag} onClick={() => insertTag(mt.tag)}
            className="px-2.5 py-1 bg-[#FF9F1C]/10 text-[#FF9F1C] rounded-lg text-xs font-semibold hover:bg-[#FF9F1C]/20 transition-all">
            {mt.label}
          </button>
        ))}
        <button onClick={useDefault}
          className="px-2.5 py-1 bg-[#F7F8FA] text-[#64748B] rounded-lg text-xs font-medium hover:bg-gray-200 transition-all ml-auto border border-[#E2E8F0]">
          Load Default
        </button>
      </div>

      <div className={`grid ${showPreview ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'} gap-4`}>
        {/* Editor side */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Editor</label>
            <button onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-1 text-xs text-[#64748B] hover:text-[#0B3060]">
              {showPreview ? <EyeOff size={12} /> : <Eye size={12} />}
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </button>
          </div>

          {/* Subject */}
          <div>
            <label className="text-[10px] font-bold text-[#94A3B8] uppercase block mb-1">Subject</label>
            <input
              type="text" value={subjectTemplate}
              onChange={e => onSubjectChange(e.target.value)}
              onFocus={() => setActiveField('subject')}
              placeholder="quick question for {{company}}"
              className="w-full px-3 py-2 bg-[#F7F8FA] border border-[#E2E8F0] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#0B3060]/10"
            />
          </div>

          {/* Body — plain text */}
          <div>
            <label className="text-[10px] font-bold text-[#94A3B8] uppercase block mb-1">Body (plain text)</label>
            <textarea
              value={bodyTemplate}
              onChange={e => onBodyChange(e.target.value)}
              onFocus={() => setActiveField('body')}
              rows={18}
              placeholder="Write your email as plain text..."
              className="w-full px-3 py-3 bg-[#F7F8FA] border border-[#E2E8F0] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#0B3060]/10 resize-y font-sans leading-relaxed"
            />
            <p className="text-[10px] text-[#94A3B8] mt-1">
              Plain text emails get 2-3x higher reply rates than HTML. Links are auto-detected.
            </p>
          </div>
        </div>

        {/* Preview side — Gmail inbox mockup */}
        {showPreview && (
          <div>
            <label className="text-xs font-bold text-[#64748B] uppercase tracking-wider block mb-3">Gmail Preview</label>
            <div className="border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
              {/* Gmail header mockup */}
              <div className="bg-[#F7F8FA] px-4 py-3 border-b border-[#E2E8F0]">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-[#1A1A2E]">John W Johnson</span>
                  <span className="text-[#94A3B8]">&lt;john@go.theprovidersystem.com&gt;</span>
                </div>
                <div className="text-xs text-[#64748B] mt-0.5">
                  to me
                </div>
                <div className="text-sm font-semibold text-[#1A1A2E] mt-2">
                  {personalize(subjectTemplate || '(no subject)', sampleLead)}
                </div>
              </div>
              {/* Email body */}
              <div className="bg-white p-4 min-h-[300px]">
                <div
                  className="text-sm text-[#1A1A2E] leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: renderPlainTextAsHtml(personalize(bodyTemplate || '', sampleLead)) }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailTemplateEditor;
