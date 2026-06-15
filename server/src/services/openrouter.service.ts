import { getUserApiKey } from '../db/supabase.js';
import type { PageResult } from '../types/index.js';

export async function generateSEORecommendationsOpenRouter(
  userId: string,
  pageResult: PageResult
): Promise<any> {
  const apiKey = await getUserApiKey(userId, 'openrouter_api_key');

  if (!apiKey) {
    throw new Error('OpenRouter API key is not configured. Please add it in Settings.');
  }

  const prompt = buildSEOAnalysisPrompt(pageResult);

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://onpageseo.app',
      'X-Title': 'OnPage SEO Analyzer',
    },
    body: JSON.stringify({
      model: 'google/gemini-flash-1.5',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${errText}`);
  }

  const data = await response.json() as any;
  const text = data.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error('Empty response from OpenRouter');
  }

  // Strip markdown code fences if present
  const cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    return { summary: text, recommendations: [] };
  }
}

function buildSEOAnalysisPrompt(pageResult: PageResult): string {
  const issues: string[] = [];

  if (!pageResult.has_title) {
    issues.push('Missing meta title');
  } else if (pageResult.meta_title_length && (pageResult.meta_title_length < 30 || pageResult.meta_title_length > 60)) {
    issues.push(`Meta title length is ${pageResult.meta_title_length} chars (optimal: 30-60)`);
  }

  if (!pageResult.has_description) {
    issues.push('Missing meta description');
  } else if (pageResult.meta_description_length && (pageResult.meta_description_length < 120 || pageResult.meta_description_length > 160)) {
    issues.push(`Meta description length is ${pageResult.meta_description_length} chars (optimal: 120-160)`);
  }

  if (!pageResult.has_h1) issues.push('Missing H1 heading');
  else if (pageResult.h1_count > 1) issues.push(`Multiple H1 headings (${pageResult.h1_count})`);

  if (!pageResult.has_canonical) issues.push('Missing canonical URL');
  if (!pageResult.is_https) issues.push('Not served over HTTPS');

  if (!pageResult.passes_core_web_vitals) {
    if (pageResult.lcp_status !== 'good') issues.push(`LCP: ${pageResult.lcp}ms (${pageResult.lcp_status})`);
    if (pageResult.fid_status !== 'good') issues.push(`FID: ${pageResult.fid}ms (${pageResult.fid_status})`);
    if (pageResult.cls_status !== 'good') issues.push(`CLS: ${pageResult.cls} (${pageResult.cls_status})`);
  }

  if (pageResult.broken_links) issues.push('Broken links detected');
  if (pageResult.broken_resources) issues.push('Broken resources detected');
  if (pageResult.low_content_rate) issues.push('Low content-to-code ratio');
  if (pageResult.no_image_alt) issues.push('Images without alt attributes');

  return `You are an expert SEO consultant. Analyze these audit results for "${pageResult.url}" and provide actionable recommendations.

Overall Score: ${pageResult.onpage_score}/100 | Status: ${pageResult.overall_status} | Words: ${pageResult.word_count}

Issues found:
${issues.length > 0 ? issues.map((i, n) => `${n + 1}. ${i}`).join('\n') : 'No major issues.'}

Performance: TTI=${pageResult.time_to_interactive}ms, DOM=${pageResult.dom_complete}ms, Size=${(pageResult.page_size / 1024).toFixed(0)}KB

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "overall_assessment": "brief assessment",
  "priority_recommendations": [{"title":"...","description":"...","impact":"high|medium|low","effort":"low|medium|high"}],
  "content_recommendations": [{"title":"...","description":"..."}],
  "technical_recommendations": [{"title":"...","description":"..."}],
  "performance_recommendations": [{"title":"...","description":"..."}]
}`;
}
