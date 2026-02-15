use serde::Deserialize;
use std::fs;

#[derive(Debug, Deserialize, Clone)]
pub struct EmojiConfig {
    pub answer: Answer,
    pub badge: Badge,
    pub config: Config,
}

#[derive(Debug, Deserialize, Clone)]
pub struct Answer {
    pub loading: String,
    pub error: String,
    pub yes: String,
    pub no: String,
}

#[derive(Debug, Deserialize, Clone)]
pub struct Badge {
    pub dev: String,
    pub enium: String,
    pub buyer: String,
    pub owner: String,
    pub pwn: String,
}

#[derive(Debug, Deserialize, Clone)]
pub struct Config {
    pub enable: String,
    pub disable: String,
}

impl EmojiConfig {
    pub fn load() -> Result<Self, Box<dyn std::error::Error>> {
        let content: String = fs::read_to_string("emojis.toml")?;
        let config: EmojiConfig = toml::from_str(&content)?;
        Ok(config)
    }
}
