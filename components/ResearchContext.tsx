import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { triggerResearchBatch, triggerResearchLeadsBatch, fetchCampaignLeads, calculateResearchStats, fetchAllLeads } from '../services/dataService';
import { CampaignLead } from '../types';

interface RecentResult {
  id: string;
  companyName: string;
  website: string;
  score: number;
  status: string;
  assessment: string;
}

interface ResearchState {
  isRunning: boolean;
  isComplete: boolean;
  campaignId: string | null;
  campaignName: string;
  totalLeads: number;
  researched: number;
  pending: number;
  noWebsite: number;
  broken: number;
  crawled: number;
  avgScore: number;
  recentResults: RecentResult[];
  startResearch: (campaignId: string, campaignName: string, batchSize: number, leadIds?: string[]) => void;
  startLeadsResearch: (batchSize: number) => void;
  stopResearch: () => void;
}

const defaultState: ResearchState = {
  isRunning: false, isComplete: false, campaignId: null, campaignName: '',
  totalLeads: 0, researched: 0, pending: 0, noWebsite: 0, broken: 0, crawled: 0, avgScore: 0,
  recentResults: [], startResearch: () => {}, startLeadsResearch: () => {}, stopResearch: () => {},
};

const ResearchCtx = createContext<ResearchState>(defaultState);

export const useResearch = () => useContext(ResearchCtx);

export const ResearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [campaignName, setCampaignName] = useState('');
  const [totalLeads, setTotalLeads] = useState(0);
  const [researched, setResearched] = useState(0);
  const [pending, setPending] = useState(0);
  const [noWebsite, setNoWebsite] = useState(0);
  const [broken, setBroken] = useState(0);
  const [crawled, setCrawled] = useState(0);
  const [avgScore, setAvgScore] = useState(0);
  const [recentResults, setRecentResults] = useState<RecentResult[]>([]);

  const stopRef = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateStats = useCallback(async (cId: string) => {
    try {
      const leads = await fetchCampaignLeads(cId);
      const stats = calculateResearchStats(leads);
      setTotalLeads(stats.total);
      setResearched(stats.total - stats.pending);
      setPending(stats.pending);
      setNoWebsite(stats.noWebsite);
      setBroken(stats.errors);
      setCrawled(stats.crawled);
      setAvgScore(stats.avgScore);

      // Recent results: last 10 researched leads
      const recent = leads
        .filter(l => l.websiteStatus !== 'pending' && l.researchCompletedAt)
        .sort((a, b) => (b.researchCompletedAt || '').localeCompare(a.researchCompletedAt || ''))
        .slice(0, 10)
        .map(l => ({
          id: l.id,
          companyName: l.companyName || l.email,
          website: l.website || '',
          score: l.websiteScore,
          status: l.websiteStatus,
          assessment: (l.websiteAnalysis as any)?.overallAssessment || '',
        }));
      setRecentResults(recent);
    } catch (err) {
      console.warn('Research stats poll failed:', err);
    }
  }, []);

  const startResearch = useCallback(async (cId: string, cName: string, batchSize: number, leadIds?: string[]) => {
    // If already running, stop first
    if (isRunning) return;

    stopRef.current = false;
    setIsRunning(true);
    setIsComplete(false);
    setCampaignId(cId);
    setCampaignName(cName);
    if (completeTimerRef.current) clearTimeout(completeTimerRef.current);

    // Initial stats
    await updateStats(cId);

    // Start polling
    pollRef.current = setInterval(() => updateStats(cId), 2000);

    // Research loop
    if (leadIds && leadIds.length > 0) {
      // Specific leads
      for (let i = 0; i < leadIds.length && !stopRef.current; i += batchSize) {
        const chunk = leadIds.slice(i, i + batchSize);
        try {
          await triggerResearchBatch(cId, chunk.length, chunk);
        } catch (err) {
          console.warn('Research batch error:', err);
          break;
        }
        // Wait between batches, checking stop every 500ms
        const waitMs = Math.min(chunk.length * 1500, 30000);
        for (let w = 0; w < waitMs && !stopRef.current; w += 500) {
          await new Promise(r => setTimeout(r, 500));
        }
      }
    } else {
      // All pending
      while (!stopRef.current) {
        try {
          const result = await triggerResearchBatch(cId, batchSize);
          if (!result.success || result.researched === 0) break;
        } catch (err) {
          console.warn('Research batch error:', err);
          break;
        }
        // Wait between batches
        const waitMs = Math.min(batchSize * 1500, 30000);
        for (let w = 0; w < waitMs && !stopRef.current; w += 500) {
          await new Promise(r => setTimeout(r, 500));
        }
      }
    }

    // Done
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    await updateStats(cId);
    setIsRunning(false);
    setIsComplete(true);

    // Auto-hide completion after 8 seconds
    completeTimerRef.current = setTimeout(() => {
      setIsComplete(false);
      setCampaignId(null);
    }, 8000);
  }, [isRunning, updateStats]);

  const updateLeadsStats = useCallback(async () => {
    try {
      const allLeads = await fetchAllLeads();
      const stats = calculateResearchStats(allLeads);
      setTotalLeads(stats.total);
      setResearched(stats.total - stats.pending);
      setPending(stats.pending);
      setNoWebsite(stats.noWebsite);
      setBroken(stats.errors);
      setCrawled(stats.crawled);
      setAvgScore(stats.avgScore);
    } catch (err) {
      console.warn('Leads stats poll failed:', err);
    }
  }, []);

  const startLeadsResearch = useCallback(async (batchSize: number) => {
    console.log('[ResearchContext] startLeadsResearch called, isRunning:', isRunning, 'batchSize:', batchSize);
    if (isRunning) {
      console.log('[ResearchContext] Already running, skipping');
      return;
    }

    stopRef.current = false;
    setIsRunning(true);
    setIsComplete(false);
    setCampaignId(null);
    setCampaignName('All Leads');
    if (completeTimerRef.current) clearTimeout(completeTimerRef.current);
    console.log('[ResearchContext] State set, starting research loop');

    // Don't await stats before starting — just kick off polling
    pollRef.current = setInterval(() => {
      updateLeadsStats().catch(e => console.warn('Stats poll error:', e));
    }, 5000);

    // Research loop — send batches to the server
    while (!stopRef.current) {
      try {
        console.log('[ResearchContext] Sending batch...');
        const result = await triggerResearchLeadsBatch(batchSize);
        console.log('[ResearchContext] Batch result:', result);
        if (!result.success || result.researched === 0) {
          console.log('[ResearchContext] No more leads to research, stopping');
          break;
        }
      } catch (err) {
        console.error('[ResearchContext] Research batch error:', err);
        break;
      }
      // Wait for batch to process before sending next
      const waitMs = Math.min(batchSize * 1200, 60000);
      for (let w = 0; w < waitMs && !stopRef.current; w += 500) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    await updateLeadsStats().catch(() => {});
    setIsRunning(false);
    setIsComplete(true);
    console.log('[ResearchContext] Research complete');

    completeTimerRef.current = setTimeout(() => {
      setIsComplete(false);
    }, 8000);
  }, [isRunning, updateLeadsStats]);

  const stopResearch = useCallback(() => {
    stopRef.current = true;
  }, []);

  return (
    <ResearchCtx.Provider value={{
      isRunning, isComplete, campaignId, campaignName,
      totalLeads, researched, pending, noWebsite, broken, crawled, avgScore,
      recentResults, startResearch, startLeadsResearch, stopResearch,
    }}>
      {children}
    </ResearchCtx.Provider>
  );
};
