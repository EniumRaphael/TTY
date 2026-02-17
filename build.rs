use std::{
    collections::HashMap,
    fs::{self, DirEntry, ReadDir, write},
    io,
    path::{Path, PathBuf},
};

const MOD_PREFIX: &str = "pub mod ";
const MOD_FILE: &str = "/mod_gen.rs";

/// Clear the string name to take the mod name
///
/// * `s` - the name of the file
/// * `n` - len of the name
fn clear_name(s: &mut String, n: usize) -> String {
    if n >= s.len() {
        s.clear();
    } else {
        s.drain(..n);
    }
    s.trim_end_matches(".rs").to_string()
}

/// Search all rust files in the subfolder
///
/// * `dir` - the subfolder
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

fn nested(name: &str, origin: &str) -> io::Result<()> {
    let path: String = if origin.ends_with('/') {
        origin.to_string()
    } else {
        format!("{}/", origin)
    };
    let root: &Path = Path::new(&path);
    let dir: HashMap<String, Vec<String>> = list_srcs(root);
    let mut modules: String = String::new();
    println!("'{}'", name);
    for (subdir, events) in &dir {
        println!("'{}'", subdir);
        let mut submodules: String = String::new();
        for event in events {
            submodules.push_str(&format!("{}{};\n", MOD_PREFIX, event));
            println!("\t'{}'", event);
        }
        write(format!("{}{}{}", path, subdir, MOD_FILE), submodules)?;
        modules.push_str(&format!("{}{};\n", MOD_PREFIX, subdir));
    }
    write(format!("{}{}", path, MOD_FILE), modules)?;

    Ok(())
}

fn flat(name:&str, dir: &str) -> io::Result<()> {
    let root: &Path = Path::new(dir);
    let sources: Vec<String> = read_dir(root);
    let mut modules: String = String::new();
    println!("'{}'", name);
    for source in sources {
        modules.push_str(&format!("{}{};\n", MOD_PREFIX, source));
        println!("\t'{}'", source);
    }
    write(format!("{}{}", dir, MOD_FILE), modules)?;

    Ok(())
}

fn main() {
    if let Err(e) = nested("commands", "./src/commands") {
        panic!("Error when writing the commands \n{}", e)
    }
    if let Err(e) = nested("events", "./src/events") {
        panic!("Error when writing the events:\n{}", e)
    }
    if let Err(e) = flat("models", "./src/models") {
        panic!("Error when writing the models:\n{}", e)
    }
    if let Err(e) = flat("database", "./src/database") {
        panic!("Error when writing the database_helper:\n{}", e)
    }
    if let Err(e) = flat("utils", "./src/utils") {
        panic!("Error when writing the utils:\n{}", e)
    }
    if let Err(e) = flat("config", "./src/config") {
        panic!("Error when writing the config:\n{}", e)
    }
}
