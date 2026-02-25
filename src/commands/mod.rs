use anyhow::Result;
use serenity::all::{CommandInteraction, Context, CreateCommand};
use sqlx::PgPool;

use crate::config::EmojiConfig;

include!("./mod_gen.rs");

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum CommandCategory {
    Moderation,
    Utils,
    Gestion,
}

impl CommandCategory {
    pub fn emoji(&self) -> &'static str {
        match self {
            Self::Utils => "🌐",
            Self::Moderation => "🛡️",
            Self::Gestion => "👑",
        }
    }

    pub fn name(&self) -> &'static str {
        match self {
            Self::Utils => "Utils",
            Self::Moderation => "Moderation",
            Self::Gestion => "Gestion",
        }
    }
}

#[serenity::async_trait]
pub trait SlashCommand: Send + Sync {
    fn name(&self) -> &'static str;
    fn description(&self) -> &'static str;
    fn category(&self) -> &'static CommandCategory;

    fn register(&self) -> CreateCommand;

    async fn run(
        &self,
        ctx: &Context,
        command: &CommandInteraction,
        database: &PgPool,
        _emoji: &EmojiConfig,
    ) -> Result<()>;
}

pub struct CommandEntry {
    pub create: fn() -> Box<dyn SlashCommand>,
}

inventory::collect!(CommandEntry);

pub fn import() -> Vec<Box<dyn SlashCommand>> {
    inventory::iter::<CommandEntry>
        .into_iter()
        .map(|entry| (entry.create)())
        .collect()
}
