const {
  TeamsActivityHandler,
  TurnContext,
  MessageFactory,
  CardFactory,
} = require("botbuilder");
const {
  MakeReservationDialog,
} = require("./components/makeReservationDialogue");
const {
  CancelReservationDialog,
} = require("./components/cancelReservationDialogue");
const { AdaptiveCards } = require("@microsoft/adaptivecards-tools");
const confirmCard = require("../adaptiveCards/makeReservationDetails.json");

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
    this.cancelReservationDialog = new CancelReservationDialog(
      this.conversationState,
      this.userState
    );

    this.previousIntent =
      this.conversationState.createProperty("previousIntent"); // this is the property to handle continuety/state of waterfall
    this.conversationData =
      this.conversationState.createProperty("conversationData"); // to save the data of conversation state

    // record the likeCount
    // this.likeCountObj = { likeCount: 0 };

    this.onMessage(async (context, next) => {
      // console.log("Running with Message Activity.");
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
      const previousIntent = await this.previousIntent.get(context, {});
      const conversationData = await this.conversationData.get(context, {});
      // console.log("previousIntent++++++", previousIntent);
      // console.log("conversationData********", conversationData);
      // console.log("in ++++ rrbot.js===", conversationData.endDialog);
      if (previousIntent.intentName && conversationData.endDialog === false) {
        currentIntent = previousIntent.intentName;
        // console.log("=if======== currentIntent", currentIntent);
      } else if (
        previousIntent.intentName &&
        conversationData.endDialog === true
      ) {
        currentIntent = txt;
        await this.previousIntent.set(context, { intentName: "" });
        // console.log("====elseif===== currentIntent", currentIntent);
      } else {
        currentIntent = txt;
        await this.previousIntent.set(context, { intentName: txt });
        // console.log("=========else currentIntent", currentIntent);
      }

      switch (currentIntent) {
        case "make reservation":
          // await context.sendActivity(MessageFactory.text("success"));
          // console.log("make reservation checked entry");
          try {
            // await this.conversationData.set(context, { endDialog: false });
            await this.makeReservationDialog.run(context, this.dialogState);
            // conversationData.endDialog =
            //   await this.makeReservationDialog.isDialogComplete();
            await this.conversationData.set(context, {
              endDialog: await this.makeReservationDialog.isDialogComplete(),
            });

            if (conversationData.endDialog) {
              await this.previousIntent.set(context, {
                intentName: currentIntent,
              });
            }

            // console.log("in try catch rrbot.js===", conversationData.endDialog);
          } catch (error) {
            console.log("error ocurred", error);
          }
          // console.log("make reservation checked exit", `\n`);
          break;

        case "cancel reservation":
          // await context.sendActivity(
          //   MessageFactory.text("Cancelled!!!!!!!!!!!")
          // );
          console.log("cancel reservation enter");
          try {
            // await this.conversationData.set(context, { endDialog: false });
            await this.cancelReservationDialog.run(context, this.dialogState);
            // conversationData.endDialog =
            //   await this.cancelReservationDialog.isDialogComplete();
            await this.conversationData.set(context, {
              endDialog: await this.cancelReservationDialog.isDialogComplete(),
            });

            if (conversationData.endDialog) {
              await this.previousIntent.set(context, {
                intentName: currentIntent,
              });
            }

            // console.log("in try catch rrbot.js===", conversationData.endDialog);
          } catch (error) {
            console.log("error ocurred", error);
          }
          console.log("cancel reservation exit");
          break;

        default:
          await context.sendActivity(
            MessageFactory.text("Not a proper input!!")
          );
          /* const step = {
            values: {
              instanceId: "1e965a55-6440-4207-abc7-21a8d222ca3f",
              name: "Huzefa",
              numOfParticipants: 3,
              date: [
                { timex: "2001-08-15", type: "date", value: "2001-08-15" },
              ],
              time: [
                { timex: "T04:30", type: "time", value: "04:30:00" },
                { timex: "T16:30", type: "time", value: "16:30:00" },
              ],
            },
          };
          let msg = [
            { key: "Name", value: step.values.name },
            {
              key: "Number of Passengers",
              value: step.values.numOfParticipants,
            },
            { key: "Date of Journey", value: step.values.date[0].value },
            { key: "Time of Journey", value: step.values.time[0].value },
          ];
          Object.entries(step.values).forEach(([key, value]) => {
            for (const char of key) {
              
            }
            if (typeof value === "string") {
              msg.push({ key: key, value: value });
            } else {
              value[0]?.value
                ? msg.push({ key: key, value: value[0]?.value })
                : msg.push({ key: key, value: value });
            }
          });

          // console.log("msgmsgsmsg======", { properties: msg });
          const card = AdaptiveCards.declare(confirmCard).render({
            properties: msg,
          });
          await context.sendActivity({
            attachments: [CardFactory.adaptiveCard(card)],
          }); */
          // console.log("default checked");
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
  /* async onAdaptiveCardInvoke(context, invokeValue) {
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
  } */
}

module.exports.RRBOT = RRBOT;
