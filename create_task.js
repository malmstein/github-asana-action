const asana = require('asana');
const core = require('@actions/core');

const PAT = '1/1157893581871896:051366aa86a8dcd37a414f703734b34e'

const client = asana.Client.create({
    defaultHeaders: { 'asana-enable': 'new-sections,string_ids' },
    logAsanaChangeWarnings: false
}).useAccessToken(PAT)

const ASANA_PROJECT_ID = '1174433894299346';
const CUSTOM_FIELD_ID = '1204834130143801';

const TASK_DESCRIPTION = `Description:`;
const TASK_NAME = `Github Issue:`;
const TASK_ISSUE_URL = 'https://github.com/malmstein/compose-samples/issues/1'
const TASK_COMMENT = `Github Issue: ${TASK_ISSUE_URL} `;

console.info('creating asana task from issue', TASK_NAME);

client.tasks.createTask({name: TASK_NAME, 
    notes: TASK_DESCRIPTION, 
    projects: [ASANA_PROJECT_ID],
    custom_fields: {[CUSTOM_FIELD_ID]: '1'},
    pretty: true})
        .then((result) => {
            console.log('test', result);
            client.stories.createStoryForTask(result.gid, {
                text: TASK_COMMENT,
                is_pinned: true,
            });

        });
