
# Github-Asana action

This action integrates asana with github.

### Prerequisites

- Asana account with the permission on the particular project you want to integrate with.
- For creating tasks in Asana, you must provide the Asana project where the issues will be added to.
- For adding PR link to Asana, you must provide the task url in the PR description.

## Required Inputs

### `asana-pat`

**Required** Your public access token of asana, you can find it in [asana docs](https://developers.asana.com/docs/#authentication-basics).

### `action`

**required** The action to be performed. Possible values are
* `create-issue-task` to create a task based on the Github Issue
* `complete-pr-task` to complete the Asana task when a PR has been merged
* `pr-created` will close PRs that are not opened by members of the organisation
* `pr-reviewed` to add a comment to the Asana task when the PR has been reviewed

### Create Asana task from Github Issue
When a Github Issue has been added, it will create an Asana task with the Issue title, description and link.
### `asana-project`

**Required** The Asana project ID where the new task will be added i.e ASANA PROJECT: https://app.asana.com/0/1174433894299346

### `asana-custom-field`

**Required** The Asana Custom Field ID that will be used to link the Issue URL. This is needed for the two-way communication between Asana and Github. 

#### Example Usage

```yaml
on:
  issues:
    types: [opened, reopened]

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: malmstein/github-asana-action@v0.4.0
        with:
          asana-pat: 'Your PAT'
          asana-project: 'Asana Project Id'
          asana-custom-field: 'Asana Custom Field Id'
          action: 'create-issue-task'
```
### Complete Asana task when Github PR merged
When a Github Pull Request has been closed, it will look for an Asana task in the PR description and close it.
### `is-complete`
**optional** Close the Asana task after Github PR merged when set to `true`
#### Example Usage

```yaml
on:
  pull_request:
    types: [closed]

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: malmstein/github-asana-action@v0.4.0
        with:
          asana-pat: 'Your PAT'
          trigger-phrase: 'Asana Task:'
          action: 'complete-pr-task'
          is-complete: true
```

### Close PRs when opened by users that are not members of the organisation
When a Github Pull Request has been opened, it will check if the sender is a member of the organisation. If they aren't, then the PR will be closed and a template reply will be added. If the user is part of the organisationm, it will look for an Asana task in the PR description and comment there the PR link.
### `trigger-phrase`

**Required** Prefix before the task i.e ASANA TASK: https://app.asana.com/1/2/3/.
### `github-pat`

**Required** Github public access token
### `is-pinned`
**optional** Pinned the PR comment when set to `true`

#### Sample PR Description
``
Asana Task: https://app.asana.com/0/1/2

#### Example Usage

```yaml
on:
  pull_request:
    types: [opened, reopened]

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: malmstein/github-asana-action@v0.4.0
        with:
          asana-pat: 'Your PAT'
          trigger-phrase: 'Asana Task:'
          action: 'add-pr-comment'
          is-pinned: true
```

### Comment on Asana task when PR has been reviewed
When a Pull Request has been reviewed, it will look for an Asana task in the PR description and comment on it.
### `trigger-phrase`

**Required** Prefix before the task i.e ASANA TASK: https://app.asana.com/1/2/3/.