# GitHub Pages Setup Instructions

To fix the GitHub Actions deployment error, you need to enable GitHub Pages in your repository settings.

## Step-by-Step Instructions

### 1. Enable GitHub Pages

1. Go to your repository on GitHub: `https://github.com/KAFKA2306/boardgamelist`
2. Click on **Settings** (in the repository menu)
3. Scroll down to **Pages** in the left sidebar
4. Under **Source**, select **"GitHub Actions"**
5. Click **Save**

### 2. Verify Workflow Permissions

1. In the same Settings page, go to **Actions** → **General**
2. Under **Workflow permissions**, ensure:
   - ✅ **"Read and write permissions"** is selected
   - ✅ **"Allow GitHub Actions to create and approve pull requests"** is checked

### 3. Re-run the Failed Action

1. Go to the **Actions** tab in your repository
2. Find the failed "Build and Deploy Documentation" workflow
3. Click **Re-run all jobs**

## Expected Results

After enabling GitHub Pages:
- ✅ The workflow should complete successfully  
- ✅ Your documentation will be available at: `https://kafka2306.github.io/boardgamelist`
- ✅ Future pushes to `main` will automatically update the site

## Troubleshooting

If you still get errors:

1. **"Not Found" error**: Make sure the repository is public or you have GitHub Pro/Team
2. **Permission errors**: Check that Actions have write permissions to Pages
3. **Build failures**: Check the Actions logs for specific MkDocs errors

## Alternative: Manual Deployment

If GitHub Actions continue to fail, you can deploy manually:

```bash
# Install MkDocs locally
pip install -r requirements.txt

# Build the site
mkdocs build

# Deploy to gh-pages branch
mkdocs gh-deploy
```

---

*This setup enables automatic deployment of your BoardGameList documentation to GitHub Pages.*