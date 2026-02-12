use serenity::all::*;
use crate::commands::SlashCommand;
use crate::events::{BotEvent, EventEntry};

pub struct ReadyHandler;

#[serenity::async_trait]
impl BotEvent for ReadyHandler {
    fn event_type(&self) -> &'static str { "ready" }

    async fn on_ready(&self, ctx: &Context, ready: &Ready, commands: &[Box<dyn SlashCommand>]) {
        println!("TTY is now running as: '{}'", ready.user.name);

        let cmds: Vec<CreateCommand> = commands.iter().map(|c| c.register()).collect();
        Command::set_global_commands(&ctx.http, cmds)
            .await
            .expect("❌ | Cannot register commands");

        println!("\nTTY now running with {} commands loaded", commands.len());
    }
}

inventory::submit! {
    EventEntry { create: || Box::new(ReadyHandler) }
}
