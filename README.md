# Asset Management App

This app is now prepared to use:

- `Supabase` for cloud database and admin login
- `Netlify` or `Vercel` for free static deployment

## 1. Create Supabase project

1. Create a project in Supabase.
2. Open the SQL editor.
3. Run the SQL from [setup-supabase.sql](C:/Users/NISHANT/Documents/Codex/2026-04-27/create-a-web-application-for-aasset-2/setup-supabase.sql).
4. In Supabase Auth, create one admin user with email and password.
5. Copy your `Project URL` and `Publishable key` or `anon key`.

## 2. Add app config

Open [config.js](C:/Users/NISHANT/Documents/Codex/2026-04-27/create-a-web-application-for-aasset-2/config.js) and set:

```js
window.ASSET_APP_CONFIG = {
  supabaseUrl: "https://YOUR-PROJECT.supabase.co",
  supabaseAnonKey: "YOUR-PUBLISHABLE-OR-ANON-KEY"
};
```

## 3. Deploy for free

### Netlify

1. Create a GitHub repository and upload these files.
2. In Netlify, choose `Add new project`.
3. Import the GitHub repository.
4. Publish the root folder as a static site.

### Vercel

1. Create a GitHub repository and upload these files.
2. In Vercel, choose `Add New Project`.
3. Import the GitHub repository.
4. Deploy as a static site with no build command.

## Notes

- The app uses Supabase Auth email/password login. There is no signup screen in the app.
- Data is shared across devices and browsers because it is stored in Supabase.
- If you update data in one browser, refresh another browser to see the latest changes.
