import { Events, MessageFlags } from "discord.js";
import { prisma } from "../../lib/prisma.ts";

export default {
  name: Events.GuildCreate,
  async execute(guild, client) {
    const botData = await prisma.bot.findUnique({
      where: {
        id: 1,
      },
      include: {
        buyers: true,
      },
    });
    await prisma.guild.upsert({
      where: {
        id: guild.id,
      },
      update: {},
      create: {
        id: guild.id,
      },
    });

    const members = await guild.members.fetch();
    let i = 0;
    for (const [memberId, member] of members) {
      await prisma.user.upsert({
        where: {
          id: memberId,
        },
        update: {},
        create: {
          id: memberId,
        },
      });

      await prisma.guildUser.upsert({
        where: {
          userId_guildId: {
            userId: memberId,
            guildId: guild.id,
          },
        },
        update: {},
        create: {
          userId: memberId,
          guildId: guild.id,
        },
      });
      i++;
    }
    console.log(
      `✅ | Guild ${guild.name} synchronisée avec ${members.size} membres.`,
    );
  },
};
