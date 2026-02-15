use std::{
    collections::HashMap,
    fs::{self, DirEntry, ReadDir, write},
    io,
    path::{Path, PathBuf},
};

const COMMAND_DIR: &str = "./src/commands/";
const EVENT_DIR: &str = "./src/events/";
const MODEL_DIR: &str = "./src/models";
const CONF_DIR: &str = "./src/config";
const DB_DIR: &str = "./src/database";
const UTILS_DIR: &str = "./src/utils";
const MOD_PREFIX: &str = "pub mod ";
const MOD_FILE: &str = "/mod_gen.rs";

fn clear_name(s: &mut String, n: usize) -> String {
    if n >= s.len() {
        s.clear();
    } else {
        s.drain(..n);
    }
    s.trim_end_matches(".rs").to_string()
}

/// @brief Search all rust files in the subfolder
/// @return All rust files
/// * `dir`: the subfolder
fn read_dir(dir: &Path) -> Vec<String> {
    let mut dir_content: Vec<String> = Vec::new();
    let len: usize = dir.to_string_lossy().len() + 1;
    for entry in fs::read_dir(dir).unwrap() {
        let entry: DirEntry = entry.unwrap();
        let pb: PathBuf = entry.path();
        if pb.is_file()
            && pb.to_string_lossy().ends_with(".rs")
            && !pb.to_string_lossy().ends_with("mod.rs")
            && !pb.to_string_lossy().ends_with("mod_gen.rs")
        {
            dir_content.push(clear_name(pb.to_string_lossy().to_mut(), len));
        }
    }
    dir_content
}

/// Search all the subfolder and read all the rust files
/// * `dir` - Path to search src
///
/// Return Map<key(subfoldername), filenames>
fn list_srcs(dir: &Path) -> HashMap<String, Vec<String>> {
    let mut to_ret: HashMap<String, Vec<String>> = HashMap::new();
    let root: ReadDir = fs::read_dir(dir).unwrap();
    for entry in root {
        let entry: DirEntry = entry.unwrap();
        let pb: PathBuf = entry.path();
        let filename: &str = &pb.to_string_lossy();
        let len: usize = filename.rfind('/').expect("") + 1;
        if pb.is_dir() {
            let subdir: Vec<String> = read_dir(pb.as_path());
            to_ret.insert(clear_name(pb.to_string_lossy().to_mut(), len), subdir);
        }
    }
    to_ret
}

fn commands() -> io::Result<()> {
    let root: &Path = Path::new(COMMAND_DIR);
    let dir: HashMap<String, Vec<String>> = list_srcs(root);
    let mut modules: String = String::new();
    for (subdir, commands) in &dir {
        println!("'{}'", subdir);
        let mut submodules: String = String::new();
        for command in commands {
            submodules = submodules + &String::from(MOD_PREFIX) + command + &String::from(";\n");
            println!("\t'{}'", command);
        }
        write(
            String::from(COMMAND_DIR) + subdir + &String::from(MOD_FILE),
            submodules,
        )?;
        modules = modules + &String::from(MOD_PREFIX) + subdir + &String::from(";\n");
    }
    write(String::from(COMMAND_DIR) + &String::from(MOD_FILE), modules)?;

    Ok(())
}

fn events() -> io::Result<()> {
    let root: &Path = Path::new(EVENT_DIR);
    let dir: HashMap<String, Vec<String>> = list_srcs(root);
    let mut modules: String = String::new();
    for (subdir, events) in &dir {
        println!("'{}'", subdir);
        let mut submodules: String = String::new();
        for event in events {
            submodules = submodules + &String::from(MOD_PREFIX) + event + &String::from(";\n");
            println!("\t'{}'", event);
        }
        write(
            String::from(EVENT_DIR) + subdir + &String::from(MOD_FILE),
            submodules,
        )?;
        modules = modules + &String::from(MOD_PREFIX) + subdir + &String::from(";\n");
    }
    write(String::from(EVENT_DIR) + &String::from(MOD_FILE), modules)?;

    Ok(())
}

fn models() -> io::Result<()> {
    let root: &Path = Path::new(MODEL_DIR);
    let sources: Vec<String> = read_dir(root);
    let mut modules: String = String::new();
    println!("'models'");
    for source in sources {
        modules = modules + &String::from(MOD_PREFIX) + &source + &String::from(";\n");
        println!("\t'{}'", source);
    }
    write(String::from(MODEL_DIR) + &String::from(MOD_FILE), modules)?;

    Ok(())
}

fn database_helper() -> io::Result<()> {
    let root: &Path = Path::new(DB_DIR);
    let sources: Vec<String> = read_dir(root);
    let mut modules: String = String::new();
    println!("'database_helper'");
    for source in sources {
        modules = modules + &String::from(MOD_PREFIX) + &source + &String::from(";\n");
        println!("\t'{}'", source);
    }
    write(String::from(DB_DIR) + &String::from(MOD_FILE), modules)?;

    Ok(())
}

fn utils() -> io::Result<()> {
    let root: &Path = Path::new(UTILS_DIR);
    let sources: Vec<String> = read_dir(root);
    let mut modules: String = String::new();
    println!("'utils'");
    for source in sources {
        modules = modules + &String::from(MOD_PREFIX) + &source + &String::from(";\n");
        println!("\t'{}'", source);
    }
    write(String::from(UTILS_DIR) + &String::from(MOD_FILE), modules)?;

    Ok(())
}

fn config() -> io::Result<()> {
    let root: &Path = Path::new(CONF_DIR);
    let sources: Vec<String> = read_dir(root);
    let mut modules: String = String::new();
    println!("'emoji'");
    for source in sources {
        modules = modules + &String::from(MOD_PREFIX) + &source + &String::from(";\n");
        println!("\t'{}'", source);
    }
    write(String::from(CONF_DIR) + &String::from(MOD_FILE), modules)?;

    Ok(())
}

fn main() {
    if let Err(e) = commands() {
        panic!("Error when writing the commands \n{}", e)
    }
    if let Err(e) = events() {
        panic!("Error when writing the events:\n{}", e)
    }
    if let Err(e) = models() {
        panic!("Error when writing the models:\n{}", e)
    }
    if let Err(e) = database_helper() {
        panic!("Error when writing the database_helper:\n{}", e)
    }
    if let Err(e) = utils() {
        panic!("Error when writing the database_helper:\n{}", e)
    }
    if let Err(e) = config() {
        panic!("Error when writing the database_helper:\n{}", e)
    }
}
