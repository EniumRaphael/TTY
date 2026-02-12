use serenity::all::*;
use crate::commands::SlashCommand;

pub async fn handle(
    ctx: &Context,
    interaction: &Interaction,
    commands: &[Box<dyn SlashCommand>],
) {
    let Interaction::Command(command) = interaction else {
        return;
    };

    let name: &str = command.data.name.as_str();

    match commands.iter().find(|cmd| cmd.name() == name) {
        Some(cmd) => {
            if let Err(why) = cmd.run(ctx, command).await {
                eprintln!("❌ | Error on {name}: {why:?}");
            }
        }
        None => eprintln!("⚠️ | Unable to fetch: /{name}"),
    }
}

