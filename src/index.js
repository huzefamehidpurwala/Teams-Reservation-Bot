// index.js is used to setup and configure your bot

// Import required packages
const restify = require("restify");

// Import required bot services.
// See https://aka.ms/bot-services to learn more about the different parts of a bot.
const {
  CloudAdapter,
  ConfigurationServiceClientCredentialFactory,
  ConfigurationBotFrameworkAuthentication,
  MemoryStorage,
  ConversationState,
  UserState,
  BotFrameworkAdapter,
} = require("botbuilder");
const { RRBOT } = require("./rrbot");
const config = require("./config");

// Create adapter.
// See https://aka.ms/about-bot-adapter to learn more about adapters.
const credentialsFactory = new ConfigurationServiceClientCredentialFactory({
  MicrosoftAppId: config.botId,
  MicrosoftAppPassword: config.botPassword,
  MicrosoftAppType: "MultiTenant",
});

const botFrameworkAuthentication = new ConfigurationBotFrameworkAuthentication(
  {},
  credentialsFactory
);

const adapter = new CloudAdapter(botFrameworkAuthentication);

adapter.onTurnError = async (context, error) => {
  // This check writes out errors to console log .vs. app insights.
  // NOTE: In production environment, you should consider logging this to Azure
  //       application insights. See https://aka.ms/bottelemetry for telemetry
  //       configuration instructions.
  console.error(`\n [onTurnError] unhandled error: ${error}`);

  // Send a message to the user
  await context.sendActivity(
    `The bot encountered an unhandled error:\n ${error.message}`
  );
  await context.sendActivity(
    "To continue to run this bot, please fix the bot source code."
  );
};

// const ytbadapter = new BotFrameworkAdapter({});

// in-memory storage
const memoryStorage = new MemoryStorage();
const conversationState = new ConversationState(memoryStorage); // conversation state
const userState = new UserState(memoryStorage); // user state

// Create the bot that will handle incoming messages.
const bot = new RRBOT(conversationState, userState);

// Create HTTP server.
const server = restify.createServer();
server.use(restify.plugins.bodyParser());
server.listen(process.env.port || process.env.PORT || 3978, function () {
  console.log(`\nBot started, ${server.name} listening to ${server.url}`);
});

// Listen for incoming requests.
server.post("/api/messages", async (req, res) => {
  await adapter.process(req, res, async (context) => {
    // console.log(context, "context");
    await bot.run(context);
  });
});
// server.post("/api/messages", async (req, res) => {
//   await ytbadapter.processActivity(req, res, async (context) => {
//     await bot.run(context);
//   });
// });

// Gracefully shutdown HTTP server
[
  "exit",
  "uncaughtException",
  "SIGINT",
  "SIGTERM",
  "SIGUSR1",
  "SIGUSR2",
].forEach((event) => {
  process.on(event, () => {
    server.close();
  });
});
