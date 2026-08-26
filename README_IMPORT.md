# PawPing v2 import
1. Run SUPABASE_OWNER_DASHBOARD.sql in Supabase SQL Editor.
2. In Supabase Authentication > URL Configuration, set Site URL to your Vercel production URL and add the same URL plus /owner as a redirect URL.
3. Upload all files and folders from this package to the ROOT of the GitHub repository, replacing matching files.
4. Keep Vercel variables NEXT_PUBLIC_SUPABASE_URL (project base URL, no /rest/v1) and NEXT_PUBLIC_SUPABASE_ANON_KEY.
5. Deploy the new GitHub commit.
6. Open /owner, enter email, follow magic link, and create pets dynamically. Public pages use /c/{generated-token}.
