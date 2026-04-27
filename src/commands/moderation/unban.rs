use crate::commands::{CommandCategory, CommandEntry, SlashCommand};
use crate::config::EmojiConfig;
use crate::database::guild;
use crate::models::DbGuild;
use crate::utils::format::format_sanction_reason;

use serenity::all::{
    Ban, CommandInteraction, CommandOptionType, Context, CreateActionRow, CreateCommand, CreateCommandOption, CreateEmbed, CreateEmbedFooter, CreateInteractionResponse, CreateInteractionResponseMessage, CreateSelectMenu, CreateSelectMenuKind, CreateSelectMenuOption, EditInteractionResponse, GetMessages, Guild, GuildId, InteractionContext, Member, Message, MessageId, Permissions, Role, User, UserId
};
use sqlx::PgPool;
use tracing::{debug, info};
use anyhow::Result;

pub struct Unban;

#[serenity::async_trait]
impl SlashCommand for Unban {
    fn name(&self) -> &'static str {
        "unban"
    }

    fn description(&self) -> &'static str {
        "Unban the user provided"
    }

    fn category(&self) -> &'static CommandCategory {
        &CommandCategory::Moderation
    }

    fn register(&self) -> CreateCommand {
        info!("\t✅ | {}", self.name());
        let mut options: Vec<CreateCommandOption> = Vec::new();

        let target: CreateCommandOption = CreateCommandOption::new(CommandOptionType::String, "user_id", "The id of user to unban")
            .required(true);
        options.push(target);

        CreateCommand::new(self.name())
            .description(self.description())
            .default_member_permissions(Permissions::BAN_MEMBERS)
            .set_options(options)
            .contexts(vec![
                InteractionContext::Guild,
            ])
    }

    async fn run(
        &self,
        ctx: &Context,
        command: &CommandInteraction,
        _database: &PgPool,
        _emoji: &EmojiConfig,
    ) -> Result<()> {
        debug!("{} command called", self.name());
        let guild_id: GuildId = command.guild_id.ok_or(anyhow::anyhow!("Unban command executed in DM"))?;
        let target_id: UserId = command.data.options.iter()
            .find(|opt| opt.name == "user_id")
            .and_then(|opt| opt.value.as_str())
            .and_then(|s| s.parse::<u64>().ok())
            .map(UserId::new)
            .ok_or_else(|| anyhow::anyhow!("ID utilisateur invalide"))?;

        let guild_db: Option<DbGuild> = guild::get(_database, &guild_id.to_string()).await.map_err(|_e| serenity::Error::Other("Database error guild on unban command"))?;
        let footer: &String = &guild_db.as_ref().unwrap().footer;
        let color: u32 = guild_db.as_ref().unwrap().color as u32;

        let bans: Vec<Ban> = guild_id.bans(&ctx.http, None, Some(25)).await?;
        let mut choices: Vec<(String, String)> = Vec::new();
        for ban in bans {
            choices.push((ban.user.id.to_string(), ban.user.name));
        }

        if choices.is_empty() {
            let message: CreateInteractionResponseMessage = CreateInteractionResponseMessage::new()
                .content(format!("{} | No banned in the guild", _emoji.answer.error))
                .ephemeral(true);
            let response: CreateInteractionResponse = CreateInteractionResponse::Message(message);
            command.create_response(&ctx.http, response).await?;
            return Ok(());
        }

        let id_str: String = target_id.to_string();
        match choices.iter().find(|(first, _)| first == &id_str) {
            Some((_, second)) => {
                guild_id.unban(&ctx.http, target_id).await?;
                let message: CreateInteractionResponseMessage = CreateInteractionResponseMessage::new()
                    .content(format!("{} | **{}** is now unban", _emoji.answer.yes, second))
                    .ephemeral(true);
                let response: CreateInteractionResponse = CreateInteractionResponse::Message(message);
                command.create_response(&ctx.http, response).await?;
            }
            None => {
                let message: CreateInteractionResponseMessage = CreateInteractionResponseMessage::new()
                    .content(format!("{} | **{}** is not ban from this guild", _emoji.answer.no, id_str))
                    .ephemeral(true);
                let response: CreateInteractionResponse = CreateInteractionResponse::Message(message);
            }
        }
        Ok(())
    }
}

inventory::submit! {
    CommandEntry { create: || Box::new(Unban) }
}
