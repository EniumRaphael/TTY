mod commands;
mod database;
mod events;
mod models;
mod utils;

use events::Bot;
use serenity::all::*;
use sqlx::postgres::PgPoolOptions;
use sqlx::{Pool, Postgres, migrate};
use std::env;

#[tokio::main]
async fn main() {
    println!("\n");
    dotenvy::dotenv().ok();

    let token: String =
        env::var("DISCORD_TOKEN").expect("❌ | DISCORD_TOKEN missing (check the env file)");

    let database_url: String =
        env::var("DATABASE_URL").expect("❌ | DATABASE_URL missing (check the env file)");

    let db: Pool<Postgres> = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("❌ | Failed to connect to PostgreSQL");
    println!("✅ | Connected to PostgreSQL");

    migrate!("./migrations")
        .run(&db)
        .await
        .expect("❌ | Failed to run migrations");
    println!("✅ | Migrations applied\n");

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
    };

    let mut client: Client = Client::builder(&token, intents)
        .event_handler(bot)
        .await
        .expect("❌ | Error when loading bot");

    if let Err(why) = client.start().await {
        eprintln!("❌ | Client error: {why:?}")
    }
}
