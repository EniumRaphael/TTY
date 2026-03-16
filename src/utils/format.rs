pub fn format_sanction_reason(module_name:&str, reason: Option<&str>, executor: &str) -> String {
    match reason {
        Some(s) => format!("[TTY {}] {} by {}", module_name, s, executor),
        None => format!("[TTY {}] by {}", module_name, executor)
    }
}
