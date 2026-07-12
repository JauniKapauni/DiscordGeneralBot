const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits, MessageFlags, EmbedBuilder } = require('discord.js');
const { token, welcomeChannelId, loggingChannelId, boostChannelId } = require('./config.json');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
const db = require("./database");

async function handlePollButton(interaction){
    if(interaction.customId !== "poll_option1" && interaction.customId !== "poll_option2") return;
    db.get(`SELECT * FROM polls WHERE message_id = ?`, [interaction.message.id], (err, poll) => {
        if(err){
            console.error(err);
            return;
        }
        if(!poll){
            return interaction.reply({
                content: "Poll not found",
                ephemeral: true
            });
        }
        db.run(`DELETE FROM poll_votes WHERE poll_id = ? AND user_id = ?`, [poll.id, interaction.user.id], () => {
            db.run(`INSERT INTO poll_votes (poll_id, user_id, option) VALUES (?, ?, ?)`, [poll.id, interaction.user.id, interaction.customId]);
            db.all(`SELECT option, COUNT(*) as count FROM poll_votes WHERE poll_id = ? GROUP BY option`, [poll.id], async (err, rows) => {
                let option1Votes = 0;
                let option2Votes = 0;
                for(const row of rows){
                    if(row.option === "poll_option1"){
                        option1Votes = row.count;
                    }
                    if(row.option === "poll_option2"){
                        option2Votes = row.count;
                    }
                }
                const embed = new EmbedBuilder().setTitle("Poll").setColor("Blue").addFields({ name: "Question", value: poll.question}, { name: "Option 1", value: `${poll.option1}\nVotes: **${option1Votes}**`, inline: true}, { name: "Option 2", value: `${poll.option2}\nVotes: **${option2Votes}**`, inline: true}, { name: "Ends", value: `<t:${poll.end_time}:R>`, inline: true}).setFooter({ text: `Total votes: ${option1Votes + option2Votes}`}).setTimestamp();
                await interaction.update({embeds: [embed]});
            })
        });
    })
}

client.commands = new Collection();

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for(const folder of commandFolders){
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));
    for(const file of commandFiles){
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if('data' in command && 'execute' in command){
            client.commands.set(command.data.name, command);
        } else {
            console.log(`The command at ${filePath} is missing a required "data or "execute" property.`)
        }
    }
}

client.once(Events.ClientReady, (readyClient) => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
    if(interaction.isButton()){
        handlePollButton(interaction);
        return;
    }
    if(!interaction.isChatInputCommand()) return;
    const command = interaction.client.commands.get(interaction.commandName);
    if(!command){
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }
    try{
        await command.execute(interaction);
    } catch (error){
        console.error(error);
        if(interaction.replied || interaction.deferred){
            await interaction.followUp({
                content: 'There was an error while executing this command!',
                flags: MessageFlags.Ephemeral,
            });
        } else {
            await interaction.reply({
                content: 'There was an error while executing this command!',
                flags: MessageFlags.Ephemeral,
            })
        }
    }
    console.log(interaction);
})

client.on(Events.GuildMemberAdd, async (member) => {
    try{
        const channel = await client.channels.fetch(welcomeChannelId);
        if(!channel){
            console.error(`Welcome channel (${welcomeChannelId}) not found!`);
            return;
        }
        await channel.send(`Welcome ${member} to the server!`);
    } catch (e){
        console.error(`Failed to send welcome message:`, e);
    }
});

client.on(Events.GuildMemberRemove, async (member) => {
    try{
        const channel = await client.channels.fetch(loggingChannelId);
        if(!channel){
            console.error(`Logging channel (${loggingChannelId}) not found!`);
            return;
        }
        await channel.send(`${member} left the server!`);
    } catch (e){
        console.error(`Failed to send logging message:`, e);
    }
});

client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
    if(!oldMember.premiumSince && newMember.premiumSince){
        const channel = await client.channels.fetch(boostChannelId);
        if(channel){
            await channel.send(`Thank you ${newMember} for boosting the server!`);
        }
    }
});

client.login(token);