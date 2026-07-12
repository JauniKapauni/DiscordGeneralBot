const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require("../../database");
module.exports = {
	data: new SlashCommandBuilder().setName("poll").setDescription("Create a poll")
		.addStringOption(opt => opt.setName("question").setDescription("Question").setRequired(true))
		.addStringOption(opt => opt.setName("option1").setDescription("First option").setRequired(true))
		.addStringOption(opt => opt.setName("option2").setDescription("Second option").setRequired(true))
		.addIntegerOption(opt => opt.setName("duration").setDescription("Duration in minutes").setRequired(true)),
	async execute(interaction){
		const question = interaction.options.getString("question");
		const option1 = interaction.options.getString("option1");
		const option2 = interaction.options.getString("option2");
		const duration = interaction.options.getInteger("duration");
		const endTime = Math.floor(Date.now() / 1000) + (duration * 60);
		const embed = new EmbedBuilder().setTitle("Poll").setDescription(`${question}\n${option1}\n${option2}\n<t:${endTime}:R>`).setColor("Blue");
		const buttons = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("poll_option1").setLabel(option1).setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId("poll_option2").setLabel(option2).setStyle(ButtonStyle.Danger));
		const message = await interaction.reply({
			embeds: [embed],
			components: [buttons],
			fetchReply: true,
		});
		db.run(`INSERT INTO polls (message_id, question, option1, option2, end_time) VALUES (?, ?, ?, ?, ?)`, [message.id, question, option1, option2, endTime]);
		setTimeout(async () => {
			try{
				const embedMessage = await interaction.channel.messages.fetch(message.id);
				await embedMessage.edit({
					components: []
				});
			} catch (err){
				console.error("Failed to remove buttons", err);
			}
		}, duration * 60 * 1000);
	},
};