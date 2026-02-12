use std::{
    collections::HashMap,
    fs::{
        self,
        DirEntry,
        ReadDir,
        write,
    },
    io,
    path::{
        Path,
        PathBuf
    }
};

const COMMAND_DIR: &str = "./src/commands/";
const EVENT_DIR: &str = "./src/events";
const MOD_PREFIX: &str= "pub mod ";

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
        if pb.is_file() && pb.to_string_lossy().ends_with(".rs") && !pb.to_string_lossy().ends_with("mod.rs") {
            dir_content.push(clear_name(pb.to_string_lossy().to_mut(), len));
        }
    }
    dir_content
}

/// @brief Search all the subfolder and read all the rust files
/// @return Map<key(subfoldername), filenames>
/// * `dir`: Path to search src
fn list_srcs(dir: &Path) -> HashMap<String, Vec<String>> {
    let mut to_ret: HashMap<String, Vec<String>> = HashMap::new();
    let root: ReadDir = fs::read_dir(dir).unwrap();
    for entry in root {
        let entry: DirEntry = entry.unwrap();
        let pb: PathBuf = entry.path();
        let filename: &str = &pb.to_string_lossy();
        let len: usize = filename.rfind('/').expect("") + 1;
        if  pb.is_dir() {
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
            submodules = String::from(MOD_PREFIX) + command + &String::from(";\n");
            println!("\t'{}'", command);
        }
        write(String::from(COMMAND_DIR) + subdir + &String::from("/mod.rs"), submodules)?;
        modules = modules + &String::from(MOD_PREFIX) + subdir + &String::from(";\n");
    }
    write(String::from(COMMAND_DIR) + &String::from("/mod.rs"), modules)?;

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
            submodules = String::from(MOD_PREFIX) + event + &String::from(";\n");
            println!("\t'{}'", event);
        }
        write(String::from(EVENT_DIR) + subdir + &String::from("/mod.rs"), submodules)?;
        modules = modules + &String::from(MOD_PREFIX) + subdir + &String::from(";\n");
    }
    write(String::from(EVENT_DIR) + &String::from("/mod.rs"), modules)?;

    Ok(())
}

fn main() {
    if let Err(e) = commands() {
        panic!("Error when writing the commands \n{}", e)
    }
    if let Err(e) = events() {
        panic!("Error when writing the events:\n{}", e)
    }
}
