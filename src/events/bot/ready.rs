use serenity::all::*;
use crate::commands::SlashCommand;

pub async fn handle(ctx: &Context, ready: &Ready, commands: &[Box<dyn SlashCommand>]) {
    println!("TTY is now running as: '{}'\n", ready.user.name);

    println!("Starting command registration:");
    let cmds: Vec<CreateCommand> = commands
        .iter()
        .map(|c| c.register())
        .collect();

    Command::set_global_commands(&ctx.http, cmds)
        .await
        .expect("❌ | Cannot register commands");

    println!("\nTTY now running with {} commands loaded", commands.len());
}
