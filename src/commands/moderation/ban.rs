use crate::commands::{CommandCategory, CommandEntry, SlashCommand};
use crate::config::EmojiConfig;
use crate::utils::format::format_sanction_reason;

use serenity::all::{
    CommandInteraction, CommandOptionType, Context, CreateCommand, CreateCommandOption, CreateInteractionResponse, CreateInteractionResponseMessage, EditInteractionResponse, GetMessages, Guild, GuildId, InteractionContext, Member, Message, MessageId, Permissions, Role, User, UserId
};
use sqlx::PgPool;
use tracing::{debug, info};
use anyhow::Result;

pub struct Ban;

#[serenity::async_trait]
impl SlashCommand for Ban {
    fn name(&self) -> &'static str {
        "ban"
    }

    fn description(&self) -> &'static str {
        "Ban the user provided"
    }

    fn category(&self) -> &'static CommandCategory {
        &CommandCategory::Moderation
    }

    fn register(&self) -> CreateCommand {
        info!("\t✅ | {}", self.name());
        let mut options: Vec<CreateCommandOption> = Vec::new();

        let target: CreateCommandOption = CreateCommandOption::new(CommandOptionType::User, "user", "The user to ban")
            .required(true);
        options.push(target);

        let reason: CreateCommandOption = CreateCommandOption::new(CommandOptionType::String, "reason", "The reason to ban this user")
            .required(false);
        options.push(reason);

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
        let target_id: UserId = command.data.options.iter()
            .find(|opt| opt.kind() == CommandOptionType::User)
            .and_then(|opt| opt.value.as_user_id())
            .ok_or_else(|| anyhow::anyhow!("Aucun utilisateur spécifié"))?;
        let target: User = command.data.resolved.users.get(&target_id)
            .ok_or_else(|| anyhow::anyhow!("Utilisateur introuvable"))?
            .clone();
        let reason_provided: Option<&str> = command.data.options.iter().find(|opt | opt.kind() == CommandOptionType::String).and_then(|opt| opt.value.as_str());
        let reason_formatted: String = format_sanction_reason("ban", reason_provided, &command.user.name);

        let guild_id: GuildId = command.guild_id.ok_or(anyhow::anyhow!("Ban command executed in DM"))?;
        let guild: Guild = ctx.cache.guild(guild_id)
            .ok_or_else(|| anyhow::anyhow!("Guild not found in cache"))?
            .clone();

        let is_member: bool = guild.members.contains_key(&target_id);

        if is_member {
            let target_member: Member = guild_id.member(&ctx.http, target_id).await?;
            let executor_member: Member = guild_id.member(&ctx.http, command.user.id).await?;
            let bot_id: UserId = ctx.cache.current_user().id;
            let bot_member: Member = guild_id.member(&ctx.http, bot_id).await?;
            let target_role_pos: u16 = guild
                .member_highest_role(&target_member)
                .map(|r| r.position)
                .unwrap_or(0);
            let executor_role_pos: u16 = guild
                .member_highest_role(&executor_member)
                .map(|r| r.position)
                .unwrap_or(0);
            let bot_role_pos: u16 = guild
                .member_highest_role(&bot_member)
                .map(|r| r.position)
                .unwrap_or(0);
            if target_role_pos > executor_role_pos || target_id == guild.owner_id {
                let message: CreateInteractionResponseMessage = CreateInteractionResponseMessage::new()
                    .content(format!("{} | You cannot ban this user because they are hierarchically above you", _emoji.answer.no))
                    .ephemeral(true);
                let response: CreateInteractionResponse = CreateInteractionResponse::Message(message);
                command.create_response(&ctx.http, response).await?;
                return Ok(());
            }
            if target_role_pos > bot_role_pos {
                let message: CreateInteractionResponseMessage = CreateInteractionResponseMessage::new()
                    .content(format!("{} | You cannot ban this user because they are hierarchically above the bot", _emoji.answer.no))
                    .ephemeral(true);
                let response: CreateInteractionResponse = CreateInteractionResponse::Message(message);
                command.create_response(&ctx.http, response).await?;
                return Ok(());
            }
        }
        if reason_formatted.len() > 512 {
            let message: CreateInteractionResponseMessage = CreateInteractionResponseMessage::new()
                .content(format!("{} | Reason too long (> 512 char)", _emoji.answer.error))
                .ephemeral(true);
            let response: CreateInteractionResponse = CreateInteractionResponse::Message(message);
            command.create_response(&ctx.http, response).await?;
            return Ok(());
        }
        guild_id.ban_with_reason(&ctx.http, target.id, 0, &reason_formatted).await?;
        let message: CreateInteractionResponseMessage = CreateInteractionResponseMessage::new()
            .content(format!("{} | {} is now ban", _emoji.answer.yes, target.name))
            .ephemeral(true);
        let response: CreateInteractionResponse = CreateInteractionResponse::Message(message);
        command.create_response(&ctx.http, response).await?;
        Ok(())
    }
}

inventory::submit! {
    CommandEntry { create: || Box::new(Ban) }
}
