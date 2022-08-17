
# Github-Asana action

This action integrates asana with github.

### Prerequisites

- Asana account with the permission on the particular project you want to integrate with.
- Must provide the task url in the PR description.

## Inputs

### `asana-pat`

**Required** Your public access token of asana, you can find it in [asana docs](https://developers.asana.com/docs/#authentication-basics).

### `trigger-phrase`

**Required** Prefix before the task i.e ASANA TASK: https://app.asana.com/1/2/3/.

### `action`

**required** The action to be performed. Possible values are
* `add-comment` to add the PR comment in the Asana task

### `is_pinned`
**optional** for `add-comment`. Pinned the PR comment when set to `true`

## Sample PR Description
``
Asana Task: https://app.asana.com/0/1/2
``

## Example Usage

```yaml
uses: aitorvs/github-asana-action@v1.0.3
with:
  asana-pat: 'Your PAT'
  trigger-phrase: 'Asana Task:'
  action: 'add-comment'
  is_pinned: true
```
Sample PR description:

```
Asana Task: https://app.asana.com/0/1/
```