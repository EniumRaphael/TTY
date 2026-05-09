use crate::commands::{CommandCategory, CommandEntry, SlashCommand};
use crate::config::EmojiConfig;
use crate::utils::format::format_sanction_reason;
use crate::utils::perm::is_owner;
use crate::utils::roles::get_members_with_role;

use serenity::all::{
    CommandInteraction, CommandOptionType, Context, CreateCommand, CreateCommandOption, CreateInteractionResponse, CreateInteractionResponseMessage, EditInteractionResponse, GetMessages, Guild, GuildId, InteractionContext, Member, Mentionable, Message, MessageId, Permissions, Role, RoleId, User, UserId
};
use sqlx::PgPool;
use tracing::{debug, info};
use anyhow::Result;

pub struct Ban;

#[serenity::async_trait]
impl SlashCommand for Ban {
    fn name(&self) -> &'static str {
        "massdelrank"
    }

    fn description(&self) -> &'static str {
        "Removing the role to all people"
    }

    fn category(&self) -> &'static CommandCategory {
        &CommandCategory::Moderation
    }

    fn register(&self) -> CreateCommand {
        info!("\t✅ | {}", self.name());
        let mut options: Vec<CreateCommandOption> = Vec::new();

        let target: CreateCommandOption = CreateCommandOption::new(CommandOptionType::Role, "role", "The role to delete to all people")
            .required(true);
        options.push(target);

        CreateCommand::new(self.name())
            .description(self.description())
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

        if is_owner(&_database, &command.user.id.to_string()).await? == false {
            let message: CreateInteractionResponseMessage = CreateInteractionResponseMessage::new()
                .content(format!("{} | This command is only for owner", _emoji.answer.no))
                .ephemeral(true);
            let response: CreateInteractionResponse = CreateInteractionResponse::Message(message);
            command.create_response(&ctx.http, response).await?;
            return Ok(());
        }

        
        let target_id: RoleId = command.data.options.iter()
            .find(|opt| opt.kind() == CommandOptionType::Role)
            .and_then(|opt| opt.value.as_role_id())
            .ok_or_else(|| anyhow::anyhow!("Aucun utilisateur spécifié"))?;
        let target: Role = command.data.resolved.roles.get(&target_id)
            .ok_or_else(|| anyhow::anyhow!("Utilisateur introuvable"))?
            .clone();
        let guild_id: GuildId = command.guild_id.ok_or(anyhow::anyhow!("Ban command executed in DM"))?;
        let guild: Guild = ctx.cache.guild(guild_id)
            .ok_or_else(|| anyhow::anyhow!("Guild not found in cache"))?
            .clone();

        let user_to_remove: Vec<Member> = get_members_with_role(&ctx, guild_id, target_id).await?;

        let user_size: usize = user_to_remove.len();
        let msg: &str = if user_size <= 1 {"**1** user"} else {&format!("**{}** users", user_size)};

        let message: CreateInteractionResponseMessage = CreateInteractionResponseMessage::new()
            .content(format!("{} | Role {} gonna be removed to {}", _emoji.answer.loading, target.mention(), msg))
            .ephemeral(true);
        let response: CreateInteractionResponse = CreateInteractionResponse::Message(message);
        command.create_response(&ctx.http, response).await?;

        for member in &user_to_remove {
            member.remove_role(&ctx.http, target_id).await?;
        }

        let edit_msg: EditInteractionResponse = EditInteractionResponse::new()
            .content(format!("{} | Role {} is removed from {} users", _emoji.answer.yes, target.mention(), user_size));
        command.edit_response(&ctx.http, edit_msg).await?;

        Ok(())
    }
}

inventory::submit! {
    CommandEntry { create: || Box::new(Ban) }
}
