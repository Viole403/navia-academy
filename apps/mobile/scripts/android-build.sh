#!/usr/bin/env bash
# Build the Android app under a hard CPU ceiling.
#
# Why a wrapper instead of a gradle flag: gradle has no CPU-percentage limit, and
# on this project the CPU is not even spent by gradle's own workers. React
# Native's native build fans out into NDK clang++ processes, and ninja sizes that
# fan-out from the core count, so an 8-core box reaches 100% and starts swapping
# or getting OOM-killed long before org.gradle.workers.max matters. A cgroup
# quota is the only ceiling that covers every one of those children at once,
# because the limit is inherited by the whole process tree.
#
# The RAM side is not here: it lives in ~/.gradle/gradle.properties, which
# survives `expo prebuild`, unlike anything written into apps/mobile/android/.
#
# Usage: ./scripts/android-build.sh [gradle args]
#   e.g. ./scripts/android-build.sh :app:assembleDebug
set -euo pipefail

cd "$(dirname "$0")/../android"

CPU_QUOTA="${ANDROID_BUILD_CPU_QUOTA:-80%}"

# --scope keeps the build attached to this terminal so its output and exit code
# stay visible, which is what you want from a build. --quiet suppresses systemd's
# own chatter, which is not the build's output.
if systemd-run --user --scope --quiet -p "CPUQuota=${CPU_QUOTA}" -- \
  ./gradlew "$@"; then
  exit 0
fi

# A machine without a systemd user session cannot get a cgroup. Say so plainly
# rather than silently running uncapped, because an uncapped build on a small box
# looks like a hang.
echo "warning: could not apply CPUQuota=${CPU_QUOTA}; running uncapped" >&2
exec ./gradlew "$@"
