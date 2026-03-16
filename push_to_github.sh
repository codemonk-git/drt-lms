#!/bin/bash

# GitHub Push Setup Script
# Usage: ./push_to_github.sh <your-github-username> <repo-name>

GITHUB_USER="${1:-}"
REPO_NAME="${2:-ang_exp}"

if [ -z "$GITHUB_USER" ]; then
    echo "❌ Error: GitHub username required"
    echo "Usage: ./push_to_github.sh <your-github-username> <repo-name>"
    echo "Example: ./push_to_github.sh john ang_exp"
    exit 1
fi

REPO_URL="https://github.com/${GITHUB_USER}/${REPO_NAME}.git"

echo "📦 GitHub Push Setup"
echo "===================="
echo "Repository URL: $REPO_URL"
echo ""

# Check if remote already exists
if git remote get-url origin &>/dev/null; then
    echo "❌ Remote 'origin' already exists!"
    echo "Current origin: $(git remote get-url origin)"
    echo ""
    echo "To update existing remote:"
    echo "  git remote set-url origin $REPO_URL"
    exit 1
fi

echo "✅ Adding remote..."
git remote add origin "$REPO_URL"

echo "✅ Renaming branch to 'main'..."
git branch -M main

echo "✅ Pushing to GitHub..."
git push -u origin main

echo ""
echo "✅ Success! Your repository is now on GitHub"
echo "View at: https://github.com/${GITHUB_USER}/${REPO_NAME}"
