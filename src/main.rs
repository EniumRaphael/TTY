mod commands;
mod events;

use commands::all_commands;
use events::Bot;
use serenity::all::*;
use std::env;

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    let token: String =
        env::var("DISCORD_TOKEN").expect("❌ | DISCORD_TOKEN missing (check the env file)");

    let intents: GatewayIntents = GatewayIntents::empty();

    let bot: Bot = Bot {
        commands: all_commands(),
    };

    let mut client: Client = Client::builder(&token, intents)
        .event_handler(bot)
        .await
        .expect("❌ | Error when loading bot");

    if let Err(why) = client.start().await {
        eprintln!("❌ Client error: {why:?}");
    }
}
