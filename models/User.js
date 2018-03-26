const Sequelize = require('sequelize');
const sequelize = require('./sequelize.js');

const User = sequelize.define('user', {
  first_name: {
    type: Sequelize.STRING
  },
  last_name: {
    type: Sequelize.STRING
  },
  locale: { 
    type: Sequelize.STRING
  },
  timezone: { 
    type: Sequelize.STRING
  },
  interests: { 
    type: Sequelize.STRING
  },
  age: { 
    type: Sequelize.INTEGER
  },
  completed_profile: {
    type: Sequelize.BOOLEAN,
    defaultValue: false
  },
  response_points: {
    type: Sequelize.INTEGER,
  },
  facebook_id: {
    type: Sequelize.STRING
  },
}, {
  underscored: true
});

User.sync()
module.exports = User;
