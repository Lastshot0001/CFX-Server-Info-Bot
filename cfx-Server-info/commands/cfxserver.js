const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Fetches information about a FiveM server using its cfx.re code.')
        .addStringOption(option =>
            option.setName('cfxcode')
                .setDescription('The cfx.re code of the FiveM server.')
                .setRequired(true)),
    async execute(interaction) {
        const cfxCode = interaction.options.getString('cfxcode');
        const apiUrl = `https://servers-frontend.fivem.net/api/servers/single/${cfxCode}`;

        try {
            await interaction.deferReply();

            const response = await axios.get(apiUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0',
                    'Accept': 'application/json',
                }
            });
            const serverData = response.data;

            if (!serverData || !serverData.Data) {
                throw new Error('Invalid server data.');
            }

            const { hostname, players, sv_maxclients, clients, connectEndPoints, upvotePower, ownerProfile } = serverData.Data;

            const serverEmbed = new MessageEmbed()
                .setTitle('FiveM Server Information')
                .setDescription(`Details for server: **${hostname}**`)
                .setColor('#00FF00'); // Green color code

            if (typeof sv_maxclients === 'number') {
                serverEmbed.addFields({ name: 'Max Slots', value: sv_maxclients.toString(), inline: false });
            } else {
                serverEmbed.addFields({ name: 'Max Slots', value: 'Unknown', inline: false });
            }

            if (typeof clients === 'number' && typeof sv_maxclients === 'number') {
                serverEmbed.addFields({ name: 'Current Players', value: `${clients} / ${sv_maxclients}`, inline: false });
            } else {
                serverEmbed.addFields({ name: 'Current Players', value: 'Unknown', inline: false });
            }

            if (Array.isArray(connectEndPoints) && connectEndPoints.length > 0) {
                const formattedEndPoints = connectEndPoints.map(endpoint => `- ${endpoint}`).join('\n');
                serverEmbed.addFields({ name: 'Connect End Points', value: formattedEndPoints, inline: false });
            } else {
                serverEmbed.addFields({ name: 'Connect End Points', value: 'Unknown', inline: false });
            }

            if (typeof upvotePower === 'number') {
                serverEmbed.addFields({ name: 'Upvote Power', value: upvotePower.toString(), inline: false });
            } else {
                serverEmbed.addFields({ name: 'Upvote Power', value: 'Unknown', inline: false });
            }

            if (typeof ownerProfile === 'string' && ownerProfile.trim() !== '') {
                serverEmbed.addFields({ name: 'Owner Profile', value: ownerProfile, inline: false });
            } else {
                serverEmbed.addFields({ name: 'Owner Profile', value: 'Unknown', inline: false });
            }

            // Handling players in another embed
            if (players && players.length > 0) {
                const playerEmbed = new MessageEmbed()
                    .setTitle('Players Online')
                    .setColor('#FFA500'); // Orange color code

                const playerList = players.map(player => `${player.name} | ${player.ping}ms`).join('\n');
                playerEmbed.setDescription(playerList);

                // Split into multiple embeds if necessary
                if (players.length > 25) {
                    const firstPlayerEmbed = playerEmbed.spliceFields(0, 25);
                    await interaction.editReply({ embeds: [serverEmbed, firstPlayerEmbed] });
                } else {
                    await interaction.editReply({ embeds: [serverEmbed, playerEmbed] });
                }
            } else {
                await interaction.editReply({ embeds: [serverEmbed] });
            }
        } catch (error) {
            console.error('Error fetching server information:', error);

            let errorMessage = 'Failed to fetch server information. Please ensure the cfx.re code is correct and try again.';
            if (error.response) {
                errorMessage += `\nServer responded with status code: ${error.response.status}`;
            } else if (error.request) {
                errorMessage += '\nNo response received from the server.';
            } else {
                errorMessage += `\nError: ${error.message}`;
            }

            await interaction.editReply({ content: errorMessage, ephemeral: true });
        }
    },
};
