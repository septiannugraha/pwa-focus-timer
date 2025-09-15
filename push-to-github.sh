#!/bin/bash

# Add your GitHub repository as remote
git remote add origin https://github.com/septiannugraha/pwa-focus-timer.git

# Verify remote was added
git remote -v

# Push to GitHub
git branch -M main
git push -u origin main

echo "✅ Pushed to GitHub successfully!"
echo "View at: https://github.com/septiannugraha/pwa-focus-timer"