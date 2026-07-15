#!/usr/bin/env bash
# ──────────────────────────────────────────────
# Keploy Setup Script - MedConnect India
# ──────────────────────────────────────────────
# Usage:
#   bash scripts/keploy-setup.sh            # Full setup
#   bash scripts/keploy-setup.sh record     # Start recording
#   bash scripts/keploy-setup.sh test       # Run tests
#   bash scripts/keploy-setup.sh clean      # Clean artifacts
# ──────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info()  { echo -e "${BLUE}[INFO]${NC}  $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ─── Check prerequisites ───
check_prereqs() {
  log_info "Checking prerequisites..."

  # Check Node.js
  if ! command -v node &>/dev/null; then
    log_error "Node.js is not installed. Install Node.js >= 20."
    exit 1
  fi
  log_ok "Node.js $(node -v)"

  # Check pnpm
  if ! command -v pnpm &>/dev/null; then
    log_error "pnpm is not installed. Install pnpm >= 9: npm install -g pnpm"
    exit 1
  fi
  log_ok "pnpm $(pnpm -v)"

  # Check Docker
  if ! command -v docker &>/dev/null; then
    log_warn "Docker is not installed. Keploy recording without Docker may require Linux with eBPF."
  else
    log_ok "Docker $(docker --version)"
  fi

  # Check Keploy CLI
  if command -v keploy &>/dev/null; then
    log_ok "Keploy CLI $(keploy version 2>/dev/null || echo 'installed')"
  else
    log_warn "Keploy CLI not found."
    log_info "Installing Keploy CLI..."
    curl -fsSL https://keploy.io/ent/install.sh | bash
    log_ok "Keploy CLI installed"
  fi

  # Verify keploy.yml exists
  if [ ! -f "keploy.yml" ]; then
    log_warn "keploy.yml not found in project root."
  else
    log_ok "keploy.yml found"
  fi
}

# ─── Install dependencies ───
install_deps() {
  log_info "Installing project dependencies..."
  pnpm install
  pnpm --filter @medconnect/api db:generate
  pnpm --filter @medconnect/api build
  log_ok "Dependencies installed and project built"
}

# ─── Start dependencies (DB + Redis) ───
start_deps() {
  log_info "Starting PostgreSQL and Redis..."
  docker compose -f backend/docker-compose.yml up -d db cache
  log_info "Waiting for dependencies to be healthy..."
  sleep 5
  log_ok "Dependencies started"
}

# ─── Stop dependencies ───
stop_deps() {
  log_info "Stopping dependencies..."
  docker compose -f backend/docker-compose.yml down
  log_ok "Dependencies stopped"
}

# ─── Record API traffic ───
record_traffic() {
  log_info "Starting Keploy recording session..."
  log_info "Your API is being recorded. Make requests to http://localhost:3001/api/v1/"
  log_info "Press Ctrl+C to stop recording."
  echo ""
  sudo -E keploy record \
    -c "node backend/dist/main" \
    -p .keploy \
    --enable-obfuscation
  log_ok "Recording complete. Test cases saved in .keploy/tests/"
}

# ─── Run recorded tests ───
run_tests() {
  if [ ! -d ".keploy/tests" ] || [ -z "$(ls -A .keploy/tests 2>/dev/null)" ]; then
    log_warn "No recorded test suites found in .keploy/tests/"
    log_info "Run 'bash scripts/keploy-setup.sh record' first to record API traffic."
    exit 0
  fi

  log_info "Running Keploy regression tests..."
  sudo -E keploy test \
    -c "node backend/dist/main" \
    -p .keploy \
    --build-delay 10
  log_ok "Tests completed."
}

# ─── Run with Docker ───
docker_record() {
  log_info "Starting Docker-based recording..."
  start_deps
  sudo -E keploy record \
    -c "docker compose -f backend/docker-compose.yml up api" \
    -p .keploy \
    --container-name "medconnect-api" \
    --enable-obfuscation
  log_ok "Docker recording complete."
}

docker_test() {
  log_info "Starting Docker-based testing..."
  start_deps
  sudo -E keploy test \
    -c "docker compose -f backend/docker-compose.yml up api" \
    -p .keploy \
    --container-name "medconnect-api" \
    --build-delay 15
  log_ok "Docker tests completed."
}

# ─── Update test snapshots ───
update_tests() {
  log_info "Updating Keploy test snapshots..."
  sudo -E keploy test \
    -c "node backend/dist/main" \
    -p .keploy \
    --build-delay 10 \
    --update
  log_ok "Snapshots updated."
}

# ─── Clean ───
clean_artifacts() {
  log_info "Cleaning Keploy artifacts..."
  rm -rf .keploy/ keploy/ keploy-results/
  log_ok "Artifacts cleaned."
}

# ─── Full setup ───
full_setup() {
  echo ""
  echo -e "${BLUE}═══════════════════════════════════${NC}"
  echo -e "${BLUE}  Keploy Setup - MedConnect India  ${NC}"
  echo -e "${BLUE}═══════════════════════════════════${NC}"
  echo ""

  check_prereqs
  install_deps

  echo ""
  echo -e "${GREEN}✅ Keploy integration is ready!${NC}"
  echo ""
  echo "  Next steps:"
  echo "  1. Start dependencies:    docker compose -f backend/docker-compose.yml up -d db cache"
  echo "  2. Record traffic:        bash scripts/keploy-setup.sh record"
  echo "  3. Run tests:             bash scripts/keploy-setup.sh test"
  echo "  4. Docker mode:           bash scripts/keploy-setup.sh docker-record"
  echo ""
  echo "  Or use pnpm scripts:"
  echo "  - pnpm keploy:record     - Record API traffic"
  echo "  - pnpm keploy:test       - Run Keploy tests"
  echo "  - pnpm keploy:docker:record - Record with Docker"
  echo "  - pnpm keploy:docker:test   - Test with Docker"
  echo "  - pnpm keploy:update     - Update test snapshots"
  echo "  - pnpm keploy:clean      - Clean artifacts"
  echo ""
}

# ─── Main ───
main() {
  case "${1:-setup}" in
    setup|install)
      full_setup
      ;;
    record)
      check_prereqs
      record_traffic
      ;;
    test)
      check_prereqs
      start_deps
      run_tests
      stop_deps
      ;;
    docker-record)
      docker_record
      ;;
    docker-test)
      docker_test
      ;;
    update)
      check_prereqs
      update_tests
      ;;
    clean)
      clean_artifacts
      ;;
    *)
      echo "Usage: $0 {setup|record|test|docker-record|docker-test|update|clean}"
      echo ""
      echo "Commands:"
      echo "  setup         Full Keploy setup (default)"
      echo "  record        Record API traffic"
      echo "  test          Run recorded tests"
      echo "  docker-record Record with Docker"
      echo "  docker-test   Run tests with Docker"
      echo "  update        Update test snapshots"
      echo "  clean         Clean artifacts"
      exit 1
      ;;
  esac
}

main "$@"
