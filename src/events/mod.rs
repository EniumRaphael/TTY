include!("./mod_gen.rs");

use serenity::all::*;
use crate::commands::SlashCommand;

pub struct Bot {
    pub commands: Vec<Box<dyn SlashCommand>>,
}

#[serenity::async_trait]
impl EventHandler for Bot {

    async fn ready(&self, ctx: Context, ready: Ready) {
        bot::ready::handle(&ctx, &ready, &self.commands).await;
    }

    async fn interaction_create(&self, ctx: Context, interaction: Interaction) {
        bot::interaction_create::handle(&ctx, &interaction, &self.commands).await;
    }
}
