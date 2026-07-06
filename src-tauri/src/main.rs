// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
  // Disable WebKit sandbox to prevent SIGILL in AppImage on systems
  // where bubblewrap user namespaces are restricted or incompatible
  std::env::set_var("WEBKIT_DISABLE_SANDBOX", "1");
  // Disable DMABUF renderer to prevent WebKitWebProcess crash on Linux
  // caused by GPU driver incompatibilities with DMA-BUF hardware acceleration
  std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
  app_lib::run();
}
