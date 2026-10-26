#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
fn main() {
    // First, while single-threaded: agents and tools inherit a PATH that finds `gh`, `node`…
    prismcode_lib::prepare_environment();
    if prismcode_lib::handle_usage_keychain_helper() {
        return;
    }
    // A cloud agent's bridge to its machine (docs/cloud-agents.md); exits when done.
    if prismcode_lib::handle_cloud_bridge() {
        return;
    }
    prismcode_lib::run()
}
