
# Github-Asana action

This action integrates asana with github.

### Prerequisites

- Asana account with the permission on the particular project you want to integrate with.
- Asana project where the issues will be added to.

## Inputs

### `asana-pat`

**Required** Your public access token of asana, you can find it in [asana docs](https://developers.asana.com/docs/#authentication-basics).

### `asana-project`

**Required** The Asana project ID where the new task will be added i.e ASANA PROJECT: https://app.asana.com/0/1174433894299346

### `action`

**required** The action to be performed. Possible values are
* `create-task` to create a task based on the ISSUE

## Example Usage

```yaml
uses: malmstein/github-asana-action@v0.4.0
with:
  asana-pat: 'Your PAT'
  asana-project: 'Asana Project Id'
  action: 'create-task'
```
