import Anthropic from '@anthropic-ai/sdk';
import { getUserApiKey } from '../db/supabase.js';
import type { PageResult } from '../types/index.js';

export async function generateSEORecommendations(
  userId: string,
  pageResult: PageResult
): Promise<any> {
  const apiKey = await getUserApiKey(userId, 'claude_api_key');

  if (!apiKey) {
    throw new Error('Claude API key is not configured. Please add it in Settings.');
  }

  const client = new Anthropic({
    apiKey,
  });

  const prompt = buildSEOAnalysisPrompt(pageResult);

  const message = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response format from Claude');
  }

  try {
    return JSON.parse(content.text);
  } catch (error) {
    return {
      summary: content.text,
      recommendations: [],
    };
  }
}

function buildSEOAnalysisPrompt(pageResult: PageResult): string {
  const issues: string[] = [];

  if (!pageResult.has_title) {
    issues.push('Missing meta title');
  } else if (pageResult.meta_title_length && (pageResult.meta_title_length < 30 || pageResult.meta_title_length > 60)) {
    issues.push(`Meta title length is ${pageResult.meta_title_length} characters (optimal: 30-60)`);
  }

  if (!pageResult.has_description) {
    issues.push('Missing meta description');
  } else if (pageResult.meta_description_length && (pageResult.meta_description_length < 120 || pageResult.meta_description_length > 160)) {
    issues.push(`Meta description length is ${pageResult.meta_description_length} characters (optimal: 120-160)`);
  }

  if (!pageResult.has_h1) {
    issues.push('Missing H1 heading');
  } else if (pageResult.h1_count > 1) {
    issues.push(`Multiple H1 headings found (${pageResult.h1_count})`);
  }

  if (!pageResult.has_canonical) {
    issues.push('Missing canonical URL');
  }

  if (!pageResult.is_https) {
    issues.push('Page is not served over HTTPS');
  }

  if (!pageResult.passes_core_web_vitals) {
    const cwvIssues: string[] = [];
    if (pageResult.lcp_status !== 'good') {
      cwvIssues.push(`LCP: ${pageResult.lcp}ms (${pageResult.lcp_status})`);
    }
    if (pageResult.fid_status !== 'good') {
      cwvIssues.push(`FID: ${pageResult.fid}ms (${pageResult.fid_status})`);
    }
    if (pageResult.cls_status !== 'good') {
      cwvIssues.push(`CLS: ${pageResult.cls} (${pageResult.cls_status})`);
    }
    issues.push(`Core Web Vitals issues: ${cwvIssues.join(', ')}`);
  }

  if (pageResult.broken_links) {
    issues.push('Broken links detected');
  }

  if (pageResult.broken_resources) {
    issues.push('Broken resources detected');
  }

  if (pageResult.low_content_rate) {
    issues.push('Low content-to-code ratio');
  }

  if (pageResult.no_image_alt) {
    issues.push('Images without alt attributes');
  }

  if (pageResult.duplicate_title) {
    issues.push('Duplicate meta title');
  }

  if (pageResult.duplicate_description) {
    issues.push('Duplicate meta description');
  }

  if (pageResult.duplicate_content) {
    issues.push('Duplicate content detected');
  }

  const pageSize = pageResult.page_size || 0;
  if (pageSize > 3 * 1024 * 1024) {
    issues.push(`Large page size: ${(pageSize / 1024 / 1024).toFixed(2)}MB`);
  }

  if (pageResult.render_blocking_scripts && pageResult.render_blocking_scripts > 5) {
    issues.push(`${pageResult.render_blocking_scripts} render-blocking scripts`);
  }

  if (pageResult.render_blocking_stylesheets && pageResult.render_blocking_stylesheets > 3) {
    issues.push(`${pageResult.render_blocking_stylesheets} render-blocking stylesheets`);
  }

  const prompt = `You are an expert SEO consultant. Analyze the following SEO audit results for the page "${pageResult.url}" and provide actionable recommendations.

Page Information:
- URL: ${pageResult.url}
- Overall Score: ${pageResult.onpage_score}/100
- Status: ${pageResult.overall_status}
- Word Count: ${pageResult.word_count}
- Readability Score: ${pageResult.readability_score}

Identified Issues:
${issues.length > 0 ? issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n') : 'No major issues detected.'}

Social Media Tags:
- OG Title: ${pageResult.og_title || 'Not set'}
- OG Description: ${pageResult.og_description || 'Not set'}
- OG Image: ${pageResult.og_image || 'Not set'}
- Twitter Card: ${pageResult.twitter_card || 'Not set'}

Performance Metrics:
- Time to Interactive: ${pageResult.time_to_interactive}ms
- DOM Complete: ${pageResult.dom_complete}ms
- Scripts: ${pageResult.scripts_count} (${(pageResult.scripts_size / 1024).toFixed(2)}KB)
- Stylesheets: ${pageResult.stylesheets_count} (${(pageResult.stylesheets_size / 1024).toFixed(2)}KB)
- Images: ${pageResult.images_count} (${(pageResult.images_size / 1024).toFixed(2)}KB)

Please provide your response in the following JSON format:
{
  "overall_assessment": "A brief overall assessment of the page's SEO health",
  "priority_recommendations": [
    {
      "title": "Recommendation title",
      "description": "Detailed description",
      "impact": "high|medium|low",
      "effort": "low|medium|high"
    }
  ],
  "content_recommendations": [
    {
      "title": "Recommendation title",
      "description": "Detailed description"
    }
  ],
  "technical_recommendations": [
    {
      "title": "Recommendation title",
      "description": "Detailed description"
    }
  ],
  "performance_recommendations": [
    {
      "title": "Recommendation title",
      "description": "Detailed description"
    }
  ]
}

Focus on providing specific, actionable advice that the user can implement to improve their SEO.`;

  return prompt;
}
