import {
  MessageFlags,
  ChatInputCommandInteraction,
  CategoryChannel,
  ChannelType,
  PermissionsBitField,
  SlashCommandBuilder,
} from "discord.js";
import emoji from "../../../assets/emoji.json" assert { type: "json" };
import { prisma } from "../../lib/prisma.ts";

export default {
  data: new SlashCommandBuilder()
    .setName("deletecat")
    .setDescription("Delete the categorie given in parameter")
    .addChannelOption((opt) =>
      opt
        .setName("category")
        .setDescription("Choose the categorie you want to delete")
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildCategory),
    ),
  async execute(interaction: CommandInteraction) {
    let userData: User;
    try {
      userData = await prisma.user.findUnique({
        where: {
          id: interaction.user.id,
        },
      });
    } catch (err) {
      console.error(
        `\t⚠️ | Whitelist => Cannot get the database connection!\n\t\t(${err}).`,
      );
      await interaction.reply({
        content: `${emoji.answer.error} | Cannot connect to the database`,
        flags: MessageFlags.Ephemeral,
      });
      console.error(`Cannot connect to the database:\n\t${err}`);
      return;
    }
    if (!userData.isOwner) {
      await interaction.reply({
        content: `${emoji.answer.no} | This command is only for owner`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const category: GuildCategory = interaction.options.getChannel(
      "category",
      true,
    );
    try {
      for (const channel of category.children.cache.values()) {
        await channel.delete(
          `Delete cat of ${channel.name} (by ${interaction.username})`,
        );
      }
      await category.delete(
        `Delete cat of ${category.name} (by ${interaction.username})`,
      );
      await interaction.reply({
        content: `${emoji.answer.yes} | Suppressed the ${category.name}`,
        flags: MessageFlags.Ephemeral,
      });
    } catch (err) {
      await interaction.reply({
        content: `${emoji.answer.error} | Cannot suppress the category's channels`,
        flags: MessageFlags.Ephemeral,
      });
      console.error(`Cannot suppress the category's channel:\n\t${err}`);
      return;
    }
  },
};
