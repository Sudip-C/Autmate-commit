# DailyDot

DailyDot is a small, transparent GitHub Actions app that records one development
check-in every day. It updates a JSON activity log and these streak statistics,
then commits the change to your repository's default branch.

> Use DailyDot as a real activity or learning log. A green contribution square
> is a useful side effect, but it should not replace meaningful project work.

<!-- DAILY_STATS_START -->
## Activity snapshot

| Logged days | Current streak | Longest streak | Latest entry |
| ---: | ---: | ---: | :--- |
| 8 | 8 days | 8 days | 2026-08-28 |

_Generated automatically from `data/activity.json` using the Asia/Kolkata calendar._
<!-- DAILY_STATS_END -->

## What it does

- Runs daily at **12:17 AM Asia/Kolkata** and can also be run manually.
- Adds one dated entry to `data/activity.json`.
- Recalculates the current and longest streak shown above.
- Skips the commit if today's entry already exists.
- Uses the repository owner's GitHub no-reply identity by default.
- Uses only the short-lived built-in `GITHUB_TOKEN`; no personal access token is
  required.

## Quick setup

### 1. Create the repository

Create a new **public** repository under your personal GitHub account. A name
such as `DailyDot` or `daily-dev-log` works well.

Important:

- Create a standalone repository, not a fork.
- Keep `main` as the default branch.
- Do not initialize it with a README because this project already includes one.

### 2. Push this project

Extract the downloaded ZIP, open a terminal inside the `DailyDot` folder, and
run:

```bash
git init
git branch -M main
git add -- .github scripts test data README.md package.json .gitignore LICENSE
git commit -m "feat: add DailyDot automation"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

Replace `YOUR_USERNAME` and `YOUR_REPOSITORY` before running the last two
commands.

### 3. Allow the workflow to push

In your GitHub repository:

1. Open **Settings**.
2. Select **Actions → General**.
3. Under **Workflow permissions**, select **Read and write permissions**.
4. Save the change.

The workflow itself further limits the token to `contents: write`.

### 4. Test it now

1. Open the repository's **Actions** tab.
2. Select **Daily Dev Log**.
3. Click **Run workflow** and choose the default branch (`main`).
4. Wait for the run to finish, then check `data/activity.json` and the commit
   history.

Running it again on the same day is safe: DailyDot will detect the existing date
and create no duplicate commit.

## Why the commit should count

For a personal repository, DailyDot builds the standard GitHub no-reply address
from the repository owner's account ID and username. GitHub can therefore
associate the authored commit with that account without exposing a private
email address.

GitHub requires counted commits to use an email associated with your account,
be in a standalone repository, and land on the default branch (or `gh-pages`).
The contribution graph can take up to 24 hours to refresh.

If this repository belongs to an organization or you want a different author,
create these repository variables under **Settings → Secrets and variables →
Actions → Variables**:

| Variable | Value |
| --- | --- |
| `COMMIT_AUTHOR_NAME` | Your GitHub username or display name |
| `COMMIT_AUTHOR_EMAIL` | Your exact GitHub no-reply email or another verified email |

You can copy your exact no-reply address from **GitHub Settings → Emails**.

For a private repository, enable **Private contributions** from the contribution
settings on your GitHub profile if you want the activity count to be visible.

## Local commands

```bash
# Run the tests
npm test

# Add today's entry using Asia/Kolkata time
npm start

# Reproduce a specific date while developing
node scripts/update-log.mjs --date 2026-08-21
```

## Customization

Change the timezone in both places below so the schedule and recorded date stay
aligned:

- `.github/workflows/daily-dev-log.yml`: the `timezone` schedule field and
  `APP_TIMEZONE` environment variable.
- `data/activity.json`: this is updated automatically on the next run.

To change the daily message, add a `DAILY_LOG_NOTE` environment variable to the
workflow's **Update daily log** step.

## Reliability notes

- Scheduled workflows only run from the default branch.
- GitHub may delay scheduled jobs during high load; minute `17` avoids the busy
  start of the hour.
- A branch protection rule that blocks direct pushes will also block DailyDot.
- If a run fails, inspect the failed step in the repository's Actions tab and
  use **Run workflow** after fixing the problem.

## Project structure

```text
DailyDot/
├── .github/workflows/daily-dev-log.yml
├── data/activity.json
├── scripts/update-log.mjs
├── test/update-log.test.mjs
├── package.json
└── README.md
```

## Official GitHub references

- [Profile contribution criteria](https://docs.github.com/en/account-and-profile/reference/profile-contributions-reference)
- [Scheduled workflow behavior](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)
- [Using `GITHUB_TOKEN`](https://docs.github.com/en/actions/tutorials/authenticate-with-github_token)
- [GitHub no-reply email formats](https://docs.github.com/en/account-and-profile/reference/email-addresses-reference#your-noreply-email-address)

## License

MIT
