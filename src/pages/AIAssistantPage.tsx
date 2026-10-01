import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Code2,
  User,
  Shield,
  Clock,
  Settings,
  Bot,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export const AIAssistantPage: React.FC = () => {
  const { user, profile, session } = useAuth();

  // Retrieve default n8n Webhook URL from Vite env or local storage
  const defaultWebhookUrl =
    (import.meta.env.VITE_N8N_WEBHOOK_URL as string) ||
    localStorage.getItem('stocksense_n8n_webhook_url') ||
    '';

  const [webhookUrl, setWebhookUrl] = useState<string>(defaultWebhookUrl);
  const [isUrlSaved, setIsUrlSaved] = useState<boolean>(false);

  // Connectivity test states
  const [isSending, setIsSending] = useState<boolean>(false);
  const [aiReply, setAiReply] = useState<string | null>(null);
  const [proposalId, setProposalIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem('stocksense_pending_proposal_id') || null;
    } catch {
      return null;
    }
  });

  const setProposalId = (id: string | null) => {
    setProposalIdState(id);
    try {
      if (id) {
        localStorage.setItem('stocksense_pending_proposal_id', id);
      } else {
        localStorage.removeItem('stocksense_pending_proposal_id');
      }
    } catch (e) {
      console.warn('Could not update localStorage for proposalId:', e);
    }
  };

  const [isUnavailable, setIsUnavailable] = useState<boolean>(false);
  const [unavailableReason, setUnavailableReason] = useState<string>('');

  const [testResult, setTestResult] = useState<{
    status: number | null;
    statusText: string;
    payloadSent: any;
    responseBody: string;
    latencyMs: number;
    timestamp: Date;
    isSuccess: boolean;
    errorMessage?: string;
  } | null>(null);

  // Current authenticated user information
  const currentUserId = user?.id || session?.user?.id || 'unauthenticated-user';
  const currentUserRole = profile?.role || 'staff';

  // Editable test message with default value
  const [testMessage, setTestMessage] = useState<string>(
    'How many Type-C Cables are in stock?'
  );

  // Exact JSON payload:
  // For all standard messages: { message, user_id, role }
  // When message is Confirm or Cancel, include stored proposalId as proposal_id
  const cleanMessage = testMessage.trim().replace(/^["']|["']$/g, '').trim().replace(/[.!?]+$/, '').trim();
  const normalizedMessage = cleanMessage.toLowerCase();
  const isConfirmOrCancel = normalizedMessage === 'confirm' || normalizedMessage === 'cancel';

  const payload: Record<string, any> = {
    message: testMessage,
    user_id: currentUserId,
    role: currentUserRole,
    ...(isConfirmOrCancel && proposalId ? { proposal_id: proposalId } : {}),
  };

  const handleSaveWebhookUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (webhookUrl.trim()) {
      localStorage.setItem('stocksense_n8n_webhook_url', webhookUrl.trim());
      setIsUrlSaved(true);
      setTimeout(() => setIsUrlSaved(false), 2000);
    }
  };

  const handleSendTestRequest = async () => {
    if (!webhookUrl.trim()) {
      setIsUnavailable(true);
      setUnavailableReason('Please configure a valid n8n Webhook URL endpoint first.');
      setAiReply(null);
      setTestResult({
        status: null,
        statusText: 'Missing URL',
        payloadSent: payload,
        responseBody: '',
        latencyMs: 0,
        timestamp: new Date(),
        isSuccess: false,
        errorMessage: 'Please enter a valid n8n Webhook URL before sending the test request.',
      });
      return;
    }

    setIsSending(true);
    setTestResult(null);
    setAiReply(null);
    setIsUnavailable(false);
    setUnavailableReason('');
    const startTime = performance.now();

    try {
      // Get current Supabase session using supabase.auth.getSession()
      const { data: sessionData } = await supabase.auth.getSession();
      const currentToken = sessionData?.session?.access_token || session?.access_token;

      // Construct headers including Authorization: Bearer <session.access_token>
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (currentToken) {
        headers['Authorization'] = `Bearer ${currentToken}`;
      }

      // POST request with Content-Type: application/json and Authorization: Bearer <session.access_token>
      const response = await fetch(webhookUrl.trim(), {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const endTime = performance.now();
      const latencyMs = Math.round(endTime - startTime);

      let text = '';
      try {
        text = await response.text();
      } catch (err) {
        text = '(Could not parse response body)';
      }

      if (!response.ok) {
        // Request returned non-2xx status code
        setIsUnavailable(true);
        setUnavailableReason(`HTTP ${response.status} ${response.statusText}`);
        setTestResult({
          status: response.status,
          statusText: response.statusText || 'Error',
          payloadSent: payload,
          responseBody: text,
          latencyMs,
          timestamp: new Date(),
          isSuccess: false,
          errorMessage: `HTTP ${response.status} ${response.statusText}`,
        });
        return;
      }

      // Successful HTTP response: parse JSON and extract "reply" & optional "proposal_id"
      let extractedReply: string | null = null;
      let extractedProposalId: string | null = null;
      try {
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === 'object') {
          if (!Array.isArray(parsed)) {
            if (typeof parsed.reply === 'string') {
              extractedReply = parsed.reply;
            } else if (typeof parsed.message === 'string') {
              extractedReply = parsed.message;
            }
          } else if (parsed.length > 0) {
            if (typeof parsed[0]?.reply === 'string') {
              extractedReply = parsed[0].reply;
            } else if (typeof parsed[0]?.message === 'string') {
              extractedReply = parsed[0].message;
            }
          }

          // Deep search for proposal_id across common structures
          const searchProposalId = (target: any): string | null => {
            if (!target) return null;
            if (typeof target === 'string') {
              const m = target.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
              return m ? m[0] : null;
            }
            if (typeof target !== 'object') return null;

            if (target.proposal_id) return String(target.proposal_id);
            if (target.proposalId) return String(target.proposalId);
            if (target.proposal_ID) return String(target.proposal_ID);
            if (target.proposal?.id) return String(target.proposal.id);
            if (target.json) {
              const res = searchProposalId(target.json);
              if (res) return res;
            }
            if (target.data) {
              const res = searchProposalId(target.data);
              if (res) return res;
            }
            if (target.output) {
              const res = searchProposalId(target.output);
              if (res) return res;
            }
            if (target.body) {
              const res = searchProposalId(target.body);
              if (res) return res;
            }
            if (Array.isArray(target) && target.length > 0) {
              for (const item of target) {
                const res = searchProposalId(item);
                if (res) return res;
              }
            }
            return null;
          };

          extractedProposalId = searchProposalId(parsed);
        }
      } catch (jsonErr) {
        console.warn('Response from n8n was not valid JSON:', jsonErr);
      }

      // Fallback: Scan text response for explicit proposal ID or UUID
      if (!extractedProposalId && text) {
        const directMatch = text.match(/(?:proposal(?:[_\s-]?id)?|proposal)[\s:=#"]+([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
        if (directMatch && directMatch[1]) {
          extractedProposalId = directMatch[1];
        } else if (/proposal/i.test(text)) {
          const uuidMatch = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
          if (uuidMatch) {
            extractedProposalId = uuidMatch[0];
          }
        }
      }

      if (extractedProposalId) {
        setProposalId(extractedProposalId);
      } else if (isConfirmOrCancel && response.ok) {
        setProposalId(null);
      }

      if (!extractedReply && extractedProposalId) {
        extractedReply = `Stock proposal received: ${extractedProposalId}`;
      }

      if (extractedReply) {
        // We received the expected {"reply": "..."} format from n8n
        setAiReply(extractedReply);
        setIsUnavailable(false);
        setTestResult({
          status: response.status,
          statusText: response.statusText || 'OK',
          payloadSent: payload,
          responseBody: text,
          latencyMs,
          timestamp: new Date(),
          isSuccess: true,
        });
      } else {
        // Response succeeded at HTTP level but did not return the expected JSON reply field
        setIsUnavailable(true);
        setUnavailableReason('n8n responded without a valid "reply" string in the JSON payload.');
        setTestResult({
          status: response.status,
          statusText: response.statusText || 'OK',
          payloadSent: payload,
          responseBody: text,
          latencyMs,
          timestamp: new Date(),
          isSuccess: false,
          errorMessage: 'Response missing expected "reply" field.',
        });
      }
    } catch (err: any) {
      const endTime = performance.now();
      const latencyMs = Math.round(endTime - startTime);

      console.error('n8n Webhook connectivity test error:', err?.message || 'Network error');
      setIsUnavailable(true);
      setUnavailableReason(err?.message || 'Network / connection error while contacting n8n webhook.');
      setTestResult({
        status: null,
        statusText: 'Network / CORS Error',
        payloadSent: payload,
        responseBody: '',
        latencyMs,
        timestamp: new Date(),
        isSuccess: false,
        errorMessage:
          err?.message ||
          'Failed to connect to the n8n webhook. Check network connectivity, CORS headers, or whether the webhook URL is active.',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
          <span>Nowshera Shopping Mall</span>
          <span aria-hidden="true">·</span>
          <span>StockSense Intelligence</span>
          <span aria-hidden="true">·</span>
          <span>n8n Webhook Connectivity Test</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          AI Assistant & n8n Integration Test
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Dispatch test requests from the frontend client to the configured n8n automation webhook.
        </p>
      </div>

      {/* Info Notice: Connectivity Test Only */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
        <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xs font-semibold text-slate-900">
            Connectivity Test Mode
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            This module tests communication between StockSense and your n8n workflow. No inventory stock changes are performed, and no Supabase tables or policies are altered.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>User ID: <code className="font-mono text-slate-700 font-semibold">{currentUserId}</code></span>
            </span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-slate-400" />
              <span>Role: <strong className="text-slate-800 uppercase tracking-wide text-[10px]">{currentUserRole}</strong></span>
            </span>
          </div>
        </div>
      </div>

      {/* Webhook Configuration Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900">n8n Webhook Target Endpoint</h2>
          </div>
          {isUrlSaved && (
            <span className="text-[11px] text-emerald-600 font-medium animate-in fade-in flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Saved to local configuration
            </span>
          )}
        </div>

        <form onSubmit={handleSaveWebhookUrl} className="flex flex-col sm:flex-row gap-2">
          <input
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://your-n8n-instance.com/webhook/test-inventory-ai"
            className="flex-1 py-2 px-3 text-xs sm:text-sm bg-slate-50/50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition-colors font-mono"
            required
          />
          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shadow-2xs"
          >
            Save Endpoint
          </button>
        </form>
        <p className="text-[11px] text-slate-400">
          Enter the Webhook URL from your n8n workflow. The webhook must accept incoming <code className="font-mono text-slate-700">POST</code> requests.
        </p>
      </div>

      {/* Test Message Input Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="test-message-input"
            className="block text-xs font-bold uppercase tracking-wider text-slate-700"
          >
            Test Message
          </label>
          {testMessage !== 'How many Type-C Cables are in stock?' && (
            <button
              type="button"
              onClick={() => setTestMessage('How many Type-C Cables are in stock?')}
              className="text-[11px] text-slate-400 hover:text-slate-600 font-medium transition-colors"
            >
              Reset to Default
            </button>
          )}
        </div>
        <input
          id="test-message-input"
          type="text"
          value={testMessage}
          onChange={(e) => setTestMessage(e.target.value)}
          placeholder="How many Type-C Cables are in stock?"
          className="w-full py-2.5 px-3.5 text-xs sm:text-sm bg-slate-50/50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition-colors"
        />
        <p className="text-[11px] text-slate-400">
          Sent dynamically in the <code className="font-mono text-slate-700">"message"</code> field of the JSON payload.
        </p>
      </div>

      {/* Test Payload Preview Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-slate-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Payload Structure (application/json)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">POST</span>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs text-emerald-400 overflow-x-auto shadow-inner">
            <pre>{JSON.stringify(payload, null, 2)}</pre>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Includes active Supabase session user_id and verified public.profiles role</span>
            </div>

            <button
              type="button"
              onClick={handleSendTestRequest}
              disabled={isSending || !webhookUrl.trim()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors"
            >
              {isSending ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Transmitting Payload...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Test Request to n8n</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* CLEAR AI RESPONSE BOX: Display "reply" returned from n8n */}
      {aiReply && (
        <div className="bg-white rounded-xl border-2 border-emerald-500 shadow-sm p-5 sm:p-6 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-2xs">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <span>AI Response</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                    Live n8n Reply
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Received from n8n automation webhook in response to query
                </p>
              </div>
            </div>

            {testResult?.latencyMs !== undefined && (
              <span className="text-[11px] font-mono tabular-nums text-slate-500 bg-slate-100 px-2 py-1 rounded">
                {testResult.latencyMs} ms
              </span>
            )}
          </div>

          <div className="p-4 sm:p-5 rounded-lg bg-emerald-50/60 border border-emerald-200/80 text-slate-900 text-sm sm:text-base font-medium leading-relaxed flex items-start gap-3">
            <MessageSquare className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-sans select-text space-y-2">
              <div>{aiReply}</div>
              {proposalId && (
                <div className="flex items-center gap-2 pt-2 border-t border-emerald-200/60 text-xs">
                  <span className="text-emerald-800 font-semibold">Stored Proposal ID:</span>
                  <code className="font-mono text-[11px] bg-white text-emerald-900 px-2 py-0.5 rounded border border-emerald-300 select-all">
                    {proposalId}
                  </code>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CLEAR AI ASSISTANT UNAVAILABLE BOX: Display when request fails */}
      {isUnavailable && (
        <div className="bg-white rounded-xl border-2 border-rose-300 shadow-sm p-5 sm:p-6 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 shadow-2xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-rose-900">
                AI Assistant is unavailable
              </h3>
              <p className="text-xs text-rose-700 leading-relaxed">
                The connection to the n8n automation webhook could not be completed or did not return the expected JSON response.
              </p>
              {unavailableReason && (
                <div className="mt-2 p-2.5 rounded bg-rose-50 border border-rose-200 text-[11px] font-mono text-rose-800">
                  {unavailableReason}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Technical Diagnostics Inspector (Details for developer inspection) */}
      {testResult && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-500 pb-2 border-b border-slate-100 text-[11px]">
            <span className="font-semibold text-slate-700">Raw Webhook Diagnostics</span>
            <div className="font-mono tabular-nums">
              Status: {testResult.status !== null ? `${testResult.status} ${testResult.statusText}` : testResult.statusText} · {testResult.latencyMs} ms · {testResult.timestamp.toLocaleTimeString()}
            </div>
          </div>

          {testResult.responseBody ? (
            <div className="space-y-1 pt-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                Raw Response Body:
              </span>
              <div className="bg-slate-900 text-slate-100 rounded-lg p-3 text-xs font-mono overflow-x-auto max-h-40">
                <pre>{testResult.responseBody}</pre>
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-slate-400 italic">No response body received from server.</div>
          )}
        </div>
      )}
    </div>
  );
};
