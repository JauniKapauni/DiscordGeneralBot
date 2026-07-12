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
		const embed = new EmbedBuilder().setTitle("Poll").setColor("Blue").addFields({ name: "Question", value: question}, { name: "Option 1", value: `${option1}\n Votes: **0**`, inline: true}, { name: "Option 2", value: `${option2}\n Votes: **0**`, inline: true}).setFooter( { text: "Click a button below to vote"}).setTimestamp();
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
				db.get(`SELECT * FROM polls WHERE message_id = ?`, [message.id], (err, poll) => {
					db.all(`SELECT option, COUNT(*) as count FROM poll_votes WHERE poll_id = ? GROUP BY option`, [poll.id], async (err, rows) => {
						let option1Votes = 0;
						let option2Votes = 0;
						for (const row of rows) {
							if (row.option === "poll_option1") option1Votes = row.count;
							if (row.option === "poll_option2") option2Votes = row.count;
						}
						const endedEmbed = new EmbedBuilder().setTitle("Poll ended").setColor('Red').addFields({
							name: "Question",
							value: poll.question
						}, {
							name: "Option 1",
							value: `${poll.option1}\nVotes: **${option1Votes}**`,
							inline: true
						}, {
							name: "Option 2",
							value: `${poll.option2}\nVotes: **${option2Votes}**`,
							inline: true
						}, {
							name: "Result",
							value: option1Votes > option2Votes ? `Winner; **${poll.option1}**` : option2Votes > option1Votes ? `Winner: **${poll.option2}**` : "It's a tie!"
						}).setFooter({ text: `Final votes: ${option1Votes + option2Votes}` }).setTimestamp();
						await embedMessage.edit({
							embeds: [endedEmbed],
							components: []
						});
					})
				})
			} catch (err){
				console.error("Failed to remove buttons", err);
			}
		}, duration * 60 * 1000);
	},
};