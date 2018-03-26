const Sequelize = require('sequelize');
const sequelize = require('./sequelize.js');

const Response = sequelize.define('response', { 
  pending: {
    type: Sequelize.BOOLEAN,
    default: true
  },
}, {
  underscored: true,
});

Response.sync();
module.exports = Response;


