# Database Migrations

This directory contains SQL migrations for the Chameleon-X project.

## How to Apply Migrations

### Method 1: Using the Supabase Dashboard

1. Log in to your Supabase dashboard
2. Go to the SQL Editor
3. Copy the content of the SQL file you want to run
4. Paste it into the editor
5. Click "Run" to execute the query

### Method 2: Using the Supabase CLI

If you have the Supabase CLI installed:

```bash
# Navigate to the project root
cd /path/to/Chameleon-X

# Run a specific migration
supabase db push --db-url YOUR_SUPABASE_URL migrations/create_chat_sessions.sql
```

## Migration Files

- `create_chat_sessions.sql`: Creates the chat_sessions table needed for the chat functionality 