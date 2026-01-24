# ScoreSpace Website

A personal website built with [Astro](https://astro.build) featuring game jams and games from ScoreSpace.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
├── public/              # Static assets (favicon, images)
├── src/
│   ├── data/            # Data files (jams.ts, games.ts)
│   ├── layouts/         # Page layouts
│   └── pages/           # Site pages (index, jams, games)
├── astro.config.mjs     # Astro configuration
└── package.json
```

## Adding Content

### Adding a New Game Jam

Edit `src/data/jams.ts` and add a new entry to the `jams` array:

```typescript
{
  name: "Your Jam Name",
  date: "2025-01-01",
  participants: 100,
  submissions: 25,
  ranked: true,
  prize: "$500",  // optional
  url: "https://itch.io/jam/your-jam"
}
```

### Adding a New Game

Edit `src/data/games.ts` and add a new entry to the `games` array:

```typescript
{
  name: "Game Name",
  description: "A brief description of your game.",
  url: "https://itch.io/game-link",
  playable: "browser",  // "browser", "download", or "both"
  tags: ["tag1", "tag2"]  // optional
}
```

---

# Deploying to GitHub Pages

This guide will walk you through deploying your site to GitHub Pages from scratch.

## Prerequisites

- A GitHub account (free at [github.com](https://github.com))
- Git installed on your computer ([download here](https://git-scm.com/downloads))

## Step 1: Create a GitHub Repository

1. Go to [github.com](https://github.com) and sign in
2. Click the **+** icon in the top right corner
3. Select **New repository**
4. Fill in the details:
   - **Repository name**: Choose a name (e.g., `my-website` or `scorespace-site`)
   - **Description**: Optional description
   - **Public**: Make sure this is selected (required for free GitHub Pages)
   - **DO NOT** check "Add a README file" (we already have one)
5. Click **Create repository**
6. Keep this page open - you'll need the repository URL

## Step 2: Configure Your Site for GitHub Pages

Before pushing, you need to update the site configuration.

### Update `astro.config.mjs`

Open `astro.config.mjs` and update the `site` and `base` values:

```javascript
export default defineConfig({
  site: 'https://YOUR_USERNAME.github.io',
  base: '/YOUR_REPO_NAME',
  output: 'static',
});
```

**Replace:**
- `YOUR_USERNAME` with your GitHub username (e.g., `kbook`)
- `YOUR_REPO_NAME` with your repository name (e.g., `my-website`)

**Example:**
```javascript
export default defineConfig({
  site: 'https://kbook.github.io',
  base: '/my-website',
  output: 'static',
});
```

**Note:** If your repository is named `YOUR_USERNAME.github.io`, you can set `base: '/'` instead.

## Step 3: Initialize Git and Push to GitHub

Open your terminal in the project folder and run these commands:

```bash
# Initialize a new git repository
git init

# Add all files to git
git add .

# Create your first commit
git commit -m "Initial commit"

# Rename the default branch to 'main'
git branch -M main

# Connect to your GitHub repository (replace with YOUR URL from Step 1)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Push your code to GitHub
git push -u origin main
```

**Replace** `YOUR_USERNAME` and `YOUR_REPO_NAME` with your actual values.

### If You Get Authentication Errors

GitHub no longer accepts passwords. You'll need to either:

**Option A: Use HTTPS with a Personal Access Token**
1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token with `repo` scope
3. Use this token as your password when prompted

**Option B: Use SSH (recommended)**
1. [Generate an SSH key](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent)
2. [Add it to your GitHub account](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/adding-a-new-ssh-key-to-your-github-account)
3. Use the SSH URL instead:
   ```bash
   git remote set-url origin git@github.com:YOUR_USERNAME/YOUR_REPO_NAME.git
   ```

## Step 4: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** (gear icon in the top navigation)
3. In the left sidebar, click **Pages**
4. Under **Source**, select **GitHub Actions**
5. That's it! The workflow we've set up will handle the rest

## Step 5: Deploy!

The site will automatically deploy when you push to the `main` branch. To trigger a deployment:

1. Make any change to your code
2. Commit and push:
   ```bash
   git add .
   git commit -m "Update site"
   git push
   ```
3. Go to your repository → **Actions** tab to watch the deployment progress
4. Once complete, your site will be live at:
   ```
   https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/
   ```

## Step 6: View Your Live Site

After the GitHub Action completes (usually 1-2 minutes), visit:

```
https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/
```

## Troubleshooting

### "Page not found" error
- Make sure the `base` in `astro.config.mjs` matches your repository name exactly
- Wait a few minutes after deployment for changes to propagate
- Check the Actions tab for any build errors

### Styles or links are broken
- Verify that `site` and `base` are configured correctly in `astro.config.mjs`
- Make sure you're using `import.meta.env.BASE_URL` for internal links (this is already set up)

### Build is failing
- Check the Actions tab for error messages
- Make sure all dependencies are listed in `package.json`
- Verify there are no TypeScript errors by running `npm run build` locally

### Changes aren't showing up
- Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
- Clear your browser cache
- Wait a few minutes for CDN cache to update

## Making Updates

To update your site after the initial deployment:

```bash
# Make your changes to the files

# Stage your changes
git add .

# Commit with a message
git commit -m "Describe what you changed"

# Push to GitHub (this triggers automatic deployment)
git push
```

Your changes will be live within a few minutes!

---

## Custom Domain (Optional)

If you have your own domain name:

1. Go to repository **Settings** → **Pages**
2. Under **Custom domain**, enter your domain (e.g., `www.example.com`)
3. Click **Save**
4. Configure your domain's DNS:
   - For apex domains (`example.com`): Add A records pointing to GitHub's IPs
   - For subdomains (`www.example.com`): Add a CNAME record pointing to `YOUR_USERNAME.github.io`

See [GitHub's documentation](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site) for detailed instructions.

---

Built with [Astro](https://astro.build) v5
