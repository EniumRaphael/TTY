use crate::commands::{CommandCategory, CommandEntry, SlashCommand};
use crate::config::EmojiConfig;
use crate::utils::channel::clone_channel;
use crate::utils::perm::is_whitelist;


use serenity::all::{
    ChannelId, CommandInteraction, CommandOptionType, Context, CreateCommand, CreateCommandOption, CreateInteractionResponse, CreateInteractionResponseMessage, EditInteractionResponse, GetMessages, GuildChannel, GuildId, InteractionContext, Message, MessageId, Permissions
};
use sqlx::PgPool;
use tracing::{debug, info};
use anyhow::Result;

pub struct Nuke;

#[serenity::async_trait]
impl SlashCommand for Nuke {
    fn name(&self) -> &'static str {
        "nuke"
    }

    fn description(&self) -> &'static str {
        "Nuke X message (X given in the parameters)"
    }

    fn category(&self) -> &'static CommandCategory {
        &CommandCategory::Moderation
    }

    fn register(&self) -> CreateCommand {
        info!("\t✅ | {}", self.name());
        let mut options: Vec<CreateCommandOption> = Vec::new();

        let channel: CreateCommandOption = CreateCommandOption::new(CommandOptionType::Channel, "channel", "The channel to renew")
            .required(false);
        options.push(channel);

        let notify: CreateCommandOption = CreateCommandOption::new(CommandOptionType::Boolean, "notify", "Will I send a message after nuke the channel")
            .required(false);
        options.push(notify);

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
        let guild_id: GuildId = command.guild_id.ok_or(anyhow::anyhow!("Nuke command executed in DM"))?;

        if is_whitelist(&_database, &command.user.id.to_string(), &guild_id.to_string()).await? == false {
            let message: CreateInteractionResponseMessage = CreateInteractionResponseMessage::new()
                .content(format!("{} | This command is only for whitelisted user", _emoji.answer.no))
                .ephemeral(true);
            let response: CreateInteractionResponse = CreateInteractionResponse::Message(message);
            command.create_response(&ctx.http, response).await?;
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
        let guild_channel: GuildChannel = channel_id.to_channel(&ctx.http).await?.guild().ok_or_else(|| anyhow::anyhow!("Not a guild channel"))?;;

        let message: CreateInteractionResponseMessage = CreateInteractionResponseMessage::new()
            .content(format!("{} | Channel gonna be nuke", _emoji.answer.loading))
            .ephemeral(true);
        let response: CreateInteractionResponse = CreateInteractionResponse::Message(message);
        command.create_response(&ctx.http, response).await?;

        let new_channel: GuildChannel = clone_channel(&guild_channel, ctx, guild_id)
            .await?;

        channel_id.delete(&ctx.http).await?;

        if notify {
            new_channel.say(&ctx.http, format!("{} | This channel was nuked by {}", _emoji.answer.yes, command.user.name)).await?;
        }
        if channel_id != command.channel_id {
            let edit_msg: EditInteractionResponse = EditInteractionResponse::new()
                .content(format!("{} | Channel {} is now nuked", _emoji.answer.yes, new_channel.name));
            command.edit_response(&ctx.http, edit_msg).await?;
        }

        Ok(())
    }
}

inventory::submit! {
    CommandEntry { create: || Box::new(Nuke) }
}
