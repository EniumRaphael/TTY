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

pub struct Unhide;

#[serenity::async_trait]
impl SlashCommand for Unhide {
    fn name(&self) -> &'static str {
        "unhide"
    }

    fn description(&self) -> &'static str {
        "Unhide the channel (everybody can see it now)"
    }

    fn category(&self) -> &'static CommandCategory {
        &CommandCategory::Moderation
    }

    fn register(&self) -> CreateCommand {
        info!("\t✅ | {}", self.name());
        let mut options: Vec<CreateCommandOption> = Vec::new();

        let channel: CreateCommandOption = CreateCommandOption::new(CommandOptionType::Channel, "channel", "The channel to unhide")
            .required(false);
        options.push(channel);

        let notify: CreateCommandOption = CreateCommandOption::new(CommandOptionType::Boolean, "notify", "Will I send a message after unhideing the channel")
            .required(false);
        options.push(notify);

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
        let _guild_id: GuildId = command.guild_id.ok_or(anyhow::anyhow!("Unhide command executed in DM"))?;

        if !is_owner(&_database, &command.user.id.to_string()).await? {
            let message = CreateInteractionResponseMessage::new()
                .content(format!("{} | This command is only for bot owner", _emoji.answer.no))
                .ephemeral(true);
            command.create_response(&ctx.http, CreateInteractionResponse::Message(message)).await?;
            return Ok(());
        }

        let channel_id: ChannelId = command.data.options.iter()
            .find(|opt| opt.kind() == CommandOptionType::Channel)
            .and_then(|opt| opt.value.as_channel_id())
            .unwrap_or(command.channel_id);

        let notify: bool = command.data.options.iter()
            .find(|opt| opt.kind() == CommandOptionType::Boolean)
            .and_then(|opt| opt.value.as_bool())
            .unwrap_or(true);

        let message = CreateInteractionResponseMessage::new()
            .content(format!("{} | Channel gonna be unhideed", _emoji.answer.loading))
            .ephemeral(true);
        command.create_response(&ctx.http, CreateInteractionResponse::Message(message)).await?;

        let channel: GuildChannel = channel_id.to_channel(&ctx.http).await?
            .guild()
            .ok_or_else(|| anyhow::anyhow!("Not a guild channel"))?;

        let everyone_role: RoleId = channel.guild_id.everyone_role();
        let mut overwrites: Vec<PermissionOverwrite> = channel.permission_overwrites.clone();

        if let Some(existing) = overwrites.iter_mut().find(|o| o.kind == PermissionOverwriteType::Role(everyone_role)) {
            existing.allow &= !Permissions::VIEW_CHANNEL;
            existing.deny &= !Permissions::VIEW_CHANNEL;
        } else {
            overwrites.push(PermissionOverwrite {
                deny: Permissions::empty(),
                allow: Permissions::empty(),
                kind: PermissionOverwriteType::Role(everyone_role),
            });
        }

        let builder = EditChannel::new().permissions(overwrites);
        channel_id.edit(&ctx.http, builder).await?;

        if notify {
            channel.say(&ctx.http, format!(
                "👀 | This channel was unhidden by {}",
                command.user.name,
            )).await?;
        }

        let edit_msg = EditInteractionResponse::new()
            .content(format!("{} | Channel {} is now visible", _emoji.answer.yes, channel.name));
        command.edit_response(&ctx.http, edit_msg).await?;

        Ok(())
    }
}

inventory::submit! {
    CommandEntry { create: || Box::new(Unhide) }
}
