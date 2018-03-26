const sequelize = require('./sequelize');
const User = require('./User');
const Survey = require('./Survey');
const Response = require('./Response');
User.hasMany(Survey);
Survey.belongsTo(User);
Survey.hasMany(Response);
Response.belongsTo(Survey);
/*
User.hasMany(Response);
Response.belongsTo(User);
*/

Survey.belongsToMany(User, { 
  as: 'Respondent',
  through: Response,
  foreignKey: 'answered_survey_id'
})


User.belongsToMany(Survey, {
  as: 'AnsweredSurveys',
  through: Response,
  foreignKey: 'respondent_id'
})


sequelize.sync()
  /*
sequelize.sync({ force: true }).then(() => {
  console.log('asd')
  User.create({
    first_name: 'test',
    last_name: 'test',
    facebook_id: 'asdsada'
  })
    .then(user => {
      let survey = user.createSurvey({
        url: 'testurl',
        secret_key: 'testkey',
        reported: 3
      })
      let survey2 = user.createSurvey({
        url: 'testurl2',
        secret_key: 'testkey2',
        reported: 1
      })
      return Promise.all([user, survey])
    })
    .then(([user, survey]) => {
      let user2 = User.create({
        "first_name": 'Raghav',
        "last_name": 'anand',
        "locale": 'asds',
        "timezone": 'asds',
        "interests": 'asda',
        "age": 2,
        "completed_profile": true,
        "facebook_id": '1605990716112085',
      });
      let user3 = User.create({
        first_name: 'test3',
        last_name: 'test3',
        facebook_id: '2000'
      });
      return Promise.all([user, survey, user2, user3]);
    })
    .then(([user, survey, user2, user3]) => {
      let survey2 = user2.createSurvey({
        url: 'test1',
        secret_key: 'secret1'
      })
      let survey3 = user2.createSurvey({
        url: 'test3',
        secret_key: 'secret3'
      })
      let response1 = survey.createResponse({
        respondent_id: user2.id,
        answered_survey_id: survey.id
      });
      let response2 = survey.createResponse({
        respondent_id: user3.id,
        answered_survey_id: survey.id
      });
      return Promise.all([response1, response2, user, survey, user3, survey2, survey3])
    })
    .then(([response1, response2, user, survey, user3]) => {
      /*
      sequelize.query(`
      SELECT s.* FROM surveys AS s WHERE
      s.done = false AND
      s.can_show = true AND
      s.user_id != ${user.id} AND
      s.id NOT IN
      (
      SELECT r.answered_survey_id from responses as r where r.respondent_id = ${user.id}
      )
      `).spread((results, metadata) => {
  console.log(results)
})
    })
    .catch(err => {
      console.log(err);
    })
})
*/

module.exports = {
  User: User,
  Survey: Survey
}

