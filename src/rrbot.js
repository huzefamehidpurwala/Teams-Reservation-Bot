const {
  TeamsActivityHandler,
  CardFactory,
  TurnContext,
  MessageFactory,
} = require("botbuilder");
const rawWelcomeCard = require("../adaptiveCards/welcome.json");
const rawLearnCard = require("../adaptiveCards/learn.json");
const cardTools = require("@microsoft/adaptivecards-tools");
const {
  MakeReservationDialog,
} = require("./components/makeReservationDialogue");

class RRBOT extends TeamsActivityHandler {
  constructor(conversationState, userState) {
    super();

    // * GLOBAL SETS
    // update the resp. states made in index.js
    this.conversationState = conversationState;
    this.userState = userState;
    // create a dialog state accessor
    this.dialogState = conversationState.createProperty("dialogState");
    this.makeReservationDialog = new MakeReservationDialog(
      this.conversationState,
      this.userState
    );

    this.previousIntent =
      this.conversationState.createProperty("previousIntent"); // this is the property to handle continuety/state of waterfall
    this.conversationData =
      this.conversationState.createProperty("conversationData"); // to save the data of conversation state

    // record the likeCount
    this.likeCountObj = { likeCount: 0 };

    this.onMessage(async (context, next) => {
      console.log("Running with Message Activity.");
      let txt = context.activity.text.toLowerCase();
      const removedMentionText = TurnContext.removeRecipientMention(
        context.activity
      );
      if (removedMentionText) {
        // Remove the line break
        txt = removedMentionText.toLowerCase().replace(/\n|\r/g, "").trim();
      }

      /* // Trigger command by IM text
      await context.sendActivity(MessageFactory.text(`Echo: ${txt}`)); */

      // * Routing Logic to route the msgs to the components
      let currentIntent = "";
      const previousIntent = this.previousIntent.get(context, {});
      const conversationData = this.conversationData.get(context, {});
      if (previousIntent.intentName && conversationData.endDialog === false) {
        currentIntent = previousIntent.intentName;
      } else if (
        previousIntent.intentName &&
        conversationData.endDialog === false
      ) {
        currentIntent = txt;
      } else {
        currentIntent = txt;
        await this.previousIntent.set(context, { intentName: txt });
      }

      console.log("========= currentIntent", currentIntent);
      console.log("========= currentIntent", currentIntent);
      switch (currentIntent) {
        case "make reservation":
          // await context.sendActivity(MessageFactory.text("success"));
          console.log("make reservation checked entry");
          try {
            await this.conversationData.set(context, { endDialog: false });
            await this.makeReservationDialog.run(context, this.dialogState);
            conversationData.endDialog =
              await this.makeReservationDialog.isDialogComplete();
          } catch (error) {
            console.log("error ocurred", error);
          }
          console.log("make reservation checked exit");
          break;

        case "cancel reservation":
          await context.sendActivity(
            MessageFactory.text("Cancelled!!!!!!!!!!!")
          );
          console.log("learn checked");
          break;

        default:
          await context.sendActivity(
            MessageFactory.text("Not a proper input!!")
          );
          console.log("default checked");
          break;
      }

      // By calling next() you ensure that the next BotHandler is run.
      await next();
    });

    this.onDialog(async (context, next) => {
      // Save any state changes. The load happened during the execution of the Dialog.
      await this.conversationState.saveChanges(context, false);
      await this.userState.saveChanges(context, false);
      await next();
    });

    // Listen to MembersAdded event, view https://docs.microsoft.com/en-us/microsoftteams/platform/resources/bot-v3/bots-notifications for more events
    this.onMembersAdded(async (context, next) => {
      const membersAdded = context.activity.membersAdded;
      for (let cnt = 0; cnt < membersAdded.length; cnt++) {
        if (membersAdded[cnt].id) {
          await context.sendActivity(
            MessageFactory.suggestedActions(
              ["Make Reservation", "Cancel Reservation", "Restaurant Address"],
              `Welcome ${membersAdded[cnt].name}, to the bot and select one...!`
            )
          );
          break;
        }
      }
      await next();
    });
  }

  // Invoked when an action is taken on an Adaptive Card. The Adaptive Card sends an event to the Bot and this
  // method handles that event.
  async onAdaptiveCardInvoke(context, invokeValue) {
    // The verb "userlike" is sent from the Adaptive Card defined in adaptiveCards/learn.json
    if (invokeValue.action.verb === "userlike") {
      this.likeCountObj.likeCount++;
      const card = cardTools.AdaptiveCards.declare(rawLearnCard).render(
        this.likeCountObj
      );
      await context.updateActivity({
        type: "message",
        id: context.activity.replyToId,
        attachments: [CardFactory.adaptiveCard(card)],
      });
      return { statusCode: 200 };
    }
  }
}

module.exports.RRBOT = RRBOT;
