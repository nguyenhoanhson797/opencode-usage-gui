#!/bin/sh
# Installs the OpenCode Go Usage plugin for OpenCode Desktop.
#
# Downloads a released build into the global OpenCode plugin folder,
# `~/.config/opencode/plugins/opencode-usage-gui` (or the folder under
# XDG_CONFIG_HOME / OPENCODE_CONFIG_DIR). OpenCode discovers that folder
# automatically, so no opencode.json edit is needed.
#
#   curl -fsSL https://github.com/nguyenhoanhson797/opencode-usage-gui/releases/latest/download/install.sh | sh
#
# Pass a version to pin one:  sh install.sh 0.1.0
set -eu

repo="nguyenhoanhson797/opencode-usage-gui"
name="opencode-usage-gui"
version="${1:-latest}"

if [ "$version" = "latest" ]; then
  url="https://github.com/$repo/releases/latest/download/$name.tar.gz"
else
  case "$version" in
    v*) tag="$version" ;;
    *) tag="v$version" ;;
  esac
  url="https://github.com/$repo/releases/download/$tag/$name.tar.gz"
fi

config="${OPENCODE_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/opencode}"
plugins="$config/plugins"
target="$plugins/$name"
staged="$plugins/.$name.new"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

echo ""
echo "OpenCode Go Usage for OpenCode Desktop"
echo "  Downloading $url"

mkdir -p "$plugins"
curl -fsSL "$url" | tar -xz -C "$tmp"

if [ ! -f "$tmp/$name/dist/gui-experimental.cjs" ] || [ ! -f "$tmp/$name/package.json" ]; then
  echo "The download is not a built plugin (dist/gui-experimental.cjs is missing)." >&2
  exit 1
fi

echo "  Installing to $target"
rm -rf "$staged"
mv "$tmp/$name" "$staged"
rm -rf "$target"
mv "$staged" "$target"

installed="$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' "$target/package.json" | head -n 1)"

echo ""
echo "Installed $name $installed"
echo ""
echo "  1. Open OpenCode Desktop (reopen it if it was running)."
echo "  2. Settings > Extensions > Plugins lists 'usage-desktop'."
echo "  3. Open a session and use the Usage tab, the chip, or /usage."
echo ""
echo "No config edit: OpenCode loads $plugins automatically."
echo "Remove later with: rm -rf $target"
