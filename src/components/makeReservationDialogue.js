const { AdaptiveCards } = require("@microsoft/adaptivecards-tools");
const { MessageFactory, CardFactory } = require("botbuilder");
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
const confirmCard = require("../../adaptiveCards/makeReservationDetails.json");

const CHOICE_PROMPT = "CHOICE_PROMPT";
const CONFIRM_PROMPT = "CONFIRM_PROMPT";
const TEXT_PROMPT = "TEXT_PROMPT";
const NUMBER_PROMPT = "NUMBER_PROMPT";
const DATETIME_PROMPT = "DATETIME_PROMPT";
const WATERFALL_DIALOG = "WATERFALL_DIALOG";
const objPropNames = {
  name: "Name of Passenger",
  numOfParticipants: "Number of Passengers",
  date: "Date of Journey",
  time: "Time of Journey",
};
let endDialog = "";

class MakeReservationDialog extends ComponentDialog {
  constructor(conversationState, userState) {
    // console.log("we are in constructor");
    super("makeReservationDialog");

    // * create prompts as waterfall-dialogs and passing string id's
    this.addDialog(new TextPrompt(TEXT_PROMPT));
    this.addDialog(new ChoicePrompt(CHOICE_PROMPT));
    this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));
    this.addDialog(
      new NumberPrompt(NUMBER_PROMPT, this.numberofParticipantsValidator)
    ); // 2nd arg is the function to validate the user input
    this.addDialog(new DateTimePrompt(DATETIME_PROMPT, this.isDateWithinRange));

    // * add waterfall dialog that consists of multiple steps
    this.addDialog(
      new WaterfallDialog(WATERFALL_DIALOG, [
        this.firstStep.bind(this), // Ask confirmation if user wants to make reservation?
        this.getName.bind(this), // Get name from user
        this.getNumberofParticipants.bind(this), // Number of participants for reservation
        this.getDate.bind(this), // Date of reservation
        this.getTime.bind(this), // Time of reservation
        this.confirmStep.bind(this), // Show summary of values entered by user and ask confirmation to make reservation
        this.summaryStep.bind(this),
      ])
    );
    /* this.addDialog(
      new WaterfallDialog(WATERFALL_DIALOG, [
        this.firstStep, // Ask confirmation if user wants to make reservation?
        this.getName, // Get name from user
        this.getNumberofParticipants, // Number of participants for reservation
        this.getDate, // Date of reservation
        this.getTime, // Time of reservation
        this.confirmStep, // Show summary of values entered by user and ask confirmation to make reservation
        this.summaryStep,
      ])
    ); */
    // this.addDialog(
    //   new WaterfallDialog(WATERFALL_DIALOG, [
    //     this.firstStep.bind(), // Ask confirmation if user wants to make reservation?
    //     this.getName.bind(), // Get name from user
    //     this.getNumberofParticipants.bind(), // Number of participants for reservation
    //     this.getDate.bind(), // Date of reservation
    //     this.getTime.bind(), // Time of reservation
    //     this.confirmStep.bind(), // Show summary of values entered by user and ask confirmation to make reservation
    //     this.summaryStep.bind(),
    //   ])
    // );

    /* // ! (from docs) Add control flow dialogs
    this.addDialog(
      new WaterfallDialog(WATERFALL_DIALOG, [
        async (step) => {
          // Ask user their name
          return await step.prompt(CONFIRM_PROMPT, `What's your name?`);
        },
        async (step) => {
          // Remember the users answer
          step.values["name"] = step.result;

          // Ask user their age.
          return await step.prompt(
            NUMBER_PROMPT,
            `Hi ${step.values["name"]}. How old are you?`
          );
        },
        async (step) => {
          // Remember the users answer
          step.values["age"] = step.result;

          // End the component and return the completed profile.
          return await step.endDialog(step.values);
        },
      ])
    ); */

    // * define steps that will run in sequence top-bottom
    // this.firstStep.bind(this), // Ask confirmation if user wants to make reservation?
    //   this.getName.bind(this), // Get name from user
    //   this.getNumberofParticipants.bind(this), // Number of participants for reservation
    //   this.getDate.bind(this), // Date of reservation
    //   this.getTime.bind(this), // Time of reservation
    //   this.confirmStep.bind(this), // Show summary of values entered by user and ask confirmation to make reservation
    //   this.summaryStep.bind(this);

    this.initialDialogId = WATERFALL_DIALOG;
  }

  async numberofParticipantsValidator(promptContext) {
    return (
      promptContext.recognized.succeeded &&
      promptContext.recognized.value > 1 &&
      promptContext.recognized.value < 150
    );
  }

  async isDateWithinRange(promptContext) {
    // console.log(promptContext.options.prompt);
    // console.log(promptContext.recognized);
    if (
      promptContext.options.prompt.toLowerCase().search("time") !== -1 &&
      promptContext.recognized.value[0].type == "time"
    ) {
      // console.log("in if1", promptContext.recognized.value);
      if (promptContext.recognized.value.length > 1) {
        await promptContext.context.sendActivity(
          MessageFactory.text(
            "Specify a proper time value in 12hr format or 24hr format!"
          )
        );
        return false;
      } else {
        return true;
      }
    }

    if (
      promptContext.options.prompt.toLowerCase().search("date") !== -1 &&
      promptContext.recognized.value[0].type == "date"
    ) {
      // console.log("in if222", promptContext.recognized.value);
      if (promptContext.recognized.value.length > 1) {
        return false;
      }

      if (promptContext.recognized.succeeded) {
        // Get today's date
        const today = new Date();
        today.setDate(today.getDate() - 1);

        // Calculate the maximum date (4 months from today)
        const maxDate = new Date();
        maxDate.setMonth(maxDate.getMonth() + 4);

        // Parse the input date
        const inputDate = new Date(promptContext.recognized.value[0].value);

        // Check if the input date is a valid date and falls within the range
        if (!isNaN(inputDate) && inputDate >= today && inputDate <= maxDate) {
          return true;
        } else {
          await promptContext.context.sendActivity(
            MessageFactory.text(
              "Value is not in the range of 4 months from today!"
            )
          );
          return false;
        }
      }
    }

    await promptContext.context.sendActivity(
      MessageFactory.text("Invalid Value!")
    );
    return false;
  }

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
        // console.log("huze_________=++", this);
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
    return await step.prompt(
      CONFIRM_PROMPT,
      "Would you like to make a reservation?",
      ["yes", "no"]
    );
  }

  async getName(step) {
    // check whether user selected yes or no
    // console.log("in getName step");
    if (step.result === true) {
      return await step.prompt(
        TEXT_PROMPT,
        "In what name is the reservation is to be made?"
      );
    } else {
      await step.context.sendActivity(
        MessageFactory.text("Process Terminated!")
      );
      endDialog = true;
      return await step.endDialog();
    }
  }

  async getNumberofParticipants(step) {
    step.values[objPropNames.name] = step.result; // save the name entered by user in the previous step
    return await step.prompt(
      NUMBER_PROMPT,
      "How many participants are going to be there(0-150)?"
    );
  }

  async getDate(step) {
    step.values[objPropNames.numOfParticipants] = step.result; // save the num entered by user in the previous step
    return await step.prompt(
      DATETIME_PROMPT,
      "On which Date you want to have the reservation? (values allowed maximum till 4-months from today)"
    );
  }

  async getTime(step) {
    step.values[objPropNames.date] = step.result; // save the date entered by user in the previous step
    return await step.prompt(DATETIME_PROMPT, "At what time?");
  }

  async confirmStep(step) {
    step.values[objPropNames.time] = step.result; // save the time entered by user in the previous step

    let msg = [];
    Object.entries(step.values).forEach(([key, value]) => {
      if (typeof value === "string") {
        key !== "instanceId"
          ? msg.push({ key, value })
          : msg.push({ key: "Ticket ID", value });
      } else {
        value[0]?.value
          ? msg.push({ key: key, value: value[0]?.value })
          : msg.push({ key, value });
      }
    });

    // console.log("msgmsgsmsg======", { properties: msg });
    /* const card = AdaptiveCards.declare(confirmCard).render({
      properties: [
        { key: "Name", value: step.values.name },
        {
          key: "Number of Passengers",
          value: step.values.numOfParticipants,
        },
        { key: "Date of Journey", value: step.values.date[0].value },
        { key: "Time of Journey", value: step.values.time[0].value },
      ],
    }); */
    const card = AdaptiveCards.declare(confirmCard).render({
      properties: msg,
    });

    await step.context.sendActivity({
      attachments: [CardFactory.adaptiveCard(card)],
    });
    return await step.prompt(
      CONFIRM_PROMPT,
      "Are you sure the details correct and confirm the reservation?",
      ["yes", "no"]
    );
  }

  async summaryStep(step) {
    if (step.result === true) {
      await step.context.sendActivity(
        MessageFactory.text("Reservation Confirmed!")
      );
    } else {
      await step.context.sendActivity(
        MessageFactory.text("Process Terminated!")
      );
    }
    endDialog = true;
    return await step.endDialog();
  }
}

module.exports.MakeReservationDialog = MakeReservationDialog;
