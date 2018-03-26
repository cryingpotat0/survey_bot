const bot = require('../bootbot');

const showHelp = (chat) => {
  chat.say(`
    Surveyy Exchange lets you get responses to your survey if you answer other people's surveys. Register a new survey by entering the URL it is located at and a secret key. This secret key will be used to verify that someone else has actually taken your survey. It is very important that you include the secret key at the end of your survey, if more than one person reports your survey to be without a secret key, we will have to take your survey down. 
  `).then(() => {
    setTimeout(() => { 
      chat.say({
        text: `
    You start off with 10 response points in a survey, and gain 10 response points for every survey you answer. Your survey will be displayed to other people as long as you maintain a positive balance of response points. Essentially you answer other surveys until you receive all the response you need!
    `,
        buttons: [
          { type: 'postback', title: 'Create a new survey', payload: 'CREATE_SURVEY' },
          { type: 'postback', title: 'Get response points', payload: 'FETCH_OTHER_SURVEY' },
          { type: 'postback', title: 'My surveys', payload: 'LIST_SURVEYS' },
        ],
      })
    }, 1500)
  });
}

bot.on('postback:HELP', (payload, chat) => {
  showHelp(chat);
})

module.exports = {
  showHelp
}



