const { MessageFactory } = require("botbuilder");
const {
  WaterfallDialog,
  ComponentDialog,
  ConfirmPrompt,
  ChoicePrompt,
  DateTimePrompt,
  NumberPrompt,
  TextPrompt,
  DialogSet,
} = require("botbuilder-dialogs");

const CHOICE_PROMPT = "CHOICE_PROMPT";
const CONFIRM_PROMPT = "CONFIRM_PROMPT";
const TEXT_PROMPT = "TEXT_PROMPT";
const NUMBER_PROMPT = "NUMBER_PROMPT";
const DATETIME_PROMPT = "DATETIME_PROMPT";
const WATERFALL_DIALOG = "WATERFALL_DIALOG";
let endDialog = "";

class CancelReservationDialog extends ComponentDialog {
  constructor(conversationState, userState) {
    // console.log("we are in constructor");
    super("cancelReservationDialog");

    // * create prompts as waterfall-dialogs and passing string id's
    this.addDialog(new TextPrompt(TEXT_PROMPT));
    this.addDialog(new ChoicePrompt(CHOICE_PROMPT));
    this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));
    this.addDialog(
      new NumberPrompt(NUMBER_PROMPT) // , this.numberofParticipantsValidator
    ); // 2nd arg is the function to validate the user input
    this.addDialog(new DateTimePrompt(DATETIME_PROMPT));

    // * add waterfall dialog that consists of multiple steps
    this.addDialog(
      new WaterfallDialog(WATERFALL_DIALOG, [
        this.firstStep.bind(this), // Ask confirmation if user wants to make reservation?
        this.confirmStep.bind(this), // Show summary of values entered by user and ask confirmation to make reservation
        this.summaryStep.bind(this),
      ])
    );
    this.initialDialogId = WATERFALL_DIALOG;
  }

  //   async numberofParticipantsValidator(promptContext) {
  //     return (
  //       promptContext.recognized.succeeded &&
  //       promptContext.recognized.value > 1 &&
  //       promptContext.recognized.value < 150
  //     );
  //   }

  async isDialogComplete() {
    return endDialog;
  }

  async run(turnContext, accessor) {
    const dialogSet = new DialogSet(accessor);
    dialogSet.add(this);
    const dialogContext = await dialogSet.createContext(turnContext);

    const results = await dialogContext.continueDialog();
    // console.log("......", results.status === "empty");
    // if (results.status === DialogTurnStatus.empty) {
    if (results.status === "empty") {
      try {
        await dialogContext.beginDialog(this.id);
      } catch (error) {
        console.log("error in mrd.run -> if", error);
      }
      // console.log("i am in mrd.run -> if");
    } else {
      // console.log("i am in mrd.run -> else");
    }
  }

  async firstStep(step) {
    // Running a prompt here means the next WaterfallStep will be run when the users response is received.
    endDialog = false;
    return await step.prompt(TEXT_PROMPT, "Enter the reservation ID: ");
  }

  async confirmStep(step) {
    step.values.reservationId = step.result; // save the time entered by user in the previous step

    let msg = "You entered following values:";
    Object.entries(step.values).forEach(([key, value]) => {
      msg += `\n${key}: ${JSON.stringify(value)}`;
    });

    // console.log("msgmsgsmsg======", msg);

    await step.context.sendActivity(MessageFactory.text(msg));
    return await step.prompt(
      CONFIRM_PROMPT,
      "Are you sure the details correct and confirm to cancel the reservation?",
      ["yes", "no"]
    );
  }

  async summaryStep(step) {
    if (step.result === true) {
      await step.context.sendActivity(
        MessageFactory.text(
          `Reservation Cancelled successfully of Reservation ID: ${step.values.reservationId}!`
        )
      );
    } else {
      await step.context.sendActivity(
        MessageFactory.text("Reservation Cancelling process terminated!")
      );
    }
    endDialog = true;
    return await step.endDialog();
  }
}

module.exports.CancelReservationDialog = CancelReservationDialog;
