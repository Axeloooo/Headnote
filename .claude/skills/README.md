# Vendored Claude skills

These skills are copied from the plugins installed in the development environment, so
sessions on this repo get them without installing plugins. The contents are unchanged
copies. Update them by re-copying from the source, not by editing them here.

| Source | Version | License | Skills |
| --- | --- | --- | --- |
| superpowers by Jesse Vincent, https://github.com/obra/superpowers | 6.4.2 | MIT (`licenses/superpowers-LICENSE.txt`) | brainstorming, diagnosing-superpowers, dispatching-parallel-agents, executing-plans, finishing-a-development-branch, receiving-code-review, requesting-code-review, subagent-driven-development, systematic-debugging, test-driven-development, using-git-worktrees, using-superpowers, verification-before-completion, writing-plans, writing-skills |
| frontend-design by Anthropic | as installed | Apache-2.0 (`licenses/frontend-design-LICENSE.txt`) | frontend-design |
| playwright-core by Microsoft, https://github.com/microsoft/playwright | as installed | Apache-2.0 (`licenses/playwright-LICENSE.txt`, `licenses/playwright-NOTICE.txt`) | playwright-cli, playwright-component-testing, playwright-trace |

The figma plugin (https://github.com/figma/mcp-server-guide, v2.2.127) is left out of this set. Its skills have no stated license in the plugin copy, and they are not redistributed here until Figma confirms one. Install the figma plugin instead, or add the skills back once licensed.

The playwright plugin's own install has no skill files. The three playwright skills above come
from the `playwright-core` package, which ships them, so they are the closest match.
