mod commands;
mod config;
mod database;
mod events;
mod models;
mod utils;

use dotenvy::dotenv;
use events::Bot;
use serenity::Client;
use serenity::all::GatewayIntents;
use sqlx::postgres::PgPoolOptions;
use sqlx::{Pool, Postgres, migrate};
use std::env;
use tracing::{error, info};
use tracing_subscriber::fmt;

use self::config::emoji::EmojiConfig;

#[tokio::main]
async fn main() {
    fmt::init();
    dotenv().ok();

    let token: String =
        env::var("DISCORD_TOKEN").expect("❌ | DISCORD_TOKEN missing (check the env file)");

    let database_url: String =
        env::var("DATABASE_URL").expect("❌ | DATABASE_URL missing (check the env file)");

    let db: Pool<Postgres> = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("❌ | Failed to connect to PostgreSQL");
    info!("✅ | Connected to PostgreSQL");

    migrate!("./migrations")
        .run(&db)
        .await
        .expect("❌ | Failed to run migrations");
    info!("✅ | Migrations applied");

    let emojis: EmojiConfig = EmojiConfig::load().expect("❌ | Failed to load emojis.toml");
    info!("✅ | Emojis loaded\n");

    let intents: GatewayIntents = GatewayIntents::AUTO_MODERATION_CONFIGURATION
        | GatewayIntents::AUTO_MODERATION_EXECUTION
        | GatewayIntents::DIRECT_MESSAGE_REACTIONS
        | GatewayIntents::DIRECT_MESSAGES
        | GatewayIntents::GUILD_INVITES
        | GatewayIntents::GUILD_MEMBERS
        | GatewayIntents::GUILD_MESSAGE_REACTIONS
        | GatewayIntents::GUILD_MESSAGE_TYPING
        | GatewayIntents::GUILD_MESSAGES
        | GatewayIntents::GUILD_MODERATION
        | GatewayIntents::GUILD_VOICE_STATES
        | GatewayIntents::GUILDS
        | GatewayIntents::MESSAGE_CONTENT;

    let bot: Bot = Bot {
        commands: commands::import(),
        events: events::import(),
        database: db,
        emojis: emojis,
    };

    let mut client: Client = Client::builder(&token, intents)
        .event_handler(bot)
        .await
        .expect("❌ | Error when loading bot");

    if let Err(why) = client.start().await {
        error!("❌ | Client error: {why:?}")
    }
}
