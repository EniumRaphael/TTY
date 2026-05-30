use crate::commands::{CommandCategory, CommandEntry, SlashCommand};
use crate::config::EmojiConfig;
use crate::utils::format::format_sanction_reason;
use crate::utils::perm::is_owner;
use crate::utils::roles::{check_permission_using_user};

use serenity::all::{
    CommandInteraction, CommandOptionType, Context, CreateCommand, CreateCommandOption, CreateInteractionResponse, CreateInteractionResponseMessage, EditInteractionResponse, GetMessages, Guild, GuildId, InteractionContext, Member, Mentionable, Message, MessageId, Permissions, Role, RoleId, User, UserId
};
use sqlx::PgPool;
use tracing::{debug, info};
use anyhow::Result;

pub struct Derank;

#[serenity::async_trait]
impl SlashCommand for Derank {
    fn name(&self) -> &'static str {
        "derank"
    }

    fn description(&self) -> &'static str {
        "deranking a people"
    }

    fn category(&self) -> &'static CommandCategory {
        &CommandCategory::Moderation
    }

    fn register(&self) -> CreateCommand {
        info!("\t✅ | {}", self.name());
        let mut options: Vec<CreateCommandOption> = Vec::new();

        let target: CreateCommandOption = CreateCommandOption::new(CommandOptionType::User, "user", "The user to derank")
            .required(true);
        options.push(target);

        CreateCommand::new(self.name())
            .description(self.description())
            .set_options(options)
            .default_member_permissions(Permissions::MANAGE_ROLES)
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
        let guild_id: GuildId = command.guild_id.ok_or(anyhow::anyhow!("Ban command executed in DM"))?;
        let guild: Guild = ctx.cache.guild(guild_id)
            .ok_or_else(|| anyhow::anyhow!("Guild not found in cache"))?
            .clone();

        if check_permission_using_user(ctx, _emoji, &guild, &target_id, command, "derank").await.unwrap_or(false) == false {
            return Ok(())
        }

        let target_member: Member = guild_id.member(&ctx.http, target_id).await?;
        let target_roles: Vec<RoleId> = target_member.roles.clone();

        let target_roles_number: usize = target_roles.len();
        if target_roles_number == 0 {
            let message: CreateInteractionResponseMessage = CreateInteractionResponseMessage::new()
                .content(format!("{} | Cannot remove {} to anybody.", _emoji.answer.error, target.mention()))
                .ephemeral(true);
            let response: CreateInteractionResponse = CreateInteractionResponse::Message(message);
            command.create_response(&ctx.http, response).await?;
            return Ok(());
        }
        let msg: &str = if target_roles_number == 1 {"**1** role"} else {&format!("**{}** role", target_roles_number)};

        let message: CreateInteractionResponseMessage = CreateInteractionResponseMessage::new()
            .content(format!("{} | {} gonna be removed to {}", _emoji.answer.loading, msg, target.mention()))
            .ephemeral(true);
        let response: CreateInteractionResponse = CreateInteractionResponse::Message(message);
        command.create_response(&ctx.http, response).await?;

        for role_id in target_roles {
            let role_tmp: Option<&Role> = guild.roles.get(&role_id);
            if let Some(role) = role_tmp {
                if role_id.get() == guild_id.get() {
                    continue;
                }
                else if role.managed == true {
                    continue;
                }
                else {
                    target_member.remove_role(&ctx.http, role_id).await?;
                }
            } else {
                let edit_msg: EditInteractionResponse = EditInteractionResponse::new()
                    .content(format!("{} | Cannot roles of {}.", _emoji.answer.error, target.mention()));
                command.edit_response(&ctx.http, edit_msg).await?;
                return Ok(());
            }
        }

        let edit_msg: EditInteractionResponse = EditInteractionResponse::new()
            .content(format!("{} | {} is now derank.", _emoji.answer.yes, target.mention()));
        command.edit_response(&ctx.http, edit_msg).await?;

        Ok(())
    }
}

inventory::submit! {
    CommandEntry { create: || Box::new(Derank) }
}
