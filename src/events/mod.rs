include!("./mod_gen.rs");

use crate::commands::SlashCommand;
use serenity::all::*;
use sqlx::PgPool;

#[serenity::async_trait]
pub trait BotEvent: Send + Sync {
    fn event_type(&self) -> &'static str;

    async fn on_ready(&self, _ctx: &Context, _ready: &Ready, _commands: &[Box<dyn SlashCommand>], _db: &PgPool) {}
    async fn on_interaction_create(
        &self,
        _ctx: &Context,
        _interaction: &Interaction,
        _commands: &[Box<dyn SlashCommand>],
        _db: &PgPool,
    ) {
    }
    async fn on_message(&self, _ctx: &Context, _msg: &Message) {}
}

pub struct EventEntry {
    pub create: fn() -> Box<dyn BotEvent>,
}

inventory::collect!(EventEntry);

pub fn import() -> Vec<Box<dyn BotEvent>> {
    inventory::iter::<EventEntry>
        .into_iter()
        .map(|entry| (entry.create)())
        .collect()
}

pub struct Bot {
    pub commands: Vec<Box<dyn SlashCommand>>,
    pub events: Vec<Box<dyn BotEvent>>,
    pub database: PgPool,
}

#[serenity::async_trait]
impl EventHandler for Bot {
    async fn ready(&self, ctx: Context, ready: Ready) {
        for event in self.events.iter().filter(|e| e.event_type() == "ready") {
            event.on_ready(&ctx, &ready, &self.commands, &self.database).await;
        }
    }

    async fn interaction_create(&self, ctx: Context, interaction: Interaction) {
        for event in self
            .events
            .iter()
            .filter(|e| e.event_type() == "interaction_create")
        {
            event
                .on_interaction_create(&ctx, &interaction, &self.commands, &self.database)
                .await;
        }
    }

    async fn message(&self, ctx: Context, msg: Message) {
        for event in self.events.iter().filter(|e| e.event_type() == "message") {
            event.on_message(&ctx, &msg).await;
        }
    }
}
