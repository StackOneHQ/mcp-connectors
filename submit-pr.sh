#!/bin/bash

echo "🚀 AI Reality Check MCP Connector - PR Submission Script"
echo "========================================================"
echo ""

echo "📋 STEP 1: Fork the repository"
echo "Go to: https://github.com/StackOneHQ/mcp-connectors"
echo "Click the 'Fork' button in the top right"
echo ""

read -p "Enter your GitHub username: " GITHUB_USERNAME

echo ""
echo "📋 STEP 2: Updating remote and pushing..."
echo ""

# Update remote to point to your fork
git remote set-url origin https://github.com/$GITHUB_USERNAME/mcp-connectors.git

# Push the feature branch
git push -u origin feature/ai-reality-check-connector

echo ""
echo "✅ Successfully pushed to your fork!"
echo ""

echo "📋 STEP 3: Create Pull Request"
echo "Go to: https://github.com/$GITHUB_USERNAME/mcp-connectors"
echo "Click 'Compare & pull request' button"
echo ""

echo "🎯 PR Title:"
echo "feat: Add AI Reality Check MCP Connector - First ChatGPT Psychosis Prevention Tool"
echo ""

echo "📝 PR Description:"
echo "Copy the content from SUBMIT-PR.md file"
echo ""

echo "🔗 Direct PR URL:"
echo "https://github.com/StackOneHQ/mcp-connectors/compare/main...$GITHUB_USERNAME:feature/ai-reality-check-connector"
echo ""

echo "🏆 HACKATHON WINNER READY! 🎉"
echo "Your AI Reality Check connector is ready to change the world! 🌍✨"
