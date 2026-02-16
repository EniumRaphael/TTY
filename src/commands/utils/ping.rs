use std::{
    sync::atomic::{
        AtomicU64,
    },
    time::Instant,
};

use crate::{
    commands::{
        CommandCategory, CommandEntry, SlashCommand
    },
    config::EmojiConfig,
};

use serenity::all::{
    CommandInteraction, Context, CreateCommand, CreateInteractionResponse,
    CreateInteractionResponseMessage, EditInteractionResponse,
};
use sqlx::PgPool;
use tracing::info;

pub struct Ping {
    pub command_id: AtomicU64,
}

impl Ping {
    pub fn new() -> Self {
        Self {
            command_id: AtomicU64::new(0),
        }
    }
}

#[serenity::async_trait]
impl SlashCommand for Ping {
    fn name(&self) -> &'static str {
        "ping"
    }

    fn description(&self) -> &'static str {
        "Show the Discord API latency"
    }

    fn category(&self) -> &'static CommandCategory {
        &CommandCategory::Utils
    }

    fn command_id_ref(&self) -> &AtomicU64 {
        &self.command_id
    }

    fn register(&self) -> CreateCommand {
        info!("\t✅ | {}", self.name());
        CreateCommand::new(self.name()).description(self.description())
    }

    async fn run(
        &self,
        ctx: &Context,
        command: &CommandInteraction,
        _database: &PgPool,
        _emoji: &EmojiConfig,
    ) -> Result<(), serenity::Error> {
        let message: CreateInteractionResponseMessage = CreateInteractionResponseMessage::new()
            .content("🏓 | Pong!")
            .ephemeral(true);

        let response: CreateInteractionResponse = CreateInteractionResponse::Message(message);

        let start: Instant = Instant::now();
        command.create_response(&ctx.http, response).await?;
        let delta_time: u128 = start.elapsed().as_millis();

        let edit_msg: EditInteractionResponse =
            EditInteractionResponse::new().content(format!("{} | Ping: **{delta_time}**ms", _emoji.answer.yes));

        command.edit_response(&ctx.http, edit_msg).await?;

        Ok(())
    }
}

inventory::submit! {
    CommandEntry { create: || Box::new(Ping::new()) }
}
