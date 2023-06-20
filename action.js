const core = require('@actions/core');
const github = require('@octokit/core');
const asana = require('asana');

function buildAsanaClient(asanaPAT) {
    return asana.Client.create({
        defaultHeaders: { 'asana-enable': 'new-sections,string_ids' },
        logAsanaChangeWarnings: false
    }).useAccessToken(asanaPAT).authorize();
}

function buildGithubClient(githubPAT){
    return new github.Octokit({
        auth: githubPAT
      })
}

function findAsanaTasks(){
    const
        TRIGGER_PHRASE = core.getInput('trigger-phrase'),
        PULL_REQUEST = github.context.payload.pull_request,
        REGEX_STRING = `${TRIGGER_PHRASE} https:\\/\\/app.asana.com\\/(\\d+)\\/(?<project>\\d+)\\/(?<task>\\d+).*?`,
        REGEX = new RegExp(REGEX_STRING, 'g');
 
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
    return foundTasks
}

async function createStory(client, taskId, text, isPinned) {
    try {
        return await client.stories.createStoryForTask(taskId, {
            text: text,
            is_pinned: isPinned,
        });
    } catch (error) {
        console.error('rejecting promise', error);
    }
}

async function createTask(client, name, description, issue, comment, projectId, customFieldId) {
    try {
        client.tasks.createTask({name: name, 
            notes: description, 
            projects: [projectId],
            custom_fields: {[customFieldId]: issue},
            pretty: true})
            .then((result) => {
                console.log('task created', result.gid);
                return createStory(client, result.gid, comment, true)
            })
    } catch (error) {
        console.error('rejecting promise', error);
    }
}

async function createIssueTask(client){
    const ISSUE = github.context.payload.issue;
    const ASANA_PROJECT_ID = core.getInput('asana-project');
    const ASANA_CUSTOM_FIELD_ID = core.getInput('asana-custom-field');

    console.info('creating asana task from issue', ISSUE.title);

    const TASK_DESCRIPTION = `Description: ${ISSUE.body}`;
    const TASK_NAME = `Github Issue: ${ISSUE.title}`;
    const TASK_COMMENT = `Link to Issue: ${ISSUE.html_url}`;

    return createTask(client, TASK_NAME, TASK_DESCRIPTION, `${ISSUE.number}`, TASK_COMMENT, ASANA_PROJECT_ID, ASANA_CUSTOM_FIELD_ID)
}


async function notifyPReviewed(client){
    const 
        PULL_REQUEST = github.context.payload.pull_request,
        TASK_COMMENT = `PR: ${PULL_REQUEST.html_url} has been reviewed`;

    const foundTasks = findAsanaTasks()

    const comments = [];
    for (const taskId of foundTasks) {
        const comment = createStory(client, taskId, TASK_COMMENT, false)
        comments.push(comment)
    }
    return comments;
}


async function addCommentToPRTask(client){
    const 
        PULL_REQUEST = github.context.payload.pull_request,
        TASK_COMMENT = `PR: ${PULL_REQUEST.html_url}`,
        isPinned = core.getInput('is-pinned') === 'true';

    const foundTasks = findAsanaTasks()

    const comments = [];
    for (const taskId of foundTasks) {
        const comment = createStory(client, taskId, TASK_COMMENT, isPinned)
        comments.push(comment)
    }
    return comments;
}

async function userBelongsToOrganization(githubClient) {
    githubClient.request('GET /orgs/{org}/members/{username}', {
        org: 'frakbot',
        username: user,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28'
        }
    }).then((response) => {
        return (response.status === 204)
    });
}

async function closePR(githubClient, owner, repo, pull_number){
    githubClient.request('PATCH /repos/{owner}/{repo}/pulls/{pull_number}', {
        owner: owner,
        repo: repo,
        pull_number: pull_number,
        state: 'closed',
        headers: {
          'X-GitHub-Api-Version': '2022-11-28'
        }
    }).then((response) => {
        console.log(`Pull Request ${pull_number} has been closed`)
        githubClient.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
            owner:'duckduckgo',
            repo: repo,
            issue_number: pull_number,
            body: `At the moment we don't accept Community PRs`,
            headers: {
              'X-GitHub-Api-Version': '2022-11-28'
            }
        }).then((response) => {
            core.setOutput('closed', true)
        }); 
    });
}

async function pullRequestCreated(client){
    const 
        GITHUB_PAT = core.getInput('github-pat'),
        githubClient = await buildGithubClient(GITHUB_PAT),
        PULL_REQUEST = github.context.payload.pull_request;

    console.info(`PR opened/reopened by ${PULL_REQUEST.data.user.login}, member of DuckDuckGo?`); 

    const isMember = await userBelongsToOrganization(githubClient)
    if (isMember){
        addCommentToPRTask(client);
    } else {
        closePR(githubClient, PULL_REQUEST.data.head.repo.owner.login, PULL_REQUEST.data.head.repo.name, PULL_REQUEST.number);
    }
}

async function completePRTask(client){
    const isComplete = core.getInput('is-complete') === 'true';

    const foundTasks = findAsanaTasks()

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

async function action() {
    const
        ASANA_PAT = core.getInput('asana-pat'),
        ACTION = core.getInput('action', {required: true});

    const client = await buildAsanaClient(ASANA_PAT);

    if (client === null) {
        throw new Error('client authorization failed');
    }

    console.info('calling', ACTION);

    switch (ACTION) {
        case 'create-issue-task': {
            createIssueTask(client);
            break;
        }
        case 'pr-reviewed': {
            notifyPReviewed(client);
            break;
        }
        case 'pr-created': {
            pullRequestCreated(client);
            break;
        }
        case 'complete-pr-task': {
            completePRTask(client)
            break;
        }
        default:
            core.setFailed(`unexpected action ${ACTION}`);
    }
}

module.exports = {
    action,
    default: action,
};