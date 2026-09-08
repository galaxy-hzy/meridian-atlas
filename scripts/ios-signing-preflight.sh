#!/usr/bin/env bash
set -euo pipefail
umask 077

readonly SCRIPT_NAME="$(basename "$0")"
readonly REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
readonly PROJECT_PATH="$REPO_ROOT/mobile/ios/App/App.xcodeproj"
readonly SCHEME="App"

TEAM_ID=""
BUNDLE_ID="io.github.galaxyhzy.meridianatlas"
MINIMUM_IOS="16.4"
ALLOW_PROVISIONING_UPDATES=0

usage() {
  cat <<EOF
Usage: scripts/$SCRIPT_NAME [options]

Check whether this Mac can archive a signed Meridian Atlas iPhone app.

Options:
  --team-id ID                    Apple Developer Team ID (10 letters/digits)
  --bundle-id ID                  Registered bundle ID
                                  (default: $BUNDLE_ID)
  --minimum-ios VERSION           Deployment target; must be 16.4 or newer
                                  (default: $MINIMUM_IOS)
  --allow-provisioning-updates    Let xcodebuild contact Apple to manage signing
  -h, --help                      Show this help

The script never reads a certificate password or stores Apple credentials.
EOF
}

die() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

version_at_least() {
  local actual="$1"
  local required="$2"
  local actual_major actual_minor required_major required_minor
  actual_major="${actual%%.*}"
  actual_minor="${actual#*.}"
  actual_minor="${actual_minor%%.*}"
  required_major="${required%%.*}"
  required_minor="${required#*.}"
  required_minor="${required_minor%%.*}"
  (( actual_major > required_major || (actual_major == required_major && actual_minor >= required_minor) ))
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --team-id)
      [[ $# -ge 2 ]] || die '--team-id requires a value'
      TEAM_ID="$2"
      shift 2
      ;;
    --bundle-id)
      [[ $# -ge 2 ]] || die '--bundle-id requires a value'
      BUNDLE_ID="$2"
      shift 2
      ;;
    --minimum-ios)
      [[ $# -ge 2 ]] || die '--minimum-ios requires a value'
      MINIMUM_IOS="$2"
      shift 2
      ;;
    --allow-provisioning-updates)
      ALLOW_PROVISIONING_UPDATES=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "unknown option: $1"
      ;;
  esac
done

[[ -z "$TEAM_ID" || "$TEAM_ID" =~ ^[A-Za-z0-9]{10}$ ]] || die 'Team ID must contain exactly 10 letters or digits'
[[ "$BUNDLE_ID" =~ ^[A-Za-z0-9][A-Za-z0-9.-]*[A-Za-z0-9]$ ]] || die 'bundle ID contains unsupported characters'
[[ "$MINIMUM_IOS" =~ ^[0-9]+([.][0-9]+){1,2}$ ]] || die 'minimum iOS must look like 16.4'
version_at_least "$MINIMUM_IOS" '16.4' || die 'this Tailwind CSS 4 app requires iOS 16.4 or newer unless its frontend is reworked and retested'

[[ "$(uname -s)" == "Darwin" ]] || die 'iPhone signing requires macOS with full Xcode installed'
[[ -d "$PROJECT_PATH" ]] || die "Xcode project not found: $PROJECT_PATH"

command -v xcode-select >/dev/null || die 'xcode-select is unavailable; install full Xcode'
command -v xcodebuild >/dev/null || die 'xcodebuild is unavailable; install full Xcode'
command -v xcrun >/dev/null || die 'xcrun is unavailable; install full Xcode'
command -v security >/dev/null || die 'the macOS security tool is unavailable'
command -v codesign >/dev/null || die 'codesign is unavailable'

if [[ -n "${DEVELOPER_DIR:-}" ]]; then
  DEVELOPER_DIR_PATH="$DEVELOPER_DIR"
else
  DEVELOPER_DIR_PATH="$(xcode-select -p 2>/dev/null || true)"
fi
DEVELOPER_DIR_PATH="${DEVELOPER_DIR_PATH%/}"
[[ "$DEVELOPER_DIR_PATH" == /*/Contents/Developer ]] || die "full Xcode is not selected (effective developer directory: ${DEVELOPER_DIR_PATH:-nothing}); set DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer or select it with sudo xcode-select -s /Applications/Xcode.app/Contents/Developer"

XCODE_VERSION_OUTPUT="$(xcodebuild -version 2>/dev/null)" || die 'xcodebuild cannot start; open Xcode once and finish required first-launch setup'
XCODE_VERSION="$(printf '%s\n' "$XCODE_VERSION_OUTPUT" | sed -n 's/^Xcode \([0-9][0-9.]*\)$/\1/p' | head -n 1)"
[[ -n "$XCODE_VERSION" ]] || die 'could not parse the installed Xcode version'
XCODE_MAJOR="${XCODE_VERSION%%.*}"
[[ "$XCODE_MAJOR" =~ ^[0-9]+$ ]] || die "unexpected Xcode version: $XCODE_VERSION"
(( XCODE_MAJOR >= 26 )) || die "Xcode 26 or newer is required; selected version is $XCODE_VERSION"

xcrun --sdk iphoneos --show-sdk-path >/dev/null 2>&1 || die 'the selected Xcode does not provide the iPhoneOS SDK'

if command -v node >/dev/null; then
  NODE_VERSION="$(node -p 'process.versions.node')"
  NODE_MAJOR="${NODE_VERSION%%.*}"
  (( NODE_MAJOR >= 24 )) || die "Node.js 24 or newer is required for mobile:sync; found $NODE_VERSION"
else
  die 'Node.js 24 or newer is required for mobile:sync'
fi
command -v npm >/dev/null || die 'npm is required for mobile:sync'

XCODE_ARGS=(
  -project "$PROJECT_PATH"
  -scheme "$SCHEME"
  -configuration Release
  -sdk iphoneos
  -destination 'generic/platform=iOS'
)
if [[ -n "$TEAM_ID" ]]; then
  XCODE_ARGS+=(
    "DEVELOPMENT_TEAM=$TEAM_ID"
    "PRODUCT_BUNDLE_IDENTIFIER=$BUNDLE_ID"
    "IPHONEOS_DEPLOYMENT_TARGET=$MINIMUM_IOS"
    CODE_SIGN_STYLE=Automatic
  )
fi
if (( ALLOW_PROVISIONING_UPDATES )); then
  XCODE_ARGS+=(-allowProvisioningUpdates)
fi

xcodebuild "${XCODE_ARGS[@]}" -showBuildSettings >/dev/null || die 'Xcode could not resolve the App Release build settings'

IDENTITY_SUMMARY="$(security find-identity -v -p codesigning 2>/dev/null || true)"
IDENTITY_COUNT="$(printf '%s\n' "$IDENTITY_SUMMARY" | awk '/valid identities found/{print $1}' | tail -n 1)"
IDENTITY_COUNT="${IDENTITY_COUNT:-0}"

printf 'Xcode: %s\n' "$XCODE_VERSION"
printf 'Developer directory: %s\n' "$DEVELOPER_DIR_PATH"
printf 'iPhoneOS SDK: %s\n' "$(xcrun --sdk iphoneos --show-sdk-version)"
printf 'Node.js: %s\n' "$NODE_VERSION"
printf 'Bundle ID: %s\n' "$BUNDLE_ID"
printf 'Minimum iOS for signed output: %s\n' "$MINIMUM_IOS"
printf 'Valid local code-signing identities: %s\n' "$IDENTITY_COUNT"

if [[ -z "$TEAM_ID" ]]; then
  printf 'Signing configuration was not resolved because --team-id was omitted.\n'
elif (( IDENTITY_COUNT == 0 )) && (( ! ALLOW_PROVISIONING_UPDATES )); then
  die 'no local code-signing identity is available; sign in to the Apple account in Xcode or rerun with --allow-provisioning-updates after the account holder authorizes it'
elif (( IDENTITY_COUNT == 0 )); then
  printf 'No local identity exists yet; archive may create/download a managed identity through the signed-in Xcode account.\n'
fi

printf 'Preflight passed. The archive step remains the authoritative signing check.\n'
