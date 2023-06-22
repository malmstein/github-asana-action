const core = require('@actions/core');
const github = require('@actions/github');
const octokit = require('@octokit/core');
const asana = require('asana');

function buildAsanaClient() {
    const ASANA_PAT = core.getInput('asana-pat');
    return asana.Client.create({
        defaultHeaders: { 'asana-enable': 'new-sections,string_ids' },
        logAsanaChangeWarnings: false
    }).useAccessToken(ASANA_PAT).authorize();
}

function buildGithubClient(githubPAT){
    return new octokit.Octokit({
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

async function createTask(client, name, description, comment, projectId) {
    try {
        client.tasks.createTask({name: name, 
            notes: description, 
            projects: [projectId],        
            pretty: true})
            .then((result) => {
                console.log('task created', result.gid);
                return createStory(client, result.gid, comment, true)
            })
    } catch (error) {
        console.error('rejecting promise', error);
    }
}

async function createIssueTask(){
    const client = await buildAsanaClient();
    const ISSUE = github.context.payload.issue;
    const ASANA_PROJECT_ID = core.getInput('asana-project');

    console.info('creating asana task from issue', ISSUE.title);

    const TASK_DESCRIPTION = `Description: ${ISSUE.body}`;
    const TASK_NAME = `Github Issue: ${ISSUE.title}`;
    const TASK_COMMENT = `Link to Issue: ${ISSUE.html_url}`;

    return createTask(client, TASK_NAME, TASK_DESCRIPTION, TASK_COMMENT, ASANA_PROJECT_ID)
}


async function notifyPReviewed(){
    const client = await buildAsanaClient();
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

async function addTaskToAsanaProject(){
    const client = await buildAsanaClient();
    const projectId = core.getInput('asana-project');
    const sectionId = core.getInput('asana-section') === '0';

    if (!projectId) return;

    const foundTasks = findAsanaTasks()
    for (const taskId of foundTasks) {
        addTaskToProject(client, taskId, projectId, sectionId)        
    }
}

async function addTaskToProject(client, taskId, projectId, sectionId){
    if (sectionId == 0){
        console.info('adding asana task to project', projectId);
        try {
            return await client.tasks.addProjectForTask(taskId, {
                project: projectId,        
                insert_after: null
            });
        } catch (error) {
            console.error('rejecting promise', error);
        }
    } else {
        console.info(`adding asana task to top of section ${sectionId} in project ${projectId}`);
        try {
            return await client.tasks.addProjectForTask(taskId, {
                project: projectId                
            })
            .then((result) => {
                client.sections.addTaskForSection(sectionId, {task: taskId})
                .then((result) => {
                    console.log(result);
                });
            });
        } catch (error) {
            console.error('rejecting promise', error);
        }
    }
}

async function addCommentToPRTask(){
    const 
        PULL_REQUEST = github.context.payload.pull_request,
        TASK_COMMENT = `PR: ${PULL_REQUEST.html_url}`,
        isPinned = core.getInput('is-pinned') === 'true';

    const client = await buildAsanaClient();

    const foundTasks = findAsanaTasks()

    const comments = [];
    for (const taskId of foundTasks) {
        const comment = createStory(client, taskId, TASK_COMMENT, isPinned)
        comments.push(comment)
    }
    return comments;
}

async function createPullRequestTask(){
    const 
        ASANA_PROJECT_ID = core.getInput('asana-project'),
        PULL_REQUEST = github.context.payload.pull_request;

    const client = await buildAsanaClient();

    console.info('creating asana task from pull request', PULL_REQUEST.title);

    const TASK_DESCRIPTION = `Description: ${PULL_REQUEST.body}`;
    const TASK_NAME = `Community Pull Request: ${PULL_REQUEST.title}`;
    const TASK_COMMENT = `Link to Pull Request: ${PULL_REQUEST.html_url}`;

    return createTask(client, TASK_NAME, TASK_DESCRIPTION, TASK_COMMENT, ASANA_PROJECT_ID)
}

async function completePRTask(){
    const client = await buildAsanaClient();
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

async function checkPRMembership(){
    const 
        GITHUB_PAT = core.getInput('github-pat'),
        githubClient = buildGithubClient(GITHUB_PAT),
        PULL_REQUEST = github.context.payload.pull_request,
        ORG = PULL_REQUEST.base.repo.owner.login,
        USER = PULL_REQUEST.user.login;

        console.info(`PR opened/reopened by ${USER}, checking membership in our organization`); 

    try {
        await githubClient.request('GET /orgs/{org}/members/{username}', {
            org: 'duckduckgo',
            username: USER,
            headers: {
            'X-GitHub-Api-Version': '2022-11-28'
            }
        }).then((response) => {
            if (response.status === 204){
                console.log(USER, `belongs to ${ORG}`)
                core.setOutput('external', false)
            } else {
                console.log(USER, `does not belong to ${ORG}`)                
                core.setOutput('external', true)
            }
        });
    } catch (error) {
        console.log(USER, `does not belong to ${ORG}`)
        core.setOutput('external', true)
    }
}

async function action() {
    const ACTION = core.getInput('action', {required: true});
    console.info('calling', ACTION);

    switch (ACTION) {
        case 'notify-issue-opened': {
            createIssueTask();
            break;
        }
        case 'notify-pr-reviewed': {
            notifyPReviewed();
            break;
        }
        case 'notify-pr-merged': {
            completePRTask()
            break;
        }
        case 'check-pr-membership': {
            checkPRMembership();
            break;
        }
        case 'add-asana-comment': {
            addCommentToPRTask();
            break;
        }
        case 'add-task-asana-project': {
            addTaskToAsanaProject();
            break;
        }
        case 'create-asana-pr-task': {
            createPullRequestTask();
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