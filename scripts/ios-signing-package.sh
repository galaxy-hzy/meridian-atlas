#!/usr/bin/env bash
set -euo pipefail
umask 077

readonly SCRIPT_NAME="$(basename "$0")"
readonly REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
readonly PROJECT_PATH="$REPO_ROOT/mobile/ios/App/App.xcodeproj"
readonly SCHEME="App"

TEAM_ID=""
BUNDLE_ID="io.github.galaxyhzy.meridianatlas"
METHOD="debugging"
BUILD_NUMBER=""
VERSION="0.1.0"
MINIMUM_IOS="16.4"
OUTPUT_ROOT="$REPO_ROOT/work/ios-signing"
ALLOW_PROVISIONING_UPDATES=0
ARCHIVE_ONLY=0
SKIP_SYNC=0

usage() {
  cat <<EOF
Usage: scripts/$SCRIPT_NAME --team-id ID --build-number NUMBER [options]

Build a signed iPhone archive and, by default, export a verified IPA.

Required:
  --team-id ID                    Apple Developer Team ID (10 letters/digits)
  --build-number NUMBER           CFBundleVersion, for example 1 or 1.2.3

Options:
  --bundle-id ID                  Registered bundle ID
                                  (default: $BUNDLE_ID)
  --version VERSION               Marketing version (default: $VERSION)
  --minimum-ios VERSION           Deployment target; must be 16.4 or newer
                                  (default: $MINIMUM_IOS)
  --method METHOD                 debugging, release-testing, or app-store-connect
                                  (default: $METHOD)
  --output-dir PATH               Parent directory for a new timestamped run
                                  (default: work/ios-signing)
  --allow-provisioning-updates    Let xcodebuild contact Apple to manage signing
  --archive-only                  Stop after verifying the signed .xcarchive
  --skip-sync                     Reuse already-synced native web assets
  -h, --help                      Show this help

Methods:
  debugging          IPA for registered test devices, signed for debugging
  release-testing    IPA for registered devices using release distribution
  app-store-connect  IPA prepared for a later App Store Connect upload

This script does not upload anything, create an App Store record, accept an
agreement, or store certificates, passwords, provisioning profiles, or account
credentials in the repository.
EOF
}

die() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
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
    --method)
      [[ $# -ge 2 ]] || die '--method requires a value'
      METHOD="$2"
      shift 2
      ;;
    --build-number)
      [[ $# -ge 2 ]] || die '--build-number requires a value'
      BUILD_NUMBER="$2"
      shift 2
      ;;
    --version)
      [[ $# -ge 2 ]] || die '--version requires a value'
      VERSION="$2"
      shift 2
      ;;
    --minimum-ios)
      [[ $# -ge 2 ]] || die '--minimum-ios requires a value'
      MINIMUM_IOS="$2"
      shift 2
      ;;
    --output-dir)
      [[ $# -ge 2 ]] || die '--output-dir requires a value'
      OUTPUT_ROOT="$2"
      shift 2
      ;;
    --allow-provisioning-updates)
      ALLOW_PROVISIONING_UPDATES=1
      shift
      ;;
    --archive-only)
      ARCHIVE_ONLY=1
      shift
      ;;
    --skip-sync)
      SKIP_SYNC=1
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

[[ "$TEAM_ID" =~ ^[A-Za-z0-9]{10}$ ]] || die '--team-id must contain exactly 10 letters or digits'
[[ "$BUILD_NUMBER" =~ ^[0-9]{1,4}([.][0-9]{1,2}){0,2}$ ]] || die '--build-number must contain one to three dot-separated integers (up to 4, 2, and 2 digits)'
[[ "$VERSION" =~ ^[0-9]+([.][0-9]+){1,2}$ ]] || die '--version must look like 0.1.0'
case "$METHOD" in
  debugging|release-testing|app-store-connect) ;;
  *) die '--method must be debugging, release-testing, or app-store-connect' ;;
esac

PREFLIGHT_ARGS=(
  --team-id "$TEAM_ID"
  --bundle-id "$BUNDLE_ID"
  --minimum-ios "$MINIMUM_IOS"
)
if (( ALLOW_PROVISIONING_UPDATES )); then
  PREFLIGHT_ARGS+=(--allow-provisioning-updates)
fi
"$REPO_ROOT/scripts/ios-signing-preflight.sh" "${PREFLIGHT_ARGS[@]}"

if (( ! SKIP_SYNC )); then
  [[ -d "$REPO_ROOT/node_modules" ]] || die 'node_modules is missing; run npm ci before packaging'
  (
    cd "$REPO_ROOT"
    npm run mobile:sync
  )
fi

XCODE_HELP="$(xcodebuild -help 2>&1 || true)"
printf '%s\n' "$XCODE_HELP" | grep -F -- "$METHOD" >/dev/null || die "installed Xcode does not advertise export method '$METHOD'; inspect xcodebuild -help and update the method for this Xcode release"

TIMESTAMP="$(date -u '+%Y%m%dT%H%M%SZ')"
RUN_DIR="$OUTPUT_ROOT/${VERSION}-${BUILD_NUMBER}-${METHOD}-${TIMESTAMP}"
[[ ! -e "$RUN_DIR" ]] || die "output already exists: $RUN_DIR"
mkdir -p "$RUN_DIR"

ARCHIVE_PATH="$RUN_DIR/Meridian-Atlas.xcarchive"
EXPORT_PATH="$RUN_DIR/export"
EXPORT_OPTIONS="$RUN_DIR/ExportOptions.plist"

XCODE_ARCHIVE_ARGS=(
  -project "$PROJECT_PATH"
  -scheme "$SCHEME"
  -configuration Release
  -sdk iphoneos
  -destination 'generic/platform=iOS'
  -archivePath "$ARCHIVE_PATH"
  "DEVELOPMENT_TEAM=$TEAM_ID"
  "PRODUCT_BUNDLE_IDENTIFIER=$BUNDLE_ID"
  "MARKETING_VERSION=$VERSION"
  "CURRENT_PROJECT_VERSION=$BUILD_NUMBER"
  "IPHONEOS_DEPLOYMENT_TARGET=$MINIMUM_IOS"
  CODE_SIGN_STYLE=Automatic
)
if (( ALLOW_PROVISIONING_UPDATES )); then
  XCODE_ARCHIVE_ARGS+=(-allowProvisioningUpdates)
fi

printf 'Creating signed archive at %s\n' "$ARCHIVE_PATH"
xcodebuild "${XCODE_ARCHIVE_ARGS[@]}" archive

shopt -s nullglob
ARCHIVE_APPS=("$ARCHIVE_PATH"/Products/Applications/*.app)
(( ${#ARCHIVE_APPS[@]} == 1 )) || die 'archive does not contain exactly one top-level iPhone app'
ARCHIVE_APP="${ARCHIVE_APPS[0]}"

codesign --verify --deep --strict --verbose=2 "$ARCHIVE_APP"
ARCHIVE_BUNDLE_ID="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$ARCHIVE_APP/Info.plist")"
ARCHIVE_VERSION="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$ARCHIVE_APP/Info.plist")"
ARCHIVE_BUILD="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' "$ARCHIVE_APP/Info.plist")"
ARCHIVE_MINIMUM_IOS="$(/usr/libexec/PlistBuddy -c 'Print :MinimumOSVersion' "$ARCHIVE_APP/Info.plist")"
[[ "$ARCHIVE_BUNDLE_ID" == "$BUNDLE_ID" ]] || die "archive bundle ID is $ARCHIVE_BUNDLE_ID, expected $BUNDLE_ID"
[[ "$ARCHIVE_VERSION" == "$VERSION" ]] || die "archive version is $ARCHIVE_VERSION, expected $VERSION"
[[ "$ARCHIVE_BUILD" == "$BUILD_NUMBER" ]] || die "archive build is $ARCHIVE_BUILD, expected $BUILD_NUMBER"
[[ "$ARCHIVE_MINIMUM_IOS" == "$MINIMUM_IOS" ]] || die "archive minimum iOS is $ARCHIVE_MINIMUM_IOS, expected $MINIMUM_IOS"
codesign -dv --verbose=4 "$ARCHIVE_APP" 2>&1 | grep -F -- "TeamIdentifier=$TEAM_ID" >/dev/null || die 'archive signature TeamIdentifier does not match --team-id'

printf 'Verified signed archive: %s\n' "$ARCHIVE_PATH"
if (( ARCHIVE_ONLY )); then
  printf 'Archive-only mode: no IPA was created.\n'
  exit 0
fi

plutil -create xml1 "$EXPORT_OPTIONS"
plutil -insert method -string "$METHOD" "$EXPORT_OPTIONS"
plutil -insert destination -string export "$EXPORT_OPTIONS"
plutil -insert teamID -string "$TEAM_ID" "$EXPORT_OPTIONS"
plutil -insert signingStyle -string automatic "$EXPORT_OPTIONS"
plutil -insert stripSwiftSymbols -bool YES "$EXPORT_OPTIONS"
if [[ "$METHOD" == 'app-store-connect' ]]; then
  plutil -insert uploadSymbols -bool YES "$EXPORT_OPTIONS"
fi
plutil -lint "$EXPORT_OPTIONS"

XCODE_EXPORT_ARGS=(
  -exportArchive
  -archivePath "$ARCHIVE_PATH"
  -exportPath "$EXPORT_PATH"
  -exportOptionsPlist "$EXPORT_OPTIONS"
)
if (( ALLOW_PROVISIONING_UPDATES )); then
  XCODE_EXPORT_ARGS+=(-allowProvisioningUpdates)
fi

printf 'Exporting signed IPA with method %s\n' "$METHOD"
xcodebuild "${XCODE_EXPORT_ARGS[@]}"

IPAS=("$EXPORT_PATH"/*.ipa)
(( ${#IPAS[@]} == 1 )) || die 'export did not create exactly one IPA'
IPA_PATH="${IPAS[0]}"

VERIFY_DIR="$(mktemp -d "${TMPDIR:-/tmp}/meridian-ios-verify.XXXXXX")"
cleanup() {
  [[ -n "${VERIFY_DIR:-}" && -d "$VERIFY_DIR" ]] && rm -rf "$VERIFY_DIR"
}
trap cleanup EXIT
unzip -q "$IPA_PATH" -d "$VERIFY_DIR"
IPA_APPS=("$VERIFY_DIR"/Payload/*.app)
(( ${#IPA_APPS[@]} == 1 )) || die 'IPA does not contain exactly one application'
IPA_APP="${IPA_APPS[0]}"

codesign --verify --deep --strict --verbose=2 "$IPA_APP"
IPA_BUNDLE_ID="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$IPA_APP/Info.plist")"
IPA_VERSION="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$IPA_APP/Info.plist")"
IPA_BUILD="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' "$IPA_APP/Info.plist")"
IPA_MINIMUM_IOS="$(/usr/libexec/PlistBuddy -c 'Print :MinimumOSVersion' "$IPA_APP/Info.plist")"
[[ "$IPA_BUNDLE_ID" == "$BUNDLE_ID" ]] || die "IPA bundle ID is $IPA_BUNDLE_ID, expected $BUNDLE_ID"
[[ "$IPA_VERSION" == "$VERSION" ]] || die "IPA version is $IPA_VERSION, expected $VERSION"
[[ "$IPA_BUILD" == "$BUILD_NUMBER" ]] || die "IPA build is $IPA_BUILD, expected $BUILD_NUMBER"
[[ "$IPA_MINIMUM_IOS" == "$MINIMUM_IOS" ]] || die "IPA minimum iOS is $IPA_MINIMUM_IOS, expected $MINIMUM_IOS"
codesign -dv --verbose=4 "$IPA_APP" 2>&1 | grep -F -- "TeamIdentifier=$TEAM_ID" >/dev/null || die 'IPA signature TeamIdentifier does not match --team-id'

shasum -a 256 "$IPA_PATH" > "$RUN_DIR/SHA256SUMS.txt"
printf 'Verified signed IPA: %s\n' "$IPA_PATH"
printf 'SHA-256: %s\n' "$(cut -d ' ' -f 1 "$RUN_DIR/SHA256SUMS.txt")"
printf 'No upload was performed.\n'
