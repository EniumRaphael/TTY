use serenity::all::*;
use sqlx::PgPool;
use crate::commands::SlashCommand;
use crate::events::{BotEvent, EventEntry};

pub struct InteractionHandler;

#[serenity::async_trait]
impl BotEvent for InteractionHandler {
    fn event_type(&self) -> &'static str { "interaction_create" }

    async fn on_interaction_create(&self, ctx: &Context, interaction: &Interaction, commands: &[Box<dyn SlashCommand>], db: &PgPool) {
        let Interaction::Command(command) = interaction else { return };

        let name: &str = command.data.name.as_str();
        match commands.iter().find(|cmd| cmd.name() == name) {
            Some(cmd) => {
                if let Err(why) = cmd.run(ctx, command, db).await {
                    eprintln!("❌ | Error on {name}: {why:?}");
                }
            }
            None => eprintln!("⚠️ | Unable to fetch: /{name}"),
        }
    }
}

inventory::submit! {
    EventEntry { create: || Box::new(InteractionHandler) }
}
