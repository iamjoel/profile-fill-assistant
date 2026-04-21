use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{Manager, State};

#[derive(Clone)]
struct AppState {
  db_path: PathBuf,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProfileDraft {
  full_name: String,
  headline: String,
  location: String,
  summary: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct StoredProfile {
  full_name: String,
  headline: String,
  location: String,
  summary: String,
  updated_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AppStateResponse {
  is_tauri: bool,
  storage_path: String,
  profile: StoredProfile,
}

fn open_database(db_path: &Path) -> rusqlite::Result<Connection> {
  Connection::open(db_path)
}

fn initialize_database(db_path: &Path) -> Result<(), Box<dyn std::error::Error>> {
  let connection = open_database(db_path)?;

  connection.execute_batch(
    r#"
      CREATE TABLE IF NOT EXISTS profiles (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        full_name TEXT NOT NULL DEFAULT '',
        headline TEXT NOT NULL DEFAULT '',
        location TEXT NOT NULL DEFAULT '',
        summary TEXT NOT NULL DEFAULT '',
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );

      INSERT OR IGNORE INTO profiles (id) VALUES (1);
    "#,
  )?;

  Ok(())
}

fn read_profile(db_path: &Path) -> rusqlite::Result<StoredProfile> {
  let connection = open_database(db_path)?;

  connection.query_row(
    r#"
      SELECT full_name, headline, location, summary, updated_at
      FROM profiles
      WHERE id = 1
    "#,
    [],
    |row| {
      Ok(StoredProfile {
        full_name: row.get(0)?,
        headline: row.get(1)?,
        location: row.get(2)?,
        summary: row.get(3)?,
        updated_at: row.get(4)?,
      })
    },
  )
}

fn write_profile(db_path: &Path, draft: ProfileDraft) -> Result<StoredProfile, Box<dyn std::error::Error>> {
  let connection = open_database(db_path)?;

  connection.execute(
    r#"
      UPDATE profiles
      SET
        full_name = ?1,
        headline = ?2,
        location = ?3,
        summary = ?4,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id = 1
    "#,
    params![
      draft.full_name,
      draft.headline,
      draft.location,
      draft.summary
    ],
  )?;

  Ok(read_profile(db_path)?)
}

#[tauri::command]
fn get_app_state(state: State<'_, AppState>) -> Result<AppStateResponse, String> {
  let profile = read_profile(&state.db_path).map_err(|error| error.to_string())?;

  Ok(AppStateResponse {
    is_tauri: true,
    storage_path: state.db_path.to_string_lossy().into_owned(),
    profile,
  })
}

#[tauri::command]
fn save_profile(state: State<'_, AppState>, draft: ProfileDraft) -> Result<StoredProfile, String> {
  write_profile(&state.db_path, draft).map_err(|error| error.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| -> Result<(), Box<dyn std::error::Error>> {
      let app_data_dir = app.path().app_data_dir()?;

      fs::create_dir_all(&app_data_dir)?;

      let db_path = app_data_dir.join("profile-fill-assistant.sqlite3");

      initialize_database(&db_path)?;
      app.manage(AppState { db_path });

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![get_app_state, save_profile])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
