const http = require("http");
const express = require("express");
const session = require("express-session");
const MessagingResponse = require("twilio").twiml.MessagingResponse;
const bodyParser = require("body-parser");

const app = express();

app.use(session({ secret: "shelter" }));
app.use(bodyParser.urlencoded({ extended: false }));

//User Profile
var phoneNum = "";
var city = "";
var quiet = false;
var meal = false;
var neighbourhood = "";
var sleep = -1;
var wake = -1;
var prereq = [];
var shelterChoice = -1;

//Needs logic for first time user or not

var demo = false;
var pref = false;
var inSetup = true;

var questionCount = 1; //Was 1
var dict1Count = 1;
var dict2Count = 1;
var responseCount = 1;
var skippedPref = false;

const dict1 = {
  // Y/N/P
  // Demographics
  1: "LGBTQ+",
  2: "Youth",
  3: "Family",
  4: "Indigenous",
  5: "Female",
};

const dict2 = {
  1: "What city are you in?",
  2: "Do you prefer quiet? [Y/N]",
  3: "Do you need a meal? [Y/N]",
  4: "What neighbourhood do you want to be in?",
  5: "what time do you sleep?",
  6: "What time do you wake up?",
};

const questions = {
  1: "Welcome to ShelterFirst! Let's get you set up. \nReply [Y] to continue, and [N] to abandon this session.",
  2: "Now we will ask you some of your preferences, which will match you to a personalized shelter. \nReply [Y] to continue, and [N] to skip this step.",
  3: "Here is a list of shelters we found! Choose you're preference: ", //TODO: this question needs data from the database after sending in the user profile
  4: "Would you like directions to the shelter? [Y/N]",
  5: "What intersection are you closest to? [ABC Street and XYZ Avenue]",
};

const responses = {
  1: "NO - 1",
  2: "Directions give",
  3: "We will keep you updated",
};

var message = "def";

app.post("/sms", (req, res) => {
  phoneNum = req.body.From;

  //Check if user is new
  //If database contains phoneNum, skip the dictionary parts
  // req.body.Body.toUpperCase()

  var smsCount = req.session.counter || 0;
  const twiml = new MessagingResponse();
  var response = req.body.Body.toUpperCase();

  if (inSetup) {
    if (questionCount == 1) {
      //Welcome and demographics set up
      message = questions[1];
      questionCount++;
    } else if (questionCount == 2 && dict1Count == 1) {
      if (response == "Y") {
        demo = true;
        //Go through demo toggle
      } else {
        message = responses[1];
        inSetup = false; //profile already created, skip straight to choose shelters
      }
    }

    if (demo) {
      switch (dict1Count) {
        case 1:
          break;
        case 2:
          if (response == "Y") {
            prereq.push("lgbtq");
          }
          break;
        case 3:
          if (response == "Y") {
            prereq.push("youth");
          }
          break;
        case 4:
          if (response == "Y") {
            prereq.push("family_friendly");
          }
          break;
        case 5:
          if (response == "Y") {
            prereq.push("indigenous");
          }
          break;
        default:
          if (response == "Y") {
            prereq.push("female");
          }
          message = questions[questionCount];
          //questionCount should be 2 at this point - ask for preferences
          //console.log("Everything okay?: 2= " + questionCount)
          demo = false;
          break;
      }
      if (demo) {
        message = dict1[dict1Count];
      }
      dict1Count++;
    } else if (dict1Count > 1 && dict2Count == 1) {
      //Move on to next question (3)
      console.log("---");
      console.log(phoneNum);
      console.log(prereq);
      questionCount++;
    }

    if (questionCount == 3 && dict2Count == 1) {
      //Catch response for preferences
      if (response == "Y") {
        pref = true;
        //Go through pref toggle
      } else {
        //Skip to next question (4)
        if(!skippedPref){
            message = questions[questionCount];
            skippedPref = true;
        }
        else{
            questionCount++;
        }
      }
    }

    if (pref) {
      switch (dict2Count) {
        case 1:
          break;
        case 2:
          city = response;
          break;
        case 3:
          if (response == "Y") {
            quiet = true;
          }
          break;
        case 4:
          if (response == "Y") {
            meal = true;
          }
          break;
        case 5:
          neighbourhood = response;
          break;
        case 6:
          sleep = response;
          break;
        default:
          wake = response;
          message = questions[questionCount];
          //questionCount should be 3 at this point - choose shelter
          //console.log("Everything okay?: 3= " + questionCount)
          pref = false;
          break;
      }
      if (pref) {
        message = dict2[dict2Count];
      }
      dict2Count++;
    } else if (dict1Count > 1 && dict2Count > 1) {
      //Move on to next question (4)
      questionCount++;
      //Check preferences
      console.log(
        phoneNum +
          "," +
          city +
          "," +
          quiet +
          "," +
          meal +
          "," +
          neighbourhood +
          "," +
          sleep +
          "," +
          wake +
          "," +
          prereq
      );
    }

    console.log(questionCount);
    if (questionCount == 4) {
      message = questions[questionCount]; //Do you want directions?
      shelterChoice = response; //Store response
      questionCount++;
    }
    if (questionCount == 6) {
      if (response == "Y") {
        message = questions[5]; //Then ask for the location
      } else {
        questionCount = 10;
      }
      questionCount++;
    }
    if (questionCount == 8) {
      //if (response == "Y") {
          console.log("test");
        message = responses[2] + "\n" + responses[3]; //Then give directions
      //}
    }
    if (questionCount > 8) {
      message = responses[3];
    }
  } else {
    message = "Not in setup!";
  }

  twiml.message(message);
  console.log(message);

  res.writeHead(200, { "Content-Type": "text/xml" });
  res.end(twiml.toString());
});

http.createServer(app).listen(1337, () => {
  console.log("Express server listening on port 1337");
});
