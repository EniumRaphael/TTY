use std::sync::atomic::{AtomicU64, Ordering};

use serenity::all::{CommandInteraction, Context, CreateCommand};
use sqlx::PgPool;

use crate::config::EmojiConfig;

include!("./mod_gen.rs");

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum CommandCategory {
    Moderation,
    Utils,
}

impl CommandCategory {
    pub fn emoji(&self) -> &'static str {
        match self {
            Self::Utils => "🌐",
            Self::Moderation => "🛡️",
        }
    }

    pub fn name(&self) -> &'static str {
        match self {
            Self::Utils => "Utils",
            Self::Moderation => "Moderation",
        }
    }
}

#[serenity::async_trait]
pub trait SlashCommand: Send + Sync {
    fn name(&self) -> &'static str;
    fn description(&self) -> &'static str;
    fn category(&self) -> &'static CommandCategory;
    fn command_id_ref(&self) -> &AtomicU64;

    fn get_id(&self) -> u64 {
        self.command_id_ref().load(Ordering::Relaxed)
    }

    fn set_id(&self, id: u64) {
        self.command_id_ref().store(id, Ordering::Relaxed);
    }

    fn register(&self) -> CreateCommand;

    async fn run(
        &self,
        ctx: &Context,
        command: &CommandInteraction,
        database: &PgPool,
        _emoji: &EmojiConfig,
    ) -> Result<(), serenity::Error>;
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
