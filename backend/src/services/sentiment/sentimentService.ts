import { store } from '../../db/store';
import { Message, SentimentAnalysis, SentimentCategory } from '../../types/domain';
import { geminiProvider } from '../ai/llmProvider';

export async function analyzeConversationSentiment(params: {
  conversationId: string;
  messages: Message[];
  mode?: 'LIVE' | 'DEMO';
}): Promise<SentimentAnalysis> {
  const customerTexts = params.messages
    .filter((m) => m.sender === 'CUSTOMER')
    .map((m) => m.content);

  const combined = customerTexts.join(' ').toLowerCase();

  if (params.mode === 'LIVE' && geminiProvider.isConfigured() && customerTexts.length > 0) {
    try {
      const transcript = params.messages
        .map((m) => `${m.sender}: ${m.content}`)
        .join('\n');
      const raw = await geminiProvider.generateText({
        systemPrompt:
          'You are a Sentiment Analysis Agent for B2B sales calls. Return ONLY valid JSON with keys: category ("POSITIVE"|"NEUTRAL"|"NEGATIVE"), score (number 0 to 1), frustrationDetected (boolean), hesitationDetected (boolean), buyingSignals (string[]), keyPhrases (string[]), concerns (string[]), interestLevel ("High"|"Medium"|"Low"), urgency ("High"|"Medium"|"Low"), satisfaction ("High"|"Neutral"|"Low"), recommendedNextAction (string), explanation (string).',
        messages: [{ role: 'user', content: `Analyze this sales call transcript:\n\n${transcript}` }],
        jsonMode: true,
        temperature: 0.2,
      });

      const parsed = JSON.parse(raw);
      return saveSentimentRecord(params.conversationId, {
        category: (['POSITIVE', 'NEUTRAL', 'NEGATIVE'].includes(parsed.category)
          ? parsed.category
          : 'NEUTRAL') as SentimentCategory,
        score: typeof parsed.score === 'number' ? Math.max(0, Math.min(1, parsed.score)) : 0.65,
        frustrationDetected: Boolean(parsed.frustrationDetected),
        hesitationDetected: Boolean(parsed.hesitationDetected),
        buyingSignals: Array.isArray(parsed.buyingSignals) ? parsed.buyingSignals : [],
        keyPhrases: Array.isArray(parsed.keyPhrases) ? parsed.keyPhrases : [],
        concerns: Array.isArray(parsed.concerns) ? parsed.concerns : [],
        interestLevel: parsed.interestLevel || 'Medium',
        urgency: parsed.urgency || 'Medium',
        satisfaction: parsed.satisfaction || 'Neutral',
        recommendedNextAction: parsed.recommendedNextAction || 'Follow up with tailored product demo.',
        explanation: `AI-generated analysis: ${parsed.explanation || 'Evaluated from conversation transcript.'}`,
      });
    } catch {
      // Fall through to deterministic transcript analyzer if JSON parse fails
    }
  }

  // Deterministic transcript-based sentiment & signal extraction
  const positiveWords = ['great', 'good', 'yes', 'sure', 'book', 'confirm', 'interested', 'helpful', 'awesome', 'perfect', 'sounds good', 'demo', 'budget'];
  const negativeWords = ['frustrated', 'terrible', 'bad', 'waste', 'expensive', 'too high', 'cancel', 'annoyed', 'useless', 'no thanks', 'human', 'manager'];
  const hesitationWords = ['maybe', 'not sure', 'later', 'think about', 'compare', 'expensive', 'concern'];

  let posHits = 0;
  let negHits = 0;
  const buyingSignals: string[] = [];
  const keyPhrases: string[] = [];
  const concerns: string[] = [];

  for (const w of positiveWords) {
    if (combined.includes(w)) {
      posHits++;
      keyPhrases.push(w);
    }
  }
  for (const w of negativeWords) {
    if (combined.includes(w)) {
      negHits++;
      concerns.push(`Customer expressed concern around "${w}"`);
    }
  }
  const hesitationDetected = hesitationWords.some((w) => combined.includes(w));
  const frustrationDetected = negHits >= 2 || combined.includes('frustrated') || combined.includes('angry');

  if (combined.includes('budget') || combined.includes('₹') || combined.includes('rs')) {
    buyingSignals.push('Disclosed budget parameters');
  }
  if (combined.includes('employee') || combined.includes('team') || combined.includes('users') || combined.includes('seats')) {
    buyingSignals.push('Shared team/seat size');
  }
  if (combined.includes('demo') || combined.includes('book') || combined.includes('schedule') || combined.includes('appointment')) {
    buyingSignals.push('Expressed interest in scheduling a demo/appointment');
  }

  let category: SentimentCategory = 'NEUTRAL';
  let score = 0.55;
  if (negHits > posHits) {
    category = 'NEGATIVE';
    score = Math.max(0.15, 0.45 - negHits * 0.1);
  } else if (posHits >= 2 || buyingSignals.length >= 2) {
    category = 'POSITIVE';
    score = Math.min(0.95, 0.65 + posHits * 0.06);
  }

  return saveSentimentRecord(params.conversationId, {
    category,
    score: Number(score.toFixed(2)),
    frustrationDetected,
    hesitationDetected,
    buyingSignals,
    keyPhrases: Array.from(new Set(keyPhrases)).slice(0, 6),
    concerns,
    interestLevel: buyingSignals.length >= 2 ? 'High' : posHits > 0 ? 'Medium' : 'Low',
    urgency: combined.includes('month') || combined.includes('week') || combined.includes('tomorrow') || combined.includes('demo') ? 'High' : 'Medium',
    satisfaction: category === 'POSITIVE' ? 'High' : category === 'NEGATIVE' ? 'Low' : 'Neutral',
    recommendedNextAction:
      category === 'NEGATIVE'
        ? 'Assign to senior sales manager for empathetic follow-up'
        : buyingSignals.length >= 2
          ? 'Confirm demo agenda and send tailored proposal'
          : 'Send product brochure and schedule discovery follow-up',
    explanation: `AI-generated analysis (not a guaranteed psychological assessment): Detected ${posHits} positive/engagement cues, ${negHits} negative cues, and ${buyingSignals.length} buying signals in the customer transcript.`,
  });
}

function saveSentimentRecord(
  conversationId: string,
  data: Omit<SentimentAnalysis, 'id' | 'conversationId' | 'isAiGenerated' | 'createdAt'>
): SentimentAnalysis {
  const existingIdx = store.db.sentimentAnalyses.findIndex((s) => s.conversationId === conversationId);
  const record: SentimentAnalysis = {
    id: existingIdx >= 0 ? store.db.sentimentAnalyses[existingIdx].id : store.newId('sent'),
    conversationId,
    ...data,
    isAiGenerated: true,
    createdAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    store.db.sentimentAnalyses[existingIdx] = record;
  } else {
    store.db.sentimentAnalyses.unshift(record);
  }

  // Sync sentiment to linked lead if present
  const conv = store.db.conversations.find((c) => c.id === conversationId);
  if (conv?.leadId) {
    const lead = store.db.leads.find((l) => l.id === conv.leadId);
    if (lead) {
      lead.sentiment = record.category;
      lead.updatedAt = new Date().toISOString();
    }
  }
  store.save();
  return record;
}
