-- No schema change needed: user_api_keys already stores any key_name/key_value pair.
-- This migration just ensures the constraint comment documents the supported keys.
COMMENT ON TABLE user_api_keys IS 'Stores per-user API credentials. Supported key_name values: firecrawl_api_key, dataforseo_username, dataforseo_password, claude_api_key, openrouter_api_key';
