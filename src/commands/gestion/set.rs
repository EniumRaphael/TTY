use crate::{
    commands::{
        CommandCategory, CommandEntry, SlashCommand
    },
    config::EmojiConfig, utils::perm::is_owner,
};

use serenity::all::{
    CommandDataOption, CommandDataOptionValue, CommandInteraction, CommandOption, CommandOptionType, Context, CreateAttachment, CreateCommand, CreateCommandOption, CreateInteractionResponse, CreateInteractionResponseMessage, EditInteractionResponse, EditProfile
};
use sqlx::PgPool;
use tracing::{debug, info};
use anyhow::Result;

pub struct Set;

async fn set_picture(slashcmd: &Set, ctx: &Context, cmd: &CommandInteraction, db: &PgPool, emoji: &EmojiConfig, subcmd: &CommandDataOption) -> Result<()> {
    let inner_options = match &subcmd.value {
        CommandDataOptionValue::SubCommand(opts) => opts,
        _ => return Err(anyhow::anyhow!("Expected a subcommand")),
    };

    let url = inner_options
    .iter()
    .find(|opt| opt.name == "link")
    .ok_or_else(|| anyhow::anyhow!("Option 'link' not found"))?
    .value
    .as_str()
    .ok_or_else(|| anyhow::anyhow!("Option 'link' is not a string"))?;
    
    let attachment: CreateAttachment = CreateAttachment::url(&ctx.http, &url)
        .await?;

    let builder: EditProfile = EditProfile::new().avatar(&attachment);
    ctx.http
        .get_current_user()
        .await?
        .edit(&ctx.http, builder)
        .await?;

     let message: CreateInteractionResponseMessage = CreateInteractionResponseMessage::new()
            .content(format!("{} | Avatar changed", emoji.answer.yes))
            .ephemeral(true);

     let response: CreateInteractionResponse = CreateInteractionResponse::Message(message);

     cmd.create_response(&ctx.http, response).await?;

    Ok(())
}

#[serenity::async_trait]
impl SlashCommand for Set {
    fn name(&self) -> &'static str {
        "set"
    }

    fn description(&self) -> &'static str {
        "Edit bot configuration"
    }

    fn category(&self) -> &'static CommandCategory {
        &CommandCategory::Gestion
    }

    fn register(&self) -> CreateCommand {
        let mut options: Vec<CreateCommandOption> = Vec::new();

        let link: CreateCommandOption = CreateCommandOption::new(CommandOptionType::String, "link", "The link to change this options")
            .required(true);

        let picture: CreateCommandOption = CreateCommandOption::new(CommandOptionType::SubCommand, "picture", "Set the new photo profile of the bot")
            .add_sub_option(link);
        options.push(picture);

        info!("\t✅ | {}", self.name());
        CreateCommand::new(self.name()).description(self.description())
            .set_options(options)
    } 

    async fn run(
        &self,
        ctx: &Context,
        command: &CommandInteraction,
        _database: &PgPool,
        _emoji: &EmojiConfig,
    ) -> Result<()> {
        debug!("Set command called");
        if !is_owner(_database, &command.user.id.to_string()).await? {
            let message: CreateInteractionResponseMessage = CreateInteractionResponseMessage::new()
                .content(format!("{} | This command is only for the owner", _emoji.answer.no))
                .ephemeral(true);

            let response: CreateInteractionResponse = CreateInteractionResponse::Message(message);

            command.create_response(&ctx.http, response).await?;
            Ok(())
        } else {
            let subcmd: &CommandDataOption = command.data.options.iter().find(|opt| opt.kind() == CommandOptionType::SubCommand).ok_or_else(|| anyhow::anyhow!("Subcommand not found"))?;
            let check_ret  = match subcmd.name.as_str() {
                "picture" => set_picture(self, ctx, command, _database, _emoji, subcmd).await,
                _ => Err(anyhow::anyhow!("Set subcommand cannot be found!"))
            };
            if check_ret.is_err() {
                let message: CreateInteractionResponseMessage = CreateInteractionResponseMessage::new()
                    .content(format!("{} | Error during command", _emoji.answer.error))
                    .ephemeral(true);

                let response: CreateInteractionResponse = CreateInteractionResponse::Message(message);

                command.create_response(&ctx.http, response).await?;
            }
            check_ret
        }
    }
}

inventory::submit! {
    CommandEntry { create: || Box::new(Set) }
}
