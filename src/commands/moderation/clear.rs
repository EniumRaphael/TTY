use std::time::Instant;

use crate::commands::{CommandEntry, SlashCommand};

use serenity::all::{
    ChannelType, CommandInteraction, CommandOption, CommandOptionType, Context, CreateCommand, CreateCommandOption, CreateInteractionResponse, CreateInteractionResponseMessage, EditInteractionResponse, GetMessages, MessageId, Permissions
};
use sqlx::PgPool;

pub struct Clear;

#[serenity::async_trait]
impl SlashCommand for Clear {
    fn name(&self) -> &'static str {
        "clear"
    }

    fn description(&self) -> &'static str {
        "Clear X message (X given in the parameters)"
    }

    fn register(&self) -> CreateCommand {
        println!("\t✅ | {}", self.name());
        let mut options: Vec<CreateCommandOption> = Vec::new();

        let mut amount: CreateCommandOption = CreateCommandOption::new(CommandOptionType::Unknown((u8)), "amount", "Amount of messages to clear")
            .min_int_value(1)
            .max_int_value(100)
            .required(true);

        options.push(amount);
        CreateCommand::new(self.name())
            .description(self.description())
            .default_member_permissions(Permissions::MANAGE_MESSAGES)
            .set_options(options)
    }

    async fn run(
        &self,
        ctx: &Context,
        command: &CommandInteraction,
        _database: &PgPool,
    ) -> Result<(), serenity::Error> {
        let amount: u8 = command.data.options.get(0).unwrap().value.as_u8().expect("REASON");
        let message: CreateInteractionResponseMessage = CreateInteractionResponseMessage::new()
            .content("| Start to clear")
            .ephemeral(true);
        let response: CreateInteractionResponse = CreateInteractionResponse::Message(message);
        command.create_response(&ctx.http, response).await?;

        let builder: GetMessages = GetMessages::new().after(command.channel_id.limit(amount);

        let edit_msg: EditInteractionResponse =
            EditInteractionResponse::new().content(format!(": **{delta_time}**ms"));

        command.edit_response(&ctx.http, edit_msg).await?;

        Ok(())
    }
}

inventory::submit! {
    CommandEntry { create: || Box::new(Clear) }
}
