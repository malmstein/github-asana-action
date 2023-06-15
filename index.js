const core = require('@actions/core');
const action = require('./action');

const
ASANA_PAT = core.getInput('asana-pat'),
ACTION = core.getInput('action', {required: true});

const ISSUE = github.context.payload.issue;
const ASANA_PROJECT_ID = core.getInput('asana-project');
const ASANA_CUSTOM_FIELD_ID = core.getInput('asana-custom-field');

console.info('creating asana task from issue', ISSUE.title);

const TASK_DESCRIPTION = `Description: ${ISSUE.body}`;
const TASK_NAME = `Github Issue: ${ISSUE.title}`;
const TASK_COMMENT = `Link to Issue: ${ISSUE.html_url}`;

const client = asana.Client.create({
  defaultHeaders: { 'asana-enable': 'new-sections,string_ids' },
  logAsanaChangeWarnings: false
}).useAccessToken(ASANA_PAT)

client.tasks.createTask({name: TASK_NAME, 
    notes: TASK_DESCRIPTION, 
    projects: [ASANA_PROJECT_ID],
    custom_fields: {[ASANA_CUSTOM_FIELD_ID]: ISSUE.number},
    pretty: true})
        .then((result) => {
            console.log('task created', result);
            return client.stories.createStoryForTask(result.gid, {
                text: TASK_COMMENT,
                is_pinned: true,
            });

        });