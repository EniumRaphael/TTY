use std::time::Instant;

use serenity::all::{
    CommandInteraction, Context, CreateCommand, CreateInteractionResponse,
    CreateInteractionResponseMessage, EditInteractionResponse,
};

pub const COMMAND_NAME: &str = "ping";
pub const COMMAND_DESC: &str = "Show the discord API latency";

pub async fn run(ctx: &Context, command: &CommandInteraction) -> Result<(), serenity::Error> {
    let message: CreateInteractionResponseMessage = CreateInteractionResponseMessage::new()
        .content("🏓 | Pong!")
        .ephemeral(true);

    let response: CreateInteractionResponse = CreateInteractionResponse::Message(message);

    let start: Instant = Instant::now();
    command.create_response(&ctx.http, response).await?;
    let delta_time: u128 = start.elapsed().as_millis();

    let edit_msg: String = format!("Ping: **{}**ms", delta_time);
    let message: EditInteractionResponse = EditInteractionResponse::new().content(edit_msg);

    command.edit_response(&ctx.http, message).await?;

    Ok(())
}

pub fn register() -> CreateCommand {
    CreateCommand::new(COMMAND_NAME).description(COMMAND_DESC)
}
