use crate::commands::{CommandCategory, CommandEntry, SlashCommand};
use crate::config::EmojiConfig;
use crate::utils::perm::is_owner;

use serenity::all::{
    ChannelId, CommandInteraction, CommandOptionType, Context, CreateCommand, CreateCommandOption,
    CreateInteractionResponse, CreateInteractionResponseMessage, EditChannel,
    EditInteractionResponse, GuildChannel, GuildId, InteractionContext, PermissionOverwrite,
    PermissionOverwriteType, Permissions, RoleId,
};
use sqlx::PgPool;
use tracing::{debug, info};
use anyhow::Result;

pub struct Say;

#[serenity::async_trait]
impl SlashCommand for Say {
    fn name(&self) -> &'static str {
        "say"
    }

    fn description(&self) -> &'static str {
        "The bot can speak to say whatever you want"
    }

    fn category(&self) -> &'static CommandCategory {
        &CommandCategory::Utils
    }

    fn register(&self) -> CreateCommand {
        info!("\t✅ | {}", self.name());
        let mut options: Vec<CreateCommandOption> = Vec::new();

        let message: CreateCommandOption = CreateCommandOption::new(CommandOptionType::String, "message", "The message the bot will say")
            .required(true);
        options.push(message);

        CreateCommand::new(self.name())
            .description(self.description())
            .set_options(options)
            .contexts(vec![InteractionContext::Guild])
    }

    async fn run(
        &self,
        ctx: &Context,
        command: &CommandInteraction,
        _database: &PgPool,
        _emoji: &EmojiConfig,
    ) -> Result<()> {
        debug!("{} command called", self.name());
        let _guild_id: GuildId = command.guild_id.ok_or(anyhow::anyhow!("Say command executed in DM"))?;

        if !is_owner(&_database, &command.user.id.to_string()).await? {
            let message = CreateInteractionResponseMessage::new()
                .content(format!("{} | This command is only for bot owner", _emoji.answer.no))
                .ephemeral(true);
            command.create_response(&ctx.http, CreateInteractionResponse::Message(message)).await?;
            return Ok(());
        }

        let message: Option<&str> = command.data.options.iter()
            .find(|opt| opt.kind() == CommandOptionType::String)
            .and_then(|opt| opt.value.as_str());

        if let Some(message) = message {
            command.channel_id.say(&ctx.http, message).await?;
        } else {
            let response: CreateInteractionResponseMessage = CreateInteractionResponseMessage::new()
                .content(format!("{} | Invalid message, cannot be send !", _emoji.answer.error))
                .ephemeral(true);
            command.create_response(&ctx.http, CreateInteractionResponse::Message(response)).await?;
            return Ok(());
        }
        let response: CreateInteractionResponseMessage = CreateInteractionResponseMessage::new()
            .content(format!("{} | Message sent!", _emoji.answer.yes))
            .ephemeral(true);
        command.create_response(&ctx.http, CreateInteractionResponse::Message(response)).await?;
        Ok(())
    }
}

inventory::submit! {
    CommandEntry { create: || Box::new(Say) }
}
