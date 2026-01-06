---
description: Deploy the application to Vercel
---

1. Install the Vercel CLI globally (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. Login to your Vercel account:
   ```bash
   vercel login
   ```

3. Initialize and deploy the project:
   ```bash
   vercel
   ```
   - Follow the prompts in the terminal.
   - Use the default settings for most questions.
   - When asked "Want to modify these settings?", answer "n" (No) usually, unless you have custom build scripts.
   - The project is detected as a Vite project automatically.

4. Set Environment Variables:
   - During the `vercel` command setup, or afterwards in the Vercel Dashboard -> Settings -> Environment Variables.
   - You need to add the following variables from your `.env` file:
     - `VITE_SUPABASE_PROJECT_ID`
     - `VITE_SUPABASE_PUBLISHABLE_KEY`
     - `VITE_SUPABASE_URL`

5. Production Deployment:
   - To deploy to production (main domain), use:
   ```bash
   vercel --prod
   ```
