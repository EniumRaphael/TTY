mod commands;
mod events;

use events::Bot;
use serenity::all::*;
use std::env;

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    let token: String =
        env::var("DISCORD_TOKEN").expect("❌ | DISCORD_TOKEN missing (check the env file)");

    let intents: GatewayIntents = GatewayIntents::default();

    let bot: Bot = Bot {
        commands: commands::import(),
        events: events::import(),
    };

    let mut client: Client = Client::builder(&token, intents)
        .event_handler(bot)
        .await
        .expect("❌ | Error when loading bot");

    if let Err(why) = client.start().await {
        eprintln!("❌ Client error: {why:?}");
    }
}
