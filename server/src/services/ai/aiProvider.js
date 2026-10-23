import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../config/config.js';
import { buildReviewPrompt } from './promptBuilder.js';
import { aiReviewOutputSchema } from './outputSchema.js';
import { runHeuristicFallbackReview } from './heuristicFallback.js';
import { verifyPolicyCitation } from '../policy/policyRetriever.js';

/**
 * Execute AI Review against configured LLM provider (Gemini or OpenAI).
 * If provider key is missing, network fails, or validation fails,
 * cleanly executes deterministic heuristic fallback.
 */
export async function executeAiReview(listing, relevantPolicies) {
  const startTime = Date.now();
  const provider = config.llmProvider; // 'gemini' | 'openai' | 'mock'
  const geminiKey = config.geminiApiKey;
  const openaiKey = config.openaiApiKey;

  // If mock provider is forced (e.g., test environment), return deterministic fallback cleanly
  if (provider === 'mock' || (!geminiKey && !openaiKey)) {
    console.log('[AI Provider] No external LLM API key configured or mock provider requested. Using deterministic fallback.');
    const fallbackResult = runHeuristicFallbackReview(listing, relevantPolicies);
    return {
      findings: postProcessFindings(fallbackResult.findings, relevantPolicies),
      suggestedRevisions: fallbackResult.suggestedRevisions || {},
      summary: fallbackResult.summary,
      providerMetadata: {
        provider: 'fallback-heuristic-engine',
        model: 'rule-pattern-matcher',
        fallbackUsed: true,
        executionTimeMs: Date.now() - startTime,
        promptTokens: 0,
        responseTokens: 0,
        error: !geminiKey && !openaiKey ? 'LLM_API_KEY_NOT_CONFIGURED' : null,
      },
    };
  }

  // Attempt external LLM call with timeout
  const timeoutMs = 20000;
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('AI Provider Request Timeout after 20s')), timeoutMs)
  );

  try {
    let rawResponseText = '';
    let usedModel = '';

    if (geminiKey && (provider === 'gemini' || !openaiKey)) {
      usedModel = config.geminiModel;
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({
        model: usedModel,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1, // low temperature for deterministic policy compliance
        },
      });

      const { systemInstruction, userPrompt } = buildReviewPrompt(listing, relevantPolicies);
      
      const apiCall = model.generateContent({
        contents: [
          { role: 'user', parts: [{ text: `${systemInstruction}\n\n${userPrompt}` }] },
        ],
      });

      const response = await Promise.race([apiCall, timeoutPromise]);
      rawResponseText = response.response.text();
    } else if (openaiKey && provider === 'openai') {
      usedModel = config.openaiModel;
      const { systemInstruction, userPrompt } = buildReviewPrompt(listing, relevantPolicies);

      const apiCall = fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: usedModel,
          temperature: 0.1,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: userPrompt },
          ],
        }),
      }).then(async (res) => {
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`OpenAI API error (${res.status}): ${errText}`);
        }
        return res.json();
      });

      const data = await Promise.race([apiCall, timeoutPromise]);
      rawResponseText = data.choices[0].message.content;
    }

    // Parse and validate structured JSON output
    const cleanJsonString = extractJsonString(rawResponseText);
    const parsedData = JSON.parse(cleanJsonString);
    const validatedData = aiReviewOutputSchema.parse(parsedData);

    // Step 8: Policy Citation Verification
    // Every cited policy section must match one of the retrieved policies!
    const verifiedFindings = postProcessFindings(validatedData.findings, relevantPolicies);

    return {
      findings: verifiedFindings,
      suggestedRevisions: validatedData.suggestedRevisions || {},
      summary: validatedData.summary,
      providerMetadata: {
        provider: provider,
        model: usedModel,
        fallbackUsed: false,
        executionTimeMs: Date.now() - startTime,
        promptTokens: 0,
        responseTokens: 0,
        error: null,
      },
    };
  } catch (err) {
    console.error(`[AI Provider Error] ${err.message}. Falling back to deterministic rule engine.`);
    const fallbackResult = runHeuristicFallbackReview(listing, relevantPolicies);
    return {
      findings: postProcessFindings(fallbackResult.findings, relevantPolicies),
      suggestedRevisions: fallbackResult.suggestedRevisions || {},
      summary: `${fallbackResult.summary} (AI provider failed with: ${err.message})`,
      providerMetadata: {
        provider: 'fallback-heuristic-engine',
        model: 'rule-pattern-matcher',
        fallbackUsed: true,
        executionTimeMs: Date.now() - startTime,
        error: err.message,
      },
    };
  }
}

/**
 * Step 8: Verify policy citations and attach source / verification flags.
 * If AI hallucinated a policy ID not in relevantPolicies, demote to unverified recommendation.
 */
function postProcessFindings(rawFindings, relevantPolicies) {
  return rawFindings.map((finding) => {
    let finalSectionId = finding.policySectionId;
    let finalTitle = finding.policyTitle;
    let finalExcerpt = finding.policyExcerpt;
    let isUnverified = finding.isUnverified || false;

    if (finalSectionId) {
      const matched = verifyPolicyCitation(finalSectionId, relevantPolicies);
      if (matched) {
        // Confirmed grounding!
        finalSectionId = matched.sectionId;
        finalTitle = matched.title;
        if (!finalExcerpt) {
          finalExcerpt = matched.content.slice(0, 150) + '...';
        }
        isUnverified = false;
      } else {
        // Hallucinated or non-existent policy citation!
        // Requirement: "Do not fabricate policy section numbers, quotations, or citations. If the supplied policy does not support a finding, label it as an unverified recommendation rather than a policy violation."
        finalSectionId = null;
        finalTitle = null;
        finalExcerpt = null;
        isUnverified = true;
      }
    } else {
      isUnverified = true;
    }

    return {
      field: finding.field || 'description',
      issueCategory: finding.issueCategory || 'UNCLEAR_WORDING',
      ruleId: finding.ruleId || null,
      severity: finding.severity || 'Medium',
      description: finding.description,
      policySectionId: finalSectionId,
      policyTitle: finalTitle,
      policyExcerpt: finalExcerpt,
      explanation: finding.explanation,
      suggestedRevision: finding.suggestedRevision || null,
      source: finding.source || 'ai',
      confidence: finding.confidence || (isUnverified ? 'Low' : 'High'),
      isUnverified,
      status: 'pending',
    };
  });
}

function extractJsonString(text) {
  if (!text) return '{}';
  const trimmed = text.trim();
  // Strip ```json and ``` if present
  if (trimmed.startsWith('```')) {
    return trimmed.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  }
  return trimmed;
}
