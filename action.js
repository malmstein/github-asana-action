const core = require('@actions/core');
const github = require('@actions/github');
const asana = require('asana');

async function buildClient(asanaPAT) {
    return asana.Client.create({
        defaultHeaders: { 'asana-enable': 'new-sections,string_ids' },
        logAsanaChangeWarnings: false
    }).useAccessToken(asanaPAT).authorize();
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
        ACTION = core.getInput('action', {required: true}),
        TRIGGER_PHRASE = core.getInput('trigger-phrase'),
        PULL_REQUEST = github.context.payload.pull_request,
        REGEX_STRING = `${TRIGGER_PHRASE} https:\\/\\/app.asana.com\\/(\\d+)\\/(?<project>\\d+)\\/(?<task>\\d+).*?`,
        REGEX = new RegExp(REGEX_STRING, 'g')
    ;

    console.log('pull_request', PULL_REQUEST);

    const client = await buildClient(ASANA_PAT);

    if (client === null) {
        throw new Error('client authorization failed');
    }

    console.info('looking for asana task link in body', PULL_REQUEST.body, 'regex', REGEX_STRING);
    let foundTasks = [];
    while((parseAsanaUrl = REGEX.exec(PULL_REQUEST.body)) !== null) {
        const taskId = parseAsanaUrl.groups.task;
        if (!taskId) {
            core.error(`Invalid Asana task URL after trigger-phrase ${TRIGGER_PHRASE}`);
            continue;
        }
        foundTasks.push(taskId);
    }
    console.info(`found ${foundTasks.length} tasksIds:`, foundTasks.join(','));

    console.info('calling', ACTION);

    switch (ACTION) {
        case 'add-comment': {
            const
                TASK_COMMENT = `PR: ${PULL_REQUEST.html_url}`,
                // htmlText = core.getInput('text', {required: true}),
                isPinned = core.getInput('is-pinned') === 'true';

            const comments = [];
            for (const taskId of foundTasks) {
                const comment = addComment(client, taskId, TASK_COMMENT, isPinned)
                comments.push(comment)
            }
            return comments;
        }
        case 'complete-task': {
            const isComplete = core.getInput('is-complete') === 'true';
            const taskIds = [];
            for(const taskId of foundTasks) {
                console.info("marking task", taskId, isComplete ? 'complete' : 'incomplete');
                try {
                    await client.tasks.update(taskId, {
                        completed: isComplete
                    });
                } catch (error) {
                    console.error('rejecting promise', error);
                }
                taskIds.push(taskId);
            }
            return taskIds;
        }
        default:
            core.setFailed("unexpected action ${ACTION}");
    }
}

module.exports = {
    action,
    default: action,
};