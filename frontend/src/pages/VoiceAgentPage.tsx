import React, { useEffect, useRef, useState } from 'react';
import {
  Mic,
  MicOff,
  PhoneCall,
  PhoneOff,
  VolumeX,
  Send,
  Trash2,
  Sparkles,
  BookOpen,
  CalendarCheck,
  Target,
  AlertCircle,
  Play,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { ClassificationBadge } from '../components/ui/Badges';

type CallState =
  | 'IDLE'
  | 'CONNECTING'
  | 'LISTENING'
  | 'PROCESSING'
  | 'SPEAKING'
  | 'INTERRUPTED'
  | 'COMPLETED'
  | 'FAILED';

interface ChatMessage {
  id: string;
  sender: 'CUSTOMER' | 'AI_AGENT' | 'SYSTEM';
  content: string;
  sources?: Array<{ title: string; snippet: string; score: number }> | null;
  createdAt: string;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      0: { transcript: string };
    };
  };
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

export function VoiceAgentPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [callState, setCallState] = useState<CallState>('IDLE');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [textInput, setTextInput] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [language, setLanguage] = useState('en-IN');
  const [mode, setMode] = useState<'DEMO' | 'LIVE'>('DEMO');
  const [isMuted, setIsMuted] = useState(false);
  const [audioConsent, setAudioConsent] = useState(true);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState('');
  const [sessionMemory, setSessionMemory] = useState<Record<string, unknown>>({});
  const [liveLead, setLiveLead] = useState<{ score: number; classification: string; recommendedPlan?: string } | null>(null);
  const [bookedApt, setBookedApt] = useState<{ title: string; startTime: string } | null>(null);
  const [micSupported, setMicSupported] = useState(true);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const timerRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const modeRef = useRef<'DEMO' | 'LIVE'>('DEMO');
  const languageRef = useRef<string>('en-IN');
  const isMutedRef = useRef<boolean>(false);
  const activeCallRef = useRef<boolean>(false);
  const isSpeakingRef = useRef<boolean>(false);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  useEffect(() => {
    languageRef.current = language;
  }, [language]);
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  const { data: aiStatus } = useQuery({
    queryKey: ['ai-status'],
    queryFn: () => apiRequest<{ geminiConfigured: boolean }>('/ai/status'),
  });

  useEffect(() => {
    const SpeechRec =
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    if (!SpeechRec) setMicSupported(false);

    const loadVoices = () => {
      const list = window.speechSynthesis?.getVoices() || [];
      setVoices(list);
      if (list.length > 0 && !selectedVoiceURI) {
        const preferred = list.find((v) => v.lang.startsWith('en')) || list[0];
        setSelectedVoiceURI(preferred.voiceURI);
      }
    };
    loadVoices();
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    return () => {
      stopSpeechRecognition();
      window.speechSynthesis?.cancel();
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, interimTranscript]);

  const speakText = (text: string, onFinished?: () => void) => {
    if (!window.speechSynthesis) {
      if (onFinished) onFinished();
      else if (activeCallRef.current && !isMutedRef.current) startSpeechRecognition();
      return;
    }
    window.speechSynthesis.cancel();
    stopSpeechRecognition();
    isSpeakingRef.current = true;

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = languageRef.current;
    const voice = voices.find((v) => v.voiceURI === selectedVoiceURI);
    if (voice) utter.voice = voice;
    utter.onstart = () => setCallState('SPEAKING');
    utter.onend = () => {
      isSpeakingRef.current = false;
      if (onFinished) {
        onFinished();
        return;
      }
      setCallState((prev) => (prev === 'COMPLETED' || prev === 'IDLE' ? prev : 'LISTENING'));
      if (activeCallRef.current && !isMutedRef.current) {
        startSpeechRecognition();
      }
    };
    utter.onerror = () => {
      isSpeakingRef.current = false;
      if (onFinished) {
        onFinished();
        return;
      }
      if (activeCallRef.current && !isMutedRef.current) {
        startSpeechRecognition();
      }
    };
    window.speechSynthesis.speak(utter);
  };

  const stopSpeaking = () => {
    window.speechSynthesis?.cancel();
    isSpeakingRef.current = false;
    setCallState('INTERRUPTED');
    setTimeout(() => {
      setCallState((prev) => (prev === 'INTERRUPTED' ? 'LISTENING' : prev));
      if (activeCallRef.current && !isMutedRef.current) {
        startSpeechRecognition();
      }
    }, 300);
  };

  const startSpeechRecognition = () => {
    if (!micSupported || isMutedRef.current || !activeCallRef.current || isSpeakingRef.current) return;
    if (recognitionRef.current) return;
    const SpeechRec = (
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition
    ) as new () => SpeechRecognitionLike;
    if (!SpeechRec) return;

    try {
      const rec = new SpeechRec();
      rec.lang = languageRef.current;
      rec.continuous = true;
      rec.interimResults = true;

      rec.onresult = (event) => {
        let interim = '';
        let finalStr = '';
        for (let i = event.resultIndex || 0; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) finalStr += res[0].transcript + ' ';
          else interim += res[0].transcript;
        }
        setInterimTranscript(interim);
        if (finalStr.trim()) {
          setInterimTranscript('');
          sendMessage(finalStr.trim());
        }
      };

      rec.onerror = (ev) => {
        if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {
          toast({
            title: 'Microphone permission denied',
            description: 'Grant mic access in browser site settings or use the text input below.',
            type: 'error',
          });
          isMutedRef.current = true;
          setIsMuted(true);
        }
      };

      rec.onend = () => {
        recognitionRef.current = null;
        if (activeCallRef.current && !isMutedRef.current && !isSpeakingRef.current) {
          setTimeout(() => startSpeechRecognition(), 250);
        }
      };

      rec.start();
      recognitionRef.current = rec;
    } catch {
      recognitionRef.current = null;
    }
  };

  const stopSpeechRecognition = () => {
    try {
      recognitionRef.current?.stop();
    } catch {
      // Ignore
    }
    recognitionRef.current = null;
  };

  const startConversation = async () => {
    if (mode === 'LIVE' && !aiStatus?.geminiConfigured) {
      toast({
        title: 'Gemini API key not configured',
        description: 'Add GEMINI_API_KEY in backend/.env or switch to Demo Mode.',
        type: 'error',
      });
      return;
    }

    setCallState('CONNECTING');
    setMessages([]);
    setSessionMemory({});
    setLiveLead(null);
    setBookedApt(null);
    setElapsedSec(0);

    try {
      const res = await apiRequest<{
        conversation: { id: string };
        greetingMessage: ChatMessage;
      }>('/conversations', {
        method: 'POST',
        body: JSON.stringify({ language, mode, audioConsent }),
      });

      conversationIdRef.current = res.conversation.id;
      activeCallRef.current = true;
      setConversationId(res.conversation.id);
      setMessages([res.greetingMessage]);
      setCallState('LISTENING');

      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = window.setInterval(() => {
        setElapsedSec((s) => s + 1);
      }, 1000);

      speakText(res.greetingMessage.content);
    } catch (err) {
      setCallState('FAILED');
      toast({
        title: 'Failed to start call',
        description: err instanceof Error ? err.message : 'Unable to connect',
        type: 'error',
      });
    }
  };

  const endConversation = async () => {
    activeCallRef.current = false;
    isSpeakingRef.current = false;
    stopSpeechRecognition();
    window.speechSynthesis?.cancel();
    if (timerRef.current) window.clearInterval(timerRef.current);

    const activeConvId = conversationIdRef.current || conversationId;
    if (!activeConvId) {
      setCallState('IDLE');
      return;
    }

    try {
      await apiRequest(`/conversations/${activeConvId}/complete`, {
        method: 'POST',
        body: JSON.stringify({ durationSeconds: elapsedSec }),
      });
      setCallState('COMPLETED');
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
      toast({
        title: 'Call completed & summarized',
        description: 'Sentiment analysis, call summary, and CRM metrics updated.',
        type: 'success',
      });
    } catch (err) {
      setCallState('FAILED');
      toast({
        title: 'Failed to finalize call',
        description: err instanceof Error ? err.message : 'Error',
        type: 'error',
      });
    }
  };

  const sendMessage = async (overrideText?: string) => {
    const content = (overrideText ?? textInput).trim();
    const activeConvId = conversationIdRef.current || conversationId;
    if (!content || !activeConvId) return;
    if (!overrideText) setTextInput('');

    stopSpeechRecognition();
    setCallState('PROCESSING');
    try {
      const res = await apiRequest<{
        customerMessage: ChatMessage;
        aiMessage: ChatMessage;
        lead: { score: number; classification: string; recommendedPlan?: string } | null;
        appointment: { title: string; startTime: string } | null;
        handoff: { reason: string } | null;
        sessionMemory: Record<string, unknown>;
        shouldEndCall?: boolean;
      }>(`/conversations/${activeConvId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content, language: languageRef.current, mode: modeRef.current }),
      });

      setMessages((prev) => [...prev, res.customerMessage, res.aiMessage]);
      setSessionMemory(res.sessionMemory || {});
      if (res.lead) setLiveLead(res.lead);
      if (res.appointment) {
        setBookedApt(res.appointment);
        toast({
          title: 'Appointment Confirmed',
          description: res.appointment.title,
          type: 'success',
        });
      }
      if (res.handoff) {
        toast({
          title: 'Escalated to Human Specialist',
          description: res.handoff.reason,
          type: 'info',
        });
      }
      if (res.shouldEndCall) {
        activeCallRef.current = false;
        speakText(res.aiMessage.content, () => {
          endConversation();
        });
      } else {
        speakText(res.aiMessage.content);
      }
    } catch (err) {
      setCallState('LISTENING');
      if (activeCallRef.current && !isMutedRef.current) {
        startSpeechRecognition();
      }
      toast({
        title: 'AI Processing Error',
        description: err instanceof Error ? err.message : 'Could not process message',
        type: 'error',
      });
    }
  };

  const runRahulScenario = async () => {
    if (!conversationId) {
      toast({ title: 'Start a call first', description: 'Click Start Call to begin the scenario.', type: 'info' });
      return;
    }
    await sendMessage(
      "Hello, I'm Rahul Sharma and I'm looking for project management software for my company. We have around 50 employees and our budget is approximately ₹15,000 per month."
    );
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const isCallActive = ['CONNECTING', 'LISTENING', 'PROCESSING', 'SPEAKING', 'INTERRUPTED'].includes(callState);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Voice Agent Studio</h1>
          <p className="text-sm text-[#94A3B8]">
            Real-time autonomous voice sales agent with RAG grounding, lead scoring, and appointment booking.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg bg-[#151D2C] border border-slate-800 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setMode('DEMO')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                mode === 'DEMO' ? 'bg-[#06B6D4]/20 text-[#06B6D4]' : 'text-[#94A3B8]'
              }`}
            >
              Demo Mode
            </button>
            <button
              type="button"
              onClick={() => setMode('LIVE')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                mode === 'LIVE' ? 'bg-[#22C55E]/20 text-[#22C55E]' : 'text-[#94A3B8]'
              }`}
            >
              Live Gemini
            </button>
          </div>

          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-[#151D2C] border border-slate-800 text-xs"
          >
            <option value="en-IN">English (India)</option>
            <option value="hi-IN">Hindi (hi-IN)</option>
            <option value="te-IN">Telugu (te-IN)</option>
          </select>

          {voices.length > 0 && (
            <select
              value={selectedVoiceURI}
              onChange={(e) => setSelectedVoiceURI(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-[#151D2C] border border-slate-800 text-xs max-w-[160px]"
            >
              {voices.slice(0, 10).map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {!micSupported && (
        <div className="enterprise-card p-3 border-[#F59E0B]/40 flex items-center gap-2 text-xs text-[#F59E0B]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            Web Speech API microphone recognition is not supported in this browser. Use Chrome/Edge for voice or type in the transcript box below.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main Voice & Transcript Panel */}
        <div className="enterprise-card p-5 lg:col-span-2 flex flex-col h-[620px]">
          {/* Call Status Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  callState === 'LISTENING'
                    ? 'bg-[#22C55E] animate-pulse'
                    : callState === 'SPEAKING'
                      ? 'bg-[#6366F1] animate-ping'
                      : callState === 'PROCESSING'
                        ? 'bg-[#F59E0B] animate-pulse'
                        : 'bg-slate-600'
                }`}
              />
              <div>
                <div className="text-sm font-semibold flex items-center gap-2">
                  <span>Status: {callState}</span>
                  <span className="font-mono text-xs text-[#94A3B8]">{formatTime(elapsedSec)}</span>
                </div>
                {/* Animated Audio Waveform */}
                <div className="flex items-center gap-1 h-4 mt-1">
                  {[0.4, 0.8, 1, 0.6, 0.9, 0.5, 0.7].map((h, idx) => (
                    <span
                      key={idx}
                      className={`w-1 rounded-full transition-all duration-300 ${
                        callState === 'SPEAKING' || callState === 'LISTENING'
                          ? 'bg-[#6366F1] animate-pulse'
                          : 'bg-slate-700'
                      }`}
                      style={{
                        height:
                          callState === 'SPEAKING' || callState === 'LISTENING'
                            ? `${Math.round(h * 14)}px`
                            : '4px',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isCallActive ? (
                <button
                  onClick={startConversation}
                  className="px-4 py-2 rounded-lg bg-[#22C55E] hover:bg-emerald-500 text-slate-950 font-semibold text-xs inline-flex items-center gap-1.5"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  Start Call
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      const nextMuted = !isMuted;
                      isMutedRef.current = nextMuted;
                      setIsMuted(nextMuted);
                      if (nextMuted) stopSpeechRecognition();
                      else startSpeechRecognition();
                    }}
                    className="p-2 rounded-lg bg-[#090D16] border border-slate-800 hover:border-slate-700 text-xs"
                    title={isMuted ? 'Unmute mic' : 'Mute mic'}
                  >
                    {isMuted ? <MicOff className="w-4 h-4 text-[#EF4444]" /> : <Mic className="w-4 h-4 text-[#22C55E]" />}
                  </button>
                  <button
                    onClick={stopSpeaking}
                    className="p-2 rounded-lg bg-[#090D16] border border-slate-800 hover:border-slate-700 text-xs"
                    title="Interrupt / Stop speaking"
                  >
                    <VolumeX className="w-4 h-4 text-[#F59E0B]" />
                  </button>
                  <button
                    onClick={endConversation}
                    className="px-3.5 py-2 rounded-lg bg-[#EF4444] hover:bg-red-600 text-white font-medium text-xs inline-flex items-center gap-1.5"
                  >
                    <PhoneOff className="w-3.5 h-3.5" />
                    End Call
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  setMessages([]);
                  setConversationId(null);
                  setCallState('IDLE');
                  setElapsedSec(0);
                }}
                className="p-2 rounded-lg bg-[#090D16] border border-slate-800 text-[#94A3B8] hover:text-white"
                title="Clear conversation"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Consent & Quick Demo Bar */}
          <div className="py-2.5 px-1 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/60 text-xs">
            <label className="flex items-center gap-2 text-[#94A3B8] cursor-pointer">
              <input
                type="checkbox"
                checked={audioConsent}
                onChange={(e) => setAudioConsent(e.target.checked)}
                className="rounded border-slate-700 bg-[#090D16]"
              />
              <span>Opt-in transcript & session retention consent</span>
            </label>

            {isCallActive && (
              <button
                type="button"
                onClick={runRahulScenario}
                className="px-2.5 py-1 rounded-md bg-[#6366F1]/15 text-[#6366F1] border border-[#6366F1]/30 hover:bg-[#6366F1]/25 inline-flex items-center gap-1 font-medium"
              >
                <Play className="w-3 h-3" />
                Send Rahul Sharma Test Input
              </button>
            )}
          </div>

          {/* Live Transcript */}
          <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-[#94A3B8] px-6">
                <Sparkles className="w-8 h-8 text-[#6366F1] mb-3" />
                <p className="text-sm font-medium text-slate-200">Ready to start an autonomous sales call</p>
                <p className="text-xs mt-1 max-w-md">
                  Click <strong>Start Call</strong> above to greet the customer, capture requirements via voice or text, retrieve FlowStack RAG docs, score the lead, and book an appointment.
                </p>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.sender === 'CUSTOMER' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[82%] rounded-xl px-3.5 py-2.5 text-sm ${
                      m.sender === 'CUSTOMER'
                        ? 'bg-[#6366F1] text-white'
                        : 'bg-[#090D16] border border-slate-800 text-slate-100'
                    }`}
                  >
                    <div className="text-[10px] opacity-75 mb-0.5 font-medium">
                      {m.sender === 'CUSTOMER' ? 'Customer' : 'Aria (AI Sales Agent)'}
                    </div>
                    <p className="leading-relaxed">{m.content}</p>
                    {m.sources && m.sources.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-800/80 flex flex-wrap gap-1.5">
                        {m.sources.map((src, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#06B6D4]/10 text-[#06B6D4] text-[10px]"
                          >
                            <BookOpen className="w-2.5 h-2.5" />
                            {src.title}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            {interimTranscript && (
              <div className="flex justify-end">
                <div className="max-w-[75%] rounded-xl px-3.5 py-2 text-xs italic bg-[#6366F1]/40 text-slate-200">
                  Listening: {interimTranscript}...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Text / Voice Fallback Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="pt-3 border-t border-slate-800 flex gap-2"
          >
            <input
              type="text"
              disabled={!isCallActive}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={
                isCallActive
                  ? 'Speak into your mic or type a customer message...'
                  : 'Start a call to begin...'
              }
              className="flex-1 px-3.5 py-2 rounded-lg bg-[#090D16] border border-slate-800 text-sm focus:outline-none focus:border-[#6366F1] disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!isCallActive || !textInput.trim()}
              className="px-4 py-2 rounded-lg bg-[#6366F1] hover:bg-indigo-500 text-white text-sm font-medium inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </form>
        </div>

        {/* Right Side: Live Agent Intelligence & Memory */}
        <div className="space-y-4">
          <div className="enterprise-card p-4">
            <div className="flex items-center gap-2 text-sm font-semibold mb-3">
              <Target className="w-4 h-4 text-[#6366F1]" />
              <span>Live Lead Qualification</span>
            </div>
            {liveLead ? (
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#94A3B8]">Score</span>
                  <span className="font-mono font-bold text-base">{liveLead.score}/100</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#94A3B8]">Classification</span>
                  <ClassificationBadge value={liveLead.classification} />
                </div>
                {liveLead.recommendedPlan && (
                  <div className="p-2.5 rounded-lg bg-[#090D16] border border-slate-800">
                    <div className="text-[11px] text-[#94A3B8]">Recommended Plan</div>
                    <div className="text-slate-200 font-medium mt-0.5">{liveLead.recommendedPlan}</div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-[#94A3B8]">
                Lead score updates automatically as customer shares team size, budget, and timeline.
              </p>
            )}
          </div>

          <div className="enterprise-card p-4">
            <h3 className="text-sm font-semibold mb-3">Session Memory</h3>
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-[#94A3B8]">Customer Name</dt>
                <dd className="font-medium">{String(sessionMemory.customerName || 'Unknown')}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#94A3B8]">Team Size</dt>
                <dd className="font-medium">
                  {sessionMemory.companySize ? `${sessionMemory.companySize} employees` : 'Unknown'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#94A3B8]">Budget</dt>
                <dd className="font-medium">{String(sessionMemory.budget || 'Unknown')}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#94A3B8]">Timeline</dt>
                <dd className="font-medium">{String(sessionMemory.purchasingTimeline || 'Unknown')}</dd>
              </div>
            </dl>
          </div>

          {bookedApt && (
            <div className="enterprise-card p-4 border-[#22C55E]/40 bg-[#22C55E]/5">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#22C55E]">
                <CalendarCheck className="w-4 h-4" />
                <span>Appointment Booked</span>
              </div>
              <p className="text-xs text-slate-200 mt-1.5 font-medium">{bookedApt.title}</p>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                {new Date(bookedApt.startTime).toLocaleString('en-IN')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
