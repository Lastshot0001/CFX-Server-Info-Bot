const fs = require('fs');
const { Client, Collection, Intents } = require('discord.js');
const { token } = require('./config.json');
const winston = require('winston');

// Configure winston logger
const logger = winston.createLogger({
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.printf(info => `[${info.timestamp}] ${info.level}: ${info.message}`)
            )
        }),
        new winston.transports.File({ filename: 'bot.log', level: 'info' })
    ]
});

// Create a new client instance
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

// Load commands
client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    try {
        const command = require(`./commands/${file}`);
        client.commands.set(command.data.name, command);
        logger.info(`Loaded command: ${command.data.name}`);
    } catch (error) {
        logger.error(`Error loading command file ${file}:`, error);
    }
}

// Event when the client is ready
client.once('ready', async () => {
    logger.info('Bot is ready!');

    // Register commands globally
    const commands = client.commands.map(cmd => cmd.data.toJSON());
    try {
        await client.application.commands.set(commands);
        logger.info('Successfully registered application commands globally.');
    } catch (error) {
        logger.error('Error registering application commands globally:', error);
    }
});

// Handling slash commands and interactions
client.on('interactionCreate', async interaction => {
    try {
        if (!interaction.isCommand() && !interaction.isSelectMenu()) return;

        if (interaction.isCommand()) {
            const command = client.commands.get(interaction.commandName);

            if (!command) return;

            await command.execute(interaction);
        } else if (interaction.isSelectMenu()) {
            const command = client.commands.get(interaction.customId);

            if (!command) return;

            await command.selectMenu(interaction);
        }
    } catch (error) {
        logger.error('Error handling interaction:', error);
        await interaction.reply({ content: 'There was an error while handling this interaction!', ephemeral: true });
    }
});

// Error handling for unhandled rejections
process.on('unhandledRejection', error => {
    logger.error('Unhandled promise rejection:', error);
});

// Error handling for uncaught exceptions
process.on('uncaughtException', error => {
    logger.error('Uncaught exception:', error);
});

// Login to Discord with your app's token
client.login(token).catch(error => {
    logger.error('Failed to login to Discord:', error);
});
