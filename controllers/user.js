const User = require('../models').User;

const validateUser = (payload, chat, next) => {
  return User.find({
    where: {
      facebook_id: payload.sender.id
    }
  })
    .then(user => {
      if(user && user.completed_profile) {
        try {
          if(next) next(payload, chat);
        } catch(e) {
          console.log('ERROR with next', e)
        }
        return Promise.resolve(user);
      } else {
        chat.conversation((convo) => {
          getUserInfo(convo, payload.sender.id);
        });
        return Promise.reject();
      }
    })
}

const getUserInfo = (outerConvo, userId) => {
  const introduction = (convo) => {
    convo.getUserProfile().then((user) => {
      convo.set('userProfile', user);
      convo.say(`Hello ${user.first_name}! We need you two answer 2 preliminary questions to better match you with surveys before we get started!`).then(() => { askAge(convo) })
    })
  }

  const askAge = (convo, failure) => {
    convo.ask(`${ !failure ? "How old are you?" : "Please enter a number as your age"}`, (payload, convo) => {
      const text = payload.message.text;
      if(isNaN(Number(text))) {
        askAge(convo, true);
      } else {
        convo.set('age', text);
        interestedTags(convo);
      }
    }); 
  }

  const interestedTags = (convo, failure) => {
    convo.ask(`${ !failure ? "What are some things you're interested in? (Seperate multiple things with commas and enter atleast 3)" : "Enter atleast 3 comma separated items of reasonable length" }`, (payload, convo) => {
      const text = payload.message.text;
      if(text.length < 10 || text.split(',').length < 3) {
        interestedTags(convo, true);
      } else {
        convo.set('interests', text);
        updateUserInfo(convo);
      }
    }); 
  }

  const updateUserInfo = (convo) => {
    let user = {};
    var profile = convo.get('userProfile');
    user.first_name = profile.first_name;
    user.last_name = profile.last_name;
    user.gender = profile.gender;
    user.locale = profile.locale;
    user.timezone = String(profile.timezone);
    user.age = convo.get('age');
    user.interests = convo.get('interests');
    user.completed_profile = true;
    user.facebook_id = userId;
    User.create(user)
      .then(() => {
        convo.say({
          text: 'Successfully created your profile!',
          buttons: [
            { type: 'postback', title: 'Continue', payload: 'MAIN_MENU' },
          ]
        });
        convo.end();
      })
      .catch(() => {
        convo.say('Error creating your profile, sorry!');
        introduction(convo);
      })
  }
  return introduction(outerConvo);
}

module.exports = {
  getUserInfo,
  validateUser
}
