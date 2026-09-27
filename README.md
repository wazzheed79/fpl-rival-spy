This is a Next.js 16 app for finding Fantasy Premier League differential picks.

## Getting Started

Install dependencies and start the development server:

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production Build

```bash
npm ci
npm run build
npm start
```

The project already includes the required Next.js production scripts:

- `npm run build`
- `npm start`

## Deployment

This repository is configured for **Vercel**, which is the recommended deployment target for this app because it uses Next.js route handlers under `app/api`.

### Deploy to Vercel

1. Push the repository to GitHub.
2. In Vercel, choose **Add New → Project** and import `wazzheed79/fpl-rival-spy`.
3. Keep the detected **Next.js** framework preset.
4. Confirm the defaults:
   - **Install Command:** `npm ci`
   - **Build Command:** `npm run build`
   - **Output setting:** handled automatically by Vercel for Next.js
5. Add any future environment variables in **Project Settings → Environment Variables**.
6. Deploy.

After the first deploy, Vercel will automatically create a new production deployment for pushes to your production branch and preview deployments for pull requests.

### Environment Variables

There are **no required environment variables at the moment**. The app currently reads public FPL data directly from the Fantasy Premier League API at runtime.

If you add environment variables later:

- keep them in local `.env*` files for development only
- do **not** commit `.env*` files
- add the same variable names in Vercel before building
