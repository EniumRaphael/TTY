use serenity::{
    Client,
    all::{Command, Context, EventHandler, GatewayIntents, Interaction, Ready},
};
use std::env;
use tokio;

mod commands;

struct Bot;

#[serenity::async_trait]
impl EventHandler for Bot {
    async fn ready(&self, ctx: Context, ready: Ready) {
        println!("TTY is running on '{}' \n", ready.user.name);

        println!("Starting command registration:");

        match Command::set_global_commands(&ctx.http, vec![commands::utils::ping::register()]).await
        {
            Ok(cmds) => {
                for cmd in &cmds {
                    println!("\t✅ | {}", cmd.name);
                }
            }
            Err(why) => eprintln!("❌ | Error cannot register a command : {why:?}"),
        }
    }

    async fn interaction_create(&self, ctx: Context, interaction: Interaction) {
        let Interaction::Command(command) = interaction else {
            return;
        };

        let result = match command.data.name.as_str() {
            commands::utils::ping::COMMAND_NAME => commands::utils::ping::run(&ctx, &command).await,
            other => {
                eprintln!("⚠️ | Unknown command: /{other}");
                return;
            }
        };
        if let Err(e) = result {
            eprintln!("❌ | Error on /{} : {e:?}", command.data.name);
        }
    }
}

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    let token: String = env::var("DISCORD_TOKEN").expect("❌ | Missing DISCORD_TOKEN on env file");

    let intents = GatewayIntents::default();

    let mut client = Client::builder(&token, intents)
        .event_handler(Bot)
        .await
        .expect("❌ | Cannot connect to the discord client");

    if let Err(why) = client.start().await {
        eprintln!("❌ | Client error : {why:?}");
    }
}
