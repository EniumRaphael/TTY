use std::sync::atomic::AtomicU64;

use crate::commands::{CommandCategory, CommandEntry, SlashCommand};
use crate::config::EmojiConfig;

use serenity::all::{
    CommandInteraction, CommandOption, CommandOptionType, Context, CreateCommand, CreateCommandOption, CreateInteractionResponse, CreateInteractionResponseMessage, EditInteractionResponse, GetMessages, InteractionContext, Message, MessageId, Permissions
};
use sqlx::PgPool;

pub struct Clear {
    pub command_id: AtomicU64,
}

impl Clear {
    pub fn new() -> Self {
        Self {
            command_id: AtomicU64::new(0),
        }
    }
}

#[serenity::async_trait]
impl SlashCommand for Clear {
    fn name(&self) -> &'static str {
        "clear"
    }

    fn description(&self) -> &'static str {
        "Clear X message (X given in the parameters)"
    }

    fn category(&self) -> &'static CommandCategory {
        &CommandCategory::Moderation
    }

    fn command_id_ref(&self) -> &AtomicU64 {
        &self.command_id
    }

    fn register(&self) -> CreateCommand {
        println!("\t✅ | {}", self.name());
        let mut options: Vec<CreateCommandOption> = Vec::new();

        let amount: CreateCommandOption = CreateCommandOption::new(CommandOptionType::Integer, "amount", "Amount of messages to clear")
            .min_int_value(1)
            .max_int_value(100)
            .required(true);

        options.push(amount);
        CreateCommand::new(self.name())
            .description(self.description())
            .default_member_permissions(Permissions::MANAGE_MESSAGES)
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
    ) -> Result<(), serenity::Error> {
        let amount: u8 = command.data.options.get(0).unwrap().value.as_i64().expect("REASON") as u8;
        let message: CreateInteractionResponseMessage = CreateInteractionResponseMessage::new()
            .content(format!("{} | Start to clear", _emoji.answer.loading))
            .ephemeral(true);
        let response: CreateInteractionResponse = CreateInteractionResponse::Message(message);
        command.create_response(&ctx.http, response).await?;

        let messages: Vec<Message> = command.channel_id
            .messages(&ctx.http, GetMessages::new().limit(amount))
            .await?;
        
        let count: usize = messages.len();
        
        if count == 0 {
            let edit_msg: EditInteractionResponse =
                EditInteractionResponse::new().content(format!("{} | Cannot delete messages", _emoji.answer.error));
            command.edit_response(&ctx.http, edit_msg).await?;
        } else {
            let ids: Vec<MessageId> = messages.iter().map(|m| m.id).collect();

            if count == 1 {
                command.channel_id.delete_message(&ctx.http, ids[0]).await?;
                let edit_msg: EditInteractionResponse =
                    EditInteractionResponse::new().content(format!("{} | Deleted the message", _emoji.answer.yes));
                command.edit_response(&ctx.http, edit_msg).await?;
            } else {
                command.channel_id.delete_messages(&ctx.http, &ids).await?;
                let edit_msg: EditInteractionResponse =
                    EditInteractionResponse::new().content(format!("{} | Deleted {} messages", _emoji.answer.yes, count));
                command.edit_response(&ctx.http, edit_msg).await?;
            }
        }
        Ok(())
    }
}

inventory::submit! {
    CommandEntry { create: || Box::new(Clear::new()) }
}
