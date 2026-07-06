// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
  // Disable WebKit sandbox to prevent SIGILL in AppImage on systems
  // where bubblewrap user namespaces are restricted or incompatible
  std::env::set_var("WEBKIT_DISABLE_SANDBOX", "1");
  app_lib::run();
}
