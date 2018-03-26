const Sequelize = require('sequelize');
const sequelize = require('./sequelize.js');

const Survey = sequelize.define('survey', { 
  url: {
    type: Sequelize.STRING,
  },
  response_points: {
    type: Sequelize.INTEGER,
    defaultValue: 10
  },
  secret_key: {
    type: Sequelize.STRING,
  },
  done: {
    type: Sequelize.BOOLEAN,
    defaultValue: false
  },
  can_show: {
    type: Sequelize.BOOLEAN,
    defaultValue: true
  },
  reported: {
    type: Sequelize.INTEGER,
    defaultValue: 0
  },
  last_shown: {
    type: Sequelize.DATE,
    default: Sequelize.fn('now')
  }
}, {
  underscored: true,
  hooks: {
    beforeSave: (survey, options) => {
      if(survey.response_points <= 0 || survey.reported >= 2) {
        survey.can_show = false;
      } else {
        survey.can_show = true;
      }
    }
  }
});

Survey.sync();
module.exports = Survey;

