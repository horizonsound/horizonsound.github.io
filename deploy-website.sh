#!/usr/bin/env bash
set -euo pipefail

# deploy-website.sh
# Bulletproof website deploy to Render (main branch) with full backups.

RED="\033[0;31m"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
BLUE="\033[0;34m"
RESET="\033[0m"

echo -e "${BLUE}=== Horizon Sound Website Deploy ===${RESET}"

# 1. Ensure we're in website root
if [ ! -f "package.json" ] || [ ! -d "src" ]; then
  echo -e "${RED}Error: This script must be run from root/website (where package.json lives).${RESET}"
  exit 1
fi

# 2. Validate .env and PUBLIC_ENGINE_URL
if [ ! -f ".env" ]; then
  echo -e "${RED}Error: .env file not found in website root.${RESET}"
  exit 1
fi

ENGINE_URL=$(grep "^PUBLIC_ENGINE_URL=" .env | cut -d '=' -f2- || true)
if [ -z "$ENGINE_URL" ]; then
  echo -e "${RED}Error: PUBLIC_ENGINE_URL is not set in .env.${RESET}"
  exit 1
fi

echo -e "${BLUE}Checking engine health at ${ENGINE_URL}...${RESET}"
if ! curl -fsS "${ENGINE_URL}/artists" >/dev/null 2>&1 && \
   ! curl -fsS "${ENGINE_URL}/health" >/dev/null 2>&1; then
  echo -e "${RED}Error: Engine is not reachable at ${ENGINE_URL}.${RESET}"
  exit 1
fi
echo -e "${GREEN}Engine reachable.${RESET}"

# 3. Validate git state
echo -e "${BLUE}Checking git status...${RESET}"
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo -e "${RED}Error: Not inside a git repository.${RESET}"
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo -e "${YELLOW}Warning: You have uncommitted changes.${RESET}"
  git status --short
  read -p "Continue anyway? (yes/no): " CONTINUE_DIRTY
  if [ "$CONTINUE_DIRTY" != "yes" ]; then
    echo -e "${RED}Aborting deploy.${RESET}"
    exit 1
  fi
fi

BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" != "main" ]; then
  echo -e "${YELLOW}Warning: Current branch is '${BRANCH}', not 'main'.${RESET}"
  read -p "Deploy from this branch anyway? (yes/no): " CONTINUE_BRANCH
  if [ "$CONTINUE_BRANCH" != "yes" ]; then
    echo -e "${RED}Aborting deploy.${RESET}"
    exit 1
  fi
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  echo -e "${RED}Error: 'origin' remote not configured.${RESET}"
  exit 1
fi

# 4. Create backups (tag, branch, tarball)
TIMESTAMP=$(date +"%Y-%m-%d-%H-%M")
TAG_NAME="backup-website-${TIMESTAMP}"
BRANCH_NAME="backup/website-predeploy-${TIMESTAMP}"
REPO_ROOT="$(pwd)"
BACKUP_DIR="${REPO_ROOT}/backups"
TARBALL="${BACKUP_DIR}/website-${TIMESTAMP}.tar.gz"

echo -e "${BLUE}Creating backups...${RESET}"

# Ensure backups dir
mkdir -p "$BACKUP_DIR"

# Git tag
git tag "$TAG_NAME"
echo -e "${GREEN}Created git tag: ${TAG_NAME}${RESET}"

# Git branch
git branch "$BRANCH_NAME"
echo -e "${GREEN}Created git branch: ${BRANCH_NAME}${RESET}"

# Tarball (website directory)
cd ..
tar --exclude="node_modules" --exclude="backups" -czf "$TARBALL" -C "$REPO_ROOT" .
cd website
echo -e "${GREEN}Created tarball backup: ${TARBALL}${RESET}"

# 5. Install & build
echo -e "${BLUE}Running npm install...${RESET}"
npm install

echo -e "${BLUE}Running npm run build...${RESET}"
npm run build

if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
  echo -e "${RED}Error: Build did not produce dist/index.html.${RESET}"
  exit 1
fi

FILE_COUNT=$(find dist -type f | wc -l | tr -d ' ')
echo -e "${GREEN}Build successful. dist contains ${FILE_COUNT} files.${RESET}"

# 6. Final confirmation
COMMIT_HASH=$(git rev-parse --short HEAD)
echo
echo -e "${BLUE}=== Deploy Summary ===${RESET}"
echo -e " Branch:        ${YELLOW}${BRANCH}${RESET}"
echo -e " Commit:        ${YELLOW}${COMMIT_HASH}${RESET}"
echo -e " Engine URL:    ${YELLOW}${ENGINE_URL}${RESET}"
echo -e " Git tag:       ${YELLOW}${TAG_NAME}${RESET}"
echo -e " Backup branch: ${YELLOW}${BRANCH_NAME}${RESET}"
echo -e " Tarball:       ${YELLOW}${TARBALL}${RESET}"
echo -e " Dist files:    ${YELLOW}${FILE_COUNT}${RESET}"
echo
echo -e "${YELLOW}This will deploy the WEBSITE ONLY to Render (service: horizonsound-platform, branch: main).${RESET}"
echo -e "${YELLOW}Engine and Admin will NOT be deployed or modified.${RESET}"
read -p "Proceed with deploy to production? (yes/no): " CONFIRM_DEPLOY

if [ "$CONFIRM_DEPLOY" != "yes" ]; then
  echo -e "${RED}Deploy aborted by user.${RESET}"
  exit 0
fi

# 7. Deploy (git push to Render)
echo -e "${BLUE}Pushing to origin '${BRANCH}'...${RESET}"
git push origin "$BRANCH"

echo -e "${GREEN}Git push complete. Render will build and deploy the website.${RESET}"
echo
echo -e "${BLUE}=== Rollback Instructions ===${RESET}"
echo -e " If anything goes wrong, you can rollback with:"
echo -e "  1) Checkout backup branch:"
echo -e "     ${YELLOW}git checkout ${BRANCH_NAME}${RESET}"
echo -e "  2) Push it to main:"
echo -e "     ${YELLOW}git push origin ${BRANCH}${RESET}"
echo
echo -e " Or using the tag:"
echo -e "     ${YELLOW}git checkout ${TAG_NAME}${RESET}"
echo -e "     ${YELLOW}git push origin ${BRANCH}${RESET}"
echo
echo -e " Or restore from tarball:"
echo -e "     ${YELLOW}cd .. && rm -rf website && tar -xzf ${TARBALL}${RESET}"
echo
echo -e "${GREEN}Deploy script finished. Website migration to production initiated.${RESET}"
