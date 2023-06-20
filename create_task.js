const asana = require('asana');
const core = require('@actions/core');
const github = require('@octokit/core');

const PAT = '1/1157893581871896:051366aa86a8dcd37a414f703734b34e'

const client = asana.Client.create({
    defaultHeaders: { 'asana-enable': 'new-sections,string_ids' },
    logAsanaChangeWarnings: false
}).useAccessToken(PAT)

const octokit = new github.Octokit({
  auth: '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'
})

const ASANA_PROJECT_ID = '1174433894299346';
const CUSTOM_FIELD_ID = '1204834130143801';

const TASK_DESCRIPTION = `Description:`;
const TASK_NAME = `Github Issue:`;
const TASK_ISSUE_URL = 'https://github.com/malmstein/compose-samples/issues/1'
const TASK_COMMENT = `Github Issue: ${TASK_ISSUE_URL} `;

console.info('creating asana task from pull request', TASK_NAME);

const owner = 'malmstein';
const repo = 'compose-samples';
const issue_number = '2';

octokit.request('GET /repos/{owner}/{repo}/pulls/{issue_number}', {
    owner: owner,
    repo: repo,
    issue_number: issue_number,
    headers: {
        'X-GitHub-Api-Version': '2022-11-28'
    }
    }).then((response) => {
        const user = response.data.user.login
        console.log(user)

        const repo = response.data.head.repo.name
        console.log(repo)

        octokit.request('GET /orgs/{org}/members/{username}', {
            org: 'duckduckgo',
            username: user,
            headers: {
              'X-GitHub-Api-Version': '2022-11-28'
            }
        }).then((response) => {
            if (response.status === 204){
                console.log(user, 'belongs to organization')
            }
        });

        
    });

        // let found = response.data.find(item => { return item.name === "help wanted" } );
    
        // if (found) {
        //     console.log("Label exists.");
        // }

// client.tasks.createTask({name: TASK_NAME, 
//     notes: TASK_DESCRIPTION, 
//     projects: [ASANA_PROJECT_ID],
//     custom_fields: {[CUSTOM_FIELD_ID]: '1'},
//     pretty: true})
//         .then((result) => {
//             console.log('test', result);
//             client.stories.createStoryForTask(result.gid, {
//                 text: TASK_COMMENT,
//                 is_pinned: true,
//             });

//         });
