const validUrl = require('valid-url');
const Survey = require('../models').Survey;
const User = require('../models').User;
const UserController = require('./user');
const bot = require('../bootbot');
const Sequelize = require('sequelize')
const sequelize = require('../models/sequelize')

const showSecondaryMenu = (payload, chat) => {
  chat.say({
    text: 'What would you like to do?',
    buttons: [
      { type: 'postback', title: 'How does this work?', payload: 'HELP' },
      { type: 'postback', title: 'Previous options', payload: 'MAIN_MENU' },
    ]
  })
}

const showMenu = (payload, chat) => {
  chat.say({
    text: 'What would you like to do? (Type help if you want to understand how this works!)',
    buttons: [
      { type: 'postback', title: 'Create a new survey', payload: 'CREATE_SURVEY' },
      { type: 'postback', title: 'Get response points', payload: 'FETCH_OTHER_SURVEY' },
      { type: 'postback', title: 'My surveys', payload: 'LIST_SURVEYS' },
    ],
  })
}

const textOrEndConv = (payload) => {
  try {
    let text = payload.message.text;
    if(text.toLowerCase() === 'stop') {
      return undefined;
    }
    return text;
  } catch(e) {
    return undefined;
  }
}

const createSurvey = (payload, chat, user) => {

  const getUrl= (convo, failure) => {
    convo.ask(`${ !failure ? "Please enter the URL of your survey" : "That URL was invalid, please try again"}`, (payload, convo) => {
      const text = textOrEndConv(payload);
      if(text === undefined) {
        convo.end();
        return;
      }
      if(text.length < 5) {
        getUrl(convo, true);
      } else {
        convo.set('url', text);
        getSecretKey(convo);
      }
    }); 
  }

  const getSecretKey = (convo, failure) => {
    convo.ask(`${ !failure ? "Please enter a secret key more than 5 characters long" : "That secret key was invalid, please try again"}`, (payload, convo) => {
      const text = textOrEndConv(payload);
      if(text === undefined) {
        convo.end();
        return;
      }
      if(text.length <= 5) {
        getSecretKey(convo, true);
      } else {
        convo.set('secret_key', text);
        createSurvey(convo);
      }
    })
  }

  const createSurvey = (convo) => {
    Survey.create({
      url: convo.get('url'),
      secret_key: convo.get('secret_key'),
      response_points: user.response_points || 10,
    })
      .then(survey => {
        let depleteUserPoints = Promise.resolve();
        if(user.response_points) {
          depleteUserPoints = user.updateAttributes({
            response_points: 0
          })
        }
        return Promise.all([user.addSurvey(survey), depleteUserPoints, survey]);
      })
      .then(([res, depletedUser, survey])=> {
        convo.say({
          text: `Successfully created your survey! Make sure you include your secret key at the end of your survey. If you are reported by other users to have a missing key, we will have to take down your survey until this secret key is added. You currently have ${survey.response_points} response points. You should fill out more surveys so that your balance doesn't drop below 0!`,
          buttons: [
            { type: 'postback', title: 'Gain response points', payload: 'FETCH_OTHER_SURVEY' },
            { type: 'postback', title: "Help", payload: 'HELP' },
            { type: 'postback', title: 'Main menu', payload: 'MAIN_MENU' },
          ]
        });
        convo.end();
      })
  }

  chat.conversation((convo) => {
    getUrl(convo);
  });
}

const fetchSurvey = (payload, chat, user) => {

  const fetchUserSurvey = (convo, failure) => {
    user.getSurveys()
      .then(surveys => {
        if(surveys.length === 0) {
          fetchOtherSurvey(convo);
        } else if(surveys.length === 1) { 
          convo.set('survey', surveys[0]);
          fetchOtherSurvey(convo);
        } else {
          selectSurvey(convo, false, surveys);
        }
      })
      .catch(err => {
        console.log(err);
      })
  }

  const selectSurvey = (convo, failure, surveys) => {

    const surveyString = surveys.map((survey, index) => {
      return `\n${index + 1}. ${survey.url}, response points remaining: ${survey.response_points}, secret key: ${survey.secret_key}`
    })
    convo.ask(
      `${!failure ? "Which survey would you like to apply response points to? Choose the number." : "Hmm, that number doesn't seem quite right. Try again."} \n ${surveyString}`, (payload, convo) => {
        const text = textOrEndConv(payload);
        if(text === undefined) {
          convo.end();
          return;
        }
        const index = Number(text) - 1;
        if(surveys[index]) {
          convo.set('user_survey', surveys[index]);
          fetchOtherSurvey(convo);
        } else {
          selectSurvey(convo, true, surveys);
        }
      })
  }

  const fetchOtherSurvey = (convo, failure) => {
    convo.say(`${ !failure ? "Finding you a survey to answer..." : "Oops, that errored out! Trying again."}`).then(() => {
      return sequelize.query(`
        SELECT s.id FROM surveys AS s WHERE
        s.done = false AND
        s.can_show = true AND
        s.user_id != ${user.id} AND
        s.id NOT IN
        (
        SELECT r.answered_survey_id from responses as r where r.respondent_id = ${user.id}
        )
        ORDER BY s.last_shown
        LIMIT 1
      `);
    })
      .then(([surveys, meta]) => {
        const id = surveys[0] && surveys[0].id;
        if(!id) {
          convo.say('We have no more surveys at this moment. Please check again later.')
          convo.end();
          return Promise.reject('no more surveys :(')
        } else {
          return Survey.find({
            where: {
              id: id,
            },
            include: [{
              model: User,
            }]
          })
        }
      })
      .then(survey =>{
        let updateSurvey = survey.updateAttributes({
          last_shown: Sequelize.fn('NOW')
        })
        let createResponse = survey.createResponse({
          respondent_id: user.id,
          answered_survey_id: survey.id
        });        
        return Promise.all([survey, updateSurvey, createResponse])
      })
      .then(group => {
        let survey = group[0];
        let response = group[2];
        return convo.say(`Fill out this survey ${survey.url}`).then(() => {
          return Promise.resolve([survey, response]);
        })
      })
      .then(group => {
        let survey = group[0];
        let response = group[1];
        return getSecretKey(convo, false, survey, response);
      })
      .catch(err => {
        console.log('err', err);
      })
  }

  const getSecretKey = (convo, failure, survey, response) => {
    let askString = !failure ? "Once you're done answering the survey, enter the secret key here. If you don't have a secret key, type anything else." : {
      text: `Hmm.. That doesn't look like the right secret key. Try again if you mistyped. If there was no secret key provided, please contact the user who posted the survey using the button provided below. If you would like to report the survey, please type "report".`,
      buttons: [
        { type: 'web_url', title: 'Contact survey owner', url: `https://www.facebook.com/${survey.user.facebook_id}` },
        { type: 'postback', title: 'Skip survey', payload: 'FETCH_OTHER_SURVEY' },
      ]
    };
    convo.ask(askString, (payload, convo) => {
      let text = textOrEndConv(payload);
      if(text === undefined) {
        convo.end();
        return;
      }
      text = text.toLowerCase().replace(/\s/g, '');
      if(text !== survey.secret_key.toLowerCase().replace(/\s/g, '') && text !== "report") {
        getSecretKey(convo, true, survey, response);
      } else if(text.toLowerCase().replace(/\s/g, '') === "report") {
        reportUser(convo, false, survey, response);
      } else {
        let userSurvey = convo.get('user_survey') || user;

        let userSurveyUpdate = userSurvey.updateAttributes({
          response_points: userSurvey.response_points + 10,
        })
        let responseUpdate = response.updateAttributes({
          pending: false,
        });
        let surveyUpdate = survey.updateAttributes({
          response_points: survey.response_points - 10,
        });
        Promise.all([userSurveyUpdate, responseUpdate, surveyUpdate])
          .then(group => {
            convo.say({
              text: 'Done responding to survey',
              buttons: [
                { type: 'postback', title: 'Gain More Points', payload: 'FETCH_OTHER_SURVEY' },
                { type: 'postback', title: 'Main menu', payload: 'MAIN_MENU' },
              ]
            }).then(() =>{
              convo.end();
            })
          })
          .catch(err => {
            getSecretKey(convo, true, survey, response);
            console.log(err)
          })
      }
    })
  }


  const reportUser = (convo, failed, survey, response) => {
    survey.updateAttributes({
      reported: survey.reported + 1
    })
      .then(() => {
        convo.say({
          text:'Successfully reported the survey',
          buttons: [
            { type: 'postback', title: 'Gain More Points', payload: 'FETCH_OTHER_SURVEY' },
            { type: 'postback', title: 'Main menu', payload: 'MAIN_MENU' },
          ]
          
        })
        convo.end();
      })
  }

  chat.conversation((convo) => {
    fetchUserSurvey(convo);
  });
}

const listSurveys = (payload, chat, user) => {
  user.getSurveys()
    .then(surveys => {
      if(surveys.length === 0) {
        chat.say({
          text: 'No surveys yet!',
          buttons: [{ type: 'postback', title: 'Create a new survey', payload: 'CREATE_SURVEY' }],
        })
      } else {
        const surveyString = surveys.map((survey, index) => {
          return `\n${index + 1}. ${survey.url}, response points remaining: ${survey.response_points}, secret key: ${survey.secret_key}`
        })
        chat.say({
          text: surveyString,
          buttons: [
            { type: 'postback', title: 'Get response points', payload: 'FETCH_OTHER_SURVEY' },
            { type: 'postback', title: 'Create a new survey', payload: 'CREATE_SURVEY' },
          ],
        })

      }
    })
    .catch(e => {
      chat.say('Oops, error fetching your surveys.. Try again later!');
    })

}

bot.on('postback', (payload, chat) => {
  UserController.validateUser(payload, chat) 
    .then(user => {
      switch(payload.postback.payload) {
        case 'MAIN_MENU':
          showMenu(payload, chat);
          break;
        case 'SECONDARY_MENU':
          showSecondaryMenu(payload, chat);
          break;
        case 'CREATE_SURVEY':
          createSurvey(payload, chat, user)
          break;
        case 'FETCH_OTHER_SURVEY':
          fetchSurvey(payload, chat, user);
          break;
        case 'LIST_SURVEYS':
          listSurveys(payload, chat, user);
          break;
      }
    })
    .catch((e) => {
      console.log(e);
    })
})

module.exports = {
  showMenu,
}
