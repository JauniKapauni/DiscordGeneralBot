const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder().setName('kick').setDescription('Kick a member from the server').addUserOption(option => option.setName('user').setDescription('The user to kick').setRequired(true)).addStringOption(option => option.setName('reason').setDescription('Reason for the kick').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    async execute(interaction){
        if(!interaction.member.permissions.has("Administrator")){
            return interaction.reply({
                content: "You don't have permission to do this.",
                ephemeral: true
            });
        }
        const member = interaction.options.getMember('user');
        const reason = interaction.options.getString('reason');
        if(!member){
            return interaction.reply({
                content: 'User not found in this server',
                ephemeral: true,
            });
        }
        if(!member.kickable){
            return interaction.reply({
                content: 'User cannot be kicked',
                ephemeral: true,
            });
        }
        try{
            await member.kick(reason);
            await interaction.reply(`${member.user.tag} was kicked for ${reason}`);
        } catch (e){
            console.error(e);
            await interaction.reply({
                content: `Failed to kick the user`,
                ephemeral: true
            })
        }
    }
}