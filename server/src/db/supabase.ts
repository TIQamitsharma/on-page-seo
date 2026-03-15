import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function getUserIdFromToken(token: string): Promise<string | null> {
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  return user.id;
}

export async function getUserApiKey(userId: string, keyName: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('user_api_keys')
    .select('key_value')
    .eq('user_id', userId)
    .eq('key_name', keyName)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.key_value;
}

export async function setUserApiKey(
  userId: string,
  keyName: string,
  keyValue: string
): Promise<void> {
  await supabase
    .from('user_api_keys')
    .upsert(
      {
        user_id: userId,
        key_name: keyName,
        key_value: keyValue,
        is_active: true,
      },
      {
        onConflict: 'user_id,key_name',
      }
    );
}

export async function createAudit(
  userId: string,
  url: string,
  totalPages: number = 0
): Promise<any> {
  const { data, error } = await supabase
    .from('audits')
    .insert({
      user_id: userId,
      url,
      total_pages: totalPages,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getAuditById(auditId: string, userId: string): Promise<any> {
  const { data, error } = await supabase
    .from('audits')
    .select('*')
    .eq('id', auditId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getAllAudits(userId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('audits')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function updateAuditStatus(
  auditId: string,
  status: string,
  errorMessage?: string
): Promise<void> {
  const updates: any = { status };

  if (status === 'completed' || status === 'failed' || status === 'cancelled') {
    updates.completed_at = new Date().toISOString();
  }

  if (errorMessage) {
    updates.error_message = errorMessage;
  }

  await supabase.from('audits').update(updates).eq('id', auditId);
}

export async function updateAuditProgress(
  auditId: string,
  totalPages: number,
  completedPages: number
): Promise<void> {
  await supabase
    .from('audits')
    .update({
      total_pages: totalPages,
      completed_pages: completedPages,
    })
    .eq('id', auditId);
}

export async function deleteAudit(auditId: string, userId: string): Promise<void> {
  await supabase.from('audits').delete().eq('id', auditId).eq('user_id', userId);
}

export async function insertPageResult(userId: string, pageResult: any): Promise<void> {
  const booleanFields = [
    'passes_core_web_vitals',
    'broken_links',
    'broken_resources',
    'has_h1',
    'has_title',
    'has_description',
    'has_canonical',
    'is_https',
    'seo_friendly_url',
    'has_html_doctype',
    'low_content_rate',
    'no_image_alt',
    'no_image_title',
    'has_misspelling',
    'duplicate_title',
    'duplicate_description',
    'duplicate_content',
    'duplicate_meta_tags',
  ];

  const processedResult = { ...pageResult, user_id: userId };

  for (const field of booleanFields) {
    if (field in processedResult && typeof processedResult[field] === 'number') {
      processedResult[field] = processedResult[field] === 1;
    }
  }

  if (processedResult.misspelled_words && Array.isArray(processedResult.misspelled_words)) {
    processedResult.misspelled_words = JSON.stringify(processedResult.misspelled_words);
  }

  if (processedResult.html_errors) {
    processedResult.html_errors = JSON.stringify(processedResult.html_errors);
  }

  if (processedResult.html_warnings) {
    processedResult.html_warnings = JSON.stringify(processedResult.html_warnings);
  }

  const { error } = await supabase.from('page_results').insert(processedResult);

  if (error) throw error;
}

export async function getPageResultsByAuditId(
  auditId: string,
  userId: string
): Promise<any[]> {
  const { data, error } = await supabase
    .from('page_results')
    .select('*')
    .eq('audit_id', auditId)
    .eq('user_id', userId)
    .order('onpage_score', { ascending: false });

  if (error) throw error;

  return (data || []).map((result: any) => {
    if (typeof result.misspelled_words === 'string') {
      try {
        result.misspelled_words = JSON.parse(result.misspelled_words);
      } catch (e) {
        result.misspelled_words = [];
      }
    }

    if (typeof result.html_errors === 'string') {
      try {
        result.html_errors = JSON.parse(result.html_errors);
      } catch (e) {
        result.html_errors = [];
      }
    }

    if (typeof result.html_warnings === 'string') {
      try {
        result.html_warnings = JSON.parse(result.html_warnings);
      } catch (e) {
        result.html_warnings = [];
      }
    }

    return result;
  });
}

export async function getPageResultById(
  pageResultId: string,
  userId: string
): Promise<any> {
  const { data, error } = await supabase
    .from('page_results')
    .select('*')
    .eq('id', pageResultId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;

  if (data) {
    if (typeof data.misspelled_words === 'string') {
      try {
        data.misspelled_words = JSON.parse(data.misspelled_words);
      } catch (e) {
        data.misspelled_words = [];
      }
    }

    if (typeof data.html_errors === 'string') {
      try {
        data.html_errors = JSON.parse(data.html_errors);
      } catch (e) {
        data.html_errors = [];
      }
    }

    if (typeof data.html_warnings === 'string') {
      try {
        data.html_warnings = JSON.parse(data.html_warnings);
      } catch (e) {
        data.html_warnings = [];
      }
    }
  }

  return data;
}

export async function deletePageResultsByAuditId(
  auditId: string,
  userId: string
): Promise<void> {
  await supabase
    .from('page_results')
    .delete()
    .eq('audit_id', auditId)
    .eq('user_id', userId);
}
