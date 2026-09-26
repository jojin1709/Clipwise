use serde::{Deserialize, Serialize};
use std::process::Command;
#[cfg(debug_assertions)]
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize)]
pub struct ServiceStatus {
    pub node_available: bool,
    pub ffmpeg_available: bool,
    pub ollama_available: bool,
}

fn command_exists(program: &str, args: &[&str]) -> bool {
    Command::new(program).args(args).output().map(|x| x.status.success()).unwrap_or(false)
}

#[tauri::command]
fn dependency_status() -> ServiceStatus {
    ServiceStatus {
        node_available: command_exists("node", &["--version"]),
        ffmpeg_available: command_exists("ffmpeg", &["-version"]),
        ollama_available: command_exists("ollama", &["--version"]),
    }
}

#[tauri::command]
fn app_version() -> &'static str {
    "0.1.0"
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![dependency_status, app_version])
        .setup(|_app| {
            #[cfg(debug_assertions)]
            {
                let window = _app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Clipwise");
}
