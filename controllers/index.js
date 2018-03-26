const bot = require('../bootbot');
const UserController = require('./user');
const SurveyController = require('./survey');
const HelpController = require('./help')
const User = require('../models').User

bot.setGreetingText('Hey there! Need some answers for your survey?')
bot.setGetStartedButton('GET_STARTED')


bot.on('message', (payload, chat) => {
  if(payload.message.text.match(/[Hh]elp/)) {
    HelpController.showHelp(chat);
  } else {
    UserController.validateUser(payload, chat, SurveyController.showMenu);
  }
})

bot.on('postback:GET_STARTED', (payload, chat) => {
  UserController.validateUser(payload, chat, SurveyController.showMenu)
    .catch((e) => {
      console.log(e);
    })
})

//bot.deletePersistentMenu();
bot.setPersistentMenu([
  { type: 'postback', title: 'Show main menu', payload: 'MAIN_MENU' },
  { type: 'postback', title: 'Help', payload: 'HELP' },
  { type: 'web_url', title: 'Talk to a human', url: 'm.me/463939713980424' },
])

module.exports = bot;
