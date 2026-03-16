use crate::commands::{CommandCategory, CommandEntry, SlashCommand};
use crate::config::EmojiConfig;
use crate::utils::format::format_sanction_reason;

use serenity::all::{
    CommandInteraction, CommandOptionType, Context, CreateCommand, CreateCommandOption, CreateInteractionResponse, CreateInteractionResponseMessage, EditInteractionResponse, GetMessages, Guild, GuildId, InteractionContext, Member, Message, MessageId, Permissions, Role, User, UserId
};
use sqlx::PgPool;
use tracing::{debug, info};
use anyhow::Result;

pub struct Kick;

#[serenity::async_trait]
impl SlashCommand for Kick {
    fn name(&self) -> &'static str {
        "kick"
    }

    fn description(&self) -> &'static str {
        "Kick the user provided"
    }

    fn category(&self) -> &'static CommandCategory {
        &CommandCategory::Moderation
    }

    fn register(&self) -> CreateCommand {
        info!("\t✅ | {}", self.name());
        let mut options: Vec<CreateCommandOption> = Vec::new();

        let target: CreateCommandOption = CreateCommandOption::new(CommandOptionType::User, "user", "The user to kick")
            .required(true);
        options.push(target);

        let reason: CreateCommandOption = CreateCommandOption::new(CommandOptionType::String, "reason", "The reason to kick this user")
            .required(false);
        options.push(reason);

        CreateCommand::new(self.name())
            .description(self.description())
            .default_member_permissions(Permissions::KICK_MEMBERS)
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
        let target_id: UserId = command.data.options.iter()
            .find(|opt| opt.kind() == CommandOptionType::User)
            .and_then(|opt| opt.value.as_user_id())
            .ok_or_else(|| anyhow::anyhow!("Aucun utilisateur spécifié"))?;
        let target: User = command.data.resolved.users.get(&target_id)
            .ok_or_else(|| anyhow::anyhow!("Utilisateur introuvable"))?
            .clone();
        let reason_provided: Option<&str> = command.data.options.iter().find(|opt | opt.kind() == CommandOptionType::String).and_then(|opt| opt.value.as_str());
        let reason_formatted: String = format_sanction_reason("kick", reason_provided, &command.user.name);

        let guild_id: GuildId = command.guild_id.ok_or(anyhow::anyhow!("Kick command executed in DM"))?;
        let guild: Guild = ctx.cache.guild(guild_id)
            .ok_or_else(|| anyhow::anyhow!("Guild not found in cache"))?
            .clone();

        let target_member: Member = guild_id.member(&ctx.http, target_id).await?;
        let executor_member: Member = guild_id.member(&ctx.http, command.user.id).await?;
        let bot_id: UserId = ctx.cache.current_user().id;
        let bot_member: Member = guild_id.member(&ctx.http, bot_id).await?;

        if reason_formatted.len() > 512 {
            let message: CreateInteractionResponseMessage = CreateInteractionResponseMessage::new()
                .content(format!("{} | Reason too long (> 512 char)", _emoji.answer.error))
                .ephemeral(true);
            let response: CreateInteractionResponse = CreateInteractionResponse::Message(message);
            command.create_response(&ctx.http, response).await?;
            return Ok(());
        }
        let target_role: &Role = guild.member_highest_role(&target_member).unwrap();
        let executor_role: &Role = guild.member_highest_role(&executor_member).unwrap();
        let bot_role: &Role = guild.member_highest_role(&bot_member).unwrap();
        if target_role > executor_role || target_role > bot_role || target_id == guild.owner_id {
            let message: CreateInteractionResponseMessage = CreateInteractionResponseMessage::new()
                .content(format!("{} | You cannot kick this user because they are hierarchically above you", _emoji.answer.error))
                .ephemeral(true);
            let response: CreateInteractionResponse = CreateInteractionResponse::Message(message);
            command.create_response(&ctx.http, response).await?;
            return Ok(());
        }
        guild_id.kick_with_reason(&ctx.http, target.id, &reason_formatted).await?;
        let message: CreateInteractionResponseMessage = CreateInteractionResponseMessage::new()
            .content(format!("{} | {} is now kick", _emoji.answer.yes, target.name))
            .ephemeral(true);
        let response: CreateInteractionResponse = CreateInteractionResponse::Message(message);
        command.create_response(&ctx.http, response).await?;
        Ok(())
    }
}

inventory::submit! {
    CommandEntry { create: || Box::new(Kick) }
}
