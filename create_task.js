const asana = require('asana');

const PAT = '1/1157893581871896:051366aa86a8dcd37a414f703734b34e'
const ProjectID = '1174433894299346'

const client = asana.Client.create({
    defaultHeaders: { 'asana-enable': 'new-sections,string_ids' },
    logAsanaChangeWarnings: false
}).useAccessToken(PAT)



// Get your user info
client.users.findById("me")
  .then(function(me) {
    // Print out your information
    console.log('Hello world! ' + 'My name is ' + me.name + '!');
});