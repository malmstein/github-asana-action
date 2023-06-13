const core = require('@actions/core');
const github = require('@actions/github');
const asana = require('asana');

async function buildClient(asanaPAT) {
    return asana.Client.create({
        defaultHeaders: { 'asana-enable': 'new-sections,string_ids' },
        logAsanaChangeWarnings: false
    }).useAccessToken(asanaPAT).authorize();
}

async function createTask(client, projectId, name, description) {
    try {
        return await client.tasks.createTask({
            name: name,
            notes: description,
            projects: { projectId }
        });
    } catch (error) {
        console.error('rejecting promise', error);
    }
}

async function addComment(client, taskId, text, isPinned) {
    try {
        return await client.tasks.addComment(taskId, {
            text: text,
            is_pinned: isPinned,
        });
    } catch (error) {
        console.error('rejecting promise', error);
    }
}

async function action() {
    const
        ASANA_PAT = core.getInput('asana-pat'),
        ASANA_PROJECT_ID = core.getInput('asana-project', {required: true}),
        ACTION = core.getInput('action', {required: true}),
        ISSUE = github.context.payload.issue,
    ;

    console.log('issue', ISSUE);

    const client = await buildClient(ASANA_PAT);

    if (client === null) {
        throw new Error('client authorization failed');
    }

    console.info('creating asana task from issue', ISSUE.body);
    console.info('calling', ACTION);

    switch (ACTION) {
        case 'create-task': {
            const TASK_DESCRIPTION = `URL: ${ISSUE.html_url}, Description: ${ISSUE.body}`,
            const TASK_NAME = `Github Issue: ${ISSUE.title}`,
            const task = createTask(client, ASANA_PROJECT_ID, TASK_NAME, TASK_DESCRIPTION)

            const
                TASK_COMMENT = `PR: ${ISSUE.html_url}`,
                taskId = task.data.gid,
                isPinned = core.getInput('is-pinned') === 'true';

            addComment(client, taskId, TASK_COMMENT, isPinned)

            return task
        }
        case 'add-comment': {
            const
                TASK_COMMENT = `PR: ${ISSUE.html_url}`,
                // htmlText = core.getInput('text', {required: true}),
                isPinned = core.getInput('is-pinned') === 'true';

            const comments = [];
            for (const taskId of foundTasks) {
                const comment = addComment(client, taskId, TASK_COMMENT, isPinned)
                comments.push(comment)
            }
            return comments;
        }
        default:
            core.setFailed("unexpected action ${ACTION}");
    }
}

module.exports = {
    action,
    default: action,
};